import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getDailyTasks,
  createTask,
  toggleTaskStatus,
  deleteTask,
} from '../controllers/task.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getDailyTasks);
router.post('/', createTask);
router.patch('/:taskId/toggle', toggleTaskStatus);
router.delete('/:taskId', deleteTask);

export default router;