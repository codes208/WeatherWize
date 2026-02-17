document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const API_URL = '/api/auth';

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;
            const errorDiv = document.getElementById('login-error');

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/dashboard.html';
                } else {
                    errorDiv.textContent = data.message;
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error:', error);
                errorDiv.textContent = 'An error occurred. Please try again.';
                errorDiv.classList.remove('hidden');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.username.value;
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            const errorDiv = document.getElementById('register-error');

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('hidden');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.location.href = '/index.html';
                } else {
                    errorDiv.textContent = data.message;
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error:', error);
                errorDiv.textContent = 'An error occurred. Please try again.';
                errorDiv.classList.remove('hidden');
            }
        });
    }
});
