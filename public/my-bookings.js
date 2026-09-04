document.addEventListener('DOMContentLoaded', async () => {
    const api = (url, options = {}) => fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
        .then(async r => { const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || 'Request failed'); return data; });
    let user;
    try { user = (await api('/api/auth/me')).user; } catch (_) { window.location.href = 'index.html'; return; }
    document.getElementById('user-avatar').textContent = (user.full_name || user.username).charAt(0).toUpperCase();
    document.getElementById('user-name-display').textContent = user.full_name || user.username;
    window.logout = async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {} window.location.href = 'index.html'; };
    window.toggleDropdown = e => { e.stopPropagation(); document.getElementById('user-dropdown')?.classList.toggle('active'); };
    window.openContactModal = () => { const m = document.getElementById('contact-modal'); if (m) m.style.display = 'block'; };
    window.closeContactModal = () => { const m = document.getElementById('contact-modal'); if (m) m.style.display = 'none'; };
    const list = document.getElementById('history-list');
    function render(bookings) {
        list.replaceChildren();
        if (!bookings.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = 'No bookings yet. Explore our cars to get started.'; list.append(empty); return; }
        bookings.forEach(booking => {
            const card = document.createElement('div'); card.className = 'history-card';
            const image = document.createElement('img'); image.className = 'history-img'; image.src = booking.image_url; image.alt = booking.car_name;
            const details = document.createElement('div'); details.className = 'history-details'; details.style.width = '100%';
            const heading = document.createElement('h4'); heading.textContent = booking.car_name;
            const status = document.createElement('span'); status.textContent = booking.status; status.style.cssText = `padding: .25rem .75rem; border-radius: 999px; font-size: .8rem; font-weight: 600; color: ${booking.status === 'Cancelled' ? '#EF4444' : '#10B981'};`;
            const top = document.createElement('div'); top.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start'; top.append(heading, status);
            const info = document.createElement('p'); info.textContent = `Location: Turkey, ${booking.province} - ${booking.landmark}`;
            const phone = document.createElement('p'); phone.textContent = `Phone: ${booking.phone_number}`;
            const dates = document.createElement('p'); dates.textContent = `Dates: ${booking.pickup_date} to ${booking.return_date}`;
            const total = document.createElement('p'); total.className = 'history-price'; total.textContent = `Total: $${Number(booking.total_price).toFixed(2)}`;
            details.append(top, info, phone, dates, total);
            if (booking.status !== 'Cancelled') { const cancel = document.createElement('button'); cancel.className = 'btn btn-secondary'; cancel.textContent = 'Cancel Booking'; cancel.addEventListener('click', () => window.cancelBooking(booking.id, cancel)); details.append(cancel); }
            card.append(image, details); list.append(card);
        });
    }
    window.cancelBooking = async (id, button) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;
        button.disabled = true;
        try { await api('/api/cancel-booking', { method: 'POST', body: JSON.stringify({ bookingId: id }) }); await load(); }
        catch (err) { button.disabled = false; window.alert(err.message); }
    };
    async function load() { try { render((await api('/api/user/bookings')).bookings); } catch (err) { list.textContent = err.message; } }
    load();
});
