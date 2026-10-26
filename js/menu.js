/* Fetch kategori dan produk Supabase, filter pencarian client-side, dan render grid. */
(function () {
  'use strict';
  const client = window.joyinSupabase;
  const helpers = window.Joyin;
  const categoryFilter = document.getElementById('category-filter');
  const searchInput = document.getElementById('menu-search');
  const grid = document.getElementById('menu-products');
  const status = document.getElementById('menu-results-status');
  const empty = document.getElementById('menu-empty');
  const reset = document.getElementById('reset-menu-filter');
  if (!grid || !helpers) return;

  let products = [];
  let selectedCategory = 'all';
  let searchTerm = '';

  const escapeHTML = helpers.escapeHTML;
  const formatRupiah = helpers.formatRupiah;
  const safeImageUrl = helpers.safeImageUrl;

  function renderCard(product) {
    const image = safeImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80';
    const category = product.categories?.name || 'Joyin Picks';
    return `<article class="product-card"><div class="product-image-wrap"><img class="product-image" src="${escapeHTML(image)}" alt="${escapeHTML(product.name)}" loading="lazy"><span class="product-badge">${product.is_featured ? 'Joyin favorite' : escapeHTML(category)}</span></div><div class="product-content"><div class="product-meta"><span class="product-category">${escapeHTML(category)}</span><span class="product-price">${formatRupiah(product.price)}</span></div><h3 class="product-title">${escapeHTML(product.name)}</h3><p class="product-description">${escapeHTML(product.description || 'Teman manis untuk momen santaimu.')}</p><div class="product-foot"><span>${product.is_available ? 'Crafted with care' : 'Habis sementara'}</span><a href="contact.html#reservasi">Kunjungi kami ↗</a></div></div></article>`;
  }

  function drawCategories(categories) {
    if (!categoryFilter) return;
    const buttons = [{ name: 'Semua menu', slug: 'all' }, ...categories.map((category) => ({ name: category.name, slug: category.slug }))];
    categoryFilter.innerHTML = buttons.map((category) => `<button class="filter-chip${category.slug === selectedCategory ? ' active' : ''}" type="button" data-category="${escapeHTML(category.slug)}" aria-pressed="${category.slug === selectedCategory}">${escapeHTML(category.name)}</button>`).join('');
    categoryFilter.querySelectorAll('[data-category]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.category || 'all';
        categoryFilter.querySelectorAll('[data-category]').forEach((item) => {
          const active = item.dataset.category === selectedCategory;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        renderProducts();
      });
    });
  }

  function renderProducts() {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('id-ID');
    const filtered = products.filter((product) => {
      const categorySlug = product.categories?.slug || '';
      const categoryMatch = selectedCategory === 'all' || categorySlug === selectedCategory;
      const searchable = `${product.name || ''} ${product.description || ''} ${product.categories?.name || ''}`.toLocaleLowerCase('id-ID');
      return categoryMatch && searchable.includes(normalizedSearch);
    });
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = filtered.map(renderCard).join('');
    if (status) status.textContent = `${filtered.length} menu ditemukan`;
    if (empty) empty.hidden = filtered.length !== 0;
  }

  async function init() {
    if (!client) {
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = '<div class="loading-card"><p>Supabase belum dikonfigurasi, jadi data menu belum dapat diambil.</p><a class="text-link" href="README.md">Baca panduan setup <span aria-hidden="true">→</span></a></div>';
      if (status) status.textContent = 'Menunggu konfigurasi Supabase';
      if (categoryFilter) categoryFilter.innerHTML = '<button class="filter-chip active" type="button" data-category="all" aria-pressed="true">Semua menu</button>';
      return;
    }
    const [categoryResult, productResult] = await Promise.all([
      client.from('categories').select('id,name,slug').order('name'),
      client.from('products').select('id,name,description,price,image_url,is_available,is_featured,created_at,categories(name,slug)').eq('is_available', true).order('created_at', { ascending: false })
    ]);
    grid.setAttribute('aria-busy', 'false');
    if (categoryResult.error || productResult.error) {
      console.error('[Joyin] Gagal mengambil data menu:', categoryResult.error?.message, productResult.error?.message);
      grid.innerHTML = '<div class="loading-card"><p>Menu belum dapat dimuat. Pastikan schema SQL sudah dijalankan dan policy SELECT aktif.</p><button class="button button-outline" id="retry-menu-load" type="button">Coba lagi</button></div>';
      if (status) status.textContent = 'Terjadi kendala saat memuat menu';
      document.getElementById('retry-menu-load')?.addEventListener('click', init);
      return;
    }
    products = productResult.data || [];
    drawCategories(categoryResult.data || []);
    renderProducts();
    if (typeof client.channel === 'function') {
      client.channel('joyin-menu-products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => init())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => init())
        .subscribe((state) => { if (state === 'CHANNEL_ERROR') console.info('[Joyin] Realtime belum aktif; gunakan refresh halaman untuk data terbaru.'); });
    }
  }

  searchInput?.addEventListener('input', (event) => { searchTerm = event.target.value || ''; renderProducts(); });
  reset?.addEventListener('click', () => {
    selectedCategory = 'all'; searchTerm = '';
    if (searchInput) searchInput.value = '';
    if (categoryFilter) {
      categoryFilter.querySelectorAll('[data-category]').forEach((button) => {
        const active = button.dataset.category === 'all';
        button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
      });
    }
    renderProducts();
  });
  document.addEventListener('DOMContentLoaded', init);
})();
