document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const locationGrid = document.getElementById('locations-list');
    const addInput = document.getElementById('add-location-input');
    const addBtn = document.getElementById('add-location-btn');

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

            loadLocations();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to remove location', 'error');
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
            loadLocations();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to save location', 'error');
        }
    }

    addBtn.addEventListener('click', addLocation);
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addLocation();
    });

    loadLocations();
});
