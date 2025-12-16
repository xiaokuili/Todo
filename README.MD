# Todo
有条理的做某些事，并且AI助力

## Feature
1. global todolist， and easy read and write 

## Model
- Todo  
  - name (名称)
  - description (描述)
  - star (星标/重要)
  - date (计划日期/时间)
  - end (截止日期)
  - process (进度 0-100)
  - project (项目名称)

## 安装

### 方法 1：使用 npm link（推荐，最简单）

```bash
cd todo
npm link
```

安装完成后，验证：
```bash
todo help
```

如果看到帮助信息，说明安装成功！现在可以在任何目录使用 `todo` 命令了。

### 方法 2：使用 npm install -g

```bash
cd todo
npm install -g .
```

### 方法 3：直接使用（无需安装）

如果不想全局安装，也可以直接使用：
```bash
cd todo
node bin/todo.js list
```

或者创建别名（添加到 `~/.zshrc` 或 `~/.bashrc`）：
```bash
alias todo="node /Users/vincent/code/play_mess/todo/bin/todo.js"
```

### 2. 配置 Git 仓库（用于多设备同步）

```bash
cd todo
git init
git remote add origin https://github.com/xiaokuili/Todo # 可选：GitHub/GitLab 等
```

## 使用方法

### 基本命令

```bash
# 查看所有待办
todo list

# 添加待办
todo add "完成项目文档" "需要写 API 文档" --project work --star

# 更新进度
todo update <id> --process 50

# 标记完成
todo done <id>

# 删除待办
todo remove <id>

# 查看帮助
todo help
```

### 高级用法

```bash
# 只显示星标待办
todo list --star

# 按项目过滤
todo list --project work

# 更新多个字段
todo update <id> --name "新名称" --process 80 --star

# Git 同步
todo pull          # 从远程拉取
todo commit "更新待办"  # 提交更改
todo push          # 推送到远程
todo sync          # 一键同步（拉取+提交+推送）
```

## 多设备同步

### 方案：使用 Git 仓库

1. **创建远程仓库**（GitHub/GitLab/Gitee 等，免费）
   ```bash
   # 在 GitHub 创建新仓库，然后：
   git remote add origin https://github.com/yourusername/your-todo-repo.git
   ```

2. **设备 A（首次设置）**
   ```bash
   cd todo
   git add todos.json
   git commit -m "Initial todos"
   git push -u origin main
   ```

3. **设备 B（同步）**
   ```bash
   git clone https://github.com/yourusername/your-todo-repo.git todo
   cd todo
   npm link
   todo pull  # 拉取最新数据
   ```

4. **日常使用**
   ```bash
   # 修改待办后
   todo sync  # 自动拉取、提交、推送
   ```

## 数据存储

- 数据文件：`todos.json`（JSON 格式，可直接编辑）
- 位置：`todo/todos.json`
- 格式：JSON 数组，每个待办包含所有 Model 字段

## 优势

✅ **简单**：纯 Node.js，无外部依赖  
✅ **免费**：使用 Git 同步，无需付费服务  
✅ **灵活**：可直接编辑 JSON 文件  
✅ **多设备**：通过 Git 实现同步  
✅ **版本控制**：Git 自动记录历史  

## 示例

```bash
# 添加一个重要的待办
todo add "重构用户模块" "优化代码结构" --project dev --star --end "2024-12-31"

# 查看所有待办
todo list

# 更新进度
todo update <id> --process 60

# 完成后同步
todo done <id>
todo sync
```
