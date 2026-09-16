import { Router } from "express";
import {
  createLibrary,
  getMyLibraries,
  batchCreateSeats,
  getLiveOccupancy,
  assignWalkIn,
  verifyGateQr,
  vacateSeat,
  transferSeat,
  toggleSeatMaintenance,
  getRevenueReport,
} from "../controllers/owner.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createLibrarySchema,
  batchCreateSeatsSchema,
  walkInBookingSchema,
  verifyQrSchema,
} from "../validators/owner.validator.js";

const router = Router();

// Secure all endpoints: requires logged-in user with 'owner' or 'admin' role
router.use(authenticate, authorize("owner", "admin"));

// Library Management
router.post("/libraries", validate(createLibrarySchema), createLibrary);
router.get("/libraries", getMyLibraries);

// Seat Inventory
router.post(
  "/libraries/:libraryId/seats/batch",
  validate(batchCreateSeatsSchema),
  batchCreateSeats
);

// Real-time Desk Grid (supports /occupancy and /live-grid aliases)
router.get("/libraries/:libraryId/occupancy", getLiveOccupancy);
router.get("/libraries/:libraryId/live-grid", getLiveOccupancy);

// Seat Controls
router.patch("/libraries/:libraryId/seats/:seatId/vacate", vacateSeat);
router.patch("/libraries/:libraryId/seats/:currentSeatId/transfer", transferSeat);
router.patch("/libraries/:libraryId/seats/:seatId/maintenance", toggleSeatMaintenance);

// Walk-in Management
router.post(
  "/libraries/:libraryId/walk-in",
  validate(walkInBookingSchema),
  assignWalkIn
);

// Turnstile / Gate QR Scanner Verification (supports /verify-qr and /gate-verify aliases)
router.post(
  "/libraries/:libraryId/verify-qr",
  validate(verifyQrSchema),
  verifyGateQr
);
router.post(
  "/libraries/:libraryId/gate-verify",
  verifyGateQr
);

// Financial Ledger & Revenue Reports
router.get("/libraries/:libraryId/revenue", getRevenueReport);

export default router;