import { Server } from "socket.io";

let io;

// In-memory hold registry: key = `${libraryId}_${shiftId}_${seatId}`
const activeHolds = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // 1. Join room for specific library
    socket.on("join_library", (libraryId) => {
      socket.join(`library_${libraryId}`);

      // Send all current active holds for this library immediately
      const currentLibraryHolds = [];
      for (const [key, val] of activeHolds.entries()) {
        if (key.startsWith(`${libraryId}_`)) {
          currentLibraryHolds.push(val);
        }
      }
      socket.emit("initial_holds", currentLibraryHolds);
    });

    // 2. Request a 5-minute hold on a seat
    socket.on("hold_seat", ({ libraryId, shiftId, seatId, seatNumber, user }) => {
      const holdKey = `${libraryId}_${shiftId}_${seatId}`;

      // Reject if held by someone else
      if (activeHolds.has(holdKey)) {
        const existing = activeHolds.get(holdKey);
        if (existing.socketId !== socket.id) {
          return socket.emit("hold_rejected", {
            seatId,
            message: "Seat is already held by another student.",
          });
        }
      }

      // Clear any prior hold this user had in this session
      clearSocketHold(socket.id);

      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      const timerId = setTimeout(() => {
        releaseHold(holdKey);
      }, 5 * 60 * 1000);

      const holdData = {
        holdKey,
        libraryId,
        shiftId,
        seatId,
        seatNumber,
        socketId: socket.id,
        userId: user?.id || user?._id,
        expiresAt,
        timerId,
      };

      activeHolds.set(holdKey, holdData);

      // Notify the locker with confirmed timer
      socket.emit("hold_confirmed", { seatId, expiresAt });

      // Notify everyone else on the floor
      socket.to(`library_${libraryId}`).emit("seat_held", {
        seatId,
        shiftId,
        expiresAt,
      });
    });

    // 3. User voluntarily releases or picks another seat
    socket.on("release_seat", ({ libraryId, shiftId, seatId }) => {
      const holdKey = `${libraryId}_${shiftId}_${seatId}`;
      releaseHold(holdKey);
    });

    // 4. Clean up if student closes tab / disconnects
    socket.on("disconnect", () => {
      clearSocketHold(socket.id);
    });
  });

  return io;
};

// Helper to remove and broadcast hold release
const releaseHold = (holdKey) => {
  if (!activeHolds.has(holdKey)) return;

  const data = activeHolds.get(holdKey);
  clearTimeout(data.timerId);
  activeHolds.delete(holdKey);

  if (io) {
    io.to(`library_${data.libraryId}`).emit("seat_released", {
      seatId: data.seatId,
      shiftId: data.shiftId,
    });
  }
};

// Clear any hold created by a specific socket ID
const clearSocketHold = (socketId) => {
  for (const [key, data] of activeHolds.entries()) {
    if (data.socketId === socketId) {
      releaseHold(key);
    }
  }
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

// Export helper to permanently clear hold when booking succeeds
export const finalizeBookingHold = (libraryId, shiftId, seatId) => {
  const holdKey = `${libraryId}_${shiftId}_${seatId}`;
  if (activeHolds.has(holdKey)) {
    const data = activeHolds.get(holdKey);
    clearTimeout(data.timerId);
    activeHolds.delete(holdKey);
  }
};