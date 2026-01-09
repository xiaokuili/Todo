const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001; // 改为 3001，避免与 Vite 冲突
const TODO_DIR = path.join(__dirname, 'todos');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 确保目录存在
if (!fs.existsSync(TODO_DIR)) {
  fs.mkdirSync(TODO_DIR, { recursive: true });
}

// 读取所有待办事项
function loadTodos() {
  const allTodos = [];
  
  if (!fs.existsSync(TODO_DIR)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(TODO_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    jsonFiles.forEach(file => {
      const filePath = path.join(TODO_DIR, file);
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const todos = JSON.parse(data);
        if (Array.isArray(todos)) {
          allTodos.push(...todos);
        }
      } catch (error) {
        console.error(`读取文件 ${file} 失败:`, error.message);
      }
    });
  } catch (error) {
    console.error('读取 todos 失败:', error.message);
  }
  
  return allTodos;
}

// 保存待办事项（按日期分组保存）
function saveTodos(todos) {
  // 按日期分组
  const todosByDate = {};
  todos.forEach(todo => {
    let dateKey;
    if (todo.date) {
      dateKey = todo.date.split('T')[0]; // 提取 YYYY-MM-DD
    } else if (todo.created) {
      dateKey = new Date(todo.created).toISOString().split('T')[0];
    } else {
      dateKey = new Date().toISOString().split('T')[0];
    }
    
    if (!todosByDate[dateKey]) {
      todosByDate[dateKey] = [];
    }
    todosByDate[dateKey].push(todo);
  });
  
  // 保存到对应的日期文件
  Object.keys(todosByDate).forEach(dateKey => {
    const filePath = path.join(TODO_DIR, `${dateKey}.json`);
    if (todosByDate[dateKey].length > 0) {
      fs.writeFileSync(filePath, JSON.stringify(todosByDate[dateKey], null, 2), 'utf8');
    } else {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
  
  // 清理不再需要的文件
  if (fs.existsSync(TODO_DIR)) {
    const files = fs.readdirSync(TODO_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const existingDates = Object.keys(todosByDate);
    
    jsonFiles.forEach(file => {
      const dateKey = file.replace('.json', '');
      if (!existingDates.includes(dateKey)) {
        const filePath = path.join(TODO_DIR, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // 忽略错误
        }
      }
    });
  }
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API: 获取所有待办事项
app.get('/api/todos', (req, res) => {
  try {
    const todos = loadTodos();
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 创建待办事项
app.post('/api/todos', (req, res) => {
  try {
    const todos = loadTodos();
    const newTodo = {
      id: generateId(),
      name: req.body.name || '',
      description: req.body.description || '',
      project: req.body.project || '',
      start: req.body.start || null,
      end: req.body.end || null,
      date: req.body.date || new Date().toISOString().split('T')[0],
      steps: Array.isArray(req.body.steps) ? req.body.steps : (req.body.steps ? [req.body.steps] : []),
      status: req.body.status || null,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    todos.push(newTodo);
    saveTodos(todos);
    res.json(newTodo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 更新待办事项
app.put('/api/todos/:id', (req, res) => {
  try {
    const todos = loadTodos();
    const index = todos.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '未找到待办事项' });
    }
    
    todos[index] = {
      ...todos[index],
      ...req.body,
      updated: new Date().toISOString()
    };
    saveTodos(todos);
    res.json(todos[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 删除待办事项
app.delete('/api/todos/:id', (req, res) => {
  try {
    const todos = loadTodos();
    const filtered = todos.filter(t => t.id !== req.params.id);
    if (filtered.length === todos.length) {
      return res.status(404).json({ error: '未找到待办事项' });
    }
    saveTodos(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 子任务 API ====================

// 生成子任务 ID
function generateActionId() {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// API: 添加子任务
app.post('/api/todos/:todoId/actions', (req, res) => {
  try {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === req.params.todoId);

    if (!todo) {
      return res.status(404).json({ error: '未找到待办事项' });
    }

    if (!todo.actionItems) {
      todo.actionItems = [];
    }

    const newAction = {
      id: generateActionId(),
      content: req.body.content || '',
      status: 'pending',
      startTime: null,
      endTime: null,
      duration: null,
      note: null,
      autoStopped: false
    };

    todo.actionItems.push(newAction);
    todo.updated = new Date().toISOString();

    saveTodos(todos);
    res.json(newAction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 启动子任务
app.post('/api/todos/:todoId/actions/:actionId/start', (req, res) => {
  try {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === req.params.todoId);

    if (!todo) {
      return res.status(404).json({ error: '未找到待办事项' });
    }

    if (!todo.actionItems) {
      return res.status(404).json({ error: '该任务没有子任务' });
    }

    const action = todo.actionItems.find(a => a.id === req.params.actionId);

    if (!action) {
      return res.status(404).json({ error: '未找到子任务' });
    }

    if (action.status === 'running') {
      return res.status(400).json({ error: '子任务已经在运行中' });
    }

    const now = new Date();
    action.status = 'running';
    action.startTime = now.toISOString();

    // 联动：如果主任务还没有开始时间，自动设置为当前时间
    if (!todo.start) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM 格式
      todo.start = currentTime;
    }

    todo.updated = new Date().toISOString();

    saveTodos(todos);
    res.json({ action, todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 停止子任务
app.post('/api/todos/:todoId/actions/:actionId/stop', (req, res) => {
  try {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === req.params.todoId);

    if (!todo) {
      return res.status(404).json({ error: '未找到待办事项' });
    }

    if (!todo.actionItems) {
      return res.status(404).json({ error: '该任务没有子任务' });
    }

    const action = todo.actionItems.find(a => a.id === req.params.actionId);

    if (!action) {
      return res.status(404).json({ error: '未找到子任务' });
    }

    if (action.status !== 'running') {
      return res.status(400).json({ error: '子任务未在运行中' });
    }

    const endTime = new Date();
    const startTime = new Date(action.startTime);
    const duration = endTime - startTime;

    action.status = 'completed';
    action.endTime = endTime.toISOString();
    action.duration = duration;

    if (req.body.note) {
      action.note = req.body.note;
    }

    // 检查是否超过40分钟
    const MAX_DURATION = 40 * 60 * 1000;
    if (duration > MAX_DURATION) {
      action.autoStopped = true;
    }

    // 联动：更新主任务的结束时间为当前时间
    const currentTime = endTime.toTimeString().slice(0, 5); // HH:MM 格式
    todo.end = currentTime;

    todo.updated = new Date().toISOString();
    saveTodos(todos);
    res.json({ action, todo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 更新子任务备注
app.put('/api/todos/:todoId/actions/:actionId', (req, res) => {
  try {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === req.params.todoId);

    if (!todo) {
      return res.status(404).json({ error: '未找到待办事项' });
    }

    if (!todo.actionItems) {
      return res.status(404).json({ error: '该任务没有子任务' });
    }

    const action = todo.actionItems.find(a => a.id === req.params.actionId);

    if (!action) {
      return res.status(404).json({ error: '未找到子任务' });
    }

    if (req.body.note !== undefined) {
      action.note = req.body.note;
    }

    if (req.body.content !== undefined) {
      action.content = req.body.content;
    }

    todo.updated = new Date().toISOString();
    saveTodos(todos);
    res.json(action);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 删除子任务
app.delete('/api/todos/:todoId/actions/:actionId', (req, res) => {
  try {
    const todos = loadTodos();
    const todo = todos.find(t => t.id === req.params.todoId);

    if (!todo) {
      return res.status(404).json({ error: '未找到待办事项' });
    }

    if (!todo.actionItems) {
      return res.status(404).json({ error: '该任务没有子任务' });
    }

    const action = todo.actionItems.find(a => a.id === req.params.actionId);

    if (!action) {
      return res.status(404).json({ error: '未找到子任务' });
    }

    // 软删除
    action.status = 'deleted';
    todo.updated = new Date().toISOString();

    saveTodos(todos);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Todo 服务器运行在 http://localhost:${PORT}`);
});
