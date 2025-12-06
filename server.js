// server.js (project root)
import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';

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

  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('userJoined', ({ userId, roomId }) => {
      socket.join(roomId);
      console.log('userJoined', userId, roomId);
    });

    socket.on('draw', ({ roomId, image }) => {
    socket.to(roomId).emit('draw', { roomId, image });
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
