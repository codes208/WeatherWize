document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/';
        return;
    }

    document.getElementById('username-display').textContent = user.username || '';

    const savedLocationsContainer = document.getElementById('saved-locations-list');

    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/';
    });

    const alertsBtn = document.getElementById('alerts-manager-btn');
    if (alertsBtn) alertsBtn.addEventListener('click', () => {
        window.location.href = `/alerts-manager?token=${token}`;
    });

    async function fetchWeatherData(location, lat, lon) {
        let url = `/api/weather?location=${encodeURIComponent(location)}`;
        if (lat && lon) {
            url += `&lat=${lat}&lon=${lon}`;
        }
        const response = await fetchWithAuth(url);

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error fetching weather');
        }
        return data;
    }

    async function loadSavedLocations() {
        try {
            const response = await fetchWithAuth('/api/weather/saved');
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
                    let navUrl = `/weather-details?location=${encodeURIComponent(location)}`;
                    if (lat && lon) navUrl += `&lat=${lat}&lon=${lon}`;
                    window.location.href = navUrl;
                });

                if (weather) {
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h4 class="location-title">${weather.location}</h4>
                                <div class="location-temp">${Math.round(weather.temp)}&deg;F</div>
                                <div class="location-meta">
                                    <span>Humidity: <span class="meta-value">${weather.humidity}%</span></span>
                                    <span>Wind: <span class="meta-value">${weather.windSpeed} mph</span></span>
                                </div>
                            </div>
                            ${conditionIcon(weather.condition)}
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

    // Advanced features
    if (user.role === 'advanced' || user.role === 'admin') {
        const precipMapSection = document.getElementById('precip-map-section');
        if (precipMapSection && document.getElementById('precip-map')) {
            let precipMap = null;
            let radarFrames = [];
            let radarLayers = [];
            let currentFrameIndex = 0;
            let animationInterval = null;
            let isPlaying = false;

            async function initMap(lat, lon) {
                precipMapSection.classList.remove('hidden');
                if (!precipMap) {
                    precipMap = L.map('precip-map').setView([lat, lon], 7);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(precipMap);
                } else {
                    precipMap.setView([lat, lon], 7);
                }
                setTimeout(() => precipMap.invalidateSize(), 100);
            }

            const locToLoad = localStorage.getItem('lastMapLocation');
            if (locToLoad) {
            }
        }
    }

    window.addEventListener('pageshow', (e) => {
        if (e.persisted && savedLocationsContainer) {
            loadSavedLocations();
        }
    });
});
