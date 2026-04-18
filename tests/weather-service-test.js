/**
 * Weather Service Tests
 */
const { geocodeLocation, fetchCurrentWeather } = require('../src/services/weatherService');

async function testWeatherService() {
    console.log('Testing weather service directly...');
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'dummy';
    
    // In CI or tests, might not have API key
    if (API_KEY === 'dummy' || API_KEY === 'your_openweather_api_key') {
        console.log('Skipping weather service actual fetch, no API key.');
        return;
    }

    try {
        const geo = await geocodeLocation('Seattle, WA', API_KEY);
        console.log('Geocode Seattle, WA:', geo ? 'SUCCESS' : 'FAILURE');
        if (geo) {
            const temp = await fetchCurrentWeather(geo.lat, geo.lon, API_KEY);
            console.log('Fetch Weather:', temp.main ? 'SUCCESS' : 'FAILURE');
        }
    } catch(e) {
        console.error('Test Failed:', e.message);
        process.exit(1);
    }
}

testWeatherService()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
