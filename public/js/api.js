// API 请求模块
const API_BASE = '/api/todos';

export const api = {
  async getTodos() {
    const res = await fetch(API_BASE);
    return res.json();
  },

  async createTodo(todo) {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo)
    });
    return res.json();
  },

  async updateTodo(id, updates) {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteTodo(id) {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    return res.json();
  }
};

