document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/';
        return;
    }

    // Populate username in navbar on every authenticated page
    const usernameEl = document.getElementById('username-display');
    if (usernameEl) usernameEl.textContent = user.username || '';

    const allowedRoles = document.body.dataset.allowedRoles ? document.body.dataset.allowedRoles.split(',') : ['general', 'advanced', 'admin'];
    if (!allowedRoles.includes(user.role)) {
        showToast('Unauthorized access. Redirecting...', 'warning');
        if (user.role === 'admin') window.location.href = `/admin-dashboard?token=${token}`;
        else window.location.href = `/dashboard?token=${token}`;
        return;
    }

    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/';
        });
    });

    const navBrands = document.querySelectorAll('.nav-brand');
    navBrands.forEach(brand => {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            if (user.role === 'admin') window.location.href = `/admin-dashboard?token=${token}`;
            else window.location.href = `/dashboard?token=${token}`;
        });
    });

    const bannerKey = `activeAlertBanners_${user.id}`;

    // Re-show any persisted alert banners on every page load
    const storedBanners = JSON.parse(sessionStorage.getItem(bannerKey) || '[]');
    storedBanners.forEach(({ id, message }) => {
        if (window.showAlertBanner) window.showAlertBanner(message, 'error', id, bannerKey);
    });

    // Clear other users' banners from sessionStorage to prevent stale data accumulation
    Object.keys(sessionStorage)
        .filter(k => k.startsWith('activeAlertBanners_') && k !== bannerKey)
        .forEach(k => sessionStorage.removeItem(k));

    // Start background notification poller
    if (token) {
        let pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/alerts/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401) {
                    clearInterval(pollInterval);
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }

                // Suspended — force sign-out
                if (response.status === 403) {
                    clearInterval(pollInterval);
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }

                // Maintenance mode — reload to show server maintenance page
                if (response.status === 503) {
                    clearInterval(pollInterval);
                    window.location.reload();
                    return;
                }

                if (!response.ok) return;
                const notifications = await response.json();

                if (notifications && notifications.length > 0) {
                    const idsToMark = [];
                    const stored = JSON.parse(sessionStorage.getItem(bannerKey) || '[]');

                    notifications.forEach(notification => {
                        if (!stored.find(b => b.id === notification.id)) {
                            stored.push({ id: notification.id, message: notification.message });
                        }
                        if (window.showAlertBanner) {
                            window.showAlertBanner(notification.message, 'error', notification.id, bannerKey);
                        }
                        idsToMark.push(notification.id);
                    });

                    // Let page-specific scripts react to new alerts firing
                    document.dispatchEvent(new CustomEvent('alertsUpdated'));

                    sessionStorage.setItem(bannerKey, JSON.stringify(stored));

                    await fetch('/api/alerts/notifications/read', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ notificationIds: idsToMark })
                    });
                }
            } catch (err) {
                // Silently ignore polling errors
            }
        }, 15000);
    }
});
