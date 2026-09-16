import cron from "node-cron";
import Booking from "../models/Booking.js";
import { getIO } from "../socket.js";

export const initCronJobs = () => {
  // Runs every hour to mark expired passes
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

        // Notify active clients to refresh floor availability
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
};