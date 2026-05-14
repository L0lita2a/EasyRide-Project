document.addEventListener('DOMContentLoaded', () => {
    let currentUser = JSON.parse(localStorage.getItem('easyride_user'));
    
    if (!currentUser) {
        window.location.href = 'index.html'; 
        return;
    }

    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const phoneInput = document.getElementById('profile-phone');

    // Initialize Intl Tel Input
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
        if (searchInput && translations[lang] && translations[lang].search_country) {
            searchInput.placeholder = translations[lang].search_country;
        }
    });

    // Also try checking the placeholder periodically in case the dropdown gets re-rendered
    setInterval(() => {
        const lang = localStorage.getItem('easyride_lang') || 'en';
        const searchInput = document.querySelector('.iti__search-input');
        if (searchInput && translations[lang] && translations[lang].search_country && searchInput.placeholder !== translations[lang].search_country) {
            searchInput.placeholder = translations[lang].search_country;
        }
    }, 500);

    if (userAvatar) userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    if (userNameDisplay) userNameDisplay.textContent = currentUser.username;

    // Instant Image Preview
    if (profileAvatarInput) {
        profileAvatarInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profileAvatarLarge.textContent = '';
                    profileAvatarLarge.style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    
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

    window.togglePasswordVisibility = (id) => {
        const input = document.getElementById(id);
        if (input.type === "password") {
            input.type = "text";
        } else {
            input.type = "password";
        }
    };

    window.openCardModal = () => {
        const modal = document.getElementById('card-modal');
        if (modal) modal.style.display = 'block';
    };

    window.closeCardModal = () => {
        const modal = document.getElementById('card-modal');
        if (modal) modal.style.display = 'none';
    };

    window.submitCard = () => {
        closeCardModal();
        showToast('Card added successfully!');
        document.getElementById('add-card-form').reset();
    };

    // Load User Data — Demo mode: use localStorage user info
    async function fetchUserData() {
        const u = currentUser;
        document.getElementById('profile-fullname').value = u.full_name || u.username || '';
        document.getElementById('profile-email').value = u.email || '';
        document.getElementById('profile-phone').value = u.phone_number || '';
        document.getElementById('profile-address').value = u.address || '';
        profileNameDisplay.textContent = u.full_name || u.username;
        profileAvatarLarge.textContent = ((u.full_name || u.username || 'U').charAt(0)).toUpperCase();
    }
    fetchUserData();

    // Handle Profile Update — Demo mode: save to localStorage, show toast
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('profile-save-btn');
        const text = document.getElementById('profile-btn-text');
        const spinner = document.getElementById('profile-spinner');
        const msg = document.getElementById('profile-message');
        
        btn.disabled = true;
        text.textContent = 'Saving...';
        spinner.classList.remove('hidden');
        msg.classList.add('hidden');

        // Simulate save delay
        setTimeout(() => {
            const updatedName = document.getElementById('profile-fullname').value;
            const updatedEmail = document.getElementById('profile-email').value;
            
            // Update localStorage
            currentUser.full_name = updatedName;
            currentUser.email = updatedEmail;
            localStorage.setItem('easyride_user', JSON.stringify(currentUser));
            
            profileNameDisplay.textContent = updatedName || currentUser.username;
            showToast('Changes saved!', 'success');
            
            btn.disabled = false;
            text.textContent = 'Update Profile';
            spinner.classList.add('hidden');
        }, 1000);
    });

    // Handle Password Update — Demo mode: just validate and show toast
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('password-save-btn');
        const text = document.getElementById('password-btn-text');
        const spinner = document.getElementById('password-spinner');
        const msg = document.getElementById('password-message');
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            msg.textContent = 'New passwords do not match.';
            msg.style.color = 'red';
            msg.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        text.textContent = 'Updating...';
        spinner.classList.remove('hidden');
        msg.classList.add('hidden');

        // Demo mode: simulate success
        setTimeout(() => {
            showToast('Password changed successfully!', 'success');
            passwordForm.reset();
            btn.disabled = false;
            text.textContent = 'Update Password';
            spinner.classList.add('hidden');
        }, 1000);
    });

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        const color = type === 'error' ? '#EF4444' : '#10B981';
        const icon = type === 'error' ? 
            `<svg viewBox="0 0 24 24" style="width: 24px; height: 24px; stroke: ${color}; fill: none; stroke-width: 2; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>` : 
            `<svg viewBox="0 0 24 24" style="width: 24px; height: 24px; stroke: ${color}; fill: none; stroke-width: 2; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        toast.innerHTML = `
            ${icon}
            <span style="color: ${color}; font-weight: 500;">${message}</span>
        `;
        toast.style.borderLeft = `4px solid ${color}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }
});
