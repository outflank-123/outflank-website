-- Create store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_cod_enabled boolean NOT NULL DEFAULT true,
  cod_min_amount numeric(10,2) NOT NULL DEFAULT 0,
  free_shipping_threshold numeric(10,2) NOT NULL DEFAULT 0,
  flat_shipping_rate numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure there is only ever one row in store_settings
-- We can do this by adding a constraint that the id must be a specific uuid, or just insert one and rely on the UI to only update it.
-- Let's insert a default row if it doesn't exist
INSERT INTO public.store_settings (is_cod_enabled, cod_min_amount, free_shipping_threshold, flat_shipping_rate)
SELECT true, 500, 2000, 100
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- Add payment_method and shipping_fee to retail_orders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='retail_orders' AND column_name='payment_method') THEN
    ALTER TABLE public.retail_orders ADD COLUMN payment_method text DEFAULT 'razorpay' CHECK (payment_method IN ('razorpay', 'cod'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='retail_orders' AND column_name='shipping_fee') THEN
    ALTER TABLE public.retail_orders ADD COLUMN shipping_fee numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Setup RLS for store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "settings_public_read" ON public.store_settings FOR SELECT USING (true);

-- Admins can update settings
CREATE POLICY "settings_admin_update" ON public.store_settings FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "settings_admin_insert" ON public.store_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
