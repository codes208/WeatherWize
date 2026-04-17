/**
 * Shows an inline confirmation message in the given element.
 * @param {HTMLElement} msgEl   - The element to render the confirmation into
 * @param {string} message      - The confirmation question to display
 * @param {Function} onConfirm  - Callback when user clicks Yes
 */
/**
 * Shows an inline status message in the given location-msg element.
 * @param {HTMLElement} el   - The element to render the message into
 * @param {string} text      - The message to display
 * @param {'success'|'error'} type
 */
function showMsg(el, text, type, autoDismiss = true) {
    if (!el) return;
    el.textContent = text;
    const cls = type === 'success' ? 'msg-success' : 'msg-error';
    el.className = `location-msg show ${cls}`;
    if (autoDismiss) setTimeout(() => { el.className = 'location-msg'; }, 4000);
}

function clearMsg(el) {
    if (!el) return;
    el.className = 'location-msg';
}

function showInlineConfirm(msgEl, message, onConfirm) {
    msgEl.innerHTML = `${message}
        <button class="confirm-yes-btn" style="margin-left:10px; padding:2px 10px; border-radius:5px; border:none; background:#fff; color:#e53e3e; font-weight:bold; cursor:pointer;">Yes</button>
        <button class="confirm-no-btn" style="margin-left:6px; padding:2px 10px; border-radius:5px; border:none; background:rgba(255,255,255,0.2); color:#fff; cursor:pointer;">No</button>`;
    msgEl.className = 'location-msg show msg-error';

    msgEl.querySelector('.confirm-yes-btn').addEventListener('click', async () => {
        msgEl.className = 'location-msg';
        await onConfirm();
    });

    msgEl.querySelector('.confirm-no-btn').addEventListener('click', () => {
        msgEl.className = 'location-msg';
    });
}

/**
 * Returns the current user's JWT token from sessionStorage.
 * Centralised here so every page reads from the same key.
 * @returns {string|null}
 */
function getToken() {
    return sessionStorage.getItem('token');
}

/**
 * Wrapper around fetch that automatically attaches the Authorization header.
 * Mirrors the native fetch signature — pass any options you normally would.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
function fetchWithAuth(url, options = {}) {
    const token = getToken();
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`,
        },
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
