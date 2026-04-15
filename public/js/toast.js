/**
 * Toast Notification System
 * Usage: showToast('message') or showToast('message', 'success' | 'error' | 'warning' | 'info')
 */
(function () {
    let container = null;

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

        /* Confirm toast buttons */
        .toast-confirm-actions {
            display: flex;
            gap: 8px;
            margin-top: 4px;
        }
        .toast-btn {
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity .2s;
        }
        .toast-btn:hover { opacity: .85; }
        .toast-btn-confirm {
            background: rgba(239,68,68,.95);
            color: #fff;
        }
        .toast-btn-cancel {
            background: rgba(0,0,0,.2);
            color: #1a1a2e;
        }
    `;
    document.head.appendChild(style);

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

    /**
     * Show a confirmation toast with Confirm / Cancel buttons.
     * Only one confirm toast is visible at a time.
     * @param {string} message  – text to display
     * @param {Function} onConfirm – callback when user clicks Confirm
     */
    let activeConfirmToast = null;
    window.showConfirmToast = function (message, onConfirm) {
        // Prevent duplicates
        if (activeConfirmToast && activeConfirmToast.parentNode) {
            dismiss(activeConfirmToast);
        }

        const c = ensureContainer();

        const toast = document.createElement('div');
        toast.className = 'toast toast-warning';
        toast.style.cursor = 'default';
        toast.innerHTML = `
            <span class="toast-icon">${ICONS.warning}</span>
            <div class="toast-body">
                <div style="margin-bottom:10px">${message}</div>
                <div class="toast-confirm-actions">
                    <button class="toast-btn toast-btn-confirm">Confirm</button>
                    <button class="toast-btn toast-btn-cancel">Cancel</button>
                </div>
            </div>
        `;

        // Stop click-to-dismiss on the whole toast
        toast.removeEventListener('click', () => {});

        toast.querySelector('.toast-btn-confirm').addEventListener('click', () => {
            dismiss(toast);
            activeConfirmToast = null;
            if (onConfirm) onConfirm();
        });

        toast.querySelector('.toast-btn-cancel').addEventListener('click', () => {
            dismiss(toast);
            activeConfirmToast = null;
        });

        c.appendChild(toast);
        activeConfirmToast = toast;
    };
})();
