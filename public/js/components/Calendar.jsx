import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Calendar({ todos, selectedDate, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dateStr) => {
    onSelectDate(selectedDate === dateStr ? null : dateStr);
  };

  const hasTodo = (dateStr) => {
    return todos.some((t) => (t.date || '').split('T')[0] === dateStr);
  };

  const days = [];
  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8" />);
  }

  // 日期渲染
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isActive = dateStr === selectedDate;
    const hasTodoOnDate = hasTodo(dateStr);

    days.push(
      <div
        key={dateStr}
        data-date={dateStr}
        onClick={() => handleDateClick(dateStr)}
        className={`calendar-day relative h-8 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all hover:bg-slate-100 ${
          isActive ? 'active shadow-md bg-slate-900 !text-white' : 'text-slate-600'
        } ${hasTodoOnDate ? 'has-todo' : ''}`}
      >
        {d}
      </div>
    );
  }

  return (
    <div>
      <div className="calendar-header flex items-center justify-between mb-4">
        <span className="font-bold text-slate-700">
          {year}年 {monthNames[month]}
        </span>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-2">
        <div>日</div>
        <div>一</div>
        <div>二</div>
        <div>三</div>
        <div>四</div>
        <div>五</div>
        <div>六</div>
      </div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  );
}

