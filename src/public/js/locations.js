document.addEventListener('DOMContentLoaded', () => {
    const locationGrid = document.getElementById('locations-list');
    const addInput = document.getElementById('add-location-input');
    const addBtn = document.getElementById('add-location-btn');
    const locationMsg = document.getElementById('location-msg');

    async function loadLocations() {
        try {
            const response = await fetchWithAuth('/api/weather/saved');
            const locations = await response.json();

            locationGrid.innerHTML = '';

            if (!locations.length) {
                locationGrid.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
                return;
            }

            locations.forEach(({ id, location_name }) => {
                const card = document.createElement('div');
                card.className = 'location-card';
                const row = document.createElement('div');
                row.className = 'location-card-row';
                row.innerHTML = `<h4>${location_name}</h4>`;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'delete-location-btn';
                removeBtn.textContent = 'Remove';
                removeBtn.style.marginTop = '0';

                const cardMsg = document.createElement('span');
                cardMsg.className = 'location-msg';

                removeBtn.addEventListener('click', () => deleteLocation(id, location_name, cardMsg));

                row.appendChild(removeBtn);
                card.appendChild(row);
                card.appendChild(cardMsg);
                locationGrid.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            locationGrid.innerHTML = '<p class="empty-state">Unable to load locations.</p>';
        }
    }

    async function deleteLocation(id, locationName, cardMsg) {
        showInlineConfirm(cardMsg, `Remove "${locationName}"?`, async () => {
            try {
                const response = await fetchWithAuth(`/api/weather/saved/${id}`, { method: 'DELETE' });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to remove location');

                loadLocations();
            } catch (error) {
                console.error(error);
                showMsg(cardMsg, error.message || 'Failed to remove location', 'error', false);
            }
        });
    }

    async function addLocation() {
        const location = addInput.value.trim();
        if (!location) return;

        try {
            const response = await fetchWithAuth('/api/weather/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to save location');

            addInput.value = '';
            clearMsg(locationMsg);
            loadLocations();
        } catch (error) {
            console.error(error);
            showMsg(locationMsg, error.message || 'Failed to save location', 'error', false);
        }
    }

    addBtn.addEventListener('click', addLocation);
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addLocation();
    });

    loadLocations();
});
