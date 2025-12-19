const API_BASE = '/api/todos';
let todos = [];
let selectedDate = null;

// 页面加载时获取所有待办事项
document.addEventListener('DOMContentLoaded', () => {
  loadTodos();
  // 设置默认日期为今天
  document.getElementById('date-filter').valueAsDate = new Date();
});

// 加载所有待办事项
async function loadTodos() {
  try {
    const response = await fetch(API_BASE);
    todos = await response.json();
    render();
  } catch (error) {
    console.error('加载待办事项失败:', error);
    alert('加载待办事项失败，请检查服务器是否运行');
  }
}

// 按日期筛选
function filterByDate() {
  const dateInput = document.getElementById('date-filter');
  selectedDate = dateInput.value;
  const clearBtn = document.getElementById('clear-filter-btn');
  
  if (selectedDate) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }
  
  render();
}

// 清除筛选
function clearDateFilter() {
  selectedDate = null;
  document.getElementById('date-filter').value = '';
  document.getElementById('clear-filter-btn').classList.add('hidden');
  render();
}

// 渲染待办事项
function render() {
  const container = document.getElementById('todos-container');
  
  // 筛选待办事项
  let filteredTodos = todos;
  if (selectedDate) {
    filteredTodos = todos.filter(todo => {
      const todoDate = todo.date || new Date(todo.created || Date.now()).toISOString().split('T')[0];
      return todoDate === selectedDate;
    });
  }
  
  if (filteredTodos.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="text-5xl mb-4">📝</div>
        <h3 class="text-lg font-medium text-gray-700 mb-2">暂无待办事项</h3>
        <p class="text-sm text-gray-500">${selectedDate ? '该日期没有待办事项' : '点击右上角的"添加待办"按钮开始创建任务'}</p>
      </div>
    `;
    return;
  }

  if (selectedDate) {
    // 只显示选中日期的详情
    const sortedTodos = sortTodosByTime(filteredTodos);
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div class="flex items-center justify-between mb-4 pb-3 border-b">
          <h2 class="text-lg font-semibold text-gray-800">${formatDateHeader(selectedDate)}</h2>
          <span class="text-sm text-gray-500">${filteredTodos.length} 个任务</span>
        </div>
        <div class="space-y-2">
          ${sortedTodos.map(todo => renderTodoRow(todo)).join('')}
        </div>
      </div>
    `;
  } else {
    // 按日期分组显示
    const todosByDate = {};
    filteredTodos.forEach(todo => {
      const dateKey = todo.date || new Date(todo.created || Date.now()).toISOString().split('T')[0];
      if (!todosByDate[dateKey]) {
        todosByDate[dateKey] = [];
      }
      todosByDate[dateKey].push(todo);
    });

    const sortedDates = Object.keys(todosByDate).sort((a, b) => a.localeCompare(b));

    container.innerHTML = sortedDates.map(dateKey => {
      const dateTodos = todosByDate[dateKey];
      const sortedTodos = sortTodosByTime(dateTodos);
      
      return `
        <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div class="flex items-center justify-between mb-3 pb-2 border-b">
            <h2 class="text-base font-semibold text-gray-800">${formatDateHeader(dateKey)}</h2>
            <span class="text-xs text-gray-500">${dateTodos.length} 个任务</span>
          </div>
          <div class="space-y-2">
            ${sortedTodos.map(todo => renderTodoRow(todo)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
}

// 渲染单行待办（紧凑布局）
function renderTodoRow(todo) {
  const statusIcon = {
    'pending': '○',
    'in_progress': '→',
    'completed': '✓'
  };
  
  const statusColor = {
    'pending': 'text-gray-400',
    'in_progress': 'text-blue-500',
    'completed': 'text-green-500'
  };

  const timeDisplay = formatTimeDisplay(todo);
  const isCompleted = todo.status === 'completed';
  
  return `
    <div class="group border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div class="flex items-center gap-3">
        <!-- 状态图标 -->
        <span class="text-lg ${statusColor[todo.status] || 'text-gray-400'} flex-shrink-0">
          ${statusIcon[todo.status] || '○'}
        </span>
        
        <!-- 任务名称（可编辑） -->
        <div class="flex-1 min-w-0">
          <span 
            id="name-${todo.id}"
            class="inline-block ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'} font-medium cursor-pointer hover:text-gray-600"
            onclick="editField('${todo.id}', 'name', '${escapeHtml(todo.name)}')">
            ${escapeHtml(todo.name)}
          </span>
        </div>
        
        <!-- 时间（可编辑） -->
        ${timeDisplay ? `
          <span 
            id="time-${todo.id}"
            class="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex-shrink-0"
            onclick="editTimeField('${todo.id}')"
            title="点击编辑时间">
            🕐 ${timeDisplay}
          </span>
        ` : `
          <span 
            class="text-xs text-gray-300 cursor-pointer hover:text-gray-500 flex-shrink-0"
            onclick="editTimeField('${todo.id}')"
            title="点击添加时间">
            🕐 添加时间
          </span>
        `}
        
        <!-- 项目（可编辑） -->
        ${todo.project ? `
          <span 
            id="project-${todo.id}"
            class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 flex-shrink-0"
            onclick="editField('${todo.id}', 'project', '${escapeHtml(todo.project)}')">
            📁 ${escapeHtml(todo.project)}
          </span>
        ` : `
          <span 
            class="text-xs text-gray-300 cursor-pointer hover:text-gray-500 flex-shrink-0"
            onclick="editField('${todo.id}', 'project', '')"
            title="点击添加项目">
            📁 添加项目
          </span>
        `}
        
        <!-- 状态（可编辑） -->
        <select 
          id="status-${todo.id}"
          class="text-xs border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-gray-400 flex-shrink-0"
          onchange="updateField('${todo.id}', 'status', this.value)"
          onclick="event.stopPropagation()">
          <option value="" ${!todo.status ? 'selected' : ''}>未设置</option>
          <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>待处理</option>
          <option value="in_progress" ${todo.status === 'in_progress' ? 'selected' : ''}>进行中</option>
          <option value="completed" ${todo.status === 'completed' ? 'selected' : ''}>已完成</option>
        </select>
        
        <!-- 删除按钮 -->
        <button 
          onclick="deleteTodo('${todo.id}')"
          class="text-gray-400 hover:text-red-500 text-sm flex-shrink-0"
          title="删除">
          🗑️
        </button>
      </div>
      
      <!-- 描述和步骤（可展开） -->
      ${(todo.description || (todo.steps && todo.steps.length > 0)) ? `
        <div class="mt-2 ml-8 text-xs text-gray-500 space-y-1">
          ${todo.description ? `<div>${escapeHtml(todo.description)}</div>` : ''}
          ${renderSteps(todo.steps)}
        </div>
      ` : ''}
    </div>
  `;
}

// 编辑字段（内联编辑）
function editField(id, field, currentValue) {
  const element = document.getElementById(`${field}-${id}`);
  if (!element) return;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentValue;
  input.className = 'border border-gray-300 rounded px-2 py-1 text-sm w-full focus:ring-2 focus:ring-gray-400 outline-none';
  
  const save = () => {
    const newValue = input.value.trim();
    updateField(id, field, newValue);
  };
  
  const cancel = () => {
    element.style.display = '';
    input.remove();
  };
  
  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      cancel();
    }
  });
  
  element.style.display = 'none';
  element.parentNode.insertBefore(input, element);
  input.focus();
  input.select();
}

// 编辑时间字段
function editTimeField(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  const start = todo.start || '';
  const end = todo.end || '';
  
  const form = document.createElement('div');
  form.className = 'mt-2 ml-8 p-3 bg-gray-50 rounded border border-gray-200 space-y-2';
  form.innerHTML = `
    <div class="flex gap-2">
      <input type="time" id="edit-start-${id}" value="${start}" class="text-xs border border-gray-300 rounded px-2 py-1 flex-1">
      <span class="text-xs text-gray-500 self-center">至</span>
      <input type="time" id="edit-end-${id}" value="${end}" class="text-xs border border-gray-300 rounded px-2 py-1 flex-1">
    </div>
    <div class="flex gap-2 justify-end">
      <button onclick="saveTimeField('${id}')" class="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700">保存</button>
      <button onclick="cancelTimeEdit('${id}')" class="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">取消</button>
    </div>
  `;
  
  const timeElement = document.getElementById(`time-${id}`).parentElement;
  timeElement.appendChild(form);
  
  document.getElementById(`edit-start-${id}`).focus();
}

// 保存时间字段
async function saveTimeField(id) {
  const start = document.getElementById(`edit-start-${id}`).value || null;
  const end = document.getElementById(`edit-end-${id}`).value || null;
  
  await updateField(id, 'start', start);
  await updateField(id, 'end', end);
  
  cancelTimeEdit(id);
}

// 取消时间编辑
function cancelTimeEdit(id) {
  const form = document.querySelector(`#edit-start-${id}`)?.closest('div');
  if (form) form.remove();
}

// 更新字段
async function updateField(id, field, value) {
  try {
    const updates = { [field]: value || null };
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('更新失败');
    }
    
    await loadTodos();
  } catch (error) {
    console.error('更新失败:', error);
    alert('更新失败，请重试');
  }
}

// 格式化日期标题
function formatDateHeader(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateKey = date.toISOString().split('T')[0];
  const todayKey = today.toISOString().split('T')[0];
  const tomorrowKey = tomorrow.toISOString().split('T')[0];
  const yesterdayKey = yesterday.toISOString().split('T')[0];
  
  if (dateKey === todayKey) {
    return `今天 (${dateStr})`;
  } else if (dateKey === tomorrowKey) {
    return `明天 (${dateStr})`;
  } else if (dateKey === yesterdayKey) {
    return `昨天 (${dateStr})`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
}

// 按时间排序待办事项
function sortTodosByTime(todos) {
  return [...todos].sort((a, b) => {
    const aStart = parseTime(a.start);
    const bStart = parseTime(b.start);
    if (aStart !== null && bStart !== null) {
      return aStart - bStart;
    }
    if (aStart !== null) return -1;
    if (bStart !== null) return 1;
    
    const aEnd = parseTime(a.end);
    const bEnd = parseTime(b.end);
    if (aEnd !== null && bEnd !== null) {
      return aEnd - bEnd;
    }
    if (aEnd !== null) return -1;
    if (bEnd !== null) return 1;
    
    const aCreated = a.created ? new Date(a.created).getTime() : 0;
    const bCreated = b.created ? new Date(b.created).getTime() : 0;
    return aCreated - bCreated;
  });
}

// 解析时间字符串为分钟数
function parseTime(timeStr) {
  if (!timeStr) return null;
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timeStr.match(timePattern);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return null;
}

// 格式化时间显示
function formatTimeDisplay(todo) {
  const parts = [];
  if (todo.start && todo.end) {
    parts.push(`${todo.start}-${todo.end}`);
  } else if (todo.start) {
    parts.push(`从 ${todo.start}`);
  } else if (todo.end) {
    parts.push(`到 ${todo.end}`);
  }
  return parts.join(' ');
}

// 渲染步骤
function renderSteps(steps) {
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return '';
  }
  
  const stepsHtml = steps.slice(0, 3).map(step => {
    const trimmed = step.trim();
    const isCompleted = /^\[[xX]\]/.test(trimmed);
    const stepText = trimmed.replace(/^\[[ xX]?\]\s*/, '');
    return `<div class="${isCompleted ? 'line-through text-gray-400' : ''}">• ${escapeHtml(stepText)}</div>`;
  }).join('');
  
  const more = steps.length > 3 ? `<div class="text-gray-400">...还有 ${steps.length - 3} 个步骤</div>` : '';
  
  return `<div class="space-y-0.5">${stepsHtml}${more}</div>`;
}

// HTML 转义
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 添加新待办
async function addNewTodo() {
  const newTodo = {
    name: '新任务',
    date: selectedDate || new Date().toISOString().split('T')[0],
    status: 'pending',
    description: '',
    project: '',
    start: null,
    end: null,
    steps: []
  };
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTodo)
    });
    
    if (!response.ok) {
      throw new Error('创建失败');
    }
    
    await loadTodos();
    
    // 自动进入编辑模式
    setTimeout(() => {
      const created = todos.find(t => t.name === '新任务' && t.date === newTodo.date);
      if (created) {
        editField(created.id, 'name', '新任务');
      }
    }, 100);
  } catch (error) {
    console.error('创建失败:', error);
    alert('创建失败，请重试');
  }
}

// 删除待办事项
async function deleteTodo(id) {
  if (!confirm('确定要删除这个待办事项吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('删除失败');
    }
    
    await loadTodos();
  } catch (error) {
    console.error('删除失败:', error);
    alert('删除失败，请重试');
  }
}
