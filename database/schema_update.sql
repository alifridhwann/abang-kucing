-- =====================================================
-- ABANG KUCING - DATABASE SCHEMA UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Blocked days table (for admin to block off days)
CREATE TABLE IF NOT EXISTS public.blocked_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Settings table (for base location, etc)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Loyalty transactions (per-booking points with expiry)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID,
  points INTEGER NOT NULL,
  reason TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add completed_at to bookings (for tracking when grooming completed)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 5. Enable RLS on new tables
ALTER TABLE public.blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "blocked_days_read" ON public.blocked_days;
DROP POLICY IF EXISTS "blocked_days_admin_insert" ON public.blocked_days;
DROP POLICY IF EXISTS "blocked_days_admin_update" ON public.blocked_days;
DROP POLICY IF EXISTS "blocked_days_admin_delete" ON public.blocked_days;

DROP POLICY IF EXISTS "settings_read" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_update" ON public.settings;

DROP POLICY IF EXISTS "loyalty_tx_select" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "loyalty_tx_insert" ON public.loyalty_transactions;

-- 7. Create RLS policies for blocked_days
-- Everyone can read blocked days (for booking page)
CREATE POLICY "blocked_days_read" ON public.blocked_days 
  FOR SELECT USING (true);

-- Admin can insert blocked days
CREATE POLICY "blocked_days_admin_insert" ON public.blocked_days 
  FOR INSERT WITH CHECK (public.is_admin());

-- Admin can update blocked days
CREATE POLICY "blocked_days_admin_update" ON public.blocked_days 
  FOR UPDATE USING (public.is_admin());

-- Admin can delete blocked days
CREATE POLICY "blocked_days_admin_delete" ON public.blocked_days 
  FOR DELETE USING (public.is_admin());

-- 8. Create RLS policies for settings
-- Everyone can read settings (for base location in booking)
CREATE POLICY "settings_read" ON public.settings 
  FOR SELECT USING (true);

-- Admin can insert/update settings
CREATE POLICY "settings_admin_insert" ON public.settings 
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "settings_admin_update" ON public.settings 
  FOR UPDATE USING (public.is_admin());

-- 9. Create RLS policies for loyalty_transactions
-- Users can see their own transactions, admin can see all
CREATE POLICY "loyalty_tx_select" ON public.loyalty_transactions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.is_admin()
  );

-- Only admin can insert loyalty transactions (manual add points)
CREATE POLICY "loyalty_tx_insert" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- 10. Insert default base location setting (Kuala Lumpur as placeholder)
INSERT INTO public.settings (key, value) 
VALUES ('base_location', '{"lat": 3.1390, "lng": 101.6869, "address": "Kuala Lumpur"}')
ON CONFLICT (key) DO NOTHING;

-- 11. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Done!
SELECT 'Schema update completed successfully!' as result;
