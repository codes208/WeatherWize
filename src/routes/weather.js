const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected Weather Endpoints
router.get('/', authMiddleware, weatherController.getWeather);
router.get('/hourly', authMiddleware, weatherController.getHourlyForecast);
router.get('/daily', authMiddleware, weatherController.getDailyForecast);
router.get('/history', authMiddleware, authMiddleware.requireRole('advanced'), weatherController.getHistoricalWeather);
router.get('/tiles/:layer/:z/:x/:y', weatherController.getMapTile);
router.post('/save', authMiddleware, weatherController.saveLocation);
router.get('/saved', authMiddleware, weatherController.getSavedLocations);
router.delete('/saved/:id', authMiddleware, weatherController.deleteSavedLocation);

module.exports = router;
