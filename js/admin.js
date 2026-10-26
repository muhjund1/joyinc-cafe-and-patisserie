/* Dashboard admin: akses data dibatasi oleh RLS di Supabase, bukan sekadar halaman login. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $('#login-panel');
  const dashboardPanel = $('#dashboard-panel');
  const loginForm = $('#login-form');
  const loginFeedback = $('#login-feedback');
  const dashboardFeedback = $('#dashboard-feedback');
  const toast = $('#admin-toast');
  const state = { products: [], categories: [], activeTab: 'products' };
  const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const client = () => window.joyinSupabase;
  let toastTimer;
  function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3200); }
  function feedback(message = '') { dashboardFeedback.textContent = message; }
  function requireClient() {
    if (!window.JOYIN_SUPABASE_CONFIGURED || !client()) {
      loginFeedback.textContent = 'Supabase belum dikonfigurasi. Isi URL dan anon/publishable key di js/supabase.js.';
      loginForm.querySelector('button[type="submit"]').disabled = true;
      return false;
    }
    return true;
  }
  function showLogin() { loginPanel.hidden = false; dashboardPanel.hidden = true; }
  function showDashboard(user) { loginPanel.hidden = true; dashboardPanel.hidden = false; $('#admin-email').textContent = user?.email || 'Admin'; }
  async function checkSession() {
    if (!requireClient()) return;
    const { data: { session }, error } = await client().auth.getSession();
    if (error || !session) { showLogin(); return; }
    showDashboard(session.user);
    await loadProducts();
    await loadCategories();
  }
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!requireClient()) return;
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Memeriksa...'; loginFeedback.textContent = '';
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    button.disabled = false; button.innerHTML = 'Masuk dashboard <span aria-hidden="true">→</span>';
    if (error) { loginFeedback.textContent = 'Login gagal. Periksa email/password dan pastikan akun ini diizinkan sebagai admin.'; return; }
    showDashboard(data.user); notify('Berhasil masuk.'); await loadProducts(); await loadCategories();
  });
  $('#logout-button').addEventListener('click', async () => { await client().auth.signOut(); showLogin(); notify('Kamu sudah keluar.'); });

  document.querySelectorAll('.admin-tab').forEach((button) => button.addEventListener('click', async () => {
    state.activeTab = button.dataset.tab;
    document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.toggle('is-active', tab === button));
    document.querySelectorAll('.admin-section').forEach((section) => section.classList.toggle('is-active', section.id === `tab-${state.activeTab}`));
    feedback('');
    if (state.activeTab === 'products') await loadProducts();
    if (state.activeTab === 'categories') await loadCategories();
    if (state.activeTab === 'reservations') await loadReservations();
    if (state.activeTab === 'messages') await loadMessages();
  }));
  document.querySelectorAll('[data-refresh]').forEach((button) => button.addEventListener('click', () => button.dataset.refresh === 'reservations' ? loadReservations() : loadMessages()));

  async function loadProducts() {
    const target = $('#products-list'); target.innerHTML = '<p class="muted" style="padding:18px">Memuat produk...</p>';
    const { data, error } = await client().from('products').select('id,name,description,price,image_url,is_available,is_featured,category_id,categories(name)').order('created_at', { ascending: false });
    if (error) { target.innerHTML = '<p class="muted" style="padding:18px">Produk tidak dapat dimuat. Pastikan SQL admin-setup.sql sudah dijalankan dan akun memiliki akses admin.</p>'; feedback(error.message); return; }
    state.products = data || [];
    if (!state.products.length) { target.innerHTML = '<p class="muted" style="padding:18px">Belum ada produk. Klik “Tambah produk” untuk mulai.</p>'; return; }
    target.innerHTML = `<table class="admin-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.products.map((product) => `<tr><td><div class="admin-product">${product.image_url ? `<img src="${escapeHTML(product.image_url)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="brand-mark">J</div>'}<div><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.description || 'Tanpa deskripsi')}</small></div></div></td><td>${escapeHTML(product.categories?.name || '—')}</td><td>${rupiah.format(Number(product.price) || 0)}</td><td><span class="status-pill ${product.is_available ? '' : 'is-off'}">${product.is_available ? 'Tersedia' : 'Habis'}${product.is_featured ? ' · Favorit' : ''}</span></td><td><div class="table-actions"><button class="text-button" data-edit-product="${product.id}" type="button">Edit</button><button class="text-button danger" data-delete-product="${product.id}" type="button">Hapus</button></div></td></tr>`).join('')}</tbody></table>`;
    target.querySelectorAll('[data-edit-product]').forEach((button) => button.addEventListener('click', () => editProduct(button.dataset.editProduct)));
    target.querySelectorAll('[data-delete-product]').forEach((button) => button.addEventListener('click', () => deleteProduct(button.dataset.deleteProduct)));
  }
  async function loadCategories() {
    const { data, error } = await client().from('categories').select('id,name,slug,created_at').order('name');
    if (error) { $('#categories-list').innerHTML = '<p class="muted" style="padding:18px">Kategori gagal dimuat. Periksa policy admin.</p>'; feedback(error.message); return; }
    state.categories = data || [];
    $('#product-category').innerHTML = state.categories.map((category) => `<option value="${category.id}">${escapeHTML(category.name)}</option>`).join('');
    $('#categories-list').innerHTML = state.categories.length ? `<table class="admin-table"><thead><tr><th>Nama</th><th>Slug</th><th>Aksi</th></tr></thead><tbody>${state.categories.map((category) => `<tr><td><strong>${escapeHTML(category.name)}</strong></td><td>${escapeHTML(category.slug)}</td><td><button type="button" class="text-button danger" data-delete-category="${category.id}">Hapus</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="padding:18px">Belum ada kategori.</p>';
    $('#categories-list').querySelectorAll('[data-delete-category]').forEach((button) => button.addEventListener('click', () => deleteCategory(button.dataset.deleteCategory)));
  }
  const productForm = $('#product-form');
  function openProductForm(product = null) {
    if (!state.categories.length) { notify('Tambahkan kategori terlebih dahulu.'); state.activeTab = 'categories'; document.querySelector('[data-tab="categories"]').click(); return; }
    productForm.hidden = false; productForm.reset(); $('#product-id').value = product?.id || '';
    $('#product-form-title').textContent = product ? 'Edit produk' : 'Tambah produk baru';
    $('#product-name').value = product?.name || ''; $('#product-category').value = product?.category_id || state.categories[0].id;
    $('#product-price').value = product?.price ?? ''; $('#product-image').value = product?.image_url || ''; $('#product-description').value = product?.description || '';
    $('#product-available').checked = product ? product.is_available : true; $('#product-featured').checked = product ? product.is_featured : false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeProductForm() { productForm.hidden = true; productForm.reset(); $('#product-id').value = ''; }
  $('#add-product-button').addEventListener('click', () => openProductForm());
  $('#cancel-product-button').addEventListener('click', closeProductForm); $('#cancel-product-button-2').addEventListener('click', closeProductForm);
  function editProduct(id) { const product = state.products.find((item) => item.id === id); if (product) openProductForm(product); }
  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('#product-id').value;
    const payload = { name: $('#product-name').value.trim(), category_id: $('#product-category').value, price: Number($('#product-price').value), image_url: $('#product-image').value.trim() || null, description: $('#product-description').value.trim(), is_available: $('#product-available').checked, is_featured: $('#product-featured').checked };
    if (!payload.name || !payload.category_id || !Number.isFinite(payload.price) || payload.price < 0) { notify('Periksa kembali nama, kategori, dan harga produk.'); return; }
    const button = productForm.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Menyimpan...';
    const result = id ? await client().from('products').update(payload).eq('id', id) : await client().from('products').insert(payload);
    button.disabled = false; button.textContent = 'Simpan produk';
    if (result.error) { notify('Gagal menyimpan produk. Periksa policy admin.'); feedback(result.error.message); return; }
    closeProductForm(); notify(id ? 'Produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.'); await loadProducts();
  });
  async function deleteProduct(id) {
    const product = state.products.find((item) => item.id === id);
    if (!product || !confirm(`Hapus produk “${product.name}”? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await client().from('products').delete().eq('id', id);
    if (error) { notify('Produk gagal dihapus.'); feedback(error.message); return; }
    notify('Produk dihapus.'); await loadProducts();
  }
  $('#category-name').addEventListener('input', () => { if (!$('#category-slug').dataset.edited) $('#category-slug').value = slugify($('#category-name').value); });
  $('#category-slug').addEventListener('input', () => { $('#category-slug').dataset.edited = 'true'; });
  function slugify(value) { return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  $('#category-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const name = $('#category-name').value.trim(); const slug = slugify($('#category-slug').value);
    if (!name || !slug) return;
    const { error } = await client().from('categories').insert({ name, slug });
    if (error) { notify('Kategori gagal ditambahkan. Slug mungkin sudah digunakan.'); feedback(error.message); return; }
    event.target.reset(); $('#category-slug').dataset.edited = ''; notify('Kategori ditambahkan.'); await loadCategories();
  });
  async function deleteCategory(id) {
    const category = state.categories.find((item) => item.id === id);
    if (!category || !confirm(`Hapus kategori “${category.name}”? Produk terkait akan menjadi tanpa kategori.`)) return;
    const { error } = await client().from('categories').delete().eq('id', id);
    if (error) { notify('Kategori gagal dihapus.'); feedback(error.message); return; }
    notify('Kategori dihapus.'); await loadCategories(); await loadProducts();
  }
  async function loadReservations() {
    const target = $('#reservations-list'); target.innerHTML = '<p class="muted" style="padding:18px">Memuat reservasi...</p>';
    const { data, error } = await client().from('reservations').select('id,name,phone,email,reservation_date,reservation_time,guests,notes,status,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) { target.innerHTML = '<p class="muted" style="padding:18px">Reservasi tidak dapat dimuat. Pastikan policy admin sudah aktif.</p>'; feedback(error.message); return; }
    target.innerHTML = !data?.length ? '<p class="muted" style="padding:18px">Belum ada reservasi masuk.</p>' : `<table class="admin-table"><thead><tr><th>Nama / Kontak</th><th>Jadwal</th><th>Tamu</th><th>Catatan</th><th>Status</th></tr></thead><tbody>${data.map((r) => `<tr><td><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.phone)}${r.email ? '<br>'+escapeHTML(r.email) : ''}</small></td><td>${escapeHTML(r.reservation_date)}<br>${escapeHTML(String(r.reservation_time).slice(0,5))}</td><td>${r.guests}</td><td>${escapeHTML(r.notes || '—')}</td><td><select aria-label="Status reservasi ${escapeHTML(r.name)}" data-reservation-status="${r.id}"><option value="pending" ${r.status==='pending'?'selected':''}>Pending</option><option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option><option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option></select></td></tr>`).join('')}</tbody></table>`;
    target.querySelectorAll('[data-reservation-status]').forEach((select) => select.addEventListener('change', async () => { const { error: updateError } = await client().from('reservations').update({ status: select.value }).eq('id', select.dataset.reservationStatus); if (updateError) { notify('Status gagal diperbarui.'); feedback(updateError.message); } else notify('Status reservasi diperbarui.'); }));
  }
  async function loadMessages() {
    const target = $('#messages-list'); target.innerHTML = '<p class="muted" style="padding:18px">Memuat pesan...</p>';
    const { data, error } = await client().from('contact_messages').select('id,name,email,subject,message,is_read,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) { target.innerHTML = '<p class="muted" style="padding:18px">Pesan tidak dapat dimuat. Pastikan policy admin sudah aktif.</p>'; feedback(error.message); return; }
    target.innerHTML = !data?.length ? '<p class="muted" style="padding:18px">Belum ada pesan masuk.</p>' : `<table class="admin-table"><thead><tr><th>Pengirim</th><th>Subjek / Pesan</th><th>Diterima</th><th>Status</th></tr></thead><tbody>${data.map((m) => `<tr><td><strong>${escapeHTML(m.name)}</strong><small>${escapeHTML(m.email)}</small></td><td><strong>${escapeHTML(m.subject)}</strong><small>${escapeHTML(m.message)}</small></td><td>${new Date(m.created_at).toLocaleString('id-ID')}</td><td><label class="admin-check"><input type="checkbox" data-message-read="${m.id}" ${m.is_read?'checked':''}> Sudah dibaca</label></td></tr>`).join('')}</tbody></table>`;
    target.querySelectorAll('[data-message-read]').forEach((checkbox) => checkbox.addEventListener('change', async () => { const { error: updateError } = await client().from('contact_messages').update({ is_read: checkbox.checked }).eq('id', checkbox.dataset.messageRead); if (updateError) { notify('Status pesan gagal diperbarui.'); feedback(updateError.message); } else notify('Status pesan diperbarui.'); }));
  }
  checkSession();
})();
