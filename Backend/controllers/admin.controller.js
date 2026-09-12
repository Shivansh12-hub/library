import User from '../models/User.js';
import Library from '../models/Library.js';
import Booking from '../models/Booking.js';
import { ApiError, asyncHandler } from '../utils/apiResponse.js';

// 1. Platform-Wide KPIs & Analytics
export const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalOwners,
    totalLibraries,
    totalBookings,
    revenueAgg
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'owner' }),
    Library.countDocuments(),
    Booking.countDocuments({ paymentStatus: 'completed' }),
    Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } }
    ])
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  res.status(200).json({
    success: true,
    data: {
      usersCount: totalUsers,
      ownersCount: totalOwners,
      librariesCount: totalLibraries,
      completedBookings: totalBookings,
      totalGrossRevenue: totalRevenue,
      estimatedPlatformCut: Math.round(totalRevenue * 0.10) // e.g., 10% take-rate
    }
  });
});

// 2. Manage Libraries (List, filter, approve/disable)
export const getAllLibrariesAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};

  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const libraries = await Library.find(filter)
    .populate('owner', 'name phone email')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })
    .lean();

  const total = await Library.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    data: libraries
  });
});

// 3. Toggle Library Status (Deactivate fraudulent or delinquent branches)
export const toggleLibraryStatus = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;

  const library = await Library.findById(libraryId);
  if (!library) {
    return next(new ApiError(404, 'Library not found'));
  }

  library.isActive = !library.isActive;
  await library.save();

  res.status(200).json({
    success: true,
    message: `Library ${library.isActive ? 'activated' : 'suspended'} successfully`,
    isActive: library.isActive
  });
});

// 4. Force Cancel / Refund a Booking (Dispute resolution)
export const resolveBookingDispute = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const { action, note } = req.body; // action: 'refund' | 'cancel'

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new ApiError(404, 'Booking not found'));
  }

  if (action === 'refund') {
    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
  } else {
    booking.status = 'cancelled';
  }

  await booking.save();

  res.status(200).json({
    success: true,
    message: `Booking has been updated to ${booking.status} with payment status: ${booking.paymentStatus}`,
    data: booking
  });
});