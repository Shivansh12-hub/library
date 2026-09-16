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
import { getStudyPlannerStats } from "../controllers/user.controller.js";
import { addLibraryReview, getLibraryReviews } from "../controllers/user.controller.js";


const router = Router();



router.get("/libraries/:libraryId/reviews", getLibraryReviews);
router.post("/libraries/:libraryId/reviews", authenticate, addLibraryReview);


router.get("/study-stats", authenticate, getStudyPlannerStats);
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