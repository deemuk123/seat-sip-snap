

# Scratch Card Reward System with Admin Controls

## Overview

After placing an order, customers get an interactive scratch card (Gold/Silver/Bronze or "Try Again"). The scratch card feature and tier limits are fully configurable from the Admin Settings panel. When the order is delivered, the coupon code is sent via WhatsApp/SMS.

## Database

**New table: `scratch_rewards`**
- `id` uuid PK
- `order_id` uuid (references orders)
- `tier` text (gold/silver/bronze/none)
- `discount_value` numeric
- `coupon_code` text nullable (generated on delivery)
- `sent` boolean default false
- `scratched` boolean default false
- `created_at` timestamptz default now()

RLS: public insert + select (anonymous orders), staff update.

## Admin Settings (SystemSettings.tsx)

Add a new "Scratch Card Rewards" card with:
- **Enable/disable** scratch cards (toggle)
- **Max Gold cards** (number input) — total gold rewards that can be given (0 = unlimited)
- **Max Silver cards** (number input)
- **Max Bronze cards** (number input)
- **Gold discount %**, **Silver discount %**, **Bronze discount %** (defaults: 30/15/5)
- **Gold probability %**, **Silver probability %**, **Bronze probability %** (defaults: 10/30/60)
- **"Try Again" included** — remaining probability auto-calculated (e.g., if gold+silver+bronze = 80%, try again = 20%)

Stored in `settings` table under key `scratch_card_config`.

## Tier Assignment (supabase-orders.ts)

After `insertOrder`:
1. Fetch `scratch_card_config` from settings
2. If disabled, skip
3. Check current counts of each tier in `scratch_rewards` (today or all-time based on preference)
4. Roll random number, assign tier respecting max caps (if gold maxed out, redistribute to lower tiers or "try again")
5. Insert `scratch_rewards` row
6. Return tier info alongside the order

## Scratch Card UI (ScratchCard.tsx)

- Canvas-based scratch overlay with metallic gradient (gold/silver/bronze themed)
- User drags finger/mouse to reveal prize underneath
- **"Try Again"** outcome shows "Better luck next time!" message
- Prize reveal shows discount amount + message: "Your coupon will be sent via WhatsApp when your order is delivered"
- Appears on Confirmation page between order code and order details

## Reward Delivery (send-reward edge function)

Triggered when manager marks order as "delivered" (from `verifyAndDeliverOrder`):
1. Look up `scratch_rewards` for the order
2. If tier is "none" (try again), skip
3. Generate unique coupon code (e.g., `GOLD-XXXX`)
4. Insert into `coupons` table (single use, 7-day expiry)
5. Update `scratch_rewards` with coupon_code + sent=true
6. Send WhatsApp message to customer's phone with the coupon code

## Files to Create/Edit

| File | Action |
|------|--------|
| DB migration | Create `scratch_rewards` table |
| `src/components/checkout/ScratchCard.tsx` | Create — interactive canvas scratch card |
| `src/pages/Confirmation.tsx` | Edit — show scratch card |
| `src/lib/supabase-orders.ts` | Edit — assign tier + insert reward row |
| `src/context/AppContext.tsx` | Edit — add scratchReward to order state |
| `src/components/admin/SystemSettings.tsx` | Edit — add scratch card config section |
| `src/lib/supabase-manager.ts` | Edit — invoke send-reward on delivery |
| `supabase/functions/send-reward/index.ts` | Create — generate coupon + WhatsApp send |
| `supabase/config.toml` | Add `[functions.send-reward]` with `verify_jwt = false` |

