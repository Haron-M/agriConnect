

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);


const toast = (m) => {
    const t = $('#toast');
    if (t) {
        t.textContent = m;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2600);
    } else {
        console.log("Toast Notification:", m);
    }
};

/* ==========================================================================
   2. CENTRAL APPLICATION STATE MANAGEMENT (Live Diagnostics Tracking)
   ========================================================================== */
const FarmState = {
    activeCropsCount: 0,
    scansList: [], // Starts completely clean to display live analytical data
    tasksList: [],
    cropsList: []
};

// Safely updates UI Counters and Dynamic Content Lists (Max 3 items limit)
function updateDashboardUI() {
    // 1. Core Stat Counter Metrics
    const activeCropsEl = document.getElementById('stat-active-crops');
    const scansCountEl = document.getElementById('stat-scans');
    const tasksCountEl = document.getElementById('stat-tasks');

    if (activeCropsEl) activeCropsEl.innerText = FarmState.activeCropsCount;
    if (scansCountEl) scansCountEl.innerText = FarmState.scansList.length;
    if (tasksCountEl) tasksCountEl.innerText = FarmState.tasksList.length;

    // 2. Render Disease Scans Content List (Enforcing Max 3 Items Limit)
    const scansContainer = document.getElementById('dashboardScansList');
    if (scansContainer) {
        if (FarmState.scansList.length === 0) {
            scansContainer.innerHTML = `<p class="empty-text">No disease scans recorded yet.</p>`;
        } else {
            const visibleScans = FarmState.scansList.slice(0, 3);
            let scansHTML = visibleScans.map(scan => `
                <div class="scan-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div class="scan-info">
                        <h4 style="margin: 0; font-size: 0.95rem; color: #111827;">${scan.name}</h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #6b7280;">${scan.crop} • ${scan.date}</p>
                    </div>
                    <div class="confidence-badge" style="background: #e6f4ea; color: #137333; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">${scan.confidence}</div>
                </div>
            `).join('');

            if (FarmState.scansList.length > 3) {
                scansHTML += `
                    <div style="text-align: center; margin-top: 12px;">
                        <a href="#" id="seeMoreScansLink" style="font-size: 0.85rem; color: #10B981; font-weight: 600; text-decoration: none; display: inline-block; transition: color 0.2s;">
                            See more (${FarmState.scansList.length - 3} hidden) →
                        </a>
                    </div>
                `;
            }

            scansContainer.innerHTML = scansHTML;

            document.getElementById('seeMoreScansLink')?.addEventListener('click', (e) => {
                e.preventDefault();
                viewAllScansPage();
            });
        }
    }

    // 3. Render Tasks Content List Preview on Dashboard
    const tasksContainer = document.getElementById('dashboardTasksList');
    if (tasksContainer) {
        if (FarmState.tasksList.length === 0) {
            tasksContainer.innerHTML = `<p class="empty-text">No pending tasks. Add a task in Activities.</p>`;
        } else {
            tasksContainer.innerHTML = FarmState.tasksList.map(task => `
                <div class="scan-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div class="scan-info">
                        <h4 style="margin: 0; font-size: 0.95rem; color: #111827;">${task.title}</h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #6b7280;">Due: ${task.dueDate}</p>
                    </div>
                    <span style="font-size: 0.72rem; text-transform: uppercase; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${task.type}</span>
                </div>
            `).join('');
        }
    }
}

/**
 * Renders a compact, micro-styled, and ultra mobile-friendly pathology log layout.
 */
function viewAllScansPage() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    if (!document.getElementById('history-compact-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'history-compact-styles';
        styleTag.innerHTML = `
            .metrics-bar-grid { display: flex; gap: 6px; margin-bottom: 12px; width: 100%; }
            .history-mini-card { flex: 1; min-width: 0; background: #ffffff; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; height: 42px; }
            .history-mini-card.btn-card { padding: 0; background: transparent; border: none; }
            .scan-history-card { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border-radius: 10px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.01); border: 1px solid #f1f5f9; }
            @media (max-width: 480px) {
                .metrics-bar-grid { gap: 4px; margin-bottom: 10px; }
                .history-mini-card { padding: 4px 6px; height: 38px; border-radius: 6px; }
                .stat-title { font-size: 0.58rem !important; }
                .stat-value { font-size: 0.9rem !important; }
                .back-dash-btn { font-size: 0.7rem !important; border-radius: 6px !important; }
                .scan-history-card { padding: 8px 10px !important; margin-bottom: 6px; }
                .disease-title { font-size: 0.85rem !important; }
                .disease-meta { font-size: 0.7rem !important; }
                .confidence-badge { font-size: 0.75rem !important; padding: 2px 6px !important; border-radius: 5px !important; }
                .item-icon-box { width: 30px !important; height: 30px !important; font-size: 0.95rem !important; border-radius: 6px !important; }
            }
        `;
        document.head.appendChild(styleTag);
    }

    let listItemsHTML = "";
    if (FarmState.scansList.length === 0) {
        listItemsHTML = `
            <div style="text-align: center; padding: 30px 16px; background: #fafafa; border-radius: 10px; border: 1px solid #e5e7eb;">
                <div style="font-size: 1.5rem; margin-bottom: 4px;">🌱</div>
                <h3 style="margin: 0; font-size: 0.85rem; color: #374151; font-weight: 600;">No History Logs</h3>
            </div>
        `;
    } else {
        listItemsHTML = FarmState.scansList.map(scan => {
            const scoreNum = parseFloat(scan.confidence);
            let badgeColors = "background: #e6f4ea; color: #137333;";
            if (scoreNum < 85) badgeColors = "background: #fef7e0; color: #b06000;";
            if (scoreNum < 65) badgeColors = "background: #fce8e6; color: #c5221f;";

            return `
                <div class="scan-history-card">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                        <div class="item-icon-box" style="width: 34px; height: 34px; border-radius: 7px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; border: 1px solid #dcfce7; flex-shrink: 0;">🍂</div>
                        <div style="min-width: 0;">
                            <h4 class="disease-title" style="margin: 0; font-size: 0.9rem; color: #111827; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${scan.name}</h4>
                            <div class="disease-meta" style="display: flex; align-items: center; gap: 5px; margin-top: 1px; color: #6b7280; font-size: 0.75rem; white-space: nowrap;">
                                <span style="background: #f3f4f6; color: #4b5563; padding: 0px 4px; border-radius: 3px; font-weight: 500;">${scan.crop}</span>
                                <span>•</span>
                                <span>📅 ${scan.date}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink: 0; margin-left: 8px;">
                        <div class="confidence-badge" style="${badgeColors} padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; text-align: center;">${scan.confidence}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    mainContent.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 8px 12px; box-sizing: border-box; font-family: 'Inter', sans-serif; margin-top:65px;">
            <div style="margin-bottom: 10px; padding-left: 2px;">
                <h2 style="margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; letter-spacing: -0.01em;">Pathology Logs</h2>
            </div>
            <div class="metrics-bar-grid">
                <div class="history-mini-card">
                    <div class="stat-title" style="font-size: 0.62rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap;">Total Records</div>
                    <div class="stat-value" style="font-size: 1.05rem; font-weight: 700; color: #0f172a; line-height: 1.1;">${FarmState.scansList.length}</div>
                </div>
                <div class="history-mini-card">
                    <div class="stat-title" style="font-size: 0.62rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap;">Sync Status</div>
                    <div class="stat-value" style="font-size: 0.75rem; font-weight: 600; color: #10b981; margin-top: 1px; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                        <span style="width: 4px; height: 4px; background: #10b981; border-radius: 50%; display: inline-block; flex-shrink: 0;"></span> Connected
                    </div>
                </div>
                <div class="history-mini-card btn-card">
                    <button id="backToDashOverviewBtn" class="back-dash-btn" style="width: 100%; height: 100%; background: #137333; color: #ffffff; border: none; padding: 0 4px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 3px; transition: background 0.15s ease;">← Dashboard</button>
                </div>
            </div>
            <div style="max-height: calc(100vh - 160px); overflow-y: auto; padding-right: 1px;">
                ${listItemsHTML}
            </div>
        </div>
    `;

    document.getElementById('backToDashOverviewBtn')?.addEventListener('click', () => {
        loadPage("main.html");
    });
}

/* ==========================================================================
   3. TASKS / ACTIVITIES SYSTEM MODULE (Supabase Cloud Syncing Workflow)
   ========================================================================== */
function loadActivitiesPage() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    let tasksHTML = "";
    if (FarmState.tasksList.length === 0) {
        tasksHTML = `
            <div style="text-align: center; padding: 40px 20px; background: transparent; width: 100%; box-sizing: border-box;">
                <div style="font-size: 2rem; color: #64748b; margin-bottom: 6px;">📅</div>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b; font-weight: 500;">No tasks yet.</p>
            </div>
        `;
    } else {
        tasksHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; width: 100%;">
                ${FarmState.tasksList.map(t => `
                    <div style="background: #ffffff; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.01); position: relative;">
                        <div style="min-width: 0; padding-right: 24px;">
                            <span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 4px; font-weight: 600;">${t.type}</span>
                            <h4 style="margin: 6px 0 2px 0; font-size: 0.9rem; color: #0f172a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.title}</h4>
                            <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: #64748b; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${t.description || "No description."}</p>
                            <span style="font-size: 0.75rem; color: #137333; font-weight: 500;">📅 Due: ${t.dueDate}</span>
                        </div>
                        <button class="delete-task-btn" data-id="${t.id}" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 2px 6px; font-weight: bold; line-height: 1;" title="Delete or Postpone Task">
                            ✕
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    mainContent.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 12px 16px; box-sizing: border-box; font-family: 'Inter', sans-serif; margin-top: 65px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.3rem; color: #1e293b; font-weight: 700;">Activities</h2>
                    <p style="margin: 1px 0 0 0; font-size: 0.8rem; color: #64748b;">Plan and track farm tasks.</p>
                </div>
                <button id="triggerNewTaskModalBtn" style="background: #137333; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    + New task
                </button>
            </div>

            <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px dashed #cbd5e1;">
                ${tasksHTML}
            </div>

            <div id="taskModalOverlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); display: none; justify-content: center; align-items: center; z-index: 9999; padding: 16px; box-sizing: border-box;">
                <div style="background: #f7fbf7; width: 100%; max-width: 400px; border-radius: 14px; padding: 18px; box-sizing: border-box; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.1);">
                    <span id="closeTaskModalIcon" style="position: absolute; top: 14px; right: 14px; font-size: 1rem; color: #64748b; cursor: pointer; font-weight: 500;">✕</span>
                    <h3 style="margin: 0 0 14px 0; font-size: 1.1rem; color: #1e293b; font-weight: 700;">New task</h3>
                    
                    <form id="farmTaskSubmissionForm">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Type</label>
                            <select id="taskInputType" style="width: 100%; height: 36px; border: 1px solid #bbf7d0; border-radius: 6px; background: #ffffff; padding: 0 8px; font-size: 0.85rem; color: #334155; outline: none; box-sizing: border-box;">
                                <option value="irrigation">Irrigation</option>
                                <option value="fertilizer">Fertilizing</option>
                                <option value="harvesting">Harvesting</option>
                                <option value="pesticides">Spraying pesticides</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Title</label>
                            <input type="text" id="taskInputTitle" required style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Description</label>
                            <textarea id="taskInputDesc" style="width: 100%; height: 50px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; resize: none; background: #ffffff; font-family: inherit;"></textarea>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Scheduled date</label>
                            <input type="date" id="taskInputDate" required style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                        </div>
                        <button type="submit" style="width: 100%; height: 36px; background: #22c55e; color: #ffffff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">Save</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    setupActivitiesEventHandlers();
}

function setupActivitiesEventHandlers() {
    // 1. Existing Modal Open/Close Logic
    const modal = document.getElementById('taskModalOverlay');
    document.getElementById('triggerNewTaskModalBtn')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
    });

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    document.getElementById('closeTaskModalIcon')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // 2. Existing Form Submission Logic
    document.getElementById('farmTaskSubmissionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskType = document.getElementById('taskInputType').value;
        const taskTitle = document.getElementById('taskInputTitle').value;
        const taskDesc = document.getElementById('taskInputDesc').value;
        const taskDate = document.getElementById('taskInputDate').value;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;

            const { error } = await supabaseClient
                .from('farm_tasks')
                .insert([{
                    user_id: session.user.id,
                    task_type: taskType,
                    title: taskTitle,
                    description: taskDesc,
                    scheduled_date: taskDate
                }]);

            if (error) throw error;
            closeModal();
            toast("✓ Task added successfully");
            await fetchUserTasksFromSupabase();
        } catch (err) {
            console.error("Error inserting task:", err);
            toast("Failed to save task.");
        }
    });

    // 3. FIX: Handle the red 'X' Cancel/Delete click events explicitly
    // Ensure your HTML template card has class="delete-task-btn" and data-id="${t.id}"
    // Handle inline card deletions
    const deleteButtons = document.querySelectorAll('.delete-task-btn');

    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Stop bubble actions
            e.stopPropagation();

            // Explicitly pull the data attribute from the button iteration context (btn) 
            // instead of dynamically reading the event target
            const taskId = btn.getAttribute('data-id');

            if (!taskId) {
                console.error("Critical error: No task ID data attribute bound to this button element.");
                return;
            }

            if (!confirm("Are you sure you want to cancel or delete this task?")) {
                return;
            }

            try {
                // Execute database removal query
                const { error } = await supabaseClient
                    .from('farm_tasks')
                    .delete()
                    .eq('id', taskId);

                if (error) throw error;

                toast("✓ Task removed successfully");

                // Re-fetch remaining tasks from the database and refresh the dashboard/UI
                await fetchUserTasksFromSupabase();

            } catch (err) {
                console.error("Failed to delete record from Supabase:", err);
                toast("Error deleting task. Please try again.");
            }
        });
    });
}
async function fetchUserTasksFromSupabase() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Fetch pending tasks
        const { data: tasks, error } = await supabaseClient
            .from('farm_tasks')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (error) throw error;

        // 2. Filter out past-due tasks locally
        FarmState.tasksList = tasks
            .filter(item => {
                const taskDate = new Date(item.scheduled_date);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate > today;
            })
            .map(item => ({
                id: item.id,
                type: item.task_type,
                title: item.title,
                description: item.description,
                dueDate: new Date(item.scheduled_date).toLocaleDateString('en-US')
            }));

        // 3. Update parent dashboard numbers
        updateDashboardUI();

        // 4. FIX: Direct, foolproof check for the active Activities panel view
        // If the "+ New task" button exists on the screen, the user is looking at Activities!
        const isCurrentlyOnActivitiesPage = document.getElementById('triggerNewTaskModalBtn') !== null;

        if (isCurrentlyOnActivitiesPage) {
            console.log("Activities view detected active. Forcing re-render...");
            loadActivitiesPage();
        }

    } catch (err) {
        console.error("Error handling or sync retrieval of tasks:", err);
    }
}
/* ==========================================================================
   4. CROPS / PLANTING CYCLE MODULE 
   ========================================================================== */
function loadCropsPage() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    let cropsHTML = "";
    if (!FarmState.cropsList || FarmState.cropsList.length === 0) {
        cropsHTML = `
            <div style="text-align: center; padding: 40px 20px; background: transparent; width: 100%; box-sizing: border-box;">
                <div style="font-size: 2rem; color: #64748b; margin-bottom: 6px;">🌱</div>
                <p style="margin: 0; font-size: 0.9rem; color: #64748b; font-weight: 500;">No crops tracked yet.</p>
            </div>
        `;
    } else {
        cropsHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; width: 100%;">
                ${FarmState.cropsList.map(c => `
                    <div style="background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        
                        <button class="delete-crop-btn" data-id="${c.id}" style="position: absolute; top: 14px; right: 14px; background: transparent; border: none; color: #94a3b8; font-size: 1rem; cursor: pointer; transition: color 0.15s;" title="Delete Cycle">
                            🗑️
                        </button>

                        <h4 style="margin: 0 0 2px 0; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${c.name}</h4>
                        <p style="margin: 0 0 12px 0; font-size: 0.85rem; color: #64748b;">${c.variety}</p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                            <div>
                                <span style="display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Area</span>
                                <span style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">${c.area} ac</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Status</span>
                                <span style="font-size: 0.85rem; color: #137333; font-weight: 600;">${c.status}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Planted</span>
                                <span style="font-size: 0.8rem; color: #475569;">${c.plantedDate}</span>
                            </div>
                            <div>
                                <span style="display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Harvest</span>
                                <span style="font-size: 0.8rem; color: #475569;">${c.harvestDate}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    mainContent.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 12px 16px; box-sizing: border-box; font-family: 'Inter', sans-serif; margin-top: 65px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                    <h2 style="margin: 0; font-size: 1.3rem; color: #1e293b; font-weight: 700;">My Crops</h2>
                    <p style="margin: 1px 0 0 0; font-size: 0.8rem; color: #64748b;">Track planting cycles and field areas.</p>
                </div>
                <button id="triggerNewCropModalBtn" style="background: #137333; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    + Add crop
                </button>
            </div>

            <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px dashed #cbd5e1;">
                ${cropsHTML}
            </div>

            <div id="cropModalOverlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); display: none; justify-content: center; align-items: center; z-index: 9999; padding: 16px; box-sizing: border-box;">
                <div style="background: #f7fbf7; width: 100%; max-width: 420px; border-radius: 14px; padding: 20px; box-sizing: border-box; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.1);">
                    <span id="closeCropModalIcon" style="position: absolute; top: 14px; right: 14px; font-size: 1rem; color: #64748b; cursor: pointer; font-weight: 500;">✕</span>
                    <h3 style="margin: 0 0 14px 0; font-size: 1.1rem; color: #1e293b; font-weight: 700;">Add a crop</h3>
                    
                    <form id="farmCropSubmissionForm">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Name</label>
                            <input type="text" id="cropInputName" required placeholder="e.g. Tomato" style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Variety</label>
                            <input type="text" id="cropInputVariety" required placeholder="e.g. Roma" style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Area (acres)</label>
                            <input type="number" step="0.01" id="cropInputArea" required placeholder="e.g. 1.5" style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
                            <div>
                                <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Planted on</label>
                                <input type="date" id="cropInputPlanted" required style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.78rem; color: #334155; font-weight: 600; margin-bottom: 4px;">Expected harvest</label>
                                <input type="date" id="cropInputHarvest" required style="width: 100%; height: 36px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; background: #ffffff;">
                            </div>
                        </div>

                        <button type="submit" style="width: 100%; height: 36px; background: #137333; color: #ffffff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Save</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    setupCropsEventHandlers();
}
function setupCropsEventHandlers() {
    const modal = document.getElementById('cropModalOverlay');

    // Toggle Modal View
    document.getElementById('triggerNewCropModalBtn')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
    });

    const closeModal = () => { if (modal) modal.style.display = 'none'; };
    document.getElementById('closeCropModalIcon')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Handle Form Submit
    document.getElementById('farmCropSubmissionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('cropInputName').value;
        const variety = document.getElementById('cropInputVariety').value;
        const area = document.getElementById('cropInputArea').value;
        const plantedDate = document.getElementById('cropInputPlanted').value;
        const harvestDate = document.getElementById('cropInputHarvest').value;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;

            const { error } = await supabaseClient
                .from('user_crops') // Adjust if your table name is different
                .insert([{
                    user_id: session.user.id,
                    crop_name: name,
                    variety: variety,
                    area_acres: parseFloat(area),
                    planted_at: plantedDate,
                    expected_harvest_at: harvestDate,
                    status: 'Growing'
                }]);

            if (error) throw error;

            closeModal();
            toast("✓ Crop cycle added successfully");
            await fetchUserCropsFromSupabase();

        } catch (err) {
            console.error("Error saving crop registration row:", err);
            toast("Failed to save crop details.");
        }
    });

    // Inline Card Deletion Handler
    document.querySelectorAll('.delete-crop-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const cropId = btn.getAttribute('data-id');
            if (!cropId) return;

            if (!confirm("Are you sure you want to delete this crop records cycle?")) return;

            try {
                const { error } = await supabaseClient
                    .from('user_crops')
                    .delete()
                    .eq('id', cropId);

                if (error) throw error;

                toast("✓ Crop cycle entry deleted");
                await fetchUserCropsFromSupabase();
            } catch (err) {
                console.error("Error deleting crop record row:", err);
                toast("Error clearing record entry");
            }
        });
    });
}
async function fetchUserCropsFromSupabase() {
    try {

        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (!session) return;

        const { data, error } = await supabaseClient
            .from('user_crops')
            .select('*')
            .eq('user_id', session.user.id)
            .order('planted_at', { ascending: false });

        if (error) throw error;

        FarmState.cropsList = data.map(crop => ({
            id: crop.id,
            name: crop.crop_name,
            variety: crop.variety,
            area: crop.area_acres,
            status: crop.status || 'Growing',
            plantedDate: crop.planted_at,
            harvestDate: crop.expected_harvest_at
        }));

        // Update active crop count
        FarmState.activeCropsCount = FarmState.cropsList.length;

        // Refresh dashboard counters
        updateDashboardUI();

        // Refresh crops page if currently open
        if (document.getElementById('triggerNewCropModalBtn')) {
            loadCropsPage();
        }

    } catch (err) {
        console.error("Error fetching crops:", err);
    }
}
// Inside your sidebar/navigation click handling setup function:
document.getElementById('nav-crops')?.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1. Highlight the active nav state if your app does that
    // setActiveNavLink('nav-crops'); // Adjust based on your actual function name

    // 2. Fetch the latest crop entries from Supabase first
    await fetchUserCropsFromSupabase();

    // 3. Render the Crops page dynamically onto the main panel
    loadCropsPage();
});
/* ==========================================================================
   4. PUBLIC SYNC & SCAN DATA COMMIT HANDLERS
   ========================================================================== */
async function addNewScanRecord(diseaseName, cropType, confidenceValue) {
    const formattedConfidence = typeof confidenceValue === "string" && confidenceValue.includes('%')
        ? confidenceValue
        : `${confidenceValue}%`;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            const { error } = await supabaseClient
                .from('farm_scans')
                .insert([{
                    user_id: session.user.id,
                    disease_name: diseaseName,
                    crop_type: cropType,
                    confidence: formattedConfidence
                }]);

            if (error) throw error;
            console.log("Scan record safely written to Supabase cloud storage.");
            await fetchUserScansFromSupabase();
        }
    } catch (err) {
        console.error("Failed to commit scan record to database infrastructure:", err);
        const today = new Date().toLocaleDateString('en-US');
        FarmState.scansList.unshift({ name: diseaseName, crop: cropType, date: today, confidence: formattedConfidence });
        updateDashboardUI();
    }
}

/* ==========================================================================
   5. CROSS-DOMAIN IFRAME BRIDGE SYNCER (Listens to Vercel App Scanner)
   ========================================================================== */
window.addEventListener("message", (event) => {
    if (event.origin !== "https://ondisease.vercel.app") return;

    const data = event.data;
    if (data && data.type === "NEW_DISEASE_SCAN") {
        console.log("Synchronized remote leaf diagnostic payload:", data);
        addNewScanRecord(data.diseaseName, data.cropType, data.confidenceValue);
        toast(`✓ Registered scan: ${data.diseaseName}`);
    }
});

document.getElementById('btnHistory')?.addEventListener('click', () => {
    viewAllScansPage();
});

// Ensure your Supabase client initialization is accessible globally or within this scope
// const supabase = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
document.getElementById('btnMainPest')?.addEventListener('click', () => {
    loadPage(pestLibrary.html);
})

document.getElementById('btnMainDisease')?.addEventListener('click', () => {
    loadPage(pestLibrary.html);
})
async function loadPage(page) {
    try {
        const response = await fetch(page);
        const data = await response.text();
        const mainContent = document.getElementById("main-content");

        if (mainContent) {
            mainContent.innerHTML = data;

            // 1. Existing check for main dashboard
            if (page === "main.html") {
                updateDashboardUI();
                fetchUserCropsFromSupabase();
                bindDashboardActionHooks();
            }

            // 2. Initialize pest library hooks right after it injects into the DOM
            if (page === "pestLibrary.html") {
                initializeDynamicPestLibrary();
            }
        }
    } catch (err) {
        console.error("Failed to dynamically load partial workspace container view:", err);
    }
}
// Updated scoped function querying your Dashboard Backend Server cleanly across ports
async function initializeDynamicPestLibrary() {
    const pestsGrid = document.getElementById("pests-grid");
    const searchInput = document.getElementById("library-search");

    let allScannedItems = []; // Keeps an in-memory array of data records

    // 🌐 BRIDGE THE LOCAL HOST PORT MISMATCH (Port 5500 vs Port 3000)
    // If running on local live-server (usually port 5500 or 127.0.0.1), route explicitly to the node server backend on port 3000.
    const targetApiUrl = (window.location.port && window.location.port !== "3000")
        ? "http://localhost:3000/api/library-items"
        : "/api/library-items";

    try {
        const response = await fetch(targetApiUrl);

        if (!response.ok) {
            throw new Error(`Server returned a bad status code: ${response.status}`);
        }

        const data = await response.json();
        allScannedItems = data || [];
        renderCards(allScannedItems);

    } catch (error) {
        console.error("Error reading database collection via backend API:", error.message || error);
        if (pestsGrid) {
            pestsGrid.innerHTML = `<div class="no-results">Failed to synchronize database history. Check connection logs.</div>`;
        }
        return;
    }

    // 2. Render HTML Cards dynamically based on schema columns
    function renderCards(items) {
        if (!pestsGrid) return;
        pestsGrid.innerHTML = ""; // Wipe container clear


        // ✅ ADD THIS CHECK: Give visual feedback when table has 0 rows
        if (!items || items.length === 0) {
            pestsGrid.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 40px; color: #888;">
                <p style="font-size: 1.2rem; margin-bottom: 8px;">🌱 Your Pest Library is Empty</p>
                <p style="font-size: 0.9rem;">Run a new scan inside the Disease Scanner panel to generate records!</p>
            </div>`;
            return;
        }

        items.forEach(item => {
            // 🛠️ Inside your items.forEach(item => { ... }) loop:

            const crop = item.crop_targeted || "Unknown Crop";
            const name = item.disease_name || "Identified Pathology";
            const symptomsRaw = item.observed_symptoms || "No diagnostic notes available.";
            const controlsRaw = item.recommended_controls || "No counteraction remediation guidelines found.";
            const image = (item.image_url && item.image_url !== "EMPTY") ? item.image_url : "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500";

            // Function to split raw text by common symbols (•) and clean up spaces
            const formatToHTMLList = (rawText) => {
                if (!rawText.includes('•')) return `<p>${rawText}</p>`;

                const items = rawText
                    .split('•')
                    .map(str => str.trim())
                    .filter(str => str.length > 0); // Drop empty splits

                return `<ul class="formatted-diagnostic-list">
        ${items.map(bullet => `<li>${bullet}</li>`).join('')}
    </ul>`;
            };

            const symptomsHTML = formatToHTMLList(symptomsRaw);
            const controlsHTML = formatToHTMLList(controlsRaw);

            const cardHTML = `
    <div class="pest-card" data-crop="${crop.toLowerCase()}" data-name="${name.toLowerCase()}">
        <div class="pest-image">
            <img src="${image}" alt="${name}" onerror="this.src='https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500'">
            <span class="crop-badge">${crop}</span>
        </div>
        <div class="pest-info">
            <h3>${name}</h3>
            <p class="scientific-name">${item.scientific_name || ''}</p>
            
            <div class="info-section">
                <h4>⚠️ Symptoms / Damage:</h4>
                <div class="info-content">${symptomsHTML}</div>
            </div>
            
            <div class="info-section">
                <h4>🛡️ Control Measures:</h4>
                <div class="info-content">${controlsHTML}</div>
            </div>
        </div>
    </div>
`;
            pestsGrid.insertAdjacentHTML("beforeend", cardHTML);
        });
    }

    // 3. Real-time Search Event Listener (Filters rows instantly)
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();

            const filteredItems = allScannedItems.filter(item => {
                const cropMatch = (item.crop_targeted || "").toLowerCase().includes(query);
                const nameMatch = (item.disease_name || "").toLowerCase().includes(query);
                const symptomsMatch = (item.observed_symptoms || "").toLowerCase().includes(query);

                return cropMatch || nameMatch || symptomsMatch;
            });

            renderCards(filteredItems);
        };
    }
}

// ❌ REMOVED DOMContentLoaded LISTENER: Handled completely by your custom loadPage container hook instead!

// Cross-window sync trigger for when scanner view changes update the layout state
window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "REFRESH_PEST_LIBRARY") {
        console.log("Global refresh trigger captured. Re-syncing database table state...");
        const pestsGrid = document.getElementById("pests-grid");
        if (pestsGrid) {
            initializeDynamicPestLibrary();
        }
    }
});
document.getElementById('btnpest')?.addEventListener('click', () => {
    loadPage("pestLibrary.html")
});

function routeToDetectionModule() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.innerHTML = `
        <iframe 
            src="https://ondisease.vercel.app" 
            style="width: 100%; height: calc(100vh - 120px); border: none; border-radius: 12px; margin-top: 65px;"
            title="Disease Scanner">
        </iframe>
    `;
    $$('.nav-item').forEach(x => x.classList.remove('active'));
    document.getElementById('btndetect')?.classList.add('active');
}

function routeToWeatherModule() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.innerHTML = `
        <iframe 
            src="weather.html" 
            style="width: 100%; height: calc(100vh - 120px); border: none; border-radius: 12px; margin-top: 65px;"
            title="Weather Panel">
        </iframe>
    `;
}

function bindDashboardActionHooks() {
    document.getElementById('triggerNewScan')?.addEventListener('click', routeToDetectionModule);
    document.getElementById('inlineNewScan')?.addEventListener('click', routeToDetectionModule);
    document.getElementById('card-view-weather')?.addEventListener('click', routeToWeatherModule);
}

// Global Sidebar Drawer Link Bindings
document.getElementById('btnweather')?.addEventListener('click', routeToWeatherModule);
document.getElementById('btndash')?.addEventListener('click', () => loadPage("main.html"));
document.getElementById('btnactivities')?.addEventListener('click', loadActivitiesPage);
document.getElementById('btnlogout')?.addEventListener('click', () => window.location.href = "index.html");


document.getElementById('btnmarket')?.addEventListener('click', () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    mainContent.innerHTML = `
        <iframe 
            src="https://market-r8a4.onrender.com/" 
            style="width: 100%; height: calc(100vh - 120px); border: none; border-radius: 12px; margin-top: 65px;"
            title="AgriMarket Framework">
        </iframe>
    `;
});

document.getElementById('btndetect')?.addEventListener('click', routeToDetectionModule);

/* ==========================================================================
   7. SUPABASE ACTIVE SESSION SYNCER & DATA RETRIEVAL
   ========================================================================== */
async function syncDashboardUserSession() {
    try {
        if (typeof supabaseClient === 'undefined') {
            console.error("Supabase engine configuration missing.");
            return;
        }
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session && session.user) {
            const metadata = session.user.user_metadata;
            const firstName = metadata?.first_name || "Farmer";
            const lastName = metadata?.last_name || "";

            const welcomeTextNode = document.getElementById('userWelcomeName');
            const userChipTextNode = document.getElementById('userChipName');
            const avatarNode = document.getElementById('userAvatar');

            if (welcomeTextNode) welcomeTextNode.textContent = firstName;
            if (userChipTextNode) userChipTextNode.textContent = firstName;
            if (avatarNode) {
                avatarNode.textContent = (firstName.charAt(0) + (lastName.charAt(0) || "")).toUpperCase();
            }

            console.log(`Successfully mapped identity for: ${firstName}`);

            // Parallel loading of cloud scans and operational tasks
            await fetchUserScansFromSupabase();
            await fetchUserTasksFromSupabase();
            await fetchUserCropsFromSupabase();

        } else {
            console.warn("Unauthenticated session instance. Redirecting to sign-in...");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Failed executing auth session layout adjustments:", err);
    }
}

async function fetchUserScansFromSupabase() {
    try {
        const { data: scans, error } = await supabaseClient
            .from('farm_scans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        FarmState.scansList = scans.map(item => ({
            name: item.disease_name,
            crop: item.crop_type,
            date: new Date(item.created_at).toLocaleDateString('en-US'),
            confidence: item.confidence
        }));

        updateDashboardUI();
    } catch (err) {
        console.error("Error retrieving historical database scans:", err);
    }
}
/* ==========================================================================
   6. AGRIBOT ASSISTANT (NVIDIA NIM AI PIPELINE - FREE CREDITS TIER)
   ========================================================================== */

/**
 * Initializes and binds interactive mechanics for the floating AgriBot widget
 */
function initAgriBotChat() {

    const fab = document.getElementById('chatFab');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const sendBtn = document.getElementById('chatSend');
    const inputField = document.getElementById('chatInput');
    const notificationDot = fab?.querySelector('.dot');

    if (!fab || !panel) return;

    // Toggle panel visibility
    fab.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
        if (notificationDot) notificationDot.style.display = 'none';
        if (panel.style.display === 'flex') inputField?.focus();
    });

    closeBtn?.addEventListener('click', () => {
        panel.style.display = 'none';
    });

    // Action Event Dispatches
    sendBtn?.addEventListener('click', handleUserMessageSend);
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserMessageSend();
        }
    });
    renderDynamicChatGreeting();
}
/**
 * Injects the localized, dynamic welcome row into the chat window box container template structure
 */
async function renderDynamicChatGreeting() {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;

    let userName = "Farmer"; // Secure fallback default parameter

    try {
        // Attempt to extract the real user profile identity from active Supabase authorization tokens
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            // Pull name metadata attribute or user email prefix safely
            let rawName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];

            // 1. If it's a full name with spaces, grab the first word
            let firstName = rawName.trim().split(' ')[0];

            // 2. If it's an email prefix with numbers (like "haronmoenga9"), 
            // strip out all numbers and trailing characters to clean it up
            firstName = firstName.replace(/[0-9]/g, ''); // Removes '9' -> "haronmoenga"

            // 3. Optional: If your email prefix joins names (like "haronmoenga"), 
            // you can hardcode a check or slice it if you want it completely pristine:
            if (firstName.toLowerCase().startsWith("haron")) {
                firstName = "Haron";
            }

            // Capitalize the first letter neatly for display
            userName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
    } catch (e) {
        console.warn("Could not read user profile metadata for chat greeting:", e);
    }

    // Build the outer wrapper matching the row design layout exactly
    const greetingRow = document.createElement('div');
    greetingRow.setAttribute('style', 'display: flex; width: 100%; justify-content: flex-start; gap: 8px; box-sizing: border-box; margin-bottom: 12px;');

    // Inject the robot image avatar and the speech bubble matching the bot background styling rules
    greetingRow.innerHTML = `
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUWFNMEQ8eUmhyoxrVDZqO0rsle7jh0JTn2zZE1bv0yQ&s=10" 
             alt="AgriBot Profile" 
             style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; align-self: flex-start; margin-top: 2px; border: 1px solid #e2e8f0;">
        
        <div class="msg bot" style="background: #f1f5f9; color: #0f172a; padding: 10px 14px; border-radius: 0 12px 12px 12px; font-size: 0.88rem; max-width: 75%; word-wrap: break-word; line-height: 1.4; border: 1px solid #e2e8f0; display: inline-block;">
            👋 Hi ${userName}! I'm your AI crop expert. Ask me about diseases, treatments, weather, or farming best practices.
        </div>
    `;

    // Reset container and append greeting cleanly
    chatBody.innerHTML = '';
    chatBody.appendChild(greetingRow);
}

/**
 * Handles UI injection states, manages a spinning loading indicator, 
 * and streams remote data token-by-token once it arrives.
 */
/**
 * Handles UI injection states, manages a spinning loading indicator, 
 * and streams data token-by-token from the local Node.js backend server.
 */
// Initialize a global history array to store the conversation memory context
let chatHistory = [];

async function handleUserMessageSend() {
    const inputField = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    if (!inputField || !chatBody) return;

    const promptText = inputField.value.trim();
    if (!promptText) return;

    inputField.value = '';

    // Append User message bubble cleanly
    appendChatMessageElement(promptText, 'user');
    scrollChatToBottom();

    // 1. Save the new user prompt into our running memory array
    chatHistory.push({ role: "user", content: promptText });

    // 1. INJECT THE SPINNING WHEEL INDICATOR ROW
    const spinnerRow = document.createElement('div');
    spinnerRow.setAttribute('style', 'display: flex; width: 100%; justify-content: flex-start; gap: 8px; box-sizing: border-box; margin-bottom: 12px;');
    spinnerRow.innerHTML = `
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUWFNMEQ8eUmhyoxrVDZqO0rsle7jh0JTn2zZE1bv0yQ&s=10" 
             alt="AgriConnect Profile" 
             style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; align-self: flex-start; margin-top: 2px; border: 1px solid #e2e8f0;">
        <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 0 12px 12px 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
            <div class="chat-spinner"></div>
        </div>
    `;
    chatBody.appendChild(spinnerRow);
    scrollChatToBottom();

    let textTarget = null;
    let fullBotResponse = ""; // Accumulator string to capture the full AI response

    try {
        // Dispatches the entire conversation history array straight to your secure backend
        const response = await fetch("/api/agribot/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatHistory: chatHistory // Handing over the full history array instead of a single message string
            })
        });

        if (!response.ok) throw new Error(`Server processing error state: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let isFirstToken = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const cleanedLine = line.trim();
                if (!cleanedLine || cleanedLine === "data: [DONE]") continue;

                if (cleanedLine.startsWith("data: ")) {
                    try {
                        const parsedData = JSON.parse(cleanedLine.replace(/^data: /, ""));

                        if (parsedData.error) throw new Error(parsedData.error);

                        const deltaText = parsedData.choices[0]?.delta?.content;

                        if (deltaText) {
                            // Accumulate the streaming fragments into our memory holder
                            fullBotResponse += deltaText;

                            // 2. SWAP OUT THE SPINNER ROW ONCE THE FIRST TEXT PIECE LANDS
                            if (isFirstToken) {
                                spinnerRow.remove(); // Drop the spinning row element completely

                                // Spawn the real active speech bubble template layout
                                const botMessageBubble = appendChatMessageElement('', 'bot');
                                if (botMessageBubble) {
                                    textTarget = botMessageBubble.querySelector('.bot-text-content');
                                }
                                isFirstToken = false;
                            }

                            // Append text data tokens to our newly generated bubble container
                            if (textTarget) {
                                textTarget.innerText += deltaText;
                                scrollChatToBottom();
                            }
                        }
                    } catch (e) {
                        // Suppress parsing fragments
                    }
                }
            }
        }

        // 2. SUCCESS PATH: Save the complete assistant response back into the history array for context
        if (fullBotResponse) {
            chatHistory.push({ role: "assistant", content: fullBotResponse });
        }

    } catch (err) {
        console.error("Critical streaming error path:", err);
        spinnerRow.remove();
        const errorBubble = appendChatMessageElement('', 'bot');
        const errorTarget = errorBubble?.querySelector('.bot-text-content');
        if (errorTarget) errorTarget.innerText = "⚠️ Connection failed!. please ensure you have stable internet connection";
    }

    scrollChatToBottom();
}
/**
 * Structural item builder macro targeting interactive component node wrappers
 */
/**
 * Structural item builder macro targeting interactive component node wrappers with external avatar support
 */
function appendChatMessageElement(text, senderClass) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return null;

    // Create an outer row container to structure alignment layout boundaries
    const rowWrapper = document.createElement('div');
    rowWrapper.setAttribute('style', 'display: flex; width: 100%; margin-bottom: 12px; box-sizing: border-box;');

    if (senderClass.includes('user')) {
        // Right-align user elements
        rowWrapper.style.justifyContent = 'flex-end';

        const msgBubble = document.createElement('div');
        msgBubble.className = `msg ${senderClass}`;
        msgBubble.setAttribute('style', 'background: #137333; color: #ffffff; padding: 10px 14px; border-radius: 12px 12px 0 12px; font-size: 0.88rem; max-width: 75%; word-wrap: break-word; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05);');
        msgBubble.innerText = text;

        rowWrapper.appendChild(msgBubble);
    } else {
        // Left-align bot elements with an external avatar
        rowWrapper.style.justifyContent = 'flex-start';
        rowWrapper.style.gap = '8px';

        // 1. Build the external image avatar component
        const avatarImg = document.createElement('img');
        avatarImg.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUWFNMEQ8eUmhyoxrVDZqO0rsle7jh0JTn2zZE1bv0yQ&s=10";
        avatarImg.alt = "AgriBot Profile";
        avatarImg.setAttribute('style', 'width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; align-self: flex-start; margin-top: 2px; border: 1px solid #e2e8f0;');

        // 2. Build the structural speech bubble text container box
        const msgBubble = document.createElement('div');
        msgBubble.className = `msg ${senderClass}`;
        msgBubble.setAttribute('style', 'background: #f1f5f9; color: #0f172a; padding: 10px 14px; border-radius: 0 12px 12px 12px; font-size: 0.88rem; max-width: 75%; word-wrap: break-word; line-height: 1.4; border: 1px solid #e2e8f0; display: inline-block;');

        // Create an interior span to catch the streaming text tokens safely
        const textSpan = document.createElement('span');
        textSpan.className = 'bot-text-content';
        textSpan.innerText = text;
        msgBubble.appendChild(textSpan);

        // Assemble the layout components onto the row rowWrapper frame node
        rowWrapper.appendChild(avatarImg);
        rowWrapper.appendChild(msgBubble);
    }

    chatBody.appendChild(rowWrapper);

    // Return the speech bubble element so the stream can keep appending text tokens directly into it
    return rowWrapper.querySelector('.msg');
}


function scrollChatToBottom() {
    const chatBody = document.getElementById('chatBody');
    if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
document.addEventListener("DOMContentLoaded", () => {

    loadPage("main.html");
    initAgriBotChat();

});

window.addEventListener('load', () => {
    syncDashboardUserSession();


    const menuBtn = $('#menuBtn');
    if (menuBtn) menuBtn.onclick = () => $('#sidebar')?.classList.toggle('open');

    $$('.nav-item').forEach(n => n.addEventListener('click', () => {
        $$('.nav-item').forEach(x => x.classList.remove('active'));
        n.classList.add('active');
        if (window.innerWidth < 820) $('#sidebar')?.classList.remove('open');
    }));
});