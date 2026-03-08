

# Super Admin Coupons Tab + WhatsApp Fix

## Changes

### 1. Fix WhatsApp phone number in `send-reward` edge function
Currently uses `+91` (India). Change to `+977` (Nepal):
- Line 114: Strip `+977` prefix instead of `+91`
- Line 115: Use `977${phone}@c.us` instead of `91${phone}@c.us`

### 2. New "Coupons" tab in Super Admin Portal
Add a 5th tab showing all sent scratch card coupons with details.

**New component: `src/components/superadmin/CouponsSent.tsx`**
- Query `scratch_rewards` joined with `orders` (for phone, order_code) and `coupons` (for expiry, usage)
- Display table with columns: Order Code, Phone, Tier (Gold/Silver/Bronze badge), Coupon Code, Discount, Sent status, Created date
- Search/filter by phone or coupon code

**Edit `src/pages/SuperAdminPortal.tsx`:**
- Add 5th tab "Coupons" with a Gift/Ticket icon
- Change grid-cols-4 to grid-cols-5

### 3. Improve WhatsApp coupon message
Make the message more customer-friendly with the cinema brand feel, clear instructions, and terms.

### Files to edit
| File | Action |
|------|--------|
| `supabase/functions/send-reward/index.ts` | Fix phone to +977, improve message |
| `src/components/superadmin/CouponsSent.tsx` | Create — coupons sent table |
| `src/pages/SuperAdminPortal.tsx` | Add Coupons tab |

