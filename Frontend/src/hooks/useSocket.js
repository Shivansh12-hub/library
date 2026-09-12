import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useLibrarySocket = (libraryId, onSeatReserved) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!libraryId) return;

    socketRef.current = io(SOCKET_URL);

    socketRef.current.emit('join_library', libraryId);

    if (onSeatReserved) {
      socketRef.current.on('seat_reserved', onSeatReserved);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_library', libraryId);
        socketRef.current.disconnect();
      }
    };
  }, [libraryId, onSeatReserved]);

  return socketRef.current;
};