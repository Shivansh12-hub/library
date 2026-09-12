import mongoose from "mongoose";
import crypto from "node:crypto";
import User from "../models/User.js";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";
import { getIO } from "../socket.js";

// 1. Discover Libraries (Nearby coordinates, city, or amenities)
export const getLibraries = asyncHandler(async (req, res) => {
  const {
    longitude,
    latitude,
    maxDistanceKm = 10,
    city,
    amenities,
  } = req.query;
  const filter = { isActive: true };

  // Geospatial radius search using GeoJSON
  if (longitude && latitude) {
    filter["address.location"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [
            Number.parseFloat(longitude),
            Number.parseFloat(latitude),
          ],
        },
        $maxDistance: Number.parseFloat(maxDistanceKm) * 1000, // In meters
      },
    };
  } else if (city) {
    filter["address.city"] = new RegExp(city.trim(), "i");
  }

  // Filter by amenities (e.g. ?amenities=wifi,ac)
  if (amenities) {
    const list = amenities.split(",").map((item) => item.trim());
    filter.amenities = { $all: list };
  }

  const libraries = await Library.find(filter)
    .select("name description address amenities shifts photos")
    .lean();

  res.status(200).json({
    success: true,
    count: libraries.length,
    data: libraries,
  });
});

// 2. Get Single Library Profile & Details
export const getLibraryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  const library = await Library.findOne({ _id: id, isActive: true })
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

// 3. Get Interactive Seat Matrix & Real-Time Availability
export const getAvailableSeats = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const { shiftId, startDate, endDate } = req.query;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  if (!shiftId || !startDate || !endDate) {
    return next(
      new ApiError(
        400,
        "shiftId, startDate, and endDate are required query parameters",
      ),
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return next(new ApiError(400, "endDate must be greater than startDate"));
  }

  // Run physical seat lookup and conflicting bookings check concurrently
  const [allSeats, conflictingBookings] = await Promise.all([
    Seat.find({ library: libraryId, isActive: true }).lean(),
    Booking.find({
      library: libraryId,
      shiftId,
      status: "active",
      paymentStatus: { $in: ["completed", "pending"] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    })
      .select("seat")
      .lean(),
  ]);

  const bookedSeatIdSet = new Set(
    conflictingBookings.map((b) => b.seat.toString()),
  );

  // Map floor plan grid layout with real-time vacancy flag
  const seatGrid = allSeats.map((seat) => ({
    _id: seat._id,
    seatNumber: seat.seatNumber,
    type: seat.type,
    hasSocket: seat.hasSocket,
    hasLocker: seat.hasLocker,
    isAvailable: !bookedSeatIdSet.has(seat._id.toString()),
  }));

  res.status(200).json({
    success: true,
    totalSeats: seatGrid.length,
    availableCount: seatGrid.filter((s) => s.isAvailable).length,
    data: seatGrid,
  });
});

// 4. Reserve a Seat (Atomic MongoDB Transaction to prevent race conditions)
export const createBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
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

    // Concurrency Lock: Double-booking guard inside isolated transaction
    const conflict = await Booking.findOne({
      seat: seatId,
      shiftId,
      status: "active",
      paymentStatus: { $in: ["completed", "pending"] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(
        new ApiError(
          409,
          "This seat has just been booked for the chosen shift. Please select another.",
        ),
      );
    }

    // Generate unique gate QR code pass token (16-char hex)
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
          paymentStatus: "completed", // Change to 'pending' if chaining Razorpay/Stripe webhook
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const io = getIO();

    // Broadcast to anyone looking at this library's seat layout
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

// 5. Get User's Active and Past Bookings
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
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

// 6. Get Single Booking Pass Details (For Gate Entry QR Rendering)
export const getBookingPass = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return next(new ApiError(400, "Invalid booking ID format"));
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user: req.user.id,
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

// 7. Toggle Save / Bookmark Library
export const toggleSaveLibrary = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    return next(new ApiError(400, "Invalid library ID format"));
  }

  const user = await User.findById(req.user.id);
  const isSaved = user.savedLibraries.includes(libraryId);

  if (isSaved) {
    user.savedLibraries.pull(libraryId);
  } else {
    user.savedLibraries.push(libraryId);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: isSaved
      ? "Library removed from saved list"
      : "Library saved successfully",
    savedLibraries: user.savedLibraries,
  });
});
