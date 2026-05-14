// history.js
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('easyride_user'));
    
    // Auth Check: Redirect to home if not logged in
    if (!currentUser) {
        window.location.href = 'index.html'; 
        return;
    }

    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    const historyList = document.getElementById('history-list');

    if (userAvatar) userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    if (userNameDisplay) userNameDisplay.textContent = currentUser.username;

    window.logout = async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); } catch(e) {}
        localStorage.removeItem('easyride_user');
        window.location.href = 'index.html';
    };

    window.toggleDropdown = (e) => {
        e.stopPropagation();
        document.getElementById('user-dropdown').classList.toggle('active');
    };

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown && dropdown.classList.contains('active') && !e.target.closest('.nav-auth-user')) {
            dropdown.classList.remove('active');
        }
    });

    window.openContactModal = () => { 
        const modal = document.getElementById('contact-modal');
        if(modal) modal.style.display = 'block'; 
    };
    window.closeContactModal = () => { 
        const modal = document.getElementById('contact-modal');
        if(modal) modal.style.display = 'none'; 
    };

    async function fetchHistory() {
        // Demo mode: use static mock bookings
        renderHistory(DEMO_BOOKINGS);
    }

    function renderHistory(bookings) {
        historyList.innerHTML = '';
        if (bookings.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <svg viewBox="0 0 24 24" style="width: 80px; height: 80px; stroke: var(--text-muted); fill: none; stroke-width: 1.5; margin-bottom: 1.5rem;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.5rem;">No bookings yet</h3>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Looks like you haven't taken a ride with us yet.</p>
                    <a href="/" class="btn btn-primary">Explore Cars</a>
                </div>
            `;
            return;
        }
        bookings.forEach(b => {
            const el = document.createElement('div');
            el.className = 'history-card';
            el.innerHTML = `
                <img src="${b.image_url}" alt="${b.car_name}" class="history-img">
                <div class="history-details" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h4>${b.car_name}</h4>
                        <span style="background: ${b.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${b.status === 'Cancelled' ? '#EF4444' : '#10B981'}; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            ${b.status === 'Cancelled' ? 
                                '<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancelled' : 
                                '<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;"><path d="M20 6L9 17l-5-5"></path></svg> Confirmed'}
                        </span>
                    </div>
                    <p style="margin-top: 0.5rem;"><strong>Location:</strong> Turkey, ${b.province} - ${b.landmark}</p>
                    <p><strong>Phone:</strong> ${b.phone_number}</p>
                    <p><strong>Payment:</strong> ${b.payment_method}</p>
                    <p><strong>Dates:</strong> ${b.pickup_date} to ${b.return_date}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                        <p class="history-price">Total: $${b.total_price}</p>
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">Ref: #ER-${b.id.toString().padStart(4, '0')}</span>
                    </div>
                    ${b.status !== 'Cancelled' ? `<button class="btn btn-secondary" style="width: 100%; margin-top: 1rem; background-color: #ffeaea; color: #d32f2f; border: none;" onclick="cancelBooking(${b.id}, this)">Cancel Booking</button>` : ''}
                </div>
            `;
            historyList.appendChild(el);
        });
    }

    window.cancelBooking = async (id, btnEl) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        // Demo mode: just update the UI locally
        const detailsDiv = btnEl.closest('.history-details');
        if (detailsDiv) {
            const statusSpan = detailsDiv.querySelector('span[style*="background"]');
            if (statusSpan) {
                statusSpan.style.background = 'rgba(239, 68, 68, 0.1)';
                statusSpan.style.color = '#EF4444';
                statusSpan.innerHTML = '<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancelled';
            }
            btnEl.remove();
        }
        showToast('Booking cancelled!');
    };

    function showToast(message) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; stroke: #10B981; fill: none; stroke-width: 2; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    fetchHistory();
});
