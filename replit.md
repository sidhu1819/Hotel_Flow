# Hotel Management System

A professional hotel management web application for handling guest bookings, room assignments, and automated billing.

## Overview

This is a full-stack hotel management system built with React, Express, and TypeScript. The application provides a comprehensive solution for hotel operations including guest management, room booking, check-in/check-out processes, and automated billing.

## Project Structure

- `/client` - React frontend application
  - `/src/pages` - Page components (Dashboard, Rooms, Guests, Bookings, Check-in, Billing)
  - `/src/components` - Reusable UI components and layout
  - `/src/lib` - Utilities and React Query client
- `/server` - Express backend API
  - `routes.ts` - API route handlers
  - `storage.ts` - In-memory data storage implementation
- `/shared` - Shared TypeScript types and schemas

## Core Features

### 1. Dashboard
- Real-time metrics: total rooms, available rooms, total guests, active bookings
- Occupancy rate calculation
- Today's check-ins view
- Recent bookings activity

### 2. Room Management
- Add new rooms with details (number, type, capacity, price, floor)
- View all rooms with status (available, occupied, reserved)
- Room types: Standard, Deluxe, Suite, Presidential
- Automatic room status synchronization with bookings

### 3. Guest Management
- Register new guests with contact information
- Store guest profiles (name, email, phone, ID number, address)
- View all registered guests with search functionality

### 4. Booking System
- Create new bookings with guest and room selection
- Date range picker for check-in/check-out dates
- Number of guests tracking
- Special requests field
- Real-time room availability checking

### 5. Check-In/Check-Out
- Separate tabs for check-in and check-out operations
- View pending check-ins (reserved bookings)
- View current guests (checked-in bookings)
- One-click check-in/check-out actions
- Automatic room status updates

### 6. Billing & Invoices
- Automatic bill generation based on room charges
- Calculate nights stayed and total room charges
- 10% tax rate (configurable)
- Add additional services/charges to bills
- Item categories: Room, Service, Food & Beverage, Amenity, Other
- Itemized bill view with subtotal, tax, and total
- Print-friendly invoice format

## Technical Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- Tailwind CSS + Shadcn UI components
- React Query (TanStack Query v5) for data fetching
- React Hook Form + Zod for form validation
- Date-fns for date formatting
- Lucide React for icons

### Backend
- Express.js with TypeScript
- In-memory storage (MemStorage class)
- Zod schema validation
- RESTful API design

### Design System
- **Primary Color**: #2C5282 (Professional Blue) - headers, active states
- **Secondary Color**: #ED8936 (Warm Orange) - CTAs, important actions
- **Success Color**: #38A169 (Green) - available status, confirmations
- **Accent Color**: #805AD5 (Purple) - highlights, reserved status
- **Fonts**: Inter for interface, Roboto for data tables
- **Spacing**: 20px base unit (Tailwind gap-5)
- **Layout**: Card-based design with sidebar navigation
- **Theme**: Light and dark mode support

## API Endpoints

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create new room

### Guests
- `GET /api/guests` - Get all guests
- `POST /api/guests` - Register new guest

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/recent` - Get 5 most recent bookings
- `GET /api/bookings/reserved` - Get reserved bookings
- `GET /api/bookings/checked-in` - Get checked-in bookings
- `GET /api/bookings/checked-out` - Get checked-out bookings
- `POST /api/bookings` - Create new booking
- `POST /api/bookings/:id/checkin` - Check in a guest
- `POST /api/bookings/:id/checkout` - Check out a guest

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/today-checkins` - Get today's check-ins

### Billing
- `GET /api/bills/:bookingId` - Get bill for booking
- `POST /api/bills/generate` - Generate bill for booking
- `POST /api/bills/add-item` - Add item to bill

### Services
- `GET /api/services` - Get available services

## Data Models

### Room
- number, type, capacity, pricePerNight, floor, amenities, status

### Guest
- firstName, lastName, email, phone, idNumber, address

### Booking
- guestId, roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests, status

### Bill
- bookingId, subtotal, taxRate, taxAmount, total, isPaid

### BillItem
- bookingId, description, amount, quantity, category

## Running the Application

The application is configured to run with:
```
npm run dev
```

This starts:
- Express backend on port 5000
- Vite frontend dev server (served through Express)

The application is accessible at `http://localhost:5000`

## Sample Data

The application seeds 5 sample rooms on startup:
- 101, 102 (Standard) - $99/night
- 201, 202 (Deluxe) - $149/night
- 301 (Suite) - $249/night

## User Workflows

### Complete Booking Flow
1. **Register Guest** - Go to Guests page, add guest information
2. **Create Booking** - Go to Bookings page, select guest, room, and dates
3. **Check In** - Go to Check-In page, click Check In for the reservation
4. **Check Out** - Switch to Check-Out tab, click Check Out
5. **Generate Bill** - Go to Billing page, select booking, generate bill
6. **Add Services** - Add any additional charges to the bill
7. **Print Invoice** - Print the final bill

## Recent Changes

- Implemented complete schema with rooms, guests, bookings, bills, and services
- Built all frontend pages with professional UI following design guidelines
- Created comprehensive backend API with business logic
- Added dark mode theme support
- Fixed schema validation for numeric fields and date handling
- Implemented automatic room status synchronization with booking lifecycle
