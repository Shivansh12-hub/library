import { Router } from 'express';
import {
  getPlatformStats,
  getAllLibrariesAdmin,
  toggleLibraryStatus,
  resolveBookingDispute
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';

const router = Router();

// Strict: Only admin can access these routes
router.use(authenticate, authorize('admin'));

router.get('/stats', getPlatformStats);
router.get('/libraries', getAllLibrariesAdmin);
router.patch('/libraries/:libraryId/toggle-status', toggleLibraryStatus);
router.patch('/bookings/:bookingId/dispute', resolveBookingDispute);

export default router;