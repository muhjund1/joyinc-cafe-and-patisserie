-- Joyin Cafe and Patisserie — skema Supabase PostgreSQL
-- Jalankan dari Supabase Dashboard → SQL Editor.
-- Kebijakan ini memberi akses publik terbatas: baca produk/kategori/testimoni terbit,
-- dan INSERT permintaan reservasi/pesan. Tidak ada akses SELECT publik untuk pesan pribadi.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  phone text not null check (char_length(trim(phone)) between 8 and 20),
  email text,
  reservation_date date not null,
  reservation_time time not null,
  guests integer not null check (guests between 1 and 20),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  email text not null check (char_length(trim(email)) between 3 and 254),
  subject text not null check (char_length(trim(subject)) between 3 and 150),
  message text not null check (char_length(trim(message)) between 5 and 3000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 5 and 1000),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Aktifkan RLS pada seluruh tabel publik.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reservations enable row level security;
alter table public.contact_messages enable row level security;
alter table public.testimonials enable row level security;

-- Hapus policies bernama sama agar skrip aman dijalankan kembali.
drop policy if exists "Categories are readable by everyone" on public.categories;
drop policy if exists "Products are readable by everyone" on public.products;
drop policy if exists "Public can request a reservation" on public.reservations;
drop policy if exists "Public can send a contact message" on public.contact_messages;
drop policy if exists "Published testimonials are public" on public.testimonials;

create policy "Categories are readable by everyone"
  on public.categories for select to anon, authenticated using (true);

create policy "Products are readable by everyone"
  on public.products for select to anon, authenticated using (true);

-- Pengunjung hanya dapat membuat reservasi baru berstatus pending.
-- Tidak ada policy SELECT untuk anon, jadi data reservasi tetap privat.
create policy "Public can request a reservation"
  on public.reservations for insert to anon, authenticated
  with check (status = 'pending' and guests between 1 and 20);

-- Pengunjung hanya dapat mengirim pesan baru yang belum dibaca.
-- Tidak ada policy SELECT untuk anon, sehingga pesan tidak bisa dibaca melalui API publik.
create policy "Public can send a contact message"
  on public.contact_messages for insert to anon, authenticated
  with check (is_read = false);

create policy "Published testimonials are public"
  on public.testimonials for select to anon, authenticated using (is_published = true);

-- Berikan hak dasar yang dibutuhkan browser. RLS tetap menjadi pengaman baris.
grant select on public.categories, public.products, public.testimonials to anon, authenticated;
grant insert on public.reservations, public.contact_messages to anon, authenticated;

-- Seed kategori (slug dipakai untuk filter menu).
insert into public.categories (name, slug) values
  ('Coffee', 'coffee'),
  ('Non-Coffee', 'non-coffee'),
  ('Pastry', 'pastry'),
  ('Cake', 'cake')
on conflict (slug) do nothing;

-- Data berikut adalah data DUMMY/demo. Ganti nama, deskripsi, harga, dan gambar dengan menu resmi.
insert into public.products (id, category_id, name, description, price, image_url, is_available, is_featured)
select seed.id::uuid, categories.id, seed.name, seed.description, seed.price, seed.image_url, true, seed.is_featured
from (values
  ('c1000000-0000-4000-8000-000000000001', 'coffee', 'Joyin Signature Latte', 'Espresso lembut berpadu susu creamy dengan sentuhan manis yang pas.', 28000::numeric, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000002', 'coffee', 'Iced Brown Sugar Latte', 'Kopi susu dingin dengan aroma gula aren dan es yang menyegarkan.', 26000::numeric, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000003', 'non-coffee', 'Matcha Cloud', 'Matcha dengan susu lembut untuk teman sore yang menenangkan.', 29000::numeric, 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000004', 'pastry', 'Butter Croissant', 'Croissant berlapis dengan tekstur renyah di luar dan lembut di dalam.', 22000::numeric, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000005', 'pastry', 'Chocolate Danish', 'Pastry flaky berisi cokelat untuk momen manis kapan saja.', 25000::numeric, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85', false),
  ('c1000000-0000-4000-8000-000000000006', 'cake', 'Strawberry Shortcake', 'Cake lembut berlapis krim dan stroberi dengan rasa yang ringan.', 38000::numeric, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000007', 'cake', 'Basque Burnt Cheesecake', 'Cheesecake creamy dengan bagian atas karamel yang khas.', 35000::numeric, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=85', true),
  ('c1000000-0000-4000-8000-000000000008', 'coffee', 'Americano', 'Espresso dan air dengan karakter kopi yang sederhana dan bersih.', 20000::numeric, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85', false)
) as seed(id, category_slug, name, description, price, image_url, is_featured)
join public.categories as categories on categories.slug = seed.category_slug
on conflict (id) do nothing;

-- Belum ada testimonial contoh agar website tidak menampilkan ulasan pelanggan fiktif.
-- Tambahkan ulasan asli dengan persetujuan pelanggan, lalu set is_published = true.

-- Catatan keamanan:
-- * Jangan membuat policy SELECT publik untuk reservations/contact_messages.
-- * Kelola data admin melalui Supabase Dashboard atau backend/admin terautentikasi.
-- * Untuk produksi, tambah rate limiting/CAPTCHA atau kirim form lewat Edge Function agar spam terkendali.
