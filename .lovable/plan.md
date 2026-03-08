

# Happy Hour / Flash Sales Feature

## Overview
Super Admin can create time-limited flash sales on specific menu items with discount percentages. Customers see a countdown timer banner on the menu page, and discounted prices on qualifying items.

## Database

**New table: `flash_sales`**
- `id` uuid PK
- `title` text (e.g. "Happy Hour - 50% off Popcorn!")
- `menu_item_ids` uuid[] (array of menu item IDs included in the sale)
- `discount_type` text ("percentage" | "fixed")
- `discount_value` numeric
- `start_time` timestamptz
- `end_time` timestamptz
- `is_active` boolean default true
- `created_at` timestamptz default now()

RLS: publicly readable, superadmin can insert/update/delete.

## Super Admin UI

**New tab "Flash Sales" in SuperAdminPortal** (7th tab with Timer/Zap icon)

**New component: `src/components/superadmin/FlashSaleManager.tsx`**
- List all flash sales with status (upcoming/active/expired)
- Create form: title, select menu items (multi-select from menu_items table), discount type/value, start datetime, end datetime
- Toggle active/inactive
- Delete expired sales

## Customer Menu Page

**New component: `src/components/checkout/FlashSaleBanner.tsx`**
- Fetches active flash sales where `now()` is between start_time and end_time
- Shows animated banner with sale title and live countdown timer to end_time
- Countdown updates every second

**Menu item price display changes in `MenuPage.tsx`:**
- Check if item is part of an active flash sale
- Show original price struck through + discounted price
- Badge/tag on the item card (e.g. "FLASH SALE")

## Checkout price calculation

**In `src/lib/supabase-orders.ts`:**
- Before order submission, fetch active flash sales
- Apply discount to qualifying items in the cart
- Store original price and discount info in order for audit

## Files to create
- `src/components/superadmin/FlashSaleManager.tsx`
- `src/components/checkout/FlashSaleBanner.tsx`
- Migration for `flash_sales` table

## Files to edit
- `src/pages/SuperAdminPortal.tsx` — add Flash Sales tab
- `src/pages/MenuPage.tsx` — add FlashSaleBanner, show discounted prices on items
- `src/lib/supabase-orders.ts` — apply flash sale discounts at checkout

