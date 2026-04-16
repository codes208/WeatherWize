/**
 * Toast Notification System
 * Usage: showToast('message') or showToast('message', 'success' | 'error' | 'warning' | 'info')
 */
(function () {
    let container = null;

    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    function ensureContainer() {
        if (!container || !container.parentNode) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    function dismiss(toast) {
        if (toast.classList.contains('toast-out')) return;
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }

    /**
     * @param {string} message  – text to display
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {number} duration – ms before auto-dismiss (0 = manual only)
     */
    function dismissBanner(banner) {
        if (banner.classList.contains('alert-banner-out')) return;
        banner.classList.add('alert-banner-out');
        banner.addEventListener('animationend', () => banner.remove());
    }

    window.showAlertBanner = function (message, type = 'error') {
        const navbar = document.querySelector('.navbar');
        if (!navbar) {
            window.showToast(message, type, 0);
            return;
        }

        const banner = document.createElement('div');
        banner.className = `alert-banner alert-banner-${type}`;
        banner.innerHTML = `
            <span class="alert-banner-icon">${ICONS[type] || ICONS.info}</span>
            <span class="alert-banner-body">${message}</span>
            <button class="alert-banner-close" aria-label="Dismiss">✕</button>
        `;

        banner.querySelector('.alert-banner-close').addEventListener('click', () => dismissBanner(banner));
        navbar.insertAdjacentElement('afterend', banner);
    };

    window.showToast = function (message, type = 'info', duration = 4000) {
        const c = ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <span class="toast-body">${message}</span>
        `;

        toast.addEventListener('click', () => dismiss(toast));

        c.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => dismiss(toast), duration);
        }
    };

})();
