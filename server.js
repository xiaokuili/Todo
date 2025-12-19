const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
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

app.listen(PORT, () => {
  console.log(`🚀 Todo 服务器运行在 http://localhost:${PORT}`);
});

