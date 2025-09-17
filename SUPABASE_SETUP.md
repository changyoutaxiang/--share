# Supabase 数据库集成指南

## 概述

本项目已完成 Supabase 云端数据库的集成，实现了项目数据的云端存储和同步功能。

## 数据库结构

### 核心表结构

1. **users** - 用户表
   - 存储用户基本信息（邮箱、姓名、头像等）
   - 与 Supabase Auth 集成

2. **projects** - 项目表
   - 项目基本信息（名称、描述、颜色等）
   - 支持多用户协作

3. **tasks** - 任务表
   - 任务详细信息（标题、描述、状态、优先级等）
   - 支持截止日期、分配人员等

4. **tags** - 标签表
   - 自定义标签系统
   - 支持颜色分类

5. **task_tags** - 任务标签关联表
   - 多对多关系表

6. **project_members** - 项目成员表
   - 项目协作成员管理
   - 角色权限控制

7. **activity_logs** - 活动日志表
   - 记录用户操作历史

8. **comments** - 评论表
   - 任务评论功能

9. **attachments** - 附件表
   - 文件附件管理

### 视图

- **task_with_tags** - 带标签的任务视图
- **project_stats** - 项目统计视图

## 设置步骤

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和 API Key

### 2. 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 执行数据库迁移

1. 在 Supabase 控制台中，进入 SQL Editor
2. 复制 `supabase-migration.sql` 文件内容
3. 执行 SQL 脚本创建表结构和策略

### 4. 启用认证

在 Supabase 控制台中：
1. 进入 Authentication 设置
2. 启用 Email 认证
3. 配置邮件模板（可选）

## 功能特性

### 认证系统
- 用户注册/登录
- 邮箱验证
- 密码重置
- 用户资料管理

### 数据安全
- 行级安全策略（RLS）
- 用户只能访问自己的数据
- 项目成员权限控制

### 数据同步
- 实时数据同步
- 离线数据缓存
- 冲突解决机制

## 使用方法

### 1. 启动应用

```bash
npm run dev
```

### 2. 测试数据库连接

1. 在应用中按快捷键 `5` 或点击导航切换到 "Supabase 测试" 页面
2. 点击 "测试连接" 按钮验证数据库连接
3. 使用测试功能验证各项操作

### 3. 用户认证

- 新用户需要先注册账号
- 登录后可以访问所有功能
- 支持登出和切换账号

### 4. 数据操作

- 创建项目和任务会自动同步到云端
- 数据修改实时保存
- 支持多设备同步

## API 使用

### 认证操作

```typescript
import { db } from './lib/database'

// 注册
await db.auth.signUp(email, password, { name: 'User Name' })

// 登录
await db.auth.signIn(email, password)

// 登出
await db.auth.signOut()
```

### 数据操作

```typescript
// 创建项目
const project = await db.projects.createProject({
  name: '新项目',
  description: '项目描述',
  color: '#3b82f6'
})

// 创建任务
const task = await db.tasks.createTask({
  title: '新任务',
  description: '任务描述',
  status: 'todo',
  priority: 'medium',
  project_id: project.id
})

// 获取用户项目
const projects = await db.projects.getUserProjects()

// 获取项目任务
const tasks = await db.tasks.getProjectTasks(projectId)
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查环境变量配置
   - 确认 Supabase 项目状态
   - 验证 API Key 权限

2. **认证错误**
   - 确认邮箱格式正确
   - 检查密码强度要求
   - 验证邮箱确认状态

3. **权限错误**
   - 确认 RLS 策略正确配置
   - 检查用户登录状态
   - 验证数据所有权

### 调试工具

- 使用浏览器开发者工具查看网络请求
- 检查 Supabase 控制台的日志
- 使用应用内的测试页面验证功能

## 部署注意事项

1. 确保生产环境的环境变量正确配置
2. 在 Supabase 控制台中配置正确的域名
3. 启用必要的安全策略
4. 定期备份数据库

## 扩展功能

### 实时订阅

```typescript
// 订阅项目变更
const subscription = supabase
  .channel('projects')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      console.log('项目变更:', payload)
    }
  )
  .subscribe()
```

### 文件存储

```typescript
// 上传文件
const { data, error } = await supabase.storage
  .from('attachments')
  .upload('file-path', file)
```

## 支持

如有问题，请查看：
- [Supabase 官方文档](https://supabase.com/docs)
- [项目 GitHub Issues](https://github.com/your-repo/issues)
- 应用内测试页面的错误信息