# Joyin Cafe & Patisserie — Website

Website statis untuk Joyin Cafe and Patisserie di Jepara, dibuat menggunakan HTML5, CSS vanilla, JavaScript ES6+, dan Supabase PostgreSQL. Struktur ini dapat di-deploy di Vercel atau Netlify.

## Isi proyek

```text
joyin-cafe/
├── index.html
├── menu.html
├── about.html
├── contact.html
├── admin.html          # URL langsung, tidak ditautkan di navbar publik
├── css/
│   ├── style.css
│   ├── menu.css
│   └── responsive.css
├── js/
│   ├── site-config.js
│   ├── supabase.js
│   ├── main.js
│   ├── menu.js
│   └── contact.js
├── assets/
│   ├── images/
│   └── logo/joyin-mark.svg
├── sql/schema.sql
└── README.md
```

`admin.html` tersedia untuk dibuka langsung melalui `/admin.html`; tidak ada tombol admin di navbar publik. Dashboard memakai Supabase Auth dan tabel `joyin_admins`, sehingga hanya user yang didaftarkan yang bisa mengelola menu atau membaca pesan/reservasi. Menyembunyikan URL saja bukan pengamanan—RLS adalah pengaman sebenarnya.

## 1. Jalankan website secara lokal

1. Ekstrak folder proyek.
2. Buka folder menggunakan VS Code.
3. Jalankan melalui ekstensi **Live Server** atau server statis lokal. Jangan membuka HTML dengan `file://` jika ingin menguji semua alur formulir.
4. Sebelum konfigurasi Supabase diisi, halaman tetap dapat dibuka tetapi data dinamis dan pengiriman formulir akan menampilkan petunjuk konfigurasi.

## 2. Buat project Supabase

1. Buka [supabase.com](https://supabase.com/) dan buat project baru.
2. Tunggu database selesai dibuat.
3. Masuk ke **Project Settings → API** (atau bagian API keys pada dashboard versi terbaru).
4. Salin **Project URL** dan **anon/public/publishable key**. Nama label dapat berbeda sesuai versi dashboard.
5. Jangan gunakan `service_role` atau secret key pada kode browser. Kunci tersebut mempunyai akses istimewa dan harus tetap berada di server.

## 3. Buat tabel, policy, dan seed data

1. Buka **SQL Editor** pada project Supabase.
2. Salin seluruh isi `sql/schema.sql` ke query baru.
3. Jalankan query.
4. Periksa tabel `categories`, `products`, `reservations`, `contact_messages`, dan `testimonials` pada Table Editor.
5. `schema.sql` memasukkan 4 kategori dan 8 produk demo. Harga, deskripsi, dan nama produk tersebut hanya contoh—ganti dengan data resmi Joyin sebelum website dipublikasikan.

### RLS yang digunakan

- `categories` dan `products`: `SELECT` untuk `anon` dan `authenticated`.
- `reservations`: publik hanya boleh `INSERT` permintaan baru dengan status `pending`; tidak ada policy `SELECT` publik.
- `contact_messages`: publik hanya boleh `INSERT` pesan baru dengan `is_read = false`; tidak ada policy `SELECT` publik.
- `testimonials`: `SELECT` hanya untuk baris dengan `is_published = true`.

Kebijakan ini tidak membuat panel admin. Untuk mengelola produk, kategori, status reservasi, dan pesan, gunakan halaman `admin.html` setelah menyelesaikan langkah “Aktifkan dashboard admin” di bawah. Jangan membuka SELECT publik untuk pesan/reservasi hanya agar data muncul di frontend.

## 4. Aktifkan dashboard admin (penting)

1. Jalankan `sql/admin-setup.sql` di Supabase SQL Editor setelah `schema.sql`.
2. Di Supabase Dashboard, buka **Authentication → Users** lalu buat user admin menggunakan email dan password kuat. Matikan pendaftaran publik bila tidak diperlukan.
3. Salin UUID user admin dari daftar Users.
4. Di SQL Editor, jalankan query berikut dengan UUID asli (ganti teks placeholder):

```sql
insert into public.joyin_admins (user_id)
values ('UUID_USER_ADMIN_DARI_AUTHENTICATION')
on conflict do nothing;
```

5. Buka `https://domain-kamu/admin.html` secara manual. Login memakai email/password yang dibuat tadi.
6. Pastikan login dan CRUD berhasil. Akun Auth yang belum terdaftar di `joyin_admins` tidak akan mendapat akses admin meskipun berhasil login.

**Catatan:** jangan memasang link admin pada navbar publik jika ingin URL-nya tidak ditampilkan. `noindex` juga sudah ditambahkan, tetapi URL tersembunyi bukan pengganti autentikasi dan RLS.

## 5. Hubungkan Supabase

Buka `js/supabase.js` lalu ganti dua placeholder ini:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Dengan Project URL dan anon/public/publishable key milik project kamu. File dimuat setelah CDN Supabase JS v2.

**Catatan penting:** pada website statis, URL dan anon/public key memang dapat dilihat browser. Keamanan harus berasal dari RLS dan policy database; anon key bukan kata sandi. Jangan pernah menaruh `SERVICE_ROLE_KEY`, database password, token pribadi, atau secret lain di HTML/JavaScript frontend maupun repository publik.

## 6. Lengkapi informasi bisnis

Edit `js/site-config.js` sebelum deploy. Isi setidaknya:

- `address` dan `addressDetail` dengan alamat cabang yang benar.
- `hours` dan `hoursNote` dengan jam operasional terverifikasi.
- `phoneDisplay`, `phone`, `whatsapp`, dan `email` jika digunakan.
- `instagram`, `tiktok`, `mapQuery` (nama/alamat lokasi untuk peta sematan), dan `mapUrl` (tautan Google Maps untuk tombol petunjuk arah) dengan akun serta lokasi resmi.

Kontak dan jam buka tidak ditebak otomatis; nilai kosong sengaja ditampilkan sebagai petunjuk untuk dilengkapi. Peta menggunakan pencarian nama cafe dan Jepara. Perbarui query peta dengan alamat lengkap agar penunjuk lokasi lebih akurat.

## 7. Mengelola menu dan gambar

- Setelah dashboard admin diaktifkan, buka `/admin.html` lalu gunakan tab **Produk** atau **Kategori** untuk menambah/mengubah data tanpa menulis SQL manual.
- Dashboard menyimpan `category_id`, `name`, `description`, `price`, `image_url`, `is_available`, dan `is_featured` ke Supabase. Untuk gambar, unggah file ke Supabase Storage atau layanan gambar lalu tempelkan URL HTTPS-nya.
- Tandai maksimal beberapa produk dengan `is_featured = true` agar tampil di bagian “Menu Favorit”.
- `image_url` harus berupa URL gambar yang dapat diakses publik melalui HTTPS. Untuk gambar milik Joyin, unggah ke Supabase Storage, buat bucket/public URL yang sesuai, lalu masukkan URL-nya.
- Data menu dibaca saat halaman dibuka. Setelah menyimpan perubahan di dashboard, refresh halaman publik untuk melihat hasilnya.

## 8. Testimoni

Halaman depan hanya menampilkan data dari `testimonials` yang `is_published = true`. Belum ada testimoni demo yang dimasukkan, supaya tidak menampilkan ulasan palsu sebagai ulasan pelanggan nyata. Masukkan ulasan asli dengan izin pelanggan melalui dashboard Supabase; isi `name`, `rating` (1–5), `comment`, kemudian atur `is_published = true`.

## 9. Deploy ke Vercel

1. Push folder proyek ke GitHub.
2. Di [Vercel](https://vercel.com/), pilih **Add New → Project** dan impor repository.
3. Untuk proyek HTML/CSS/JS statis, framework preset **Other** dapat digunakan. Tidak perlu build command. Output directory biarkan root/default (`.` atau kosong sesuai pilihan dashboard).
4. Deploy. Semua file HTML berada di root sehingga URL `/`, `/menu.html`, `/about.html`, dan `/contact.html` tersedia.
5. Setelah deployment, buka semua halaman dan uji form menggunakan data tes.

## 10. Deploy ke Netlify

1. Push repository ke GitHub lalu impor di [Netlify](https://www.netlify.com/), atau drag-and-drop folder yang telah diekstrak.
2. Untuk situs statis ini, build command dapat dikosongkan dan publish directory diarahkan ke folder root proyek.
3. Deploy lalu uji navigasi, gambar, query Supabase, dan form.

## 11. Checklist sebelum publikasi

- [ ] URL dan anon key Supabase sudah diisi.
- [ ] SQL schema dan `sql/admin-setup.sql` berhasil dijalankan.
- [ ] User admin dibuat di Supabase Auth dan UUID-nya dimasukkan ke `joyin_admins`.
- [ ] URL `/admin.html` diuji dan tidak ditautkan di navbar publik.
- [ ] Nama, harga, deskripsi, dan foto produk demo diganti dengan data resmi.
- [ ] Alamat dan pin peta diperiksa.
- [ ] Jam buka dan semua tautan kontak/media sosial diverifikasi.
- [ ] Form reservasi dan pesan berhasil menyimpan data.
- [ ] Tidak ada service-role/secret key di frontend.
- [ ] RLS aktif untuk seluruh tabel dan tidak ada akses SELECT publik ke data reservasi/pesan.
- [ ] Untuk produksi, pertimbangkan CAPTCHA/rate limiting atau Supabase Edge Function untuk mengurangi spam dan validasi di server.
- [ ] Ganti foto stok di halaman dengan foto asli Joyin jika sudah tersedia dan cek izin penggunaan gambar.

## Catatan teknis

- Rupiah diformat menggunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- UI memakai semantic HTML, `alt` gambar, label form, `aria-label`, status live, navigasi hamburger, dan dukungan `prefers-reduced-motion`.
- Website menggunakan Google Fonts dan foto dari URL eksternal, jadi koneksi internet diperlukan untuk memuat font dan foto tersebut.
