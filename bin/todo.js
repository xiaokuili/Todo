#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

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

// 格式化步骤显示
function formatStepsDisplay(todo) {
  let steps = todo.steps;
  if (!steps && todo.process && Array.isArray(todo.process)) {
    steps = todo.process;
  }
  if (steps && Array.isArray(steps) && steps.length > 0) {
    return steps.map((step, index) => `    ${index + 1}. ${step}`).join('\n');
  }
  return null;
}

// 显示单个待办事项
function displayTodo(todo, index) {
  const statusColor = getStatusColor(todo);
  const statusText = getStatusText(todo);
  const timeDisplay = formatTimeDisplay(todo);
  const project = todo.project ? `${colors.magenta}#${todo.project}${colors.reset}` : '';
  
  // 状态图标（带颜色，加粗）
  const statusDisplay = `${statusColor}${colors.bright}${statusText}${colors.reset}`;
  
  // 任务名称（加粗显示）
  const nameDisplay = `${colors.bright}${todo.name}${colors.reset}`;
  
  // 构建主行：状态 + 名称 + 项目
  const mainParts = [statusDisplay, nameDisplay];
  if (project) {
    mainParts.push(project);
  }
  
  // 如果有时间信息，放在同一行后面
  if (timeDisplay) {
    console.log(`  ${mainParts.join(' ')}  ${timeDisplay}`);
  } else {
    console.log(`  ${mainParts.join(' ')}`);
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
  
  console.log('📋 待办事项列表:\n');
  
  sortedTodos.forEach((todo, index) => {
    displayTodo(todo, index + 1);
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

// 主函数
function main() {
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

    case 'help':
    case '--help':
    case '-h':
      console.log(`
📝 Global Todo CLI - 全局待办事项工具

用法: todo <command> [options]

命令:
  list, ls                   显示当天的待办事项
    --project <name>         按项目过滤
    --status <status>        按状态过滤

  add <name>                 添加待办事项（简化版，只接受任务名称）

  open, file                 打开/查看当前日期的待办文件（用于复杂编辑）

  sync                       同步（拉取 + 提交 + 推送）

示例:
  todo add "完成项目文档"      # 快速添加任务
  todo list                    # 查看当天的待办
  todo list --status pending   # 按状态过滤
  todo open                    # 打开当前日期的文件进行编辑
  todo sync                    # 同步（拉取+提交+推送）
      `);
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.log('使用 "todo help" 查看帮助');
      process.exit(1);
  }
}

main();

