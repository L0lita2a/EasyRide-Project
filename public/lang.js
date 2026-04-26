const translations = {
    en: {
        nav_fleet: "Our Fleet",
        nav_bookings: "My Bookings",
        nav_profile: "Personal Profile",
        nav_payment: "Payment Methods",
        nav_settings: "Account Settings",
        nav_logout: "Logout",
        nav_login: "Login / Register",
        hero_title: "Drive away in just minutes.",
        hero_subtitle: "Experience the thrill of the open road with our premium selection of vehicles. Minimal hassle, maximum pleasure.",
        btn_browse: "Browse cars",
        btn_how_it_works: "How it works",
        profile_title: "My Profile",
        personal_info: "Personal Information",
        lbl_fullname: "Full Name",
        lbl_email: "Email Address",
        lbl_phone: "Phone Number",
        lbl_address: "Primary Address",
        btn_update_profile: "Update Profile",
        lbl_upload_photo: "Upload Photo",
        search_country: "Search Country"
    },
    tr: {
        nav_fleet: "Filomuz",
        nav_bookings: "Rezervasyonlarım",
        nav_profile: "Kişisel Profil",
        nav_payment: "Ödeme Yöntemleri",
        nav_settings: "Hesap Ayarları",
        nav_logout: "Çıkış Yap",
        nav_login: "Giriş / Kayıt",
        hero_title: "Dakikalar içinde yola çıkın.",
        hero_subtitle: "Premium araç seçeneklerimizle açık yolun heyecanını yaşayın. Minimum zahmet, maksimum keyif.",
        btn_browse: "Araçlara Göz At",
        btn_how_it_works: "Nasıl Çalışır?",
        profile_title: "Profilim",
        personal_info: "Kişisel Bilgiler",
        lbl_fullname: "Ad Soyad",
        lbl_email: "E-posta Adresi",
        lbl_phone: "Telefon Numarası",
        lbl_address: "Birincil Adres",
        btn_update_profile: "Profili Güncelle",
        lbl_upload_photo: "Fotoğraf Yükle",
        search_country: "Ülke Ara"
    }
};

function setLanguage(lang) {
    localStorage.setItem('easyride_lang', lang);
    applyTranslations(lang);
    updateFlagUI(lang);
    
    // Dispatch custom event for complex widgets like intl-tel-input
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
}

function applyTranslations(lang) {
    const dict = translations[lang];
    if (!dict) return;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.type !== 'submit') {
                el.placeholder = dict[key];
            } else if (el.childNodes.length > 0) {
                // If the element has text nodes, replace text content without destroying inner HTML elements (like SVGs)
                // Assuming data-i18n elements only contain text directly
                // To be safe, we will just set textContent if there are no child elements, 
                // but if there are SVG children we might need to be careful.
                // Simplest is to wrap text in a <span> and put data-i18n on the span.
                el.textContent = dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });
}

function updateFlagUI(lang) {
    document.querySelectorAll('.lang-flag').forEach(img => {
        img.classList.remove('active');
        if (img.src.includes('gb.png') && lang === 'en') {
            img.classList.add('active');
        } else if (img.src.includes('tr.png') && lang === 'tr') {
            img.classList.add('active');
        }
    });
}

function toggleLangDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('lang-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const langDropdown = document.getElementById('lang-dropdown');
    const langMenu = document.getElementById('nav-lang-menu');
    if (langDropdown && langMenu && !langMenu.contains(event.target)) {
        langDropdown.classList.remove('show');
    }
});

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('easyride_lang') || 'en';
    setLanguage(savedLang);
});
