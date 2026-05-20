'use strict';

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'todo-app-v1';

let todos = [];
let currentFilter = 'all';

// ── Persistence ────────────────────────────────────────────────────────────
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) todos = JSON.parse(raw);
  } catch {
    todos = [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// ── Mutations ──────────────────────────────────────────────────────────────
function addTodo(text) {
  todos.unshift({ id: uid(), text: text.trim(), completed: false });
  saveTodos();
  render();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  saveTodos();
  render();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  render();
  showToast('タスクを削除しました');
}

function updateTodo(id, text) {
  const trimmed = text.trim();
  if (!trimmed) { deleteTodo(id); return; }
  const todo = todos.find(t => t.id === id);
  if (todo) { todo.text = trimmed; saveTodos(); render(); }
}

function clearCompleted() {
  const count = todos.filter(t => t.completed).length;
  todos = todos.filter(t => !t.completed);
  saveTodos();
  render();
  if (count > 0) showToast(`${count} 件の完了済みタスクを削除しました`);
}

// ── Derived State ──────────────────────────────────────────────────────────
function getFiltered() {
  if (currentFilter === 'active')    return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t =>  t.completed);
  return todos;
}

// ── Inline Editing ─────────────────────────────────────────────────────────
let editingState = null;

function startEdit(el, id) {
  if (editingState) finishEdit();

  const todo = todos.find(t => t.id === id);
  if (!todo || todo.completed) return;

  editingState = { el, id, original: todo.text };
  el.contentEditable = 'true';
  el.focus();

  // Place cursor at end
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function finishEdit() {
  if (!editingState) return;
  const { el, id } = editingState;
  const newText = el.textContent;
  editingState = null;
  el.contentEditable = 'false';
  updateTodo(id, newText);
}

function cancelEdit() {
  if (!editingState) return;
  const { el, original } = editingState;
  editingState = null;
  el.contentEditable = 'false';
  el.textContent = original;
}

// ── Theme ──────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const items       = getFiltered();
  const activeCount = todos.filter(t => !t.completed).length;
  const hasCompleted = todos.some(t => t.completed);
  const list        = $('todoList');
  const footer      = $('footer');
  const emptyState  = $('emptyState');

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });

  // Footer
  if (todos.length) {
    footer.hidden = false;
    $('activeCount').textContent =
      activeCount === 0 ? 'すべて完了！' : `${activeCount} 件残り`;
    $('clearBtn').hidden = !hasCompleted;
  } else {
    footer.hidden = true;
  }

  // Empty state
  if (items.length === 0) {
    emptyState.hidden = false;
    $('emptyMessage').textContent =
      currentFilter === 'active'    ? '未完了のタスクはありません' :
      currentFilter === 'completed' ? '完了済みのタスクはありません' :
                                      'タスクを追加してみましょう';
    $('emptyHint').hidden = todos.length > 0;
  } else {
    emptyState.hidden = true;
  }

  // Todo items
  list.innerHTML = items.map(todo => `
    <li class="todo-item${todo.completed ? ' completed' : ''}" data-id="${todo.id}">
      <label class="todo-checkbox" title="${todo.completed ? '未完了に戻す' : '完了にする'}">
        <input type="checkbox" class="checkbox"${todo.completed ? ' checked' : ''}>
        <span class="checkmark">
          <svg viewBox="0 0 11 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1,4.5 4,8 10,1"/>
          </svg>
        </span>
      </label>
      <span class="todo-text"${todo.completed ? '' : ' title="ダブルクリックで編集"'}>${escHtml(todo.text)}</span>
      <button class="delete-btn" title="削除" aria-label="削除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </li>
  `).join('');
}

// ── Event Wiring ───────────────────────────────────────────────────────────
function init() {
  loadTodos();
  initTheme();

  // Add task
  $('inputForm').addEventListener('submit', e => {
    e.preventDefault();
    const field = $('inputField');
    const text = field.value.trim();
    if (!text) {
      field.focus();
      return;
    }
    addTodo(text);
    field.value = '';
    field.focus();
  });

  // Theme toggle
  $('themeBtn').addEventListener('click', toggleTheme);

  // Clear completed
  $('clearBtn').addEventListener('click', clearCompleted);

  // Filter tabs
  $('filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    render();
  });

  // --- Todo list: event delegation ---
  const list = $('todoList');

  // Toggle checkbox
  list.addEventListener('change', e => {
    if (!e.target.matches('.checkbox')) return;
    const id = e.target.closest('[data-id]').dataset.id;
    toggleTodo(id);
  });

  // Delete button
  list.addEventListener('click', e => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    if (editingState) cancelEdit();
    const id = btn.closest('[data-id]').dataset.id;
    deleteTodo(id);
  });

  // Double-click to edit
  list.addEventListener('dblclick', e => {
    const textEl = e.target.closest('.todo-text');
    if (!textEl) return;
    const id = textEl.closest('[data-id]').dataset.id;
    startEdit(textEl, id);
  });

  // Editing keyboard shortcuts
  list.addEventListener('keydown', e => {
    if (!editingState) return;
    if (e.key === 'Enter')  { e.preventDefault(); finishEdit(); }
    if (e.key === 'Escape') { cancelEdit(); }
  });

  // Commit edit on blur (focusout bubbles, blur does not)
  list.addEventListener('focusout', e => {
    if (editingState && e.target === editingState.el) finishEdit();
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
