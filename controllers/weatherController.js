const { Op, fn, col, where } = require('sequelize');
const { Location } = require('../models');

const OPENWEATHER_BASE_URL     = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const OPENWEATHER_GEO_URL      = 'http://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHER_AQI_URL      = 'http://api.openweathermap.org/data/2.5/air_pollution';

const AQI_LABELS = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };

async function geocodeLocation(location, apiKey) {
    const geoUrl = `${OPENWEATHER_GEO_URL}?q=${encodeURIComponent(location)}&limit=5&appid=${apiKey}`;
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

async function resolveCoordinates(req, res) {
    const location = req.query.location?.trim();
    if (!location) {
        res.status(400).json({ message: 'Location is required' });
        return null;
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key') {
        res.status(503).json({
            message: 'Weather API key is missing or not configured. Set OPENWEATHER_API_KEY in .env.',
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
        if (!resolution) return;
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
                    message: 'OpenWeather API key rejected (401). Verify key value and activation status.',
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

        return res.json({
            location:   geo.displayName,
            temp:       data.main?.temp,
            feelsLike:  data.main?.feels_like,
            tempHigh:   data.main?.temp_max,
            tempLow:    data.main?.temp_min,
            condition:  data.weather?.[0]?.main || 'Unknown',
            humidity:   data.main?.humidity,
            windSpeed:  data.wind?.speed,
            airQuality,
            lat: geo.lat,
            lon: geo.lon,
        });
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
                    message: 'OpenWeather API key rejected (401). Verify key value and activation status.',
                });
            }
            return res.status(response.status).json({ message: apiMessage });
        }

        const hourly = (data.list || []).map((entry) => ({
            time:      entry.dt_txt,
            temp:      entry.main?.temp,
            condition: entry.weather?.[0]?.main || 'Unknown',
            humidity:  entry.main?.humidity,
            windSpeed: entry.wind?.speed,
        }));

        return res.json({
            location:         geo.displayName,
            timezoneOffsetSec: data.city?.timezone ?? 0,
            intervals:        hourly,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching hourly forecast' });
    }
};

exports.getDailyForecast = async (req, res) => {
    try {
        const resolution = await resolveCoordinates(req, res);
        if (!resolution) return;
        const { geo, apiKey } = resolution;

        const url = `${OPENWEATHER_FORECAST_URL}?lat=${geo.lat}&lon=${geo.lon}&appid=${apiKey}&units=imperial`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                return res.status(502).json({
                    message: 'OpenWeather API key rejected (401). Verify key value and activation status.',
                });
            }
            return res.status(response.status).json({ message: data?.message || 'Error fetching forecast data' });
        }

        const timezoneOffsetSec = data.city?.timezone ?? 0;

        // Group 3-hour intervals into per-day buckets using the location's local date
        const dayMap = {};
        for (const entry of (data.list || [])) {
            const utcMs = new Date(entry.dt_txt.replace(' ', 'T') + 'Z').getTime();
            const localDate = new Date(utcMs + timezoneOffsetSec * 1000);
            const dayKey = localDate.toISOString().slice(0, 10); // "YYYY-MM-DD" in location time

            if (!dayMap[dayKey]) {
                dayMap[dayKey] = { temps: [], humidities: [], conditions: [] };
            }
            dayMap[dayKey].temps.push(entry.main?.temp);
            dayMap[dayKey].humidities.push(entry.main?.humidity);
            dayMap[dayKey].conditions.push(entry.weather?.[0]?.main || 'Unknown');
        }

        const days = Object.entries(dayMap).slice(0, 5).map(([date, vals]) => {
            // Most frequent condition for the day
            const conditionCounts = vals.conditions.reduce((acc, c) => {
                acc[c] = (acc[c] || 0) + 1;
                return acc;
            }, {});
            const dominantCondition = Object.keys(conditionCounts).reduce((a, b) =>
                conditionCounts[a] >= conditionCounts[b] ? a : b
            );

            return {
                date,
                high:      Math.max(...vals.temps),
                low:       Math.min(...vals.temps),
                humidity:  Math.round(vals.humidities.reduce((a, b) => a + b, 0) / vals.humidities.length),
                condition: dominantCondition,
            };
        });

        return res.json({ location: geo.displayName, timezoneOffsetSec, days });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching 5-day forecast' });
    }
};

exports.getHistoricalWeather = async (req, res) => {
    try {
        const resolution = await resolveCoordinates(req, res);
        if (!resolution) return;
        const { geo } = resolution;

        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: 'start and end date parameters are required (YYYY-MM-DD).' });
        }

        if (new Date(end) < new Date(start)) {
            return res.status(400).json({ message: 'End date must be after start date.' });
        }

        const maxRange = 365;
        const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
        if (diffDays > maxRange) {
            return res.status(400).json({ message: 'Date range cannot exceed 365 days.' });
        }

        // Daily variables from Open-Meteo historical archive
        const dailyVars = [
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'precipitation_sum',
            'rain_sum',
            'snowfall_sum',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'wind_direction_10m_dominant',
            'weather_code',
            'sunshine_duration',
        ].join(',');

        const archiveUrl = `https://archive-api.open-meteo.com/v1/archive` +
            `?latitude=${geo.lat}&longitude=${geo.lon}` +
            `&start_date=${start}&end_date=${end}` +
            `&daily=${dailyVars}` +
            `&temperature_unit=fahrenheit` +
            `&wind_speed_unit=mph` +
            `&precipitation_unit=inch` +
            `&timezone=auto`;

        // Air quality — historical available back to 2013
        const aqStartDate = start >= '2013-01-01' ? start : '2013-01-01';
        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality` +
            `?latitude=${geo.lat}&longitude=${geo.lon}` +
            `&start_date=${aqStartDate}&end_date=${end}` +
            `&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide` +
            `&timezone=auto`;

        const [archiveRes, aqRes] = await Promise.all([fetch(archiveUrl), fetch(aqUrl)]);
        const archiveData = await archiveRes.json();

        if (!archiveRes.ok) {
            return res.status(502).json({ message: archiveData?.reason || 'Error fetching historical weather data.' });
        }

        // Build daily rows
        const times = archiveData.daily?.time || [];
        const daily = times.map((date, i) => ({
            date,
            tempHigh:        archiveData.daily.temperature_2m_max?.[i],
            tempLow:         archiveData.daily.temperature_2m_min?.[i],
            feelsLikeHigh:   archiveData.daily.apparent_temperature_max?.[i],
            feelsLikeLow:    archiveData.daily.apparent_temperature_min?.[i],
            precipitation:   archiveData.daily.precipitation_sum?.[i],
            rain:            archiveData.daily.rain_sum?.[i],
            snowfall:        archiveData.daily.snowfall_sum?.[i],
            windSpeedMax:    archiveData.daily.wind_speed_10m_max?.[i],
            windGustMax:     archiveData.daily.wind_gusts_10m_max?.[i],
            windDirection:   archiveData.daily.wind_direction_10m_dominant?.[i],
            sunshineMins:    archiveData.daily.sunshine_duration?.[i] != null
                ? Math.round(archiveData.daily.sunshine_duration[i] / 60)
                : null,
        }));

        // Average AQI per day from hourly air quality data
        let aqByDay = {};
        if (aqRes.ok) {
            const aqData = await aqRes.json();
            const aqTimes  = aqData.hourly?.time        || [];
            const aqValues = aqData.hourly?.us_aqi      || [];
            const pm25     = aqData.hourly?.pm2_5       || [];
            const pm10     = aqData.hourly?.pm10        || [];
            const ozone    = aqData.hourly?.ozone       || [];
            const no2      = aqData.hourly?.nitrogen_dioxide || [];

            aqTimes.forEach((ts, i) => {
                const day = ts.slice(0, 10);
                if (!aqByDay[day]) aqByDay[day] = { aqi: [], pm25: [], pm10: [], ozone: [], no2: [] };
                if (aqValues[i] != null) aqByDay[day].aqi.push(aqValues[i]);
                if (pm25[i]     != null) aqByDay[day].pm25.push(pm25[i]);
                if (pm10[i]     != null) aqByDay[day].pm10.push(pm10[i]);
                if (ozone[i]    != null) aqByDay[day].ozone.push(ozone[i]);
                if (no2[i]      != null) aqByDay[day].no2.push(no2[i]);
            });
        }

        const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

        daily.forEach(row => {
            const aq = aqByDay[row.date];
            row.airQualityIndex   = aq ? avg(aq.aqi)   : null;
            row.pm25              = aq ? avg(aq.pm25)   : null;
            row.pm10              = aq ? avg(aq.pm10)   : null;
            row.ozone             = aq ? avg(aq.ozone)  : null;
            row.nitrogenDioxide   = aq ? avg(aq.no2)    : null;
        });

        return res.json({ location: geo.displayName, daily });
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

        if (location.trim().length < 3) {
            return res.status(400).json({ message: 'Please enter a valid location name (e.g. Portland, Oregon).' });
        }

        if (!/[a-zA-Z]{2,}/.test(location)) {
            return res.status(400).json({ message: 'Location must contain a valid city name (e.g. Portland, Oregon).' });
        }

        if (!location.includes(',')) {
            return res.status(400).json({ message: 'Please use the format: City, State (e.g. Portland, Oregon).' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        const geo = apiKey ? await geocodeLocation(location, apiKey) : null;

        if (!geo) {
            return res.status(404).json({ message: 'Location not found. Please use the format: City, State (e.g. Portland, Oregon).' });
        }

        const canonicalName = geo.displayName;

        const existing = await Location.findOne({
            where: {
                userId,
                [Op.and]: where(fn('LOWER', col('location_name')), canonicalName.toLowerCase()),
            },
        });
        if (existing) {
            return res.status(409).json({ message: 'Location already saved' });
        }

        await Location.create({ userId, locationName: canonicalName, lat: geo.lat, lon: geo.lon });
        return res.status(201).json({ message: 'Location saved', location_name: canonicalName });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error saving location' });
    }
};

exports.getSavedLocations = async (req, res) => {
    try {
        const userId = req.user.id;
        const locations = await Location.findAll({ where: { userId } });
        return res.json(locations.map(loc => ({
            id:            loc.id,
            user_id:       loc.userId,
            location_name: loc.locationName,
            lat:           loc.lat,
            lon:           loc.lon,
            created_at:    loc.created_at,
        })));
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

        const deleted = await Location.destroy({ where: { id: locationId, userId } });

        if (deleted === 0) {
            return res.status(404).json({ message: 'Saved location not found' });
        }

        return res.json({ message: 'Saved location deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error deleting saved location' });
    }
};

const ALLOWED_MAP_LAYERS = new Set([
    'precipitation_new', 'clouds_new', 'temp_new', 'wind_new', 'pressure_new',
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
