-- ============================================================
--  OUTFLANK — FULL DATABASE RESET + FRESH SCHEMA
--  ⚠️  THIS DROPS ALL EXISTING DATA. RUN WITH CAUTION.
--
--  Instructions:
--  BEFORE running this SQL:
--    → Run: node scripts/empty-bucket.mjs
--      (empties the product-images storage bucket via API)
--
--  Then run this file in Supabase SQL Editor → New Query
-- ============================================================


-- ─────────────────────────────────────────
-- STEP 1: DROP ALL TABLES & TYPES
-- ─────────────────────────────────────────

-- Drop tables in correct dependency order
drop table if exists public.leads             cascade;
drop table if exists public.admin_profiles    cascade;
drop table if exists public.products          cascade;
drop table if exists public.categories        cascade;

-- Drop custom enum type
drop type if exists public.lead_status        cascade;

-- Drop trigger helper function
drop function if exists public.update_updated_at() cascade;

-- Drop any old auth.users triggers from previous schema
-- (these cause "Database error creating new user" if the target table was dropped)
drop trigger if exists on_auth_user_created              on auth.users;
drop trigger if exists on_auth_user_created_insert       on auth.users;
drop trigger if exists handle_new_user                   on auth.users;
drop function if exists public.handle_new_user()         cascade;
drop function if exists public.on_auth_user_created()    cascade;


-- ─────────────────────────────────────────
-- STEP 2: EXTENSIONS
-- ─────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";


-- ─────────────────────────────────────────
-- STEP 3: ENUMS
-- ─────────────────────────────────────────
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'closed');


-- ─────────────────────────────────────────
-- STEP 4: TABLES
-- ─────────────────────────────────────────

-- 1. Categories
create table public.categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  description text,
  icon_name   text,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.categories
  is 'Product categories for the Outflank gifting catalog';


-- 2. Products
--
-- color_variants JSONB shape:
-- [
--   {
--     "name":   "Midnight Black",
--     "hex":    "#1a1a1a",
--     "images": ["https://...webp", "https://...webp"]
--   }
-- ]
create table public.products (
  id                uuid        primary key default gen_random_uuid(),
  category_id       uuid        references public.categories(id) on delete set null,
  name              text        not null,
  slug              text        not null unique,
  description       text,
  short_desc        text,
  base_price        numeric(10,2),
  min_order_qty     int         default 50,
  lead_time_days    int         default 15,
  is_featured       boolean     not null default false,
  is_active         boolean     not null default true,
  tags              text[]      default '{}',
  color_variants    jsonb       not null default '[]'::jsonb,
  primary_image_url text,
  image_gallery     text[]      default '{}',
  source_pdf        text,
  is_customizable   boolean     not null default false,
  branding_config   jsonb       default '{"top": "50%", "left": "50%", "transform": "translate(-50%, -50%)", "width": "40%"}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table  public.products
  is 'Corporate gift products. color_variants is JSONB [{name,hex,images:[]}]';
comment on column public.products.color_variants
  is '[{"name":"Black","hex":"#1a1a1a","images":["url1","url2"]}]';

create index products_category_id_idx  on public.products(category_id);
create index products_is_active_idx    on public.products(is_active);
create index products_is_featured_idx  on public.products(is_featured);
create index products_name_trgm_idx    on public.products using gin(name gin_trgm_ops);
create index products_variants_gin_idx on public.products using gin(color_variants);


-- 3. Leads
create table public.leads (
  id           uuid            primary key default gen_random_uuid(),
  product_id   uuid            references public.products(id) on delete set null,
  product_name text,
  name         text            not null,
  company      text            not null,
  email        text            not null,
  phone        text,
  requirements text,
  status       public.lead_status not null default 'new',
  source       text            default 'website',
  notes        text,
  created_at   timestamptz     not null default now(),
  updated_at   timestamptz     not null default now()
);

comment on table public.leads
  is 'Inbound inquiries / leads from the gifting catalog';

create index leads_status_idx     on public.leads(status);
create index leads_created_at_idx on public.leads(created_at desc);


-- 4. Admin Profiles
create table public.admin_profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text        not null default 'admin'
               check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

comment on table public.admin_profiles
  is 'Admin users linked to Supabase auth.users';


-- ─────────────────────────────────────────
-- STEP 5: AUTO-UPDATE TRIGGER
-- ─────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.update_updated_at();

create trigger leads_updated_at
  before update on public.leads
  for each row execute procedure public.update_updated_at();


-- ─────────────────────────────────────────
-- STEP 6: ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.leads          enable row level security;
alter table public.admin_profiles enable row level security;

-- Categories: public read, authenticated write
create policy "categories_public_read"
  on public.categories for select using (true);
create policy "categories_admin_write"
  on public.categories for all
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Products: public can read active products, authenticated admins have full access
create policy "products_public_read"
  on public.products for select using (is_active = true);
create policy "products_admin_all"
  on public.products for all
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Leads: anyone can INSERT (lead form), only authenticated can read/update/delete
create policy "leads_public_insert"
  on public.leads for insert with check (true);
create policy "leads_admin_select"
  on public.leads for select using (auth.role() = 'authenticated');
create policy "leads_admin_update"
  on public.leads for update
  using      (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "leads_admin_delete"
  on public.leads for delete using (auth.role() = 'authenticated');

-- Admin profiles: admins can only see their own
create policy "admin_profiles_self_read"
  on public.admin_profiles for select using (auth.uid() = id);


-- ─────────────────────────────────────────
-- STEP 7: STORAGE BUCKET
-- Run separately if the bucket doesn't exist yet
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,   -- 5 MB max per file
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = true;

-- Storage RLS: public read
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Storage RLS: authenticated/service role can upload
drop policy if exists "product_images_upload" on storage.objects;
create policy "product_images_upload"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_update" on storage.objects;
create policy "product_images_update"
  on storage.objects for update
  using (bucket_id = 'product-images');

drop policy if exists "product_images_delete" on storage.objects;
create policy "product_images_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images');


-- ─────────────────────────────────────────
-- STEP 8: SEED CATEGORIES (from PDF names)
-- ─────────────────────────────────────────
insert into public.categories (name, slug, description, icon_name, sort_order) values
  ('Covid & Prevention Items',         'covid-corona-epidemic-prevention-items',     'Hygiene kits, sanitizers, masks and epidemic prevention products', 'ShieldCheck',      1),
  ('Customized Products',              'customized-products-made-to-order',          'Made-to-order products with your brand logo and design',           'Palette',          2),
  ('Doctor & Pharma Utility',          'doctor-utility-pharma',                      'Medical-grade utility gifts for healthcare professionals',          'Stethoscope',      3),
  ('Eco-Friendly Products',            'eco-friendly-products',                      'Sustainable and environmentally conscious corporate gifts',         'Leaf',             4),
  ('Electronics & Mobile Accessories', 'electronics-and-mobile-accessories',         'Cutting-edge tech gifts and mobile accessories',                    'Smartphone',       5),
  ('Employee Joining Kits',            'employee-joining-kits',                      'Curated onboarding kits to welcome new team members',              'Package',          6),
  ('Flasks, Sippers & Mugs',           'flasks-sippers-mugs',                        'Premium drinkware for hydration on the go',                         'Coffee',           7),
  ('Gift Sets',                        'gift-sets',                                  'Elegant curated gift sets for premium corporate gifting',           'Gift',             8),
  ('Home & Kitchen',                   'home-kitchen',                               'Premium home and kitchen lifestyle products',                       'Home',             9),
  ('Lamps & Torches',                  'lamps-torches',                              'Illuminating gifts — desk lamps, LED torches and more',             'Lamp',            10),
  ('Multifunction Keychains',          'multifunction-keychains',                    'Compact, versatile keychain tools for everyday carry',              'Key',             11),
  ('Office Desk & Stationery',         'office-table-tops-and-stationery',           'Premium desk accessories and stationery for the modern office',     'PenTool',         12),
  ('Plastic Bottles & Shakers',        'plastic-bottles-sippers-shakers',            'Fitness and hydration bottles, shakers and sippers',                'Droplets',        13),
  ('Power Banks',                      'power-banks',                                'Portable power solutions for always-on professionals',              'BatteryCharging',  14),
  ('Speakers, Headphones & Earphones', 'speakers-headphones-earphones',              'Premium audio accessories for work and leisure',                    'Headphones',      15),
  ('Table & Wall Clocks',              'table-wall-clocks',                          'Elegant timepieces for office and home decor',                      'Clock',           16),
  ('Work From Home',                   'work-from-home',                             'Productivity essentials for the remote workforce',                  'Monitor',         17)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────
-- STEP 8: BANNERS (Dynamic Homepage Hero)
-- ─────────────────────────────────────────
drop table if exists public.banners cascade;

create table public.banners (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  image_url text not null,
  cta_text text,
  cta_link text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- RLS for banners
alter table public.banners enable row level security;
create policy "Public can read active banners" on public.banners for select using (is_active = true);
create policy "Admins can insert banners" on public.banners for insert with check (auth.role() = 'authenticated');
create policy "Admins can update banners" on public.banners for update using (auth.role() = 'authenticated');
create policy "Admins can delete banners" on public.banners for delete using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- DONE ✓
-- ─────────────────────────────────────────
-- After running this script:
-- 1. Go to Authentication → Users → Invite a new admin user
-- 2. Run scripts/upload_products.py to populate products from PDFs
-- ─────────────────────────────────────────
