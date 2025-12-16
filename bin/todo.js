#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TODO_FILE = path.join(__dirname, '..', 'todos.json');
const TODO_DIR = path.dirname(TODO_FILE);

// 确保目录存在
if (!fs.existsSync(TODO_DIR)) {
  fs.mkdirSync(TODO_DIR, { recursive: true });
}

// 读取待办事项
function loadTodos() {
  if (!fs.existsSync(TODO_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(TODO_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading todos:', error.message);
    return [];
  }
}

// 保存待办事项
function saveTodos(todos) {
  fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2), 'utf8');
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

// 显示待办列表
function listTodos(filter = {}) {
  const todos = loadTodos();
  
  if (todos.length === 0) {
    console.log('📝 暂无待办事项');
    return;
  }

  // 过滤
  let filtered = todos;
  if (filter.project) {
    filtered = filtered.filter(t => t.project === filter.project);
  }
  if (filter.process !== undefined) {
    filtered = filtered.filter(t => t.process === filter.process);
  }
  if (filter.star) {
    filtered = filtered.filter(t => t.star === true);
  }

  // 排序：星标优先，然后按创建时间
  filtered.sort((a, b) => {
    if (a.star && !b.star) return -1;
    if (!a.star && b.star) return 1;
    return new Date(b.created || 0) - new Date(a.created || 0);
  });

  console.log('\n📋 待办事项列表:\n');
  filtered.forEach((todo, index) => {
    const star = todo.star ? '⭐' : '  ';
    const process = todo.process || 0;
    const processBar = '█'.repeat(Math.floor(process / 10)) + '░'.repeat(10 - Math.floor(process / 10));
    const end = todo.end ? `📅 ${formatDate(todo.end)}` : '';
    const project = todo.project ? `#${todo.project}` : '';
    
    console.log(`${star} [${index + 1}] ${todo.name}`);
    if (todo.description) {
      console.log(`    ${todo.description}`);
    }
    console.log(`    进度: ${processBar} ${process}% ${end} ${project}`);
    console.log(`    ID: ${todo.id}`);
    console.log('');
  });
}

// 添加待办
function addTodo(name, description = '', project = '', star = false, end = '') {
  const todos = loadTodos();
  const newTodo = {
    id: generateId(),
    name,
    description,
    project,
    star: star === true || star === 'true',
    process: 0,
    end: end || null,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  todos.push(newTodo);
  saveTodos(todos);
  console.log(`✅ 已添加: ${name}`);
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
  updateTodo(id, { process: 100 });
}

// Git 提交
function gitCommit(message) {
  try {
    const cwd = path.join(__dirname, '..');
    execSync('git add todos.json', { cwd, stdio: 'inherit' });
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
      if (args[1] === '--project' && args[2]) {
        filter.project = args[2];
      }
      if (args[1] === '--process' && args[2]) {
        filter.process = parseInt(args[2]);
      }
      if (args[1] === '--star') {
        filter.star = true;
      }
      listTodos(filter);
      break;

    case 'add':
      if (!args[1]) {
        console.error('❌ 请提供待办事项名称');
        console.log('用法: todo add <name> [description] [--project <project>] [--star] [--end <date>]');
        process.exit(1);
      }
      const name = args[1];
      let description = '';
      let project = '';
      let star = false;
      let end = '';
      
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
          project = args[i + 1];
          i++;
        } else if (args[i] === '--star') {
          star = true;
        } else if (args[i] === '--end' && args[i + 1]) {
          end = args[i + 1];
          i++;
        } else if (!description) {
          description = args[i];
        }
      }
      addTodo(name, description, project, star, end);
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
        } else if (args[i] === '--process' && args[i + 1]) {
          updates.process = parseInt(args[i + 1]);
          i++;
        } else if (args[i] === '--star') {
          updates.star = true;
        } else if (args[i] === '--unstar') {
          updates.star = false;
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
    --process <number>       按进度过滤
    --star                   只显示星标

  add <name>                 添加待办事项
    [description]            描述
    --project <name>         项目名称
    --star                   标记为星标
    --end <date>             截止日期

  update <id>                更新待办事项
    --name <name>            更新名称
    --desc <description>     更新描述
    --project <name>         更新项目
    --process <number>       更新进度 (0-100)
    --star                   添加星标
    --unstar                 移除星标
    --end <date>             更新截止日期

  done <id>                  标记为完成 (进度 100%)

  remove, rm <id>            删除待办事项

  commit [message]           提交更改到 Git
  push                       推送到远程仓库
  pull                       从远程仓库拉取
  sync                       拉取 + 提交 + 推送

示例:
  todo add "完成项目文档" --project work --star
  todo list --star
  todo update <id> --process 50
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

