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
        alert('Unauthorized access. Redirecting...');
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
});
