document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const locationSelect = document.getElementById('alert-location');
    const triggerSelect = document.getElementById('alert-trigger');
    const thresholdInput = document.getElementById('alert-threshold');
    const saveBtn = document.getElementById('save-alert-btn');
    const alertsList = document.getElementById('alerts-list');
    const alertMessage = document.getElementById('alert-message');

    async function loadLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const locations = await response.json();

            locationSelect.innerHTML = '';
            if (locations.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = 'No saved locations — add one from your dashboard';
                opt.disabled = true;
                opt.selected = true;
                locationSelect.appendChild(opt);
                return;
            }
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.location_name;
                opt.textContent = loc.location_name;
                locationSelect.appendChild(opt);
            });
        } catch (e) {
            console.error('Error loading locations:', e);
        }
    }

    // Existing alerts
    async function loadAlerts() {
        try {
            const response = await fetch('/api/alerts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const alerts = await response.json();
            renderAlerts(alerts);
        } catch (e) {
            console.error('Error loading alerts:', e);
        }
    }

    function renderAlerts(alerts) {
        alertsList.innerHTML = '';
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No alerts configured.</p>';
            return;
        }
        alerts.forEach(alert => {
            const isActive = alert.is_active;
            const card = document.createElement('div');
            card.className = 'location-card';
            card.style.cssText = `margin-top: 15px; border-left: 4px solid ${isActive ? 'var(--danger)' : 'var(--border)'}; opacity: ${isActive ? '1' : '0.6'};`;
            card.innerHTML = `
                <h4>${alert.location_name} ${isActive ? '' : '<span style="font-size:0.75rem; color:var(--text-secondary);">(triggered — inactive)</span>'}</h4>
                <p style="color: var(--text-secondary);">Alert me if: ${alert.trigger_type} ${alert.threshold_value}°F</p>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    ${!isActive ? `<button class="btn" style="font-size:0.82rem; padding:6px 12px;" data-id="${alert.id}" data-action="enable">Re-enable</button>` : ''}
                    <button class="delete-location-btn" data-id="${alert.id}" data-action="delete">Delete</button>
                </div>
            `;
            card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteAlert(alert.id));
            const enableBtn = card.querySelector('[data-action="enable"]');
            if (enableBtn) enableBtn.addEventListener('click', () => enableAlert(alert.id));
            alertsList.appendChild(card);
        });
    }

    // Save alert
    saveBtn.addEventListener('click', async () => {
        const location_name = locationSelect.value;
        const trigger_type = triggerSelect.value;
        const threshold = thresholdInput.value.trim();

        if (!threshold) {
            showMsg('Please enter a threshold value.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ location_name, trigger_type, threshold })
            });

            const data = await response.json();
            if (response.ok) {
                showMsg(data.message, 'success');
                thresholdInput.value = '';
                loadAlerts();
            } else {
                showMsg(data.message, 'error');
            }
        } catch (e) {
            showMsg('Error saving alert.', 'error');
        }
    });

    async function enableAlert(id) {
        try {
            const response = await fetch(`/api/alerts/${id}/enable`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                loadAlerts();
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error re-enabling alert', 'error');
            }
        } catch (e) {
            showMsg('Error re-enabling alert', 'error');
        }
    }

    async function deleteAlert(id) {
        if (!confirm('Are you sure you want to delete this alert?')) return;
        try {
            const response = await fetch(`/api/alerts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                loadAlerts();
            } else {
                const data = await response.json();
                showToast(data.message || 'Error deleting alert', 'error');
            }
        } catch (e) {
            showToast('Error deleting alert', 'error');
        }
    }

    function showMsg(text, type) {
        if (!alertMessage) return;
        alertMessage.textContent = text;
        alertMessage.style.display = 'block';
        alertMessage.className = type === 'success' ? 'text-center text-success' : 'text-center text-danger';
        setTimeout(() => { alertMessage.style.display = 'none'; }, 4000);
    }

    loadLocations();
    loadAlerts();
});
