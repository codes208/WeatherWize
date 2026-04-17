document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) return;

    const maintenanceToggle = document.getElementById('maintenance-toggle');
    const saveBtn = document.getElementById('save-settings-btn');
    const msgDiv = document.getElementById('settings-message');

    async function loadSettings() {
        try {
            const response = await fetchWithAuth('/api/settings');
            if (!response.ok) return;
            const settings = await response.json();

            if (maintenanceToggle) {
                maintenanceToggle.checked = settings.maintenance_mode === 'true';
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            showInlineConfirm(msgDiv, 'Save system configuration?', async () => {
                try {
                    const response = await fetchWithAuth('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            maintenance_mode: maintenanceToggle ? maintenanceToggle.checked : undefined
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        clearMsg(msgDiv);
                        showMsg(msgDiv, data.message, 'success');
                    } else {
                        showMsg(msgDiv, data.message, 'error', false);
                    }
                } catch (e) {
                    showMsg(msgDiv, 'Error saving settings.', 'error', false);
                }
            });
        });
    }


    loadSettings();
});
