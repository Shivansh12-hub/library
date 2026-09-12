import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ActivityProvider>
    </AuthProvider>
  );
}