/**
 * Shows an inline confirmation message in the given element.
 * @param {HTMLElement} msgEl   - The element to render the confirmation into
 * @param {string} message      - The confirmation question to display
 * @param {Function} onConfirm  - Callback when user clicks Yes
 */
function showInlineConfirm(msgEl, message, onConfirm) {
    msgEl.innerHTML = `${message}
        <button id="confirm-yes-btn" style="margin-left:10px; padding:2px 10px; border-radius:5px; border:none; background:#fff; color:#e53e3e; font-weight:bold; cursor:pointer;">Yes</button>
        <button id="confirm-no-btn" style="margin-left:6px; padding:2px 10px; border-radius:5px; border:none; background:rgba(255,255,255,0.2); color:#fff; cursor:pointer;">No</button>`;
    msgEl.className = 'location-msg show msg-error';

    document.getElementById('confirm-yes-btn').addEventListener('click', async () => {
        msgEl.className = 'location-msg';
        await onConfirm();
    });

    document.getElementById('confirm-no-btn').addEventListener('click', () => {
        msgEl.className = 'location-msg';
    });
}

function conditionIcon(condition) {
    const c = (condition || '').toLowerCase();
    let img;
    if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard'))                                                      img = 'snowy.png';
    else if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder') || c.includes('storm') || c.includes('shower')) img = 'rainy.png';
    else if (c.includes('cloud') || c.includes('overcast') || c.includes('mist') || c.includes('fog') || c.includes('haze'))      img = 'cloudy.png';
    else                                                                                                                           img = 'sunny.png';
    return `<img src="./images/${img}" alt="" style="width:64px; height:64px; object-fit:contain; flex-shrink:0; margin-bottom:16px;">`;
}
