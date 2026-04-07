document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    const lastLocation = localStorage.getItem('lastMapLocation');
    const locationLabel = document.getElementById('map-location-label');

    let lat = 47.6062;
    let lon = -122.3321;

    if (lastLocation) {
        locationLabel.textContent = `Showing: ${lastLocation}`;
        try {
            const response = await fetch(`/api/weather?location=${encodeURIComponent(lastLocation)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.lat != null && data.lon != null) {
                lat = data.lat;
                lon = data.lon;
            }
        } catch (err) {
            console.error('Could not get coordinates for last location', err);
        }
    } else {
        locationLabel.textContent = 'No recent location — showing default view';
    }

    const map = L.map('full-map').setView([lat, lon], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.createPane('radarPane');
    map.getPane('radarPane').style.filter = 'blur(2px)';
    map.getPane('radarPane').style.zIndex = 300;

    let radarFrames = [];
    let radarLayers = [];
    let currentFrameIndex = 0;
    let animationInterval = null;
    let isPlaying = false;

    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();

        radarFrames = [
            ...(data.radar.past || []),
            ...(data.radar.nowcast || [])
        ];

        radarFrames.forEach((frame) => {
            const layer = L.tileLayer(
                `https://tilecache.rainviewer.com${frame.path}/512/{z}/{x}/{y}/6/1_1.png`,
                {
                    opacity: 0,
                    attribution: '&copy; RainViewer',
                    tileSize: 512,
                    zoomOffset: -1,
                    maxNativeZoom: 8,
                    maxZoom: 18,
                    pane: 'radarPane'
                }
            );
            layer.addTo(map);
            radarLayers.push(layer);
        });

        currentFrameIndex = radarFrames.length - 1;
        showFrame(currentFrameIndex);
        startAnimation();
    } catch (err) {
        console.error('Failed to load radar frames', err);
    }

    setTimeout(() => map.invalidateSize(), 100);

    function showFrame(index) {
        radarLayers.forEach((layer, i) => layer.setOpacity(i === index ? 0.85 : 0));
        const frame = radarFrames[index];
        if (frame) {
            const date = new Date(frame.time * 1000);
            const timeStr = date.toLocaleTimeString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
            document.getElementById('radar-timestamp').textContent = timeStr;
        }
        document.getElementById('radar-frame-label').textContent =
            index >= radarFrames.filter(f => !f.nowcast).length ? '(Forecast)' : '';
    }

    function startAnimation() {
        if (animationInterval) clearInterval(animationInterval);
        isPlaying = true;
        document.getElementById('radar-play-btn').innerHTML = '&#9646;&#9646;';
        animationInterval = setInterval(() => {
            currentFrameIndex = (currentFrameIndex + 1) % radarFrames.length;
            showFrame(currentFrameIndex);
        }, 600);
    }

    function stopAnimation() {
        clearInterval(animationInterval);
        animationInterval = null;
        isPlaying = false;
        document.getElementById('radar-play-btn').textContent = '\u25B6';
    }

    document.getElementById('radar-play-btn').addEventListener('click', () => {
        if (isPlaying) stopAnimation();
        else startAnimation();
    });
});
