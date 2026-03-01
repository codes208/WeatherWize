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

    // Close weather card
    document.getElementById('close-weather-btn').addEventListener('click', () => {
        weatherResult.classList.add('hidden');
        hourlyReport.classList.add('hidden');
    });

    // Fetch Weather
    weatherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = weatherForm.location.value;
        await fetchWeather(location);
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
            try {
                await loadHourlyForecast(location);
                hourlyReport.classList.remove('hidden');
            } catch (error) {
                console.error(error);
                hourlyReport.classList.add('hidden');
                alert(error.message || 'Error fetching hourly forecast');
            }
        } catch (error) {
            console.error(error);
            alert(error.message || 'Error fetching weather');
        }
    }

    function displayWeather(data) {
        document.getElementById('location-name').textContent = data.location;
        document.getElementById('temp-value').textContent = Math.round(data.temp);
        document.getElementById('condition-text').textContent = data.condition;
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
        document.getElementById('wind-value').textContent = `${data.windSpeed} mph`;
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
                <div class="hourly-meta">Humidity ${slot.humidity}%</div>
                <div class="hourly-meta">Wind ${slot.windSpeed} mph</div>
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

            weatherTiles.forEach(({ id, location, weather }) => {
                const card = document.createElement('article');
                card.className = 'location-card weather-location-card';
                card.addEventListener('click', () => fetchWeather(location));

                if (weather) {
                    card.innerHTML = `
                        <h4 class="location-title">${weather.location}</h4>
                        <div class="location-temp">${Math.round(weather.temp)}&deg;F</div>
                        <div class="location-condition">${weather.condition}</div>
                        <div class="location-meta">
                            <span>Humidity: ${weather.humidity}%</span>
                            <span>Wind: ${weather.windSpeed} mph</span>
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
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await deleteSavedLocation(id);
                });

                card.appendChild(deleteBtn);

                savedLocationsContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            savedLocationsContainer.innerHTML = '<p class="empty-state">Unable to load saved locations.</p>';
        }
    }

    async function deleteSavedLocation(locationId) {
        try {
            const response = await fetch(`/api/weather/saved/${locationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete location');
            }

            await loadSavedLocations();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Failed to delete location');
        }
    }

    // specific initialization
    loadSavedLocations();
});
