document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const maintenanceToggle = document.getElementById('maintenance-toggle');
    const throttleInput = document.getElementById('throttle-input');
    const saveBtn = document.getElementById('save-settings-btn');
    const msgDiv = document.getElementById('settings-message');

    // Load current settings
    async function loadSettings() {
        try {
            const response = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const settings = await response.json();

            if (maintenanceToggle) {
                maintenanceToggle.checked = settings.maintenance_mode === 'true';
            }
            if (throttleInput && settings.api_throttle_limit) {
                throttleInput.value = settings.api_throttle_limit;
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    // Save settings
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        maintenance_mode: maintenanceToggle ? maintenanceToggle.checked : undefined,
                        api_throttle_limit: throttleInput ? throttleInput.value : undefined
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showMsg(data.message, 'success');
                } else {
                    showMsg(data.message, 'error');
                }
            } catch (e) {
                showMsg('Error saving settings.', 'error');
            }
        });
    }

    function showMsg(text, type) {
        if (!msgDiv) return;
        msgDiv.textContent = text;
        msgDiv.style.display = 'block';
        msgDiv.className = type === 'success' ? 'text-center text-success' : 'text-center text-danger';
        setTimeout(() => { msgDiv.style.display = 'none'; }, 4000);
    }

    loadSettings();
});
