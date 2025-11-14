import { randomUUID } from "crypto";
import type {
  Room,
  InsertRoom,
  Guest,
  InsertGuest,
  Booking,
  InsertBooking,
  BookingWithDetails,
  Service,
  InsertService,
  BillItem,
  InsertBillItem,
  Bill,
  InsertBill,
  BillWithDetails,
} from "@shared/schema";

export interface IStorage {
  getRooms(): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoomStatus(id: string, status: string): Promise<Room | undefined>;

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
}

export class MemStorage implements IStorage {
  private rooms: Map<string, Room>;
  private guests: Map<string, Guest>;
  private bookings: Map<string, Booking>;
  private services: Map<string, Service>;
  private bills: Map<string, Bill>;
  private billItems: Map<string, BillItem>;

  constructor() {
    this.rooms = new Map();
    this.guests = new Map();
    this.bookings = new Map();
    this.services = new Map();
    this.bills = new Map();
    this.billItems = new Map();
    this.seedData();
  }

  private seedData() {
    const rooms: InsertRoom[] = [
      { number: "101", type: "standard", capacity: 2, pricePerNight: "99.00", floor: 1, amenities: ["WiFi", "TV"], status: "available" },
      { number: "102", type: "standard", capacity: 2, pricePerNight: "99.00", floor: 1, amenities: ["WiFi", "TV"], status: "available" },
      { number: "201", type: "deluxe", capacity: 3, pricePerNight: "149.00", floor: 2, amenities: ["WiFi", "TV", "Mini Bar"], status: "available" },
      { number: "202", type: "deluxe", capacity: 3, pricePerNight: "149.00", floor: 2, amenities: ["WiFi", "TV", "Mini Bar"], status: "available" },
      { number: "301", type: "suite", capacity: 4, pricePerNight: "249.00", floor: 3, amenities: ["WiFi", "TV", "Mini Bar", "Balcony"], status: "available" },
    ];

    rooms.forEach(async (room) => await this.createRoom(room));

    const services: InsertService[] = [
      { name: "Room Service", description: "24/7 room service", price: "25.00", category: "service" },
      { name: "Spa Treatment", description: "Relaxing spa session", price: "75.00", category: "service" },
      { name: "Airport Transfer", description: "Airport pickup/drop", price: "50.00", category: "service" },
    ];

    services.forEach(async (service) => await this.createService(service));
  }

  async getRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = { ...insertRoom, id };
    this.rooms.set(id, room);
    return room;
  }

  async updateRoomStatus(id: string, status: string): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (room) {
      room.status = status;
      this.rooms.set(id, room);
      return room;
    }
    return undefined;
  }

  async getGuests(): Promise<Guest[]> {
    return Array.from(this.guests.values());
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    return this.guests.get(id);
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const id = randomUUID();
    const guest: Guest = { ...insertGuest, id, createdAt: new Date() };
    this.guests.set(id, guest);
    return guest;
  }

  async getBookings(): Promise<BookingWithDetails[]> {
    const bookings = Array.from(this.bookings.values());
    return Promise.all(
      bookings.map(async (booking) => {
        const guest = await this.getGuest(booking.guestId);
        const room = await this.getRoom(booking.roomId);
        return {
          ...booking,
          guest: guest!,
          room: room!,
        };
      })
    );
  }

  async getBooking(id: string): Promise<BookingWithDetails | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    const guest = await this.getGuest(booking.guestId);
    const room = await this.getRoom(booking.roomId);

    if (!guest || !room) return undefined;

    return {
      ...booking,
      guest,
      room,
    };
  }

  async getBookingsByStatus(status: string): Promise<BookingWithDetails[]> {
    const allBookings = await this.getBookings();
    return allBookings.filter((booking) => booking.status === status);
  }

  async getRecentBookings(limit: number): Promise<BookingWithDetails[]> {
    const allBookings = await this.getBookings();
    return allBookings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getTodayCheckIns(): Promise<BookingWithDetails[]> {
    const allBookings = await this.getBookings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return allBookings.filter((booking) => {
      const checkIn = new Date(booking.checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      return checkIn.getTime() === today.getTime() && booking.status === "reserved";
    });
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { ...insertBooking, id, createdAt: new Date() };
    this.bookings.set(id, booking);
    await this.updateRoomStatus(booking.roomId, "reserved");
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = status;
      this.bookings.set(id, booking);

      if (status === "checked-in") {
        await this.updateRoomStatus(booking.roomId, "occupied");
      } else if (status === "checked-out") {
        await this.updateRoomStatus(booking.roomId, "available");
      }

      return booking;
    }
    return undefined;
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = randomUUID();
    const service: Service = { ...insertService, id };
    this.services.set(id, service);
    return service;
  }

  async getBillByBookingId(bookingId: string): Promise<BillWithDetails | undefined> {
    const bill = Array.from(this.bills.values()).find((b) => b.bookingId === bookingId);
    if (!bill) return undefined;

    const booking = await this.getBooking(bookingId);
    const items = await this.getBillItems(bookingId);

    if (!booking) return undefined;

    return {
      ...bill,
      booking,
      items,
    };
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = randomUUID();
    const bill: Bill = { ...insertBill, id, createdAt: new Date() };
    this.bills.set(id, bill);
    return bill;
  }

  async addBillItem(insertItem: InsertBillItem): Promise<BillItem> {
    const id = randomUUID();
    const item: BillItem = { ...insertItem, id };
    this.billItems.set(id, item);
    return item;
  }

  async getBillItems(bookingId: string): Promise<BillItem[]> {
    return Array.from(this.billItems.values()).filter((item) => item.bookingId === bookingId);
  }

  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    if (bill) {
      Object.assign(bill, updates);
      this.bills.set(id, bill);
      return bill;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
