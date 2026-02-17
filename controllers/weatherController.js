const db = require('../config/db');

// Mock weather data function (fallback if no API key or error)
const getMockWeather = (location) => {
    return {
        location: location,
        temp: 72,
        condition: 'Sunny',
        humidity: 45,
        windSpeed: 10
    };
};

exports.getWeather = async (req, res) => {
    try {
        const { location } = req.query;
        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        // In a real app, we would fetch from OpenWeatherMap here using process.env.OPENWEATHER_API_KEY
        // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHER_API_KEY}`);
        // const data = await response.json();

        // For now, return mock data
        const weatherData = getMockWeather(location);
        res.json(weatherData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching weather data' });
    }
};

exports.saveLocation = async (req, res) => {
    try {
        const { location } = req.body;
        const userId = req.user.id;

        if (!location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        await db.query('INSERT INTO saved_locations (user_id, location_name) VALUES (?, ?)', [userId, location]);
        res.status(201).json({ message: 'Location saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving location' });
    }
};

exports.getSavedLocations = async (req, res) => {
    try {
        const userId = req.user.id;
        const [locations] = await db.query('SELECT * FROM saved_locations WHERE user_id = ?', [userId]);
        res.json(locations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching saved locations' });
    }
};
