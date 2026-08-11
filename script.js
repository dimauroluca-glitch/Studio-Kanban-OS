/* ==========================================================================
   1. STRUTTURA OPERATIVA DATABASE LOCALE E INTERUTTORE SCHERMATE TOUCH
   ========================================================================== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=16.0')
            .then(reg => console.log('Engine Synced v16', reg.scope))
            .catch(err => console.log('SW Error', err));
    });
}

let tasks = JSON.parse(localStorage.getItem('kanban-tasks')) || [];
let studyStreak = parseInt(localStorage.getItem('kanban-streak')) || 0;
let lastStudyDate = localStorage.getItem('kanban-last-date') || "";

let currentSearchQuery = "";
let currentFilterType = "all";
let currentFilterPrio = "all";

// Mapping del DOM
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskSubjectInput = document.getElementById('task-subject');
const taskTypeInput = document.getElementById('task-type');
const taskDateInput = document.getElementById('task-date');
const submitBtn = document.getElementById('btn-submit-task');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const searchInput = document.getElementById('search-input');
const notificationBtn = document.getElementById('enable-notifications');
const formTitle = document.getElementById('form-title');
const toggleFilterPanelBtn = document.getElementById('toggle-filter-panel');
const advancedFilterPanel = document.getElementById('advanced-filter-panel');
const filterChips = document.querySelectorAll('.filter-chip');

if (taskDateInput) taskDateInput.min = new Date().toISOString().split("T")[0];

function switchMobileView(target) {
    if (window.innerWidth > 1024) return;
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) return;

    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => {
        el.classList.remove('mobile-active'); el.style.display = 'none';
    });
    
    if (target === 'form') {
        const formEl = document.getElementById('panel-form');
        formEl.classList.add('mobile-active'); formEl.style.display = 'block';
    } else {
        const colEl = document.getElementById(`col-${target}`);
        colEl.classList.add('mobile-active'); colEl.style.display = 'block';
    }

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${target}`);
    if (activeBtn) activeBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
}
/* ==========================================================================
   2. DISTRIBUZIONE DEI FILTRI DI RICERCA ED APPARATO PERFORMANCE ANALYTICS
   ========================================================================== */
function calculatePriority(dueDateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return { text: 'Urgente', class: 'tag-alta' };
    if (diffDays <= 5) return { text: 'Medio', class: 'tag-media' };
    return { text: 'Tranquillo', class: 'tag-bassa' };
}

function updateAnalyticsDashboard(counts) {
    document.getElementById('stat-total-done').textContent = counts.done;
    
    const todayStr = new Date().toLocaleDateString('it-IT');
    if (lastStudyDate && lastStudyDate !== todayStr) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastStudyDate !== yesterday.toLocaleDateString('it-IT')) {
            studyStreak = 0;
        }
    }
    document.getElementById('stat-streak').textContent = `${studyStreak} 🔥`;

    const subjectNames = { '#2563eb': '🔵 Italiano', '#eab308': '🟡 Storia', '#dc2626': '🔴 Matematica', '#a855f7': '🟣 Informatica', '#f1f5f9': '⚪ Inglese', '#334155': '⚫ Altro' };
    const distribution = {};
    Object.keys(subjectNames).forEach(color => distribution[color] = 0);

    tasks.forEach(t => {
        if(t.status === 'done' && distribution[t.subjectColor] !== undefined) distribution[t.subjectColor]++;
    });

    const statsListContainer = document.getElementById('subject-stats-list');
    if(statsListContainer) {
        statsListContainer.innerHTML = '';
        Object.keys(distribution).forEach(color => {
            if(distribution[color] > 0) {
                const row = document.createElement('div'); row.className = 'subject-stat-row';
                row.innerHTML = `<span>${subjectNames[color]}</span><strong>${distribution[color]} fatti</strong>`;
                statsListContainer.appendChild(row);
            }
        });
    }
}
/* ==========================================================================
   3. GESTIONE MODULO FORM, SALVATAGGI E CONDIVISIONE REQUISITI DINAMICA
   ========================================================================== */
if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim(); const date = taskDateInput.value;
        if (!title || !date) { alert("Compila i campi richiesti!"); return; }

        const id = taskIdInput.value; const subjectColor = taskSubjectInput.value; const type = taskTypeInput.value;

        if (id) {
            tasks = tasks.map(t => t.id === id ? { ...t, title, subjectColor, type, date } : t);
        } else {
            tasks.push({ id: Date.now().toString(), title, subjectColor, type, date, status: 'todo' });
        }

        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
        renderTasks();
        
        taskIdInput.value = ""; taskTitleInput.value = ""; taskDateInput.value = "";
        formTitle.textContent = "Nuovo Obiettivo"; submitBtn.textContent = "Inietta nel Sistema";
        cancelEditBtn.classList.add('hidden');
        if (document.activeElement) document.activeElement.blur();
        if (window.innerWidth <= 1024) switchMobileView('todo');
        checkImminentExams();
    });
}

// NUOVO: Pulsante Unico di Condivisione Intelligente
document.getElementById('btn-share-data').addEventListener('click', async () => {
    if (tasks.length === 0) { alert("Non ci sono compiti da condividere!"); return; }

    // Genera un riepilogo in modalità testo leggibile da inviare nelle chat
    let riepilogoTesto = "📋 IL MIO PLANNER STUDIO:\n\n";
    tasks.forEach((t, i) => {
        const priority = calculatePriority(t.date);
        const dataFmt = new Date(t.date).toLocaleDateString('it-IT');
        const stato = t.status === 'todo' ? '⏳ Da Fare' : t.status === 'progress' ? '⚡ In Corso' : '✅ Risolto';
        riepilogoTesto += `${i+1}. ${t.title} - Scadenza: ${dataFmt} [Prio: ${priority.text}] (${stato})\n`;
    });

    // Se il dispositivo supporta la condivisione di sistema (iPad, iPhone, Android)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'I miei Compiti - Studio Kanban',
                text: riepilogoTesto
            });
            console.log('Condivisione eseguita con successo!');
        } catch (err) {
            console.log('Condivisione annullata o fallita:', err);
        }
    } else {
        // Fallback per PC: Copia direttamente negli appunti del computer
        try {
            await navigator.clipboard.writeText(riepilogoTesto);
            alert("Riepilogo copiato negli appunti! Puoi incollarlo dove vuoi.");
        } catch (err) {
            alert("Impossibile copiare il testo automaticamente.");
        }
    }
});

function startEdit(id) {
    const task = tasks.find(t => t.id === id); if (!task) return;
    taskIdInput.value = task.id; taskTitleInput.value = task.title;
    taskSubjectInput.value = task.subjectColor || "#2563eb";
    taskTypeInput.value = task.type; taskDateInput.value = task.date;
    formTitle.textContent = "Modifica Obiettivo"; submitBtn.textContent = "Applica";
    cancelEditBtn.classList.remove('hidden'); switchMobileView('form');
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        taskIdInput.value = ""; taskTitleInput.value = ""; taskDateInput.value = "";
        formTitle.textContent = "Nuovo Obiettivo"; submitBtn.textContent = "Inietta nel Sistema";
        cancelEditBtn.classList.add('hidden'); switchMobileView('todo');
    });
}
/* ==========================================================================
   4. GENERATORE DELLE SCHEDE HTML, RADAR SVEGLIE E PULIZIA COLONNA RISOLTI
   ========================================================================== */
function renderTasks() {
    const lists = { todo: document.getElementById('list-todo'), progress: document.getElementById('list-progress'), done: document.getElementById('list-done') };
    const counts = { todo: 0, progress: 0, done: 0 };
    if(!lists.todo) return;

    Object.keys(lists).forEach(status => { lists[status].innerHTML = ''; });

    tasks.forEach(task => {
        if (counts[task.status] !== undefined) counts[task.status]++;
        const priority = calculatePriority(task.date);

        if (currentSearchQuery && !task.title.toLowerCase().includes(currentSearchQuery)) return;
        if (currentFilterType !== "all" && task.type !== currentFilterType) return;
        if (currentFilterPrio !== "all" && priority.text !== currentFilterPrio) return;

        const card = document.createElement('div'); card.className = 'task-card'; card.id = task.id;
        card.style.borderLeftColor = task.subjectColor || '#2563eb';

        const formattedDate = new Date(task.date).toLocaleDateString('it-IT');
        const typeLabel = task.type === 'verifica' ? 'Esame' : 'Studio';

        card.innerHTML = `
            <div class="task-badge-row">
                <span class="task-type-label">${typeLabel}</span>
                <span class="priority-tag ${priority.class}">${priority.text}</span>
            </div>
            <p class="task-card-title">${task.title}</p>
            <div class="task-card-date">📅 Scadenza: ${formattedDate}</div>
            <div class="task-actions">
                <button class="btn-card" data-action="edit">Modifica</button>
                ${task.status !== 'done' ? `<button class="btn-card" data-action="move">➔</button>` : ''}
                <button class="btn-card btn-card-delete" data-action="delete">Rimuovi</button>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(task.id));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => { 
            tasks = tasks.filter(t => t.id !== task.id); localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks(); 
        });
        if (task.status !== 'done') {
            card.querySelector('[data-action="move"]').addEventListener('click', () => {
                if (task.status === 'todo') task.status = 'progress';
                else if (task.status === 'progress') {
                    task.status = 'done';
                    const todayStr = new Date().toLocaleDateString('it-IT');
                    if (lastStudyDate !== todayStr) {
                        studyStreak++; lastStudyDate = todayStr;
                        localStorage.setItem('kanban-streak', studyStreak); localStorage.setItem('kanban-last-date', lastStudyDate);
                    }
                }
                localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks();
            });
        }
        lists[task.status].appendChild(card);
    });

    document.getElementById('count-todo').textContent = counts.todo;
    document.getElementById('count-progress').textContent = counts.progress;
    document.getElementById('count-done').textContent = counts.done;

    const total = counts.todo + counts.progress + counts.done;
    const progressPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    document.getElementById('global-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('global-progress-percent').textContent = `${progressPercent}%`;

    updateAnalyticsDashboard(counts);
}

// NUOVO: Svuota istantaneamente tutta la colonna dei compiti contrassegnati come Risolti
document.getElementById('btn-clear-done').addEventListener('click', () => {
    const doneTasksCount = tasks.filter(t => t.status === 'done').length;
    if(doneTasksCount === 0) return;
    if(confirm(`Vuoi cancellare definitivamente tutti i ${doneTasksCount} compiti completati?`)) {
        tasks = tasks.filter(t => t.status !== 'done');
        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
        renderTasks();
    }
});

function checkImminentExams() {
    if (!('serviceWorker' in navigator) || Notification.permission !== "granted") return;
    tasks.forEach(task => {
        if (task.status !== 'done') {
            const today = new Date(); today.setHours(0,0,0,0);
            const taskDate = new Date(task.date); taskDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
                const triggerDate = new Date(task.date);
                triggerDate.setDate(triggerDate.getDate() - 1);
                triggerDate.setHours(8, 0, 0, 0);
                navigator.serviceWorker.ready.then((registration) => {
                    if (registration.active) {
                        registration.active.postMessage({ action: 'scheduleNotification', task: task, triggerAt: triggerDate.getTime() });
                    }
                });
            }
        }
    });
}

if(searchInput) searchInput.addEventListener('input', (e) => { currentSearchQuery = e.target.value.toLowerCase(); renderTasks(); });
if(toggleFilterPanelBtn) toggleFilterPanelBtn.addEventListener('click', () => { advancedFilterPanel.classList.toggle('hidden-panel'); });
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        if (chip.hasAttribute('data-filter-type')) { document.querySelectorAll('[data-filter-type]').forEach(c => c.classList.remove('active')); currentFilterType = chip.getAttribute('data-filter-type'); }
        if (chip.hasAttribute('data-filter-prio')) { document.querySelectorAll('[data-filter-prio]').forEach(c => c.classList.remove('active')); currentFilterPrio = chip.getAttribute('data-filter-prio'); }
        chip.classList.add('active'); renderTasks();
    });
});
if(notificationBtn) notificationBtn.addEventListener('click', () => { if ("Notification" in window) { Notification.requestPermission().then(p => { if (p === "granted") alert("Radar attivo!"); }); } });

window.addEventListener('resize', () => { if (window.innerWidth > 1024) document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); else switchMobileView('todo'); });
if (window.innerWidth <= 1024) setTimeout(() => { switchMobileView('todo'); }, 50); else document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; });

renderTasks();
checkImminentExams();
