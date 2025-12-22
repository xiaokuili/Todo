// ============================================================================
// 时间选择器组件 - 瑞士极简风格
// ============================================================================
// 如需调整时间 UI，主要修改以下方法：
// - renderViewMode() - 查看模式的 UI 渲染
// - renderEditMode() - 编辑模式的 UI 渲染
// - renderInlineTimeCard() - 内联时间卡片（查看模式）
// - renderInlineTimeCardEdit() - 内联时间卡片（编辑模式）
// ============================================================================

export class TimePicker {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentTodo = null;
    this.editMode = false;
    this.onTimeChange = null;
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  showTodoTime(todo, onChange) {
    this.currentTodo = todo;
    this.onTimeChange = onChange;
    this.editMode = false;
    this.render();
  }

  enterEditMode() {
    this.editMode = true;
    this.render();
  }

  exitEditMode() {
    this.editMode = false;
    this.render();
  }

  hide() {
    this.currentTodo = null;
    this.editMode = false;
    this.render();
  }

  clear() {
    if (this.currentTodo && this.onTimeChange) {
      this.onTimeChange(this.currentTodo.id, null, null);
    }
    this.exitEditMode();
  }

  render() {
    if (!this.currentTodo) {
      this.container.innerHTML = '';
      this.container.classList.add('hidden');
      return;
    }

    this.container.classList.remove('hidden');

    if (this.editMode) {
      this.renderEditMode();
    } else {
      this.renderViewMode();
    }
  }

  // ============================================================================
  // 时间 UI 渲染方法（独立组件模式）
  // ============================================================================
  // 这些方法用于独立的 TimePicker 组件实例
  // 如需调整时间 UI 样式，主要修改这两个方法
  // ============================================================================

  renderViewMode() {
    const start = this.currentTodo.start || '--:--';
    const end = this.currentTodo.end || '--:--';
    const hasTime = !!(this.currentTodo.start || this.currentTodo.end);
    const startH = start !== '--:--' ? start.split(':')[0] : '--';
    const startM = start !== '--:--' ? start.split(':')[1] : '--';
    const endH = end !== '--:--' ? end.split(':')[0] : '--';
    const endM = end !== '--:--' ? end.split(':')[1] : '--';

    this.container.innerHTML = `
      <style>
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
      </style>
      
      <div class="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5 group relative">
        <!-- 开始时间组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer" onclick="window.timePicker.enterEditMode()">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="play" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${startH}</span>
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${startM}</span>
          </div>
        </div>

        <!-- 中间连接符 -->
        <div class="px-1 text-zinc-200">
          <i data-lucide="arrow-right" class="w-3.5 h-3.5" stroke-width="3"></i>
        </div>

        <!-- 结束时间组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer" onclick="window.timePicker.enterEditMode()">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="square" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${endH}</span>
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${endM}</span>
          </div>
        </div>

          ${hasTime ? `
          <!-- 清除按钮 -->
          <button 
            onclick="window.timePicker.clear(); event.stopPropagation();"
            class="ml-2 text-zinc-400 hover:text-red-500 transition-colors p-1">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderEditMode() {
    const startHour = this.currentTodo.start ? this.currentTodo.start.split(':')[0] : '09';
    const startMin = this.currentTodo.start ? this.currentTodo.start.split(':')[1] : '00';
    const endHour = this.currentTodo.end ? this.currentTodo.end.split(':')[0] : '18';
    const endMin = this.currentTodo.end ? this.currentTodo.end.split(':')[1] : '00';

    this.container.innerHTML = `
      <style>
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
      </style>
      
      <div class="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5">
        <!-- 开始时间输入组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="play" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
        </div>
          <div class="flex items-center">
            <input 
              type="text" 
              id="start-hour"
              value="${startHour}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input 
              type="text" 
              id="start-min"
              value="${startMin}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
          </div>
        </div>

        <!-- 中间连接符 -->
        <div class="px-1 text-zinc-200">
          <i data-lucide="arrow-right" class="w-3.5 h-3.5" stroke-width="3"></i>
        </div>

        <!-- 结束时间输入组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="square" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <input 
              type="text" 
              id="end-hour"
              value="${endHour}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input 
              type="text" 
              id="end-min"
              value="${endMin}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="ml-2 flex items-center gap-1">
          <button 
            onclick="window.timePicker.exitEditMode()"
            class="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 uppercase transition-colors">
            取消
          </button>
          <button 
            onclick="window.timePicker.apply()"
            class="px-2 py-1 text-[10px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded uppercase transition-colors">
            确定
          </button>
        </div>
      </div>
    `;

    // 绑定输入事件 - 自动格式化
    const inputs = this.container.querySelectorAll('.swiss-time-input');
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

    if (window.lucide) window.lucide.createIcons();
  }

  // ============================================================================
  // 时间操作方法
  // ============================================================================

  apply() {
    const startHour = document.getElementById('start-hour').value.padStart(2, '0');
    const startMin = document.getElementById('start-min').value.padStart(2, '0');
    const endHour = document.getElementById('end-hour').value.padStart(2, '0');
    const endMin = document.getElementById('end-min').value.padStart(2, '0');

    const start = `${startHour}:${startMin}`;
    const end = `${endHour}:${endMin}`;

    if (this.onTimeChange && this.currentTodo) {
      this.onTimeChange(this.currentTodo.id, start, end);
    }

    this.exitEditMode();
  }

  // ============================================================================
  // 内联时间卡片渲染方法（用于 todo 列表）
  // ============================================================================
  // 这些静态方法用于在 todo 列表中直接渲染时间卡片
  // 如需调整时间 UI 样式，主要修改这两个方法
  // ============================================================================

  static renderInlineTimeCard(todo, onTimeChange) {
    const start = todo.start || '--:--';
    const end = todo.end || '--:--';
    const hasTime = !!(todo.start || todo.end);
    const startH = start !== '--:--' ? start.split(':')[0] : '--';
    const startM = start !== '--:--' ? start.split(':')[1] : '--';
    const endH = end !== '--:--' ? end.split(':')[0] : '--';
    const endM = end !== '--:--' ? end.split(':')[1] : '--';

    return `
      <div class="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5 group relative" data-todo-id="${todo.id}">
        <!-- 开始时间组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer" onclick="window.todoModule.editTime('${todo.id}')">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="play" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${startH}</span>
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${startM}</span>
          </div>
        </div>

        <!-- 中间连接符 -->
        <div class="px-1 text-zinc-200">
          <i data-lucide="arrow-right" class="w-3.5 h-3.5" stroke-width="3"></i>
        </div>

        <!-- 结束时间组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer" onclick="window.todoModule.editTime('${todo.id}')">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="square" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${endH}</span>
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <span class="swiss-mono w-6 text-center text-base font-bold text-zinc-900">${endM}</span>
          </div>
        </div>

        ${hasTime ? `
          <!-- 清除按钮 -->
          <button 
            onclick="window.todoModule.clearTime('${todo.id}'); event.stopPropagation();"
            class="ml-2 text-zinc-400 hover:text-red-500 transition-colors p-1">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;
  }

  static renderInlineTimeCardEdit(todo, onTimeChange) {
    const startHour = todo.start ? todo.start.split(':')[0] : '09';
    const startMin = todo.start ? todo.start.split(':')[1] : '00';
    const endHour = todo.end ? todo.end.split(':')[0] : '18';
    const endMin = todo.end ? todo.end.split(':')[1] : '00';

    return `
      <div class="swiss-time-picker swiss-minimal-bar flex items-center gap-1 rounded-full px-2 py-1.5" data-todo-id="${todo.id}">
        <!-- 开始时间输入组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="play" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <input 
              type="text" 
              id="start-hour-${todo.id}"
              value="${startHour}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input 
              type="text" 
              id="start-min-${todo.id}"
              value="${startMin}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
          </div>
        </div>

        <!-- 中间连接符 -->
        <div class="px-1 text-zinc-200">
          <i data-lucide="arrow-right" class="w-3.5 h-3.5" stroke-width="3"></i>
        </div>

        <!-- 结束时间输入组 -->
        <div class="swiss-time-group flex items-center gap-2 px-3 py-1.5 rounded-full">
          <div class="flex items-center justify-center w-5 h-5">
            <i data-lucide="square" class="w-3 h-3 text-zinc-400 fill-zinc-400"></i>
          </div>
          <div class="flex items-center">
            <input 
              type="text" 
              id="end-hour-${todo.id}"
              value="${endHour}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
            <span class="text-zinc-300 font-bold swiss-mono text-xs select-none px-0.5">:</span>
            <input 
              type="text" 
              id="end-min-${todo.id}"
              value="${endMin}"
              class="swiss-time-input swiss-mono bg-transparent w-6 text-center text-base font-bold focus:outline-none placeholder:text-zinc-200"
              placeholder="00"
              maxlength="2">
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="ml-2 flex items-center gap-1">
          <button 
            onclick="window.todoModule.cancelEditTime('${todo.id}')"
            class="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 uppercase transition-colors">
            取消
          </button>
          <button 
            onclick="window.todoModule.saveTime('${todo.id}')"
            class="px-2 py-1 text-[10px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded uppercase transition-colors">
            确定
          </button>
        </div>
      </div>
    `;
  }
}
