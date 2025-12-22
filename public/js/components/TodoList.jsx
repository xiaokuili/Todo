import { useMemo } from 'react';
import { TodoCard } from './TodoCard';

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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">暂无待办事项</h3>
        <p className="text-sm text-slate-500">
          {selectedDate ? '该日期没有待办事项' : '点击左侧的"新建任务"按钮开始创建任务'}
        </p>
      </div>
    );
  }

  if (selectedDate) {
    // 单日期视图
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          {sortedTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
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
          <div key={dateKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{formatDateHeader(dateKey)}</h2>
              <span className="text-xs text-slate-500">{dateTodos.length} 个任务</span>
            </div>
            <div className="space-y-4">
              {sorted.map((todo) => (
                <TodoCard key={todo.id} todo={todo} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

