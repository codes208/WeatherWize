document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const locationSelect  = document.getElementById('alert-location');
    const triggerSelect   = document.getElementById('alert-trigger');
    const thresholdMin    = document.getElementById('alert-threshold-min');
    const thresholdMax    = document.getElementById('alert-threshold-max');
    const saveBtn         = document.getElementById('save-alert-btn');
    const alertsList      = document.getElementById('alerts-list');
    const alertMessage    = document.getElementById('alert-message');


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
            showMsg(alertMessage,'Please enter both min and max values.', 'error', false);
            return;
        }

        if (Number(threshold_min) >= Number(threshold_max)) {
            showMsg(alertMessage,'Min must be less than max.', 'error', false);
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
                clearMsg(alertMessage);
                window.location.reload();
            } else {
                showMsg(alertMessage,data.message, 'error', false);
            }
        } catch (e) {
            showMsg(alertMessage,'Error saving alert.', 'error', false);
        }
    });

    // ── Event delegation for server-rendered alert buttons ─────
    alertsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id           = btn.dataset.id;
        const action       = btn.dataset.action;
        const locationName = btn.dataset.location;
        const cardMsg      = btn.closest('.location-card').querySelector('.location-msg');
        if (action === 'delete')  await deleteAlert(id, locationName, cardMsg);
        if (action === 'enable')  await enableAlert(id, cardMsg);
        if (action === 'disable') await disableAlert(id, locationName, cardMsg);
    });

    async function deleteAlert(id, locationName, cardMsg) {
        showInlineConfirm(cardMsg, `Remove alert for "${locationName}"?`, async () => {
            try {
                const response = await fetch(`/api/alerts/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    clearMsg(alertMessage);
                    window.location.reload();
                } else {
                    const data = await response.json();
                    showMsg(cardMsg, data.message || 'Error deleting alert', 'error', false);
                }
            } catch (e) {
                showMsg(cardMsg, 'Error deleting alert', 'error', false);
            }
        });
    }

    async function disableAlert(id, locationName, cardMsg) {
        showInlineConfirm(cardMsg, `Disable alert for "${locationName}"?`, async () => {
            try {
                const response = await fetch(`/api/alerts/${id}/disable`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    clearMsg(alertMessage);
                    window.location.reload();
                } else {
                    const data = await response.json();
                    showMsg(cardMsg, data.message || 'Error disabling alert', 'error', false);
                }
            } catch (e) {
                showMsg(cardMsg, 'Error disabling alert', 'error', false);
            }
        });
    }

    async function enableAlert(id, cardMsg) {
        try {
            const response = await fetch(`/api/alerts/${id}/enable`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                clearMsg(alertMessage);
                window.location.reload();
            } else {
                const data = await response.json();
                showMsg(cardMsg, data.message || 'Error re-enabling alert', 'error', false);
            }
        } catch (e) {
            showMsg(cardMsg, 'Error re-enabling alert', 'error', false);
        }
    }


    loadLocations();
});
