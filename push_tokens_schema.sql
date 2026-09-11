-- Run this script in your Supabase SQL Editor

-- Create table to store Firebase Cloud Messaging (FCM) push tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_uid text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create an index on customer_uid for fast lookups when sending targeted notifications
CREATE INDEX IF NOT EXISTS push_tokens_customer_uid_idx ON public.push_tokens (customer_uid);
