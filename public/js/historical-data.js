document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const locationSelect  = document.getElementById('history-location');
    const startDateInput  = document.getElementById('history-start-date');
    const endDateInput    = document.getElementById('history-end-date');
    const fetchBtn        = document.getElementById('fetch-history-btn');
    const chartContainer  = document.getElementById('chart-container');

    let chartInstance = null;
    const historyMsg = document.getElementById('history-msg');

    // Default date range — last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    endDateInput.value   = today.toISOString().slice(0, 10);
    startDateInput.value = thirtyDaysAgo.toISOString().slice(0, 10);
    // Prevent selecting future dates
    endDateInput.max   = today.toISOString().slice(0, 10);
    startDateInput.max = today.toISOString().slice(0, 10);

    // ── Dataset definitions ────────────────────────────────────
    const TREND_DATASETS = {
        temperature: (daily) => [
            {
                label: 'Temp High (°F)',
                data: daily.map(d => d.tempHigh),
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255,99,132,0.1)',
                fill: false, tension: 0.3, yAxisID: 'y',
            },
            {
                label: 'Temp Low (°F)',
                data: daily.map(d => d.tempLow),
                borderColor: '#ffcd56',
                backgroundColor: 'rgba(255,205,86,0.1)',
                fill: false, tension: 0.3, yAxisID: 'y',
            },
        ],
        feelsLike: (daily) => [
            {
                label: 'Feels Like High (°F)',
                data: daily.map(d => d.feelsLikeHigh),
                borderColor: '#ff9f40',
                backgroundColor: 'rgba(255,159,64,0.1)',
                fill: false, tension: 0.3, yAxisID: 'y',
            },
            {
                label: 'Feels Like Low (°F)',
                data: daily.map(d => d.feelsLikeLow),
                borderColor: '#ffcd56',
                backgroundColor: 'rgba(255,205,86,0.1)',
                fill: false, tension: 0.3, yAxisID: 'y',
            },
        ],
        precipitation: (daily) => [{
            label: 'Total Precipitation (in)',
            data: daily.map(d => d.precipitation),
            borderColor: '#36a2eb',
            backgroundColor: 'rgba(54,162,235,0.3)',
            fill: true, tension: 0.3, yAxisID: 'y1',
        }],
        rain: (daily) => [{
            label: 'Rainfall (in)',
            data: daily.map(d => d.rain),
            borderColor: '#4bc0c0',
            backgroundColor: 'rgba(75,192,192,0.2)',
            fill: true, tension: 0.3, yAxisID: 'y1',
        }],
        snowfall: (daily) => [{
            label: 'Snowfall (in)',
            data: daily.map(d => d.snowfall),
            borderColor: '#aed6f1',
            backgroundColor: 'rgba(174,214,241,0.3)',
            fill: true, tension: 0.3, yAxisID: 'y1',
        }],
        wind: (daily) => [{
            label: 'Max Wind Speed (mph)',
            data: daily.map(d => d.windSpeedMax),
            borderColor: '#9966ff',
            backgroundColor: 'rgba(153,102,255,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y',
        }],
        gusts: (daily) => [{
            label: 'Wind Gusts (mph)',
            data: daily.map(d => d.windGustMax),
            borderColor: '#c39bd3',
            backgroundColor: 'rgba(195,155,211,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y',
        }],
        sunshine: (daily) => [{
            label: 'Sunshine Duration (min)',
            data: daily.map(d => d.sunshineMins),
            borderColor: '#f7dc6f',
            backgroundColor: 'rgba(247,220,111,0.2)',
            fill: true, tension: 0.3, yAxisID: 'y',
        }],
        aqi: (daily) => [{
            label: 'US Air Quality Index',
            data: daily.map(d => d.airQualityIndex),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y',
        }],
        pm25: (daily) => [{
            label: 'PM2.5 (μg/m³)',
            data: daily.map(d => d.pm25),
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230,126,34,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y1',
        }],
        pm10: (daily) => [{
            label: 'PM10 (μg/m³)',
            data: daily.map(d => d.pm10),
            borderColor: '#d35400',
            backgroundColor: 'rgba(211,84,0,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y1',
        }],
        ozone: (daily) => [{
            label: 'Ozone (μg/m³)',
            data: daily.map(d => d.ozone),
            borderColor: '#1abc9c',
            backgroundColor: 'rgba(26,188,156,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y1',
        }],
        no2: (daily) => [{
            label: 'Nitrogen Dioxide (μg/m³)',
            data: daily.map(d => d.nitrogenDioxide),
            borderColor: '#8e44ad',
            backgroundColor: 'rgba(142,68,173,0.1)',
            fill: false, tension: 0.3, yAxisID: 'y1',
        }],
    };

    // ── Load saved locations ───────────────────────────────────
    async function loadLocations() {
        try {
            const response = await fetch('/api/weather/saved', {
                headers: { 'Authorization': `Bearer ${token}` },
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

    // ── Fetch & render ─────────────────────────────────────────
    fetchBtn.addEventListener('click', async () => {
        const location  = locationSelect.value;
        const startDate = startDateInput.value;
        const endDate   = endDateInput.value;

        if (!location || locationSelect.selectedOptions[0]?.disabled) {
            showMsg(historyMsg,'Please select a location.', 'warning');
            return;
        }
        if (!startDate || !endDate) {
            showMsg(historyMsg,'Please select both a start and end date.', 'warning');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            showMsg(historyMsg,'End date must be after start date.', 'error');
            return;
        }

        const selectedTrends = [...document.querySelectorAll('input[name="trend"]:checked')]
            .map(cb => cb.value);

        if (selectedTrends.length === 0) {
            showMsg(historyMsg,'Please select at least one trend to display.', 'warning');
            return;
        }

        fetchBtn.disabled = true;
        fetchBtn.textContent = 'Loading...';

        try {
            const url = `/api/weather/history?location=${encodeURIComponent(location)}&start=${startDate}&end=${endDate}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok) {
                showMsg(historyMsg,data.message || 'Error fetching historical data.', 'error');
                return;
            }

            if (!data.daily || data.daily.length === 0) {
                showMsg(historyMsg,'No data available for this date range.', 'error');
                return;
            }

            renderChart(data.location, data.daily, selectedTrends);
        } catch (e) {
            console.error(e);
            showMsg(historyMsg,'Error fetching historical data.', 'error');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Fetch Historical Data';
        }
    });

    // ── Render chart ───────────────────────────────────────────
    function renderChart(locationName, daily, selectedTrends) {
        chartContainer.innerHTML = '<canvas id="history-chart"></canvas>';
        const ctx = document.getElementById('history-chart').getContext('2d');

        const labels = daily.map(d => {
            const [year, month, day] = d.date.split('-');
            return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
            });
        });

        const datasets = selectedTrends.flatMap(trend =>
            TREND_DATASETS[trend] ? TREND_DATASETS[trend](daily) : []
        );

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: `Historical Weather — ${locationName}`,
                        font: { size: 16 },
                    },
                    legend: { position: 'bottom' },
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 20,
                            maxRotation: 45,
                        },
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Primary Scale' },
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Secondary Scale' },
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });
    }

    loadLocations();
});
