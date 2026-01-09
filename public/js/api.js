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

  // 子任务 API
  async addAction(todoId, content) {
    const res = await fetch(`${API_BASE}/${todoId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '添加子任务失败');
    }
    return res.json();
  },

  async startAction(todoId, actionId) {
    const res = await fetch(`${API_BASE}/${todoId}/actions/${actionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '启动子任务失败');
    }
    // 返回 { action, todo }，后端会联动更新主任务的开始时间
    return res.json();
  },

  async stopAction(todoId, actionId, note) {
    const res = await fetch(`${API_BASE}/${todoId}/actions/${actionId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '停止子任务失败');
    }
    // 返回 { action, todo }，后端会联动更新主任务的结束时间
    return res.json();
  },

  async updateAction(todoId, actionId, updates) {
    const res = await fetch(`${API_BASE}/${todoId}/actions/${actionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '更新子任务失败');
    }
    return res.json();
  },

  async deleteAction(todoId, actionId) {
    const res = await fetch(`${API_BASE}/${todoId}/actions/${actionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '删除子任务失败');
    }
    return res.json();
  },
};
