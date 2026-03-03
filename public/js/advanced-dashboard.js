document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const searchInput = document.getElementById('city-search');
    const searchBtn = document.getElementById('search-btn');
    const locationsContainer = document.querySelector('.location-grid');

    const savedLocationNames = new Set();

    async function fetchWeatherData(location) {
        const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error fetching weather');
        }
        return data;
    }

    async function loadSavedLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const locations = await response.json();

            savedLocationNames.clear();
            locations.forEach(loc => savedLocationNames.add(loc.location_name.toLowerCase()));

            locationsContainer.innerHTML = '';
            if (!locations.length) {
                locationsContainer.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
                return;
            }

            const weatherTiles = await Promise.all(
                locations.map(async (loc) => {
                    try {
                        const weather = await fetchWeatherData(loc.location_name);
                        return { id: loc.id, location: loc.location_name, weather };
                    } catch (error) {
                        return { id: loc.id, location: loc.location_name, weather: null };
                    }
                })
            );

            weatherTiles.forEach(({ id, location, weather }) => {
                const card = document.createElement('a');
                card.href = `weather-details.html?location=${encodeURIComponent(location)}`;
                card.className = 'location-card weather-location-card';

                if (weather) {
                    card.innerHTML = `
                        <h4 class="location-title">${weather.location}</h4>
                        <div class="location-temp">${Math.round(weather.temp)}&deg;F</div>
                        <div class="location-condition">${weather.condition}</div>
                        <div class="location-meta">
                            <span>Hum: <span class="meta-value">${weather.humidity}%</span></span>
                            <span>Wind: <span class="meta-value">${weather.windSpeed} mph</span></span>
                        </div>
                    `;
                } else {
                    card.innerHTML = `
                        <h4 class="location-title">${location}</h4>
                        <div class="location-condition">Weather unavailable</div>
                    `;
                }

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'delete-location-btn';
                deleteBtn.textContent = 'Remove';
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await deleteSavedLocation(id);
                });

                card.appendChild(deleteBtn);
                locationsContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            locationsContainer.innerHTML = '<p class="empty-state">Unable to load saved locations.</p>';
        }
    }

    searchBtn.addEventListener('click', async () => {
        const location = searchInput.value;
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

            if (response.ok) {
                searchInput.value = '';
                loadSavedLocations();
            } else {
                alert('Error saving location');
            }
        } catch (error) {
            console.error(error);
        }
    });

    async function deleteSavedLocation(locationId) {
        try {
            const response = await fetch(`/api/weather/saved/${locationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete location');
            await loadSavedLocations();
        } catch (error) {
            console.error(error);
            alert('Failed to delete location');
        }
    }

    loadSavedLocations();
});
