
CREATE TABLE public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) access this table, no public access needed
CREATE POLICY "No public access to OTP verifications"
ON public.otp_verifications
FOR ALL
USING (false);

CREATE INDEX idx_otp_phone_created ON public.otp_verifications (phone, created_at DESC);
