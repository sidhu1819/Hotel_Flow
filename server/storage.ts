import { db } from "./db"; // Our new database client
import {
  type Room,
  type InsertRoom,
  type Guest,
  type InsertGuest,
  type Booking,
  type InsertBooking,
  type BookingWithDetails,
  type Service,
  type InsertService,
  type BillItem,
  type InsertBillItem,
  type Bill,
  type InsertBill,
  type BillWithDetails,
  type User,           // <-- Added
  type InsertUser,       // <-- Added
  rooms,
  guests,
  bookings,
  services,
  billItems,
  bills,
  users,                // <-- Added
  archivedBills,        // +++ ADD THIS +++
  type ArchivedBill,    // +++ ADD THIS +++
} from "@shared/schema";
import { and, eq, desc, gte, lt } from "drizzle-orm";

// The original interface (we must implement all of these)
export interface IStorage {
  getRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoomStatus(id: string, status: string): Promise<Room | undefined>;

  // --- User Methods ---
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // --------------------

  getGuests(): Promise<Guest[]>;
  getGuest(id: string): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;

  getBookings(): Promise<BookingWithDetails[]>;
  getBooking(id: string): Promise<BookingWithDetails | undefined>;
  getBookingsByStatus(status: string): Promise<BookingWithDetails[]>;
  getRecentBookings(limit: number): Promise<BookingWithDetails[]>;
  getTodayCheckIns(): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;

  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;

  getBillByBookingId(bookingId: string): Promise<BillWithDetails | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  addBillItem(item: InsertBillItem): Promise<BillItem>;
  getBillItems(bookingId: string): Promise<BillItem[]>;
  updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined>;

  // +++ ADD THESE 3 NEW METHODS +++
  deleteRoom(id: string): Promise<{ id: string }>;
  completeAndArchiveBill(bookingId: string): Promise<void>;
  getArchivedBills(): Promise<ArchivedBill[]>;
}

// Re-implement the IStorage interface using Drizzle
export class DrizzleStorage implements IStorage {
  
  // --- Room Methods ---
  async getRooms(): Promise<Room[]> {
    return db.select().from(rooms);
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id));
    return result[0];
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const result = await db.insert(rooms).values(room).returning();
    return result[0];
  }

  async updateRoomStatus(id: string, status: string): Promise<Room | undefined> {
    const result = await db
      .update(rooms)
      .set({ status })
      .where(eq(rooms.id, id))
      .returning();
    return result[0];
  }

  // +++ ADD THIS NEW FUNCTION +++
  async deleteRoom(id: string): Promise<{ id: string }> {
    const room = await this.getRoom(id);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status === "occupied" || room.status === "reserved") {
      throw new Error("Cannot delete a room that is currently booked");
    }

    await db.delete(rooms).where(eq(rooms.id, id));
    return { id };
  }

  // --- User Methods ---
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // In a real app, you MUST hash the password here before saving!
    // e.g., const hashedPassword = await hash(user.password, 10);
    // const result = await db.insert(users).values({ ...user, password: hashedPassword }).returning();
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // --- Guest Methods ---
  async getGuests(): Promise<Guest[]> {
    return db.select().from(guests);
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const result = await db.select().from(guests).where(eq(guests.id, id));
    return result[0];
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const result = await db.insert(guests).values(guest).returning();
    return result[0];
  }

  // --- Booking Methods ---
  private async queryBookingsWithDetails(
    conditions?: any,
  ): Promise<BookingWithDetails[]> {
    return db
      .select()
      .from(bookings)
      .innerJoin(guests, eq(bookings.guestId, guests.id))
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(conditions)
      .orderBy(desc(bookings.createdAt))
      .then((results) =>
        results.map((r) => ({
          ...r.bookings,
          guest: r.guests,
          room: r.rooms,
        })),
      );
  }

  async getBookings(): Promise<BookingWithDetails[]> {
    return this.queryBookingsWithDetails();
  }

  async getBooking(id: string): Promise<BookingWithDetails | undefined> {
    const result = await this.queryBookingsWithDetails(eq(bookings.id, id));
    return result[0];
  }

  async getBookingsByStatus(status: string): Promise<BookingWithDetails[]> {
    return this.queryBookingsWithDetails(eq(bookings.status, status));
  }

  async getRecentBookings(limit: number): Promise<BookingWithDetails[]> {
    return db
      .select()
      .from(bookings)
      .innerJoin(guests, eq(bookings.guestId, guests.id))
      .innerJoin(rooms, eq(bookings.roomId, rooms.id))
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((r) => ({
          ...r.bookings,
          guest: r.guests,
          room: r.rooms,
        })),
      );
  }

  async getTodayCheckIns(): Promise<BookingWithDetails[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.queryBookingsWithDetails(
      and(
        eq(bookings.status, "reserved"),
        gte(bookings.checkInDate, today),
        lt(bookings.checkInDate, tomorrow),
      ),
    );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(booking).returning();
    await this.updateRoomStatus(booking.roomId, "reserved");
    return result[0];
  }

  async updateBookingStatus(
    id: string,
    status: string,
  ): Promise<Booking | undefined> {
    const result = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    
    const booking = result[0];
    if (!booking) return undefined;

    if (status === "checked-in") {
      await this.updateRoomStatus(booking.roomId, "occupied");
    } else if (status === "checked-out") {
      await this.updateRoomStatus(booking.roomId, "available");
    }

    return booking;
  }

  // --- Service Methods ---
  async getServices(): Promise<Service[]> {
    return db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  // --- Billing Methods ---
  async getBillByBookingId(
    bookingId: string,
  ): Promise<BillWithDetails | undefined> {
    const billResult = await db
      .select()
      .from(bills)
      .where(eq(bills.bookingId, bookingId));
    
    const bill = billResult[0];
    if (!bill) return undefined;

    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined; 

    const items = await this.getBillItems(bookingId);

    return {
      ...bill,
      booking,
      items,
    };
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const result = await db.insert(bills).values(bill).returning();
    return result[0];
  }

  async addBillItem(item: InsertBillItem): Promise<BillItem> {
    const result = await db.insert(billItems).values(item).returning();
    return result[0];
  }

  async getBillItems(bookingId: string): Promise<BillItem[]> {
    return db.select().from(billItems).where(eq(billItems.bookingId, bookingId));
  }

  async updateBill(
    id: string,
    updates: Partial<Bill>,
  ): Promise<Bill | undefined> {
    const result = await db
      .update(bills)
      .set(updates)
      .where(eq(bills.id, id))
      .returning();
    return result[0];
  }

  // +++ ADD THESE 2 NEW METHODS +++
  async completeAndArchiveBill(bookingId: string): Promise<void> {
    const bill = await this.getBillByBookingId(bookingId);
    if (!bill || !bill.booking) {
      throw new Error("Bill or booking not found");
    }

    const { booking } = bill;
    const { guest, room } = booking;

    // 1. Create the archive
    await db.insert(archivedBills).values({
      guestName: `${guest.firstName} ${guest.lastName}`,
      phone: guest.phone,
      roomNumber: room.number,
      roomType: room.type,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      total: bill.total,
    });

    // 2. Update room to be available
    await this.updateRoomStatus(room.id, "available");

    // 3. Delete the bill items, the bill, and the booking
    // Note: We are NOT deleting the guest, just their booking.
    await db.delete(billItems).where(eq(billItems.bookingId, bookingId));
    await db.delete(bills).where(eq(bills.bookingId, bookingId));
    await db.delete(bookings).where(eq(bookings.id, bookingId));
  }

  async getArchivedBills(): Promise<ArchivedBill[]> {
    return db.select().from(archivedBills).orderBy(desc(archivedBills.completedAt));
  }
}

// Export an instance of our new DrizzleStorage
export const storage = new DrizzleStorage();

// Seed some data if the database is empty (optional)
// We need to check if services exist first, otherwise seeding them every time
// will create duplicates.
async function seedData() {
  const existingServices = await storage.getServices();
  if (existingServices.length === 0) {
    console.log("Seeding services...");
    const servicesToSeed: InsertService[] = [
      { name: "Room Service", description: "24/7 room service", price: "25.00", category: "service" },
      { name: "Spa Treatment", description: "Relaxing spa session", price: "75.00", category: "service" },
      { name: "Airport Transfer", description: "Airport pickup/drop", price: "50.00", category: "service" },
    ];
    for (const service of servicesToSeed) {
      await storage.createService(service);
    }
  }

  // You might also want to seed a default room or admin user here
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    console.log("Seeding default admin user...");
    await storage.createUser({ username: "admin", password: "admin123", role: "admin" });
    // You can also add the 'staff' user here if you like
    console.log("Seeding default staff user...");
    await storage.createUser({ username: "staff", password: "staff123", role: "staff" });
  }
}

seedData().catch(console.error);