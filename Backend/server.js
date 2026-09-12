import http from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { initSocket } from './socket.js';
import { startBookingExpiryJob } from './cron/bookingExpiry.js';

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Init WebSockets
initSocket(httpServer);

// Init background jobs
startBookingExpiryJob();

// Connect DB & listen
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    httpServer.listen(PORT, () => {
      console.log(`Production server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });