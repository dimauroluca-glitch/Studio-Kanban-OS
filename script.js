

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=29.0')
            .then(reg => console.log('Radar Offline Sincronizzato', reg.scope))
            .catch(err => console.log('Errore SW:', err));
    });
}


let tasks = [];
try {
    tasks = JSON.parse(localStorage.getItem('kanban-tasks'));
    if (!Array.isArray(tasks)) tasks = [];
} catch(e) {
    tasks = [];
    localStorage.setItem('kanban-tasks', JSON.stringify([]));
}

let studyStreak = parseInt(localStorage.getItem('kanban-streak')) || 0;
let lastStudyDate = localStorage.getItem('kanban-last-date') || "";

let currentDisplayMode = "kanban"; 
let calendarCurrentDate = new Date();
let currentSearchQuery = "";
let currentFilterType = "all";
let currentFilterPrio = "all";


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
const btnToggleView = document.getElementById('btn-toggle-view');
const calendarContainer = document.querySelector('.calendar-view-container');
const kanbanDeckContainer = document.getElementById('main-kanban-deck');
const calendarMonthTitle = document.getElementById('calendar-month-title');
const calendarDaysGrid = document.getElementById('calendar-days-grid');


if (taskDateInput) taskDateInput.min = new Date().toISOString().split("T")[0];


function switchMobileView(target) {
    if (window.innerWidth > 1024) return; 
    
    
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
        return; 
    }

    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => {
        el.classList.remove('mobile-active'); 
        el.style.display = 'none';
    });
    
    if (target === 'form') {
        const formEl = document.getElementById('panel-form');
        if (formEl) { formEl.classList.add('mobile-active'); formEl.style.display = 'block'; }
    } else {
        if (currentDisplayMode === "calendar") {
            if (calendarContainer) calendarContainer.classList.remove('hidden-display');
            if (kanbanDeckContainer) kanbanDeckContainer.classList.add('hidden-display');
        } else {
            if (calendarContainer) calendarContainer.classList.add('hidden-display');
            if (kanbanDeckContainer) kanbanDeckContainer.classList.remove('hidden-display');
            const colEl = document.getElementById(`col-${target}`);
            if (colEl) { colEl.classList.add('mobile-active'); colEl.style.display = 'block'; }
        }
    }
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${target}`);
    if (activeBtn) activeBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
}


if(btnToggleView) {
    btnToggleView.addEventListener('click', () => {
        if (currentDisplayMode === "kanban") {
            currentDisplayMode = "calendar";
            btnToggleView.textContent = "Tabellone Kanban 📋";
            if (kanbanDeckContainer) kanbanDeckContainer.classList.add('hidden-display');
            if (calendarContainer) calendarContainer.classList.remove('hidden-display');
            buildCalendarGrid();
        } else {
            currentDisplayMode = "kanban";
            btnToggleView.textContent = "Vista Calendario 📅";
            if (calendarContainer) calendarContainer.classList.add('hidden-display');
            if (kanbanDeckContainer) kanbanDeckContainer.classList.remove('hidden-display');
            renderTasks();
        }
    });
}


const prevMonthBtn = document.getElementById('btn-prev-month');
const nextMonthBtn = document.getElementById('btn-next-month');
if(prevMonthBtn) prevMonthBtn.addEventListener('click', () => { calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1); buildCalendarGrid(); });
if(nextMonthBtn) nextMonthBtn.addEventListener('click', () => { calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1); buildCalendarGrid(); });

function buildCalendarGrid() {
    if (currentDisplayMode !== "calendar" || !calendarDaysGrid) return;
    calendarDaysGrid.innerHTML = '';
    const year = calendarCurrentDate.getFullYear(); 
    const month = calendarCurrentDate.getMonth();
    const nomiMesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    if (calendarMonthTitle) calendarMonthTitle.textContent = `${nomiMesi[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const blankCells = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    
    for (let i = 0; i < blankCells; i++) {
        const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-day-cell day-empty'; calendarDaysGrid.appendChild(emptyCell);
    }
    
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div'); dayCell.className = 'calendar-day-cell';
        const dayNumSpan = document.createElement('span'); dayNumSpan.className = 'calendar-day-number'; dayNumSpan.textContent = day; dayCell.appendChild(dayNumSpan);

        const currentCellDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const oggi = new Date();
        if (day === oggi.getDate() && month === oggi.getMonth() && year === oggi.getFullYear()) dayCell.classList.add('day-today');

        
        const dayTasks = tasks.filter(t => t.date === currentCellDateStr && t.status !== 'done');
        if (dayTasks.length > 0) {
            const dotsContainer = document.createElement('div'); dotsContainer.className = 'calendar-events-dots-row';
            dayTasks.forEach(task => {
                const dot = document.createElement('span'); dot.className = 'calendar-dot-marker'; dot.style.backgroundColor = task.subjectColor || '#2563eb';
                if (task.type === 'verifica') dot.classList.add('dot-verifica');
                dotsContainer.appendChild(dot);
            });
            dayCell.appendChild(dotsContainer);
        }
        calendarDaysGrid.appendChild(dayCell);
    }
}


if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        if(e) e.preventDefault();
        const title = taskTitleInput ? taskTitleInput.value.trim() : "";
        const date = taskDateInput ? taskDateInput.value : "";

        if (!title) { alert("Attenzione: Inserisci una materia o un argomento!"); return; }
        if (!date) { alert("Attenzione: Inserisci una data di scadenza valida!"); return; }

        const id = taskIdInput ? taskIdInput.value : "";
        const subjectColor = taskSubjectInput ? taskSubjectInput.value : "#2563eb";
        const type = taskTypeInput ? taskTypeInput.value : "compito";

        if (id) {
            
            tasks = tasks.map(t => t.id === id ? { ...t, title, subjectColor, type, date } : t);
        } else {
            
            tasks.push({ id: Date.now().toString(), title, subjectColor, type, date, status: 'todo' });
        }

        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
        
        
        if (taskIdInput) taskIdInput.value = ""; 
        if (taskTitleInput) taskTitleInput.value = ""; 
        if (taskDateInput) taskDateInput.value = "";
        if (formTitle) formTitle.textContent = "Nuovo Obiettivo";
        if (submitBtn) submitBtn.textContent = "Inietta nel Sistema";
        if (cancelEditBtn) cancelEditBtn.classList.add('hidden');

        renderTasks();
        if (currentDisplayMode === "calendar") buildCalendarGrid();

        if (document.activeElement) document.activeElement.blur();
        if (window.innerWidth <= 1024) switchMobileView('todo');

        
        
        
        checkImminentExams(); 
    });
}

function startEdit(id) {
    const task = tasks.find(t => t.id === id); if (!task) return;
    if(taskIdInput) taskIdInput.value = task.id; 
    if(taskTitleInput) taskTitleInput.value = task.title;
    if(taskSubjectInput) taskSubjectInput.value = task.subjectColor || "#2563eb";
    if(taskTypeInput) taskTypeInput.value = task.type; 
    if(taskDateInput) taskDateInput.value = task.date;
    if(formTitle) formTitle.textContent = "Modifica Obiettivo"; 
    if(submitBtn) submitBtn.textContent = "Applica";
    if(cancelEditBtn) cancelEditBtn.classList.remove('hidden'); 
    switchMobileView('form');
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        if(taskIdInput) taskIdInput.value = ""; 
        if(taskTitleInput) taskTitleInput.value = ""; 
        if(taskDateInput) taskDateInput.value = "";
        if(formTitle) formTitle.textContent = "Nuovo Obiettivo"; 
        if(submitBtn) submitBtn.textContent = "Inietta nel Sistema";
        if(cancelEditBtn) cancelEditBtn.classList.add('hidden'); 
        switchMobileView('todo');
    });
}


const shareBtn = document.getElementById('btn-share-data');
if(shareBtn) {
    shareBtn.addEventListener('click', async () => {
        if (tasks.length === 0) { alert("Non ci sono compiti da condividere!"); return; }
        let riepilogoTesto = "📋 IL MIO PLANNER STUDIO:\n\n";
        tasks.forEach((t, i) => {
            const priority = calculatePriority(t.date); const dataFmt = new Date(t.date).toLocaleDateString('it-IT');
            const stato = t.status === 'todo' ? '⏳ Da Fare' : t.status === 'progress' ? '⚡ In Corso' : '✅ Risolto';
            riepilogoTesto += `${i+1}. ${t.title} - Scadenza: ${dataFmt} [Prio: ${priority.text}] (${stato})\n`;
        });
        if (navigator.share) { try { await navigator.share({ title: 'I miei Compiti', text: riepilogoTesto }); } catch (err) {} } 
        else { try { await navigator.clipboard.writeText(riepilogoTesto); alert("Riepilogo copiato negli appunti!"); } catch (err) {} }
    });
}

function calculatePriority(dueDateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return { text: 'Urgente', class: 'tag-alta' };
    if (diffDays <= 5) return { text: 'Medio', class: 'tag-media' };
    return { text: 'Tranquillo', class: 'tag-bassa' };
}

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
                <button type="button" class="btn-card" data-action="edit">Modifica</button>
                ${task.status !== 'done' ? `<button type="button" class="btn-card" data-action="move">➔</button>` : ''}
                <button type="button" class="btn-card btn-card-delete" data-action="delete">Rimuovi</button>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(task.id));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => { 
            tasks = tasks.filter(t => t.id !== task.id); localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks(); if(currentDisplayMode==="calendar") buildCalendarGrid(); 
        });
        if (task.status !== 'done') {
            card.querySelector('[data-action="move"]').addEventListener('click', () => {
                if (task.status === 'todo') task.status = 'progress';
                else if (task.status === 'progress') {
                    task.status = 'done';
                    const todayStr = new Date().toLocaleDateString('it-IT');
                    if (lastStudyDate !== todayStr) { studyStreak++; lastStudyDate = todayStr; localStorage.setItem('kanban-streak', studyStreak); localStorage.setItem('kanban-last-date', lastStudyDate); }
                }
                localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks(); if(currentDisplayMode==="calendar") buildCalendarGrid();
            });
        }
        lists[task.status].appendChild(card);
    });

    const cTodo = document.getElementById('count-todo'); if(cTodo) cTodo.textContent = counts.todo;
    const cProg = document.getElementById('count-progress'); if(cProg) cProg.textContent = counts.progress;
    const cDone = document.getElementById('count-done'); if(cDone) cDone.textContent = counts.done;

    const total = counts.todo + counts.progress + counts.done;
    const progressPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    const pBar = document.getElementById('global-progress-bar'); if(pBar) pBar.style.width = `${progressPercent}%`;
    const pPerc = document.getElementById('global-progress-percent'); if(pPerc) pPerc.textContent = `${progressPercent}%`;

    updateAnalyticsDashboard(counts);
}


const clearDoneBtn = document.getElementById('btn-clear-done');
if(clearDoneBtn) {
    clearDoneBtn.addEventListener('click', () => {
        const doneTasksCount = tasks.filter(t => t.status === 'done').length; if (doneTasksCount === 0) return;
        if(confirm(`Vuoi cancellare definitivamente tutti i ${doneTasksCount} compiti completati?`)) {
            tasks = tasks.filter(t => t.status !== 'done'); localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks(); if(currentDisplayMode==="calendar") buildCalendarGrid();
        }
    });
}

function updateAnalyticsDashboard(counts) {
    const sDone = document.getElementById('stat-total-done'); if(sDone) sDone.textContent = counts.done;
    const todayStr = new Date().toLocaleDateString('it-IT');
    if (lastStudyDate && lastStudyDate !== todayStr) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastStudyDate === yesterday.toLocaleDateString('it-IT')) {} else studyStreak = 0;
    }
    const sStreak = document.getElementById('stat-streak'); if(sStreak) sStreak.textContent = `${studyStreak} 🔥`;

    const subjectNames = { '#2563eb': '🔵 Italiano', '#eab308': '🟡 Storia', '#dc2626': '🔴 Matematica', '#a855f7': '🟣 Informatica', '#f1f5f9': '⚪ Inglese', '#334155': '⚫ Altro' };
    const distribution = {}; Object.keys(subjectNames).forEach(color => distribution[color] = 0);
    tasks.forEach(t => { if(t.status === 'done' && distribution[t.subjectColor] !== undefined) distribution[t.subjectColor]++; });

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

if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => { alert("Stato radar autorizzazione: " + permission); });
        } else { alert("Questo browser non supporta le notifiche."); }
    });
}

function checkImminentExams() {
    if (!('serviceWorker' in navigator) || Notification.permission !== "granted") return;
    tasks.forEach(task => {
        if (task.status !== 'done') {
            const today = new Date(); today.setHours(0,0,0,0); const taskDate = new Date(task.date); taskDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
                const triggerDate = new Date(task.date); triggerDate.setDate(triggerDate.getDate() - 1); triggerDate.setHours(8, 0, 0, 0);
                navigator.serviceWorker.ready.then((registration) => { if (registration.active) registration.active.postMessage({ action: 'scheduleNotification', task: task, triggerAt: triggerDate.getTime() }); });
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


let lastScreenWidth = window.innerWidth;
window.addEventListener('resize', () => {
    if (window.innerWidth === lastScreenWidth) return;
    lastScreenWidth = window.innerWidth;
    if (window.innerWidth > 1024) { document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); } else { switchMobileView('todo'); }
});

if (window.innerWidth <= 1024) { setTimeout(() => { switchMobileView('todo'); }, 50); } else { document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); }

renderTasks();