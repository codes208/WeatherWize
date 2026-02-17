const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route (maybe? or protected? Let's make it protected for now as per requirements usually)
// Actually, weather searching might be public, but saving is definitely protected.
// Let's protect everything for now to match the "Dashboard" feel.
router.get('/', authMiddleware, weatherController.getWeather);
router.post('/save', authMiddleware, weatherController.saveLocation);
router.get('/saved', authMiddleware, weatherController.getSavedLocations);

module.exports = router;
