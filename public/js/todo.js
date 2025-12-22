// Todo 列表展示模块
import { api } from './api.js';
import { TimePicker } from './time-picker.js';

export class TodoModule {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.todos = [];
    this.selectedDate = null;
    this.onUpdate = null;
    this.editingTimeId = null;
  }

  setTodos(todos) {
    this.todos = todos;
  }

  // ============================================================================
  // 主渲染方法
  // ============================================================================
  render(dateFilter) {
    this.selectedDate = dateFilter;
    
    // 更新标题
    const titleEl = document.getElementById('list-title');
    const subtitleEl = document.getElementById('list-subtitle');
    
    if (dateFilter) {
      titleEl.textContent = formatDateHeader(dateFilter);
      const filtered = this.getFilteredTodos();
      subtitleEl.textContent = `${filtered.length} 个任务`;
    } else {
      titleEl.textContent = '所有待办';
      subtitleEl.textContent = '记录你的每一天';
    }
    
    // 渲染内容
    const filtered = this.getFilteredTodos();
    
    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div class="text-5xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-slate-700 mb-2">暂无待办事项</h3>
          <p class="text-sm text-slate-500">${dateFilter ? '该日期没有待办事项' : '点击左侧的"新建任务"按钮开始创建任务'}</p>
        </div>
      `;
      return;
    }
    
    if (dateFilter) {
      // 单日期视图
      this.renderDateGroup(dateFilter, filtered);
    } else {
      // 按日期分组视图
      this.renderGroupedByDate(filtered);
    }
  }

  getFilteredTodos() {
    if (!this.selectedDate) {
      return this.todos;
    }
    
    return this.todos.filter(todo => {
      const todoDate = todo.date || (todo.created ? new Date(todo.created).toISOString().split('T')[0] : null);
      return todoDate === this.selectedDate;
    });
  }

  renderDateGroup(date, todos) {
    const sorted = sortTodosByTime(todos);
    this.container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div class="space-y-4">
          ${sorted.map(todo => this.renderTodoCard(todo)).join('')}
        </div>
      </div>
    `;
    
    // 初始化 Lucide 图标
    if (window.lucide) window.lucide.createIcons();
  }

  renderGroupedByDate(todos) {
    const todosByDate = {};
    todos.forEach(todo => {
      const dateKey = todo.date || (todo.created ? new Date(todo.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      if (!todosByDate[dateKey]) {
        todosByDate[dateKey] = [];
      }
      todosByDate[dateKey].push(todo);
    });

    const sortedDates = Object.keys(todosByDate).sort((a, b) => a.localeCompare(b));

    this.container.innerHTML = sortedDates.map(dateKey => {
      const dateTodos = todosByDate[dateKey];
      const sorted = sortTodosByTime(dateTodos);
      
      return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 class="text-base font-bold text-slate-800">${formatDateHeader(dateKey)}</h2>
            <span class="text-xs text-slate-500">${dateTodos.length} 个任务</span>
          </div>
          <div class="space-y-4">
            ${sorted.map(todo => this.renderTodoCard(todo)).join('')}
          </div>
        </div>
      `;
    }).join('');
    
    // 初始化 Lucide 图标
    if (window.lucide) window.lucide.createIcons();
  }

  // ============================================================================
  // TODO CARD 渲染相关
  // ============================================================================
  // 如需调整 todo card 的 UI，主要修改以下方法：
  // - renderTodoCard() - todo card 的主要渲染方法
  // - renderTodoCardContent() - todo card 内容区域（状态、名称、步骤等）
  // ============================================================================

  renderTodoCard(todo) {
    const isCompleted = todo.status === 'completed';
    
    // 加载时间选择器样式（只加载一次）
    this.loadTimePickerStyles();

    return `
      <div class="flex gap-4 items-start">
        <!-- 左侧：时间卡片 -->
        ${this.renderTimeCard(todo)}
        
        <!-- 右侧：Todo卡片 -->
        ${this.renderTodoCardContent(todo, isCompleted)}
      </div>
    `;
  }

  renderTodoCardContent(todo, isCompleted) {
    const statusIcon = {
      'pending': 'circle',
      'in_progress': 'arrow-right',
      'completed': 'check-circle'
    };
    
    const statusColor = {
      'pending': 'text-slate-400',
      'in_progress': 'text-blue-500',
      'completed': 'text-green-500'
    };

    return `
      <div class="flex-1 group border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
        <div class="flex items-start gap-3">
          <!-- 状态图标 -->
          <button 
            onclick="window.todoModule.cycleStatus('${todo.id}', '${todo.status || 'pending'}')"
            class="${statusColor[todo.status] || 'text-slate-400'} flex-shrink-0 hover:opacity-70 transition-opacity"
            title="点击切换状态">
            <i data-lucide="${statusIcon[todo.status] || 'circle'}" class="w-5 h-5"></i>
          </button>
          
          <!-- 内容区 -->
          <div class="flex-1 min-w-0">
            <!-- 任务名称 -->
            <div class="flex items-start gap-2 mb-2">
              <input 
                type="text"
                value="${escapeAttr(todo.name)}"
                onchange="window.todoModule.updateField('${todo.id}', 'name', this.value)"
                class="flex-1 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'} font-medium bg-transparent border-none outline-none focus:bg-slate-50 rounded px-2 py-1 -mx-2 -my-1"
                placeholder="任务名称">
            </div>
            
            <!-- 描述和步骤 -->
            <div class="mt-3 pt-3 border-t border-slate-100 space-y-2">
              ${todo.description ? `<p class="text-xs text-slate-600">${escapeHtml(todo.description)}</p>` : ''}
              ${renderSteps(todo.steps, todo.id)}
              
              <!-- 添加步骤按钮 -->
              <div class="flex items-center gap-2">
                <button 
                  onclick="window.todoModule.addStep('${todo.id}')"
                  class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                  title="添加步骤">
                  <i data-lucide="plus" class="w-3 h-3"></i>
                  添加步骤
                </button>
              </div>
            </div>
          </div>
          
          <!-- 删除按钮 -->
          <button 
            onclick="window.todoModule.deleteTodo('${todo.id}')"
            class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
            title="删除">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // 时间卡片渲染相关
  // ============================================================================
  // 如需调整时间 UI，主要修改以下方法：
  // - renderTimeCard() - 时间卡片的渲染入口
  // - loadTimePickerStyles() - 时间选择器的样式加载
  // 时间选择器的具体实现请查看 time-picker.js 文件
  // ============================================================================

  renderTimeCard(todo) {
    return `
      <div class="flex-shrink-0">
        ${this.editingTimeId === todo.id 
          ? TimePicker.renderInlineTimeCardEdit(todo, this.onTimeChange)
          : TimePicker.renderInlineTimeCard(todo, this.onTimeChange)
        }
      </div>
    `;
  }

  loadTimePickerStyles() {
    if (!document.getElementById('swiss-time-picker-styles')) {
      const style = document.createElement('style');
      style.id = 'swiss-time-picker-styles';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
        
        .swiss-time-picker {
          font-family: 'Inter', -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        
        .swiss-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        .swiss-minimal-bar {
          background: #ffffff;
          box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.05);
          border: 1px solid #f0f0f0;
          width: fit-content;
        }
        
        .swiss-time-group {
          transition: background-color 0.2s;
        }
        
        .swiss-time-group:focus-within {
          background: #fcfcfc;
        }
        
        .swiss-time-input {
          -webkit-appearance: none;
          -moz-appearance: textfield;
        }
        
        .swiss-time-input::-webkit-outer-spin-button,
        .swiss-time-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ============================================================================
  // 时间操作方法
  // ============================================================================

  editTime(id) {
    this.editingTimeId = id;
    this.render(this.selectedDate);
    
    // 绑定输入事件
    setTimeout(() => {
      const inputs = document.querySelectorAll(`#start-hour-${id}, #start-min-${id}, #end-hour-${id}, #end-min-${id}`);
      inputs.forEach(input => {
        input.addEventListener('input', (e) => {
          let val = e.target.value.replace(/\D/g, '');
          if (val.length > 2) {
            val = val.slice(0, 2);
          }
          e.target.value = val;
        });
        
        input.addEventListener('blur', (e) => {
          let val = parseInt(e.target.value) || 0;
          const max = e.target.id.includes('hour') ? 23 : 59;
          if (val < 0) val = 0;
          if (val > max) val = max;
          e.target.value = String(val).padStart(2, '0');
        });
      });
    }, 0);
  }

  async saveTime(id) {
    const startHour = document.getElementById(`start-hour-${id}`).value.padStart(2, '0');
    const startMin = document.getElementById(`start-min-${id}`).value.padStart(2, '0');
    const endHour = document.getElementById(`end-hour-${id}`).value.padStart(2, '0');
    const endMin = document.getElementById(`end-min-${id}`).value.padStart(2, '0');

    const start = `${startHour}:${startMin}`;
    const end = `${endHour}:${endMin}`;

    await this.updateField(id, 'start', start);
    await this.updateField(id, 'end', end);
    
    this.editingTimeId = null;
    this.render(this.selectedDate);
  }

  cancelEditTime(id) {
    this.editingTimeId = null;
    this.render(this.selectedDate);
  }

  async clearTime(id) {
    if (!confirm('确定要清除时间吗？')) {
      return;
    }
    await this.updateField(id, 'start', null);
    await this.updateField(id, 'end', null);
    this.editingTimeId = null;
    if (this.onUpdate) await this.onUpdate();
  }

  // ============================================================================
  // Todo 操作方法
  // ============================================================================

  async cycleStatus(id, currentStatus) {
    const statusCycle = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(currentStatus || 'pending');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    await this.updateField(id, 'status', nextStatus);
  }

  async updateField(id, field, value) {
    try {
      await api.updateTodo(id, { [field]: value || null });
      if (this.onUpdate) await this.onUpdate();
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败，请重试');
    }
  }

  async deleteTodo(id) {
    if (!confirm('确定要删除这个待办事项吗？')) {
      return;
    }
    
    try {
      await api.deleteTodo(id);
      if (this.onUpdate) await this.onUpdate();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  }

  // ============================================================================
  // Steps 操作方法
  // ============================================================================

  async addStep(id) {
    const stepText = prompt('请输入步骤内容:');
    if (stepText === null || !stepText.trim()) {
      return;
    }

    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const currentSteps = todo.steps || [];
    const newStep = `[ ] ${stepText.trim()}`;
    const updatedSteps = [...currentSteps, newStep];

    try {
      await api.updateTodo(id, { steps: updatedSteps });
      if (this.onUpdate) await this.onUpdate();
    } catch (error) {
      console.error('添加步骤失败:', error);
      alert('添加步骤失败，请重试');
    }
  }

  async toggleStep(id, stepIndex) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const currentSteps = todo.steps || [];
    if (stepIndex < 0 || stepIndex >= currentSteps.length) return;

    const step = currentSteps[stepIndex].trim();
    const isCompleted = /^\[[xX]\]/.test(step);
    const stepText = step.replace(/^\[[ xX]?\]\s*/, '');
    
    const newStep = isCompleted ? `[ ] ${stepText}` : `[x] ${stepText}`;
    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = newStep;

    try {
      await api.updateTodo(id, { steps: updatedSteps });
      if (this.onUpdate) await this.onUpdate();
    } catch (error) {
      console.error('更新步骤失败:', error);
      alert('更新步骤失败，请重试');
    }
  }

  async deleteStep(id, stepIndex) {
    if (!confirm('确定要删除这个步骤吗？')) {
      return;
    }

    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;

    const currentSteps = todo.steps || [];
    if (stepIndex < 0 || stepIndex >= currentSteps.length) return;

    const updatedSteps = currentSteps.filter((_, index) => index !== stepIndex);

    try {
      await api.updateTodo(id, { steps: updatedSteps });
      if (this.onUpdate) await this.onUpdate();
    } catch (error) {
      console.error('删除步骤失败:', error);
      alert('删除步骤失败，请重试');
    }
  }
}

// ============================================================================
// 工具函数
// ============================================================================

// 工具函数
function formatDateHeader(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(dateStr + 'T00:00:00');
  
  if (targetDate.getTime() === today.getTime()) {
    return `今天 · ${dateStr}`;
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return `明天 · ${dateStr}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `昨天 · ${dateStr}`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
}

function sortTodosByTime(todos) {
  return [...todos].sort((a, b) => {
    const aStart = parseTime(a.start);
    const bStart = parseTime(b.start);
    if (aStart !== null && bStart !== null) return aStart - bStart;
    if (aStart !== null) return -1;
    if (bStart !== null) return 1;
    
    const aEnd = parseTime(a.end);
    const bEnd = parseTime(b.end);
    if (aEnd !== null && bEnd !== null) return aEnd - bEnd;
    if (aEnd !== null) return -1;
    if (bEnd !== null) return 1;
    
    const aCreated = a.created ? new Date(a.created).getTime() : 0;
    const bCreated = b.created ? new Date(b.created).getTime() : 0;
    return aCreated - bCreated;
  });
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null;
}

function formatTimeDisplay(todo) {
  if (todo.start && todo.end) {
    return `${todo.start} - ${todo.end}`;
  } else if (todo.start) {
    return `从 ${todo.start}`;
  } else if (todo.end) {
    return `到 ${todo.end}`;
  }
  return '';
}

function calculateDuration(start, end) {
  if (!start || !end || start === '--:--' || end === '--:--') return '--';
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return '--';
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // 跨天
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}分钟`;
  if (minutes === 0) return `${hours}小时`;
  return `${hours}小时${minutes}分钟`;
}

function renderSteps(steps, todoId) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return '';
  }
  
  const stepsHtml = steps.map((step, index) => {
    const trimmed = step.trim();
    const isCompleted = /^\[[xX]\]/.test(trimmed);
    const stepText = trimmed.replace(/^\[[ xX]?\]\s*/, '');
    return `
      <div class="flex items-start gap-2 text-xs group/step ${isCompleted ? 'line-through text-slate-400' : 'text-slate-600'}">
        <button 
          onclick="window.todoModule.toggleStep('${todoId}', ${index})"
          class="flex-shrink-0 hover:opacity-70 transition-opacity"
          title="点击切换完成状态">
          ${isCompleted ? '✓' : '○'}
        </button>
        <span class="flex-1">${escapeHtml(stepText)}</span>
        <button 
          onclick="window.todoModule.deleteStep('${todoId}', ${index})"
          class="opacity-0 group-hover/step:opacity-100 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
          title="删除步骤">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      </div>
    `;
  }).join('');
  
  return `<div class="space-y-1">${stepsHtml}</div>`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
