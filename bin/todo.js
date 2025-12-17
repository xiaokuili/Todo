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

// 获取状态图标
function getStatusIcon(todo) {
  if (todo.status === 'completed' || todo.status === 'done') {
    return '✅';
  }
  return '⏳';
}

// 格式化时间显示
function formatTimeDisplay(todo) {
  if (todo.start && todo.end) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.start) && timePattern.test(todo.end)) {
      return `🕐 ${todo.start} - ${todo.end}`;
    } else {
      const startDate = todo.start ? formatDate(todo.start) : '';
      const endDate = todo.end ? formatDate(todo.end) : '';
      return startDate && endDate ? `📅 ${startDate} - ${endDate}` : (endDate ? `📅 ${endDate}` : '');
    }
  } else if (todo.end) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.end)) {
      return `🕐 ${todo.end}`;
    }
    return `📅 ${formatDate(todo.end)}`;
  } else if (todo.start) {
    const timePattern = /^\d{1,2}:\d{2}$/;
    if (timePattern.test(todo.start)) {
      return `🕐 ${todo.start}`;
    }
    return `📅 ${formatDate(todo.start)}`;
  }
  return '';
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
  const statusIcon = getStatusIcon(todo);
  const timeDisplay = formatTimeDisplay(todo);
  const stepsDisplay = formatStepsDisplay(todo);
  const project = todo.project ? `#${todo.project}` : '';
  
  // 编号和标题
  console.log(`  [${index}] ${statusIcon} ${todo.name}`);
  
  // 检查是否有步骤数组
  const hasStepsArray = todo.steps && Array.isArray(todo.steps) && todo.steps.length > 0;
  
  // 描述处理
  if (todo.description) {
    const descLines = todo.description.split('\n');
    // 检查描述是否全是步骤格式（数字开头的行）
    const allStepFormat = descLines.every(line => {
      const trimmed = line.trim();
      return !trimmed || /^\d+\.\s/.test(trimmed);
    });
    
    // 如果描述全是步骤格式，且有步骤数组，则跳过描述显示（避免重复）
    // 否则显示描述
    if (!allStepFormat || !hasStepsArray) {
      descLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          console.log(`    ${trimmed}`);
        }
      });
    }
  }
  
  // 步骤（如果有步骤数组，显示步骤数组；否则不显示，因为已经在描述中显示了）
  if (stepsDisplay) {
    console.log(stepsDisplay);
  }
  
  // 元信息行：时间、项目、ID
  const metaParts = [];
  if (timeDisplay) metaParts.push(timeDisplay);
  if (project) metaParts.push(project);
  if (todo.id) metaParts.push(`ID: ${todo.id}`);
  
  if (metaParts.length > 0) {
    console.log(`    ${metaParts.join('  ')}`);
  }
  
  console.log(''); // 空行分隔
}

// 显示待办列表（简洁版）
function displayTodosList(todos) {
  if (todos.length === 0) {
    console.log('📝 暂无待办事项\n');
    return;
  }
  
  console.log('📋 待办事项列表:\n');
  
  todos.forEach((todo, index) => {
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
  
  // 按日期排序（最新的在前）
  const sortedDates = Object.keys(todosByDate).sort((a, b) => b.localeCompare(a));
  
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
    
    // 按项目分组
    const projectGroups = {};
    dateTodos.forEach(todo => {
      const project = todo.project || '未分类';
      if (!projectGroups[project]) {
        projectGroups[project] = [];
      }
      projectGroups[project].push(todo);
    });
    
    // 按项目排序并显示
    let globalIndex = 1;
    Object.keys(projectGroups).sort().forEach(project => {
      const projectTodos = projectGroups[project];
      projectTodos.sort((a, b) => {
        return new Date(b.created || 0) - new Date(a.created || 0);
      });
      
      projectTodos.forEach(todo => {
        displayTodo(todo, globalIndex++);
      });
    });
    
    console.log(''); // 日期组之间的分隔
  });
}

// 显示待办列表
function listTodos(filter = {}) {
  const todos = loadTodos();
  
  // 过滤
  let filtered = todos;
  if (filter.project) {
    filtered = filtered.filter(t => t.project === filter.project);
  }
  if (filter.steps !== undefined) {
    filtered = filtered.filter(t => t.steps === filter.steps);
  }
  if (filter.status) {
    filtered = filtered.filter(t => t.status === filter.status);
  }
  
  // 如果没有过滤条件，使用分组显示；否则使用简洁列表
  if (Object.keys(filter).length === 0) {
    displayTodosGrouped(filtered);
  } else {
    displayTodosList(filtered);
  }
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
    { key: 'description', prompt: '📄 描述 (可选，直接回车跳过): ' },
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
        answers.description || '',
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

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

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
      if (!args[1]) {
        console.error('❌ 请提供待办事项名称');
        console.log('用法: todo add <name> [description] [--project <project>] [--start <time>] [--end <time>] [--date <date>] [--status <status>] [--steps <step1,step2,...>]');
        process.exit(1);
      }
      const name = args[1];
      let description = '';
      let project = '';
      let start = '';
      let date = '';
      let end = '';
      let status = '';
      let steps = [];
      
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
          project = args[i + 1];
          i++;
        } else if (args[i] === '--start' && args[i + 1]) {
          start = args[i + 1];
          i++;
        } else if (args[i] === '--date' && args[i + 1]) {
          date = args[i + 1];
          i++;
        } else if (args[i] === '--end' && args[i + 1]) {
          end = args[i + 1];
          i++;
        } else if (args[i] === '--status' && args[i + 1]) {
          status = args[i + 1];
          i++;
        } else if (args[i] === '--steps' && args[i + 1]) {
          steps = args[i + 1].split(',').map(s => s.trim());
          i++;
        } else if (!description) {
          description = args[i];
        }
      }
      addTodo(name, description, project, start, end, date, status, steps);
      break;

    case 'update':
      if (!args[1]) {
        console.error('❌ 请提供待办事项 ID');
        process.exit(1);
      }
      const id = args[1];
      const updates = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--name' && args[i + 1]) {
          updates.name = args[i + 1];
          i++;
        } else if (args[i] === '--desc' && args[i + 1]) {
          updates.description = args[i + 1];
          i++;
        } else if (args[i] === '--project' && args[i + 1]) {
          updates.project = args[i + 1];
          i++;
        } else if (args[i] === '--steps' && args[i + 1]) {
          updates.steps = args[i + 1].split(',').map(s => s.trim());
          i++;
        } else if (args[i] === '--status' && args[i + 1]) {
          updates.status = args[i + 1];
          i++;
        } else if (args[i] === '--start' && args[i + 1]) {
          updates.start = args[i + 1];
          i++;
        } else if (args[i] === '--date' && args[i + 1]) {
          updates.date = args[i + 1];
          i++;
        } else if (args[i] === '--end' && args[i + 1]) {
          updates.end = args[i + 1];
          i++;
        }
      }
      updateTodo(id, updates);
      break;

    case 'done':
      if (!args[1]) {
        console.error('❌ 请提供待办事项 ID');
        process.exit(1);
      }
      doneTodo(args[1]);
      break;

    case 'remove':
    case 'rm':
      if (!args[1]) {
        console.error('❌ 请提供待办事项 ID');
        process.exit(1);
      }
      removeTodo(args[1]);
      break;

    case 'commit':
      const message = args[1] || 'Update todos';
      gitCommit(message);
      break;

    case 'push':
      gitPush();
      break;

    case 'pull':
      gitPull();
      break;

    case 'sync':
      gitPull();
      gitCommit('Update todos');
      gitPush();
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
📝 Global Todo CLI - 全局待办事项工具

用法: todo <command> [options]

命令:
  list, ls                   显示所有待办事项
    --project <name>         按项目过滤
    --status <status>        按状态过滤

  add <name>                 添加待办事项
    [description]            描述
    --project <name>         项目名称
    --start <time>           开始时间（HH:MM 或日期）
    --end <time>             结束时间（HH:MM 或日期）
    --date <date>            计划日期
    --status <status>        状态
    --steps <step1,step2>    步骤列表（逗号分隔）

  update <id>                更新待办事项
    --name <name>            更新名称
    --desc <description>     更新描述
    --project <name>         更新项目
    --steps <step1,step2>    更新步骤列表（逗号分隔）
    --status <status>        更新状态
    --start <time>           更新开始时间
    --end <time>             更新结束时间
    --date <date>            更新计划日期

  done <id>                  标记为完成 (status: completed)

  remove, rm <id>            删除待办事项

  commit [message]           提交更改到 Git
  push                       推送到远程仓库
  pull                       从远程仓库拉取
  sync                       拉取 + 提交 + 推送

示例:
  todo add "完成项目文档" --project work --start "09:00" --end "12:00" --status pending
  todo add "重构代码" --steps "设计,编码,测试" --status in_progress
  todo list --status pending
  todo update <id> --steps "步骤1,步骤2,步骤3"
  todo update <id> --status completed
  todo update <id> --start "13:30" --end "14:00"
  todo done <id>
  todo sync
      `);
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.log('使用 "todo help" 查看帮助');
      process.exit(1);
  }
}

main();

