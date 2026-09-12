import { Router } from 'express';
import {
  createLibrary,
  getMyLibraries,
  batchCreateSeats,
  getLiveOccupancy,
  assignWalkIn,
  verifyGateQr
} from '../controllers/owner.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createLibrarySchema,
  batchCreateSeatsSchema,
  walkInBookingSchema,
  verifyQrSchema
} from '../validators/owner.validator.js';

const router = Router();

// Secure all endpoints: requires logged-in user with 'owner' or 'admin' role
router.use(authenticate, authorize('owner', 'admin'));

// Library Management
router.post('/libraries', validate(createLibrarySchema), createLibrary);
router.get('/libraries', getMyLibraries);

// Seat Inventory
router.post(
  '/libraries/:libraryId/seats/batch',
  validate(batchCreateSeatsSchema),
  batchCreateSeats
);

// Real-Time Desk Grid
router.get('/libraries/:libraryId/occupancy', getLiveOccupancy);

// Walk-in Management
router.post(
  '/libraries/:libraryId/walk-in',
  validate(walkInBookingSchema),
  assignWalkIn
);

// Turnstile / Gate QR Scanner Verification
router.post(
  '/libraries/:libraryId/verify-qr',
  validate(verifyQrSchema),
  verifyGateQr
);

export default router;  