document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const carList = document.getElementById('car-list');

    const api = (url, options = {}) => fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } })
        .then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Request failed'); return body; });

    function updateNav() {
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navHistory = document.getElementById('nav-history');
        if (currentUser) {
            navLogin && navLogin.classList.add('hidden'); navLogout && navLogout.classList.remove('hidden'); navHistory && navHistory.classList.remove('hidden');
            const name = currentUser.full_name || currentUser.username || 'User';
            const avatar = document.getElementById('user-avatar'); if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
            const display = document.getElementById('user-name-display'); if (display) display.textContent = name;
        } else {
            navLogin && navLogin.classList.remove('hidden'); navLogout && navLogout.classList.add('hidden'); navHistory && navHistory.classList.add('hidden');
        }
    }
    async function loadUser() {
        try { currentUser = (await api('/api/auth/me')).user; } catch (_) { currentUser = null; }
        updateNav();
    }
    window.openAuthModal = () => { if (authModal) authModal.style.display = 'block'; };
    window.closeAuthModal = () => { if (authModal) authModal.style.display = 'none'; };
    window.switchAuthTab = tab => {
        document.getElementById('tab-login')?.classList.toggle('active', tab === 'login');
        document.getElementById('tab-register')?.classList.toggle('active', tab === 'register');
        loginForm?.classList.toggle('hidden', tab !== 'login'); registerForm?.classList.toggle('hidden', tab !== 'register');
        const forgot = document.getElementById('forgot-form');
        if (forgot) { forgot.classList.toggle('hidden', tab !== 'forgot'); if (tab === 'forgot') { document.getElementById('forgot-inputs')?.classList.remove('hidden'); document.getElementById('forgot-success')?.classList.add('hidden'); } }
    };
    window.openContactModal = () => { const modal = document.getElementById('contact-modal'); if (modal) modal.style.display = 'block'; };
    window.closeContactModal = () => { const modal = document.getElementById('contact-modal'); if (modal) modal.style.display = 'none'; };
    window.logout = async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {} currentUser = null; updateNav(); window.location.href = 'index.html'; };
    window.toggleDropdown = e => { e.stopPropagation(); document.getElementById('user-dropdown')?.classList.toggle('active'); };
    document.addEventListener('click', e => { const dropdown = document.getElementById('user-dropdown'); if (dropdown && dropdown.classList.contains('active') && !e.target.closest('.nav-auth-user')) dropdown.classList.remove('active'); });

    loginForm?.addEventListener('submit', async e => {
        e.preventDefault(); const msg = document.getElementById('login-message'); msg.textContent = '';
        try {
            const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value }) });
            currentUser = data.user; updateNav(); window.closeAuthModal(); loginForm.reset();
        } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    });
    registerForm?.addEventListener('submit', async e => {
        e.preventDefault(); const msg = document.getElementById('register-message');
        try {
            const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: document.getElementById('register-username').value, email: document.getElementById('register-email').value, password: document.getElementById('register-password').value }) });
            currentUser = data.user; updateNav(); registerForm.reset(); window.closeAuthModal();
        } catch (err) { msg.textContent = err.message; msg.className = 'form-msg error'; }
    });
    document.getElementById('forgot-form')?.addEventListener('submit', async e => {
        e.preventDefault(); const btn = document.getElementById('forgot-btn'); btn.disabled = true;
        try {
            await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: document.getElementById('forgot-email').value }) });
            document.getElementById('forgot-success-email').textContent = document.getElementById('forgot-email').value;
            document.getElementById('forgot-inputs').classList.add('hidden'); document.getElementById('forgot-success').classList.remove('hidden');
        } catch (err) { const msg = document.getElementById('forgot-inputs'); msg.insertAdjacentText('beforeend', ` ${err.message}`); } finally { btn.disabled = false; }
    });

    async function fetchCars() {
        if (!carList) return;
        try { renderCars((await api('/api/cars')).cars); } catch (err) { carList.textContent = err.message; }
    }
    function renderCars(cars) {
        carList.replaceChildren();
        cars.forEach(car => {
            const card = document.createElement('div'); card.className = 'car-card';
            const image = document.createElement('img'); image.className = 'car-image'; image.src = car.image_url; image.alt = car.name; image.loading = 'lazy';
            const details = document.createElement('div'); details.className = 'car-details';
            const header = document.createElement('div'); header.className = 'car-header';
            const title = document.createElement('div'); const category = document.createElement('span'); category.className = 'car-category'; category.textContent = car.category;
            const name = document.createElement('h3'); name.className = 'car-name'; name.textContent = car.name; title.append(category, name);
            const price = document.createElement('div'); price.className = 'car-price'; price.textContent = `$${Number(car.price_per_day).toFixed(2)}/day`; header.append(title, price);
            const specs = document.createElement('div'); specs.className = 'car-specs';
            [['Transmission', car.transmission], ['Seats', car.seats], ['Fuel', car.fuel]].forEach(([label, value]) => { const item = document.createElement('div'); item.className = 'spec-item'; const l = document.createElement('span'); l.className = 'spec-label'; l.textContent = label; const v = document.createElement('span'); v.textContent = value; item.append(l, v); specs.append(item); });
            const button = document.createElement('button'); button.className = 'btn btn-block btn-primary btn-book'; button.textContent = 'Book Now'; button.addEventListener('click', () => window.initiateBooking(car.id));
            details.append(header, specs, button); card.append(image, details); carList.append(card);
        });
    }
    window.initiateBooking = carId => { if (!currentUser) return window.openAuthModal(); window.location.href = `booking.html?id=${encodeURIComponent(carId)}`; };

    document.querySelectorAll('.faq-question').forEach(btn => btn.addEventListener('click', () => {
        const item = btn.parentElement; const answer = item.querySelector('.faq-answer'); const active = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('active'); i.querySelector('.faq-answer').style.maxHeight = null; });
        if (!active) { item.classList.add('active'); answer.style.maxHeight = `${answer.scrollHeight}px`; }
    }));
    loadUser().then(fetchCars);
});
