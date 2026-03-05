/**
 * Toast Notification System
 * Usage: showToast('message') or showToast('message', 'success' | 'error' | 'warning' | 'info')
 */
(function () {
    // Inject container + styles once
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .toast {
            pointer-events: auto;
            min-width: 280px;
            max-width: 420px;
            padding: 14px 20px 14px 16px;
            border-radius: 10px;
            font-family: inherit;
            font-size: 0.92rem;
            line-height: 1.4;
            color: #fff;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: toast-in .35s ease forwards;
            cursor: pointer;
            transition: opacity .25s, transform .25s;
        }
        .toast:hover { opacity: .85; }
        .toast.toast-out {
            animation: toast-out .3s ease forwards;
        }
        .toast-icon { font-size: 1.15rem; flex-shrink: 0; margin-top: 1px; }
        .toast-body  { flex: 1; word-break: break-word; }

        /* Variants */
        .toast-success { background: rgba(16,185,129,.92); }
        .toast-error   { background: rgba(239,68,68,.92);  }
        .toast-warning { background: rgba(245,158,11,.92); color: #1a1a2e; }
        .toast-info    { background: rgba(59,130,246,.92);  }

        @keyframes toast-in {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-out {
            from { opacity: 1; transform: translateX(0); }
            to   { opacity: 0; transform: translateX(40px); }
        }
    `;
    document.head.appendChild(style);

    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    /**
     * @param {string} message  – text to display
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {number} duration – ms before auto-dismiss (0 = manual only)
     */
    window.showToast = function (message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <span class="toast-body">${message}</span>
        `;

        // Click to dismiss
        toast.addEventListener('click', () => dismiss(toast));

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => dismiss(toast), duration);
        }
    };

    function dismiss(toast) {
        if (toast.classList.contains('toast-out')) return;
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }
})();
