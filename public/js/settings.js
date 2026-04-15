document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) return;

    const maintenanceToggle = document.getElementById('maintenance-toggle');
    const saveBtn = document.getElementById('save-settings-btn');
    const msgDiv = document.getElementById('settings-message');

    // Populate username in nav
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = user.username || '';

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
        saveBtn.addEventListener('click', async () => {
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
