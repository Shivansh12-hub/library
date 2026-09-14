import User from "../models/User.js";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";

export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalOwners,
    totalLibraries,
    totalSeats,
    activeBookingsCount,
    revenueAgg,
    recentBookings,
    librariesList,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    Library.countDocuments({ isActive: true }),
    Seat.countDocuments({ isActive: true }),
    Booking.countDocuments({ status: "active", paymentStatus: "completed" }),
    Booking.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amountPaid" } } },
    ]),
    Booking.find()
      .populate("user", "name phone")
      .populate("library", "name")
      .populate("seat", "seatNumber")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Library.find({ isActive: true }).select("name address owner").lean(),
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const globalOccupancyRate =
    totalSeats > 0 ? ((activeBookingsCount / totalSeats) * 100).toFixed(1) : 0;

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalRevenue,
        totalStudents: totalUsers,
        totalOwners,
        totalLibraries,
        totalSeats,
        activeBookings: activeBookingsCount,
        globalOccupancyRate,
      },
      recentBookings,
      librariesList,
    },
  });
});

export const toggleLibraryStatus = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const library = await Library.findById(libraryId);

  if (!library) {
    return next(new ApiError(404, "Library not found"));
  }

  library.isActive = !library.isActive;
  await library.save();

  res.status(200).json({
    success: true,
    message: `Library ${library.isActive ? "activated" : "deactivated"} successfully`,
    isActive: library.isActive,
  });
});