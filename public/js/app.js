// 主入口模块
import { api } from './api.js';
import { CalendarModule } from './calendar.js';
import { TodoModule } from './todo.js';

let calendar, todoList;

export async function initApp() {
  todoList = new TodoModule('todos-container');
  calendar = new CalendarModule('calendar-root', (date) => {
    todoList.render(date);
  });

  // 设置回调
  todoList.onUpdate = loadAll;

  // 绑定全局函数
  window.addNewTodo = async () => {
    const date = calendar.selectedDateStr || new Date().toISOString().split('T')[0];
    const name = prompt('输入新任务名称:', '新任务');
    if (name) {
      await api.createTodo({ name, date, status: 'pending' });
      await loadAll();
    }
  };

  window.clearFilter = () => {
    calendar.selectedDateStr = null;
    calendar.render();
    todoList.render(null);
  };

  await loadAll();
}

async function loadAll() {
  const todos = await api.getTodos();
  todoList.setTodos(todos);
  calendar.updateTodos(todos);
  todoList.render(calendar.selectedDateStr);
}
