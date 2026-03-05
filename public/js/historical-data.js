/**
 * @file public/js/historical-data.js
 * @description Historical weather query page logic (advanced/admin only).
 *
 * Features:
 *  - Populates location dropdown from saved locations
 *  - Date range picker (start/end date)
 *  - Fetches data from /api/weather/history
 *  - Renders temperature + humidity chart using Chart.js
 *
 * Note: On the free OpenWeatherMap tier, this uses the 5-day forecast API
 * as a proxy. The date range inputs are validated but the returned data
 * reflects the next 5 days of forecast, not true historical records.
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const locationSelect = document.getElementById('history-location');
    const startDateInput = document.getElementById('history-start-date');
    const endDateInput = document.getElementById('history-end-date');
    const fetchBtn = document.getElementById('fetch-history-btn');
    const chartContainer = document.getElementById('chart-container');
    const historyMessage = document.getElementById('history-message');

    let chartInstance = null;

    // Load saved locations into dropdown
    async function loadLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const locations = await response.json();

            locationSelect.innerHTML = '';
            if (locations.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = 'No saved locations — add one from your dashboard';
                opt.disabled = true;
                opt.selected = true;
                locationSelect.appendChild(opt);
                return;
            }
            locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.location_name;
                opt.textContent = loc.location_name;
                locationSelect.appendChild(opt);
            });
        } catch (e) {
            console.error('Error loading locations:', e);
        }
    }

    // Fetch historical data
    fetchBtn.addEventListener('click', async () => {
        const location = locationSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!location) {
            showMsg('Please select a location.', 'error');
            return;
        }

        if (!startDate || !endDate) {
            showMsg('Please select both start and end dates.', 'error');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            showMsg('End date must be after start date.', 'error');
            startDateInput.style.borderColor = 'var(--danger)';
            endDateInput.style.borderColor = 'var(--danger)';
            return;
        } else {
            startDateInput.style.borderColor = '';
            endDateInput.style.borderColor = '';
        }

        try {
            fetchBtn.disabled = true;
            fetchBtn.textContent = 'Loading...';

            const url = `/api/weather/history?location=${encodeURIComponent(location)}&start=${startDate}&end=${endDate}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                showMsg(data.message || 'Error fetching historical data.', 'error');
                return;
            }

            if (!data.intervals || data.intervals.length === 0) {
                showMsg('No historical data available for this date range.', 'error');
                return;
            }

            renderChart(data.location, data.intervals);
            if (historyMessage) historyMessage.style.display = 'none';
        } catch (e) {
            showMsg('Error fetching historical data.', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Fetch History';
        }
    });

    function renderChart(locationName, intervals) {
        // Ensure canvas exists
        chartContainer.innerHTML = '<canvas id="history-chart"></canvas>';
        const ctx = document.getElementById('history-chart').getContext('2d');

        const labels = intervals.map(i => {
            const d = new Date(i.time);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
                d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        const temps = intervals.map(i => i.temp);
        const humidity = intervals.map(i => i.humidity);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Temperature (°F)',
                        data: temps,
                        borderColor: '#ff6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidity,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Weather History — ${locationName}`,
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Temperature (°F)' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Humidity (%)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    function showMsg(text, type) {
        if (!historyMessage) return;
        historyMessage.textContent = text;
        historyMessage.style.display = 'block';
        historyMessage.className = type === 'success' ? 'text-center text-success' : 'text-center text-danger';
    }

    loadLocations();
});
