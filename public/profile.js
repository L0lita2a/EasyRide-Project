document.addEventListener('DOMContentLoaded', () => {
    let currentUser = JSON.parse(localStorage.getItem('easyride_user'));
    
    if (!currentUser) {
        window.location.href = '/'; 
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

    // Load User Data
    async function fetchUserData() {
        try {
            const res = await fetch(`/api/user/${currentUser.id}`);
            const data = await res.json();
            if (res.ok) {
                const u = data.user;
                document.getElementById('profile-fullname').value = u.full_name || '';
                document.getElementById('profile-email').value = u.email;
                document.getElementById('profile-phone').value = u.phone_number || '';
                document.getElementById('profile-address').value = u.address || '';
                
                profileNameDisplay.textContent = u.full_name || u.username;
                if (u.profile_picture) {
                    profileAvatarLarge.textContent = '';
                    profileAvatarLarge.style.backgroundImage = `url(${u.profile_picture})`;
                    if (userAvatar) {
                        userAvatar.textContent = '';
                        userAvatar.style.backgroundImage = `url(${u.profile_picture})`;
                        userAvatar.style.backgroundSize = 'cover';
                        userAvatar.style.backgroundPosition = 'center';
                    }
                } else {
                    profileAvatarLarge.textContent = (u.full_name ? u.full_name.charAt(0) : u.username.charAt(0)).toUpperCase();
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data', error);
        }
    }
    fetchUserData();

    // [PROFESSOR NOTE]: Handle Profile Update form submission using FormData for text + image upload
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default page reload
        const btn = document.getElementById('profile-save-btn');
        const text = document.getElementById('profile-btn-text');
        const spinner = document.getElementById('profile-spinner');
        const msg = document.getElementById('profile-message');
        
        btn.disabled = true;
        text.textContent = 'Saving...';
        spinner.classList.remove('hidden'); // Show loading spinner
        msg.classList.add('hidden');

        // [PROFESSOR NOTE]: Use FormData instead of JSON to send the file along with the text
        const formData = new FormData();
        formData.append('user_id', currentUser.id);
        formData.append('full_name', document.getElementById('profile-fullname').value);
        formData.append('email', document.getElementById('profile-email').value);
        formData.append('phone_number', iti ? iti.getNumber() : document.getElementById('profile-phone').value); // Extract international number
        formData.append('address', document.getElementById('profile-address').value);
        
        // Append image file if selected
        if (profileAvatarInput.files[0]) {
            formData.append('avatar', profileAvatarInput.files[0]);
        }

        try {
            // [PROFESSOR NOTE]: Send POST request to the backend with FormData
            const res = await fetch(`/api/update-profile`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            // [PROFESSOR NOTE]: Handle the server's JSON response and show appropriate toast notification
            if (res.ok && (data.success || !data.error)) {
                showToast(data.message || 'Changes saved!', 'success');
                const updatedName = document.getElementById('profile-fullname').value;
                profileNameDisplay.textContent = updatedName || currentUser.username;
                if (data.profile_picture) {
                    if (userAvatar) {
                        userAvatar.textContent = '';
                        userAvatar.style.backgroundImage = `url(${data.profile_picture})`;
                        userAvatar.style.backgroundSize = 'cover';
                        userAvatar.style.backgroundPosition = 'center';
                    }
                } else if (!profileAvatarLarge.style.backgroundImage) {
                    profileAvatarLarge.textContent = (updatedName ? updatedName.charAt(0) : currentUser.username.charAt(0)).toUpperCase();
                }
                
                // Update local storage email if changed
                currentUser.email = document.getElementById('profile-email').value;
                localStorage.setItem('easyride_user', JSON.stringify(currentUser));
            } else {
                showToast(data.error || 'Failed to update profile.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        } finally {
            btn.disabled = false;
            text.textContent = 'Update Profile';
            spinner.classList.add('hidden'); // Hide loading spinner
        }
    });

    // Handle Password Update
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('password-save-btn');
        const text = document.getElementById('password-btn-text');
        const spinner = document.getElementById('password-spinner');
        const msg = document.getElementById('password-message');
        
        const currentPassword = document.getElementById('current-password').value;
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

        try {
            const res = await fetch(`/api/user/${currentUser.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast('Password changed successfully!', 'success');
                passwordForm.reset();
            } else {
                showToast(data.error || 'Failed to update password.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        } finally {
            btn.disabled = false;
            text.textContent = 'Update Password';
            spinner.classList.add('hidden');
        }
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
