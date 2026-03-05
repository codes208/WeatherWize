/**
 * @file public/js/weather-details.js
 * @description Detailed weather view for a specific city.
 *
 * Features:
 *  - Reads city name from URL query parameter (?city=...)
 *  - Fetches current weather from /api/weather
 *  - Displays temperature, conditions, wind, humidity, pressure, UV, AQI
 *  - Fetches and renders hourly forecast from /api/weather/hourly
 *  - "View on Map" button to open radar map for the city
 */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    const params = new URLSearchParams(window.location.search);
    const location = params.get('location');

    if (!location) {
        window.history.back();
        return;
    }

    document.title = `${location} - WeatherWize`;

    const weatherResult = document.getElementById('weather-result');
    const precipMapSection = document.getElementById('precip-map-section');
    const hourlyReport = document.getElementById('hourly-report');
    const hourlyReportList = document.getElementById('hourly-report-list');
    const errorMessage = document.getElementById('error-message');

    let precipMap = null;
    let radarFrames = [];
    let radarLayers = [];
    let currentFrameIndex = 0;
    let animationInterval = null;
    let isPlaying = false;

    async function initMap(lat, lon) {
        precipMapSection.classList.remove('hidden');

        precipMap = L.map('precip-map').setView([lat, lon], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(precipMap);

        precipMap.createPane('radarPane');
        precipMap.getPane('radarPane').style.filter = 'blur(2px)';
        precipMap.getPane('radarPane').style.zIndex = 300;

        await loadRadarFrames();

        document.getElementById('radar-play-btn').addEventListener('click', () => {
            if (isPlaying) stopAnimation();
            else startAnimation();
        });

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

    function formatForecastTime(dtText) {
        const date = new Date(dtText.replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) return dtText;
        return date.toLocaleString([], {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    // Load current weather
    try {
        const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error fetching weather');

        document.getElementById('location-name').textContent = data.location;
        document.getElementById('temp-value').textContent = Math.round(data.temp);
        document.getElementById('condition-text').textContent = data.condition;
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
        document.getElementById('wind-value').textContent = `${data.windSpeed} mph`;

        const feelsLikeEl = document.getElementById('feels-like-text');
        if (data.feelsLike != null) {
            feelsLikeEl.innerHTML = `Feels like: <span class="hi-lo-value">${Math.round(data.feelsLike)}°F</span>`;
        }

        const hiLoEl = document.getElementById('hi-lo-text');
        if (data.tempHigh != null && data.tempLow != null) {
            hiLoEl.innerHTML = `Hi: <span class="hi-lo-value">${Math.round(data.tempHigh)}°F</span>  |  Lo: <span class="hi-lo-value">${Math.round(data.tempLow)}°F</span>`;
        }

        const aqiEl = document.getElementById('aqi-value');
        if (data.airQuality) {
            aqiEl.textContent = data.airQuality.label;
            aqiEl.dataset.aqi = data.airQuality.index;
        } else {
            aqiEl.textContent = '--';
        }

        weatherResult.classList.remove('hidden');

        if (data.lat != null && data.lon != null) {
            await initMap(data.lat, data.lon);
        }
    } catch (error) {
        console.error(error);
        errorMessage.classList.remove('hidden');
        return;
    }

    // Load hourly forecast
    try {
        const response = await fetch(`/api/weather/hourly?location=${encodeURIComponent(location)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error fetching hourly forecast');

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

        hourlyReport.classList.remove('hidden');
    } catch (error) {
        console.error(error);
    }
});
