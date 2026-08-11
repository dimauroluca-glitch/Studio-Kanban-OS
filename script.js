/* ==========================================================================
   1. REGISTRAZIONE ENGINE, DATABASE E NAVIGAZIONE SMARTPHONE
   ========================================================================== */
// Registrazione automatica accoppiata al Service Worker per l'offline e i push
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=12.0')
            .then(reg => console.log('Motore Push Offline Sincronizzato!', reg.scope))
            .catch(err => console.log('Errore attivazione offline:', err));
    });
}

// Database dei compiti salvato permanentemente nell'hard disk del browser
let tasks = JSON.parse(localStorage.getItem('kanban-tasks')) || [];

// Parametri globali per il tracciamento dei filtri di navigazione
let currentSearchQuery = "";
let currentFilterType = "all";
let currentFilterPrio = "all";

// Mappatura elementi DOM
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

// FUNZIONE SMARTPHONE: scambia la colonna attiva o apre il modulo di creazione
function switchMobileView(target) {
    if (window.innerWidth > 1024) return; // Disattivato se l'utente usa un computer

    // BLOCCO DI SICUREZZA: Se l'utente sta scrivendo in un input, non salta a "In Coda"
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) {
        return; 
    }

    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => {
        el.classList.remove('mobile-active');
        el.style.display = 'none';
    });
    
    if (target === 'form') {
        const formEl = document.getElementById('panel-form');
        formEl.classList.add('mobile-active');
        formEl.style.display = 'block';
    } else {
        const colEl = document.getElementById(`col-${target}`);
        colEl.classList.add('mobile-active');
        colEl.style.display = 'block';
    }

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${target}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'instant' });
}
/* ==========================================================================
   2. TRACCIAMENTO FILTRI DINAMICI E CALCOLO SCADENZA CARD
   ========================================================================== */
function calculatePriority(dueDateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) return { text: 'Urgente', class: 'tag-alta' };
    if (diffDays <= 5) return { text: 'Medio', class: 'tag-media' };
    return { text: 'Tranquillo', class: 'tag-bassa' };
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        renderTasks();
    });
}

if (toggleFilterPanelBtn) {
    toggleFilterPanelBtn.addEventListener('click', () => {
        advancedFilterPanel.classList.toggle('hidden-panel');
    });
}

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
   3. MOTORE DI INSERIMENTO FORM, RESET MODULO E MODALITÀ MODIFICA
   ========================================================================== */
if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        
        const title = taskTitleInput.value.trim();
        const date = taskDateInput.value;

        if (!title || !date) {
            alert("Compila tutti i campi richiesti prima di procedere!");
            return;
        }

        const id = taskIdInput.value;
        const subjectColor = taskSubjectInput.value;
        const type = taskTypeInput.value;

        if (id) {
            tasks = tasks.map(t => t.id === id ? { ...t, title, subjectColor, type, date } : t);
        } else {
            tasks.push({ id: Date.now().toString(), title, subjectColor, type, date, status: 'todo' });
        }

        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
        
        // Forza la chiusura della tastiera touch del telefono per ripulire l'area
        if (document.activeElement) {
            document.activeElement.blur();
        }

        renderTasks();
        
        taskIdInput.value = "";
        taskTitleInput.value = "";
        taskDateInput.value = "";
        formTitle.textContent = "Nuovo Obiettivo";
        submitBtn.textContent = "Inietta nel Sistema";
        cancelEditBtn.classList.add('hidden');

        if (window.innerWidth <= 1024) {
            switchMobileView('todo'); // Riporta istantaneamente alla prima colonna
        }
        checkImminentExams();
    });
}

function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskSubjectInput.value = task.subjectColor || "#2563eb";
    taskTypeInput.value = task.type;
    taskDateInput.value = task.date;
    formTitle.textContent = "Modifica Obiettivo";
    submitBtn.textContent = "Applica";
    cancelEditBtn.classList.remove('hidden');
    switchMobileView('form');
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        taskIdInput.value = "";
        taskTitleInput.value = "";
        taskDateInput.value = "";
        formTitle.textContent = "Nuovo Obiettivo";
        submitBtn.textContent = "Inietta nel Sistema";
        cancelEditBtn.classList.add('hidden');
        switchMobileView('todo');
    });
}
/* ==========================================================================
   4. RENDERIZZATORE STRUTTURA CARD, PROGRESSO E PRENOTAZIONE SVEGLIE BACKGROUND
   ========================================================================== */
function renderTasks() {
    const lists = { todo: document.getElementById('list-todo'), progress: document.getElementById('list-progress'), done: document.getElementById('list-done') };
    const counts = { todo: 0, progress: 0, done: 0 };
    if (!lists.todo) return;

    Object.keys(lists).forEach(status => { lists[status].innerHTML = ''; });

    tasks.forEach(task => {
        if (counts[task.status] !== undefined) counts[task.status]++;
        const priority = calculatePriority(task.date);

        if (currentSearchQuery && !task.title.toLowerCase().includes(currentSearchQuery)) return;
        if (currentFilterType !== "all" && task.type !== currentFilterType) return;
        if (currentFilterPrio !== "all" && priority.text !== currentFilterPrio) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.id = task.id;
        card.style.borderLeftColor = task.subjectColor || '#2563eb'; // Assegna il colore esatto richiesto

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
        card.querySelector('[data-action="delete"]').addEventListener('click', () => { tasks = tasks.filter(t => t.id !== task.id); localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); renderTasks(); });
        if (task.status !== 'done') {
            card.querySelector('[data-action="move"]').addEventListener('click', () => {
                if (task.status === 'todo') task.status = 'progress';
                else if (task.status === 'progress') task.status = 'done';
                localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
                renderTasks();
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

if (notificationBtn) {
    notificationBtn.addEventListener('click', () => { if ("Notification" in window) { Notification.requestPermission().then(p => { if (p === "granted") alert("Radar attivo!"); }); } });
}

// RADAR ANTICIPATO: Prenota la sveglia alle 8:00 del giorno prima della scadenza
function checkImminentExams() {
    if (!('serviceWorker' in navigator) || Notification.permission !== "granted") return;

    tasks.forEach(task => {
        if (task.status !== 'done') { // Solo compiti attivi
            const today = new Date(); today.setHours(0,0,0,0);
            const taskDate = new Date(task.date); taskDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

            // Permette la programmazione se la scadenza è futura
            if (diffDays >= 0) {
                // Calcoliamo il giorno prima
                const triggerDate = new Date(task.date);
                triggerDate.setDate(triggerDate.getDate() - 1); // Sottrae 1 giorno alla scadenza
                triggerDate.setHours(8, 0, 0, 0); // Imposta l'orario alle 08:00 del mattino

                navigator.serviceWorker.ready.then((registration) => {
                    if (registration.active) {
                        registration.active.postMessage({
                            action: 'scheduleNotification',
                            task: task,
                            triggerAt: triggerDate.getTime() // Timestamp esatto del giorno prima alle 8:00
                        });
                    }
                });
            }
        }
    });
}

window.addEventListener('resize', () => { if (window.innerWidth > 1024) { document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); } else { switchMobileView('todo'); } });
if (window.innerWidth <= 1024) { setTimeout(() => { switchMobileView('todo'); }, 50); } else { document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); }

renderTasks();
checkImminentExams();
