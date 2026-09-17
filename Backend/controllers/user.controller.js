import mongoose from "mongoose";
import crypto from "node:crypto";
import User from "../models/User.js";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import Attendance from "../models/Attendance.js";
import Review from "../models/review.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";
import { getIO, finalizeBookingHold } from "../socket.js";
import { notifyBookingConfirmed } from "../utils/smsService.js";

// Helper: Escape Regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 1. Submit a verified review for a library
export const addLibraryReview = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const { rating, comment, tags } = req.body;
  const userId = req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format."));
  }

  const hasBooked = await Booking.exists({
    user: userId,
    library: libraryId,
    paymentStatus: "completed",
  });

  if (!hasBooked) {
    return next(
      new ApiError(403, "You can only review libraries where you have held a booking.")
    );
  }

  const review = await Review.findOneAndUpdate(
    { user: userId, library: libraryId },
    { rating, comment, tags },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json({
    success: true,
    message: "Review submitted successfully!",
    data: review,
  });
});

// 2. Fetch all reviews for a library
export const getLibraryReviews = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format."));
  }

  const reviews = await Review.find({ library: libraryId })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .lean();

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "New";

  res.status(200).json({
    success: true,
    count: reviews.length,
    averageRating,
    data: reviews,
  });
});

// 3. Discover Libraries (Search, Geolocation, Filters)
export const getLibraries = asyncHandler(async (req, res) => {
  const { search, city, amenities, longitude, latitude, maxDistanceKm = 10 } = req.query;

  const filter = { isActive: { $ne: false } };

  const parsedLng = parseFloat(longitude);
  const parsedLat = parseFloat(latitude);

  if (!Number.isNaN(parsedLng) && !Number.isNaN(parsedLat)) {
    filter["address.location"] = {
      $near: {$geometry: {
          type: "Point",
          coordinates: [parsedLng, parsedLat],
        },
        $maxDistance: parseFloat(maxDistanceKm) * 1000,
      },
    };
  } else if (search && search.trim() !== "") {
    const cleanSearch = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: cleanSearch,$options: "i" } },
      { description: { $regex: cleanSearch,$options: "i" } },
      { "address.city": { $regex: cleanSearch,$options: "i" } },
      { "address.locality": { $regex: cleanSearch,$options: "i" } },
    ];
  } else if (city && city.trim() !== "") {
    filter["address.city"] = { $regex: escapeRegex(city.trim()),$options: "i" };
  }

  if (amenities && typeof amenities === "string" && amenities.trim() !== "") {
    const list = amenities.split(",").map((item) => item.trim()).filter(Boolean);
    if (list.length > 0) {
      filter.amenities = { $all: list };
    }
  }

  const libraries = await Library.find(filter)
    .populate("owner", "name phone email")
    .lean();

  res.status(200).json({
    success: true,
    count: libraries.length,
    data: libraries,
    libraries: libraries,
  });
});

// 4. Get Study Planner & Attendance Analytics
export const getStudyPlannerStats = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [aggregatedStats, logs] = await Promise.all([
    Attendance.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: { $ifNull: ["$durationMinutes", 0] } },
          totalSessions: { $sum: 1 },
        },
      },
    ]),
    Attendance.find({ user: userId })
      .populate("library", "name")
      .sort({ checkInTime: -1 })
      .limit(30)
      .lean(),
  ]);

  const totalMinutes = aggregatedStats[0]?.totalMinutes || 0;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const activeSession = logs.find((l) => l.status === "inside") || null;

  res.status(200).json({
    success: true,
    data: {
      totalHours,
      totalSessions: aggregatedStats[0]?.totalSessions || logs.length,
      activeSession,
      history: logs,
    },
  });
});

// 5. Get Single Library Profile
export const getLibraryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  const library = await Library.findOne({ _id: id, isActive: { $ne: false } })
    .populate("owner", "name phone email")
    .lean();

  if (!library) {
    return next(new ApiError(404, "Library not found or inactive"));
  }

  res.status(200).json({
    success: true,
    data: library,
  });
});

// 6. Interactive Seat Matrix & Availability
export const getAvailableSeats = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const { shiftId, startDate, endDate } = req.query;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  if (!shiftId || !startDate || !endDate) {
    return next(
      new ApiError(400, "shiftId, startDate, and endDate are required query parameters")
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return next(new ApiError(400, "endDate must be a valid date greater than startDate"));
  }

  const [allSeats, conflictingBookings] = await Promise.all([
    Seat.find({ library: libraryId, isActive: true }).lean(),
    Booking.find({
      library: libraryId,
      shiftId,
      status: "active",
      paymentStatus: { $in: ["completed", "pending"] },
      $or: [{ startDate: { $lte: end }, endDate: {$gte: start } }],
    })
      .select("seat")
      .lean(),
  ]);

  const bookedSeatIdSet = new Set(conflictingBookings.map((b) => b.seat.toString()));

  const seatGrid = allSeats.map((seat) => ({
    _id: seat._id,
    seatNumber: seat.seatNumber,
    type: seat.type,
    hasSocket: seat.hasSocket,
    hasLocker: seat.hasLocker,
    isMaintenance: Boolean(seat.isMaintenance),
    isAvailable: !bookedSeatIdSet.has(seat._id.toString()) && !seat.isMaintenance,
  }));

  res.status(200).json({
    success: true,
    totalSeats: seatGrid.length,
    availableCount: seatGrid.filter((s) => s.isAvailable).length,
    data: seatGrid,
  });
});

// 7. Renew an Active Booking
export const renewBooking = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.body;
  const userId = req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return next(new ApiError(400, "Invalid booking ID format"));
  }

  const booking = await Booking.findOne({ _id: bookingId, user: userId });
  if (!booking) {
    return next(new ApiError(404, "Booking pass not found."));
  }

  const currentEnd = new Date(booking.endDate);
  const baseDate = currentEnd > new Date() ? currentEnd : new Date();
  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + 30);

  // Check if renewal window conflicts with an upcoming reservation
  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    seat: booking.seat,
    shiftId: booking.shiftId,
    status: "active",
    paymentStatus: { $in: ["completed", "pending"] },
    $or: [{ startDate: { $lte: newEndDate }, endDate: {$gte: baseDate } }],
  });

  if (conflict) {
    return next(
      new ApiError(409, "Cannot renew: this desk has an upcoming booking in the renewal window.")
    );
  }

  booking.endDate = newEndDate;
  booking.status = "active";
  booking.paymentStatus = "completed";
  await booking.save();

  try {
    const io = req.app.get("io") || getIO();
    if (io) {
      io.emit("activity_logged", {
        id: Date.now(),
        type: "renewal",
        message: `Pass renewed successfully for Desk ID: ${booking.seat}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
  } catch (err) {
    console.warn("Socket broadcast error:", err.message);
  }

  res.status(200).json({
    success: true,
    message: "Pass renewed successfully for another 30 days.",
    data: booking,
  });
});

// 8. Reserve a Seat (Atomic MongoDB Transaction)
export const createBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id || req.user.id;
    const {
      libraryId,
      seatId,
      shiftId,
      bookingType = "monthly",
      startDate,
      endDate,
      amountPaid,
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      await session.abortTransaction();
      return next(new ApiError(400, "endDate must be greater than startDate"));
    }

    const existingUserBooking = await Booking.findOne({
      user: userId,
      library: libraryId,
      shiftId,
      status: { $in: ["active", "confirmed"] },
      $or: [{ startDate: { $lte: end }, endDate: {$gte: start } }],
    }).session(session);

    if (existingUserBooking) {
      await session.abortTransaction();
      return next(
        new ApiError(400, "You already have an active desk reserved for this shift.")
      );
    }

    const conflict = await Booking.findOne({
      seat: seatId,
      shiftId,
      status: "active",
      paymentStatus: { $in: ["completed", "pending"] },
      $or: [{ startDate: { $lte: end }, endDate: {$gte: start } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(
        new ApiError(409, "This seat has just been booked for the chosen shift. Please select another.")
      );
    }

    const seat = await Seat.findById(seatId).session(session);
    if (!seat) {
      await session.abortTransaction();
      return next(new ApiError(404, "Selected seat does not exist."));
    }

    if (seat.isMaintenance) {
      await session.abortTransaction();
      return next(
        new ApiError(400, "This desk is currently under maintenance and cannot be reserved.")
      );
    }

    const qrPassCode = crypto.randomBytes(8).toString("hex").toUpperCase();

    const [newBooking] = await Booking.create(
      [
        {
          user: userId,
          library: libraryId,
          seat: seatId,
          shiftId,
          bookingType,
          startDate: start,
          endDate: end,
          amountPaid,
          qrPassCode,
          status: "active",
          paymentStatus: "completed",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    finalizeBookingHold(libraryId, shiftId, seatId);

    const [bookedUser, bookedLib] = await Promise.all([
      User.findById(userId).select("name phone email").lean(),
      Library.findById(libraryId).select("name").lean(),
    ]);

    notifyBookingConfirmed({
      email: bookedUser?.email,
      phone: bookedUser?.phone,
      userName: bookedUser?.name || "Student",
      libraryName: bookedLib?.name || "DeskPlatform",
      seatNumber: seat.seatNumber,
      startDate: start,
      endDate: end,
      qrPassCode,
    }).catch((err) => console.warn("Background notification dispatch failed:", err.message));

    try {
      const io = req.app.get("io") || getIO();
      if (io) {
        io.to(`library_${libraryId}`).emit("seat_reserved", {
          seatId,
          shiftId,
          startDate: start,
          endDate: end,
          bookedBy: {
            userName: req.user.name,
            userPhone: req.user.phone,
          },
        });

        io.emit("activity_logged", {
          id: Date.now(),
          type: "booking",
          message: `Desk ${seat.seatNumber} reserved by ${req.user.name || "Student"}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch (socketErr) {
      console.warn("Socket broadcast error:", socketErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully",
      data: newBooking,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// 9. Get User's Active and Past Bookings
export const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const bookings = await Booking.find({ user: userId })
    .populate("library", "name address photos amenities")
    .populate("seat", "seatNumber type")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

// 10. Get Single Booking Pass
export const getBookingPass = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return next(new ApiError(400, "Invalid booking ID format"));
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  })
    .populate("library", "name address")
    .populate("seat", "seatNumber type")
    .lean();

  if (!booking) {
    return next(new ApiError(404, "Booking pass not found"));
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// 11. Toggle Bookmark / Favorite
export const toggleSaveLibrary = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const userId = req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  const savedList = user.savedLibraries || [];
  const isSaved = savedList.some((id) => id.toString() === libraryId);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    isSaved
      ? { $pull: { savedLibraries: libraryId } }
      : { $addToSet: { savedLibraries: libraryId } },
    { new: true }
  ).select("savedLibraries");

  res.status(200).json({
    success: true,
    message: isSaved ? "Library removed from saved list" : "Library saved successfully",
    savedLibraries: updatedUser.savedLibraries,
  });
});

// 12. Student Self-Service Desk Relocation (Transactional)
export const relocateMySeat = asyncHandler(async (req, res, next) => {
  const { bookingId, targetSeatId } = req.body;
  const userId = req.user._id || req.user.id;

  if (!mongoose.Types.ObjectId.isValid(bookingId) || !mongoose.Types.ObjectId.isValid(targetSeatId)) {
    return next(new ApiError(400, "Invalid booking or target seat ID format"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
      status: "active",
    }).session(session);

    if (!booking) {
      await session.abortTransaction();
      return next(new ApiError(404, "Active booking pass not found"));
    }

    const targetSeat = await Seat.findOne({
      _id: targetSeatId,
      library: booking.library,
      isActive: true,
    }).session(session);

    if (!targetSeat) {
      await session.abortTransaction();
      return next(new ApiError(404, "Target desk does not exist"));
    }

    if (targetSeat.isMaintenance) {
      await session.abortTransaction();
      return next(new ApiError(400, "Target desk is currently under maintenance"));
    }

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      seat: targetSeatId,
      shiftId: booking.shiftId,
      status: "active",
      paymentStatus: { $in: ["completed", "pending"] },
      $or: [{ startDate: { $lte: booking.endDate }, endDate: {$gte: booking.startDate } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(new ApiError(409, "Target seat is already occupied for this shift"));
    }

    const oldSeatId = booking.seat;
    booking.seat = targetSeatId;
    await booking.save({ session });

    await session.commitTransaction();

    const io = req.app.get("io") || getIO();
    if (io) {
      io.to(`library_${booking.library}`).emit("seat_transferred", {
        fromSeatId: oldSeatId,
        toSeatId: targetSeatId,
        user: userId,
      });
    }

    res.status(200).json({
      success: true,
      message: `Relocated successfully to Desk ${targetSeat.seatNumber}`,
      data: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});