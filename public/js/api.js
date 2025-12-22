// API 请求模块
const API_BASE = '/api/todos';

export const api = {
  async getTodos() {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('获取待办事项失败:', error);
      throw error;
    }
  },

  async createTodo(todo) {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo),
    });
    return res.json();
  },

  async updateTodo(id, updates) {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteTodo(id) {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    return res.json();
  },
};
