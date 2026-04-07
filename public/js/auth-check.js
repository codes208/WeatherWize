/**
 * @file public/js/auth-check.js
 * @description Global authentication guard loaded on every protected page.
 *
 * Responsibilities:
 *  - Redirects to login if no JWT token is present
 *  - Enforces role-based page access via data-allowed-roles attribute on <body>
 *  - Redirects unauthorized users to their correct dashboard
 *  - Wires up logout button (clears localStorage)
 *  - Overrides nav-brand click to redirect by role (admin → admin-dashboard, etc.)
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Role Guard
    const allowedRoles = document.body.dataset.allowedRoles ? document.body.dataset.allowedRoles.split(',') : ['general', 'advanced', 'admin'];
    if (!allowedRoles.includes(user.role)) {
        showToast('Unauthorized access. Redirecting...', 'warning');
        if (user.role === 'admin') window.location.href = '/admin-dashboard.html';
        else if (user.role === 'advanced') window.location.href = '/advanced-dashboard.html';
        else window.location.href = '/dashboard.html';
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

    // Fix Logo Link Redirection based on Role
    const navBrands = document.querySelectorAll('.nav-brand');
    navBrands.forEach(brand => {
        brand.addEventListener('click', (e) => {
            e.preventDefault();
            if (user.role === 'admin') window.location.href = '/admin-dashboard.html';
            else if (user.role === 'advanced') window.location.href = '/advanced-dashboard.html';
            else window.location.href = '/dashboard.html';
        });
    });

    // Start background notification poller if token exists
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
                            // Display as a red box, non-dismissing unless clicked (duration 0)
                            window.showToast(notification.message, 'error', 0);
                        }
                        idsToMark.push(notification.id);
                    });

                    // Mark as read
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
        }, 15000); // Check every 15s instead of 30 for faster demo
    }
});
