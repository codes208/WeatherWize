const OPENWEATHER_GEO_URL = 'http://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

async function geocodeLocation(location, apiKey) {
    const queryCity = encodeURIComponent(location.split(',')[0].trim());
    const geoUrl = `${OPENWEATHER_GEO_URL}?q=${queryCity}&limit=5&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) return null;
    const geoData = await geoResponse.json();
    if (!geoData.length) return null;

    // If the user typed "City, State", try to match the state from the results
    const parts = location.split(',');
    let match = geoData[0];
    if (parts.length >= 2) {
        const stateHint = parts[1].trim().toLowerCase();
        const stateMatch = geoData.find(r => r.state?.toLowerCase().includes(stateHint) || r.state?.toLowerCase() === stateHint);
        if (stateMatch) match = stateMatch;
    }

    const { name, state, country, lat, lon } = match;
    const displayName = state ? `${name}, ${state}` : `${name}, ${country}`;
    return { name, state, country, lat, lon, displayName };
}

async function fetchCurrentWeather(lat, lon, apiKey) {
    const url = `${OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    const response = await fetch(url);
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const err = new Error(data.message || `OpenWeather API Error: ${response.status}`);
        err.status = response.status;
        throw err;
    }
    return await response.json();
}

module.exports = {
    geocodeLocation,
    fetchCurrentWeather
};
