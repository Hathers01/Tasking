/**
 * ====================================================================
 * 1. KONFIGURASI & STATE (Single Source of Truth)
 * ====================================================================
 */

const PRIORITY_STYLES = {
    tinggi: { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200", dot: "bg-red-500", strip: "bg-red-500", label: "TINGGI" },
    sedang: { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200", dot: "bg-yellow-500", strip: "bg-yellow-500", label: "SEDANG" },
    rendah: { badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200", dot: "bg-green-500", strip: "bg-green-500", label: "RENDAH" },
    telat: { badge: "bg-rose-600 text-white dark:bg-rose-700 border-rose-700", dot: "bg-white animate-pulse", strip: "bg-rose-600", label: "TELAT" }
};

const TITLES = [
    { lvl: 1, name: "Novice Tasker", color: "border-gray-200" },
    { lvl: 3, name: "Apprentice", color: "border-green-400" },
    { lvl: 5, name: "Productivity Pro", color: "border-blue-400" },
    { lvl: 10, name: "Task Master", color: "border-purple-400" },
    { lvl: 20, name: "Grandmaster", color: "border-yellow-400" },
    { lvl: 50, name: "Godlike", color: "border-red-500" }
];

// Inisialisasi State dari LocalStorage
const state = {
    tasks: JSON.parse(localStorage.getItem('focusTask_tasks')) || [],
    categories: JSON.parse(localStorage.getItem('focusTask_categories')) || ['Umum'],
    darkMode: localStorage.getItem('focusTask_theme') === 'dark',
    colorTheme: localStorage.getItem('focusTask_color') || '',
    viewMode: 'list', 
    currentDate: new Date(),
    currentTaskView: null,
    isPremium: localStorage.getItem('focusTask_premium') === 'true',
    xp: parseInt(localStorage.getItem('focusTask_xp')) || 0,
    level: parseInt(localStorage.getItem('focusTask_level')) || 1,
    adDismissedAt: parseInt(localStorage.getItem('focusTask_ad_dismissed') || 0)
};

// --- PRE-LOAD THEME (Mencegah FOUC/Flashing) ---
// Langsung jalankan logika dasar tema sebelum DOMContentLoaded sepenuhnya
const html = document.documentElement;
if (state.darkMode) html.classList.add('dark');
if (state.colorTheme) document.body.classList.add(state.colorTheme);


/**
 * ====================================================================
 * 2. CORE ENGINE & UI HELPERS
 * ====================================================================
 */

const els = {
    mainApp: document.getElementById('main-app'),
    addTaskForm: document.getElementById('add-task-form'),
    taskList: document.getElementById('view-list'),
    calendarView: document.getElementById('view-calendar'),
    calendarBody: document.getElementById('calendar-body'),
    dateDisplay: document.getElementById('date-display'),
    filterSort: document.getElementById('filter-sort'),
};

function init() {
    applyTheme(); // Terapkan icon yang sesuai
    renderDate();
    showMainApp();
    setInterval(updateClockAndIcon, 1000);
    updateClockAndIcon();
    updateUIForPremium(); 
    startRealTimePriorityCheck();
    setInterval(checkAdStatus, 10000);
    checkAdStatus(); 
    showPromoModal();
    updateXPDisplay(); 
}

// Menggabungkan logika tema dari kedua kode
function applyTheme() {
    // 1. Terapkan Class ke HTML
    state.darkMode ? html.classList.add('dark') : html.classList.remove('dark');
    
    // 2. Update Icon Navbar (jika ada)
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        state.darkMode ? themeIcon.classList.replace('fa-moon', 'fa-sun') : themeIcon.classList.replace('fa-sun', 'fa-moon');
    }

    // 3. Update Icon di Modal (jika ada)
    const modalIcon = document.getElementById('theme-modal-icon');
    if (modalIcon) {
        state.darkMode ? modalIcon.classList.replace('fa-moon', 'fa-sun') : modalIcon.classList.replace('fa-sun', 'fa-moon');
    }
}

function toggleTheme() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('focusTask_theme', state.darkMode ? 'dark' : 'light');
    applyTheme();
}

function changeColorTheme(themeName) {
    if (themeName && !checkPremiumFeature('custom_theme')) return;
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    if (themeName) document.body.classList.add(themeName);
    state.colorTheme = themeName;
    localStorage.setItem('focusTask_color', themeName);
}

function updateClockAndIcon() {
    const now = new Date();
    const hour = now.getHours();
    const clockEl = document.getElementById('clock-display');
    const iconEl = document.getElementById('time-icon');
    
    if(clockEl) clockEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    
    if(iconEl) {
        let icon = '🌙'; 
        if (hour >= 5 && hour < 11) icon = '🌅'; 
        else if (hour >= 11 && hour < 15) icon = '☀️'; 
        else if (hour >= 15 && hour < 18) icon = '🌇'; 
        else if (hour >= 18 || hour < 5) icon = '🌙'; 
        iconEl.textContent = icon;
    }
}

function renderDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if(els.dateDisplay) els.dateDisplay.textContent = new Date().toLocaleDateString('id-ID', options);
}

/**
 * ====================================================================
 * 3. GAMIFICATION & PREMIUM SYSTEM
 * ====================================================================
 */

function getTitleData(level) {
    return TITLES.slice().reverse().find(t => level >= t.lvl) || TITLES[0];
}

function updateXPDisplay() {
    const levelEl = document.getElementById('level-number');
    const titleEl = document.getElementById('user-title');
    const avatarContainer = document.getElementById('avatar-container');
    const xpText = document.getElementById('xp-text');
    const xpBar = document.getElementById('xp-bar');
    if(!levelEl) return;

    const nextLevelXP = state.level * 500;
    const progress = (state.xp / nextLevelXP) * 100;
    const currentTitleData = getTitleData(state.level);
    
    levelEl.textContent = state.level;
    if(titleEl) titleEl.textContent = currentTitleData.name;
    if(avatarContainer) {
        avatarContainer.className = avatarContainer.className.replace(/border-\w+-\d+/g, '');
        avatarContainer.classList.add(currentTitleData.color);
        if(!avatarContainer.classList.contains('border-2')) avatarContainer.classList.add('border-2');
    }
    if(xpText) xpText.textContent = `${state.xp}/${nextLevelXP} XP`;
    if(xpBar) xpBar.style.width = `${Math.min(progress, 100)}%`;
}

function addXP(amount) {
    state.xp += amount;
    const nextLevelXP = state.level * 500;
    if (state.xp >= nextLevelXP) {
        state.level++;
        state.xp -= nextLevelXP; 
        const newTitle = getTitleData(state.level);
        alert(`LEVEL UP! Selamat datang di Level ${state.level} 🎉\nGelar Baru: ${newTitle.name}`);
    }
    localStorage.setItem('focusTask_xp', state.xp);
    localStorage.setItem('focusTask_level', state.level);
    updateXPDisplay();
}

function checkPremiumFeature(featureName) {
    if (state.isPremium) return true;
    if (featureName === 'add_category' && state.categories.length >= 3) { openModal('modal-premium'); return false; }
    if (featureName === 'custom_theme') { openModal('modal-premium'); return false; }
    return true;
}

function activatePremium() {
    alert("Terima kasih! Anda sekarang user PRO. 🎉");
    state.isPremium = true;
    localStorage.setItem('focusTask_premium', 'true');
    closeModal('modal-premium');
    closeModal('modal-promo');
    updateUIForPremium();
    if (!document.getElementById('modal-category').classList.contains('hidden')) openCategoryModal();
}

function updateUIForPremium() {
    const badge = document.getElementById('pro-badge');
    const limitInfo = document.getElementById('category-limit-info');
    const banner = document.getElementById('premium-category-banner');
    if (state.isPremium) {
        if (badge) badge.classList.remove('hidden');
        if (limitInfo) limitInfo.textContent = "User PRO: Kategori Tanpa Batas ✨";
        if (banner) banner.classList.add('hidden');
    } else {
        if (badge) badge.classList.add('hidden');
        if (state.categories.length >= 3 && banner) banner.classList.remove('hidden');
    }
    checkAdStatus(); 
}

function checkAdStatus() {
    const adBanner = document.getElementById('ad-banner');
    if (!adBanner) return;
    if (state.isPremium) { adBanner.classList.add('hidden'); return; }
    const now = Date.now();
    const timeDiff = now - state.adDismissedAt;
    const tenMinutes = 10 * 60 * 1000;
    if (state.adDismissedAt === 0 || timeDiff > tenMinutes) { adBanner.classList.remove('hidden'); } 
    else { adBanner.classList.add('hidden'); }
}

function dismissAd() {
    const adBanner = document.getElementById('ad-banner');
    if (adBanner) {
        adBanner.classList.add('hidden');
        state.adDismissedAt = Date.now();
        localStorage.setItem('focusTask_ad_dismissed', state.adDismissedAt);
    }
}

function showPromoModal() {
    if (!state.isPremium) { setTimeout(() => { openModal('modal-promo'); }, 1000); }
}

function togglePremiumStatus() {
    if(confirm("Dev Mode: Toggle Premium Status?")) {
        state.isPremium = !state.isPremium;
        localStorage.setItem('focusTask_premium', state.isPremium);
        location.reload();
    }
}

/**
 * ====================================================================
 * 4. DATA LOGIC (CRUD, Priority, Categories)
 * ====================================================================
 */

function calculatePriority(d) {
    if(!d) return 'sedang';
    const now = new Date();
    const deadline = new Date(d);
    if (now > deadline) return 'telat';
    const diff = (deadline - now) / (1000 * 60 * 60 * 24);
    return diff < 3 ? 'tinggi' : (diff <= 7 ? 'sedang' : 'rendah');
}

function startRealTimePriorityCheck() {
    setInterval(() => {
        let changed = false;
        state.tasks.forEach(task => {
            if (task.completed) return;
            const newPrio = calculatePriority(task.deadline);
            if (newPrio !== task.priority) {
                task.priority = newPrio;
                changed = true;
                animatePriorityChange(task.id, newPrio);
            }
        });
        if (changed) saveTasks();
    }, 1000);
}

function animatePriorityChange(id, newPrio) {
    const card = document.getElementById(`task-${id}`);
    if (!card) return;
    const styles = PRIORITY_STYLES[newPrio];
    const strip = card.querySelector('.priority-strip');
    const badge = card.querySelector('.priority-badge');
    const dot = card.querySelector('.priority-dot');
    const label = card.querySelector('.priority-label');
    const footer = card.querySelector('.priority-footer');

    [strip, badge, dot, footer].forEach(el => { if(el) el.classList.add('priority-changed-anim'); });
    
    if(strip) strip.className = `priority-strip absolute left-0 top-4 bottom-4 w-1.5 rounded-r-lg transition-colors duration-1000 ${styles.strip}`;
    if(badge) badge.className = `priority-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors duration-1000 ${styles.badge}`;
    if(dot) dot.className = `priority-dot w-1.5 h-1.5 rounded-full transition-colors duration-1000 ${styles.dot}`;
    if(label) label.textContent = styles.label;
    if(footer) {
        if(newPrio === 'telat') footer.className = "priority-footer pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm transition-colors duration-1000";
        else footer.className = "priority-footer pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium transition-colors duration-1000";
    }
    setTimeout(() => { [strip, badge, dot, footer].forEach(el => { if(el) el.classList.remove('priority-changed-anim'); }); }, 1000);
}

function saveTasks() { localStorage.setItem('focusTask_tasks', JSON.stringify(state.tasks)); }

// Form Submission (Add Task)
if(els.addTaskForm) {
    els.addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('task-title').value;
        const categoryVal = document.getElementById('task-category').value;
        const deadlineVal = document.getElementById('task-deadline').value;

        if (!titleVal) { alert("Judul tugas harus diisi!"); return; }
        if (!categoryVal) { alert("Mohon pilih kategori!"); return; }
        if (!deadlineVal) { alert("Deadline harus diisi!"); return; }

        const autoPriority = calculatePriority(deadlineVal);
        const newTask = {
            id: Date.now(),
            title: titleVal,
            category: categoryVal,
            priority: autoPriority, 
            deadline: deadlineVal,
            notes: document.getElementById('task-notes').value,
            completed: false,
            createdAt: new Date().toISOString(),
            sentAlerts: [] 
        };
        state.tasks.push(newTask);
        saveTasks();
        renderTasks();
        renderCalendar();
        closeModal('modal-add');
        els.addTaskForm.reset();
        updatePriorityPreview(); 
    });
}

function updatePriorityPreview() {
    const val = document.getElementById('task-deadline').value;
    const el = document.getElementById('priority-preview');
    if(!val) { el.textContent = "Pilih deadline dulu..."; el.className = "font-bold text-gray-700 dark:text-gray-200"; return; }
    const p = calculatePriority(val);
    const style = PRIORITY_STYLES[p];
    let c = "text-green-500";
    if(p === 'tinggi') c = "text-red-500";
    if(p === 'sedang') c = "text-yellow-500";
    if(p === 'telat') c = "text-rose-600";
    
    el.textContent = style.label + (p==='telat'?' ⚠️':''); 
    el.className = `font-bold ${c}`;
}

// Category Management
function renderCategoryBadges() {
    const container = document.getElementById('current-categories');
    container.innerHTML = state.categories.length === 0 ? '<span class="text-xs text-gray-400 italic">Belum ada kategori</span>' : '';
    state.categories.forEach(cat => {
        const badge = document.createElement('div');
        badge.className = "bg-gray-100 dark:bg-slate-800 text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-gray-200 dark:border-slate-700 select-none group hover:border-red-200 dark:hover:border-red-900 transition-colors";
        badge.innerHTML = `<span>${cat}</span><button type="button" class="text-gray-400 group-hover:text-red-500 transition-colors cursor-pointer"><i class="fas fa-times"></i></button>`;
        badge.querySelector('button').onclick = (e) => { e.preventDefault(); deleteCategory(cat); };
        container.appendChild(badge);
    });
}

function deleteCategory(cat) {
    const origLen = state.categories.length;
    state.categories = state.categories.filter(c => c !== cat);
    if (state.categories.length < origLen) {
        localStorage.setItem('focusTask_categories', JSON.stringify(state.categories));
        renderCategoryBadges(); renderCategoryOptions(); renderTasks(); updateUIForPremium(); 
    }
}

document.getElementById('add-category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!checkPremiumFeature('add_category')) return;
    const input = document.getElementById('new-category-input');
    const newCat = input.value.trim();
    if (newCat && !state.categories.includes(newCat)) {
        state.categories.push(newCat);
        localStorage.setItem('focusTask_categories', JSON.stringify(state.categories));
        input.value = '';
        renderCategoryBadges(); renderCategoryOptions(); renderTasks(); updateUIForPremium();
    }
});

function renderCategoryOptions() {
    const select = document.getElementById('task-category');
    if (!select) return;
    select.innerHTML = '';
    state.categories.forEach((cat, index) => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (index === 0) option.selected = true; 
        select.appendChild(option);
    });
    if (state.categories.length > 0) {
        select.value = state.categories[0];
    }
    initCustomSelects();
}

/**
 * ====================================================================
 * 5. VIEW & RENDERING (List, Calendar, Folder)
 * ====================================================================
 */

function showMainApp() {
    if(els.mainApp) {
        els.mainApp.classList.remove('hidden');
        els.mainApp.classList.add('flex');
        renderTasks();
        renderCalendar();
        setTimeout(initCustomSelects, 100); 
    }
}

function renderTasks() {
    const container = els.taskList;
    if(!container) return;
    
    container.innerHTML = '';
    let tasks = state.tasks.filter(t => !t.completed);
    const sort = els.filterSort.value;

    // Empty State
    if (tasks.length === 0 && state.viewMode !== 'folder') {
        container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-500 ease-in-out transform origin-top";
        container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400"><div class="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-4xl animate-bounce">🌵</div><p class="font-medium">Belum ada tugas. Chill dulu!</p></div>`;
        return;
    }

    if (state.viewMode === 'folder') {
        container.className = "space-y-8 transition-all duration-500 ease-in-out transform origin-top pb-12"; 
        let cats = [...new Set([...state.categories, ...tasks.map(t => t.category)])].sort();
        
        // Sorting Categories
        cats.sort((a, b) => {
            if (sort === 'alpha') return a.localeCompare(b);
            if (sort === 'most_tasks') {
                const countA = tasks.filter(t => t.category === a).length;
                const countB = tasks.filter(t => t.category === b).length;
                return countB - countA;
            }
            if (sort === 'deadline') {
                const tasksA = tasks.filter(t => t.category === a);
                const minA = tasksA.length ? Math.min(...tasksA.map(t => new Date(t.deadline))) : Infinity;
                const tasksB = tasks.filter(t => t.category === b);
                const minB = tasksB.length ? Math.min(...tasksB.map(t => new Date(t.deadline))) : Infinity;
                return minA - minB;
            }
            return 0;
        });

        cats.forEach(cat => {
            const tInCat = tasks.filter(t => t.category === cat);
            tInCat.sort((a,b) => sort === 'deadline' ? new Date(a.deadline) - new Date(b.deadline) : a.title.localeCompare(b.title));
            
            const sec = document.createElement('div');
            sec.className = "mb-8 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 bg-white/50 dark:bg-slate-800/30";
            sec.innerHTML = `<div class="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between mb-6 transition-all hover:shadow-md cursor-default"><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-2xl bg-[#e0e7ff] dark:bg-slate-700/50 text-primary flex items-center justify-center text-xl"><i class="fas fa-folder"></i></div><h3 class="font-bold text-lg text-gray-800 dark:text-white">${cat}</h3></div><div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-sm">${tInCat.length}</div></div><div class="grid-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-2"></div>`;
            const gc = sec.querySelector('.grid-container');
            if(tInCat.length > 0) tInCat.forEach(t => gc.appendChild(createTaskCard(t)));
            else { gc.className = "flex items-center justify-center py-8 bg-gray-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700/50"; gc.innerHTML = `<span class="text-sm text-gray-400 italic">Belum ada tugas di kategori ini</span>`; }
            container.appendChild(sec);
        });
    } else {
        container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-500 ease-in-out transform origin-top";
        tasks.sort((a,b) => sort === 'deadline' ? new Date(a.deadline) - new Date(b.deadline) : a.title.localeCompare(b.title));
        tasks.forEach(t => container.appendChild(createTaskCard(t)));
    }
}

function createTaskCard(t) {
    const d = new Date(t.deadline);
    const dateStr = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    
    const styles = PRIORITY_STYLES[t.priority];
    const footerColor = t.priority === 'telat' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-500 dark:text-gray-400';

    const c = document.createElement('div');
    c.id = `task-${t.id}`; 
    c.className = "bg-white dark:bg-dark-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden";
    c.onclick = () => openTaskDetail(t.id);
    
    const strip = document.createElement('div');
    strip.className = `priority-strip absolute left-0 top-4 bottom-4 w-1.5 rounded-r-lg transition-colors duration-1000 ${styles.strip}`;
    c.appendChild(strip);

    c.innerHTML += `
        <div class="pl-4">
            <div class="flex justify-between items-start mb-4">
                <span class="inline-block px-3 py-1 rounded-lg bg-[#e0e7ff] dark:bg-indigo-900/30 text-primary font-bold text-[10px] tracking-wider uppercase">${t.category}</span>
                <span class="priority-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors duration-1000 ${styles.badge}">
                    <span class="priority-dot w-1.5 h-1.5 rounded-full transition-colors duration-1000 ${styles.dot}"></span> <span class="priority-label">${styles.label}</span>
                </span>
            </div>
            <h3 class="font-extrabold text-xl text-gray-800 dark:text-gray-100 mb-6 leading-tight group-hover:text-primary transition-colors">${t.title}</h3>
        </div>
        <div class="priority-footer pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 ${footerColor} text-sm font-medium transition-colors duration-1000">
            <i class="far fa-clock"></i><span>${dateStr}, ${timeStr}</span>
        </div>
    `;
    return c;
}

function renderCalendar() {
    const y = state.currentDate.getFullYear(), m = state.currentDate.getMonth();
    const monthEl = document.getElementById('calendar-month-year');
    if(monthEl) monthEl.textContent = new Date(y, m).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    const grid = els.calendarBody; 
    if(!grid) return;
    grid.innerHTML = '';
    
    const firstDay = new Date(y, m, 1).getDay(); 
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) { 
        const c = document.createElement('div'); 
        c.className = "calendar-day bg-transparent border-none"; 
        grid.appendChild(c); 
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
        const c = document.createElement('div'); 
        c.className = "calendar-day relative cursor-pointer flex flex-col items-center justify-start";
        c.innerHTML = `<span class="text-xs font-bold p-1 text-gray-500 dark:text-gray-400">${d}</span>`;
        
        const today = new Date();
        if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) {
            c.classList.add('ring-2', 'ring-primary', 'bg-primary/5');
        }
        
        const tCount = state.tasks.filter(t => !t.completed && new Date(t.deadline).getDate()===d && new Date(t.deadline).getMonth()===m && new Date(t.deadline).getFullYear()===y).length;
        if(tCount > 0) {
            const dots = document.createElement('div'); dots.className = "flex gap-1 mt-1";
            for(let k=0; k<Math.min(tCount, 3); k++) { 
                const dot = document.createElement('span'); 
                dot.className = "task-dot bg-primary"; 
                dots.appendChild(dot); 
            }
            c.appendChild(dots);
        }
        grid.appendChild(c);
    }
}

function changeMonth(o) { state.currentDate.setMonth(state.currentDate.getMonth() + o); renderCalendar(); }

// Task Detail Modal
function openTaskDetail(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    state.currentTaskView = t;
    
    const currentPrio = calculatePriority(t.deadline); 
    const styles = PRIORITY_STYLES[currentPrio];
    
    const badge = document.getElementById('detail-priority-badge');
    const icon = document.getElementById('detail-priority-icon');
    const text = document.getElementById('detail-priority');

    let badgeClass = "bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-gray-300 border-transparent";
    let iconClass = "text-primary";
    
    if (currentPrio === 'tinggi') {
            badgeClass = "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30";
            iconClass = "text-red-500";
    } else if (currentPrio === 'sedang') {
            badgeClass = "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30";
            iconClass = "text-yellow-500";
    } else if (currentPrio === 'telat') {
            badgeClass = "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
            iconClass = "text-rose-500";
    }

    badge.className = `flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${badgeClass}`;
    icon.className = `fas fa-flag ${iconClass}`;
    text.textContent = styles.label;

    document.getElementById('detail-title').textContent = t.title;
    document.getElementById('detail-category').textContent = t.category;
    document.getElementById('detail-notes').textContent = t.notes || "-";
    
    const d = new Date(t.deadline);
    const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    document.getElementById('detail-deadline').textContent = `${dateStr} pukul ${timeStr}`;

    const dateEl = document.getElementById('detail-deadline-wrapper');
    if (currentPrio === 'telat') {
        dateEl.classList.remove('bg-gray-50', 'dark:bg-slate-800');
        dateEl.classList.add('bg-rose-50', 'dark:bg-rose-900/20', 'text-rose-600', 'dark:text-rose-400');
    } else {
        dateEl.classList.add('bg-gray-50', 'dark:bg-slate-800');
        dateEl.classList.remove('bg-rose-50', 'dark:bg-rose-900/20', 'text-rose-600', 'dark:text-rose-400');
    }

    document.getElementById('btn-complete').onclick = () => markAsDone(t.id);
    document.getElementById('btn-gcal').onclick = () => addToGoogleCalendar(t);
    document.getElementById('btn-delete').onclick = () => deleteTask(t.id);
    openModal('modal-detail');
}

function deleteTask(id) { 
    if(confirm("Hapus?")) { 
        state.tasks = state.tasks.filter(t => t.id !== id); 
        saveTasks(); renderTasks(); renderCalendar(); closeModal('modal-detail'); 
    } 
}

function markAsDone(id) { 
    const t = state.tasks.find(x => x.id === id); 
    if(t) { 
        t.completed = true; 
        saveTasks(); 
        
        const currentPriority = calculatePriority(t.deadline);
        let xpGained = 0;
        let message = "";
        if (currentPriority === 'rendah') { xpGained = 200; message = "Luar biasa! Kamu sangat terencana."; } 
        else if (currentPriority === 'sedang') { xpGained = 150; message = "Kerja bagus! Tetap konsisten."; } 
        else if (currentPriority === 'tinggi') { xpGained = 100; message = "Fuh! Untung selesai sebelum deadline."; } 
        else { xpGained = 50; message = "Lebih baik terlambat daripada tidak sama sekali."; }

        addXP(xpGained);

        closeModal('modal-detail'); 
        const xpAnimEl = document.getElementById('xp-gain-anim');
        if(xpAnimEl) {
            xpAnimEl.textContent = `+${xpGained} XP`;
            xpAnimEl.classList.remove('animate-bounce');
            void xpAnimEl.offsetWidth; 
            xpAnimEl.classList.add('animate-bounce');
        }
        const msgEl = document.getElementById('celebration-msg');
        if(msgEl) msgEl.textContent = message;

        document.getElementById('modal-celebration').classList.remove('hidden'); 
        renderTasks(); 
        renderCalendar(); 
    } 
}

function closeCelebration() { document.getElementById('modal-celebration').classList.add('hidden'); }

function addToGoogleCalendar(t) {
    const s = new Date(t.deadline).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const e = new Date(new Date(t.deadline).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.title)}&dates=${s}/${e}&details=${encodeURIComponent(t.notes)}`, '_blank');
}

/**
 * ====================================================================
 * 6. MODALS & CUSTOM INPUTS
 * ====================================================================
 */

function openCategoryModal() { renderCategoryBadges(); updateUIForPremium(); openModal('modal-category'); }
function openModal(id) { document.getElementById(id).classList.remove('hidden'); if(id==='modal-add') renderCategoryOptions(); else initCustomSelects(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function openAddTaskModal() { openModal('modal-add'); const n=new Date(); n.setMinutes(n.getMinutes()-n.getTimezoneOffset()+60); document.getElementById('task-deadline').value=n.toISOString().slice(0,16); updatePriorityPreview(); }

function initCustomSelects() {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        const s = w.querySelector('select');
        if(s) { w.parentNode.insertBefore(s, w); s.style.display = 'block'; s.removeAttribute('data-customized'); }
        w.remove();
    });
    document.querySelectorAll('select').forEach(select => {
        if (select.dataset.customized === 'true') return;
        select.style.display = 'none';
        select.dataset.customized = 'true';
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper relative w-full font-medium select-none';
        const trigger = document.createElement('div');
        trigger.className = "flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary/50 transition-all rounded-xl p-3 px-4 text-sm w-full outline-none";
        const displayText = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : "Pilih...";
        trigger.innerHTML = `<span class="truncate text-gray-700 dark:text-gray-200">${displayText}</span><i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-300"></i>`;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = "absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-[100] overflow-hidden hidden opacity-0 transform scale-95 transition-all duration-200 origin-top max-h-60 overflow-y-auto custom-scrollbar";
        
        const toggleMenu = (forceState) => {
                if (forceState !== false) {
                    document.querySelectorAll('.custom-dropdown-options').forEach(el => {
                        if(el !== optionsDiv) {
                            el.classList.add('hidden', 'opacity-0', 'scale-95');
                            const otherTrigger = el.parentElement.querySelector('.fa-chevron-down');
                            if(otherTrigger) otherTrigger.classList.remove('rotate-180');
                        }
                    });
            }
            let isOpen = !optionsDiv.classList.contains('hidden');
            if (forceState !== undefined) isOpen = !forceState; 
            
            if (!isOpen) { 
                optionsDiv.classList.remove('hidden');
                requestAnimationFrame(() => {
                    optionsDiv.classList.remove('opacity-0', 'scale-95');
                    optionsDiv.classList.add('opacity-100', 'scale-100');
                });
                trigger.querySelector('.fa-chevron-down').classList.add('rotate-180');
                trigger.classList.add('border-primary/50', 'ring-2', 'ring-primary/20'); 
            } else { 
                optionsDiv.classList.remove('opacity-100', 'scale-100');
                optionsDiv.classList.add('opacity-0', 'scale-95');
                trigger.querySelector('.fa-chevron-down').classList.remove('rotate-180');
                trigger.classList.remove('border-primary/50', 'ring-2', 'ring-primary/20');
                setTimeout(() => {
                    if (optionsDiv.classList.contains('opacity-0')) optionsDiv.classList.add('hidden');
                }, 200);
            }
        };
        Array.from(select.options).forEach(option => {
            const div = document.createElement('div');
            div.className = "px-4 py-3 cursor-pointer hover:bg-primary/10 hover:text-primary dark:hover:bg-slate-700 transition-colors text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between";
            div.innerHTML = `<span>${option.text}</span>`;
            if (option.selected) div.classList.add('text-primary', 'bg-primary/5', 'font-bold');
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                trigger.querySelector('span').textContent = option.text;
                toggleMenu(false);
            });
            optionsDiv.appendChild(div);
        });
        trigger.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
        optionsDiv.classList.add('custom-dropdown-options');
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsDiv);
        document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) { toggleMenu(false); } });
    });
}

function updateSortOptions(view) {
    const select = document.getElementById('filter-sort');
    if(!select) return;
    const currentVal = select.value;
    select.innerHTML = ''; 
    const opts = [{v:'deadline', t:'Deadline Terdekat'}, {v:'alpha', t:'Abjad (A-Z)'}];
    if(view === 'folder') opts.push({v:'most_tasks', t:'Tugas Terbanyak'});
    opts.forEach(o => { const op = document.createElement('option'); op.value = o.v; op.text = o.t; select.appendChild(op); });
    if (select.querySelector(`option[value="${currentVal}"]`)) select.value = currentVal; else select.selectedIndex = 0;
    initCustomSelects();
}

function switchView(viewName) {
    const btnList = document.getElementById('btn-view-list');
    const btnFolder = document.getElementById('btn-view-folder');
    const btnCal = document.getElementById('btn-view-calendar');
    const viewList = document.getElementById('view-list');
    const viewCal = document.getElementById('view-calendar');
    const filterCont = document.getElementById('filter-container');
    
    updateSortOptions(viewName);

    [btnList, btnFolder, btnCal].forEach(btn => btn.className = "flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all text-gray-500 hover:text-gray-700 dark:hover:text-gray-300");
    state.viewMode = viewName;
    document.getElementById(`btn-view-${viewName}`).className = "flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all bg-white dark:bg-slate-700 text-primary shadow-sm";

    const containerList = document.getElementById('view-list');
    const containerCal = document.getElementById('view-calendar');
    
    let activeContainer = !containerList.classList.contains('hidden') ? containerList : containerCal;
    let nextContainer = (viewName === 'calendar') ? containerCal : containerList;

    const hiddenState = ['opacity-0', 'scale-95'];
    const visibleState = ['opacity-100', 'scale-100'];

    activeContainer.classList.remove(...visibleState);
    activeContainer.classList.add(...hiddenState);
    
    if(viewName === 'calendar') {
        filterCont.classList.remove(...visibleState);
        filterCont.classList.add(...hiddenState);
    }

    setTimeout(() => {
        activeContainer.classList.add('hidden');
        nextContainer.classList.remove('hidden');
        
        if(viewName === 'calendar') {
                filterCont.classList.add('hidden');
        } else {
                filterCont.classList.remove('hidden');
                filterCont.classList.remove(...hiddenState); 
                filterCont.classList.add(...visibleState);
        }

        if(viewName === 'calendar') renderCalendar();
        else renderTasks(); 

        requestAnimationFrame(() => {
            nextContainer.classList.remove(...hiddenState);
            nextContainer.classList.add(...visibleState);
        });
    }, 300);
}

// --- BOOTSTRAP ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}