import mongoose from "mongoose";
import crypto from "node:crypto";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";
import { getIO } from "../socket.js";

// Helper: Ensure authenticated owner owns the target library
const assertOwnership = async (libraryId, ownerId) => {
  const library = await Library.findById(libraryId);
  if (!library) {
    throw new ApiError(404, "Library not found");
  }
  if (library.owner.toString() !== ownerId.toString()) {
    throw new ApiError(403, "Unauthorized: You do not own this library");
  }
  return library;
};

// 1. Create or Register a New Library Profile
export const createLibrary = asyncHandler(async (req, res) => {
  const ownerId = req.user?._id || req.user?.id;
  const newLibrary = await Library.create({
    ...req.body,
    owner: ownerId,
  });

  res.status(201).json({
    success: true,
    message: "Library profile created successfully",
    data: newLibrary,
  });
});

// 2. Get All Libraries Belonging to Logged-in Owner
export const getMyLibraries = asyncHandler(async (req, res) => {
  const ownerId = req.user?._id || req.user?.id;
  const libraries = await Library.find({ owner: ownerId }).lean();

  res.status(200).json({
    success: true,
    count: libraries.length,
    data: libraries,
  });
});

// 3. Batch Create Seats
export const batchCreateSeats = asyncHandler(async (req, res) => {
  const { libraryId } = req.params;
  const { prefix = "S", totalSeats, type, hasSocket, hasLocker } = req.body;
  const ownerId = req.user?._id || req.user?.id;

  await assertOwnership(libraryId, ownerId);

  const existingSeatsCount = await Seat.countDocuments({ library: libraryId });

  const seatsToInsert = [];
  for (let i = 1; i <= totalSeats; i++) {
    seatsToInsert.push({
      library: libraryId,
      seatNumber: `${prefix}-${existingSeatsCount + i}`,
      type,
      hasSocket,
      hasLocker,
      isActive: true,
    });
  }

  const inserted = await Seat.insertMany(seatsToInsert);

  res.status(201).json({
    success: true,
    message: `Generated and added ${inserted.length} seats successfully`,
    count: inserted.length,
  });
});

// 4. Owner Live Floor Plan View
export const getLiveOccupancy = asyncHandler(async (req, res) => {
  const { libraryId } = req.params;
  const { shiftId, date } = req.query;
  const ownerId = req.user?._id || req.user?.id;

  await assertOwnership(libraryId, ownerId);

  const targetDate = date ? new Date(date) : new Date();
  const seats = await Seat.find({ library: libraryId }).lean();

  const activeBookings = await Booking.find({
    library: libraryId,
    ...(shiftId && { shiftId }),
    status: "active",
    paymentStatus: "completed",
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  })
    .populate("user", "name phone")
    .lean();

  const bookingMap = new Map();
  activeBookings.forEach((b) => {
    bookingMap.set(b.seat.toString(), b);
  });

  const liveGrid = seats.map((seat) => {
    const booking = bookingMap.get(seat._id.toString());
    return {
      _id: seat._id,
      seatNumber: seat.seatNumber,
      type: seat.type,
      hasSocket: seat.hasSocket,
      hasLocker: seat.hasLocker,
      isMaintenance: Boolean(seat.isMaintenance),
      isOccupied: Boolean(booking),
      occupiedBy: booking
        ? {
            userName: booking.user?.name,
            userPhone: booking.user?.phone,
            bookingType: booking.bookingType,
            endDate: booking.endDate,
          }
        : null,
    };
  });

  res.status(200).json({
    success: true,
    totalSeats: liveGrid.length,
    occupiedCount: liveGrid.filter((s) => s.isOccupied).length,
    data: liveGrid,
  });
});

// 5. Vacate Seat Early
export const vacateSeat = asyncHandler(async (req, res, next) => {
  const { libraryId, seatId } = req.params;
  const ownerId = req.user?._id || req.user?.id;
  await assertOwnership(libraryId, ownerId);

  const booking = await Booking.findOne({
    library: libraryId,
    seat: seatId,
    status: { $in: ["active", "confirmed"] },
  });

  if (!booking) {
    return next(new ApiError(404, "No active booking found for this seat."));
  }

  booking.status = "cancelled";
  booking.endDate = new Date();
  await booking.save();

  const io = req.app.get("io") || getIO();
  if (io) {
    io.to(`library_${libraryId}`).emit("seat_vacated", { seatId, libraryId });
  }

  res.status(200).json({ success: true, message: "Seat vacated successfully." });
});

// 6. Transfer Student Desk
export const transferSeat = asyncHandler(async (req, res, next) => {
  const { libraryId, currentSeatId } = req.params;
  const { targetSeatId } = req.body;
  const ownerId = req.user?._id || req.user?.id;
  await assertOwnership(libraryId, ownerId);

  if (currentSeatId === targetSeatId) {
    return next(new ApiError(400, "Target seat must be different from current seat."));
  }

  const booking = await Booking.findOne({
    library: libraryId,
    seat: currentSeatId,
    status: { $in: ["active", "confirmed"] },
  });

  if (!booking) {
    return next(new ApiError(404, "No active booking found on current seat."));
  }

  const conflict = await Booking.findOne({
    library: libraryId,
    seat: targetSeatId,
    status: { $in: ["active", "confirmed"] },
  });

  if (conflict) {
    return next(new ApiError(400, "Target seat is already occupied."));
  }

  booking.seat = targetSeatId;
  await booking.save();

  const io = req.app.get("io") || getIO();
  if (io) {
    io.to(`library_${libraryId}`).emit("seat_transferred", {
      fromSeatId: currentSeatId,
      toSeatId: targetSeatId,
      user: booking.user,
    });
  }

  res.status(200).json({
    success: true,
    message: "Seat reassigned successfully.",
    data: booking,
  });
});

// 7. Toggle Maintenance Mode
export const toggleSeatMaintenance = asyncHandler(async (req, res, next) => {
  const { libraryId, seatId } = req.params;
  const ownerId = req.user?._id || req.user?.id;
  await assertOwnership(libraryId, ownerId);

  const seat = await Seat.findOne({ _id: seatId, library: libraryId });
  if (!seat) {
    return next(new ApiError(404, "Seat not found."));
  }

  seat.isMaintenance = !seat.isMaintenance;
  await seat.save();

  const io = req.app.get("io") || getIO();
  if (io) {
    io.to(`library_${libraryId}`).emit("seat_maintenance_toggled", {
      seatId: seat._id.toString(),
      isMaintenance: seat.isMaintenance,
    });
  }

  res.status(200).json({
    success: true,
    message: `Seat marked as ${seat.isMaintenance ? "Under Maintenance" : "Operational"}.`,
    data: {
      _id: seat._id,
      isMaintenance: seat.isMaintenance,
    },
  });
});

// 8. Manual Walk-In Desk Assignment
export const assignWalkIn = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const {
    seatId,
    shiftId,
    userName,
    userPhone,
    bookingType = "monthly",
    startDate,
    endDate,
    amountPaid,
  } = req.body;
  const ownerId = req.user?._id || req.user?.id;

  await assertOwnership(libraryId, ownerId);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const conflict = await Booking.findOne({
      seat: seatId,
      shiftId,
      status: "active",
      paymentStatus: "completed",
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(new ApiError(409, "Seat is already occupied for this shift."));
    }

    let walkInUser = await User.findOne({ phone: userPhone }).session(session);
    if (!walkInUser) {
      const [newUser] = await User.create(
        [{ name: userName, phone: userPhone, role: "user" }],
        { session }
      );
      walkInUser = newUser;
    }

    const qrPassCode = crypto.randomBytes(8).toString("hex").toUpperCase();

    const [walkInBooking] = await Booking.create(
      [
        {
          user: walkInUser._id,
          library: libraryId,
          seat: seatId,
          shiftId,
          bookingType,
          startDate: start,
          endDate: end,
          amountPaid,
          qrPassCode,
          paymentStatus: "completed",
          status: "active",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const io = req.app.get("io") || getIO();
    if (io) {
      io.to(`library_${libraryId}`).emit("seat_reserved", {
        seatId,
        shiftId,
        startDate: start,
        endDate: end,
        bookedBy: { userName, userPhone },
      });
    }

    res.status(201).json({
      success: true,
      message: "Walk-in student booked successfully",
      data: walkInBooking,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// 9. Gate Turnstile QR Verification & Attendance Logging
export const verifyGateQr = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const { qrPassCode, type = "in" } = req.body;
  const ownerId = req.user?._id || req.user?.id;

  await assertOwnership(libraryId, ownerId);

  const now = new Date();

  const booking = await Booking.findOne({
    qrPassCode,
    library: libraryId,
    status: "active",
    paymentStatus: "completed",
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate("user", "name phone")
    .populate("seat", "seatNumber type");

  if (!booking) {
    return next(new ApiError(404, "Invalid or expired pass code for this library"));
  }

  // Attendance Logging
  if (type === "in") {
    await Attendance.create({
      user: booking.user._id,
      library: libraryId,
      booking: booking._id,
      checkInTime: now,
      status: "inside",
    });
  } else if (type === "out") {
    const activeSession = await Attendance.findOne({
      user: booking.user._id,
      library: libraryId,
      status: "inside",
    }).sort({ checkInTime: -1 });

    if (activeSession) {
      const diffMs = now - new Date(activeSession.checkInTime);
      const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

      activeSession.checkOutTime = now;
      activeSession.durationMinutes = diffMinutes;
      activeSession.status = "completed";
      await activeSession.save();
    }
  }

  const studentName = booking.user?.name || "Student";
  const seatNumber = booking.seat?.seatNumber || "N/A";

  const io = req.app.get("io") || getIO();
  if (io) {
    io.emit("activity_logged", {
      id: Date.now(),
      type: type === "in" ? "checkin" : "checkout",
      message: `${studentName} scanned ${type.toUpperCase()} (Desk ${seatNumber})`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  res.status(200).json({
    success: true,
    message: `Gate check-${type.toUpperCase()} successful`,
    data: {
      studentName,
      studentPhone: booking.user?.phone,
      seatNumber,
      seatType: booking.seat?.type,
      timestamp: now,
    },
  });
});

// 10. Financial Ledger & Revenue Breakdown
export const getRevenueReport = asyncHandler(async (req, res) => {
  const { libraryId } = req.params;
  const { format = "json" } = req.query;
  const ownerId = req.user?._id || req.user?.id;

  await assertOwnership(libraryId, ownerId);

  const bookings = await Booking.find({
    library: libraryId,
    paymentStatus: "completed",
  })
    .populate("user", "name phone email")
    .populate("seat", "seatNumber type")
    .sort({ createdAt: -1 })
    .lean();

  const totalCollected = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
  const walkInCount = bookings.filter((b) => !b.user?.email).length;
  const onlineCount = bookings.length - walkInCount;

  if (format === "csv") {
    let csv = "Booking ID,Date,Student Name,Phone,Desk,Amount,Type\n";
    bookings.forEach((b) => {
      const date = new Date(b.createdAt).toISOString().split("T")[0];
      const name = b.user?.name || "Walk-In Student";
      const phone = b.user?.phone || "N/A";
      const desk = b.seat?.seatNumber || "N/A";
      const amount = b.amountPaid || 0;
      const type = b.bookingType || "monthly";
      csv += `"${b._id}","${date}","${name}","${phone}","${desk}","${amount}","${type}"\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`revenue-report-${libraryId}.csv`);
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalCollected,
        totalBookings: bookings.length,
        walkInCount,
        onlineCount,
      },
      transactions: bookings,
    },
  });
});