const cron = require('node-cron');
const { Op } = require('sequelize');
const { Alert, Notification, User } = require('../models');
const { sendAlertEmail } = require('./emailService');

cron.schedule('*/10 * * * *', async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

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
                const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationQuery)}&limit=1&appid=${apiKey}`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                if (!geoData || !geoData.length) continue;

                const { lat, lon } = geoData[0];

                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
                const weatherRes = await fetch(url);
                const weatherData = await weatherRes.json();

                if (!weatherRes.ok) continue;

                const temp      = weatherData.main?.temp;
                const windSpeed = weatherData.wind?.speed;
                const humidity  = weatherData.main?.humidity;

                if (temp === undefined || windSpeed === undefined || humidity === undefined) {
                    console.error(`[ALERTS] Incomplete weather payload for ${locationQuery}. Aborting evaluate.`);
                    continue;
                }

                for (const alert of locAlerts) {
                    let triggered = false;
                    let message = '';
                    const min = Number(alert.thresholdValue);
                    const max = Number(alert.thresholdMax);

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
                        await Notification.create({ userId: alert.userId, message });
                        await alert.update({ isActive: false, lastTriggeredAt: new Date() });
                        console.log(`[ALERTS] Triggered notification for user ${alert.userId}: ${message}`);

                        const user = await User.findByPk(alert.userId, { attributes: ['email', 'username'] });
                        if (user) {
                            await sendAlertEmail(user.email, user.username, message);
                        }
                    }
                }
            } catch (err) {
                console.error(`[ALERTS] Error processing location ${locationQuery}:`, err);
            }
        }
    } catch (error) {
        console.error('[ALERTS] Worker error:', error);
    }
});
