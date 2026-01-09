import { useState, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { TodoList } from './components/TodoList';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { api } from './api';

export function App() {
  const [todos, setTodos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');

  const loadTodos = async () => {
    try {
      console.log('开始加载待办事项...');
      const data = await api.getTodos();
      console.log('加载成功，数据:', data);
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载数据失败，请确保后端服务器正在运行 (端口 3001)');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleAddTodo = async () => {
    setIsQuickAdding(true);
  };

  const handleQuickAdd = async () => {
    if (!quickTaskName.trim()) return;

    const date = selectedDate || new Date().toISOString().split('T')[0];
    await api.createTodo({ name: quickTaskName.trim(), date, status: 'pending' });
    setQuickTaskName('');
    setIsQuickAdding(false);
    await loadTodos();
  };

  const handleDeleteTodo = async (id) => {
    await api.deleteTodo(id);
    await loadTodos();
  };

  const handleUpdate = async () => {
    await loadTodos();
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  const title = selectedDate
    ? (() => {
        const date = new Date(selectedDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const targetDate = new Date(selectedDate + 'T00:00:00');

        if (targetDate.getTime() === today.getTime()) {
          return `今天 · ${selectedDate}`;
        } else if (targetDate.getTime() === tomorrow.getTime()) {
          return `明天 · ${selectedDate}`;
        } else if (targetDate.getTime() === yesterday.getTime()) {
          return `昨天 · ${selectedDate}`;
        } else {
          return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          });
        }
      })()
    : '所有待办';

  const subtitle = selectedDate
    ? `${todos.filter((t) => {
        const todoDate = t.date || (t.created ? new Date(t.created).toISOString().split('T')[0] : null);
        return todoDate === selectedDate;
      }).length} 个任务`
    : '记录你的每一天';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card px-8 py-6 rounded-2xl">
          <div className="text-slate-600 font-medium">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 px-4">
        {/* 左侧：日历筛选 */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="glass-card rounded-xl p-5 sticky top-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold flex items-center gap-2 gradient-text">
                <CalendarIcon className="w-5 h-5 text-slate-700" />
                日历
              </h2>
              <button
                onClick={handleClearFilter}
                className="text-xs text-slate-400 hover:text-slate-700 font-medium px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                清除
              </button>
            </div>

            {/* 迷你日历 */}
            <Calendar todos={todos} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <div className="mt-6">
              <button
                onClick={handleAddTodo}
                className="w-full btn-gradient py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-5 h-5" />
                新建任务
              </button>
            </div>
          </div>
        </aside>

        {/* 右侧：TodoList 展示 */}
        <main className="flex-1 min-w-0">
          {/* 快速添加任务 */}
          {isQuickAdding && (
            <div className="glass-card rounded-xl mb-5 p-4 border-2 border-slate-300">
              <input
                type="text"
                value={quickTaskName}
                onChange={(e) => setQuickTaskName(e.target.value)}
                placeholder="新任务名称（交付物）..."
                className="w-full text-sm px-3 py-2 border-b-2 border-slate-200 focus:outline-none focus:border-slate-900 bg-transparent font-medium"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                  if (e.key === 'Escape') {
                    setIsQuickAdding(false);
                    setQuickTaskName('');
                  }
                }}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleQuickAdd}
                  className="text-xs px-4 py-2 btn-gradient rounded-lg font-semibold"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setIsQuickAdding(false);
                    setQuickTaskName('');
                  }}
                  className="text-xs px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <header className="mb-6 glass-card rounded-xl p-6">
            <h1 id="list-title" className="text-3xl font-bold gradient-text">
              {title}
            </h1>
            <p id="list-subtitle" className="text-sm text-slate-600 mt-2 font-medium">
              {subtitle}
            </p>
          </header>

          <TodoList
            todos={todos}
            selectedDate={selectedDate}
            onUpdate={handleUpdate}
            onDelete={handleDeleteTodo}
          />
        </main>
      </div>
    </div>
  );
}

