document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const allowedRoles = document.body.dataset.allowedRoles ? document.body.dataset.allowedRoles.split(',') : ['general', 'advanced', 'admin'];
    if (!allowedRoles.includes(user.role)) {
        showToast('Unauthorized access. Redirecting...', 'warning');
        if (user.role === 'admin') window.location.href = '/admin-dashboard.html';
        else if (user.role === 'advanced') window.location.href = '/dashboard';
        else window.location.href = '/dashboard';
        return;
    }

    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    });

    const navBrands = document.querySelectorAll('.nav-brand');
    navBrands.forEach(brand => {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            if (user.role === 'admin') window.location.href = '/admin-dashboard.html';
            else if (user.role === 'advanced') window.location.href = '/dashboard';
            else window.location.href = '/dashboard';
        });
    });

    // Re-show any toasts that were pending before a page reload
    const pendingToasts = sessionStorage.getItem('pendingToasts');
    if (pendingToasts) {
        sessionStorage.removeItem('pendingToasts');
        JSON.parse(pendingToasts).forEach(msg => {
            if (window.showToast) window.showToast(msg, 'error', 0);
        });
    }

    // Start background notification poller
    if (token) {
        let pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/alerts/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401) {
                    clearInterval(pollInterval);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/index.html';
                    return;
                }

                if (!response.ok) return;
                const notifications = await response.json();

                if (notifications && notifications.length > 0) {
                    const idsToMark = [];
                    notifications.forEach(notification => {
                        if (window.showToast) {
                            window.showToast(notification.message, 'error', 0);
                        }
                        idsToMark.push(notification.id);
                    });

                    await fetch('/api/alerts/notifications/read', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ notificationIds: idsToMark })
                    });

                    if (window.location.pathname === '/alerts-manager') {
                        sessionStorage.setItem('pendingToasts', JSON.stringify(idsToMark.map((_, i) => notifications[i].message)));
                        window.location.reload();
                        return;
                    }
                }
            } catch (err) {
                // Silently ignore polling errors
            }
        }, 15000);
    }
});
