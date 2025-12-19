// 日历筛选模块
export class CalendarModule {
  constructor(containerId, onSelect) {
    this.container = document.getElementById(containerId);
    this.onSelect = onSelect;
    this.currentDate = new Date();
    this.selectedDateStr = null;
    this.todos = [];
  }

  updateTodos(todos) {
    this.todos = todos;
    this.render();
  }

  render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    
    let html = `
      <div class="calendar-header flex items-center justify-between mb-4">
        <span class="font-bold text-slate-700">${year}年 ${monthNames[month]}</span>
        <div class="flex gap-1">
          <button class="p-1 hover:bg-slate-100 rounded prev-month"> <i data-lucide="chevron-left" class="w-4 h-4"></i> </button>
          <button class="p-1 hover:bg-slate-100 rounded next-month"> <i data-lucide="chevron-right" class="w-4 h-4"></i> </button>
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-2">
        <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
    `;

    // 空白填充
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="h-8"></div>`;
    }

    // 日期渲染
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isActive = dateStr === this.selectedDateStr;
      const hasTodo = this.todos.some(t => (t.date || '').split('T')[0] === dateStr);
      
      html += `
        <div 
          data-date="${dateStr}"
          class="calendar-day relative h-8 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all hover:bg-slate-100 
          ${isActive ? 'active shadow-md bg-slate-900 !text-white' : 'text-slate-600'} 
          ${hasTodo ? 'has-todo' : ''}">
          ${d}
        </div>
      `;
    }

    html += `</div>`;
    this.container.innerHTML = html;
    
    // 绑定事件
    this.container.querySelector('.prev-month').onclick = () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    };
    this.container.querySelector('.next-month').onclick = () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    };
    this.container.querySelectorAll('.calendar-day').forEach(el => {
      el.onclick = () => {
        const date = el.dataset.date;
        this.selectedDateStr = (this.selectedDateStr === date) ? null : date;
        this.onSelect(this.selectedDateStr);
        this.render();
      };
    });

    // 重新运行 lucide
    if (window.lucide) window.lucide.createIcons();
  }
}

