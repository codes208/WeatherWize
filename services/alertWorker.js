const cron = require('node-cron');
const { Op } = require('sequelize');
const { Alert, Notification, User } = require('../models');
const { sendAlertEmail } = require('./emailService');

/**
 * Background alert worker — runs every 10 minutes.
 *
 * Flow:
 *   1. Fetch all active alerts that haven't been triggered in the last hour.
 *   2. Group them by location to minimize API calls (one weather fetch per location,
 *      regardless of how many users have alerts for that location).
 *   3. For each location, fetch current weather from OpenWeatherMap.
 *   4. Evaluate each alert's threshold. If breached:
 *      - Create an in-app Notification record (picked up by the client poller).
 *      - Mark the alert as inactive and record the trigger time.
 *      - Send an email via emailService.
 *
 * Why 10 minutes?
 *   Weather data updates roughly every 10 minutes on OpenWeatherMap's free tier,
 *   so polling more frequently would return the same data and waste API quota.
 *
 * Why the 1-hour cooldown?
 *   Prevents the same alert from re-firing every 10 minutes if weather stays
 *   outside the threshold. The alert is marked inactive on first trigger and
 *   must be manually re-enabled by the user to fire again.
 */
cron.schedule('*/10 * * * *', async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Only fetch alerts that are active and have never triggered or haven't
        // triggered in the last hour (cooldown guard).
        const alerts = await Alert.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { lastTriggeredAt: null },
                    { lastTriggeredAt: { [Op.lt]: oneHourAgo } },
                ],
            },
        });

        if (alerts.length === 0) return;

        // Group alerts by location name (lowercased for consistency) so we make
        // one API call per unique location instead of one per alert.
        const groupedAlerts = {};
        for (const alert of alerts) {
            const loc = alert.locationName.toLowerCase();
            if (!groupedAlerts[loc]) groupedAlerts[loc] = [];
            groupedAlerts[loc].push(alert);
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey || apiKey === 'your_openweather_api_key') {
            console.warn('[ALERTS WORKER] Missing API Key. Aborting cycle.');
            return;
        }

        for (const [locationQuery, locAlerts] of Object.entries(groupedAlerts)) {
            try {
                // Step 1: Geocode the location name to lat/lon.
                const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationQuery)}&limit=1&appid=${apiKey}`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                if (!geoData || !geoData.length) continue;

                const { lat, lon } = geoData[0];

                // Step 2: Fetch current weather conditions for that location.
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
                const weatherRes = await fetch(url);
                const weatherData = await weatherRes.json();

                if (!weatherRes.ok) continue;

                const temp      = weatherData.main?.temp;
                const windSpeed = weatherData.wind?.speed;
                const humidity  = weatherData.main?.humidity;

                // Skip if the API returned an incomplete payload — don't fire
                // alerts on bad data.
                if (temp === undefined || windSpeed === undefined || humidity === undefined) {
                    console.error(`[ALERTS] Incomplete weather payload for ${locationQuery}. Aborting evaluate.`);
                    continue;
                }

                // Step 3: Evaluate each alert for this location.
                for (const alert of locAlerts) {
                    let triggered = false;
                    let message = '';
                    const min = Number(alert.thresholdValue);
                    const max = Number(alert.thresholdMax);

                    // Check if the current value falls outside the user's defined range.
                    switch (alert.triggerType) {
                        case 'Temperature':
                            if (temp < min || temp > max) {
                                triggered = true;
                                message = `Temp in ${alert.locationName} is ${temp}°F (outside ${min}°F – ${max}°F range)`;
                            }
                            break;
                        case 'Humidity':
                            if (humidity < min || humidity > max) {
                                triggered = true;
                                message = `Humidity in ${alert.locationName} is ${humidity}% (outside ${min}% – ${max}% range)`;
                            }
                            break;
                        case 'Wind Speed':
                            if (windSpeed < min || windSpeed > max) {
                                triggered = true;
                                message = `Wind in ${alert.locationName} is ${windSpeed}mph (outside ${min} – ${max}mph range)`;
                            }
                            break;
                    }

                    if (triggered) {
                        // Create in-app notification (client poller picks this up within 15s).
                        await Notification.create({ userId: alert.userId, message });

                        // Deactivate the alert so it doesn't re-fire next cycle.
                        // The user must manually re-enable it from the alerts manager.
                        await alert.update({ isActive: false, lastTriggeredAt: new Date() });
                        console.log(`[ALERTS] Triggered notification for user ${alert.userId}: ${message}`);

                        // Also send an email notification.
                        const user = await User.findByPk(alert.userId, { attributes: ['email', 'username'] });
                        if (user) {
                            await sendAlertEmail(user.email, user.username, message);
                        }
                    }
                }
            } catch (err) {
                // Log per-location errors without stopping the rest of the cycle.
                console.error(`[ALERTS] Error processing location ${locationQuery}:`, err);
            }
        }
    } catch (error) {
        console.error('[ALERTS] Worker error:', error);
    }
});
