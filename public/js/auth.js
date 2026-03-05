/**
 * @file public/js/auth.js
 * @description Frontend authentication logic for login and registration forms.
 *
 * Login form:
 *  - Sends credentials to /api/auth/login
 *  - On success: stores JWT + user in localStorage, redirects by role
 *  - On failure: displays error message
 *
 * Register form:
 *  - Validates passwords match
 *  - For advanced role: validates card number (16 digits), CVV (3 digits),
 *    expiry format (MM/YY), and checks card is not expired
 *  - Auto-formats card fields as the user types
 *  - On success: auto-login (stores JWT) and redirects to appropriate dashboard
 */
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

                    if (data.user.role === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else if (data.user.role === 'advanced') {
                        window.location.href = '/advanced-dashboard.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
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
        // --- Auto-format card fields ---
        const cardNumberInput = document.getElementById('cardNumber');
        const cardExpiryInput = document.getElementById('cardExpiry');
        const cardCvvInput = document.getElementById('cardCvv');

        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 16);
                e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
            });
        }
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                e.target.value = v;
            });
        }
        if (cardCvvInput) {
            cardCvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
            });
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.username.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            const role = registerForm.role?.value || 'general';
            const errorDiv = document.getElementById('register-error');

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('hidden');
                return;
            }

            // --- Card validation (advanced registration only) ---
            if (role === 'advanced') {
                const rawCard = (cardNumberInput?.value || '').replace(/\s/g, '');
                const rawExpiry = cardExpiryInput?.value || '';
                const rawCvv = cardCvvInput?.value || '';

                if (!/^\d{16}$/.test(rawCard)) {
                    errorDiv.textContent = 'Card number must be exactly 16 digits.';
                    errorDiv.classList.remove('hidden');
                    return;
                }

                if (!/^\d{3}$/.test(rawCvv)) {
                    errorDiv.textContent = 'CVV must be exactly 3 digits.';
                    errorDiv.classList.remove('hidden');
                    return;
                }

                if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(rawExpiry)) {
                    errorDiv.textContent = 'Expiry date must be in MM/YY format with a valid month.';
                    errorDiv.classList.remove('hidden');
                    return;
                }

                // Check card is not expired
                const [expMonth, expYear] = rawExpiry.split('/').map(Number);
                const now = new Date();
                const expFullYear = 2000 + expYear;
                if (expFullYear < now.getFullYear() ||
                    (expFullYear === now.getFullYear() && expMonth < (now.getMonth() + 1))) {
                    errorDiv.textContent = 'Card has expired. Please use a valid card.';
                    errorDiv.classList.remove('hidden');
                    return;
                }
            }

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, role })
                });

                const data = await response.json();

                if (response.ok) {
                    // Auto-login: store token and redirect to dashboard
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showToast('Registration successful!', 'success');

                    if (data.user.role === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else if (data.user.role === 'advanced') {
                        window.location.href = '/advanced-dashboard.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
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
