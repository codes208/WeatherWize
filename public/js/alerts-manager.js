document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) return;

    const locationSelect  = document.getElementById('alert-location');
    const triggerSelect   = document.getElementById('alert-trigger');
    const thresholdMin    = document.getElementById('alert-threshold-min');
    const thresholdMax    = document.getElementById('alert-threshold-max');
    const saveBtn         = document.getElementById('save-alert-btn');
    const alertsList      = document.getElementById('alerts-list');
    const alertMessage    = document.getElementById('alert-message');

    // Populate username in nav
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = user.username || '';

    // ── Load saved locations into dropdown ─────────────────────
    async function loadLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` },
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

    // ── Save alert ─────────────────────────────────────────────
    saveBtn.addEventListener('click', async () => {
        const location_name  = locationSelect.value;
        const trigger_type   = triggerSelect.value;
        const threshold_min  = thresholdMin.value.trim();
        const threshold_max  = thresholdMax.value.trim();

        if (!threshold_min || !threshold_max) {
            showMsg('Please enter both min and max values.', 'error');
            return;
        }

        if (Number(threshold_min) >= Number(threshold_max)) {
            showMsg('Min must be less than max.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ location_name, trigger_type, threshold_min, threshold_max }),
            });

            const data = await response.json();
            if (response.ok) {
                window.location.reload();
            } else {
                showMsg(data.message, 'error');
            }
        } catch (e) {
            showMsg('Error saving alert.', 'error');
        }
    });

    // ── Event delegation for server-rendered alert buttons ─────
    alertsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id     = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'delete') await deleteAlert(id);
        if (action === 'enable') await enableAlert(id);
    });

    async function deleteAlert(id) {
        try {
            const response = await fetch(`/api/alerts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                window.location.reload();
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error deleting alert', 'error');
            }
        } catch (e) {
            showMsg('Error deleting alert', 'error');
        }
    }

    async function enableAlert(id) {
        try {
            const response = await fetch(`/api/alerts/${id}/enable`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                window.location.reload();
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error re-enabling alert', 'error');
            }
        } catch (e) {
            showMsg('Error re-enabling alert', 'error');
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
});
