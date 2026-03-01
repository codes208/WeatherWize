const db = require('../config/db');

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const OPENWEATHER_GEO_URL = 'http://api.openweathermap.org/geo/1.0/direct';

async function geocodeLocation(location, apiKey) {
    const geoUrl = `${OPENWEATHER_GEO_URL}?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) return null;
    const geoData = await geoResponse.json();
    if (!geoData.length) return null;
    const { name, state, country, lat, lon } = geoData[0];
    const displayName = state ? `${name}, ${state}` : `${name}, ${country}`;
    return { name, state, country, lat, lon, displayName };
}

exports.getWeather = async (req, res) => {
    try {
        const location = req.query.location?.trim();
        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey || apiKey === 'your_openweather_api_key') {
            return res.status(503).json({
                message: 'Weather API key is missing or not configured. Set OPENWEATHER_API_KEY in .env.'
            });
        }

        const geo = await geocodeLocation(location, apiKey);
        if (!geo) {
            return res.status(404).json({ message: 'Location not found' });
        }

        const url = `${OPENWEATHER_BASE_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=imperial`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            const apiMessage = data?.message || 'Error fetching weather data';
            if (response.status === 401) {
                return res.status(502).json({
                    message: 'OpenWeather API key rejected (401). Verify key value and activation status.'
                });
            }
            return res.status(response.status).json({ message: apiMessage });
        }

        const weatherData = {
            location: geo.displayName,
            temp: data.main?.temp,
            condition: data.weather?.[0]?.main || 'Unknown',
            humidity: data.main?.humidity,
            windSpeed: data.wind?.speed,
            lat: geo.lat,
            lon: geo.lon
        };

        return res.json(weatherData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching weather data' });
    }
};

exports.getHourlyForecast = async (req, res) => {
    try {
        const location = req.query.location?.trim();
        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey || apiKey === 'your_openweather_api_key') {
            return res.status(503).json({
                message: 'Weather API key is missing or not configured. Set OPENWEATHER_API_KEY in .env.'
            });
        }

        const geo = await geocodeLocation(location, apiKey);
        if (!geo) {
            return res.status(404).json({ message: 'Location not found' });
        }

        const url = `${OPENWEATHER_FORECAST_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=imperial&cnt=8`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            const apiMessage = data?.message || 'Error fetching hourly forecast';
            if (response.status === 401) {
                return res.status(502).json({
                    message: 'OpenWeather API key rejected (401). Verify key value and activation status.'
                });
            }
            return res.status(response.status).json({ message: apiMessage });
        }

        const hourly = (data.list || []).map((entry) => ({
            time: entry.dt_txt,
            temp: entry.main?.temp,
            condition: entry.weather?.[0]?.main || 'Unknown',
            humidity: entry.main?.humidity,
            windSpeed: entry.wind?.speed
        }));

        return res.json({
            location: geo.displayName,
            intervals: hourly
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching hourly forecast' });
    }
};

exports.saveLocation = async (req, res) => {
    try {
        const { location } = req.body;
        const userId = req.user.id;

        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const [existing] = await db.query(
            'SELECT id FROM saved_locations WHERE user_id = ? AND LOWER(location_name) = LOWER(?)',
            [userId, location]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Location already saved' });
        }

        await db.query('INSERT INTO saved_locations (user_id, location_name) VALUES (?, ?)', [userId, location]);
        return res.status(201).json({ message: 'Location saved' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error saving location' });
    }
};

exports.getSavedLocations = async (req, res) => {
    try {
        const userId = req.user.id;
        const [locations] = await db.query('SELECT * FROM saved_locations WHERE user_id = ?', [userId]);
        return res.json(locations);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching saved locations' });
    }
};

exports.deleteSavedLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const locationId = Number(req.params.id);

        if (!Number.isInteger(locationId) || locationId <= 0) {
            return res.status(400).json({ message: 'Invalid location id' });
        }

        const [result] = await db.query(
            'DELETE FROM saved_locations WHERE id = ? AND user_id = ?',
            [locationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Saved location not found' });
        }

        return res.json({ message: 'Saved location deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error deleting saved location' });
    }
};
