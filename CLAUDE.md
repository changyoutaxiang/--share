# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React + TypeScript + Vite 的现代项目管理应用，集成了 Supabase 云端数据库。该应用支持看板视图、列表视图、数据分析和项目协作功能。

## 开发命令

### 基础命令
- `npm run dev` - 启动开发服务器 (http://localhost:5173)
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果
- `npm run lint` - 运行代码检查

### 数据库相关脚本
- `node test-supabase.js` - 测试数据库连接
- `node debug-supabase.js` - 调试 Supabase 配置
- `node run-migration.js` - 执行数据库迁移
- `node create-test-user.js` - 创建测试用户
- `node admin-create-user.js` - 管理员创建用户

## 核心架构

### 应用架构
- **主应用**: App.tsx 作为根组件，包含多个 Provider (Auth, Theme, Toast, Project, Notification)
- **路由视图**: 基于状态切换的多视图架构（看板、列表、分析、设置、数据库测试）
- **响应式布局**: ResponsiveLayout 组件处理桌面和移动端适配
- **懒加载**: 主要视图组件使用 React.lazy 懒加载优化

### 状态管理
采用 React Context 模式管理全局状态：
- `AuthContext` - 用户认证状态
- `ProjectContext` - 项目选择和管理
- `ThemeContext` - 主题切换（暗色/亮色）
- `ToastContext` - 消息提示
- `NotificationContext` - 通知系统

### 数据层架构
- **数据库**: Supabase PostgreSQL 云端数据库
- **API 层**: src/lib/database.ts 统一数据操作接口
- **配置**: src/lib/config.ts 应用配置管理
- **认证模式**: 支持完整认证模式和简化开发模式

### 组件结构
```
src/
├── components/     # UI 组件
│   ├── KanbanView.tsx
│   ├── ListView.tsx
│   ├── AnalyticsView.tsx
│   ├── SettingsView.tsx
│   ├── DatabaseTest.tsx
│   └── ...
├── contexts/       # 状态管理
├── hooks/          # 自定义 hooks
├── lib/            # 核心逻辑
│   ├── database.ts # 数据库操作
│   ├── config.ts   # 配置管理
│   └── supabase.ts # Supabase 客户端
└── types/          # TypeScript 类型定义
```

## 数据库集成

### Supabase 配置
环境变量配置在 `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 数据库架构
核心表：users, projects, tasks, tags, task_tags, project_members, activity_logs, comments, attachments

### 数据库操作
通过 `src/lib/database.ts` 的统一接口操作：
- `db.auth.*` - 认证操作
- `db.projects.*` - 项目管理
- `db.tasks.*` - 任务管理
- `db.test.*` - 连接测试

## 开发模式

### 认证模式切换
在 `src/lib/config.ts` 中配置：
- `ENABLE_AUTH: false` - 简化模式，无需登录
- `DEV_MODE: true` - 开发模式，使用测试用户ID

### 快捷键系统
应用内置快捷键支持：
- `1-5` - 切换不同视图
- `?` - 显示快捷键帮助
- `Escape` - 关闭帮助面板

## 部署和迁移

### 数据库迁移文件
- `supabase-migration.sql` - 推荐的迁移脚本
- `supabase-schema.sql` - 完整数据库架构
- `safe-migration.sql` - 安全迁移版本

### 文档参考
- `QUICK_SETUP.md` - 快速设置指南
- `SUPABASE_SETUP.md` - 详细的 Supabase 集成指南
- `SQL_EXECUTION_GUIDE.md` - SQL 执行指南
- `SQL_ERROR_SOLUTION.md` - 常见 SQL 错误解决方案

## 技术栈

### 前端框架
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- Lucide React 图标库

### 后端服务
- Supabase (PostgreSQL + Auth + Real-time)
- 行级安全策略 (RLS)
- 实时数据订阅

### 开发工具
- ESLint 代码检查
- PostCSS + Autoprefixer
- TypeScript 严格模式