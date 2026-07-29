import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const STATE = {
  tasks: [
    { id: '1', title: 'NexusTask Pro 서비스 테스트', category: 'work', priority: 'urgent', status: 'in-progress', dueDate: '2026-07-30', createdAt: Date.now() },
    { id: '2', title: 'Firebase Cloud DB 연결 테스트', category: 'work', priority: 'high', status: 'todo', dueDate: '2026-07-31', createdAt: Date.now() - 1000 }
  ],
  activeFilter: 'all',
  activeView: 'list',
  pomodoro: { timerId: null, timeLeft: 25 * 60, isRunning: false },
  firebase: { isConfigured: false, db: null }
};

document.addEventListener('DOMContentLoaded', () => {
  renderAllViews();
  initEventListeners();
  lucide.createIcons();
});

function initEventListeners() {
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const viewName = tab.dataset.view;
      document.querySelectorAll('.view-page').forEach(p => p.classList.remove('active'));
      document.getElementById(`view-${viewName}`).classList.add('active');
    });
  });

  document.getElementById('btn-open-task-modal').addEventListener('click', () => {
    document.getElementById('task-modal').classList.add('active');
  });
  document.getElementById('btn-close-task-modal').addEventListener('click', () => {
    document.getElementById('task-modal').classList.remove('active');
  });
  document.getElementById('btn-cancel-task').addEventListener('click', () => {
    document.getElementById('task-modal').classList.remove('active');
  });

  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('input-task-title').value;
    const category = document.getElementById('input-task-category').value;
    const priority = document.getElementById('input-task-priority').value;
    const dueDate = document.getElementById('input-task-due').value;

    STATE.tasks.unshift({
      id: String(Date.now()),
      title,
      category,
      priority,
      status: 'todo',
      dueDate,
      createdAt: Date.now()
    });

    document.getElementById('task-modal').classList.remove('active');
    renderAllViews();
  });
}

function renderAllViews() {
  const container = document.getElementById('task-list-container');
  container.innerHTML = STATE.tasks.map(task => `
    <div class="task-card">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="checkbox-custom" onclick="window.toggleTask('${task.id}')"></div>
        <div>
          <div style="font-weight:600;">${task.title}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">📅 ${task.dueDate || '마감일 없음'}</div>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('badge-all').textContent = STATE.tasks.length;
  lucide.createIcons();
}

window.toggleTask = function(id) {
  STATE.tasks = STATE.tasks.filter(t => t.id !== id);
  confetti({ particleCount: 50 });
  renderAllViews();
};