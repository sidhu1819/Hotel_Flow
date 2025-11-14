# Hotel Management Application - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing from Booking.com's property management interface and Airbnb Host dashboard - professional, data-rich hospitality management platforms known for clean organization and efficient workflows.

## Core Design Principles
- Professional dashboard aesthetic prioritizing data clarity and operational efficiency
- Card-based information architecture for organized content sections
- Utilitarian design focused on fast task completion and data scanning
- Responsive layouts that maintain functionality across devices

## Typography
**Font Stack**: Inter for interface text, Roboto for data tables and forms
- Headings: Inter Bold, 24px-32px
- Section Titles: Inter Semibold, 18px-20px
- Body Text: Inter Regular, 14px-16px
- Data Tables: Roboto Regular, 14px
- Form Labels: Inter Medium, 14px
- Small Print/Meta: Inter Regular, 12px

## Color Palette (User Specified)
- Primary: #2C5282 (Professional Blue) - primary buttons, headers, active states
- Secondary: #ED8936 (Warm Orange) - CTAs, highlights, important actions
- Background: #F7FAFC (Light Grey) - page background, card containers
- Text: #2D3748 (Dark Grey) - primary text content
- Success: #38A169 (Green) - confirmations, available status, positive indicators
- Accent: #805AD5 (Purple) - secondary highlights, badges, special features
- Neutral Grays: #E2E8F0 (borders), #FFFFFF (cards/modals)

## Layout System
**Spacing**: Consistent 20px base unit (Tailwind: space-5)
- Section padding: 40px vertical, 20px horizontal
- Card spacing: 20px gaps between cards
- Form field spacing: 20px between groups
- Table row padding: 16px vertical

**Container Structure**:
- Dashboard grid: 3-column layout for metrics cards (desktop), stacks on mobile
- Main content: 2-column split (sidebar navigation + content area)
- Data tables: Full-width with horizontal scroll on mobile
- Forms: Single column, max-width 600px for readability

## Component Library

**Dashboard Cards**:
- White background with subtle shadow
- Rounded corners (8px)
- Icon + metric + label structure
- Color-coded borders for status indicators

**Data Tables**:
- Sticky header row with primary blue background
- Alternating row colors for readability
- Action buttons in rightmost column
- Sortable column headers
- Search and filter bar above table

**Forms**:
- Clear field labels above inputs
- Input fields with light grey borders, focus state in primary blue
- Required field indicators
- Submit buttons in secondary orange, cancel/back in neutral grey
- Validation messages in success green or error red

**Booking Calendar**:
- Grid layout showing room availability
- Color-coded cells: available (white), booked (light grey), selected (primary blue)
- Date range selector
- Room type filters

**Bill/Invoice Display**:
- Structured line-item layout
- Bold section headers (Room Charges, Services, Taxes)
- Right-aligned pricing columns
- Prominent total with background highlight
- Print-friendly formatting

**Status Badges**:
- Rounded pills with appropriate colors
- Checked In: Success Green
- Checked Out: Neutral Grey
- Reserved: Accent Purple
- Available: Success Green with light background

**Navigation**:
- Left sidebar with icon + label menu items
- Active state highlighted in primary blue
- Collapsible on mobile to hamburger menu
- Persistent header with hotel name/logo

## Images
No hero images needed - this is a dashboard application focused on functionality. Use icons from Heroicons for navigation, status indicators, and action buttons throughout the interface.

## Interactions
- Hover states: Subtle shadow increase on cards, slight opacity change on buttons
- Loading states: Skeleton screens for data tables during fetch
- Modal overlays: For check-in/out forms and detailed guest information
- Toast notifications: For successful actions (bookings confirmed, bills generated)
- Minimal animations - focus on instant feedback and responsiveness

## Key Screens Layout

**Dashboard Overview**: 3 metric cards (occupancy rate, available rooms, today's activity) + quick actions + recent bookings table

**Booking Management**: Filter/search bar + bookings data table with inline edit/cancel actions

**Guest Check-In/Out**: Form with guest search + room assignment dropdown + service additions checklist

**Bill Generation**: Guest selector + itemized charges table + tax calculator + generate/print buttons