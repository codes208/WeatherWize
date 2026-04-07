const db = require('../config/db');

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const OPENWEATHER_GEO_URL = 'http://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHER_AQI_URL = 'http://api.openweathermap.org/data/2.5/air_pollution';

const AQI_LABELS = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };

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

// Reusable coordinates solver for identical queries
async function resolveCoordinates(req, res) {
    const location = req.query.location?.trim();
    if (!location) {
        res.status(400).json({ message: 'Location is required' });
        return null;
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key') {
        res.status(503).json({
            message: 'Weather API key is missing or not configured. Set OPENWEATHER_API_KEY in .env.'
        });
        return null;
    }

    let geo;
    if (req.query.lat && req.query.lon && req.query.lat !== 'undefined' && req.query.lon !== 'undefined') {
        geo = { displayName: location, lat: req.query.lat, lon: req.query.lon };
    } else {
        geo = await geocodeLocation(location, apiKey);
    }

    if (!geo) {
        res.status(404).json({ message: 'Location not found' });
        return null;
    }

    return { geo, apiKey };
}

exports.getWeather = async (req, res) => {
    try {
        const resolution = await resolveCoordinates(req, res);
        if (!resolution) return; // Error already sent natively
        const { geo, apiKey } = resolution;

        const url = `${OPENWEATHER_BASE_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=imperial`;
        const [response, aqiResponse] = await Promise.all([
            fetch(url),
            fetch(`${OPENWEATHER_AQI_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}`)
        ]);
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

        let airQuality = null;
        if (aqiResponse.ok) {
            const aqiData = await aqiResponse.json();
            const aqiIndex = aqiData.list?.[0]?.main?.aqi;
            if (aqiIndex) airQuality = { index: aqiIndex, label: AQI_LABELS[aqiIndex] || 'Unknown' };
        }

        const weatherData = {
            location: geo.displayName,
            temp: data.main?.temp,
            feelsLike: data.main?.feels_like,
            tempHigh: data.main?.temp_max,
            tempLow: data.main?.temp_min,
            condition: data.weather?.[0]?.main || 'Unknown',
            humidity: data.main?.humidity,
            windSpeed: data.wind?.speed,
            airQuality,
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
        const resolution = await resolveCoordinates(req, res);
        if (!resolution) return;
        const { geo, apiKey } = resolution;

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

exports.getHistoricalWeather = async (req, res) => {
    try {
        const resolution = await resolveCoordinates(req, res);
        if (!resolution) return;
        const { geo, apiKey } = resolution;

        // Use the 5-day/3-hour forecast endpoint (available on free tier)
        const url = `${OPENWEATHER_FORECAST_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=imperial`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ message: data?.message || 'Error fetching forecast data' });
        }

        const intervals = (data.list || []).map((entry) => ({
            time: entry.dt_txt,
            temp: entry.main?.temp,
            humidity: entry.main?.humidity,
            condition: entry.weather?.[0]?.main || 'Unknown',
            windSpeed: entry.wind?.speed
        }));

        return res.json({
            location: geo.displayName,
            intervals
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching historical data' });
    }
};

exports.saveLocation = async (req, res) => {
    try {
        const { location } = req.body;
        const userId = req.user.id;

        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        // Resolve through geocoding to get the canonical display name
        const apiKey = process.env.OPENWEATHER_API_KEY;
        const geo = apiKey ? await geocodeLocation(location, apiKey) : null;
        const canonicalName = geo ? geo.displayName : location.trim();

        if (!geo) {
            return res.status(404).json({ message: 'Location not found. Please check the spelling.' });
        }

        const [existing] = await db.query(
            'SELECT id FROM saved_locations WHERE user_id = ? AND LOWER(location_name) = LOWER(?)',
            [userId, canonicalName]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Location already saved' });
        }

        await db.query('INSERT INTO saved_locations (user_id, location_name, lat, lon) VALUES (?, ?, ?, ?)', [userId, canonicalName, geo.lat, geo.lon]);
        return res.status(201).json({ message: 'Location saved', location_name: canonicalName });
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

const ALLOWED_MAP_LAYERS = new Set([
    'precipitation_new', 'clouds_new', 'temp_new', 'wind_new', 'pressure_new'
]);

exports.getMapTile = async (req, res) => {
    try {
        const { layer, z, x, y } = req.params;

        if (!ALLOWED_MAP_LAYERS.has(layer)) {
            return res.status(400).end();
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
        const tileResponse = await fetch(tileUrl);

        if (!tileResponse.ok) {
            return res.status(tileResponse.status).end();
        }

        const buffer = await tileResponse.arrayBuffer();
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=600');
        return res.send(Buffer.from(buffer));
    } catch (error) {
        console.error(error);
        return res.status(500).end();
    }
};
