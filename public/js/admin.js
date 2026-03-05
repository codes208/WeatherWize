/**
 * @file public/js/admin.js
 * @description Admin user management table logic.
 *
 * Features:
 *  - Loads all users from /api/auth/users (cached in allUsers array)
 *  - Renders user table with role dropdown, status, save-role, suspend buttons
 *  - Real-time search bar filtering by username or email
 *  - Confirmation dialog before suspending/unsuspending a user
 *  - Updates role via PUT /api/auth/users/:id/role
 *  - Updates status via PUT /api/auth/users/:id/status
 */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return; // auth-check.js handles relocation

    const usersTableBody = document.querySelector('tbody');
    if (!usersTableBody) return; // Not on the admin-users page

    let allUsers = []; // cached for search filtering

    async function loadUsers() {
        try {
            const response = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // For the sake of the demo, if the backend route doesn't exist, we just show dummy data
                throw new Error('Backend route might not exist for getting all users yet.');
            }

            const users = await response.json();
            allUsers = users;
            renderUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Failed to load users', 'error');
        }
    }

    function renderUsers(users) {
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');

            const isSuspended = user.status === 'suspended';
            const statusColor = isSuspended ? 'var(--danger)' : 'var(--success)';
            const statusText = isSuspended ? 'Suspended' : 'Active';

            const suspendActionText = isSuspended ? 'Unsuspend' : 'Suspend';
            const suspendActionColor = isSuspended ? 'var(--success)' : 'var(--danger)';
            const newStatus = isSuspended ? 'active' : 'suspended';

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
                    <button class="btn toggle-suspend-btn" data-id="${user.id}" data-new-status="${newStatus}" data-username="${user.username}" style="padding: 6px 12px; background-color: ${suspendActionColor};">${suspendActionText}</button>
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

        // Suspend confirmation (UC-013)
        document.querySelectorAll('.toggle-suspend-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const newStatus = e.target.dataset.newStatus;
                const username = e.target.dataset.username;
                const action = newStatus === 'suspended' ? 'suspend' : 'unsuspend';
                if (!confirm(`Are you sure you want to ${action} user "${username}"?`)) return;
                await updateStatus(id, newStatus);
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
                showToast('Role updated successfully', 'success');
            } else {
                const data = await response.json();
                showToast(data.message || 'Error updating role', 'error');
            }
        } catch (e) {
            showToast('Error updating role', 'error');
            console.error(e);
        }
    }

    async function updateStatus(userId, status) {
        try {
            const response = await fetch(`/api/auth/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                showToast('User status updated', 'success');
                loadUsers(); // Re-render the list
            } else {
                const data = await response.json();
                showToast(data.message || 'Error updating status', 'error');
            }
        } catch (e) {
            showToast('Error updating status', 'error');
            console.error(e);
        }
    }

    loadUsers();

    // UC-012: Search bar filtering
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            if (!query) {
                renderUsers(allUsers);
                return;
            }
            const filtered = allUsers.filter(u =>
                u.username.toLowerCase().includes(query) ||
                (u.email && u.email.toLowerCase().includes(query))
            );
            renderUsers(filtered);
        });
    }
});
