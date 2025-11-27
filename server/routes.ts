import { Router } from "express";
import { db } from "./db";
import {
  users,
  insertUserSchema,
  loginSchema,
  rooms,
  insertRoomSchema,
  guests,
  insertGuestSchema,
  bookings,
  insertBookingSchema,
  services,
  insertServiceSchema,
  billItems,
  insertBillItemSchema,
  bills,
  insertBillSchema,
  archivedBills,
} from "@shared/schema";
// FIXED: Added 'desc' and 'gte' to imports for dashboard queries
import { eq, and, gt, lt, sql, isNull, ne, desc, gte } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Utility function for type checking request body
const validate = <T extends z.ZodSchema>(schema: T) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Validation error" });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: "Invalid user" });
    }

    if (user[0].role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user[0];
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const router = Router();

// --- Auth Routes ---

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/register", requireAdmin, validate(insertUserSchema), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existingUser = await db.select().from(users).where(eq(users.username, username));

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.insert(users).values({ username, password: hashedPassword, role }).returning();
    res.status(201).json(newUser[0]); 
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user[0].password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ id: user[0].id, username: user[0].username, role: user[0].role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Room Routes ---

router.get("/rooms", async (req, res) => {
  try {
    const allRooms = await db.select().from(rooms);
    res.json(allRooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

router.post("/rooms", validate(insertRoomSchema), async (req, res) => {
  try {
    const newRoom = await db.insert(rooms).values(req.body).returning();
    res.status(201).json(newRoom[0]);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

router.put("/rooms/:id", validate(insertRoomSchema.partial()), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRoom = await db.update(rooms).set(req.body).where(eq(rooms.id, id)).returning();
    if (updatedRoom.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(updatedRoom[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update room" });
  }
});

router.delete("/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(rooms).where(eq(rooms.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// --- Guest Routes ---

router.get("/guests", async (req, res) => {
  try {
    const allGuests = await db.select().from(guests);
    res.json(allGuests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch guests" });
  }
});

router.post("/guests", validate(insertGuestSchema), async (req, res) => {
  try {
    const newGuest = await db.insert(guests).values(req.body).returning();
    res.status(201).json(newGuest[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create guest" });
  }
});

router.delete("/guests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(guests).where(eq(guests.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete guest" });
  }
});

// --- Booking Routes ---

router.get("/bookings", async (req, res) => {
  try {
    const allBookings = await db.select().from(bookings).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id));
    
    const formattedBookings = allBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// FIXED: Added Missing Route for Recent Bookings (for Dashboard)
router.get("/bookings/recent", async (req, res) => {
  try {
    const recentBookings = await db.select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .orderBy(desc(bookings.createdAt))
      .limit(5);

    const formattedBookings = recentBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    res.status(500).json({ error: "Failed to fetch recent bookings" });
  }
});

router.get("/bookings/reserved", async (req, res) => {
  try {
    const reservedBookings = await db.select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.status, "reserved"));

    const formattedBookings = reservedBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching reserved bookings:", error);
    res.status(500).json({ error: "Failed to fetch reserved bookings" });
  }
});

router.get("/bookings/checked-in", async (req, res) => {
  try {
    const checkedInBookings = await db.select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.status, "checked-in"));

    const formattedBookings = checkedInBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching checked-in bookings:", error);
    res.status(500).json({ error: "Failed to fetch checked-in bookings" });
  }
});

router.get("/bookings/checked-out", async (req, res) => {
  try {
    const checkedOutBookings = await db.select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.status, "checked-out"));

    const formattedBookings = checkedOutBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching checked-out bookings:", error);
    res.status(500).json({ error: "Failed to fetch checked-out bookings" });
  }
});

router.post("/bookings", validate(insertBookingSchema), async (req, res) => {
  try {
    const bookingData = req.body;
    
    const roomDetails = await db.select().from(rooms).where(eq(rooms.id, bookingData.roomId)).limit(1);
    if (roomDetails.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = roomDetails[0];

    if (bookingData.numberOfGuests > room.capacity) {
      return res.status(400).json({ error: `Room ${room.number} capacity is ${room.capacity}. Cannot book for ${bookingData.numberOfGuests} guests.` });
    }

    if (room.status !== "available") {
      return res.status(400).json({ error: `Room ${room.number} is currently ${room.status}.` });
    }

    const newBooking = await db.transaction(async (tx) => {
      const createdBooking = await tx.insert(bookings).values(bookingData).returning();
      await tx.update(rooms).set({ status: "reserved" }).where(eq(rooms.id, bookingData.roomId));
      return createdBooking[0];
    });

    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.post("/bookings/:id/check-in", async (req, res) => {
  try {
    const { id } = req.params;
    const bookingToUpdate = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (bookingToUpdate.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    const originalRoomId = bookingToUpdate[0].roomId;
    
    const existingBill = await db.select().from(bills).where(eq(bills.bookingId, id)).limit(1);
    if (existingBill.length > 0) {
      return res.status(400).json({ error: "Bill already exists for this booking. Cannot check in again." });
    }

    const updatedBooking = await db.transaction(async (tx) => {
      const updated = await tx.update(bookings).set({ status: "checked-in" }).where(eq(bookings.id, id)).returning();
      if (updated.length === 0) {
          throw new Error("Check-in failed: Booking record was not updated.");
      }
      await tx.update(rooms).set({ status: "occupied" }).where(eq(rooms.id, originalRoomId));
      return updated[0];
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error("Error during check-in:", error);
    if (error instanceof Error && error.message.startsWith("Check-in failed:")) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to check in" });
  }
});

router.post("/bookings/:id/check-out", async (req, res) => {
  try {
    const { id } = req.params;
    const bookingToUpdate = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (bookingToUpdate.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updatedBooking = await db.transaction(async (tx) => {
      const updated = await tx.update(bookings).set({ status: "checked-out" }).where(eq(bookings.id, id)).returning();
      return updated[0];
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error("Error during check-out:", error);
    res.status(500).json({ error: "Failed to check out" });
  }
});


// --- Services Routes ---

router.get("/services", async (req, res) => {
  try {
    const allServices = await db.select().from(services);
    res.json(allServices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

router.post("/services", validate(insertServiceSchema), async (req, res) => {
  try {
    const newService = await db.insert(services).values(req.body).returning();
    res.status(201).json(newService[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create service" });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(services).where(eq(services.id, id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});


// --- Bill Routes ---

const calculateBill = (items: z.infer<typeof insertBillItemSchema>[]): { subtotal: string, taxAmount: string, total: string } => {
  const taxRate = 0.10;
  let subtotal = 0;

  for (const item of items) {
    subtotal += parseFloat(item.amount) * item.quantity;
  }

  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
  };
};

router.post("/bills/generate", validate(z.object({ bookingId: z.string() })), async (req, res) => {
  try {
    const { bookingId } = req.body;

    const existingBill = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
    if (existingBill.length > 0) {
      return res.status(400).json({ error: "Bill already exists for this booking" });
    }

    const bookingDetails = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingDetails[0];

    const roomDetails = await db.select().from(rooms).where(eq(rooms.id, booking.roomId)).limit(1);
    if (roomDetails.length === 0) {
      return res.status(500).json({ error: "Room details missing" });
    }
    const room = roomDetails[0];
    
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const numberOfNights = diffDays === 0 ? 1 : diffDays;

    const roomChargeItem: z.infer<typeof insertBillItemSchema> = {
      bookingId: booking.id,
      description: `${room.type} Room Charge (${numberOfNights} nights)`,
      amount: room.pricePerNight,
      quantity: numberOfNights,
      category: "room",
    };

    const initialBill = await db.transaction(async (tx) => {
      await tx.insert(billItems).values(roomChargeItem);
      const totals = calculateBill([roomChargeItem]);

      const newBill = await tx.insert(bills).values({
        bookingId: booking.id,
        subtotal: totals.subtotal,
        taxRate: "10.00",
        taxAmount: totals.taxAmount,
        total: totals.total,
        isPaid: false,
      }).returning();

      return newBill[0];
    });

    res.status(201).json(initialBill);
  } catch (error) {
    console.error("Error generating bill:", error);
    res.status(500).json({ error: "Failed to generate bill" });
  }
});

router.post("/bills/add-item", validate(insertBillItemSchema.omit({ id: true })), async (req, res) => {
  try {
    const newItem = req.body;
    
    const currentItems = await db.select().from(billItems).where(eq(billItems.bookingId, newItem.bookingId));
    const currentBill = await db.select().from(bills).where(eq(bills.bookingId, newItem.bookingId)).limit(1);

    if (currentBill.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    const updatedBill = await db.transaction(async (tx) => {
      await tx.insert(billItems).values(newItem);
      const allItems = [...currentItems, newItem];
      const totals = calculateBill(allItems);

      const updated = await tx.update(bills).set({
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      }).where(eq(bills.bookingId, newItem.bookingId)).returning();

      return updated[0];
    });

    res.status(201).json(updatedBill);
  } catch (error) {
    console.error("Error adding bill item:", error);
    res.status(500).json({ error: "Failed to add bill item" });
  }
});

router.get("/bills/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const billDetails = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
    if (billDetails.length === 0) {
      return res.json(null);
    }
    const bill = billDetails[0];

    const bookingDetails = await db.select().from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, bookingId)).limit(1);

    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking details not found" });
    }

    const { bookings: booking, guests: guest, rooms: room } = bookingDetails[0];
    const items = await db.select().from(billItems).where(eq(billItems.bookingId, bookingId));

    const billWithDetails = {
      ...bill,
      booking: { ...booking, guest, room },
      items,
    };

    res.json(billWithDetails);
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
});

router.post("/bills/:bookingId/complete", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingDetails = await db.select().from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, bookingId)).limit(1);

    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { bookings: booking, guests: guest, rooms: room } = bookingDetails[0];
    const billDetails = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);

    if (billDetails.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }
    const bill = billDetails[0];

    await db.transaction(async (tx) => {
      await tx.insert(archivedBills).values({
        guestName: `${guest?.firstName ?? ''} ${guest?.lastName ?? ''}`.trim() || 'N/A',
        phone: guest?.phone || 'N/A',
        roomNumber: room?.number || 'N/A',
        roomType: room?.type || 'N/A',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        total: bill.total,
        completedAt: new Date(),
      });
      
      await tx.update(bills).set({ isPaid: true }).where(eq(bills.id, bill.id));
      await tx.update(rooms).set({ status: "available" }).where(eq(rooms.id, booking.roomId));
      await tx.delete(billItems).where(eq(billItems.bookingId, booking.id));
      await tx.delete(bills).where(eq(bills.bookingId, booking.id));
      await tx.delete(bookings).where(eq(bookings.id, booking.id));

      if (booking.guestId) {
        await tx.delete(guests).where(eq(guests.id, booking.guestId));
      }
    });

    res.json({ message: "Bill completed, room updated, and guest removed successfully" });
  } catch (error) {
    console.error("Error completing bill and archiving:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      error: "Failed to complete bill and archive data",
      details: errorMessage 
    });
  }
});


// --- Dashboard Stats Route ---

router.get("/dashboard/stats", async (req, res) => {
  try {
    const totalRooms = await db.select({ count: sql<number>`count(*)` }).from(rooms);
    const availableRooms = await db.select({ count: sql<number>`count(*)` }).from(rooms).where(eq(rooms.status, "available"));
    const reservedBookings = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "reserved"));
    const totalGuests = await db.select({ count: sql<number>`count(*)` }).from(guests);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueResult = await db.select({
      total: sql<string>`sum(total)`,
    }).from(archivedBills).where(gt(archivedBills.completedAt, startOfMonth));

    const revenue = parseFloat(revenueResult[0].total || "0").toFixed(2);

    res.json({
      totalRooms: totalRooms[0].count,
      availableRooms: availableRooms[0].count,
      reservedBookings: reservedBookings[0].count,
      totalGuests: totalGuests[0].count,
      monthlyRevenue: revenue,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// FIXED: Added Missing Route for Today's Check-ins (for Dashboard)
router.get("/dashboard/today-checkins", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const todayCheckIns = await db.select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(and(
        eq(bookings.status, "reserved"),
        gte(bookings.checkInDate, startOfDay),
        lt(bookings.checkInDate, endOfDay)
      ));

    const formattedBookings = todayCheckIns.map(b => ({
      ...b.bookings,
      guest: b.guests!,
      room: b.rooms!,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching today's check-ins:", error);
    res.status(500).json({ error: "Failed to fetch today's check-ins" });
  }
});


// --- Archived Bills/Data Route ---

router.get("/archive", async (req, res) => {
  try {
    const archivedData = await db.select().from(archivedBills);
    res.json(archivedData);
  } catch (error) {
    console.error("Error fetching archived data:", error);
    res.status(500).json({ error: "Failed to fetch archived data" });
  }
});

// --- User Management Routes (Admin Only) ---

router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    if (id === currentUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const userToDelete = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (userToDelete.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.delete(users).where(eq(users.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
