document.addEventListener('DOMContentLoaded', () => {
    let currentUser = JSON.parse(localStorage.getItem('easyride_user'));
    
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navHistory = document.getElementById('nav-history');
    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');

    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const carList = document.getElementById('car-list');

    // Initial Load
    updateNav();
    fetchCars();

    // --- UI State Management ---
    function updateNav() {
        if (currentUser) {
            navLogin.classList.add('hidden');
            navLogout.classList.remove('hidden');
            navHistory.classList.remove('hidden');
            userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
            if (userNameDisplay) userNameDisplay.textContent = currentUser.username;
        } else {
            navLogin.classList.remove('hidden');
            navLogout.classList.add('hidden');
            navHistory.classList.add('hidden');
        }
    }

    // --- Auth Logic ---
    window.openAuthModal = () => { authModal.style.display = 'block'; };
    window.closeAuthModal = () => { authModal.style.display = 'none'; };
    
    window.switchAuthTab = (tab) => {
        document.getElementById('tab-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
        
        loginForm.classList.toggle('hidden', tab !== 'login');
        registerForm.classList.toggle('hidden', tab !== 'register');
        
        const forgotForm = document.getElementById('forgot-form');
        if (forgotForm) {
            forgotForm.classList.toggle('hidden', tab !== 'forgot');
            if (tab === 'forgot') {
                document.getElementById('forgot-inputs').classList.remove('hidden');
                document.getElementById('forgot-success').classList.add('hidden');
                document.getElementById('forgot-email').value = '';
            }
        }
    };

    window.openContactModal = () => { 
        const modal = document.getElementById('contact-modal');
        if(modal) modal.style.display = 'block'; 
    };
    window.closeContactModal = () => { 
        const modal = document.getElementById('contact-modal');
        if(modal) modal.style.display = 'none'; 
    };

    window.logout = async () => {
        try { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); } catch(e) {}
        localStorage.removeItem('easyride_user');
        window.location.reload();
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('login-message');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                msg.textContent = data.error || 'Login failed.';
                msg.className = 'form-msg error';
                return;
            }

            currentUser = data.user;
            localStorage.setItem('easyride_user', JSON.stringify(currentUser));
            updateNav();
            closeAuthModal();
            loginForm.reset();
            msg.textContent = '';
            msg.className = 'form-msg';
        } catch (error) {
            msg.textContent = 'Cannot connect to the server. Please try again.';
            msg.className = 'form-msg error';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('register-message');
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                msg.textContent = data.error || 'Registration failed.';
                msg.className = 'form-msg error';
                return;
            }

            msg.textContent = 'Registration successful! Please login.';
            msg.className = 'form-msg success';
            registerForm.reset();
            setTimeout(() => switchAuthTab('login'), 1500);
        } catch (error) {
            msg.textContent = 'Cannot connect to the server. Please try again.';
            msg.className = 'form-msg error';
        }
    });

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const btn = document.getElementById('forgot-btn');
            const btnText = document.getElementById('forgot-btn-text');
            const spinner = document.getElementById('forgot-spinner');
            
            btn.disabled = true;
            btnText.textContent = 'Verifying email...';
            spinner.classList.remove('hidden');

            try {
                await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                setTimeout(() => {
                    document.getElementById('forgot-success-email').textContent = email;
                    document.getElementById('forgot-inputs').classList.add('hidden');
                    document.getElementById('forgot-success').classList.remove('hidden');
                    btn.disabled = false;
                    btnText.textContent = 'Send Reset Link';
                    spinner.classList.add('hidden');
                }, 2000);
            } catch (error) {
                console.error(error);
                btn.disabled = false;
                btnText.textContent = 'Send Reset Link';
                spinner.classList.add('hidden');
            }
        });
    }

    // --- Cars Logic ---
    async function fetchCars() {
        if (!carList) return;
        try {
            const response = await fetch('/api/cars');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load cars.');
            renderCars(data.cars || []);
        } catch (error) {
            console.warn('Using demo cars because API is unavailable:', error.message);
            renderCars(typeof DEMO_CARS !== 'undefined' ? DEMO_CARS : []);
        }
    }

    function renderCars(cars) {
        carList.innerHTML = '';
        cars.forEach(car => {
            const card = document.createElement('div');
            card.className = 'car-card';
            card.innerHTML = `
                <img src="${car.image_url}" alt="${car.name}" class="car-image">
                <div class="car-details">
                    <div class="car-header">
                        <div>
                            <span class="car-category">${car.category}</span>
                            <h3 class="car-name">${car.name}</h3>
                        </div>
                        <div class="car-price">$${car.price_per_day}<span>/day</span></div>
                    </div>
                    
                    <div class="car-specs">
                        <div class="spec-item">
                            <span class="spec-label">
                                <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 
                                Transmission
                            </span>
                            <span>${car.transmission}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">
                                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                Seats
                            </span>
                            <span>${car.seats}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">
                                <svg viewBox="0 0 24 24"><path d="M12 2C8.5 2 5 8 5 13a7 7 0 0 0 14 0c0-5-3.5-11-7-11z"></path></svg>
                                Fuel
                            </span>
                            <span>${car.fuel}</span>
                        </div>
                    </div>

                    <button class="btn btn-block btn-primary btn-book" onclick="initiateBooking(${car.id})">Book Now</button>
                </div>
            `;
            carList.appendChild(card);
        });
    }

    // --- Booking Initiation ---
    window.initiateBooking = (carId) => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        window.location.href = `booking.html?id=${carId}`;
    };

    // --- FAQ Logic ---
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const answer = item.querySelector('.faq-answer');
            const isActive = item.classList.contains('active');
            
            // Close all
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
});
