/**
 * @file config/state.js
 * @description In-memory global state for WeatherWize.
 * Avoids constant database hits for frequently accessed global settings.
 */
const state = {
    apiThrottleLimit: 500 // default value
};

module.exports = state;
