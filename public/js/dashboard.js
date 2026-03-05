document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Set user name
    document.getElementById('username-display').textContent = user.username;

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    const weatherForm = document.getElementById('weather-form');
    const weatherResult = document.getElementById('weather-result');
    const hourlyReport = document.getElementById('hourly-report');
    const hourlyReportList = document.getElementById('hourly-report-list');
    const savedLocationsContainer = document.getElementById('saved-locations-list');
    const saveLocationBtn = document.getElementById('save-location-btn');

    const savedLocationNames = new Set();
    const precipMapSection = document.getElementById('precip-map-section');
    let precipMap = null;
    let radarFrames = [];
    let radarLayers = [];
    let currentFrameIndex = 0;
    let animationInterval = null;
    let isPlaying = false;

    async function initOrUpdateMap(lat, lon) {
        precipMapSection.classList.remove('hidden');

        if (!precipMap) {
            precipMap = L.map('precip-map').setView([lat, lon], 7);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(precipMap);

            // Custom pane with blur to smooth out radar tile edges
            precipMap.createPane('radarPane');
            precipMap.getPane('radarPane').style.filter = 'blur(2px)';
            precipMap.getPane('radarPane').style.zIndex = 300;

            await loadRadarFrames();

            document.getElementById('radar-play-btn').addEventListener('click', () => {
                if (isPlaying) stopAnimation();
                else startAnimation();
            });
        } else {
            precipMap.setView([lat, lon], 7);
        }

        setTimeout(() => precipMap.invalidateSize(), 100);
    }

    async function loadRadarFrames() {
        try {
            const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await response.json();

            radarFrames = [
                ...(data.radar.past || []),
                ...(data.radar.nowcast || [])
            ];

            radarLayers.forEach(layer => precipMap.removeLayer(layer));
            radarLayers = [];

            radarFrames.forEach((frame) => {
                const layer = L.tileLayer(
                    `https://tilecache.rainviewer.com${frame.path}/512/{z}/{x}/{y}/6/1_1.png`,
                    {
                        opacity: 0,
                        attribution: '&copy; RainViewer',
                        tileSize: 512,
                        zoomOffset: -1,
                        maxNativeZoom: 8,
                        maxZoom: 18,
                        pane: 'radarPane'
                    }
                );
                layer.addTo(precipMap);
                radarLayers.push(layer);
            });

            currentFrameIndex = radarFrames.length - 1;
            showFrame(currentFrameIndex);
            startAnimation();
        } catch (err) {
            console.error('Failed to load radar frames', err);
        }
    }

    function showFrame(index) {
        radarLayers.forEach((layer, i) => layer.setOpacity(i === index ? 0.85 : 0));
        const frame = radarFrames[index];
        if (frame) {
            const date = new Date(frame.time * 1000);
            const timeStr = date.toLocaleTimeString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
            document.getElementById('radar-timestamp').textContent = timeStr;
        }
        document.getElementById('radar-frame-label').textContent =
            index >= radarFrames.filter(f => !f.nowcast).length ? '(Forecast)' : '';
    }

    function startAnimation() {
        if (animationInterval) clearInterval(animationInterval);
        isPlaying = true;
        document.getElementById('radar-play-btn').innerHTML = '&#9646;&#9646;';
        animationInterval = setInterval(() => {
            currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length;
            showFrame(currentFrameIndex);
        }, 600);
    }

    function stopAnimation() {
        clearInterval(animationInterval);
        animationInterval = null;
        isPlaying = false;
        document.getElementById('radar-play-btn').textContent = '\u25B6';
    }

    // Close weather card
    document.getElementById('close-weather-btn').addEventListener('click', () => {
        weatherResult.classList.add('hidden');
        hourlyReport.classList.add('hidden');
        precipMapSection.classList.add('hidden');
    });

    // Save Location
    document.getElementById('save-location-btn').addEventListener('click', async () => {
        const location = document.getElementById('location-name').textContent;
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

            saveLocationBtn.classList.add('hidden');
            if (response.ok) {
                loadSavedLocations();
            }
        } catch (error) {
            console.error(error);
        }
    });

    // Fetch Weather
    weatherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = weatherForm.location.value;
        await fetchWeather(location);
    });

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

    async function fetchWeather(location) {
        try {
            const data = await fetchWeatherData(location);
            displayWeather(data);
            weatherResult.classList.remove('hidden');
            if (data.lat != null && data.lon != null) {
                initOrUpdateMap(data.lat, data.lon);
            }
            try {
                await loadHourlyForecast(location);
                hourlyReport.classList.remove('hidden');
            } catch (error) {
                console.error(error);
                hourlyReport.classList.add('hidden');
                showToast(error.message || 'Error fetching hourly forecast', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error fetching weather', 'error');
        }
    }

    function displayWeather(data) {
        document.getElementById('location-name').textContent = data.location;
        document.getElementById('temp-value').textContent = Math.round(data.temp);
        document.getElementById('condition-text').textContent = data.condition;
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
        document.getElementById('wind-value').textContent = `${data.windSpeed} mph`;

        const feelsLikeEl = document.getElementById('feels-like-text');
        if (data.feelsLike != null) {
            feelsLikeEl.innerHTML = `Feels like: <span class="hi-lo-value">${Math.round(data.feelsLike)}°F</span>`;
        } else {
            feelsLikeEl.textContent = '';
        }

        const hiLoEl = document.getElementById('hi-lo-text');
        if (data.tempHigh != null && data.tempLow != null) {
            hiLoEl.innerHTML = `Hi: <span class="hi-lo-value">${Math.round(data.tempHigh)}°F</span>  |  Lo: <span class="hi-lo-value">${Math.round(data.tempLow)}°F</span>`;
        } else {
            hiLoEl.textContent = '';
        }

        const aqiEl = document.getElementById('aqi-value');
        if (data.airQuality) {
            aqiEl.textContent = data.airQuality.label;
            aqiEl.dataset.aqi = data.airQuality.index;
        } else {
            aqiEl.textContent = '--';
            delete aqiEl.dataset.aqi;
        }

        saveLocationBtn.classList.toggle('hidden', savedLocationNames.has(data.location.toLowerCase()));
    }

    function formatForecastTime(dtText) {
        const date = new Date(dtText.replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) return dtText;
        return date.toLocaleString([], {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    async function loadHourlyForecast(location) {
        const response = await fetch(`/api/weather/hourly?location=${encodeURIComponent(location)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error fetching hourly forecast');
        }

        hourlyReportList.innerHTML = '';
        data.intervals.forEach((slot) => {
            const card = document.createElement('article');
            card.className = 'hourly-card';
            card.innerHTML = `
                <div class="hourly-time">${formatForecastTime(slot.time)}</div>
                <div class="hourly-temp">${Math.round(slot.temp)}&deg;F</div>
                <div class="hourly-condition">${slot.condition}</div>
                <div class="hourly-meta">Humidity <span class="meta-value">${slot.humidity}%</span></div>
                <div class="hourly-meta">Wind <span class="meta-value">${slot.windSpeed} mph</span></div>
            `;
            hourlyReportList.appendChild(card);
        });
    }

    async function loadSavedLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const locations = await response.json();

            savedLocationNames.clear();
            locations.forEach(loc => savedLocationNames.add(loc.location_name.toLowerCase()));

            savedLocationsContainer.innerHTML = '';
            if (!locations.length) {
                savedLocationsContainer.innerHTML = '<p class="empty-state">No saved locations yet.</p>';
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

            weatherTiles.forEach(({ location, weather }) => {
                const card = document.createElement('article');
                card.className = 'location-card weather-location-card';
                card.addEventListener('click', () => {
                    window.location.href = `weather-details.html?location=${encodeURIComponent(location)}`;
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
            savedLocationsContainer.innerHTML = '<p class="empty-state">Unable to load saved locations.</p>';
        }
    }

    // specific initialization
    loadSavedLocations();
});
