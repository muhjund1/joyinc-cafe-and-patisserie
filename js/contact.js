/* Form validasi dan penyimpanan reservasi/pesan ke Supabase. */
(function () {
  'use strict';
  const client = window.joyinSupabase;
  const helpers = window.Joyin;
  const reservationForm = document.getElementById('reservation-form');
  const contactForm = document.getElementById('contact-form');
  if (!helpers) return;

  const todayLocal = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const dateInput = document.getElementById('reservation-date');
  if (dateInput) { dateInput.min = todayLocal(); }

  function validateForm(form) {
    let valid = form.checkValidity();
    form.querySelectorAll('input,select,textarea').forEach((field) => {
      const isValid = field.checkValidity();
      field.setAttribute('aria-invalid', String(!isValid));
      if (!isValid) valid = false;
    });
    if (!valid) {
      form.reportValidity();
      const firstInvalid = form.querySelector(':invalid');
      firstInvalid?.focus();
    }
    return valid;
  }
  function clean(value) { return String(value || '').trim(); }
  function setSubmitting(form, busy, label) {
    const button = form.querySelector('button[type="submit"]');
    helpers.setBusy(button, busy, label);
  }

  reservationForm?.querySelectorAll('input,select,textarea').forEach((field) => {
    field.addEventListener('input', () => field.setAttribute('aria-invalid', String(!field.checkValidity())));
    field.addEventListener('change', () => field.setAttribute('aria-invalid', String(!field.checkValidity())));
  });
  contactForm?.querySelectorAll('input,select,textarea').forEach((field) => {
    field.addEventListener('input', () => field.setAttribute('aria-invalid', String(!field.checkValidity())));
  });

  reservationForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(reservationForm)) {
      helpers.showToast('Periksa kembali formulir', 'Pastikan nama, nomor HP, tanggal, waktu, dan jumlah tamu sudah benar.', 'error');
      return;
    }
    if (!client) {
      helpers.showToast('Supabase belum siap', 'Isi URL dan anon key di js/supabase.js, lalu jalankan sql/schema.sql.', 'error');
      return;
    }
    const data = new FormData(reservationForm);
    const selectedDate = clean(data.get('reservation_date'));
    if (selectedDate < todayLocal()) {
      dateInput?.setAttribute('aria-invalid', 'true');
      helpers.showToast('Tanggal tidak valid', 'Pilih hari ini atau tanggal setelahnya.', 'error');
      dateInput?.focus();
      return;
    }
    const payload = {
      name: clean(data.get('name')),
      phone: clean(data.get('phone')),
      email: clean(data.get('email')) || null,
      reservation_date: selectedDate,
      reservation_time: clean(data.get('reservation_time')),
      guests: Number(data.get('guests')),
      notes: clean(data.get('notes')) || null,
      status: 'pending'
    };
    if (!Number.isInteger(payload.guests) || payload.guests < 1 || payload.guests > 20) {
      helpers.showToast('Jumlah tamu tidak valid', 'Pilih jumlah tamu antara 1 dan 20 orang.', 'error');
      return;
    }
    setSubmitting(reservationForm, true, 'Mengirim permintaan…');
    const { error } = await client.from('reservations').insert([payload]);
    setSubmitting(reservationForm, false);
    if (error) {
      console.error('[Joyin] Reservasi gagal:', error.message);
      helpers.showToast('Reservasi belum terkirim', 'Periksa policy INSERT pada tabel reservations atau coba lagi nanti.', 'error');
      return;
    }
    reservationForm.reset();
    if (dateInput) dateInput.min = todayLocal();
    reservationForm.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    helpers.showToast('Permintaan terkirim!', 'Terima kasih. Permintaan reservasi berstatus pending sampai dikonfirmasi oleh Joyin.');
  });

  contactForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(contactForm)) {
      helpers.showToast('Periksa kembali pesanmu', 'Lengkapi nama, email, subjek, dan isi pesan dengan benar.', 'error');
      return;
    }
    if (!client) {
      helpers.showToast('Supabase belum siap', 'Isi URL dan anon key di js/supabase.js, lalu jalankan sql/schema.sql.', 'error');
      return;
    }
    const data = new FormData(contactForm);
    const payload = {
      name: clean(data.get('name')),
      email: clean(data.get('email')),
      subject: clean(data.get('subject')),
      message: clean(data.get('message')),
      is_read: false
    };
    setSubmitting(contactForm, true, 'Mengirim pesan…');
    const { error } = await client.from('contact_messages').insert([payload]);
    setSubmitting(contactForm, false);
    if (error) {
      console.error('[Joyin] Pesan gagal dikirim:', error.message);
      helpers.showToast('Pesan belum terkirim', 'Periksa policy INSERT pada tabel contact_messages atau coba lagi nanti.', 'error');
      return;
    }
    contactForm.reset();
    contactForm.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
    helpers.showToast('Pesan terkirim!', 'Terima kasih sudah menyapa Joyin. Pesanmu sudah kami terima.');
  });
})();
