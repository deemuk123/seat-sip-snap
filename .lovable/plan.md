## Plan: WhatsApp OTP delivery with 60-second validity

Switch the OTP system from "simulated mode" (OTP shown on screen) to real WhatsApp delivery via the WAHA API at `https://whatsapp.bigmovies.work/`, and tighten OTP expiry to **60 seconds**.

---

### 1. Update WAHA secrets

The project already has these runtime secrets, but they point to the old WAHA instance. Update them to the new server:

- `WAHA_API_URL` → `https://whatsapp.bigmovies.work`
- `WAHA_API_KEY` → `Root@132#`
- (Session name `default` is already hardcoded — no change needed.)

These will be updated via the secrets tool (you'll see a prompt to confirm).

### 2. Modify `send-otp` edge function

Currently it generates the OTP, stores it in `otp_verifications`, and returns the OTP to the client (simulated mode). New behavior:

- Keep generating the 6-digit OTP and storing it in `otp_verifications`.
- **Set `expires_at` to `now() + 60 seconds`** (currently 5 minutes).
- **Format the customer's phone for WhatsApp**: WAHA expects `<countrycode><number>@c.us`. Based on existing project (Nepal, +977 prefix used elsewhere in `whatsapp-notify`), we'll use `977{phone}@c.us`. If you confirm a different country, we'll switch the prefix.
- **Call WAHA `/api/sendText`** directly (not the group `send-whatsapp` function) with:
  - `chatId`: the formatted customer number
  - `text`: e.g. `Your Big Movies OTP is *123456*. Valid for 60 seconds. Do not share this code.`
  - `session`: `default`
- **Do NOT return the OTP** in the response anymore (remove simulated mode). Return only `{ success: true }`.
- If WAHA send fails, return a 500 with a clear error so the user can retry. (We will NOT silently succeed — OTP must reach the user.)
- Keep the existing 30-second resend rate limit.

### 3. Modify `verify-otp` edge function

The expiry check (`record.expires_at < now()`) already exists and will naturally enforce the 60-second window once `send-otp` writes the shorter expiry. No logic change needed beyond confirming the existing expiry rejection path returns "OTP expired. Please request a new one."

### 4. Frontend changes (`src/pages/Checkout.tsx`)

- **Remove the inline "Demo OTP: ..." display** (the `simulatedOtp` state and UI block) since OTP will now arrive via WhatsApp.
- **Show a 60-second countdown** on the OTP input screen (e.g. "OTP expires in 0:48"). When it reaches 0, disable the verify button and show "OTP expired — tap Resend".
- Increase the resend cooldown from 30s to align with the 60s validity (resend allowed after 30s as today is fine; keep as is).
- Show toast `"OTP sent to your WhatsApp"` on successful send.

### 5. Optional: log WhatsApp send result

Log success/failure of the WAHA send call to the edge function logs (already standard). No new DB table needed.

---

### Technical details

**WAHA endpoint used**: `POST https://whatsapp.bigmovies.work/api/sendText`
Headers: `X-Api-Key: Root@132#`, `Content-Type: application/json`
Body:
```json
{
  "chatId": "977XXXXXXXXXX@c.us",
  "text": "Your Big Movies OTP is *123456*. Valid for 60 seconds.",
  "session": "default",
  "linkPreview": false,
  "reply_to": null
}
```

**fastSend / imprange (B4, B5)**: These are WAHA-instance-level settings configured on the WAHA server itself, not per-request flags in the sendText payload. No code change needed for them — they're already enabled on your WAHA server per your note.

**Country code question**: I'll default to `+977` (Nepal) based on the existing `send-reward` flow in this project. If your customers use a different country, tell me and I'll change the prefix (or make it configurable via a setting).

---

### Files touched

- `supabase/functions/send-otp/index.ts` — WAHA send + 60s expiry, remove OTP from response
- `src/pages/Checkout.tsx` — remove demo OTP UI, add 60s countdown, update toast
- Secrets: `WAHA_API_URL`, `WAHA_API_KEY` updated

### Open question

- Confirm country code prefix for customer phone numbers (default: **+977 Nepal**). Reply with a different prefix if needed before approving.