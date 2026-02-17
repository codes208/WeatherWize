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
    const savedLocationsContainer = document.getElementById('saved-locations-list');

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

            if (response.ok) {
                alert('Location saved!');
                loadSavedLocations();
            } else {
                alert('Failed to save location');
            }
        } catch (error) {
            console.error(error);
        }
    });

    async function fetchWeather(location) {
        try {
            const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok) {
                displayWeather(data);
                weatherResult.classList.remove('hidden');
            } else {
                alert(data.message || 'Error fetching weather');
            }
        } catch (error) {
            console.error(error);
            alert('Error fetching weather');
        }
    }

    function displayWeather(data) {
        document.getElementById('location-name').textContent = data.location;
        document.getElementById('temp-value').textContent = Math.round(data.temp);
        document.getElementById('condition-text').textContent = data.condition;
        document.getElementById('humidity-value').textContent = `${data.humidity}%`;
        document.getElementById('wind-value').textContent = `${data.windSpeed} mph`;
    }

    async function loadSavedLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const locations = await response.json();

            savedLocationsContainer.innerHTML = '';
            locations.forEach(loc => {
                const card = document.createElement('div');
                card.className = 'location-card';
                card.textContent = loc.location_name;
                card.addEventListener('click', () => fetchWeather(loc.location_name));
                savedLocationsContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // specific initialization
    loadSavedLocations();
});
