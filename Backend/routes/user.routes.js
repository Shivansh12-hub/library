import { Router } from 'express';
import {
  getLibraries,
  getLibraryById,
  getAvailableSeats,
  createBooking,
  getMyBookings,
  renewBooking,
  getBookingPass,
  toggleSaveLibrary,
  getStudyPlannerStats,
  addLibraryReview,
  getLibraryReviews,
  relocateMySeat,
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBookingSchema } from '../validators/userValidator.js';

const router = Router();

// Public Discovery Endpoints
router.get('/libraries', getLibraries);
router.get('/libraries/:id', getLibraryById);
router.get('/libraries/:libraryId/reviews', getLibraryReviews);

// Seat Availability (Supports all common naming conventions)
router.get('/libraries/:libraryId/available-seats', getAvailableSeats);
router.get('/libraries/:libraryId/seats/availability', getAvailableSeats);
router.get('/libraries/:libraryId/seats', getAvailableSeats);

// Protected User Endpoints
router.use(authenticate);

// Study Planner Stats
router.get('/study-stats', getStudyPlannerStats);

// Reviews
router.post('/libraries/:libraryId/reviews', addLibraryReview);

// Bookings & Passes
router.get('/bookings', getMyBookings);
router.get('/bookings/my-bookings', getMyBookings);
router.get('/my-bookings', getMyBookings);
router.post('/bookings', validate(createBookingSchema), createBooking);
router.post('/bookings/renew', renewBooking);
router.patch('/bookings/relocate', relocateMySeat);
router.get('/bookings/:bookingId/pass', getBookingPass);

// Library Favorites
router.post('/libraries/:libraryId/save', toggleSaveLibrary);

export default router;