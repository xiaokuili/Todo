// Todo 展示列表模块
import { api } from './api.js';

export class TodoModule {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.todos = [];
    this.onUpdate = null;
  }

  setTodos(todos) {
    this.todos = todos;
  }

  render(filterDate = null) {
    let filtered = this.todos;
    if (filterDate) {
      filtered = this.todos.filter(t => (t.date || '').split('T')[0] === filterDate);
      document.getElementById('list-title').textContent = `${filterDate} 的任务`;
    } else {
      document.getElementById('list-title').textContent = `所有待办`;
    }

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div class="text-slate-300 mb-3 flex justify-center"><i data-lucide="clipboard-list" class="w-12 h-12"></i></div>
          <p class="text-slate-400 text-sm">暂无任务</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // 按日期和时间排序
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.start || '99:99').localeCompare(b.start || '99:99');
    });

    this.container.innerHTML = sorted.map(todo => this.renderRow(todo)).join('');
    this.bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  renderRow(todo) {
    const isCompleted = todo.status === 'completed';
    const statusIcon = isCompleted ? 'check-circle-2' : (todo.status === 'in_progress' ? 'clock' : 'circle');
    const statusColor = isCompleted ? 'text-emerald-500' : (todo.status === 'in_progress' ? 'text-amber-500' : 'text-slate-300');

    return `
      <div class="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all">
        <div class="flex items-start gap-4">
          <!-- 状态选择 -->
          <button class="mt-1 status-btn ${statusColor}" data-id="${todo.id}" data-status="${todo.status}">
            <i data-lucide="${statusIcon}" class="w-5 h-5"></i>
          </button>

          <!-- 内容主体 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="name-text text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 truncate ${isCompleted ? 'line-through text-slate-400' : ''}" 
                data-id="${todo.id}" 
                title="双击修改名称">
                ${this.escapeHtml(todo.name)}
              </span>
              ${todo.project ? `<span class="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                <i data-lucide="folder" class="w-3 h-3"></i> ${this.escapeHtml(todo.project)}
              </span>` : ''}
            </div>

            <div class="flex items-center gap-4 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <i data-lucide="calendar-days" class="w-3 h-3"></i> ${todo.date || '未定日期'}
              </span>
              <button class="time-btn flex items-center gap-1 hover:text-blue-500 transition-colors" data-id="${todo.id}" title="点击设置时间">
                <i data-lucide="alarm-clock" class="w-3 h-3"></i> 
                <span class="time-text">${todo.start ? `${todo.start}${todo.end ? ` - ${todo.end}` : ''}` : '设置时间'}</span>
              </button>
            </div>

            ${todo.description ? `<p class="mt-2 text-xs text-slate-500 line-clamp-1">${this.escapeHtml(todo.description)}</p>` : ''}
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-2 text-slate-400 hover:text-slate-600 delete-btn" data-id="${todo.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 双击修改名称
    this.container.querySelectorAll('.name-text').forEach(el => {
      el.ondblclick = () => this.enterNameEdit(el);
    });

    // 点击设置时间
    this.container.querySelectorAll('.time-btn').forEach(el => {
      el.onclick = () => this.enterTimeEdit(el);
    });

    // 状态切换
    this.container.querySelectorAll('.status-btn').forEach(el => {
      el.onclick = async () => {
        const id = el.dataset.id;
        const current = el.dataset.status;
        const next = current === 'completed' ? 'pending' : (current === 'in_progress' ? 'completed' : 'in_progress');
        await api.updateTodo(id, { status: next });
        if (this.onUpdate) this.onUpdate();
      };
    });

    // 删除
    this.container.querySelectorAll('.delete-btn').forEach(el => {
      el.onclick = async () => {
        if (!confirm('确定删除？')) return;
        await api.deleteTodo(el.dataset.id);
        if (this.onUpdate) this.onUpdate();
      };
    });
  }

  // 进入名称编辑模式
  enterNameEdit(el) {
    const id = el.dataset.id;
    const currentName = el.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'text-sm font-bold text-slate-800 border-b-2 border-blue-500 outline-none w-full bg-transparent';
    
    const save = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        await api.updateTodo(id, { name: newName });
        if (this.onUpdate) this.onUpdate();
      } else {
        el.style.display = '';
        input.remove();
      }
    };

    input.onblur = save;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') {
        el.style.display = '';
        input.remove();
      }
    };

    el.style.display = 'none';
    el.parentNode.insertBefore(input, el);
    input.focus();
    input.select();
  }

  // 进入时间编辑模式
  enterTimeEdit(el) {
    const id = el.dataset.id;
    const todo = this.todos.find(t => t.id === id);
    
    const container = document.createElement('div');
    container.className = 'flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200';
    container.innerHTML = `
      <input type="time" class="start-time text-[10px] border-none bg-transparent outline-none p-0" value="${todo.start || ''}">
      <span class="text-[10px] text-slate-400">-</span>
      <input type="time" class="end-time text-[10px] border-none bg-transparent outline-none p-0" value="${todo.end || ''}">
      <button class="save-time p-0.5 text-emerald-500 hover:bg-emerald-50 rounded"><i data-lucide="check" class="w-3 h-3"></i></button>
      <button class="cancel-time p-0.5 text-slate-400 hover:bg-slate-100 rounded"><i data-lucide="x" class="w-3 h-3"></i></button>
    `;

    const save = async () => {
      const start = container.querySelector('.start-time').value;
      const end = container.querySelector('.end-time').value;
      await api.updateTodo(id, { start: start || null, end: end || null });
      if (this.onUpdate) this.onUpdate();
    };

    container.querySelector('.save-time').onclick = (e) => {
      e.stopPropagation();
      save();
    };
    container.querySelector('.cancel-time').onclick = (e) => {
      e.stopPropagation();
      el.style.display = '';
      container.remove();
    };

    el.style.display = 'none';
    el.parentNode.insertBefore(container, el);
    if (window.lucide) window.lucide.createIcons({ props: { "class": "w-3 h-3" }, elements: container.querySelectorAll('[data-lucide]') });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
