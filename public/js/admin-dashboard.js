document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) return;

    const statsCards = {
        totalUsers: document.getElementById('stat-total-users'),
        premiumUsers: document.getElementById('stat-premium-users'),
        totalLocations: document.getElementById('stat-total-locations'),
        suspendedUsers: document.getElementById('stat-suspended-users')
    };

    async function loadStats() {
        try {
            const response = await fetchWithAuth('/api/auth/stats');

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

    // Load recent system alerts (recently triggered weather alerts across all users)
    async function loadSystemAlerts() {
        const container = document.getElementById('system-alerts-list');
        if (!container) return;

        try {
            const response = await fetchWithAuth('/api/alerts/system-recent');

            if (!response.ok) throw new Error('Failed to load system alerts');
            const alerts = await response.json();

            if (alerts.length === 0) {
                container.innerHTML = '<p class="text-secondary">No recent alerts triggered.</p>';
                return;
            }

            container.innerHTML = '';
            alerts.forEach(alert => {
                const timeAgo = getTimeAgo(new Date(alert.last_triggered_at));
                const div = document.createElement('div');
                div.className = 'location-card alert-card alert-card--active';
                div.innerHTML = `
                    <h4 class="alert-title">${alert.trigger_type}</h4>
                    <p>${timeAgo} — ${alert.location_name} (threshold: ${alert.threshold_value}°) — User: ${alert.username}</p>
                `;
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error loading system alerts:', error);
            if (container) container.innerHTML = '<p class="text-secondary">Unable to load system alerts.</p>';
        }
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    loadStats();
    loadSystemAlerts();
});
