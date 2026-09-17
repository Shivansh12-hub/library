import cron from "node-cron";
import Booking from "../models/Booking.js";
import { getIO } from "../socket.js";
import { notifyPassExpiring } from "../utils/smsService.js";

export const initCronJobs = () => {
  // 1. Runs every hour to mark expired passes and free up seats
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      const expiredBookings = await Booking.find({
        status: "active",
        endDate: { $lt: now },
      });

      if (expiredBookings.length > 0) {
        await Booking.updateMany(
          { _id: { $in: expiredBookings.map((b) => b._id) } },
          { $set: { status: "expired" } }
        );

        // Notify active floor plans to mark seats available in real-time
        try {
          const io = getIO();
          expiredBookings.forEach((b) => {
            io.to(`library_${b.library}`).emit("seat_vacated", {
              seatId: b.seat,
              libraryId: b.library,
            });
          });
        } catch (socketErr) {
          console.warn("Socket broadcast skipped during cron run:", socketErr.message);
        }

        console.log(`[Cron] Auto-expired ${expiredBookings.length} outdated bookings.`);
      }
    } catch (err) {
      console.error("[Cron Error] Failed to expire bookings:", err.message);
    }
  });

  // 2. Runs daily at 9:00 AM to dispatch 3-day expiry warnings (Email + SMS)
  cron.schedule("0 9 * * *", async () => {
    try {
      const targetStart = new Date();
      targetStart.setDate(targetStart.getDate() + 3);
      targetStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const expiringBookings = await Booking.find({
        status: "active",
        endDate: { $gte: targetStart,$lte: targetEnd },
      })
        .populate("user", "name email phone")
        .populate("library", "name")
        .populate("seat", "seatNumber")
        .lean();

      if (expiringBookings.length > 0) {
        for (const b of expiringBookings) {
          await notifyPassExpiring({
            email: b.user?.email,
            phone: b.user?.phone,
            userName: b.user?.name || "Student",
            libraryName: b.library?.name || "DeskPlatform",
            seatNumber: b.seat?.seatNumber || "N/A",
            endDate: b.endDate,
          });
        }
        console.log(`[Cron] Sent expiry reminders for ${expiringBookings.length} passes.`);
      }
    } catch (err) {
      console.error("[Cron Error] Failed to send expiry reminders:", err.message);
    }
  });
};