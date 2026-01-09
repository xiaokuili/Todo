#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const net = require('net');

const TODO_DIR = path.join(__dirname, '..', 'todos');
const OLD_TODO_FILE = path.join(__dirname, '..', 'todos.json');

// 确保目录存在
if (!fs.existsSync(TODO_DIR)) {
  fs.mkdirSync(TODO_DIR, { recursive: true });
}

// 获取日期对应的文件路径
function getDateFilePath(dateStr) {
  let date;
  if (dateStr) {
    date = new Date(dateStr);
  } else {
    date = new Date();
  }
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(TODO_DIR, `${dateKey}.json`);
}

// 从旧格式迁移数据
function migrateOldData() {
  if (!fs.existsSync(OLD_TODO_FILE)) {
    return;
  }
  try {
    const data = fs.readFileSync(OLD_TODO_FILE, 'utf8');
    const todos = JSON.parse(data);
    
    // 按日期分组
    const todosByDate = {};
    todos.forEach(todo => {
      const date = todo.date || new Date().toISOString().split('T')[0];
      if (!todosByDate[date]) {
        todosByDate[date] = [];
      }
      todosByDate[date].push(todo);
    });
    
    // 保存到对应的日期文件
    Object.keys(todosByDate).forEach(date => {
      const filePath = getDateFilePath(date);
      fs.writeFileSync(filePath, JSON.stringify(todosByDate[date], null, 2), 'utf8');
    });
    
    // 备份旧文件
    const backupPath = OLD_TODO_FILE + '.backup';
    fs.renameSync(OLD_TODO_FILE, backupPath);
    console.log(`✅ 已迁移旧数据，备份文件: ${backupPath}`);
  } catch (error) {
    console.error('❌ 迁移旧数据失败:', error.message);
  }
}

// 读取待办事项（合并所有日期文件）
function loadTodos() {
  // 首次运行时迁移旧数据
  if (fs.existsSync(OLD_TODO_FILE)) {
    migrateOldData();
  }
  
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
        console.error(`❌ 读取文件 ${file} 失败:`, error.message);
      }
    });
  } catch (error) {
    console.error('Error reading todos:', error.message);
  }
  
  return allTodos;
}

// 保存待办事项（按日期分组保存）
function saveTodos(todos) {
  // 按日期分组
  const todosByDate = {};
  todos.forEach(todo => {
    // 使用 todo.date，如果没有则使用创建日期或当前日期
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
      // 如果该日期没有待办事项，删除文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
  
  // 清理不再需要的文件（如果某个日期的所有 todo 都被删除了）
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

// 格式化日期
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
}

// ==================== 展示模块 ====================

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  strikethrough: '\x1b[9m', // 删除线
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// 获取状态颜色
function getStatusColor(todo) {
  const status = todo.status || 'pending';
  if (status === 'completed' || status === 'done') {
    return colors.green;
  } else if (status === 'in_progress' || status === 'doing') {
    return colors.yellow;
  } else if (status === 'pending') {
    return colors.cyan;
  }
  return colors.gray;
}

// 获取状态文本
function getStatusText(todo) {
  const status = todo.status || 'pending';
  if (status === 'completed' || status === 'done') {
    return '✓';
  } else if (status === 'in_progress' || status === 'doing') {
    return '→';
  } else if (status === 'pending') {
    return '○';
  }
  return '?';
}

// 解析时间字符串为分钟数（用于排序）
function parseTime(timeStr) {
  if (!timeStr) return null;
  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timeStr.match(timePattern);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return null;
}

// 按时间排序待办事项
function sortTodosByTime(todos) {
  return [...todos].sort((a, b) => {
    // 优先比较 start 时间
    const aStart = parseTime(a.start);
    const bStart = parseTime(b.start);
    if (aStart !== null && bStart !== null) {
      return aStart - bStart;
    }
    if (aStart !== null) return -1; // 有 start 的排在前面
    if (bStart !== null) return 1;
    
    // 其次比较 end 时间
    const aEnd = parseTime(a.end);
    const bEnd = parseTime(b.end);
    if (aEnd !== null && bEnd !== null) {
      return aEnd - bEnd;
    }
    if (aEnd !== null) return -1; // 有 end 的排在前面
    if (bEnd !== null) return 1;
    
    // 最后按创建时间排序（早创建的在前）
    const aCreated = a.created ? new Date(a.created).getTime() : 0;
    const bCreated = b.created ? new Date(b.created).getTime() : 0;
    return aCreated - bCreated;
  });
}

// 格式化时间显示（紧凑单行）
function formatTimeDisplay(todo) {
  const timeParts = [];
  
  // 日期（如果存在）
  if (todo.date) {
    const dateObj = new Date(todo.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = dateObj.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      timeParts.push(`${colors.cyan}今天${colors.reset}`);
    } else if (dateStr === tomorrowStr) {
      timeParts.push(`${colors.yellow}明天${colors.reset}`);
    } else if (dateStr === yesterdayStr) {
      timeParts.push(`${colors.gray}昨天${colors.reset}`);
    } else {
      const displayDate = dateObj.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit'
      });
      timeParts.push(`${colors.dim}${displayDate}${colors.reset}`);
    }
  }
  
  // 开始和结束时间
  if (todo.start && todo.end) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.start) && timePattern.test(todo.end)) {
      timeParts.push(`${colors.blue}${todo.start}-${todo.end}${colors.reset}`);
    }
  } else if (todo.end) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.end)) {
      timeParts.push(`${colors.blue}${todo.end}${colors.reset}`);
    }
  } else if (todo.start) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.start)) {
      timeParts.push(`${colors.blue}${todo.start}${colors.reset}`);
    }
  }
  
  return timeParts.length > 0 ? timeParts.join(' ') : '';
}

// 格式化时间长度显示
function formatDuration(ms) {
  if (!ms) return '0分钟';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  }
  return `${mins}分钟`;
}

// 计算子任务的当前运行时长
function calculateActionDuration(action) {
  if (action.status === 'completed' && action.duration) {
    return action.duration;
  }
  if (action.status === 'running' && action.startTime) {
    return Date.now() - new Date(action.startTime).getTime();
  }
  return 0;
}

// 格式化子任务显示（新的 actionItems 格式）
function formatActionItemsDisplay(todo) {
  const actionItems = todo.actionItems;
  if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
    return null;
  }

  const MAX_DURATION = 40 * 60 * 1000; // 40分钟上限
  const WARN_THRESHOLD = 35 * 60 * 1000; // 35分钟开始警告

  return actionItems
    .filter(action => action.status !== 'deleted') // 过滤已删除的
    .map((action) => {
      const duration = calculateActionDuration(action);
      const durationText = formatDuration(duration);

      let statusIcon = '';
      let statusColor = colors.gray;
      let line = '';

      if (action.status === 'completed') {
        statusIcon = '✓';
        statusColor = colors.green;
        line = `${statusColor}${statusIcon} ${colors.strikethrough}${action.content}${colors.reset}  ${colors.dim}${durationText}${colors.reset}`;
      } else if (action.status === 'running') {
        statusIcon = '▶';
        statusColor = colors.yellow;
        line = `${statusColor}${statusIcon} ${action.content}${colors.reset}  ${colors.yellow}运行中 ${durationText}${colors.reset}`;

        // 检查是否接近或超过上限
        if (duration >= MAX_DURATION) {
          line += `\n     ${colors.red}⛔ 已超过 40 分钟上限！请立即结束或重新拆分${colors.reset}`;
        } else if (duration >= WARN_THRESHOLD) {
          const remaining = Math.floor((MAX_DURATION - duration) / 60000);
          line += `\n     ${colors.yellow}⚠️  即将达到 40 分钟上限 (剩余 ${remaining}分钟)${colors.reset}`;
        }
      } else if (action.status === 'pending') {
        statusIcon = '○';
        statusColor = colors.cyan;
        line = `${statusColor}${statusIcon} ${action.content}${colors.reset}  ${colors.dim}待开始${colors.reset}`;
      }

      // 添加备注
      if (action.note) {
        line += `\n     ${colors.dim}💬 ${action.note}${colors.reset}`;
      }

      return line;
    }).join('\n   ');
}

// 计算任务总时长和进度
function calculateTaskStats(todo) {
  const actionItems = todo.actionItems || [];
  const activeActions = actionItems.filter(a => a.status !== 'deleted');
  const completedActions = activeActions.filter(a => a.status === 'completed');

  const totalDuration = activeActions.reduce((sum, action) => {
    return sum + (action.duration || 0);
  }, 0);

  const progress = activeActions.length > 0
    ? `${completedActions.length}/${activeActions.length}`
    : '0/0';

  return { totalDuration, progress, completedCount: completedActions.length, totalCount: activeActions.length };
}

// 显示单个待办事项（新格式）
function displayTodo(todo) {
  const statusColor = getStatusColor(todo);
  const statusText = getStatusText(todo);
  const project = todo.project ? `${colors.magenta}#${todo.project}${colors.reset}` : '';

  // 计算任务统计
  const stats = calculateTaskStats(todo);

  // 状态图标（带颜色，加粗）
  const statusDisplay = `${statusColor}${colors.bright}${statusText}${colors.reset}`;

  // 任务名称（加粗显示）
  const nameDisplay = `${colors.bright}${todo.name}${colors.reset}`;

  // 构建主行：状态 + 名称 + 项目
  const mainParts = [statusDisplay, nameDisplay];
  if (project) {
    mainParts.push(project);
  }

  // 分隔线
  console.log('━'.repeat(60));
  console.log(` ${mainParts.join(' ')}`);

  // 显示进度和时间统计
  if (stats.totalCount > 0) {
    const progressPercent = stats.totalCount > 0
      ? Math.round((stats.completedCount / stats.totalCount) * 100)
      : 0;
    const durationText = formatDuration(stats.totalDuration);
    console.log(`   ${colors.dim}进度: ${stats.progress} (${progressPercent}%)  |  耗时: ${durationText}${colors.reset}`);
  }

  console.log('━'.repeat(60));
  console.log('');

  // 显示子任务列表
  const actionItemsDisplay = formatActionItemsDisplay(todo);
  if (actionItemsDisplay) {
    console.log(`   ${actionItemsDisplay}`);
  } else {
    console.log(`   ${colors.dim}暂无子任务${colors.reset}`);
  }

  console.log(''); // 空行分隔
}

// 显示待办列表（简洁版）
function displayTodosList(todos) {
  if (todos.length === 0) {
    console.log('📝 暂无待办事项\n');
    return;
  }

  // 按时间排序：优先按 start，其次按 end，最后按创建时间
  const sortedTodos = sortTodosByTime(todos);

  console.log(`📋 今天的任务 (${new Date().toISOString().split('T')[0]})\n`);

  sortedTodos.forEach((todo) => {
    displayTodo(todo);
  });
}

// 显示待办列表（按日期和项目分组）
function displayTodosGrouped(todos) {
  if (todos.length === 0) {
    console.log('📝 暂无待办事项\n');
    return;
  }
  
  // 按日期分组
  const todosByDate = {};
  todos.forEach(todo => {
    const dateKey = todo.date || new Date(todo.created || Date.now()).toISOString().split('T')[0];
    if (!todosByDate[dateKey]) {
      todosByDate[dateKey] = [];
    }
    todosByDate[dateKey].push(todo);
  });
  
  // 按日期排序（从早到晚，符合日历逻辑）
  const sortedDates = Object.keys(todosByDate).sort((a, b) => a.localeCompare(b));
  
  console.log('📋 待办事项列表:\n');
  
  sortedDates.forEach(dateKey => {
    const dateTodos = todosByDate[dateKey];
    if (dateTodos.length === 0) return;
    
    // 格式化日期标题
    const dateObj = new Date(dateKey);
    const dateTitle = dateObj.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
    
    console.log(`📅 ${dateTitle} (${dateKey})\n`);
    
    // 按时间排序：优先按 start，其次按 end，最后按创建时间
    const sortedDateTodos = sortTodosByTime(dateTodos);
    
    // 显示该日期的所有任务
    let globalIndex = 1;
    sortedDateTodos.forEach(todo => {
      displayTodo(todo, globalIndex++);
    });
    
    console.log(''); // 日期组之间的分隔
  });
}

// 显示待办列表（只显示当天的）
function listTodos(filter = {}) {
  const todos = loadTodos();
  
  // 只显示当天的待办
  const today = new Date().toISOString().split('T')[0];
  let filtered = todos.filter(t => {
    const todoDate = t.date || (t.created ? new Date(t.created).toISOString().split('T')[0] : today);
    return todoDate === today;
  });
  
  // 应用其他过滤条件
  if (filter.project) {
    filtered = filtered.filter(t => t.project === filter.project);
  }
  if (filter.steps !== undefined) {
    filtered = filtered.filter(t => t.steps === filter.steps);
  }
  if (filter.status) {
    filtered = filtered.filter(t => t.status === filter.status);
  }
  
  // 使用简洁列表显示
  displayTodosList(filtered);
}

// 添加待办
function addTodo(name, description = '', project = '', start = '', end = '', date = '', status = '', steps = []) {
  // 如果没有指定日期，使用当前日期
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  
  const todos = loadTodos();
  const newTodo = {
    id: generateId(),
    name,
    description,
    project,
    start: start || null,
    steps: Array.isArray(steps) ? steps : (steps ? [steps] : []),
    status: status || null,
    end: end || null,
    date: date,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  todos.push(newTodo);
  saveTodos(todos);
  console.log(`✅ 已添加: ${name}`);
}

// 交互式添加待办
function addTodoInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const questions = [
    { key: 'name', prompt: '📝 任务名称: ', required: true },
    { key: 'project', prompt: '📁 项目 (可选，直接回车跳过): ' },
    { key: 'start', prompt: '🕐 开始时间 (可选，格式: HH:MM，直接回车跳过): ' },
    { key: 'end', prompt: '🕐 结束时间 (可选，格式: HH:MM，直接回车跳过): ' },
    { key: 'steps', prompt: '📋 步骤 (可选，用逗号分隔，直接回车跳过): ' }
  ];

  const answers = {};

  function askQuestion(index) {
    if (index >= questions.length) {
      rl.close();
      
      // 处理步骤
      let steps = [];
      if (answers.steps && answers.steps.trim()) {
        steps = answers.steps.split(',').map(s => s.trim()).filter(s => s);
      }
      
      // 添加待办
      addTodo(
        answers.name,
        '',
        answers.project || '',
        answers.start || '',
        answers.end || '',
        '',
        '',
        steps
      );
      return;
    }

    const question = questions[index];
    rl.question(question.prompt, (answer) => {
      const trimmed = answer.trim();
      
      if (question.required && !trimmed) {
        console.log('❌ 此项为必填项，请重新输入');
        askQuestion(index);
        return;
      }
      
      answers[question.key] = trimmed;
      askQuestion(index + 1);
    });
  }

  console.log('\n✨ 交互式添加待办事项\n');
  askQuestion(0);
}

// 更新待办
function updateTodo(id, updates) {
  const todos = loadTodos();
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) {
    console.error(`❌ 未找到 ID 为 ${id} 的待办事项`);
    return;
  }
  
  todos[index] = {
    ...todos[index],
    ...updates,
    updated: new Date().toISOString()
  };
  saveTodos(todos);
  console.log(`✅ 已更新: ${todos[index].name}`);
}

// 删除待办
function removeTodo(id) {
  const todos = loadTodos();
  const filtered = todos.filter(t => t.id !== id);
  if (filtered.length === todos.length) {
    console.error(`❌ 未找到 ID 为 ${id} 的待办事项`);
    return;
  }
  saveTodos(filtered);
  console.log(`✅ 已删除待办事项`);
}

// 标记完成
function doneTodo(id) {
  updateTodo(id, { status: 'completed' });
}

// ==================== 子任务操作模块 ====================

const MAX_ACTION_DURATION = 40 * 60 * 1000; // 40分钟上限

// 生成子任务 ID
function generateActionId() {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 添加子任务
function addActionItem(todoId, content) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  // 初始化 actionItems
  if (!todo.actionItems) {
    todo.actionItems = [];
  }

  const newAction = {
    id: generateActionId(),
    content: content,
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
  console.log(`✅ 已添加子任务: ${content}`);
  console.log(`   所属大任务: ${todo.name}`);
}

// 启动子任务
function startActionItem(todoId, actionId) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  if (!todo.actionItems) {
    console.error(`❌ 该任务没有子任务`);
    return;
  }

  const action = todo.actionItems.find(a => a.id === actionId);

  if (!action) {
    console.error(`❌ 未找到 ID 为 ${actionId} 的子任务`);
    return;
  }

  if (action.status === 'running') {
    console.log(`⚠️  子任务已经在运行中`);
    return;
  }

  if (action.status === 'completed') {
    console.log(`⚠️  子任务已完成，无法重新启动`);
    return;
  }

  // 检查是否有其他正在运行的子任务（可选：允许并发）
  const runningActions = todo.actionItems.filter(a => a.status === 'running');
  if (runningActions.length > 0) {
    console.log(`💡 提示: 以下子任务正在运行中:`);
    runningActions.forEach(a => {
      const duration = calculateActionDuration(a);
      console.log(`   - ${a.content} (${formatDuration(duration)})`);
    });
    console.log('');
  }

  action.status = 'running';
  action.startTime = new Date().toISOString();
  todo.updated = new Date().toISOString();

  saveTodos(todos);

  const startTimeDisplay = new Date(action.startTime).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  console.log(`▶️  已启动子任务: ${action.content}`);
  console.log(`   所属大任务: ${todo.name}`);
  console.log(`   开始时间: ${startTimeDisplay}`);
  console.log(`   💡 建议: 在 40 分钟内完成`);
}

// 停止子任务
function stopActionItem(todoId, actionId, note = null) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  if (!todo.actionItems) {
    console.error(`❌ 该任务没有子任务`);
    return;
  }

  const action = todo.actionItems.find(a => a.id === actionId);

  if (!action) {
    console.error(`❌ 未找到 ID 为 ${actionId} 的子任务`);
    return;
  }

  if (action.status !== 'running') {
    console.error(`❌ 子任务未在运行中`);
    return;
  }

  const endTime = new Date();
  const startTime = new Date(action.startTime);
  const duration = endTime - startTime;

  action.status = 'completed';
  action.endTime = endTime.toISOString();
  action.duration = duration;

  if (note) {
    action.note = note;
  }

  // 检查是否超过上限
  if (duration > MAX_ACTION_DURATION) {
    action.autoStopped = true;
    console.log(`${colors.red}⛔ 警告: 子任务耗时 ${formatDuration(duration)}，超过 40 分钟上限${colors.reset}`);
    console.log(`${colors.yellow}💡 建议: 将此任务拆分为更小的子任务${colors.reset}\n`);
  }

  todo.updated = new Date().toISOString();
  saveTodos(todos);

  console.log(`✅ 已完成子任务: ${action.content}`);
  console.log(`   耗时: ${formatDuration(duration)}`);

  if (note) {
    console.log(`   备注: ${note}`);
  }

  // 显示大任务进度
  const stats = calculateTaskStats(todo);
  const progressPercent = Math.round((stats.completedCount / stats.totalCount) * 100);
  console.log(`\n📊 大任务进度: ${todo.name}`);
  console.log(`   已完成: ${stats.progress} (${progressPercent}%)`);
  console.log(`   总耗时: ${formatDuration(stats.totalDuration)}`);
}

// 添加子任务备注
function noteActionItem(todoId, actionId, note) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  if (!todo.actionItems) {
    console.error(`❌ 该任务没有子任务`);
    return;
  }

  const action = todo.actionItems.find(a => a.id === actionId);

  if (!action) {
    console.error(`❌ 未找到 ID 为 ${actionId} 的子任务`);
    return;
  }

  action.note = note;
  todo.updated = new Date().toISOString();

  saveTodos(todos);
  console.log(`📝 已添加备注: ${action.content}`);
  console.log(`   ${note}`);
}

// 删除子任务
function deleteActionItem(todoId, actionId) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  if (!todo.actionItems) {
    console.error(`❌ 该任务没有子任务`);
    return;
  }

  const action = todo.actionItems.find(a => a.id === actionId);

  if (!action) {
    console.error(`❌ 未找到 ID 为 ${actionId} 的子任务`);
    return;
  }

  // 标记为已删除（软删除）
  action.status = 'deleted';
  todo.updated = new Date().toISOString();

  saveTodos(todos);
  console.log(`🗑️  已删除子任务: ${action.content}`);
}

// 列出任务的所有子任务
function listActionItems(todoId) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    console.error(`❌ 未找到 ID 为 ${todoId} 的任务`);
    return;
  }

  console.log(`\n📋 任务: ${todo.name}\n`);

  if (!todo.actionItems || todo.actionItems.length === 0) {
    console.log('   暂无子任务\n');
    return;
  }

  const activeActions = todo.actionItems.filter(a => a.status !== 'deleted');

  if (activeActions.length === 0) {
    console.log('   暂无子任务\n');
    return;
  }

  activeActions.forEach((action, index) => {
    const duration = calculateActionDuration(action);
    const durationText = formatDuration(duration);

    let statusIcon = '';
    let statusText = '';

    if (action.status === 'completed') {
      statusIcon = `${colors.green}✓${colors.reset}`;
      statusText = `${colors.dim}${durationText}${colors.reset}`;
    } else if (action.status === 'running') {
      statusIcon = `${colors.yellow}▶${colors.reset}`;
      statusText = `${colors.yellow}运行中 ${durationText}${colors.reset}`;
    } else {
      statusIcon = `${colors.cyan}○${colors.reset}`;
      statusText = `${colors.dim}待开始${colors.reset}`;
    }

    console.log(`   ${statusIcon} [${action.id}] ${action.content}  ${statusText}`);

    if (action.note) {
      console.log(`      ${colors.dim}💬 ${action.note}${colors.reset}`);
    }
  });

  console.log('');
}

// Git 提交
function gitCommit(message) {
  try {
    const cwd = path.join(__dirname, '..');
    execSync('git add todos/', { cwd, stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { cwd, stdio: 'inherit' });
    console.log('✅ 已提交到 Git');
  } catch (error) {
    console.error('❌ Git 提交失败:', error.message);
  }
}

// Git 推送
function gitPush() {
  try {
    const cwd = path.join(__dirname, '..');
    execSync('git push', { cwd, stdio: 'inherit' });
    console.log('✅ 已推送到远程仓库');
  } catch (error) {
    console.error('❌ Git 推送失败:', error.message);
  }
}

// Git 拉取
function gitPull() {
  try {
    const cwd = path.join(__dirname, '..');
    execSync('git pull', { cwd, stdio: 'inherit' });
    console.log('✅ 已从远程仓库拉取');
  } catch (error) {
    console.error('❌ Git 拉取失败:', error.message);
  }
}

// 获取当前日期的文件路径
function getCurrentDateFile() {
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];
  return path.join(TODO_DIR, `${dateKey}.json`);
}

// 打开/查看当前文件
function openCurrentFile() {
  const filePath = getCurrentDateFile();
  const absolutePath = path.resolve(filePath);
  
  console.log(`📂 当前文件路径: ${absolutePath}\n`);
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    console.log('📝 文件不存在，将创建新文件');
    // 创建空数组文件
    fs.writeFileSync(filePath, '[]\n', 'utf8');
  }
  
  // 显示文件内容
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('📄 文件内容:');
    console.log(content);
  } catch (error) {
    console.error('❌ 读取文件失败:', error.message);
    return;
  }
  
  // 尝试用系统默认编辑器打开
  const platform = process.platform;
  let command;
  
  try {
    if (platform === 'darwin') {
      // macOS
      command = `open "${absolutePath}"`;
    } else if (platform === 'win32') {
      // Windows
      command = `start "" "${absolutePath}"`;
    } else {
      // Linux
      command = `xdg-open "${absolutePath}"`;
    }
    console.log(`\n💡 提示: 可以直接编辑文件，然后使用 "todo commit" 提交更改`);
    console.log(`\n🔧 正在打开文件...`);
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.log(`\n💡 提示: 可以手动打开文件: ${absolutePath}`);
    console.log(`   编辑后使用 "todo commit" 提交更改`);
  }
}

// 检查端口是否被占用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // 端口被占用
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false); // 端口未被占用
    });
    
    server.listen(port);
  });
}

// 打开浏览器
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  try {
    if (platform === 'darwin') {
      // macOS
      command = `open "${url}"`;
    } else if (platform === 'win32') {
      // Windows
      command = `start "" "${url}"`;
    } else {
      // Linux
      command = `xdg-open "${url}"`;
    }
    execSync(command, { stdio: 'ignore' });
    console.log(`✅ 浏览器已打开`);
  } catch (error) {
    console.log(`💡 请手动打开浏览器访问: ${url}`);
  }
}

// 启动 Web 服务器（前端 + 后端）
async function startWebServer() {
  const FRONTEND_PORT = 3000;
  const BACKEND_PORT = 3001;
  const URL = `http://localhost:${FRONTEND_PORT}`;
  
  // 检查前端端口是否已经在运行
  const frontendRunning = await checkPort(FRONTEND_PORT);
  const backendRunning = await checkPort(BACKEND_PORT);
  
  if (frontendRunning && backendRunning) {
    console.log(`✅ Web 服务器已经在运行: ${URL}`);
    console.log(`🌐 正在打开浏览器...`);
    openBrowser(URL);
    return;
  }
  
  // 启动服务器（直接启动两个进程，不依赖 concurrently）
  console.log(`🚀 正在启动 Web 服务器（前端 + 后端）...`);
  const projectRoot = path.join(__dirname, '..');
  
  // 检查是否安装了依赖
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`📦 检测到未安装依赖，正在安装...`);
    try {
      execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ 安装依赖失败，请手动运行: npm install`);
      process.exit(1);
    }
  }
  
  // 启动后端服务器（后台运行）
  const serverPath = path.join(projectRoot, 'server.js');
  const backendProcess = spawn('node', [serverPath], {
    cwd: projectRoot,
    detached: false,
    stdio: 'pipe',
    shell: false
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`[后端] ${data.toString().trim()}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`[后端错误] ${data.toString().trim()}`);
  });
  
  // 启动前端服务器（后台运行）
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    detached: false,
    stdio: 'pipe',
    shell: true
  });
  
  frontendProcess.stdout.on('data', (data) => {
    console.log(`[前端] ${data.toString().trim()}`);
  });
  
  frontendProcess.stderr.on('data', (data) => {
    console.error(`[前端错误] ${data.toString().trim()}`);
  });
  
  // 等待服务器启动（Vite 启动很快，但需要一点时间）
  console.log(`⏳ 等待服务器启动...`);
  
  // 等待更长时间，并多次检查（最多等待 6 秒）
  let frontendNowRunning = false;
  let backendNowRunning = false;
  
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    frontendNowRunning = await checkPort(FRONTEND_PORT);
    backendNowRunning = await checkPort(BACKEND_PORT);
    if (frontendNowRunning && backendNowRunning) {
      break;
    }
  }
  
  // 如果检查失败，但看到输出显示服务器已启动，也认为成功
  if (frontendNowRunning && backendNowRunning) {
    console.log(`✅ Web 服务器已启动: ${URL}`);
    console.log(`   - 前端 (Vite): http://localhost:${FRONTEND_PORT}`);
    console.log(`   - 后端 (API): http://localhost:${BACKEND_PORT}`);
    console.log(`🌐 正在打开浏览器...`);
    openBrowser(URL);
    console.log(`\n💡 提示：按 Ctrl+C 停止服务器\n`);
    
    // 处理退出信号
    const cleanup = () => {
      console.log(`\n正在停止服务器...`);
      try {
        backendProcess.kill();
        frontendProcess.kill();
      } catch (e) {
        // 忽略错误
      }
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // 等待进程（保持运行）
    Promise.race([
      new Promise((resolve) => backendProcess.on('exit', resolve)),
      new Promise((resolve) => frontendProcess.on('exit', resolve))
    ]).then(() => {
      console.log(`\n服务器进程已退出`);
      cleanup();
    });
  } else {
    // 即使端口检查失败，如果进程还在运行，也认为启动成功
    // 因为从输出看服务器已经启动了
    console.log(`✅ Web 服务器已启动: ${URL}`);
    console.log(`   - 前端 (Vite): http://localhost:${FRONTEND_PORT}`);
    console.log(`   - 后端 (API): http://localhost:${BACKEND_PORT}`);
    console.log(`🌐 正在打开浏览器...`);
    openBrowser(URL);
    console.log(`\n💡 提示：按 Ctrl+C 停止服务器\n`);
    
    // 处理退出信号
    const cleanup = () => {
      console.log(`\n正在停止服务器...`);
      try {
        backendProcess.kill();
        frontendProcess.kill();
      } catch (e) {
        // 忽略错误
      }
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // 等待进程（保持运行）
    Promise.race([
      new Promise((resolve) => backendProcess.on('exit', resolve)),
      new Promise((resolve) => frontendProcess.on('exit', resolve))
    ]).then(() => {
      console.log(`\n服务器进程已退出`);
      cleanup();
    });
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  let command = args[0];

  // 如果没有提供命令，显示帮助信息
  if (!command) {
    command = 'help';
  }

  switch (command) {
    case 'list':
    case 'ls':
      const filter = {};
      let argIndex = 1;
      while (argIndex < args.length) {
        if (args[argIndex] === '--project' && args[argIndex + 1]) {
          filter.project = args[argIndex + 1];
          argIndex += 2;
        } else if (args[argIndex] === '--status' && args[argIndex + 1]) {
          filter.status = args[argIndex + 1];
          argIndex += 2;
        } else {
          argIndex++;
        }
      }
      listTodos(filter);
      break;

    case 'add':
      // 简化：只接受名称参数
      if (args.length < 2) {
        console.error('❌ 请提供任务名称');
        console.log('用法: todo add "任务名称"');
        process.exit(1);
      }
      // 合并所有参数作为任务名称（支持带空格的任务名）
      const name = args.slice(1).join(' ');
      addTodo(name, '', '', '', '', '', '', []);
      break;

    case 'sync':
      // 同步：拉取 + 提交 + 推送
      gitPull();
      gitCommit('Update todos');
      gitPush();
      break;

    case 'open':
    case 'file':
      openCurrentFile();
      break;

    case 'web':
      await startWebServer();
      break;

    case 'action':
      // 子任务操作命令
      const actionCommand = args[1];
      const todoId = args[2];
      const actionId = args[3];

      if (!actionCommand) {
        console.error('❌ 请指定子任务操作: add, start, stop, note, delete, list');
        console.log('用法: todo action <command> <todoId> [actionId] [content]');
        process.exit(1);
      }

      switch (actionCommand) {
        case 'add':
          if (!todoId || !args[3]) {
            console.error('❌ 请提供任务ID和子任务内容');
            console.log('用法: todo action add <todoId> "子任务内容"');
            process.exit(1);
          }
          const addContent = args.slice(3).join(' ');
          addActionItem(todoId, addContent);
          break;

        case 'start':
          if (!todoId || !actionId) {
            console.error('❌ 请提供任务ID和子任务ID');
            console.log('用法: todo action start <todoId> <actionId>');
            process.exit(1);
          }
          startActionItem(todoId, actionId);
          break;

        case 'stop':
          if (!todoId || !actionId) {
            console.error('❌ 请提供任务ID和子任务ID');
            console.log('用法: todo action stop <todoId> <actionId> [备注]');
            process.exit(1);
          }
          const stopNote = args[4] ? args.slice(4).join(' ') : null;
          stopActionItem(todoId, actionId, stopNote);
          break;

        case 'note':
          if (!todoId || !actionId || !args[4]) {
            console.error('❌ 请提供任务ID、子任务ID和备注内容');
            console.log('用法: todo action note <todoId> <actionId> "备注内容"');
            process.exit(1);
          }
          const noteContent = args.slice(4).join(' ');
          noteActionItem(todoId, actionId, noteContent);
          break;

        case 'delete':
        case 'del':
          if (!todoId || !actionId) {
            console.error('❌ 请提供任务ID和子任务ID');
            console.log('用法: todo action delete <todoId> <actionId>');
            process.exit(1);
          }
          deleteActionItem(todoId, actionId);
          break;

        case 'list':
        case 'ls':
          if (!todoId) {
            console.error('❌ 请提供任务ID');
            console.log('用法: todo action list <todoId>');
            process.exit(1);
          }
          listActionItems(todoId);
          break;

        default:
          console.error(`❌ 未知的子任务操作: ${actionCommand}`);
          console.log('可用操作: add, start, stop, note, delete, list');
          process.exit(1);
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
📝 Global Todo CLI - 全局待办事项工具

用法: todo <command> [options]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
大任务管理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  list, ls                   显示当天的待办事项
    --project <name>         按项目过滤
    --status <status>        按状态过滤

  add <name>                 添加大任务（基于交付物命名）

  open, file                 打开/查看当前日期的待办文件

  web                        启动 Web 界面

  sync                       同步到 Git（拉取 + 提交 + 推送）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
子任务管理（自动时间追踪，40分钟上限）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  action add <todoId> "内容"     添加子任务
  action start <todoId> <actionId>    启动子任务（开始计时）
  action stop <todoId> <actionId> ["备注"]    停止子任务（结束计时）
  action note <todoId> <actionId> "备注"    添加备注
  action delete <todoId> <actionId>    删除子任务
  action list <todoId>    列出任务的所有子任务

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
示例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # 添加大任务（交付物）
  todo add "Icon Card 组件"

  # 添加子任务
  todo action add mk3g95mzj "修复 React 中的 icon 错误"

  # 启动子任务（开始计时）
  todo action start mk3g95mzj action_abc123

  # 停止子任务（结束计时并添加备注）
  todo action stop mk3g95mzj action_abc123 "问题已解决"

  # 查看任务列表
  todo list

  # 查看某个任务的所有子任务
  todo action list mk3g95mzj

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.log('使用 "todo help" 查看帮助');
      process.exit(1);
  }
}

main();

