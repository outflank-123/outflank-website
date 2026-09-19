-- ─────────────────────────────────────────────────────────────
-- RETAIL CUSTOMIZATION & 14-DAY ASSET RETENTION SCHEMA MIGRATION
-- ─────────────────────────────────────────────────────────────

-- 1. Add asset retention and customization tracking to retail_orders
ALTER TABLE public.retail_orders 
  ADD COLUMN IF NOT EXISTS has_custom_items boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS assets_purged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assets_purged_at timestamptz DEFAULT null;

-- 2. Add customization JSONB payload to retail_order_items
ALTER TABLE public.retail_order_items 
  ADD COLUMN IF NOT EXISTS customization jsonb DEFAULT null;

-- 3. Create performance index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_retail_orders_retention 
  ON public.retail_orders (status, delivered_at, assets_purged);
