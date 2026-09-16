import { Router } from "express";
import {
  getPlatformAnalytics,
  toggleLibraryStatus,
  deleteLibraryPermanently,
} from "../controllers/admin.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/analytics", getPlatformAnalytics);
router.patch("/libraries/:libraryId/toggle-status", toggleLibraryStatus);
router.delete("/libraries/:libraryId", deleteLibraryPermanently);

export default router;