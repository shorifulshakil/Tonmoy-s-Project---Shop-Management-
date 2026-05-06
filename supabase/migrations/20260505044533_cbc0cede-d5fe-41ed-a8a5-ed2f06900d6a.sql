
-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  size text not null,
  price numeric(10,2) not null check (price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Authenticated can view products"
  on public.products for select
  to authenticated using (true);

create policy "Authenticated can insert products"
  on public.products for insert
  to authenticated with check (auth.uid() = created_by);

create policy "Authenticated can update products"
  on public.products for update
  to authenticated using (true) with check (true);

create policy "Authenticated can delete products"
  on public.products for delete
  to authenticated using (true);

create index products_featured_idx on public.products(is_featured);
create index products_discount_idx on public.products(discount_percent);

-- SALES
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total numeric(12,2) not null,
  sale_date timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;

create policy "Authenticated can view sales"
  on public.sales for select
  to authenticated using (true);

create policy "Authenticated can insert sales"
  on public.sales for insert
  to authenticated with check (auth.uid() = recorded_by);

create policy "Authenticated can delete sales"
  on public.sales for delete
  to authenticated using (true);

create index sales_date_idx on public.sales(sale_date desc);
create index sales_product_idx on public.sales(product_id);

-- Auto decrement stock + check availability
create or replace function public.handle_new_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock integer;
begin
  select stock into current_stock from public.products where id = new.product_id for update;
  if current_stock is null then
    raise exception 'Product not found';
  end if;
  if current_stock < new.quantity then
    raise exception 'Insufficient stock (available: %)', current_stock;
  end if;
  update public.products
    set stock = stock - new.quantity, updated_at = now()
    where id = new.product_id;
  return new;
end;
$$;

create trigger sales_decrement_stock
  before insert on public.sales
  for each row execute function public.handle_new_sale();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();
