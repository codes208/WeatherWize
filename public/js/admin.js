document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const usersTableBody = document.querySelector('tbody');
    if (!usersTableBody) return;

    let allUsers = [];
    const confirmMsg = document.getElementById('admin-confirm-msg');

    function showMsg(text, type) {
        if (!confirmMsg) return;
        confirmMsg.textContent = text;
        confirmMsg.className = `location-msg show ${type === 'error' ? 'msg-error' : 'msg-success'}`;
        setTimeout(() => { confirmMsg.className = 'location-msg'; }, 4000);
    }

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
            showMsg('Failed to load users', 'error');
        }
    }

    function renderUsers(users) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');

            const isSuspended = user.status === 'suspended';
            const statusColor = isSuspended ? 'var(--danger)' : 'var(--success)';
            const statusText = isSuspended ? 'Suspended' : 'Active';

            const suspendActionText = isSuspended ? 'Unsuspend' : 'Suspend';
            const suspendActionColor = isSuspended ? 'var(--success)' : 'var(--danger)';
            const newStatus = isSuspended ? 'active' : 'suspended';

            const isSelf = currentUser.id === user.id;

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
                    ${!isSelf ? `<button class="btn delete-user-btn" data-id="${user.id}" data-username="${user.username}" style="padding: 6px 12px; background-color: var(--danger);">Delete</button>` : ''}
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        document.querySelectorAll('.save-role-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const newRole = document.getElementById(`role-select-${id}`).value;
                await updateRole(id, newRole);
            });
        });

        document.querySelectorAll('.toggle-suspend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const newStatus = e.target.dataset.newStatus;
                const username = e.target.dataset.username;
                const action = newStatus === 'suspended' ? 'Suspend' : 'Unsuspend';
                showInlineConfirm(confirmMsg, `${action} user "${username}"?`, () => updateStatus(id, newStatus));
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const username = e.target.dataset.username;
                showInlineConfirm(confirmMsg, `Permanently delete "${username}"? This cannot be undone.`, () => deleteUser(id));
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
                showMsg('Role updated successfully', 'success');
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error updating role', 'error');
            }
        } catch (e) {
            showMsg('Error updating role', 'error');
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
                showMsg('User status updated', 'success');
                loadUsers();
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error updating status', 'error');
            }
        } catch (e) {
            showMsg('Error updating status', 'error');
            console.error(e);
        }
    }

    async function deleteUser(userId) {
        try {
            const response = await fetch(`/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showMsg('User deleted successfully', 'success');
                loadUsers();
            } else {
                const data = await response.json();
                showMsg(data.message || 'Error deleting user', 'error');
            }
        } catch (e) {
            showMsg('Error deleting user', 'error');
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
