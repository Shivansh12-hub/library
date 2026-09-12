import Task from '../models/Task.js';
import Booking from '../models/Booking.js';
import { ApiError, asyncHandler } from '../utils/apiResponse.js';

// Helper to verify if the user has an active, confirmed seat
// Helper to verify if the user has an active, confirmed seat
const verifyActivePass = async (userId) => {
  const now = new Date();

  return await Booking.findOne({
    user: userId,
    // Accept either 'active' or 'confirmed' (case-insensitive)
    status: { $in: ['active', 'confirmed', 'ACTIVE', 'CONFIRMED'] },
    // Ensure subscription hasn't expired
    endDate: { $gte: now },
  }).populate('library', 'name');
};

export const getDailyTasks = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;

  const activeBooking = await verifyActivePass(userId);
  if (!activeBooking) {
    return next(new ApiError(403, 'Active library subscription required to access the Study Planner.'));
  }

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const tasks = await Task.find({
    user: userId,
    date: targetDate,
  }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: tasks,
    activePass: {
      libraryName: activeBooking.library?.name,
      seatNumber: activeBooking.seat,
    },
  });
});

export const createTask = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;

  const activeBooking = await verifyActivePass(userId);
  if (!activeBooking) {
    return next(new ApiError(403, 'You must have an active desk booking to schedule tasks.'));
  }

  const { title, timeBlock, date, priority } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const task = await Task.create({
    user: userId,
    title,
    timeBlock,
    date: targetDate,
    priority: priority || 'medium',
  });

  res.status(201).json({ success: true, data: task });
});

export const toggleTaskStatus = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) {
    return next(new ApiError(404, 'Task not found'));
  }

  task.isCompleted = !task.isCompleted;
  await task.save();

  res.status(200).json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req, res, next) => {
  const userId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findOneAndDelete({ _id: taskId, user: userId });
  if (!task) {
    return next(new ApiError(404, 'Task not found'));
  }

  res.status(200).json({ success: true, message: 'Task deleted successfully' });
});