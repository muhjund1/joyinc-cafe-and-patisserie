-- Jalankan SETELAH sql/schema.sql. Membatasi CRUD dashboard hanya ke user yang terdaftar di joyin_admins.
-- Langkah: buat user email/password di Supabase Dashboard > Authentication > Users, lalu salin UUID user.
-- Ganti UUID_DI_SINI dengan UUID user admin sebelum menjalankan bagian INSERT di bawah.

create table if not exists public.joyin_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.joyin_admins enable row level security;
revoke all on public.joyin_admins from anon, authenticated;
grant select on public.joyin_admins to authenticated;

create or replace function public.is_joyin_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.joyin_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_joyin_admin() from public;
grant execute on function public.is_joyin_admin() to authenticated;

-- Masukkan UUID user admin dari Authentication > Users:
-- insert into public.joyin_admins (user_id) values ('UUID_DI_SINI') on conflict do nothing;

-- Products: publik tetap boleh SELECT. Hanya admin terdaftar dapat INSERT/UPDATE/DELETE.
drop policy if exists "Joyin admins can insert products" on public.products;
drop policy if exists "Joyin admins can update products" on public.products;
drop policy if exists "Joyin admins can delete products" on public.products;
create policy "Joyin admins can insert products" on public.products for insert to authenticated with check (public.is_joyin_admin());
create policy "Joyin admins can update products" on public.products for update to authenticated using (public.is_joyin_admin()) with check (public.is_joyin_admin());
create policy "Joyin admins can delete products" on public.products for delete to authenticated using (public.is_joyin_admin());

-- Categories: publik tetap boleh SELECT. Hanya admin terdaftar dapat mengubah.
drop policy if exists "Joyin admins can insert categories" on public.categories;
drop policy if exists "Joyin admins can update categories" on public.categories;
drop policy if exists "Joyin admins can delete categories" on public.categories;
create policy "Joyin admins can insert categories" on public.categories for insert to authenticated with check (public.is_joyin_admin());
create policy "Joyin admins can update categories" on public.categories for update to authenticated using (public.is_joyin_admin()) with check (public.is_joyin_admin());
create policy "Joyin admins can delete categories" on public.categories for delete to authenticated using (public.is_joyin_admin());

-- Data pelanggan: hanya admin terdaftar dapat membaca/memperbarui reservasi dan pesan.
drop policy if exists "Joyin admins can read reservations" on public.reservations;
drop policy if exists "Joyin admins can update reservations" on public.reservations;
drop policy if exists "Joyin admins can read contact messages" on public.contact_messages;
drop policy if exists "Joyin admins can update contact messages" on public.contact_messages;
create policy "Joyin admins can read reservations" on public.reservations for select to authenticated using (public.is_joyin_admin());
create policy "Joyin admins can update reservations" on public.reservations for update to authenticated using (public.is_joyin_admin()) with check (public.is_joyin_admin());
create policy "Joyin admins can read contact messages" on public.contact_messages for select to authenticated using (public.is_joyin_admin());
create policy "Joyin admins can update contact messages" on public.contact_messages for update to authenticated using (public.is_joyin_admin()) with check (public.is_joyin_admin());

-- Testimoni: admin terdaftar dapat mengelola; publik hanya membaca yang diterbitkan.
drop policy if exists "Joyin admins can insert testimonials" on public.testimonials;
drop policy if exists "Joyin admins can update testimonials" on public.testimonials;
drop policy if exists "Joyin admins can delete testimonials" on public.testimonials;
create policy "Joyin admins can insert testimonials" on public.testimonials for insert to authenticated with check (public.is_joyin_admin());
create policy "Joyin admins can update testimonials" on public.testimonials for update to authenticated using (public.is_joyin_admin()) with check (public.is_joyin_admin());
create policy "Joyin admins can delete testimonials" on public.testimonials for delete to authenticated using (public.is_joyin_admin());

grant insert, update, delete on public.products, public.categories, public.testimonials to authenticated;
grant select, update on public.reservations, public.contact_messages to authenticated;
