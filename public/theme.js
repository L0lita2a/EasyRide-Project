(function () {
    const key = 'easyride_theme';
    const saved = localStorage.getItem(key);
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.dataset.theme = 'dark';
    }
    document.addEventListener('DOMContentLoaded', () => {
        const nav = document.querySelector('.nav-links');
        if (!nav || document.getElementById('theme-toggle')) return;
        const item = document.createElement('li');
        item.innerHTML = '<button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false">◐ <span>Dark mode</span></button>';
        nav.prepend(item);
        const button = item.firstElementChild;
        const update = () => {
            const dark = document.documentElement.dataset.theme === 'dark';
            button.setAttribute('aria-pressed', String(dark));
            button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            button.querySelector('span').textContent = dark ? 'Light mode' : 'Dark mode';
        };
        button.addEventListener('click', () => {
            const dark = document.documentElement.dataset.theme !== 'dark';
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            localStorage.setItem(key, dark ? 'dark' : 'light');
            update();
        });
        update();
    });
})();
