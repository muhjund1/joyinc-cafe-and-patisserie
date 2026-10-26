/* Script global Joyin: navigasi, detail cafe, animasi, data home, dan toast. */
(function () {
  'use strict';
  const site = window.JOYIN_SITE || {};
  const client = window.joyinSupabase;

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeImageUrl = (value) => {
    if (!value) return '';
    try {
      const parsed = new URL(value, window.location.href);
      return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { return ''; }
  };
  const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

  function showToast(title, message, type = 'success') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    const icon = type === 'error' ? '!' : '✓';
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p></div>`;
    region.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 220);
    }, 4800);
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.originalLabel = button.querySelector('.button-label')?.textContent || button.textContent.trim();
      button.disabled = true;
      const label = button.querySelector('.button-label');
      if (label) label.textContent = busyLabel || 'Memproses…';
      button.setAttribute('aria-busy', 'true');
    } else {
      button.disabled = false;
      const label = button.querySelector('.button-label');
      if (label && button.dataset.originalLabel) label.textContent = button.dataset.originalLabel;
      button.removeAttribute('aria-busy');
    }
  }

  window.Joyin = { client, escapeHTML, safeImageUrl, formatRupiah, showToast, setBusy };

  function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.primary-nav');
    const header = document.querySelector('.site-header');
    if (!toggle || !nav) return;
    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu navigasi');
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
    };
    toggle.addEventListener('click', () => {
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(willOpen));
      toggle.setAttribute('aria-label', willOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');
      nav.classList.toggle('is-open', willOpen);
      document.body.classList.toggle('nav-open', willOpen);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    document.addEventListener('click', (event) => {
      if (nav.classList.contains('is-open') && !nav.contains(event.target) && !toggle.contains(event.target)) close();
    });
    const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    elements.forEach((element) => observer.observe(element));
  }

  function renderSiteDetails() {
    const putText = (id, value) => { const element = document.getElementById(id); if (element && value) element.textContent = value; };
    const putLink = (id, value, label, prefix = '') => {
      const element = document.getElementById(id);
      if (!element) return;
      if (value) { element.href = `${prefix}${value}`; if (label) element.textContent = label; element.classList.remove('is-placeholder'); }
      else { element.href = 'contact.html'; if (label) element.textContent = label; }
    };
    putText('site-address-short', site.city || 'Jepara, Jawa Tengah');
    putText('site-address-note', site.addressDetail || 'Tambahkan alamat lengkap di konfigurasi situs.');
    putText('site-hours-short', site.hours || 'Tambahkan jam buka resmi');
    putText('site-hours-note', site.hoursNote || 'Konfirmasi jam buka sebelum berkunjung.');
    putText('footer-location', site.city || 'Jepara, Jawa Tengah');
    putText('contact-address-title', site.city || 'Jepara, Jawa Tengah');
    putText('contact-address-detail', site.addressDetail || 'Tambahkan alamat lengkap di konfigurasi situs.');
    putText('contact-hours-title', site.hours || 'Tambahkan jam buka resmi');
    putText('contact-hours-detail', site.hoursNote || 'Konfirmasi jam buka sebelum berkunjung.');
    const mapQuery = site.mapQuery || 'Joyin Cafe and Patisserie, Jepara, Jawa Tengah';
    const mapUrl = site.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    ['site-map-link', 'contact-map-link'].forEach((id) => { const element = document.getElementById(id); if (element) element.href = mapUrl; });
    const iframe = document.getElementById('joyin-map');
    if (iframe) iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=13&output=embed`;
    const directNote = document.getElementById('contact-direct-note');
    const contactButtons = document.getElementById('contact-social-buttons');
    if (directNote) {
      const ways = [];
      if (site.phoneDisplay || site.phone) ways.push(`Telepon: ${site.phoneDisplay || site.phone}`);
      if (site.email) ways.push(`Email: ${site.email}`);
      directNote.textContent = ways.length ? ways.join(' · ') : 'Lengkapi nomor telepon, email, dan media sosial di js/site-config.js.';
    }
    if (contactButtons && site.whatsapp) {
      contactButtons.innerHTML = `<a class="text-link" href="https://wa.me/${encodeURIComponent(site.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer">Chat WhatsApp <span aria-hidden="true">↗</span></a>`;
      if (site.instagram) contactButtons.insertAdjacentHTML('beforeend', ` <a class="text-link" href="${escapeHTML(site.instagram)}" target="_blank" rel="noopener noreferrer">Instagram <span aria-hidden="true">↗</span></a>`);
    }
    putLink('footer-phone', site.phone, site.phoneDisplay || (site.phone ? site.phoneDisplay || site.phone : 'Info kontak'), 'tel:');
    putLink('footer-email', site.email, site.email ? 'Kirim email' : 'Kirim pesan', 'mailto:');
    const socials = document.getElementById('social-links');
    if (socials) {
      socials.innerHTML = '';
      if (site.instagram) socials.insertAdjacentHTML('beforeend', `<a href="${escapeHTML(site.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram Joyin"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"></circle></svg></a>`);
      if (site.tiktok) socials.insertAdjacentHTML('beforeend', `<a href="${escapeHTML(site.tiktok)}" target="_blank" rel="noopener noreferrer" aria-label="TikTok Joyin"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 7.2a6.8 6.8 0 0 1-4.2-1.5v8.1a6.1 6.1 0 1 1-5.3-6.1v3.5a2.7 2.7 0 1 0 1.9 2.6V2h3.4c.2 2 1.8 3.6 4.2 3.8v1.4Z"></path></svg></a>`);
      if (site.whatsapp) socials.insertAdjacentHTML('beforeend', `<a href="https://wa.me/${encodeURIComponent(site.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Joyin"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2a9.8 9.8 0 0 0-8.42 14.82L2.3 22l5.34-1.4A9.9 9.9 0 1 0 12.04 2Zm0 17.9a8.1 8.1 0 0 1-4.12-1.12l-.3-.18-3.17.83.85-3.09-.2-.32a8.1 8.1 0 1 1 6.94 3.88Zm4.45-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.1.24-.28.36-.41.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.58.25 1.04.4 1.4.51.59.19 1.12.16 1.55.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"></path></svg></a>`);
      if (!site.instagram && !site.tiktok && !site.whatsapp) socials.innerHTML = '<span class="social-placeholder">Tambahkan tautan sosial di konfigurasi situs.</span>';
    }
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach((element) => { element.textContent = String(year); });
  }

  function productCard(product) {
    const image = safeImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80';
    const category = product.categories?.name || product.category_name || 'Joyin Picks';
    const isFeatured = Boolean(product.is_featured);
    const status = product.is_available === false ? 'Habis sementara' : 'Crafted with care';
    return `<article class="product-card"><div class="product-image-wrap"><img class="product-image" src="${escapeHTML(image)}" alt="${escapeHTML(product.name || 'Menu Joyin')}" loading="lazy"><span class="product-badge">${isFeatured ? 'Joyin favorite' : escapeHTML(category)}</span></div><div class="product-content"><div class="product-meta"><span class="product-category">${escapeHTML(category)}</span><span class="product-price">${formatRupiah(product.price)}</span></div><h3 class="product-title">${escapeHTML(product.name || 'Menu Joyin')}</h3><p class="product-description">${escapeHTML(product.description || 'Teman manis untuk momen santaimu.')}</p><div class="product-foot"><span>${escapeHTML(status)}</span><a href="contact.html#reservasi">Pesan meja ↗</a></div></div></article>`;
  }

  async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    const note = document.getElementById('featured-note');
    if (!container) return;
    if (!client) {
      container.setAttribute('aria-busy', 'false');
      container.innerHTML = '<div class="loading-card"><span class="empty-icon" aria-hidden="true">✳</span><p>Menu favorit akan tampil setelah Supabase dikonfigurasi.</p><a class="text-link" href="menu.html">Lihat halaman menu <span aria-hidden="true">→</span></a></div>';
      if (note) { note.hidden = false; note.textContent = 'Langkah awal: isi URL dan anon key Supabase di js/supabase.js, lalu jalankan sql/schema.sql.'; }
      return;
    }
    const { data, error } = await client.from('products').select('id,name,description,price,image_url,is_available,is_featured,created_at,categories(name,slug)').eq('is_available', true).eq('is_featured', true).order('created_at', { ascending: false }).limit(6);
    container.setAttribute('aria-busy', 'false');
    if (error) {
      console.error('[Joyin] Tidak bisa mengambil menu favorit:', error.message);
      container.innerHTML = '<div class="loading-card"><p>Menu belum dapat dimuat. Periksa konfigurasi Supabase dan RLS.</p><a class="text-link" href="menu.html">Coba buka menu <span aria-hidden="true">→</span></a></div>';
      return;
    }
    if (!data?.length) {
      container.innerHTML = '<div class="loading-card"><p>Belum ada menu favorit yang ditandai.</p><a class="text-link" href="menu.html">Jelajahi semua menu <span aria-hidden="true">→</span></a></div>';
      return;
    }
    container.innerHTML = data.map(productCard).join('');
    if (note) { note.hidden = false; note.textContent = 'Harga dan gambar mengikuti data produk yang tersimpan di Supabase.'; }
  }

  async function loadTestimonials() {
    const content = document.getElementById('testimonial-content');
    const count = document.getElementById('testimonial-count');
    const prev = document.getElementById('testimonial-prev');
    const next = document.getElementById('testimonial-next');
    if (!content || !client) return;
    const { data, error } = await client.from('testimonials').select('id,name,rating,comment').eq('is_published', true).order('created_at', { ascending: false }).limit(12);
    if (error) { console.warn('[Joyin] Testimoni belum bisa dimuat:', error.message); return; }
    if (!data?.length) return;
    let current = 0;
    const draw = () => {
      const item = data[current];
      const stars = '★'.repeat(Math.max(1, Math.min(5, Number(item.rating) || 5)));
      content.innerHTML = `<p class="testimonial-quote">“${escapeHTML(item.comment)}”</p><div class="testimonial-person"><span class="testimonial-avatar" aria-hidden="true">${escapeHTML((item.name || 'J').trim().charAt(0).toUpperCase())}</span><div><strong>${escapeHTML(item.name || 'Joyin Guest')}</strong><small>${stars} · Joyin guest</small></div></div>`;
      if (count) count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(data.length).padStart(2, '0')}`;
      if (prev) prev.disabled = data.length < 2;
      if (next) next.disabled = data.length < 2;
    };
    prev?.addEventListener('click', () => { current = (current - 1 + data.length) % data.length; draw(); });
    next?.addEventListener('click', () => { current = (current + 1) % data.length; draw(); });
    draw();
  }

  function subscribeFeaturedChanges() {
    if (!client || !document.getElementById('featured-products') || typeof client.channel !== 'function') return;
    client.channel('joyin-featured-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadFeaturedProducts())
      .subscribe((status) => { if (status === 'CHANNEL_ERROR') console.info('[Joyin] Realtime belum aktif; data tetap dimuat saat halaman dibuka.'); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initReveal();
    renderSiteDetails();
    loadFeaturedProducts();
    loadTestimonials();
    subscribeFeaturedChanges();
  });
})();
