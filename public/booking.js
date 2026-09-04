document.addEventListener('DOMContentLoaded', async () => {
    const api = (url, options = {}) => fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
        .then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || 'Request failed'); return data; });
    let currentUser;
    try { currentUser = (await api('/api/auth/me')).user; } catch (_) { window.location.href = 'index.html'; return; }
    const userAvatar = document.getElementById('user-avatar'); if (userAvatar) userAvatar.textContent = (currentUser.full_name || currentUser.username).charAt(0).toUpperCase();
    const nameDisplay = document.getElementById('user-name-display'); if (nameDisplay) nameDisplay.textContent = currentUser.full_name || currentUser.username;
    window.logout = async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {} window.location.href = 'index.html'; };
    window.toggleDropdown = e => { e.stopPropagation(); document.getElementById('user-dropdown')?.classList.toggle('active'); };
    window.openContactModal = () => { const m = document.getElementById('contact-modal'); if (m) m.style.display = 'block'; };
    window.closeContactModal = () => { const m = document.getElementById('contact-modal'); if (m) m.style.display = 'none'; };
    const phoneInput = document.getElementById('phone_number');
    const iti = phoneInput && window.intlTelInput ? window.intlTelInput(phoneInput, { utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@21.2.7/build/js/utils.js', initialCountry: 'auto', countrySearch: true }) : null;
    const carId = new URLSearchParams(window.location.search).get('id');
    if (!/^\d+$/.test(carId || '')) { window.location.href = 'index.html'; return; }
    const carPreview = document.getElementById('car-preview-content');
    const pickupInput = document.getElementById('pickup_date');
    const returnInput = document.getElementById('return_date');
    const totalPrice = document.getElementById('total-price');
    const form = document.getElementById('booking-form');
    const payment = document.getElementById('payment_method');
    const confirm = document.getElementById('confirm-btn');
    let car;
    try { car = await api(`/api/cars/${carId}`); } catch (err) { carPreview.textContent = err.message; return; }
    const image = document.createElement('img'); image.className = 'car-image'; image.src = car.image_url; image.alt = car.name;
    const title = document.createElement('h3'); title.className = 'car-name'; title.textContent = car.name;
    const category = document.createElement('p'); category.textContent = car.category; category.style.cssText = 'color: var(--text-muted); text-transform: uppercase; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.5rem;';
    const rate = document.createElement('div'); rate.className = 'car-price'; rate.textContent = `$${Number(car.price_per_day).toFixed(2)}/day`; rate.style.textAlign = 'left';
    carPreview.replaceChildren(image, title, category, rate); document.getElementById('live-summary').style.display = 'block';
    const today = new Date().toISOString().slice(0, 10); pickupInput.min = today; returnInput.min = today;
    function calculatePrice() {
        if (!pickupInput.value || !returnInput.value) { totalPrice.textContent = '$0.00'; return; }
        const start = new Date(`${pickupInput.value}T00:00:00Z`); const end = new Date(`${returnInput.value}T00:00:00Z`);
        const days = Math.floor((end - start) / 86400000) + 1;
        totalPrice.textContent = end >= start && days <= 30 ? `$${(days * car.price_per_day).toFixed(2)} (${days} days)` : '$0.00';
    }
    function validate() {
        const validDates = pickupInput.value && returnInput.value && returnInput.value >= pickupInput.value;
        const fields = document.getElementById('province').value && document.getElementById('landmark').value.trim() && phoneInput.value.trim() && payment.value;
        confirm.disabled = !(validDates && fields);
    }
    pickupInput.addEventListener('change', () => { returnInput.min = pickupInput.value; if (returnInput.value < pickupInput.value) returnInput.value = pickupInput.value; calculatePrice(); validate(); });
    [returnInput, phoneInput, document.getElementById('province'), document.getElementById('landmark')].forEach(el => el.addEventListener('input', () => { calculatePrice(); validate(); }));
    payment.addEventListener('change', () => { document.getElementById('summary-payment').textContent = payment.value || 'None'; document.getElementById('credit-card-info').classList.toggle('hidden', payment.value !== 'Credit Card'); document.getElementById('pay-at-pickup-msg').classList.toggle('hidden', payment.value !== 'Pay at Pickup'); validate(); });
    form.addEventListener('submit', async e => {
        e.preventDefault(); confirm.disabled = true; document.getElementById('btn-text').textContent = 'Confirming...'; document.getElementById('btn-spinner').classList.remove('hidden');
        const msg = document.getElementById('form-message'); msg.classList.add('hidden');
        try {
            const phone = iti ? iti.getNumber() : phoneInput.value.trim();
            const data = await api('/api/bookings', { method: 'POST', body: JSON.stringify({ car_id: Number(carId), pickup_date: pickupInput.value, return_date: returnInput.value, province: document.getElementById('province').value, landmark: document.getElementById('landmark').value.trim(), phone_number: phone, payment_method: payment.value }) });
            document.getElementById('checkmark-overlay')?.classList.add('active'); form.classList.add('hidden'); document.getElementById('success-booking-id').textContent = `Booking Reference: #ER-${String(data.booking.id).padStart(4, '0')}`; document.getElementById('success-state').classList.remove('hidden');
        } catch (err) { msg.textContent = err.message; msg.classList.remove('hidden'); confirm.disabled = false; } finally { document.getElementById('btn-text').textContent = 'Confirm Booking'; document.getElementById('btn-spinner').classList.add('hidden'); }
    });
});
