import { Router } from "express";
import {
  getPlatformAnalytics,
  toggleLibraryStatus,
} from "../controllers/admin.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Strict super admin gating
router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/analytics", getPlatformAnalytics);
router.patch("/libraries/:libraryId/toggle-status", toggleLibraryStatus);

export default router;