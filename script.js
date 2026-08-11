/* ==========================================================================
   1. DATABASE LOCALE, VARIABILI DI STATO E NAVIGAZIONE SMARTPHONE
   ========================================================================== */
// Carica i compiti dall'hard disk del browser o crea un elenco vuoto
let tasks = JSON.parse(localStorage.getItem('kanban-tasks')) || [];

// Parametri globali per la gestione dei filtri attivi
let currentSearchQuery = "";
let currentFilterType = "all";
let currentFilterPrio = "all";

// Mappatura dei campi di input e dei pulsanti del modulo
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

// Blocca la selezione di date passate nel calendario nativo
if (taskDateInput) taskDateInput.min = new Date().toISOString().split("T")[0];

// FUNZIONE CORE MOBILE: scambia la colonna visibile o mostra il form di inserimento
function switchMobileView(target) {
    if (window.innerWidth > 1024) return; // Disattivato se l'utente usa un PC

    // Nasconde tutti i moduli e le colonne per evitare sovrapposizioni verticali
    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => {
        el.classList.remove('mobile-active');
        el.style.display = 'none'; // Forza la scomparsa visiva a livello CSS
    });
    
    // Attiva ed estrae esclusivamente il pannello mirato dal menu inferiore
    if (target === 'form') {
        const formEl = document.getElementById('panel-form');
        formEl.classList.add('mobile-active');
        formEl.style.display = 'block';
    } else {
        const colEl = document.getElementById(`col-${target}`);
        colEl.classList.add('mobile-active');
        colEl.style.display = 'block';
    }

    // Aggiorna lo stato visivo (colore azzurro) sull'icona della barra inferiore
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${target}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Riporta lo schermo in cima per migliorare l'ergonomia
    window.scrollTo({ top: 0, behavior: 'instant' });
}
/* ==========================================================================
   2. CENTRO FILTRI AVANZATO E ALGORITMO DI CALCOLO PRIORITÀ
   ========================================================================== */
// Calcola i giorni mancanti alla scadenza e restituisce la fascia di urgenza
function calculatePriority(dueDateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = new Date(dueDateStr); dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) return { text: 'Urgente', class: 'tag-alta' };
    if (diffDays <= 5) return { text: 'Medio', class: 'tag-media' };
    return { text: 'Tranquillo', class: 'tag-bassa' };
}

// Ascoltatore per la barra di ricerca testuale rapida
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase();
        renderTasks();
    });
}

// Gestore per l'apertura e chiusura a cassetto del pannello filtri avanzati
if (toggleFilterPanelBtn) {
    toggleFilterPanelBtn.addEventListener('click', () => {
        advancedFilterPanel.classList.toggle('hidden-panel');
    });
}

// Distribuisce l'ascolto dei tocchi su tutte le opzioni di filtro avanzato (Chips)
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        // Categoria Filtro: Tipo di attività
        if (chip.hasAttribute('data-filter-type')) {
            document.querySelectorAll('[data-filter-type]').forEach(c => c.classList.remove('active'));
            currentFilterType = chip.getAttribute('data-filter-type');
        }
        // Categoria Filtro: Grado di Urgenza
        if (chip.hasAttribute('data-filter-prio')) {
            document.querySelectorAll('[data-filter-prio]').forEach(c => c.classList.remove('active'));
            currentFilterPrio = chip.getAttribute('data-filter-prio');
        }
        chip.classList.add('active');
        renderTasks(); // Aggiorna istantaneamente la vista
    });
});
/* ==========================================================================
   3. GESTIONE OPERATIVA FORM: CREAZIONE E MODIFICA COMPITI
   ========================================================================== */
if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Impedisce qualsiasi rinfresco della pagina
        
        const title = taskTitleInput.value.trim();
        const date = taskDateInput.value;

        // Controllo di sbarramento: impedisce l'inserimento di schede vuote
        if (!title || !date) {
            alert("Compila tutti i campi richiesti prima di procedere!");
            return;
        }

        const id = taskIdInput.value;
        const subjectColor = taskSubjectInput.value;
        const type = taskTypeInput.value;

        if (id) {
            // Modalità Modifica: sovrascrive i dati del compito esistente
            tasks = tasks.map(t => t.id === id ? { ...t, title, subjectColor, type, date } : t);
        } else {
            // Modalità Nuovo: inserisce una nuova scheda in coda alla lista
            tasks.push({ id: Date.now().toString(), title, subjectColor, type, date, status: 'todo' });
        }

        // Salva i dati nell'hard disk del browser e riaggiorna l'interfaccia
        localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
        renderTasks();
        
        // Pulisce completamente il modulo per il prossimo inserimento
        taskIdInput.value = "";
        taskTitleInput.value = "";
        taskDateInput.value = "";
        formTitle.textContent = "Nuovo Obiettivo";
        submitBtn.textContent = "Inietta nel Sistema";
        cancelEditBtn.classList.add('hidden');

        // FIXED MOBILE: riporta l'utente alla lista compiti escludendo i freeze di navigazione
        if (window.innerWidth <= 1024) {
            switchMobileView('todo');
        }
        checkImminentExams();
    });
}

// Estrae i dati di un compito specifico e li ricarica nel form per la modifica
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
    switchMobileView('form'); // Apre il pannello su mobile per consentire la modifica
}

// Pulsante per annullare la modifica in corso e azzerare il modulo
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
   4. GENERATORE DELLE CARD HTML, AVANZAMENTO BARRA E NOTIFICHE RADAR
   ========================================================================== */
function renderTasks() {
    const lists = { todo: document.getElementById('list-todo'), progress: document.getElementById('list-progress'), done: document.getElementById('list-done') };
    const counts = { todo: 0, progress: 0, done: 0 };
    if (!lists.todo) return;

    // Svuota i vecchi nodi prima di iniettare i nuovi elementi aggiornati
    Object.keys(lists).forEach(status => { lists[status].innerHTML = ''; });

    tasks.forEach(task => {
        if (counts[task.status] !== undefined) counts[task.status]++;
        const priority = calculatePriority(task.date);

        // Sistema di filtraggio incrociato combinato (Ricerca, Tipo e Urgenza)
        if (currentSearchQuery && !task.title.toLowerCase().includes(currentSearchQuery)) return;
        if (currentFilterType !== "all" && task.type !== currentFilterType) return;
        if (currentFilterPrio !== "all" && priority.text !== currentFilterPrio) return;

        const card = document.createElement('div');
        card.className = 'task-card';
        card.id = task.id;
        card.style.borderLeftColor = task.subjectColor || '#a855f7'; // Colore personalizzato materia

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

        // Associazione degli eventi d'ascolto per i pulsanti interni alla card
        card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(task.id));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => { 
            tasks = tasks.filter(t => t.id !== task.id); 
            localStorage.setItem('kanban-tasks', JSON.stringify(tasks)); 
            renderTasks(); 
        });
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

    // Aggiorna i contatori numerici nelle intestazioni delle colonne
    document.getElementById('count-todo').textContent = counts.todo;
    document.getElementById('count-progress').textContent = counts.progress;
    document.getElementById('count-done').textContent = counts.done;

    // Calcolo matematico percentuale avanzamento studio globale
    const total = counts.todo + counts.progress + counts.done;
    const progressPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    document.getElementById('global-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('global-progress-percent').textContent = `${progressPercent}%`;
}

// Gestione dei permessi per le notifiche push del browser
if (notificationBtn) {
    notificationBtn.addEventListener('click', () => { 
        if ("Notification" in window) { 
            Notification.requestPermission().then(p => { if (p === "granted") alert("Radar attivo e pronto!"); }); 
        } 
    });
}

// Scansiona le scadenze attive per trovare esami imminenti (entro 2 giorni)
function checkImminentExams() {
    tasks.forEach(task => {
        if (task.type === 'verifica' && task.status !== 'done') {
            const today = new Date(); today.setHours(0,0,0,0);
            const examDate = new Date(task.date); examDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 2 && Notification.permission === "granted") {
                new Notification("🚨 Emergenza Studio", { body: `Mancano ${diffDays} giorni all'esame di ${task.title}!` });
            }
        }
    });
}

// Inizializzazione adattiva all'avvio in base alle dimensioni dello schermo dello smartphone
window.addEventListener('resize', () => { 
    if (window.innerWidth > 1024) { 
        document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); 
    } else { 
        switchMobileView('todo'); 
    } 
});

if (window.innerWidth <= 1024) { 
    setTimeout(() => { switchMobileView('todo'); }, 50); 
} else { 
    document.querySelectorAll('.mobile-column, .mobile-panel').forEach(el => { el.style.display = 'block'; }); 
}

// Esecuzione del rendering iniziale dei dati salvati
renderTasks();
