import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const ActivityContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const ActivityProvider = ({ children }) => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      type: 'system',
      message: 'Platform telemetry connected.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('activity_logged', (newLog) => {
      setLogs((prev) => [newLog, ...prev.slice(0, 19)]); // Keep last 20 entries
    });

    return () => socket.disconnect();
  }, []);

  return (
    <ActivityContext.Provider value={{ logs }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);