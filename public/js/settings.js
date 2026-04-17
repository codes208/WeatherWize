document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const maintenanceToggle = document.getElementById('maintenance-toggle');
    const saveBtn = document.getElementById('save-settings-btn');
    const msgDiv = document.getElementById('settings-message');

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
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            showInlineConfirm(msgDiv, 'Save system configuration?', async () => {
                try {
                    const response = await fetch('/api/settings', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
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
