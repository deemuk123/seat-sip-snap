

# Menu Item Photos + QR Code Deep-Link Ordering

Two high-impact features to boost conversion and reduce ordering friction.

---

## Feature 1: Menu Item Photos

Currently menu items show emoji placeholders. We'll display real images when `image_url` is set, with a graceful fallback to the existing emoji.

### Changes
- **`src/pages/MenuPage.tsx`** — Replace the emoji `<span>` with an `<img>` tag when `item.imageUrl` exists. Use `aspect-ratio` for consistent sizing, `object-cover` for cropping. Fall back to emoji if no URL or image fails to load.
- **`src/components/manager/MenuManager.tsx`** — Show a small image preview thumbnail next to each item in the management list when `image_url` is set. This helps staff verify the photo is correct.
- **Storage bucket** — Create a `menu-images` public storage bucket so staff can upload photos directly instead of pasting external URLs.
- **Menu Manager upload** — Add a file input in the create/edit dialog that uploads to the `menu-images` bucket and auto-fills the `image_url` field. Keep the manual URL input as a fallback.

---

## Feature 2: QR Code Per Seat — Deep-Link Ordering

A QR code like `https://seat-sip-snap.lovable.app/?show=SHOW_ID&seat=A12` skips 2 screens (show selection + delivery mode) and lands the customer directly on the menu.

### Flow
```text
Customer scans QR at seat
       ↓
URL: /?show=<id>&seat=A12
       ↓
ShowSelection reads query params
  → auto-selects show
  → auto-sets delivery mode = "seat"
  → auto-sets seat number = "A12"
  → navigates to /menu
       ↓
Customer is on the menu instantly
```

### Changes
- **`src/pages/ShowSelection.tsx`** — On mount, read `show` and `seat` query params from URL. If both present, fetch the show by ID, call `selectShow()`, `setDeliveryMode("seat")`, `setSeatNumber()`, and `navigate("/menu")` automatically. If show not found, fall through to normal page.
- **Manager Portal — QR Generator** — New component `src/components/manager/QRGenerator.tsx`:
  - Dropdown to select a running/upcoming show
  - Input for seat number (or range like A1-A20)
  - Generates QR codes using a lightweight inline SVG QR library (no new dependency — use a simple QR code generation function or the existing URL as a text QR via an API like `https://api.qrserver.com/v1/create-qr-code/`)
  - Print-friendly layout for batch printing seat QR stickers
- **`src/pages/ManagerPortal.tsx`** — Add a "QR Codes" tab with the generator

### Technical Details
- No new DB tables needed — the QR simply encodes a URL with query params
- No new edge functions — all client-side
- For QR rendering, use the free `api.qrserver.com` API to generate QR images (zero dependencies), or embed a minimal QR SVG generator

---

## Files to create/modify

| File | Action |
|------|--------|
| `src/pages/MenuPage.tsx` | Show real images with fallback |
| `src/components/manager/MenuManager.tsx` | Add image preview + upload |
| `src/pages/ShowSelection.tsx` | Read `show`/`seat` query params, auto-redirect |
| `src/components/manager/QRGenerator.tsx` | **New** — QR code generator for seats |
| `src/pages/ManagerPortal.tsx` | Add QR Codes tab |
| Migration | Create `menu-images` public storage bucket + RLS |

