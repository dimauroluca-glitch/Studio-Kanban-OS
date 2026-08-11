/* ==========================================================================
   1. INIZIALIZZAZIONE STATO E CONTROLLO VISTA ADATTIVA SMARTPHONE
   ========================================================================== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=6.0')
            .then(reg => console.log('Mobile Engine Sync Active', reg.scope))
            .catch(err => console.log('SW Registration Fail', err));
    });
}

let tasks = JSON.parse(localStorage.getItem('kanban-tasks')) || [];
let currentSearchQuery = "";
let currentFilterType = "all";
let currentFilterPrio = "all";

// DOM principale
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskSubjectInput = document.getElementById('task-subject');
const taskTypeInput = document.getElementById('task-type');
const taskDateInput = document.getElementById('task-date');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const searchInput = document.getElementById('search-input');
const notificationBtn = document.getElementById('enable-notifications');
const formTitle = document.getElementById('form-title');
const toggleFilterPanelBtn = document.getElementById('toggle-filter-panel');
const advancedFilterPanel = document.getElementById('advanced-filter-panel');
const filterChips = document.querySelectorAll('.filter-chip');

taskDateInput.min = new Date().toISOString().split("T");

// FUNZIONE PER CAMBIARE COLONNA O APRIRE IL FORM SU SMARTPHONE
function switchMobileView(target) {
    if (window.innerWidth > 1024) return; // Disattivato su PC

    // Gestione colonne e form
    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => el.classList.remove('mobile-active'));
    
    if (target === 'form') {
        document.getElementById('panel-form').classList.add('mobile-active');
    } else {
        document.getElementById(`col-${target}`).classList.add('mobile-active');
    }

    // Gestione stato pulsanti della barra inferiore
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${target}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'instant' });
}
/* ==========================================================================
   2. REGISTRAZIONE EVENTI ED APPARATO FILTRI DI NAVIGAZIONE
   ========================================================================== */
taskForm.addEventListener('submit', handleFormSubmit);
cancelEditBtn.addEventListener('click', clearForm);
notificationBtn.addEventListener('click', () => {
    if ("Notification" in window) {
        Notification.requestPermission().then(p => { if (p === "granted") alert("Radar notifiche agganciato!"); });
    }
});

searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase();
    renderTasks();
});

toggleFilterPanelBtn.addEventListener('click', () => {
    advancedFilterPanel.classList.toggle('hidden-panel');
    toggleFilterPanelBtn.textContent = advancedFilterPanel.classList.contains('hidden-panel') ? "Avanzate 🛠️" : "Chiudi ❌";
});

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        if (chip.hasAttribute('data-filter-type')) {
            document.querySelectorAll('[data-filter-type]').forEach(c => c.classList.remove('active'));
            currentFilterType = chip.getAttribute('data-filter-type');
        }
        if (chip.hasAttribute('data-filter-prio')) {
            document.querySelectorAll('[data-filter-prio]').forEach(c => c.classList.remove('active'));
            currentFilterPrio = chip.getAttribute('data-filter-prio');
        }
        chip.classList.add('active');
        renderTasks();
    });
});
/* ==========================================================================
   3. CALCOLO DELLE DEADLINE ED OPERAZIONI SUL DATABASE LOCALE
   ========================================================================== */
function calculatePriority(dueDateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) return { text: 'Urgente', class: 'tag-alta' };
    if (diffDays <= 5) return { text: 'Medio', class: 'tag-media' };
    return { text: 'Tranquillo', class: 'tag-bassa' };
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const subjectColor = taskSubjectInput.value;
    const type = taskTypeInput.value;
    const date = taskDateInput.value;

    if (id) {
        tasks = tasks.map(t => t.id === id ? { ...t, title, subjectColor, type, date } : t);
    } else {
        tasks.push({ id: Date.now().toString(), title, subjectColor, type, date, status: 'todo' });
    }

    saveAndRender();
    clearForm();
    
    // CORREZIONE BUG MOBILE: Forza il reindirizzamento corretto alla colonna "In Coda"
    if (window.innerWidth <= 1024) {
        switchMobileView('todo'); 
    } else {
        renderTasks();
    }
    
    checkImminentExams();
}

function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskSubjectInput.value = task.subjectColor || "#a855f7";
    taskTypeInput.value = task.type;
    taskDateInput.value = task.date;

    formTitle.textContent = "Modifica Obiettivo";
    submitBtn.textContent = "Applica";
    cancelEditBtn.classList.remove('hidden');
    switchMobileView('form'); // Apre il pannello form su mobile per mostrare la modifica
}

function clearForm() {
    taskIdInput.value = "";
    taskForm.reset();
    formTitle.textContent = "Iniezione Obiettivo";
    submitBtn.textContent = "Inietta nel Sistema";
    cancelEditBtn.classList.add('hidden');
}

function saveAndRender() {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
    renderTasks();
}
/* ==========================================================================
   4. GENERAZIONE GRAFICA ADATTIVA ED ACCELERATORI DI SPOSTAMENTO TOUCH
   ========================================================================== */
function renderTasks() {
    const lists = { todo: document.getElementById('list-todo'), progress: document.getElementById('list-progress'), done: document.getElementById('list-done') };
    const counts = { todo: 0, progress: 0, done: 0 };

    Object.keys(lists).forEach(status => { lists[status].innerHTML = ''; setupDropZone(lists[status], status); });

    tasks.forEach(task => {
        if (counts[task.status] !== undefined) counts[task.status]++;

        const priority = calculatePriority(task.date);
        if (currentSearchQuery && !task.title.toLowerCase().includes(currentSearchQuery)) return;
        if (currentFilterType !== "all" && task.type !== currentFilterType) return;
        if (currentFilterPrio !== "all" && priority.text !== currentFilterPrio) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.id = task.id;
        card.style.borderLeftColor = task.subjectColor || '#a855f7';

        card.addEventListener('dragstart', () => card.classList.add('dragging'));
        card.addEventListener('dragend', () => card.classList.remove('dragging'));

        const formattedDate = new Date(task.date).toLocaleDateString('it-IT');
        const typeLabel = task.type === 'verifica' ? 'Esame' : 'Studio';

        card.innerHTML = `
            <div class="task-badge-row">
                <span class="task-type-label type-${task.type}">${typeLabel}</span>
                <span class="priority-tag ${priority.class}">${priority.text}</span>
            </div>
            <p class="task-card-title">${task.title}</p>
            <div class="task-card-date">📅 Scadenza: ${formattedDate}</div>
            <div class="task-actions">
                <button class="btn-card" data-action="edit">Modifica</button>
                ${task.status !== 'done' ? `<button class="btn-card" data-action="move" style="font-weight:900;">➔ Avanza</button>` : ''}
                <button class="btn-card btn-card-delete" data-action="delete">Rimuovi</button>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(task.id));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => { tasks = tasks.filter(t => t.id !== task.id); saveAndRender(); });
        if (task.status !== 'done') {
            card.querySelector('[data-action="move"]').addEventListener('click', () => {
                if (task.status === 'todo') task.status = 'progress';
                else if (task.status === 'progress') task.status = 'done';
                saveAndRender();
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
}

function setupDropZone(element, targetStatus) {
    element.addEventListener('dragover', (e) => { e.preventDefault(); element.classList.add('drag-over'); });
    element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
    element.addEventListener('drop', (e) => {
        e.preventDefault(); element.classList.remove('drag-over');
        const draggedCard = document.querySelector('.dragging');
        if (draggedCard) { const task = tasks.find(t => t.id === draggedCard.id); if (task) { task.status = targetStatus; saveAndRender(); } }
    });
}

function checkImminentExams() {
    tasks.forEach(task => {
        if (task.type === 'verifica' && task.status !== 'done') {
            const today = new Date(); today.setHours(0,0,0,0);
            const examDate = new Date(task.date); examDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 2) {
                const msg = diffDays === 0 ? `Radar Alert: Oggi esame di ${task.title}!` : `Mancano ${diffDays} giorni alla verifica di ${task.title}!`;
                if (Notification.permission === "granted") new Notification("🚨 Emergenza Studio", { body: msg });
            }
        }
    });
}

// Avvio iniziale corretto in base al dispositivo
window.addEventListener('resize', () => { if(window.innerWidth > 1024) document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => el.classList.remove('mobile-active')); else switchMobileView('todo'); });
if(window.innerWidth <= 1024) switchMobileView('todo');
renderTasks();
checkImminentExams();
