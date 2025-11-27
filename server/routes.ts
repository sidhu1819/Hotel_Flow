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
import { eq, and, gt, lt, sql, isNull, ne } from "drizzle-orm";
import { z } from "zod";
// FIX: Switched to bcryptjs to avoid native compilation issues common in this environment
import bcrypt from "bcryptjs";

// Utility function for type checking request body
const validate = <T extends z.ZodSchema>(schema: T) => (req: any, res: any, next: any) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Respond with a 400 status and the validation errors
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Validation error" });
  }
};

const router = Router();

// --- Auth Routes ---

router.post("/register", validate(insertUserSchema), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existingUser = await db.select().from(users).where(eq(users.username, username));

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // FIX: Add .returning() to get the created user object
    const newUser = await db.insert(users).values({ username, password: hashedPassword, role }).returning();
    
    // Return the created user object (compatible with frontend's login flow)
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

    // FIX: Using bcrypt.compare
    const isMatch = await bcrypt.compare(password, user[0].password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // FIX: Return the User object directly, simplifying the response for the frontend
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

// Get all bookings with guest and room details
router.get("/bookings", async (req, res) => {
  try {
    const allBookings = await db.select().from(bookings).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id));
    
    // Map the result to a flat structure
    const formattedBookings = allBookings.map(b => ({
      ...b.bookings,
      guest: b.guests!, // The ! is safe because guestId is not null
      room: b.rooms!, // The ! is safe because roomId is not null
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get checked-out bookings for billing
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

// Create new booking (MODIFIED for capacity check)
router.post("/bookings", validate(insertBookingSchema), async (req, res) => {
  try {
    const bookingData = req.body;
    
    // 1. Get Room Details for capacity check
    const roomDetails = await db.select().from(rooms).where(eq(rooms.id, bookingData.roomId)).limit(1);
    if (roomDetails.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }
    const room = roomDetails[0];

    // 2. CAPACITY VALIDATION FIX: Check if room capacity is enough for the number of guests
    if (bookingData.numberOfGuests > room.capacity) {
      return res.status(400).json({ error: `Room ${room.number} capacity is ${room.capacity}. Cannot book for ${bookingData.numberOfGuests} guests.` });
    }

    // 3. Check Room Availability (optional but good practice to ensure "available" status)
    if (room.status !== "available") {
      return res.status(400).json({ error: `Room ${room.number} is currently ${room.status}.` });
    }

    // 4. Perform the transaction to create booking and update room status
    const newBooking = await db.transaction(async (tx) => {
      // Create the new booking
      const createdBooking = await tx.insert(bookings).values(bookingData).returning();

      // Update room status to reserved
      await tx.update(rooms).set({ status: "reserved" }).where(eq(rooms.id, bookingData.roomId));

      return createdBooking[0];
    });

    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Check-in
router.post("/bookings/:id/check-in", async (req, res) => {
  try {
    const { id } = req.params;
    const bookingToUpdate = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (bookingToUpdate.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Get original roomId before the transaction starts (SAFER)
    const originalRoomId = bookingToUpdate[0].roomId;
    
    // Check if a bill already exists for this booking (preventing double check-in/billing issues)
    const existingBill = await db.select().from(bills).where(eq(bills.bookingId, id)).limit(1);
    if (existingBill.length > 0) {
      return res.status(400).json({ error: "Bill already exists for this booking. Cannot check in again." });
    }

    const updatedBooking = await db.transaction(async (tx) => {
      // 1. Update Booking status
      const updated = await tx.update(bookings).set({ status: "checked-in" }).where(eq(bookings.id, id)).returning();
      
      // Safety check for update operation
      if (updated.length === 0) {
          // Changed to return a specific message to indicate the transaction failed to update the row
          throw new Error("Check-in failed: Booking record was not updated.");
      }
      
      // 2. Update Room status
      await tx.update(rooms).set({ status: "occupied" }).where(eq(rooms.id, originalRoomId));

      return updated[0];
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error("Error during check-in:", error);
    // Return error message from the transaction if it was a specific error
    if (error instanceof Error && error.message.startsWith("Check-in failed:")) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to check in" });
  }
});

// Check-out
router.post("/bookings/:id/check-out", async (req, res) => {
  try {
    const { id } = req.params;
    const bookingToUpdate = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (bookingToUpdate.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updatedBooking = await db.transaction(async (tx) => {
      // 1. Update Booking status to checked-out
      const updated = await tx.update(bookings).set({ status: "checked-out" }).where(eq(bookings.id, id)).returning();
      
      // We do NOT update the room status yet (it stays 'occupied') until the bill is fully paid/completed.

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

// Helper function to calculate bill totals
const calculateBill = (items: z.infer<typeof insertBillItemSchema>[]): { subtotal: string, taxAmount: string, total: string } => {
  const taxRate = 0.10; // Fixed 10% tax rate as per schema default
  let subtotal = 0;

  for (const item of items) {
    // Ensure amount is parsed correctly as it is stored as a string numeric in schema
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

// Generate initial bill
router.post("/bills/generate", validate(z.object({ bookingId: z.string() })), async (req, res) => {
  try {
    const { bookingId } = req.body;

    // 1. Check if bill already exists
    const existingBill = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
    if (existingBill.length > 0) {
      return res.status(400).json({ error: "Bill already exists for this booking" });
    }

    // 2. Get Booking details
    const bookingDetails = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingDetails[0];

    // 3. Get Room Price/Details
    const roomDetails = await db.select().from(rooms).where(eq(rooms.id, booking.roomId)).limit(1);
    if (roomDetails.length === 0) {
      return res.status(500).json({ error: "Room details missing" });
    }
    const room = roomDetails[0];
    
    // Calculate number of nights
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const numberOfNights = diffDays === 0 ? 1 : diffDays; // Ensure at least 1 night charge

    const roomChargeItem: z.infer<typeof insertBillItemSchema> = {
      bookingId: booking.id,
      description: `${room.type} Room Charge (${numberOfNights} nights)`,
      amount: room.pricePerNight, // Price per night is stored as a string numeric in schema
      quantity: numberOfNights,
      category: "room",
    };

    // 4. Perform the transaction
    const initialBill = await db.transaction(async (tx) => {
      // Insert room charge item
      await tx.insert(billItems).values(roomChargeItem);

      // Calculate totals for the bill
      const totals = calculateBill([roomChargeItem]);

      // Insert the new bill
      const newBill = await tx.insert(bills).values({
        bookingId: booking.id,
        subtotal: totals.subtotal,
        taxRate: "10.00", // Default tax rate
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

// Add item to an existing bill
router.post("/bills/add-item", validate(insertBillItemSchema.omit({ id: true })), async (req, res) => {
  try {
    const newItem = req.body;
    
    // 1. Get current bill items and bill
    const currentItems = await db.select().from(billItems).where(eq(billItems.bookingId, newItem.bookingId));
    const currentBill = await db.select().from(bills).where(eq(bills.bookingId, newItem.bookingId)).limit(1);

    if (currentBill.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // 2. Perform transaction to add item and recalculate bill
    const updatedBill = await db.transaction(async (tx) => {
      // Insert new item
      await tx.insert(billItems).values(newItem);

      // Recalculate totals
      // We pass all items including the new one
      const allItems = [...currentItems, newItem];
      const totals = calculateBill(allItems);

      // Update bill totals
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

// Get bill details
router.get("/bills/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // 1. Get bill
    const billDetails = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
    if (billDetails.length === 0) {
      return res.json(null);
    }
    const bill = billDetails[0];

    // 2. Get booking, guest, and room details (for nesting)
    const bookingDetails = await db.select().from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, bookingId)).limit(1);

    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking details not found" });
    }

    const { bookings: booking, guests: guest, rooms: room } = bookingDetails[0];

    // 3. Get bill items
    const items = await db.select().from(billItems).where(eq(billItems.bookingId, bookingId));

    // 4. Construct response
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

// Complete bill (FINAL PAYMENT & CLEANUP)
router.post("/bills/:bookingId/complete", async (req, res) => {
  try {
    const { bookingId } = req.params;

    // 1. Get booking details to find guest and room
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


    // 2. Perform the full cleanup transaction
    await db.transaction(async (tx) => {
      // A. Archive the bill data
      // MODIFIED: Added safety checks for nullable guest/room data to prevent insertion errors.
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
      
      // B. Mark the bill as paid (isPaid: true)
      await tx.update(bills).set({ isPaid: true }).where(eq(bills.id, bill.id));

      // C. Update Room status back to 'available'
      await tx.update(rooms).set({ status: "available" }).where(eq(rooms.id, booking.roomId));

      // D. Update Booking status to 'completed'
      await tx.update(bookings).set({ status: "completed" }).where(eq(bookings.id, booking.id));

      // E. GUEST DELETION FIX: Delete the guest record
      if (booking.guestId) {
        // Need to ensure guest exists before attempting to delete
        await tx.delete(guests).where(eq(guests.id, booking.guestId));
      }

    });

    res.json({ message: "Bill completed, room updated, and guest removed successfully" });
  } catch (error) {
    console.error("Error completing bill and archiving:", error);
    res.status(500).json({ error: "Failed to complete bill and archive data" });
  }
});


// --- Dashboard Stats Route ---

router.get("/dashboard/stats", async (req, res) => {
  try {
    const totalRooms = await db.select({ count: sql<number>`count(*)` }).from(rooms);
    const availableRooms = await db.select({ count: sql<number>`count(*)` }).from(rooms).where(eq(rooms.status, "available"));
    const reservedBookings = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "reserved"));
    const totalGuests = await db.select({ count: sql<number>`count(*)` }).from(guests);

    // Get current month's revenue (from archived/completed bills)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueResult = await db.select({
      total: sql<string>`sum(total)`, // total is a numeric/string type
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

export default router;