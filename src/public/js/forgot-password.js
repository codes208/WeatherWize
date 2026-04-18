document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const msgDiv = document.getElementById('forgot-message');

        try {
            await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            msgDiv.textContent = 'If an account with that username exists, reset instructions have been sent.';
            msgDiv.className = 'text-center text-success';
            msgDiv.classList.remove('hidden');
            e.target.reset();
        } catch (error) {
            msgDiv.textContent = 'Something went wrong. Please try again.';
            msgDiv.className = 'text-center text-danger';
            msgDiv.classList.remove('hidden');
        }
    });
});
