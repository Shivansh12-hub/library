import cron from 'node-cron';
import Booking from '../models/Booking.js';

export const startBookingExpiryJob = () => {
  // Runs at minute 0 of every hour (e.g., 1:00, 2:00, 3:00)
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      const result = await Booking.updateMany(
        {
          status: 'active',
          endDate: { $lt: now }
        },
        {
          $set: { status: 'expired' }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Cron] Automatically expired ${result.modifiedCount} finished bookings.`);
      }
    } catch (error) {
      console.error('[Cron Error] Failed to expire bookings:', error.message);
    }
  });
};