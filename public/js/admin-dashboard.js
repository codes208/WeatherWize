/**
 * @file public/js/admin-dashboard.js
 * @description Admin dashboard logic — fetches and displays platform analytics.
 *
 * Calls /api/auth/stats to populate:
 *  - Total active users
 *  - Premium (advanced) subscribers
 *  - Total saved locations
 *  - Suspended users count
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const statsCards = {
        totalUsers: document.getElementById('stat-total-users'),
        premiumUsers: document.getElementById('stat-premium-users'),
        totalLocations: document.getElementById('stat-total-locations'),
        suspendedUsers: document.getElementById('stat-suspended-users')
    };

    async function loadStats() {
        try {
            const response = await fetch('/api/auth/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to load stats');

            const data = await response.json();

            if (statsCards.totalUsers) statsCards.totalUsers.textContent = data.totalUsers.toLocaleString();
            if (statsCards.premiumUsers) statsCards.premiumUsers.textContent = data.premiumUsers.toLocaleString();
            if (statsCards.totalLocations) statsCards.totalLocations.textContent = data.totalLocations.toLocaleString();
            if (statsCards.suspendedUsers) statsCards.suspendedUsers.textContent = data.suspendedUsers.toLocaleString();
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    loadStats();
});
