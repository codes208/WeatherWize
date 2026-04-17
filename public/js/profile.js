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

    // DELETE ACCOUNT (SELF-SUSPEND) LOGIC
    // This allows a normal or advanced user to "Delete" their account.
    // Instead of a hard database delete, we safely suspend the account.
    // We use a custom inline UI (showInlineConfirm) instead of the 
    // native window.confirm() dialog for a better, integrated user experience.
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const msgEl = document.getElementById('delete-confirm-msg');
            showInlineConfirm(msgEl, 'Are you sure you want to delete your account? You will be logged out immediately.', async () => {
                try {
                    const response = await fetch('/api/auth/profile', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // After successful backend suspension, we avoid using a native alert() popup here.
                        // We use the same inline message UI as the profile update form, 
                        // wait 2 seconds so the user can read it, and forcefully log them out.
                        const msgDiv = document.getElementById('profile-message');
                        showMessage(msgDiv, 'Your account has been successfully deleted.', 'success');
                        sessionStorage.clear();
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 5000);
                    } else {
                        const msgDiv = document.getElementById('profile-message');
                        showMessage(msgDiv, data.message || 'Failed to suspend account.', 'error');
                    }
                } catch (error) {
                    console.error(error);
                    const msgDiv = document.getElementById('profile-message');
                    showMessage(msgDiv, 'An error occurred while trying to suspend account.', 'error');
                }
            });
        });
    }
});