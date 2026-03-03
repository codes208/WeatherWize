document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    const usernameInput = document.getElementById('username-input');
    if (usernameInput && user.username) {
        usernameInput.value = user.username;
    }

    const emailInput = document.getElementById('email-input');
    if (emailInput && user.email) {
        emailInput.value = user.email;
    }
});