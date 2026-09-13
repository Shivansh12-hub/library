import { Server } from "socket.io";

let io;
const activeHolds = new Map(); // key: `${libraryId}_${shiftId}_${seatId}`

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // 1. Join library room
    socket.on("join_library", (libraryId) => {
      const room = `library_${libraryId}`;
      socket.join(room);

      // Send all current active holds for this library
      const currentHolds = [];
      for (const [key, val] of activeHolds.entries()) {
        if (key.startsWith(`${libraryId}_`)) {
          currentHolds.push({
            seatId: val.seatId,
            shiftId: val.shiftId,
            expiresAt: val.expiresAt,
          });
        }
      }
      socket.emit("initial_holds", currentHolds);
    });

    // 2. Hold Seat Request (5 mins)
    socket.on("hold_seat", ({ libraryId, shiftId, seatId, seatNumber, user }) => {
      const holdKey = `${libraryId}_${shiftId}_${seatId}`;

      // Check if another socket holds it
      if (activeHolds.has(holdKey)) {
        const existing = activeHolds.get(holdKey);
        if (existing.socketId !== socket.id) {
          return socket.emit("hold_rejected", {
            seatId,
            message: "This desk is currently held in another student's cart.",
          });
        }
      }

      // Clear any prior hold from this socket
      clearSocketHold(socket.id);

      const expiresAt = Date.now() + 5 * 60 * 1000;
      const timerId = setTimeout(() => {
        releaseHold(holdKey);
      }, 5 * 60 * 1000);

      activeHolds.set(holdKey, {
        holdKey,
        libraryId,
        shiftId,
        seatId,
        seatNumber,
        socketId: socket.id,
        userId: user?.id || user?._id,
        expiresAt,
        timerId,
      });

      // Confirm to caller
      socket.emit("hold_confirmed", { seatId, expiresAt });

      // Broadcast to all others in the room
      socket.to(`library_${libraryId}`).emit("seat_held", {
        seatId,
        shiftId,
        expiresAt,
      });
    });

    // 3. User releases hold manually
    socket.on("release_seat", ({ libraryId, shiftId, seatId }) => {
      releaseHold(`${libraryId}_${shiftId}_${seatId}`);
    });

    // 4. Tab closed / disconnected
    socket.on("disconnect", () => {
      clearSocketHold(socket.id);
    });
  });

  return io;
};

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

export const finalizeBookingHold = (libraryId, shiftId, seatId) => {
  const holdKey = `${libraryId}_${shiftId}_${seatId}`;
  if (activeHolds.has(holdKey)) {
    const data = activeHolds.get(holdKey);
    clearTimeout(data.timerId);
    activeHolds.delete(holdKey);
  }
};