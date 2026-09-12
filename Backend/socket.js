import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client joins a room specific to a library (e.g., "library_65f1a2...")
    socket.on('join_library', (libraryId) => {
      socket.join(`library_${libraryId}`);
    });

    // Client leaves when navigating away
    socket.on('leave_library', (libraryId) => {
      socket.leave(`library_${libraryId}`);
    });

    socket.on('disconnect', () => {
      // Cleaned up automatically by Socket.io
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};