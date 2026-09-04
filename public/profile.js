document.addEventListener('DOMContentLoaded', async () => {
    const api = (url, options = {}) => fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {})
        }
    }).then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Request failed');
        return body;
    });

    let currentUser;
    try {
        currentUser = (await api('/api/auth/me')).user;
    } catch (_) {
        window.location.href = 'index.html';
        return;
    }

    const userAvatar = document.getElementById('user-avatar');
    const userNameDisplay = document.getElementById('user-name-display');
    const profileAvatarLarge = document.getElementById('profile-avatar-large');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const phoneInput = document.getElementById('profile-phone');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');

    const displayName = () => currentUser.full_name || currentUser.username || 'User';
    function renderUser() {
        const name = displayName();
        if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
        if (userNameDisplay) userNameDisplay.textContent = name;
        if (profileNameDisplay) profileNameDisplay.textContent = name;
        if (profileAvatarLarge && !profileAvatarLarge.style.backgroundImage) {
            profileAvatarLarge.textContent = name.charAt(0).toUpperCase();
        }
    }
    renderUser();

    window.logout = async () => {
        try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
        window.location.href = 'index.html';
    };
    window.toggleDropdown = event => {
        event.stopPropagation();
        document.getElementById('user-dropdown')?.classList.toggle('active');
    };
    document.addEventListener('click', event => {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown?.classList.contains('active') && !event.target.closest('.nav-auth-user')) {
            dropdown.classList.remove('active');
        }
    });
    window.togglePasswordVisibility = id => {
        const input = document.getElementById(id);
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
    };
    window.openContactModal = () => {
        const modal = document.getElementById('contact-modal');
        if (modal) modal.style.display = 'block';
    };
    window.closeContactModal = () => {
        const modal = document.getElementById('contact-modal');
        if (modal) modal.style.display = 'none';
    };
    window.openCardModal = () => document.getElementById('card-modal')?.style.setProperty('display', 'block');
    window.closeCardModal = () => document.getElementById('card-modal')?.style.setProperty('display', 'none');
    window.submitCard = () => {
        window.closeCardModal();
        document.getElementById('add-card-form')?.reset();
        showToast('Card storage is not available yet.', 'error');
    };

    if (phoneInput && window.intlTelInput) {
        window.intlTelInput(phoneInput, {
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@21.2.7/build/js/utils.js',
            initialCountry: 'auto',
            countrySearch: true
        });
    }

    function fillProfile() {
        document.getElementById('profile-fullname').value = currentUser.full_name || '';
        document.getElementById('profile-email').value = currentUser.email || '';
        phoneInput.value = currentUser.phone_number || '';
        document.getElementById('profile-address').value = currentUser.address || '';
        renderUser();
        if (currentUser.profile_picture && profileAvatarLarge) {
            profileAvatarLarge.textContent = '';
            profileAvatarLarge.style.backgroundImage = `url("${currentUser.profile_picture}")`;
        }
    }
    fillProfile();

    profileAvatarInput?.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file || !profileAvatarLarge) return;
        const reader = new FileReader();
        reader.onload = () => {
            profileAvatarLarge.textContent = '';
            profileAvatarLarge.style.backgroundImage = `url("${reader.result}")`;
        };
        reader.readAsDataURL(file);
    });

    profileForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const button = document.getElementById('profile-save-btn');
        const text = document.getElementById('profile-btn-text');
        const spinner = document.getElementById('profile-spinner');
        button.disabled = true;
        text.textContent = 'Saving...';
        spinner.classList.remove('hidden');
        try {
            const data = new FormData();
            data.append('full_name', document.getElementById('profile-fullname').value.trim());
            data.append('phone_number', phoneInput.value.trim());
            data.append('address', document.getElementById('profile-address').value.trim());
            if (profileAvatarInput.files?.[0]) data.append('avatar', profileAvatarInput.files[0]);
            await api('/api/update-profile', { method: 'POST', body: data });
            currentUser = (await api('/api/auth/me')).user;
            fillProfile();
            showToast('Changes saved!');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            button.disabled = false;
            text.textContent = 'Update Profile';
            spinner.classList.add('hidden');
        }
    });

    passwordForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const message = document.getElementById('password-message');
        const button = document.getElementById('password-save-btn');
        const text = document.getElementById('password-btn-text');
        const spinner = document.getElementById('password-spinner');
        const newPassword = document.getElementById('new-password').value;
        if (newPassword !== document.getElementById('confirm-password').value) {
            message.textContent = 'New passwords do not match.';
            message.classList.remove('hidden');
            return;
        }
        button.disabled = true;
        text.textContent = 'Updating...';
        spinner.classList.remove('hidden');
        message.classList.add('hidden');
        try {
            await api('/api/user/me/password', {
                method: 'PUT',
                body: JSON.stringify({
                    current_password: document.getElementById('current-password').value,
                    new_password: newPassword
                })
            });
            passwordForm.reset();
            showToast('Password changed successfully!');
        } catch (error) {
            message.textContent = error.message;
            message.classList.remove('hidden');
        } finally {
            button.disabled = false;
            text.textContent = 'Update Password';
            spinner.classList.add('hidden');
        }
    });

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.borderLeft = `4px solid ${type === 'error' ? '#EF4444' : '#10B981'}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }
});
