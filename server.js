// server.js
import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
// Ensure this path matches your file structure exactly
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

  const whiteboards = {};

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('userJoined', ({ userId, roomId }) => {
      // 1. Prepare data (keys match user.js now)
      const userData = { id: userId, roomId, socketId:socket.id }; 
      
      // 2. Add user to store
      userJoin(userData);
      socket.join(roomId);

      // 3. FIX: Get the FILTERED list for this specific room
      const roomUsers = getUsers(roomId);

      // 4. Send success + list to the NEW user
      socket.emit("userIsJoined", { success: true, users: roomUsers });

      // 5. Send list to EVERYONE ELSE in the room
      socket.broadcast.to(roomId).emit("allUsers", roomUsers);

      // 6. Send existing drawing
      const roomImage = whiteboards[roomId] || null;
      socket.emit('draw', { roomId, image: roomImage });
      
      console.log('userJoined', userId, roomId);
    });

    socket.on('draw', ({ roomId, image }) => {
      whiteboards[roomId] = image;
      // Broadcast to others in the room
      socket.to(roomId).emit('draw', { roomId, image });
    });
    
    // Handle disconnect
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