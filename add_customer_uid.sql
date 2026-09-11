-- Run this script in your Supabase SQL Editor

-- 1. Add customer_uid to retail_orders so we can map Firebase users to their orders
ALTER TABLE public.retail_orders ADD COLUMN IF NOT EXISTS customer_uid text;

-- 2. Create an index on customer_uid for faster lookups
CREATE INDEX IF NOT EXISTS retail_orders_customer_uid_idx ON public.retail_orders (customer_uid);
