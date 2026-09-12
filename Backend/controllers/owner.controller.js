import mongoose from "mongoose";
import crypto from "node:crypto";
import Library from "../models/Library.js";
import Seat from "../models/Seat.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { ApiError, asyncHandler } from "../utils/apiResponse.js";
import { getIO } from "../socket.js";






// 1. Vacate an occupied seat early
export const vacateSeat = asyncHandler(async (req, res, next) => {
  const { libraryId, seatId } = req.params;

  const booking = await Booking.findOne({
    library: libraryId,
    seat: seatId,
    status: { $in: ['active', 'confirmed'] },
  });

  if (!booking) {
    return next(new ApiError(404, 'No active booking found for this seat.'));
  }

  booking.status = 'cancelled';
  booking.endDate = new Date();
  await booking.save();

  // Broadcast update to all clients watching this library
  const io = req.app.get('io');
  if (io) {
    io.to(libraryId).emit('seat_vacated', { seatId, libraryId });
  }

  res.status(200).json({ success: true, message: 'Seat vacated successfully.' });
});

// 2. Transfer student from one desk to another
export const transferSeat = asyncHandler(async (req, res, next) => {
  const { libraryId, currentSeatId } = req.params;
  const { targetSeatId } = req.body;

  if (currentSeatId === targetSeatId) {
    return next(new ApiError(400, 'Target seat must be different from current seat.'));
  }

  // Ensure current booking exists
  const booking = await Booking.findOne({
    library: libraryId,
    seat: currentSeatId,
    status: { $in: ['active', 'confirmed'] },
  });

  if (!booking) {
    return next(new ApiError(404, 'No active booking found on current seat.'));
  }

  // Ensure target seat exists and has no active booking
  const conflict = await Booking.findOne({
    library: libraryId,
    seat: targetSeatId,
    status: { $in: ['active', 'confirmed'] },
  });

  if (conflict) {
    return next(new ApiError(400, 'Target seat is already occupied.'));
  }

  // Reassign
  booking.seat = targetSeatId;
  await booking.save();

  const io = req.app.get('io');
  if (io) {
    io.to(libraryId).emit('seat_transferred', {
      fromSeatId: currentSeatId,
      toSeatId: targetSeatId,
      user: booking.user,
    });
  }

  res.status(200).json({ success: true, message: 'Seat reassigned successfully.', data: booking });
});

// 3. Toggle Maintenance Mode on a seat
export const toggleSeatMaintenance = asyncHandler(async (req, res, next) => {
  const { libraryId, seatId } = req.params;

  const seat = await Seat.findOne({ _id: seatId, library: libraryId });
  if (!seat) {
    return next(new ApiError(404, 'Seat not found.'));
  }

  seat.isMaintenance = !seat.isMaintenance;
  await seat.save();

  const io = req.app.get('io');
  if (io) {
    io.to(libraryId).emit('seat_maintenance_toggled', {
      seatId,
      isMaintenance: seat.isMaintenance,
    });
  }

  res.status(200).json({
    success: true,
    message: `Seat marked as ${seat.isMaintenance ? 'Under Maintenance' : 'Operational'}.`,
    isMaintenance: seat.isMaintenance,
  });
});



// Helper: Ensure the authenticated owner owns the target library
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
  const newLibrary = await Library.create({
    ...req.body,
    owner: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Library profile created successfully",
    data: newLibrary,
  });
});

// 2. Get All Libraries Belonging to Logged-in Owner
export const getMyLibraries = asyncHandler(async (req, res) => {
  const libraries = await Library.find({ owner: req.user.id }).lean();
  res
    .status(200)
    .json({ success: true, count: libraries.length, data: libraries });
});

// 3. Batch Create Seats (e.g., Generate S-1 to S-50 automatically)
export const batchCreateSeats = asyncHandler(async (req, res) => {
  const { libraryId } = req.params;
  const { prefix = "S", totalSeats, type, hasSocket, hasLocker } = req.body;

  await assertOwnership(libraryId, req.user.id);

  // Find existing seats to compute start offset
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

// 4. Owner Live Dashboard: Real-time floor plan view with occupancies
export const getLiveOccupancy = asyncHandler(async (req, res) => {
  const { libraryId } = req.params;
  const { shiftId, date } = req.query;

  await assertOwnership(libraryId, req.user.id);

  const targetDate = date ? new Date(date) : new Date();

  // Fetch all physical desks
  const seats = await Seat.find({ library: libraryId }).lean();

  // Query active bookings running on this specific date & shift
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
      isOccupied: Boolean(booking),
      occupiedBy: booking
        ? {
            userName: booking.user.name,
            userPhone: booking.user.phone,
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

// 5. Manual Walk-in Desk Assignment (Offline student cash/UPI payment)
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

  await assertOwnership(libraryId, req.user.id);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Conflict validation inside transaction
    const conflict = await Booking.findOne({
      seat: seatId,
      shiftId,
      status: "active",
      paymentStatus: "completed",
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return next(
        new ApiError(
          409,
          "Seat is already occupied for this shift and duration.",
        ),
      );
    }

    // Auto-link or auto-provision walk-in user account
    let walkInUser = await User.findOne({ phone: userPhone }).session(session);
    if (!walkInUser) {
      const [newUser] = await User.create(
        [
          {
            name: userName,
            phone: userPhone,
            role: "user",
          },
        ],
        { session },
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
      { session },
    );

    await session.commitTransaction();

    const io = getIO();

    io.to(`library_${libraryId}`).emit("seat_reserved", {
      seatId,
      shiftId,
      startDate: start,
      endDate: end,
      bookedBy: {
        userName,
        userPhone,
      },
    });

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

// 6. Gate QR Pass Code Verification
export const verifyGateQr = asyncHandler(async (req, res, next) => {
  const { libraryId } = req.params;
  const { qrPassCode, type = "in" } = req.body;

  await assertOwnership(libraryId, req.user.id);

  const io = req.app.get('io');
if (io) {
  io.emit('activity_logged', {
    id: Date.now(),
    type: type === 'in' ? 'checkin' : 'checkout',
    message: `${studentName} scanned ${type.toUpperCase()} (Desk ${seatNumber})`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

  const now = new Date();

  // Find booking matching the scanned pass code
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
    return next(
      new ApiError(404, "Invalid or expired pass code for this library"),
    );
  }

  // Record entry/exit log inside the embedded subdocument array
  booking.checkInLogs.push({
    timestamp: now,
    type,
    scannedBy: req.user.id,
  });

  await booking.save();

  res.status(200).json({
    success: true,
    message: `Pass valid. User marked: ${type.toUpperCase()}`,
    data: {
      studentName: booking.user.name,
      studentPhone: booking.user.phone,
      seatNumber: booking.seat.seatNumber,
      seatType: booking.seat.type,
      logRecorded: type,
      timestamp: now,
    },
  });
});
