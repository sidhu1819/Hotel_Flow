import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull(),
  pricePerNight: numeric("price_per_night", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("available"),
  floor: integer("floor").notNull(),
  amenities: text("amenities").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  idNumber: text("id_number").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  status: text("status").notNull().default("reserved"),
  numberOfGuests: integer("number_of_guests").notNull(),
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
});

export const billItems = pgTable("bill_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  category: text("category").notNull(),
});

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true }).extend({
  pricePerNight: z.string(),
  capacity: z.coerce.number(),
  floor: z.coerce.number(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({ id: true, createdAt: true });

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true }).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true }).extend({
  price: z.string(),
});

export const insertBillItemSchema = createInsertSchema(billItems).omit({ id: true }).extend({
  amount: z.string(),
  quantity: z.coerce.number(),
});

export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true }).extend({
  subtotal: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  total: z.string(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type BillItem = typeof billItems.$inferSelect;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;

export type BookingWithDetails = Booking & {
  guest: Guest;
  room: Room;
};

export type BillWithDetails = Bill & {
  booking: BookingWithDetails;
  items: BillItem[];
};
