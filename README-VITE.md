# Vite 开发环境配置说明

## 安装依赖

```bash
npm install
```

## 开发命令

### 启动开发服务器（Vite）
```bash
npm run dev
```
访问：http://localhost:5173

### 启动后端服务器（Express）
```bash
npm start
```
后端 API：http://localhost:3000

### 同时运行（需要两个终端）
- 终端1：`npm run dev` - 前端开发服务器
- 终端2：`npm start` - 后端 API 服务器

## 代码格式化

### 格式化所有代码
```bash
npm run format
```

### 检查代码规范
```bash
npm run lint
```

## 生产构建

```bash
npm run build
```

构建后的文件在 `dist` 目录。

## 优势

✅ **更快的开发体验** - HMR（热模块替换）
✅ **代码自动格式化** - Prettier 保持代码整洁
✅ **代码规范检查** - ESLint 发现潜在问题
✅ **现代化工具链** - 支持最新 ES 特性

## VS Code 推荐插件

- Prettier - Code formatter
- ESLint
- Vite

安装后，保存文件时会自动格式化代码！

