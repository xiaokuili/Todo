# Todo
有条理的做某些事，并且AI助力

## Feature
1. global todolist， and easy read and write
2. Web 界面：按时间维度展示和编辑待办事项 

## Model
- Todo  
  - name (名称) 
  - description (描述)
  - start (开始时间) 
  - date (日期)
  - end (截止时间)
  - steps (步骤列表，处理流程)
  - project (项目名称)
  - status (状态)

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


### 2. 配置 Git 仓库（用于多设备同步）

```bash
cd todo
git init
git remote add origin https://github.com/xiaokuili/Todo # 可选：GitHub/GitLab 等
```

## 使用方法

### Web 界面（推荐）

**方式 1：使用 `todo web` 命令（推荐，最简单）**

```bash
todo web
```

该命令会：
- ✅ 自动检测服务器是否已运行
- 🚀 如果未运行，自动启动服务器（后台运行）
- 🌐 自动打开浏览器访问 `http://localhost:3000`

**方式 2：手动启动服务器**

```bash
cd todo
npm start
```

然后在浏览器中打开 `http://localhost:3000`

**功能特点：**
- 📅 按日期分组展示所有待办事项
- ⏰ 方便设置开始时间和结束时间
- ✏️ 可视化编辑所有字段（名称、日期、时间、项目、状态、描述、步骤）
- 🎨 现代化的界面设计
- 📱 响应式设计，支持移动端

**停止服务器：**

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 命令行界面

### 基本命令

```bash
# 查看所有待办
todo list

# 添加待办
todo add "完成项目文档"

# 启动 Web 界面（推荐）
todo web

# 打开当前日期的文件进行编辑
todo open

# 同步到远程仓库
todo sync

# 查看帮助
todo help
```

### 高级用法

```bash
# 按项目过滤
todo list --project work

# 按状态过滤
todo list --status pending

# Git 同步
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
   git add todos/
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

- 数据目录：`todos/`（按日期拆分的 JSON 文件）
- 位置：`todo/todos/`
- 格式：每个日期一个文件，文件名格式为 `YYYY-MM-DD.json`
- 示例：
  - `todos/2025-12-16.json` - 2025年12月16日的待办事项
  - `todos/2025-12-17.json` - 2025年12月17日的待办事项
- 每个文件包含该日期的所有待办事项（JSON 数组格式）
- 如果待办事项没有指定日期，将使用创建日期或当前日期

## 优势

✅ **简单**：纯 Node.js，无外部依赖  
✅ **免费**：使用 Git 同步，无需付费服务  
✅ **灵活**：可直接编辑 JSON 文件  
✅ **多设备**：通过 Git 实现同步  
✅ **版本控制**：Git 自动记录历史  

## 示例

```bash
# 快速添加待办
todo add "重构用户模块"

# 查看所有待办
todo list

# 启动 Web 界面进行详细编辑
todo web

# 完成后同步到远程
todo sync
```
