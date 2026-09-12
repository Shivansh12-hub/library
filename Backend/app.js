import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import taskRoutes from './routes/task.routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '16kb' }));

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Route Mounts

app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/admin', adminRoutes);

// Catch-all route not found
// Catch-all route not found
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Central Error Middleware
app.use(errorHandler);

export default app;