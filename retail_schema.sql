-- ─────────────────────────────────────────
-- ADD RETAIL PIPELINE TABLES
-- ─────────────────────────────────────────

-- 1. Retail Orders Table
create type public.retail_order_status as enum ('pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled');

create table public.retail_orders (
  id               uuid primary key default gen_random_uuid(),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text not null,
  shipping_address text not null,
  total_amount     numeric(10,2) not null,
  status           public.retail_order_status not null default 'pending',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2. Retail Order Items Table
create table public.retail_order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid references public.retail_orders(id) on delete cascade not null,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text not null,
  quantity         int not null default 1,
  price_at_time    numeric(10,2) not null,
  selected_color   text,
  created_at       timestamptz not null default now()
);

-- Triggers for updated_at
create trigger retail_orders_updated_at
  before update on public.retail_orders
  for each row execute procedure public.update_updated_at();

-- RLS
alter table public.retail_orders enable row level security;
alter table public.retail_order_items enable row level security;

-- Customers can insert their own orders (pending payment)
create policy "retail_orders_public_insert" on public.retail_orders for insert with check (true);
create policy "retail_order_items_public_insert" on public.retail_order_items for insert with check (true);

-- Admins can view and update everything
create policy "retail_orders_admin_all" on public.retail_orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "retail_order_items_admin_all" on public.retail_order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
