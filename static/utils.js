// Shared utilities for Honda WOL application

function initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(!isDark);
}

function applyTheme(isDark) {
    const sun = document.getElementById('themeIconSun');
    const moon = document.getElementById('themeIconMoon');

    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (sun) sun.classList.remove('hidden');
        if (moon) moon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (sun) sun.classList.add('hidden');
        if (moon) moon.classList.remove('hidden');
    }
}

function showToast(message, isError = false) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-xl transform transition-all duration-300 z-50 text-white font-medium text-sm ${isError ? 'bg-red-600' : 'bg-green-600'} translate-y-0 opacity-100`;

    setTimeout(() => {
        toastEl.classList.remove('translate-y-0', 'opacity-100');
        toastEl.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Initialize theme on load
initTheme();
