document.addEventListener('DOMContentLoaded', () => {
    let currentUser = JSON.parse(localStorage.getItem('easyride_user'));
    
    // Auth Check
    if (!currentUser) {
        window.location.href = '/'; 
        return;
    }

    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    if (userAvatar) userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    if (userNameDisplay) userNameDisplay.textContent = currentUser.username;

    window.logout = async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
        localStorage.removeItem('easyride_user');
        window.location.href = '/';
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

    // Initialize Intl Tel Input
    const phoneInput = document.getElementById('phone_number');
    let iti;
    if (phoneInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@21.2.7/build/js/utils.js",
            initialCountry: "auto",
            countrySearch: true,
            geoIpLookup: function(callback) {
                fetch("https://ipapi.co/json").then(function(res) { return res.json(); }).then(function(data) { callback(data.country_code); }).catch(function() { callback("us"); });
            },
        });
    }

    // Sync country search placeholder based on language
    window.addEventListener('languageChanged', (e) => {
        const lang = e.detail;
        const searchInput = document.querySelector('.iti__search-input');
        if (searchInput && translations && translations[lang] && translations[lang].search_country) {
            searchInput.placeholder = translations[lang].search_country;
        }
    });

    setInterval(() => {
        const lang = localStorage.getItem('easyride_lang') || 'en';
        const searchInput = document.querySelector('.iti__search-input');
        if (searchInput && typeof translations !== 'undefined' && translations[lang] && translations[lang].search_country && searchInput.placeholder !== translations[lang].search_country) {
            searchInput.placeholder = translations[lang].search_country;
        }
    }, 500);

    // Get Car ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');

    if (!carId) {
        window.location.href = '/';
        return;
    }

    let selectedCar = null;
    const carPreviewContent = document.getElementById('car-preview-content');
    const bookingForm = document.getElementById('booking-form');
    const pickupInput = document.getElementById('pickup_date');
    const returnInput = document.getElementById('return_date');
    const totalPriceEl = document.getElementById('total-price');

    // Fetch Car
    async function fetchCar() {
        try {
            const res = await fetch(`/api/cars/${carId}`);
            if (res.ok) {
                selectedCar = await res.json();
                renderCarPreview();
            } else {
                carPreviewContent.innerHTML = '<p style="color:red;">Error loading car.</p>';
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderCarPreview() {
        carPreviewContent.innerHTML = `
            <img src="${selectedCar.image_url}" alt="${selectedCar.name}" class="car-image">
            <h3 class="car-name" style="margin-bottom: 0.5rem;">${selectedCar.name}</h3>
            <p style="color: var(--text-muted); text-transform: uppercase; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.5rem;">${selectedCar.category}</p>
            
            <div class="car-specs" style="border: none; padding-top: 0; margin-bottom: 0;">
                <div class="spec-item" title="Transmission: ${selectedCar.transmission}">
                    <span class="spec-label">
                        <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 
                        Transmission
                    </span>
                    <span>${selectedCar.transmission}</span>
                </div>
                <div class="spec-item" title="Seats: ${selectedCar.seats}">
                    <span class="spec-label">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Seats
                    </span>
                    <span>${selectedCar.seats}</span>
                </div>
                <div class="spec-item" title="Fuel: ${selectedCar.fuel}">
                    <span class="spec-label">
                        <svg viewBox="0 0 24 24"><path d="M12 2C8.5 2 5 8 5 13a7 7 0 0 0 14 0c0-5-3.5-11-7-11z"></path></svg>
                        Fuel
                    </span>
                    <span>${selectedCar.fuel}</span>
                </div>
            </div>
            
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                <p>Daily Rate</p>
                <div class="car-price" style="text-align: left;">$${selectedCar.price_per_day}<span>/day</span></div>
            </div>
        `;
        document.getElementById('live-summary').style.display = 'block';
    }

    // Calculate Price Dynamically
    function calculatePrice() {
        if (!selectedCar || !pickupInput.value || !returnInput.value) return;
        const pDate = new Date(pickupInput.value);
        const rDate = new Date(returnInput.value);
        
        if (pDate && rDate && pDate <= rDate) {
            const diffTime = Math.abs(rDate - pDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
            const total = diffDays * selectedCar.price_per_day;
            totalPriceEl.innerHTML = `<span style="font-size: 1rem; font-weight: 400; color: var(--text-muted); font-family: 'Inter', sans-serif; margin-right: 15px;">($${selectedCar.price_per_day} &times; ${diffDays} days)</span>$${total.toFixed(2)}`;
        } else {
            totalPriceEl.textContent = '$0.00';
        }
    }

    // Set minimum dates
    const today = new Date().toISOString().split('T')[0];
    pickupInput.min = today;
    
    pickupInput.addEventListener('change', () => {
        returnInput.min = pickupInput.value;
        if (returnInput.value && returnInput.value < pickupInput.value) {
            returnInput.value = pickupInput.value;
        }
        calculatePrice();
        validateForm();
    });
    returnInput.addEventListener('change', () => {
        calculatePrice();
        validateForm();
    });

    // Form Validation & Payment Logic
    const paymentMethodSelect = document.getElementById('payment_method');
    const ccInfo = document.getElementById('credit-card-info');
    const payAtPickupMsg = document.getElementById('pay-at-pickup-msg');
    const confirmBtn = document.getElementById('confirm-btn');
    const cardInput = document.getElementById('card_number');
    const expiryInput = document.getElementById('expiry');
    const cvvInput = document.getElementById('cvv');

    function validateForm() {
        let isValid = true;
        if (!pickupInput.value || !returnInput.value || !phoneInput.value || !paymentMethodSelect.value) {
            isValid = false;
        }
        if (paymentMethodSelect.value === 'Credit Card') {
            if (!cardInput.value || !expiryInput.value || !cvvInput.value) isValid = false;
        }
        confirmBtn.disabled = !isValid;
    }

    paymentMethodSelect.addEventListener('change', () => {
        const val = paymentMethodSelect.value;
        if (val === 'Credit Card') {
            ccInfo.classList.remove('hidden');
            payAtPickupMsg.classList.add('hidden');
        } else if (val === 'Pay at Pickup') {
            ccInfo.classList.add('hidden');
            payAtPickupMsg.classList.remove('hidden');
        } else {
            ccInfo.classList.add('hidden');
            payAtPickupMsg.classList.add('hidden');
        }
        document.getElementById('summary-payment').textContent = val || 'None';
        validateForm();
    });

    pickupInput.addEventListener('input', validateForm);
    returnInput.addEventListener('input', validateForm);
    phoneInput.addEventListener('input', validateForm);
    cardInput.addEventListener('input', validateForm);
    expiryInput.addEventListener('input', validateForm);
    cvvInput.addEventListener('input', validateForm);

    // Form Submit
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        confirmBtn.disabled = true;
        document.getElementById('btn-text').textContent = 'Sending Confirmation Email...';
        document.getElementById('btn-spinner').classList.remove('hidden');
        const msg = document.getElementById('form-message');
        
        const rawPhone = phoneInput.value;
        const phone_number = iti ? iti.getNumber() : rawPhone;

        const payload = {
            user_id: currentUser.id,
            car_id: selectedCar.id,
            pickup_date: pickupInput.value,
            return_date: returnInput.value,
            province: document.getElementById('province').value,
            landmark: document.getElementById('landmark').value,
            phone_number: phone_number,
            payment_method: paymentMethodSelect.value
        };

        // Simulate network delay for effect
        setTimeout(async () => {
            try {
                const res = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    const checkmark = document.getElementById('checkmark-overlay');
                    if(checkmark) checkmark.classList.add('active');
                    
                    setTimeout(() => {
                        bookingForm.classList.add('hidden');
                        const bookingIdStr = 'ER-' + data.booking.id.toString().padStart(4, '0');
                        const idEl = document.getElementById('success-booking-id');
                        if (idEl) idEl.textContent = 'Booking Reference: #' + bookingIdStr;
                        
                        document.getElementById('success-state').classList.remove('hidden');
                        showToast(`Confirmation receipt sent to ${currentUser.email}`);
                        if(checkmark) checkmark.classList.remove('active');
                    }, 1200);
                } else {
                    showToast(data.error || 'Booking failed.', 'error');
                    resetBtn();
                }
            } catch (err) {
                showToast('Network error.', 'error');
                resetBtn();
            }
        }, 2000);

        function resetBtn() {
            confirmBtn.disabled = false;
            document.getElementById('btn-text').textContent = 'Confirm Booking';
            document.getElementById('btn-spinner').classList.add('hidden');
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'toast';
            const color = type === 'error' ? '#EF4444' : '#10B981';
            toast.innerHTML = `<span style="color: ${color}; font-weight: 500;">${message}</span>`;
            toast.style.borderLeft = `4px solid ${color}`;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 4500);
        }
    });

    fetchCar();
});
