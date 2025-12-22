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

  renderTodoCard(todo) {
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

    const isCompleted = todo.status === 'completed';
    const hasTime = todo.start || todo.end;
    
    // 确保样式只加载一次
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

    return `
      <div class="flex gap-4 items-start">
        <!-- 左侧：时间卡片 -->
        <div class="flex-shrink-0">
          ${this.editingTimeId === todo.id 
            ? TimePicker.renderInlineTimeCardEdit(todo, this.onTimeChange)
            : TimePicker.renderInlineTimeCard(todo, this.onTimeChange)
          }
        </div>
        
        <!-- 右侧：Todo卡片 -->
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
              
              <!-- 元信息行 -->
              <div class="flex flex-wrap items-center gap-2 text-xs">
                ${todo.project ? `
                  <input 
                    type="text"
                    value="${escapeAttr(todo.project)}"
                    onchange="window.todoModule.updateField('${todo.id}', 'project', this.value)"
                    class="flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded outline-none"
                    style="width: ${Math.max(60, (todo.project.length + 2) * 8)}px"
                    placeholder="项目名">
                ` : `
                  <button 
                    onclick="window.todoModule.editField('${todo.id}', 'project')"
                    class="flex items-center gap-1 text-slate-300 hover:text-slate-500 bg-slate-50 px-2 py-1 rounded"
                    title="点击添加项目">
                    <i data-lucide="folder" class="w-3 h-3"></i>
                    添加项目
                  </button>
                `}
                
                <select 
                  onchange="window.todoModule.updateField('${todo.id}', 'status', this.value)"
                  class="text-xs border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 outline-none"
                  onclick="event.stopPropagation()">
                  <option value="" ${!todo.status ? 'selected' : ''}>未设置</option>
                  <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>待处理</option>
                  <option value="in_progress" ${todo.status === 'in_progress' ? 'selected' : ''}>进行中</option>
                  <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>已完成</option>
                </select>
              </div>
              
              <!-- 描述和步骤 -->
              ${(todo.description || (todo.steps && todo.steps.length > 0)) ? `
                <div class="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  ${todo.description ? `<p class="text-xs text-slate-600">${escapeHtml(todo.description)}</p>` : ''}
                  ${renderSteps(todo.steps)}
                </div>
              ` : ''}
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
      </div>
    `;
  }


  async cycleStatus(id, currentStatus) {
    const statusCycle = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(currentStatus || 'pending');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    await this.updateField(id, 'status', nextStatus);
  }

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

  async editField(id, field) {
    const value = prompt(`请输入${field === 'project' ? '项目名' : '内容'}:`);
    if (value !== null) {
      await this.updateField(id, field, value.trim());
    }
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
}

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

function renderSteps(steps) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return '';
  }
  
  const stepsHtml = steps.slice(0, 5).map(step => {
    const trimmed = step.trim();
    const isCompleted = /^\[[xX]\]/.test(trimmed);
    const stepText = trimmed.replace(/^\[[ xX]?\]\s*/, '');
    return `
      <div class="flex items-start gap-2 text-xs ${isCompleted ? 'line-through text-slate-400' : 'text-slate-600'}">
        <span class="flex-shrink-0">${isCompleted ? '✓' : '○'}</span>
        <span>${escapeHtml(stepText)}</span>
      </div>
    `;
  }).join('');
  
  const more = steps.length > 5 ? `<div class="text-xs text-slate-400 ml-4">...还有 ${steps.length - 5} 个步骤</div>` : '';
  
  return `<div class="space-y-1">${stepsHtml}${more}</div>`;
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
