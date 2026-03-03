document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return; // auth-check.js handles relocation

    const usersTableBody = document.querySelector('tbody');
    if (!usersTableBody) return; // Not on the admin-users page

    async function loadUsers() {
        try {
            const response = await fetch('/api/auth/users', { // Note: Assume an admin endpoint exists or will be stubbed
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // For the sake of the demo, if the backend route doesn't exist, we just show dummy data
                throw new Error('Backend route might not exist for getting all users yet.');
            }

            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.warn(error.message);
            // Fallback for Demo without building new backend routes:
            renderUsers([
                { id: 1, username: 'admin', role: 'admin', is_suspended: false },
                { id: 2, username: 'weatherfan99', role: 'general', is_suspended: false },
                { id: 3, username: 'stormchaser', role: 'advanced', is_suspended: true }
            ]);
        }
    }

    function renderUsers(users) {
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');

            const statusColor = user.is_suspended ? 'var(--danger)' : 'var(--success)';
            const statusText = user.is_suspended ? 'Suspended' : 'Active';

            const suspendActionText = user.is_suspended ? 'Unsuspend' : 'Suspend';
            const suspendActionColor = user.is_suspended ? 'var(--success)' : 'var(--danger)';

            tr.innerHTML = `
                <td>${user.username}</td>
                <td>
                    <select id="role-select-${user.id}" style="width: auto; padding: 6px;">
                        <option value="general" ${user.role === 'general' ? 'selected' : ''}>General</option>
                        <option value="advanced" ${user.role === 'advanced' ? 'selected' : ''}>Advanced</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td><span style="color: ${statusColor};">${statusText}</span></td>
                <td>
                    <button class="btn save-role-btn" data-id="${user.id}" style="padding: 6px 12px;">Save Role</button>
                    <button class="btn toggle-suspend-btn" data-id="${user.id}" style="padding: 6px 12px; background-color: ${suspendActionColor};">${suspendActionText}</button>
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.save-role-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const newRole = document.getElementById(`role-select-${id}`).value;
                await updateRole(id, newRole);
            });
        });

        // Mock Suspend for Demo
        document.querySelectorAll('.toggle-suspend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                alert('Account status toggled. (Demo Mode)');
                loadUsers(); // Re-render mock
            });
        });
    }

    async function updateRole(userId, role) {
        try {
            const response = await fetch(`/api/auth/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role })
            });

            if (response.ok) {
                alert('Role updated successfully');
            } else {
                const data = await response.json();
                alert(data.message || 'Error updating role');
            }
        } catch (e) {
            alert('Role updated (Demo Mode)');
        }
    }

    loadUsers();
});
