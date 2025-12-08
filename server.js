// server.js
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

  // CHANGED: Store history and step per room instead of just one image
  // Structure: { roomId: { history: [img1, img2], step: 1 } }
  const roomHistory = {};

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('userJoined', ({ userId, roomId }) => {
      const userData = { id: userId, roomId, socketId: socket.id };
      userJoin(userData);
      socket.join(roomId);

      const roomUsers = getUsers(roomId);

      // 1. Initialize Room History if it doesn't exist
      if (!roomHistory[roomId]) {
        roomHistory[roomId] = {
            history: [],
            step: -1
        };
      }

      socket.emit("userIsJoined", { success: true, users: roomUsers });
      socket.broadcast.to(roomId).emit("allUsers", roomUsers);

      // 2. Send the current image from Server History (if exists)
      const room = roomHistory[roomId];
      let currentImage = null;
      if (room.step >= 0 && room.history[room.step]) {
          currentImage = room.history[room.step];
      }
      
      socket.emit('draw', { roomId, image: currentImage });
      
      console.log('userJoined', userId, roomId);
    });

    socket.on('draw', ({ roomId, image }) => {
      // 3. SERVER SIDE HISTORY LOGIC (Moved from client)
      if (!roomHistory[roomId]) return;
      const room = roomHistory[roomId];

      // Slice logic: remove "future" redo states if we draw something new
      const newStep = room.step + 1;
      room.history = room.history.slice(0, newStep);
      
      // Push new image
      room.history.push(image);
      room.step = newStep;

      // Broadcast to EVERYONE (including sender) to stay in sync
      io.to(roomId).emit('draw', { roomId, image });
    });

    // 4. Handle Undo Request
    socket.on('undo', ({ roomId }) => {
        if (!roomHistory[roomId]) return;
        const room = roomHistory[roomId];

        if (room.step > 0) {
            room.step -= 1;
            const prevImage = room.history[room.step];
            io.to(roomId).emit('draw', { roomId, image: prevImage });
        } else if (room.step === 0) {
             // Optional: Clear board if we undo the very first stroke
             room.step = -1;
             io.to(roomId).emit('draw', { roomId, image: null }); // clear
        }
    });

    // 5. Handle Redo Request
    socket.on('redo', ({ roomId }) => {
        if (!roomHistory[roomId]) return;
        const room = roomHistory[roomId];

        if (room.step < room.history.length - 1) {
            room.step += 1;
            const nextImage = room.history[room.step];
            io.to(roomId).emit('draw', { roomId, image: nextImage });
        }
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