-- Run this in your Supabase SQL Editor to allow the 'junior' role

ALTER TABLE public.admin_profiles DROP CONSTRAINT IF EXISTS admin_profiles_role_check;

ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_role_check 
  CHECK (role IN ('admin', 'super_admin', 'junior'));
