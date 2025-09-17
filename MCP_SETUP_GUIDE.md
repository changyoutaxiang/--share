# Supabase MCP 安装配置指南

## 概述

本项目已成功安装和配置了 Supabase MCP (Model Context Protocol) 服务器，可以让 Claude Code 直接与 Supabase 数据库交互。

## 已安装的组件

### 1. 依赖包
- `@supabase/mcp-server-postgrest` - Supabase MCP 服务器
- `@supabase/mcp-utils` - MCP 工具库
- `@supabase/supabase-js` - Supabase 客户端

### 2. 配置文件
- `mcp.config.json` - MCP 服务器配置
- `start-mcp-server.js` - MCP 服务器启动脚本
- `test-mcp-connection.js` - MCP 连接测试脚本

### 3. 环境变量 (.env.local)
```env
VITE_SUPABASE_URL=https://kogffetvzthxngohdmhl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_ACCESS_TOKEN=sbp_30ac10c9e656c2cca5759bc75d4af19bba6d42bb
VITE_SUPABASE_PROJECT_REF=kogffetvzthxngohdmhl
```

## 使用方法

### 1. 测试 MCP 连接
```bash
npm run mcp:test
```

### 2. 启动 MCP 服务器
```bash
npm run mcp:start
```

### 3. 在 Claude Code 中使用
MCP 服务器启动后，Claude Code 将能够：
- 直接查询 Supabase 数据库
- 执行 CRUD 操作
- 访问实时数据
- 管理用户认证

## MCP 服务器功能

### 数据库操作
- **查询数据**: 支持复杂的 SQL 查询
- **插入数据**: 创建新记录
- **更新数据**: 修改现有记录
- **删除数据**: 删除记录
- **关系查询**: 支持表关联查询

### 认证功能
- **用户注册**: 创建新用户账号
- **用户登录**: 验证用户身份
- **会话管理**: 管理用户会话状态
- **权限控制**: 基于 RLS 的权限管理

### 实时功能
- **实时订阅**: 监听数据变化
- **实时通知**: 推送数据更新
- **协作功能**: 多用户实时协作

## 配置详情

### MCP 服务器配置 (mcp.config.json)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["./node_modules/@supabase/mcp-server-postgrest/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://kogffetvzthxngohdmhl.supabase.co",
        "SUPABASE_ANON_KEY": "...",
        "SUPABASE_ACCESS_TOKEN": "...",
        "SUPABASE_PROJECT_REF": "kogffetvzthxngohdmhl"
      }
    }
  }
}
```

### 数据库架构
项目使用以下主要表：
- `users` - 用户信息
- `projects` - 项目数据
- `tasks` - 任务数据
- `tags` - 标签系统
- `task_tags` - 任务标签关联
- `project_members` - 项目成员
- `activity_logs` - 活动日志
- `comments` - 评论数据
- `attachments` - 附件数据

## 故障排除

### 常见问题

1. **MCP 服务器启动失败**
   - 检查环境变量是否正确配置
   - 确认 Supabase 项目状态正常
   - 验证网络连接

2. **数据库连接失败**
   - 运行 `npm run mcp:test` 进行诊断
   - 检查 Supabase 项目设置
   - 验证 API Key 权限

3. **认证错误**
   - 确认用户已正确登录
   - 检查 RLS 策略配置
   - 验证用户权限

### 调试命令

```bash
# 测试 MCP 连接
npm run mcp:test

# 启动 MCP 服务器（调试模式）
DEBUG=* npm run mcp:start

# 测试 Supabase 连接
node test-supabase.js

# 调试 Supabase 配置
node debug-supabase.js
```

## 集成效果

✅ **MCP 连接测试通过**
- 基础连接：成功
- 认证功能：正常
- 数据库操作：正常

现在 Claude Code 可以：
1. 直接访问 Supabase 数据库
2. 执行复杂的数据库查询
3. 管理用户认证状态
4. 实时监听数据变化
5. 执行项目和任务管理操作

## 下一步

- 启动 MCP 服务器：`npm run mcp:start`
- 在 Claude Code 中测试 MCP 功能
- 根据需要调整 MCP 配置
- 扩展自定义 MCP 功能