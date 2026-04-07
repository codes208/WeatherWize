/**
 * @file public/js/weather-dashboard.js
 * @description Unified dashboard logic for all user tiers.
 *
 * Features:
 *  - Saved locations loading and rendering
 *  - Geocoding and API weather bypass
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('username-display').textContent = user.username || '';

    const savedLocationsContainer = document.getElementById('saved-locations-list');

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    async function fetchWeatherData(location, lat, lon) {
        let url = `/api/weather?location=${encodeURIComponent(location)}`;
        if (lat && lon) {
            url += `&lat=${lat}&lon=${lon}`;
        }
        const response = await fetch(url, {
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

            savedLocationsContainer.innerHTML = '';
            if (!locations.length) {
                savedLocationsContainer.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
                return;
            }

            const weatherTiles = await Promise.all(
                locations.map(async (loc) => {
                    try {
                        const weather = await fetchWeatherData(loc.location_name, loc.lat, loc.lon);
                        return { id: loc.id, location: loc.location_name, lat: loc.lat, lon: loc.lon, weather };
                    } catch (error) {
                        return { id: loc.id, location: loc.location_name, lat: loc.lat, lon: loc.lon, weather: null };
                    }
                })
            );

            weatherTiles.forEach(({ location, lat, lon, weather }) => {
                const card = document.createElement('article');
                card.className = 'location-card weather-location-card';
                card.addEventListener('click', () => {
                    localStorage.setItem('lastMapLocation', location);
                    let navUrl = `weather-details.html?location=${encodeURIComponent(location)}`;
                    if (lat && lon) navUrl += `&lat=${lat}&lon=${lon}`;
                    window.location.href = navUrl;
                });

                if (weather) {
                    card.innerHTML = `
                        <h4 class="location-title">${weather.location}</h4>
                        <div class="location-temp">${Math.round(weather.temp)}&deg;F</div>
                        <div class="location-condition">${weather.condition}</div>
                        <div class="location-meta">
                            <span>Humidity: <span class="meta-value">${weather.humidity}%</span></span>
                            <span>Wind: <span class="meta-value">${weather.windSpeed} mph</span></span>
                        </div>
                    `;
                } else {
                    card.innerHTML = `
                        <h4 class="location-title">${location}</h4>
                        <div class="location-condition">Weather unavailable</div>
                    `;
                }

                savedLocationsContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            if (savedLocationsContainer) {
                 savedLocationsContainer.innerHTML = '<p class="empty-state">Unable to load saved locations.</p>';
            }
        }
    }

    if (savedLocationsContainer) {
        loadSavedLocations();
    }

    // Advanced features guard
    if (user.role === 'advanced' || user.role === 'admin') {
        const precipMapSection = document.getElementById('precip-map-section');
        if (precipMapSection && document.getElementById('precip-map')) {
            let precipMap = null;
            let radarFrames = [];
            let radarLayers = [];
            let currentFrameIndex = 0;
            let animationInterval = null;
            let isPlaying = false;

            // Simple map bootstrapper
            async function initMap(lat, lon) {
                precipMapSection.classList.remove('hidden');
                if (!precipMap) {
                    precipMap = L.map('precip-map').setView([lat, lon], 7);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(precipMap);
                    // OpenWeather layers can be mapped safely via backend. For now default to basic views.
                } else {
                    precipMap.setView([lat, lon], 7);
                }
                setTimeout(() => precipMap.invalidateSize(), 100);
            }

            // Bind the lastMapLocation directly on boot if possible
            const locToLoad = localStorage.getItem('lastMapLocation');
            if (locToLoad) {
                // Future expansion: auto-load map natively from cached lat/lon here!
            }
        }
    }
});
