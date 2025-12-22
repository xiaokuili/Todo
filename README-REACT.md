# React 版本迁移完成 ✅

项目已成功迁移到 React + Vite！

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器

**方式一：一键启动（推荐）**
```bash
npm run web
```
这会同时启动前端和后端服务器，访问：http://localhost:3000

**方式二：分别启动（用于调试）**

需要两个终端：

**终端 1 - 前端开发服务器（Vite + React）**
```bash
npm run dev
```
访问：http://localhost:3000

**终端 2 - 后端 API 服务器（Express）**
```bash
npm start
```
后端 API：http://localhost:3001

> **注意**：前端运行在 3000 端口，后端运行在 3001 端口，Vite 会自动代理 `/api` 请求到后端。

## 🔧 端口配置

- **前端 (Vite)**: `3000` - 用户访问的端口
- **后端 (Express)**: `3001` - API 服务器端口
- **代理**: Vite 会自动将 `/api/*` 请求代理到 `http://localhost:3001`

## 📁 项目结构

```
public/
├── main.jsx              # React 入口文件
├── index.html            # HTML 模板
├── index.css             # 全局样式
└── js/
    ├── App.jsx           # 主应用组件
    ├── api.js            # API 请求模块
    └── components/
        ├── Calendar.jsx  # 日历组件
        ├── TodoList.jsx  # Todo 列表组件
        ├── TodoCard.jsx  # Todo 卡片组件
        └── TimePicker.jsx # 时间选择器组件
```

## 🎨 调整 UI 的位置

### 调整时间 UI
编辑：`public/js/components/TimePicker.jsx`
- 查看模式：第 120-180 行
- 编辑模式：第 40-120 行

### 调整 Todo Card UI
编辑：`public/js/components/TodoCard.jsx`
- 主要结构：第 50-150 行
- 样式类名：Tailwind CSS

## ✨ React 的优势

✅ **组件化** - 代码更模块化，易于维护
✅ **状态管理** - 使用 React Hooks 管理状态
✅ **热更新** - 修改代码立即看到效果
✅ **类型安全** - 可以轻松添加 TypeScript
✅ **性能优化** - React 自动优化渲染

## 🛠️ 开发工具

### 代码格式化
```bash
npm run format
```

### 代码检查
```bash
npm run lint
```

### 生产构建
```bash
npm run build
```

## 🐛 故障排除

### 数据加载失败
1. 确保后端服务器正在运行（`npm start`）
2. 检查后端是否在 3001 端口运行
3. 打开浏览器控制台查看错误信息
4. 检查网络请求是否被正确代理

### 端口冲突
如果 3000 端口被占用，可以修改 `vite.config.js` 中的 `port` 配置。

## 📝 注意事项

1. **旧代码已保留** - 原来的 `public/js/todo.js` 等文件还在，可以对比参考
2. **API 不变** - 后端 API 接口保持不变
3. **样式保持** - 继续使用 Tailwind CSS 和瑞士极简风格

## 🔄 从旧版本迁移

如果你之前在使用旧版本，现在只需要：
1. 运行 `npm install` 安装新依赖
2. 运行 `npm run web` 启动开发服务器
3. 访问 http://localhost:3000

享受 React 开发的乐趣！🎉

