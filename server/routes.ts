import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRoomSchema, insertGuestSchema, insertBookingSchema, insertBillItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/rooms", async (_req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(data);
      res.json(room);
    } catch (error) {
      res.status(400).json({ error: "Invalid room data" });
    }
  });

  app.get("/api/guests", async (_req, res) => {
    try {
      const guests = await storage.getGuests();
      res.json(guests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guests" });
    }
  });

  app.post("/api/guests", async (req, res) => {
    try {
      const data = insertGuestSchema.parse(req.body);
      const guest = await storage.createGuest(data);
      res.json(guest);
    } catch (error) {
      res.status(400).json({ error: "Invalid guest data" });
    }
  });

  app.get("/api/bookings", async (_req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/recent", async (_req, res) => {
    try {
      const bookings = await storage.getRecentBookings(5);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent bookings" });
    }
  });

  app.get("/api/bookings/reserved", async (_req, res) => {
    try {
      const bookings = await storage.getBookingsByStatus("reserved");
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reserved bookings" });
    }
  });

  app.get("/api/bookings/checked-in", async (_req, res) => {
    try {
      const bookings = await storage.getBookingsByStatus("checked-in");
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch checked-in bookings" });
    }
  });

  app.get("/api/bookings/checked-out", async (_req, res) => {
    try {
      const bookings = await storage.getBookingsByStatus("checked-out");
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch checked-out bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const data = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(data);
      const bookingWithDetails = await storage.getBooking(booking.id);
      res.json(bookingWithDetails);
    } catch (error) {
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.post("/api/bookings/:id/checkin", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.updateBookingStatus(id, "checked-in");
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  app.post("/api/bookings/:id/checkout", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.updateBookingStatus(id, "checked-out");
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: "Failed to check out" });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const rooms = await storage.getRooms();
      const guests = await storage.getGuests();
      const bookings = await storage.getBookings();

      const totalRooms = rooms.length;
      const availableRooms = rooms.filter((r) => r.status === "available").length;
      const activeBookings = bookings.filter((b) => b.status === "reserved" || b.status === "checked-in").length;
      const occupancyRate = totalRooms > 0 ? Math.round(((totalRooms - availableRooms) / totalRooms) * 100) : 0;

      res.json({
        totalRooms,
        availableRooms,
        totalGuests: guests.length,
        activeBookings,
        occupancyRate,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/today-checkins", async (_req, res) => {
    try {
      const checkIns = await storage.getTodayCheckIns();
      res.json(checkIns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's check-ins" });
    }
  });

  app.get("/api/bills/:bookingId", async (req, res) => {
    try {
      const { bookingId } = req.params;
      const bill = await storage.getBillByBookingId(bookingId);
      if (!bill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  app.post("/api/bills/generate", async (req, res) => {
    try {
      const { bookingId } = req.body;
      const booking = await storage.getBooking(bookingId);

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const roomRate = parseFloat(booking.room.pricePerNight);
      const roomCharge = roomRate * nights;

      await storage.addBillItem({
        bookingId,
        description: `Room ${booking.room.number} - ${nights} night${nights > 1 ? "s" : ""}`,
        amount: roomRate.toFixed(2),
        quantity: nights,
        category: "room",
      });

      const subtotal = roomCharge;
      const taxRate = "10.00";
      const taxAmount = (subtotal * parseFloat(taxRate)) / 100;
      const total = subtotal + taxAmount;

      const bill = await storage.createBill({
        bookingId,
        subtotal: subtotal.toFixed(2),
        taxRate,
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        isPaid: false,
      });

      const billWithDetails = await storage.getBillByBookingId(bookingId);
      res.json(billWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate bill" });
    }
  });

  app.post("/api/bills/add-item", async (req, res) => {
    try {
      const data = insertBillItemSchema.parse(req.body);
      const item = await storage.addBillItem(data);

      const bill = await storage.getBillByBookingId(data.bookingId);
      if (bill) {
        const items = await storage.getBillItems(data.bookingId);
        const subtotal = items.reduce(
          (sum, item) => sum + parseFloat(item.amount) * item.quantity,
          0
        );
        const taxRate = parseFloat(bill.taxRate);
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount;

        await storage.updateBill(bill.id, {
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          total: total.toFixed(2),
        });
      }

      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid bill item data" });
    }
  });

  app.get("/api/services", async (_req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
