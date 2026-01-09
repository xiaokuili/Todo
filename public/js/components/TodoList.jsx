import { useMemo } from 'react';
import { TaskRow } from './TaskRow';

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
      weekday: 'long',
    });
  }
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null;
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

export function TodoList({ todos, selectedDate, onUpdate, onDelete }) {
  const filteredTodos = useMemo(() => {
    if (!selectedDate) {
      return todos;
    }
    return todos.filter((todo) => {
      const todoDate = todo.date || (todo.created ? new Date(todo.created).toISOString().split('T')[0] : null);
      return todoDate === selectedDate;
    });
  }, [todos, selectedDate]);

  const sortedTodos = useMemo(() => sortTodosByTime(filteredTodos), [filteredTodos]);

  const todosByDate = useMemo(() => {
    if (selectedDate) return null;

    const grouped = {};
    filteredTodos.forEach((todo) => {
      const dateKey = todo.date || (todo.created ? new Date(todo.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(todo);
    });
    return grouped;
  }, [filteredTodos, selectedDate]);

  if (filteredTodos.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-16 text-center shadow-lg">
        <div className="text-slate-500 text-base font-medium mb-3">
          {selectedDate ? '📭 该日期没有待办事项' : '✨ 开始规划你的一天'}
        </div>
        <div className="text-slate-400 text-sm">
          {!selectedDate && '点击左侧的"新建任务"按钮开始创建任务'}
        </div>
      </div>
    );
  }

  if (selectedDate) {
    // 单日期视图
    return (
      <div>
        {sortedTodos.map((todo) => (
          <TaskRow key={todo.id} todo={todo} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  // 按日期分组视图
  const sortedDates = Object.keys(todosByDate).sort((a, b) => a.localeCompare(b));

  return (
    <>
      {sortedDates.map((dateKey) => {
        const dateTodos = todosByDate[dateKey];
        const sorted = sortTodosByTime(dateTodos);

        return (
          <div key={dateKey} className="mb-8">
            <div className="glass-card rounded-2xl px-5 py-3 mb-4 shadow-md flex items-center justify-between">
              <h2 className="text-base font-bold gradient-text">{formatDateHeader(dateKey)}</h2>
              <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">{dateTodos.length} 个任务</span>
            </div>
            {sorted.map((todo) => (
              <TaskRow key={todo.id} todo={todo} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        );
      })}
    </>
  );
}

