# Todo
有条理的做某些事，并且AI助力

## Feature
1. global todolist， and easy read and write 

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

### 基本命令

```bash
# 查看所有待办
todo list

# 添加待办
todo add "完成项目文档" "需要写 API 文档" --project work --star

# 更新状态和步骤
todo update <id> --status in_progress --steps "步骤1,步骤2"

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
todo update <id> --name "新名称" --status completed --star

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
# 添加一个重要的待办
todo add "重构用户模块" "优化代码结构" --project dev --star --end "2024-12-31"

# 查看所有待办
todo list

# 更新状态和步骤
todo update <id> --status in_progress --steps "步骤1,步骤2"

# 完成后同步
todo done <id>
todo sync
```
