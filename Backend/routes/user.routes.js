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
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBookingSchema } from '../validators/userValidator.js';

const router = Router();

// Public Discovery Endpoints
router.get('/libraries', getLibraries);
router.get('/libraries/:id', getLibraryById);
router.get('/libraries/:libraryId/seats/availability', getAvailableSeats);

// Protected User Endpoints
router.use(authenticate);

// Bookings & Passes
router.get('/bookings', getMyBookings);
router.get('/bookings/my-bookings', getMyBookings);
router.get('/my-bookings', getMyBookings);
router.post('/bookings', validate(createBookingSchema), createBooking);
router.post('/bookings/renew', renewBooking);
router.get('/bookings/:bookingId/pass', getBookingPass);

// Library Favorites
router.post('/libraries/:libraryId/save', toggleSaveLibrary);

export default router;