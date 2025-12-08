import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { userJoin, userLeave, getUsers } from './src/utils/user.js'; 

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // 1. EXISTING: Handles the Canvas Drawing (Undo/Redo paths)
  const roomHistory = {};

  // 2. NEW: Handles the "Boards" (Sticky notes/Elements)
  // Structure: { roomId: [ { id: 1, x: 100, y: 100, text: "hello" }, ... ] }
  const boardHistory = {};

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('userJoined', ({ userId, roomId }) => {
      const userData = { id: userId, roomId, socketId: socket.id };
      userJoin(userData);
      socket.join(roomId);

      const roomUsers = getUsers(roomId);

      // --- A. INITIALIZE STATES ---
      if (!roomHistory[roomId]) {
        roomHistory[roomId] = { history: [], step: -1 };
      }
      
      if (!boardHistory[roomId]) {
        boardHistory[roomId] = []; // Start with empty array of boards
      }

      socket.emit("userIsJoined", { success: true, users: roomUsers });
      socket.broadcast.to(roomId).emit("allUsers", roomUsers);

      // --- B. SYNC CANVAS (Existing Logic) ---
      const room = roomHistory[roomId];
      let currentImage = null;
      if (room.step >= 0 && room.history[room.step]) {
          currentImage = room.history[room.step];
      }
      socket.emit('draw', { roomId, image: currentImage });

      // --- C. SYNC BOARDS (New Logic) ---
      // Send the current list of boards to the user who just joined
      socket.emit('boards:sync', boardHistory[roomId]);
      
      console.log('userJoined', userId, roomId);
    });

    // --- CANVAS EVENTS (Existing Logic) ---
    socket.on('draw', ({ roomId, image }) => {
      if (!roomHistory[roomId]) return;
      const room = roomHistory[roomId];
      const newStep = room.step + 1;
      room.history = room.history.slice(0, newStep);
      room.history.push(image);
      room.step = newStep;
      io.to(roomId).emit('draw', { roomId, image });
    });

    socket.on('undo', ({ roomId }) => {
        if (!roomHistory[roomId]) return;
        const room = roomHistory[roomId];
        if (room.step > 0) {
            room.step -= 1;
            const prevImage = room.history[room.step];
            io.to(roomId).emit('draw', { roomId, image: prevImage });
        } else if (room.step === 0) {
             room.step = -1;
             io.to(roomId).emit('draw', { roomId, image: null });
        }
    });

    socket.on('redo', ({ roomId }) => {
        if (!roomHistory[roomId]) return;
        const room = roomHistory[roomId];
        if (room.step < room.history.length - 1) {
            room.step += 1;
            const nextImage = room.history[room.step];
            io.to(roomId).emit('draw', { roomId, image: nextImage });
        }
    });

    // --- NEW: BOARD MANAGEMENT EVENTS ---

    // 1. Add a new Board
    socket.on('board:add', ({ roomId, boardData }) => {
        if (!boardHistory[roomId]) boardHistory[roomId] = [];
        
        // Add to server memory
        boardHistory[roomId].push(boardData);
        
        // Broadcast to everyone (including sender) to render it
        io.to(roomId).emit('board:add', boardData);
    });

    // 2. Update an existing Board (moved, resized, text changed)
    socket.on('board:update', ({ roomId, boardData }) => {
        if (!boardHistory[roomId]) return;

        // Find and update the specific board in the array
        const index = boardHistory[roomId].findIndex(b => b.id === boardData.id);
        if (index !== -1) {
            boardHistory[roomId][index] = boardData;
            
            // Broadcast the update so everyone sees the board move/change
            io.to(roomId).emit('board:update', boardData);
        }
    });

    // 3. Delete a Board
    socket.on('board:delete', ({ roomId, boardId }) => {
        if (!boardHistory[roomId]) return;

        // Remove from server memory
        boardHistory[roomId] = boardHistory[roomId].filter(b => b.id !== boardId);

        // Tell everyone to remove it from their screen
        io.to(roomId).emit('board:delete', boardId);
    });
    
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if(user){
             const roomUsers = getUsers(user.roomId);
             io.to(user.roomId).emit("allUsers", roomUsers);
        }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});