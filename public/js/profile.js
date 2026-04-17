document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    const usernameInput = document.getElementById('username-input');
    if (usernameInput && user.username) {
        usernameInput.value = user.username;
    }

    const emailInput = document.getElementById('email-input');
    if (emailInput && user.email) {
        emailInput.value = user.email;
    }

    if (user.role === 'admin') {
        const dangerZone = document.getElementById('danger-zone');
        if (dangerZone) dangerZone.style.display = 'none';
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('profile-message');
            const newEmail = emailInput ? emailInput.value.trim() : '';
            const newPassword = document.getElementById('password-input')?.value || '';

            if (!newEmail && !newPassword) {
                showMessage(msgDiv, 'Nothing to update.', 'warning');
                return;
            }

            const body = {};
            if (newEmail) body.email = newEmail;
            if (newPassword) body.password = newPassword;

            try {
                const response = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                if (response.ok) {
                    const updatedUser = { ...user, ...data.user };
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));
                    showMessage(msgDiv, data.message, 'success');
                    if (document.getElementById('password-input')) {
                        document.getElementById('password-input').value = '';
                    }
                } else {
                    showMessage(msgDiv, data.message, 'error');
                }
            } catch (error) {
                console.error(error);
                showMessage(msgDiv, 'An error occurred. Please try again.', 'error');
            }
        });
    }

    function showMessage(div, text, type) {
        if (!div) return;
        div.textContent = text;
        div.className = 'profile-message';
        if (type === 'success') div.classList.add('text-success');
        else if (type === 'error') div.classList.add('text-danger');
        else div.classList.add('text-warning');
        div.style.display = 'block';
    }
});