document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const usersTableBody = document.querySelector('tbody');
    if (!usersTableBody) return;

    let allUsers = [];


    async function loadUsers() {
        try {
            const response = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Backend route might not exist for getting all users yet.');
            }

            const users = await response.json();
            allUsers = users;
            renderUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    function renderUsers(users) {
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const isSuspended = user.status === 'suspended';
            const statusColor = isSuspended ? 'var(--danger)' : 'var(--success)';
            const statusText = isSuspended ? 'Suspended' : 'Active';
            const suspendActionText = isSuspended ? 'Unsuspend' : 'Suspend';
            const suspendActionColor = isSuspended ? 'var(--success)' : 'var(--danger)';
            const newStatus = isSuspended ? 'active' : 'suspended';
            const isSelf = currentUser.id === user.id;

            const tr = document.createElement('tr');
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
                    <button class="btn save-role-btn" style="padding: 6px 12px;">Save Role</button>
                    <button class="btn toggle-suspend-btn" style="padding: 6px 12px; background-color: ${suspendActionColor};">${suspendActionText}</button>
                    ${!isSelf ? `<button class="btn delete-user-btn" style="padding: 6px 12px; background-color: var(--danger);">Delete</button>` : ''}
                </td>
            `;

            const msgRow = document.createElement('tr');
            msgRow.className = 'user-msg-row';
            msgRow.innerHTML = `<td colspan="4" style="padding: 0 12px;"><span class="location-msg row-msg"></span></td>`;

            usersTableBody.appendChild(tr);
            usersTableBody.appendChild(msgRow);

            const rowMsg = msgRow.querySelector('.row-msg');

            tr.querySelector('.save-role-btn').addEventListener('click', async () => {
                const newRole = document.getElementById(`role-select-${user.id}`).value;
                await updateRole(user.id, newRole, rowMsg);
            });

            tr.querySelector('.toggle-suspend-btn').addEventListener('click', () => {
                const action = newStatus === 'suspended' ? 'Suspend' : 'Unsuspend';
                showInlineConfirm(rowMsg, `${action} user "${user.username}"?`, () => updateStatus(user.id, newStatus, rowMsg));
            });

            if (!isSelf) {
                tr.querySelector('.delete-user-btn').addEventListener('click', () => {
                    showInlineConfirm(rowMsg, `Permanently delete "${user.username}"? This cannot be undone.`, () => deleteUser(user.id, rowMsg));
                });
            }
        });
    }

    async function updateRole(userId, role, rowMsg) {
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
                showMsg(rowMsg, 'Role updated successfully', 'success');
            } else {
                const data = await response.json();
                showMsg(rowMsg, data.message || 'Error updating role', 'error', false);
            }
        } catch (e) {
            showMsg(rowMsg, 'Error updating role', 'error', false);
            console.error(e);
        }
    }

    async function updateStatus(userId, status, rowMsg) {
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
                loadUsers();
            } else {
                const data = await response.json();
                showMsg(rowMsg, data.message || 'Error updating status', 'error', false);
            }
        } catch (e) {
            showMsg(rowMsg, 'Error updating status', 'error', false);
            console.error(e);
        }
    }

    async function deleteUser(userId, rowMsg) {
        try {
            const response = await fetch(`/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                loadUsers();
            } else {
                const data = await response.json();
                showMsg(rowMsg, data.message || 'Error deleting user', 'error', false);
            }
        } catch (e) {
            showMsg(rowMsg, 'Error deleting user', 'error', false);
            console.error(e);
        }
    }

    loadUsers();

    // Search bar filtering
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
