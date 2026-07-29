import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDE_RbZENWOxhoU3vzdIYlTgglhbHvQA1o",
  authDomain: "todowebapp-13dd1.firebaseapp.com",
  projectId: "todowebapp-13dd1",
  storageBucket: "todowebapp-13dd1.firebasestorage.app",
  messagingSenderId: "263896289826",
  appId: "1:263896289826:web:e24f1d759a6df287f0b07b"
};

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_CATEGORIES = [
  { id: 'work', name: '💼 업무 & 비즈니스', color: '#6366f1' },
  { id: 'personal', name: '👤 개인 & 라이프', color: '#10b981' },
  { id: 'study', name: '📚 자기계발 & 공부', color: '#8b5cf6' },
  { id: 'health', name: '🏋️ 운동 & 건강', color: '#f59e0b' }
];

const INITIAL_DEMO_TASKS = [
  { id: '1', title: 'NexusTask Pro 디자인 및 뷰 검토', category: 'work', priority: 'urgent', status: 'in-progress', dueDate: getTodayStr(), createdAt: Date.now() - 3600000 },
  { id: '2', title: 'Firebase Cloud DB 실시간 동기화 확인', category: 'work', priority: 'high', status: 'todo', dueDate: getTodayStr(), createdAt: Date.now() - 7200000 },
  { id: '3', title: '헬스장 어깨 & 가슴 운동', category: 'health', priority: 'medium', status: 'completed', dueDate: getTodayStr(), createdAt: Date.now() - 86400000 },
  { id: '4', title: 'React / JS 프론트엔드 서적 읽기', category: 'study', priority: 'low', status: 'todo', dueDate: '2026-08-05', createdAt: Date.now() - 10000000 }
];

const STATE = {
  tasks: JSON.parse(localStorage.getItem('nexustask_tasks')) || INITIAL_DEMO_TASKS,
  categories: JSON.parse(localStorage.getItem('nexustask_categories')) || DEFAULT_CATEGORIES,
  activeFilter: 'all',
  activeView: 'list',
  searchQuery: '',
  theme: 'dark',
  pomodoro: { timerId: null, timeLeft: 25 * 60, isRunning: false },
  firebase: { isConfigured: true, db: null }
};

window.switchView = function(viewName) {
  STATE.activeView = viewName;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.view-tab[data-view="${viewName}"]`);
  if (activeTab) activeTab.classList.add('active');

  document.querySelectorAll('.view-page').forEach(p => p.classList.remove('active'));
  const activePage = document.getElementById(`view-${viewName}`);
  if (activePage) activePage.classList.add('active');

  renderAllViews();
};

window.setFilter = function(filterCat) {
  STATE.activeFilter = filterCat;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-filter-cat="${filterCat}"]`);
  if (activeNav) activeNav.classList.add('active');

  const titleEl = document.getElementById('current-category-title');
  const catObj = STATE.categories.find(c => c.id === filterCat);

  const titles = {
    all: '전체 할 일 목록',
    today: '오늘 해야 할 일 📅',
    important: '중요 할 일 ⭐️'
  };

  if (titleEl) {
    if (titles[filterCat]) titleEl.textContent = titles[filterCat];
    else if (catObj) titleEl.textContent = catObj.name;
    else titleEl.textContent = '할 일 목록';
  }
  renderAllViews();
};

window.toggleTheme = function() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', STATE.theme);
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', STATE.theme === 'dark' ? 'moon' : 'sun');
    lucide.createIcons();
  }
};

window.openCategoryModal = function() {
  document.getElementById('category-modal').classList.add('active');
};
window.closeCategoryModal = function() {
  document.getElementById('category-modal').classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  saveLocalTasks();
  saveLocalCategories();
  initAutoFirebase();
  bindClickEvents();
  renderAllViews();
  lucide.createIcons();
});

function saveLocalTasks() {
  localStorage.setItem('nexustask_tasks', JSON.stringify(STATE.tasks));
}
function saveLocalCategories() {
  localStorage.setItem('nexustask_categories', JSON.stringify(STATE.categories));
}

function initAutoFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    STATE.firebase.db = getFirestore(app);
    STATE.firebase.isConfigured = true;
    updateDbStatusUI(true, '🟢 클라우드 DB 자동 연결됨');
    subscribeFirebaseTasks();
  } catch (e) {
    console.warn('Firebase init:', e);
    updateDbStatusUI(false, '게스트 로컬 저장');
  }
}

function subscribeFirebaseTasks() {
  if (!STATE.firebase.db) return;
  try {
    const q = query(collection(STATE.firebase.db, 'tasks'));
    onSnapshot(q, (snapshot) => {
      const remoteTasks = [];
      snapshot.forEach((docSnap) => {
        remoteTasks.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (remoteTasks.length > 0) {
        STATE.tasks = remoteTasks;
        saveLocalTasks();
        renderAllViews();
      }
    });
  } catch (err) {
    console.error(err);
  }
}

function updateDbStatusUI(isOnline, text) {
  const dot = document.getElementById('db-status-dot');
  const label = document.getElementById('db-status-text');
  if (dot) dot.style.background = isOnline ? '#10b981' : '#f59e0b';
  if (label) label.textContent = text;
}

function bindClickEvents() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      STATE.searchQuery = e.target.value.trim().toLowerCase();
      renderAllViews();
    });
  }

  const btnOpenModal = document.getElementById('btn-open-task-modal');
  if (btnOpenModal) btnOpenModal.addEventListener('click', () => {
    populateCategoryOptions();
    const dueDateInput = document.getElementById('input-task-due');
    if (dueDateInput) dueDateInput.value = getTodayStr();
    document.getElementById('task-modal').classList.add('active');
  });

  const btnCloseModal = document.getElementById('btn-close-task-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', () => document.getElementById('task-modal').classList.remove('active'));

  const btnCancelTask = document.getElementById('btn-cancel-task');
  if (btnCancelTask) btnCancelTask.addEventListener('click', () => document.getElementById('task-modal').classList.remove('active'));

  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('input-task-title').value;
      const category = document.getElementById('input-task-category').value;
      const priority = document.getElementById('input-task-priority').value;
      const dueDate = document.getElementById('input-task-due').value || getTodayStr();

      const newTask = {
        title,
        category,
        priority,
        status: 'todo',
        dueDate,
        createdAt: Date.now()
      };

      if (STATE.firebase.isConfigured && STATE.firebase.db) {
        addDoc(collection(STATE.firebase.db, 'tasks'), newTask);
      }

      STATE.tasks.unshift({ id: String(Date.now()), ...newTask });
      saveLocalTasks();
      renderAllViews();
      document.getElementById('task-modal').classList.remove('active');
    });
  }

  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('input-cat-name').value.trim();
      const color = document.getElementById('input-cat-color').value;

      if (name) {
        const id = `cat-${Date.now()}`;
        STATE.categories.push({ id, name, color });
        saveLocalCategories();
        renderSidebarCategories();
        populateCategoryOptions();
        window.closeCategoryModal();
        catForm.reset();
      }
    });
  }

  const btnPomoStart = document.getElementById('btn-pomo-start');
  if (btnPomoStart) btnPomoStart.addEventListener('click', togglePomodoro);

  const btnPomoReset = document.getElementById('btn-pomo-reset');
  if (btnPomoReset) btnPomoReset.addEventListener('click', resetPomodoro);
}

function renderSidebarCategories() {
  const container = document.getElementById('sidebar-categories-list');
  if (!container) return;

  container.innerHTML = STATE.categories.map(c => {
    const count = STATE.tasks.filter(t => t.category === c.id).length;
    return `
      <div class="nav-item ${STATE.activeFilter === c.id ? 'active' : ''}" data-filter-cat="${c.id}" onclick="window.setFilter('${c.id}')">
        <div class="nav-item-left">
          <span class="cat-dot" style="background: ${c.color || '#6366f1'};"></span>
          <span>${c.name}</span>
        </div>
        <span class="badge">${count}</span>
      </div>
    `;
  }).join('');
}

function populateCategoryOptions() {
  const select = document.getElementById('input-task-category');
  if (!select) return;
  select.innerHTML = STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function getFilteredTasks() {
  let list = [...STATE.tasks];
  const todayStr = getTodayStr();

  if (STATE.activeFilter === 'today') {
    list = list.filter(t => t.dueDate === todayStr);
  } else if (STATE.activeFilter === 'important') {
    list = list.filter(t => t.priority === 'urgent' || t.priority === 'high');
  } else if (STATE.activeFilter !== 'all') {
    list = list.filter(t => t.category === STATE.activeFilter);
  }

  if (STATE.searchQuery) {
    list = list.filter(t => t.title.toLowerCase().includes(STATE.searchQuery));
  }
  return list;
}

function renderAllViews() {
  const filtered = getFilteredTasks();
  renderSidebarCategories();
  updateBadges();

  renderListView(filtered);
  renderKanbanView(filtered);
  renderCalendarView();
  updateStats();

  lucide.createIcons();
}

function updateBadges() {
  const todayStr = getTodayStr();
  
  const allEl = document.getElementById('badge-all');
  if (allEl) allEl.textContent = STATE.tasks.length;

  const todayEl = document.getElementById('badge-today');
  if (todayEl) todayEl.textContent = STATE.tasks.filter(t => t.dueDate === todayStr).length;

  const impEl = document.getElementById('badge-important');
  if (impEl) impEl.textContent = STATE.tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
}

function renderListView(tasks) {
  const container = document.getElementById('task-list-container');
  if (!container) return;
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div style="padding:48px 20px; text-align:center; color:var(--text-muted);">
        <i data-lucide="check-circle-2" style="width:48px; height:48px; opacity:0.4; margin-bottom:12px;"></i>
        <p style="font-weight:700; color:var(--text-primary);">해당 항목에 등록된 할 일이 없습니다.</p>
        <p style="font-size:0.85rem; margin-top:4px;">'+ 새할일' 버튼을 눌러 추가해 보세요!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(t => {
    const isCompleted = t.status === 'completed';
    return `
      <div class="task-card ${isCompleted ? 'completed' : ''}" style="--priority-color: ${getPriorityColor(t.priority)}">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="checkbox-custom" onclick="window.toggleTask('${t.id}')">
            ${isCompleted ? '✓' : ''}
          </div>
          <div>
            <div style="font-weight:600; font-size:0.95rem; ${isCompleted ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${t.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
              <span>📅 마감일: ${t.dueDate || '없음'}</span> · 
              <span>카테고리: ${getCategoryLabel(t.category)}</span> · 
              <span>상태: ${getStatusLabel(t.status)}</span>
            </div>
          </div>
        </div>
        <button class="btn-secondary" onclick="window.deleteTask('${t.id}')" style="padding:4px 10px; font-size:0.75rem;">삭제</button>
      </div>
    `;
  }).join('');
}

function renderKanbanView(tasks) {
  const cols = {
    todo: document.getElementById('kanban-cards-todo'),
    'in-progress': document.getElementById('kanban-cards-in-progress'),
    completed: document.getElementById('kanban-cards-completed')
  };
  if (!cols.todo) return;
  Object.values(cols).forEach(c => c.innerHTML = '');

  const counts = { todo: 0, 'in-progress': 0, completed: 0 };

  tasks.forEach(t => {
    const st = t.status || 'todo';
    counts[st] = (counts[st] || 0) + 1;

    const card = document.createElement('div');
    card.className = `task-card ${st === 'completed' ? 'completed' : ''}`;
    card.style.setProperty('--priority-color', getPriorityColor(t.priority));
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';
    card.style.gap = '10px';

    let actionButtons = '';
    if (st === 'todo') {
      actionButtons = `<button class="btn-secondary" onclick="window.changeStatus('${t.id}', 'in-progress')" style="font-size:0.72rem; padding:4px 10px; background:var(--accent-primary); color:white;">🔵 진행 중으로 이동 ➔</button>`;
    } else if (st === 'in-progress') {
      actionButtons = `
        <div style="display:flex; gap:6px;">
          <button class="btn-secondary" onclick="window.changeStatus('${t.id}', 'todo')" style="font-size:0.72rem; padding:4px 8px;">👈 대기</button>
          <button class="btn-secondary" onclick="window.changeStatus('${t.id}', 'completed')" style="font-size:0.72rem; padding:4px 8px; background:var(--accent-success); color:white;">완료! 🎉</button>
        </div>
      `;
    } else if (st === 'completed') {
      actionButtons = `<button class="btn-secondary" onclick="window.changeStatus('${t.id}', 'in-progress')" style="font-size:0.72rem; padding:4px 10px;">↩️ 진행 중으로 다시 복구</button>`;
    }

    card.innerHTML = `
      <div style="width:100%;">
        <div style="font-size:0.9rem; font-weight:700;">${t.title}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">📅 ${t.dueDate || '마감일 없음'} · ${getCategoryLabel(t.category)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        ${actionButtons}
        <button onclick="window.deleteTask('${t.id}')" style="background:transparent; border:none; color:var(--accent-danger); cursor:pointer; font-size:0.75rem;">삭제</button>
      </div>
    `;
    if (cols[st]) cols[st].appendChild(card);
  });

  const cTodo = document.getElementById('kanban-count-todo');
  if (cTodo) cTodo.textContent = counts.todo;

  const cInProg = document.getElementById('kanban-count-in-progress');
  if (cInProg) cInProg.textContent = counts['in-progress'];

  const cComp = document.getElementById('kanban-count-completed');
  if (cComp) cComp.textContent = counts.completed;
}

window.changeStatus = function(id, newStatus) {
  const task = STATE.tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveLocalTasks();
    if (newStatus === 'completed') {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    }
    renderAllViews();
  }
};

function renderCalendarView() {
  const container = document.getElementById('calendar-days-container');
  if (!container) return;
  container.innerHTML = '';
  
  const todayDate = new Date();
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const todayDay = todayDate.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const cell = document.createElement('div');
    const isToday = i === todayDay;
    cell.style.cssText = `
      background: var(--bg-primary); 
      border: 1px solid ${isToday ? 'var(--accent-primary)' : 'var(--glass-border)'}; 
      padding: 8px; 
      border-radius: 8px; 
      min-height: 70px; 
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    cell.innerHTML = `<span style="font-weight:700; ${isToday ? 'color:var(--accent-primary);' : ''}">${i}일 ${isToday ? '(오늘)' : ''}</span>`;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayTasks = STATE.tasks.filter(t => t.dueDate === dateStr);
    dayTasks.slice(0, 2).forEach(t => {
      const pill = document.createElement('div');
      pill.style.cssText = 'background:var(--accent-primary); color:white; padding:2px 6px; border-radius:4px; font-size:0.68rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;';
      pill.textContent = t.title;
      cell.appendChild(pill);
    });

    container.appendChild(cell);
  }
}

function updateStats() {
  const total = STATE.tasks.length;
  const completed = STATE.tasks.filter(t => t.status === 'completed').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const totalEl = document.getElementById('stat-total-completed');
  const rateEl = document.getElementById('stat-completion-rate');
  if (totalEl) totalEl.textContent = `${completed}개 완수 / 총 ${total}개`;
  if (rateEl) rateEl.textContent = `${rate}%`;
}

window.toggleTask = function(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (task) {
    task.status = task.status === 'completed' ? 'todo' : 'completed';
    saveLocalTasks();
    if (task.status === 'completed') {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    }
    renderAllViews();
  }
};

window.deleteTask = function(id) {
  STATE.tasks = STATE.tasks.filter(t => t.id !== id);
  saveLocalTasks();
  renderAllViews();
};

function togglePomodoro() {
  const pomo = STATE.pomodoro;
  if (pomo.isRunning) {
    clearInterval(pomo.timerId);
    pomo.isRunning = false;
    document.getElementById('pomo-btn-label').textContent = '시작';
  } else {
    pomo.isRunning = true;
    document.getElementById('pomo-btn-label').textContent = '일시정지';
    pomo.timerId = setInterval(() => {
      if (pomo.timeLeft > 0) {
        pomo.timeLeft--;
        const m = String(Math.floor(pomo.timeLeft / 60)).padStart(2, '0');
        const s = String(pomo.timeLeft % 60).padStart(2, '0');
        document.getElementById('pomo-time-display').textContent = `${m}:${s}`;
      }
    }, 1000);
  }
}

function resetPomodoro() {
  clearInterval(STATE.pomodoro.timerId);
  STATE.pomodoro.isRunning = false;
  STATE.pomodoro.timeLeft = 25 * 60;
  document.getElementById('pomo-time-display').textContent = '25:00';
  document.getElementById('pomo-btn-label').textContent = '시작';
}

function getPriorityColor(p) {
  switch (p) {
    case 'urgent': return 'var(--priority-urgent)';
    case 'high': return 'var(--priority-high)';
    case 'medium': return 'var(--priority-medium)';
    case 'low': return 'var(--priority-low)';
    default: return 'var(--accent-primary)';
  }
}

function getStatusLabel(st) {
  switch (st) {
    case 'todo': return '🟡 대기 중';
    case 'in-progress': return '🔵 진행 중';
    case 'completed': return '🟢 완료됨';
    default: return '대기 중';
  }
}

function getCategoryLabel(catId) {
  const c = STATE.categories.find(item => item.id === catId);
  return c ? c.name : '기타';
}