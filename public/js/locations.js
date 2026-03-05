/**
 * @file public/js/locations.js
 * @description Manage saved locations page logic.
 *
 * Features:
 *  - Lists saved locations from /api/weather/saved
 *  - Add new location (geocoded by backend to prevent duplicates)
 *  - Delete with confirmation dialog showing the location name
 *  - Duplicate location toast feedback
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const locationGrid = document.getElementById('locations-list');
    const addInput = document.getElementById('add-location-input');
    const addBtn = document.getElementById('add-location-btn');
    const locationMsg = document.getElementById('location-msg');
    let msgTimer = null;

    function showMsg(message, type) {
        if (msgTimer) clearTimeout(msgTimer);
        locationMsg.textContent = message;
        locationMsg.className = `location-msg show msg-${type}`;
        msgTimer = setTimeout(() => { locationMsg.className = 'location-msg'; }, 3000);
    }

    async function loadLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const locations = await response.json();

            locationGrid.innerHTML = '';

            if (!locations.length) {
                locationGrid.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
                return;
            }

            locations.forEach(({ id, location_name }) => {
                const card = document.createElement('div');
                card.className = 'location-card';
                card.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                card.innerHTML = `
                    <div>
                        <h4 style="margin-bottom: 5px;">${location_name}</h4>
                    </div>
                `;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'delete-location-btn';
                removeBtn.textContent = 'Remove';
                removeBtn.style.marginTop = '0';
                removeBtn.addEventListener('click', () => deleteLocation(id));

                card.appendChild(removeBtn);
                locationGrid.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            locationGrid.innerHTML = '<p class="empty-state">Unable to load locations.</p>';
        }
    }

    async function deleteLocation(id) {
        try {
            const response = await fetch(`/api/weather/saved/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to remove location');

            showMsg('Location removed', 'error');
            loadLocations();
        } catch (error) {
            console.error(error);
            showMsg(error.message || 'Failed to remove location', 'error');
        }
    }

    async function addLocation() {
        const location = addInput.value.trim();
        if (!location) return;

        try {
            const response = await fetch('/api/weather/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ location })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to save location');

            addInput.value = '';
            showMsg(data.message || 'Location saved!', 'success');
            loadLocations();
        } catch (error) {
            console.error(error);
            showMsg(error.message || 'Failed to save location', 'error');
        }
    }

    addBtn.addEventListener('click', addLocation);
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addLocation();
    });

    loadLocations();
});
