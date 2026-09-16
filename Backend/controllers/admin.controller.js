import mongoose from "mongoose";
import User from "../models/User.js";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";

// 1. Analytics with strict active property filtering
export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const activeLibs = await Library.find({ isActive: true }).select("_id").lean();
  const activeLibIds = activeLibs.map((l) => l._id);

  const [
    totalUsers,
    totalOwners,
    totalActiveLibraries,
    totalSeatsInActiveLibs,
    activeBookingsCount,
    revenueAgg,
    recentBookings,
    allLibraries,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    Library.countDocuments({ isActive: true }),
    Seat.countDocuments({ library: { $in: activeLibIds }, isActive: true }),
    Booking.countDocuments({
      library: { $in: activeLibIds },
      status: "active",
      paymentStatus: "completed",
    }),
    Booking.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amountPaid" } } },
    ]),
    Booking.find()
      .populate("user", "name phone")
      .populate("library", "name isActive")
      .populate("seat", "seatNumber")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Library.find().select("name address owner isActive").sort({ createdAt: -1 }).lean(),
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const globalOccupancyRate =
    totalSeatsInActiveLibs > 0
      ? ((activeBookingsCount / totalSeatsInActiveLibs) * 100).toFixed(1)
      : 0;

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalRevenue,
        totalStudents: totalUsers,
        totalOwners,
        totalLibraries: totalActiveLibraries,
        totalSeats: totalSeatsInActiveLibs,
        activeBookings: activeBookingsCount,
        globalOccupancyRate,
      },
      recentBookings,
      librariesList: allLibraries,
    },
  });
});

// 2. Suspend or Reactivate (Soft Toggle)
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
    message: `Library ${library.isActive ? "activated" : "suspended"} successfully`,
    isActive: library.isActive,
  });
});

// 3. Permanent Delete with Cascade Wipe
export const deleteLibraryPermanently = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const library = await Library.findById(libraryId).session(session);
    if (!library) {
      await session.abortTransaction();
      return next(new ApiError(404, "Library not found"));
    }

    // Cascade delete seats, bookings, and the library itself
    await Seat.deleteMany({ library: libraryId }).session(session);
    await Booking.deleteMany({ library: libraryId }).session(session);
    await Library.findByIdAndDelete(libraryId).session(session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Library and all linked seats & bookings permanently deleted.",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});