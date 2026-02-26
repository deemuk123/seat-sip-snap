

# BigMovies SeatServe - Phased Implementation Plan

## Current State
The customer-facing ordering flow exists with mock data: show selection, delivery mode, menu, checkout with simulated OTP, confirmation with 4-digit code, and simulated order tracking. No backend, no database, no authentication, no admin/manager portals.

---

## Phase 1: Backend Foundation + Order Lookup Feature
**Goal:** Connect to a real backend and let customers look up existing orders by mobile number.

### 1.1 Set Up Lovable Cloud (Supabase)
- Create database tables: `users`, `roles`, `shows`, `orders`, `order_items`, `menu_categories`, `menu_items`, `order_status_logs`, `coupons`, `settings`
- Add proper indexes on `show_id`, `order_id`, `phone`
- Set up Row Level Security (RLS) policies

### 1.2 Order Lookup on Homepage
- Add a section on the ShowSelection page: "Already ordered? Enter your mobile number to check order status"
- Input field for 10-digit mobile number with a "Check Order" button
- Query orders by phone number; if found, navigate to the confirmation/tracking page for that order
- If multiple orders exist, show a list to pick from

### 1.3 Persist Orders to Database
- Replace in-memory `placeOrder` with a Supabase insert
- Store phone number with the order
- Load `currentOrder` from DB when looking up by phone

---

## Phase 2: Authentication + Role-Based Access
**Goal:** Secure login for Manager, Admin, and Super Admin roles.

### 2.1 Auth Setup
- Enable Supabase Auth (email/password for staff)
- Create `user_roles` table linking users to roles
- Build login page at `/staff/login`

### 2.2 Role-Based Routing
- Protected route wrapper checking role
- `/manager/*` routes - Manager Portal
- `/admin/*` routes - Admin Portal
- `/superadmin/*` routes - Super Admin Panel

---

## Phase 3: Manager Portal
**Goal:** Staff can manage orders and menu items in real-time.

### 3.1 Manager Dashboard
- Filter orders by show, screen, date
- Display order counts by status (pending, preparing, out for delivery, delivered)
- Order cards showing order ID, seat, items, customer mobile, time placed

### 3.2 Order Actions
- Confirm, Mark Preparing, Mark Out for Delivery, Mark Delivered, Cancel (with mandatory reason)
- Delivery verification: staff enters 4-digit code before marking delivered
- Real-time updates using Supabase Realtime subscriptions

### 3.3 Menu Management
- Add/edit/delete menu items with image upload
- Toggle item availability instantly
- Category assignment

---

## Phase 4: Admin Portal
**Goal:** Analytics dashboard and system configuration.

### 4.1 Performance Dashboard
- Charts (using Recharts): total orders, revenue per show/screen, peak ordering times
- KPIs: average confirmation time, average delivery time, most/least sold items
- Day-wise and show-wise filtering

### 4.2 System Controls
- Enable/disable seat delivery toggle
- Configure show ordering time window
- Set tax percentage and service charge
- Set estimated delivery time logic
- OTP and Show API credential fields (stored in `settings` table)

---

## Phase 5: Super Admin Panel
**Goal:** Multi-location and user management.

### 5.1 User Management
- Create/edit/deactivate Admin and Manager accounts
- Assign cinema locations and role permissions

### 5.2 System-Level Controls
- Multi-location support (location selector)
- Branding and theme configuration
- Audit logs table showing all actions with timestamps and actors

---

## Phase 6: API Integrations
**Goal:** Connect to real external services.

### 6.1 Show API Integration
- Replace mock shows with external Show API calls
- Filter shows within configurable time window (default: 30 min before to interval end)

### 6.2 SMS OTP Integration
- Integrate external SMS API for real OTP delivery
- OTP valid for 5 minutes, max 3 attempts, rate limiting
- Encrypt OTP storage

---

## Phase 7: Advanced Features
**Goal:** Revenue-boosting and operational features.

### 7.1 AI Upsell Engine
- Suggest combos when popcorn is added, drinks when snacks are added
- "Most Ordered in This Show" section on menu page

### 7.2 Interval Boost Mode
- Admin toggle to activate interval mode
- Banner on customer app: "Order now for faster delivery"

### 7.3 Coupon System
- Fixed discount, percentage discount, show-specific coupons
- Apply coupon field on checkout page

### 7.4 Repeat Order
- Detect returning phone numbers, show previous orders
- "Reorder" button to re-add items to cart

### 7.5 Order Time SLA Tracking
- Highlight orders exceeding SLA in manager dashboard
- Track and display average times

### 7.6 Fraud Prevention
- Limit orders per seat per show
- Block suspicious phone numbers

---

## Phase 8: PWA + Performance
**Goal:** Installable app optimized for cinema environments.

### 8.1 PWA Setup
- Add service worker and web manifest
- Offline fallback page
- Install prompt

### 8.2 Performance Optimization
- Image lazy loading and compression
- Under 2-second load target
- 3G network optimization

---

## Immediate Next Step (Phase 1.2 - Order Lookup)

**Technical details for the order lookup feature:**

1. **ShowSelection.tsx** - Add a collapsible section at the top with:
   - Text: "Track your existing order"
   - Mobile number input (10 digits)
   - "Find Order" button
   - On submit: search `currentOrder` in context (for now, mock); later query Supabase

2. **AppContext.tsx** - Add:
   - `ordersByPhone: Map<string, Order[]>` to track placed orders by phone
   - `lookupOrderByPhone(phone: string): Order | null` method
   - Store phone with each order in `placeOrder`

3. **New route** `/order-lookup` (optional) or handle inline on homepage, navigating to `/confirmation` after finding the order

4. **Confirmation.tsx** - Already handles displaying `currentOrder`, so the lookup just needs to set `currentOrder` in context and navigate there

