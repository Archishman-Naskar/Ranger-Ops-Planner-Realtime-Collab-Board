const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

console.log("✅ Socket server running on port 3001");

// Track users per room
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // -----------------------------------------------------
  // WHITEBOARD FEATURE: DRAWING BROADCAST
  // -----------------------------------------------------
  // The 'draw' event is received from one user and broadcast to all others in the room.
  socket.on("draw", ({ roomId, image }) => {
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit("draw", {
      incomingRoom: roomId,
      image,
    });
  });

  // -----------------------------------------------------
  // PRESENCE: USER JOIN
  // -----------------------------------------------------
  socket.on("presence:join", ({ roomId, userId, username }) => {
    console.log(`🟩 Presence join → ${username} (${userId}) in room ${roomId}`);

    // Join the Socket.io room. This is also needed for the 'draw' broadcast.
    socket.join(roomId);
    socket.data.userInfo = { roomId, userId, username };

    if (!roomUsers[roomId]) roomUsers[roomId] = [];

    const exists = roomUsers[roomId].some((u) => u.userId === userId);
    if (!exists) roomUsers[roomId].push({ userId, username });

    // Send the updated user list to everyone in the room
    io.to(roomId).emit("presence:update", roomUsers[roomId]);
  });

  // PRESENCE LEAVE
  socket.on("presence:leave", ({ roomId, userId }) => {
    console.log(`🟥 Presence leave → ${userId} left ${roomId}`);

    if (!roomUsers[roomId]) return;

    roomUsers[roomId] = roomUsers[roomId].filter(
      (u) => u.userId !== userId
    );
    
    // Remove the socket from the room as they are explicitly leaving
    socket.leave(roomId);

    io.to(roomId).emit("presence:update", roomUsers[roomId]);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    const info = socket.data.userInfo;
    if (!info) return;

    const { roomId, userId, username } = info;
    if (!roomUsers[roomId]) return;

    roomUsers[roomId] = roomUsers[roomId].filter(
      (u) => u.userId !== userId
    );

    console.log(`⚠️ Removing ${username} (${userId}) from ${roomId}`);

    io.to(roomId).emit("presence:update", roomUsers[roomId]);
  });
});