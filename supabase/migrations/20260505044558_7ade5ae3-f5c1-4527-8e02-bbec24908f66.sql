
-- Tighten RLS to require an authenticated user id
drop policy "Authenticated can update products" on public.products;
drop policy "Authenticated can delete products" on public.products;
drop policy "Authenticated can delete sales" on public.sales;

create policy "Auth update products"
  on public.products for update
  to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Auth delete products"
  on public.products for delete
  to authenticated using (auth.uid() is not null);

create policy "Auth delete sales"
  on public.sales for delete
  to authenticated using (auth.uid() is not null);

-- Restrict EXECUTE on internal trigger functions
revoke execute on function public.handle_new_sale() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Set search_path on touch_updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
