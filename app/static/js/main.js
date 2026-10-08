document.addEventListener('DOMContentLoaded', () => {
    // --- Modals Controller ---
    const openCreateModalBtn = document.getElementById('openCreateModalBtn');
    const createTaskModal = document.getElementById('createTaskModal');
    const closeCreateModal = document.getElementById('closeCreateModal');
    const cancelCreateModal = document.getElementById('cancelCreateModal');

    const refreshHealthBtn = document.getElementById('refreshHealthBtn');
    const healthModal = document.getElementById('healthModal');
    const closeHealthModal = document.getElementById('closeHealthModal');
    const closeHealthModalBtn = document.getElementById('closeHealthModalBtn');
    const healthResults = document.getElementById('healthResults');

    const viewLogsBtn = document.getElementById('viewLogsBtn');
    const auditLogsModal = document.getElementById('auditLogsModal');
    const closeAuditModal = document.getElementById('closeAuditModal');
    const closeAuditModalBtn = document.getElementById('closeAuditModalBtn');
    const auditLogsBody = document.getElementById('auditLogsBody');

    // Create Modal
    if (openCreateModalBtn) {
        openCreateModalBtn.addEventListener('click', () => {
            createTaskModal.classList.add('active');
            document.getElementById('taskTitle').focus();
        });
    }

    [closeCreateModal, cancelCreateModal].forEach(btn => {
        if (btn) btn.addEventListener('click', () => createTaskModal.classList.remove('active'));
    });

    // Health Modal & Query
    if (refreshHealthBtn) {
        refreshHealthBtn.addEventListener('click', () => {
            healthModal.classList.add('active');
            healthResults.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Checking backend and database health...</div>';
            
            fetch('/api/health')
                .then(res => res.json())
                .then(data => {
                    const isHealthy = data.status === 'healthy';
                    healthResults.innerHTML = `
                        <div style="background: ${isHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${isHealthy ? '#10b981' : '#ef4444'}; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: ${isHealthy ? '#34d399' : '#f87171'}; font-size: 1.1rem;">
                                <i class="fa-solid ${isHealthy ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                                Application Status: ${data.status.toUpperCase()}
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #9ca3af;">
                                Ping Timestamp: <code>${data.timestamp}</code>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem;">
                            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                                <span style="color: #9ca3af;">Flask Container Host:</span>
                                <div style="font-weight: 600; color: #f9fafb; margin-top: 0.25rem;"><code>${data.hostname}</code></div>
                            </div>
                            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                                <span style="color: #9ca3af;">MySQL Target Host:</span>
                                <div style="font-weight: 600; color: #f9fafb; margin-top: 0.25rem;"><code>${data.database.host}</code> (${data.database.name})</div>
                            </div>
                            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                                <span style="color: #9ca3af;">DB Connectivity:</span>
                                <div style="font-weight: 600; color: ${data.database.connected ? '#34d399' : '#f87171'}; margin-top: 0.25rem;">
                                    ${data.database.connected ? 'ONLINE (Ready)' : 'OFFLINE'}
                                </div>
                            </div>
                            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                                <span style="color: #9ca3af;">DB Query Latency:</span>
                                <div style="font-weight: 600; color: #38bdf8; margin-top: 0.25rem;">
                                    ${data.database.latency_ms !== null ? data.database.latency_ms + ' ms' : 'N/A'}
                                </div>
                            </div>
                        </div>
                    `;
                })
                .catch(err => {
                    healthResults.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>Failed to fetch health status: ${err.message}</span>
                        </div>
                    `;
                });
        });
    }

    [closeHealthModal, closeHealthModalBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => healthModal.classList.remove('active'));
    });

    // Audit Logs Modal & Query
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', () => {
            auditLogsModal.classList.add('active');
            auditLogsBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Loading audit records...</td></tr>';
            
            fetch('/api/logs')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data.length > 0) {
                        auditLogsBody.innerHTML = data.data.map(log => `
                            <tr>
                                <td><span style="font-family: monospace; font-weight: 600; color: #a5b4fc;">${log.action}</span></td>
                                <td>${log.details}</td>
                                <td><code>${log.ip_address || '127.0.0.1'}</code></td>
                                <td style="color: #9ca3af;">${log.created_at}</td>
                            </tr>
                        `).join('');
                    } else {
                        auditLogsBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: #9ca3af;">No audit records available yet.</td></tr>';
                    }
                })
                .catch(err => {
                    auditLogsBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: #ef4444;">Error fetching logs: ${err.message}</td></tr>`;
                });
        });
    }

    [closeAuditModal, closeAuditModalBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => auditLogsModal.classList.remove('active'));
    });

    // Close Modals on click outside or ESC key
    window.addEventListener('click', (e) => {
        if (e.target === createTaskModal) createTaskModal.classList.remove('active');
        if (e.target === healthModal) healthModal.classList.remove('active');
        if (e.target === auditLogsModal) auditLogsModal.classList.remove('active');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            createTaskModal?.classList.remove('active');
            healthModal?.classList.remove('active');
            auditLogsModal?.classList.remove('active');
        }
    });

    // --- Search & Filter Logic ---
    const searchInput = document.getElementById('taskSearchInput');
    const filterPills = document.querySelectorAll('.filter-pill');
    const taskCards = document.querySelectorAll('.task-card');

    let currentFilter = 'all';
    let searchQuery = '';

    function applyFilter() {
        taskCards.forEach(card => {
            const status = card.getAttribute('data-status');
            const title = card.querySelector('.task-title')?.innerText.toLowerCase() || '';
            const desc = card.querySelector('.task-description')?.innerText.toLowerCase() || '';

            const matchesFilter = (currentFilter === 'all' || status === currentFilter);
            const matchesSearch = (!searchQuery || title.includes(searchQuery) || desc.includes(searchQuery));

            if (matchesFilter && matchesSearch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            applyFilter();
        });
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            applyFilter();
        });
    });

    // Auto-dismiss alerts after 5 seconds
    setTimeout(() => {
        document.querySelectorAll('.alert').forEach(alert => {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        });
    }, 5000);
});
