# 🚀 生产环境部署指南

## 📋 部署前检查清单

### ✅ 已完成的安全修复
- [x] 移除前端服务角色密钥暴露
- [x] 实现真正的登录/登出功能
- [x] 添加单用户访问控制
- [x] 创建安全的环境变量配置

### ⏳ 需要执行的步骤

#### 1. 重新启用 RLS 策略 🔒
在 Supabase SQL Editor 中执行 `enable-secure-rls.sql`:

```sql
-- 为单用户应用重新启用安全的 RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- 创建针对您的用户ID的安全策略
CREATE POLICY "Allow authorized user" ON users
FOR ALL USING (id = 'd357f1a4-7023-40ba-9378-3c2c8f3b9309');

CREATE POLICY "Allow authorized user projects" ON projects
FOR ALL USING (user_id = 'd357f1a4-7023-40ba-9378-3c2c8f3b9309');

CREATE POLICY "Allow authorized user tasks" ON tasks
FOR ALL USING (user_id = 'd357f1a4-7023-40ba-9378-3c2c8f3b9309');
```

#### 2. 更新 Supabase 认证配置 🌐
在 Supabase 控制台 → Authentication → URL Configuration:
- **Site URL**: 设置为您的生产域名 (如 `https://your-domain.com`)
- **Redirect URLs**: 添加 `https://your-domain.com/**`

#### 3. 创建生产环境变量 📝
创建 `.env.production`:
```bash
VITE_SUPABASE_URL=https://kogffetvzthxngohdmhl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_DEV_MODE=false
```

#### 4. 构建和部署 🏗️
```bash
# 构建生产版本
npm run build

# 部署到您选择的平台 (Vercel, Netlify, etc.)
```

## 🔐 单用户认证系统特性

### 开发环境
- ✅ **开发模式启用** - 绕过认证，直接访问
- ✅ **快速开发** - 无需每次登录
- ✅ **完整功能** - 所有功能正常工作

### 生产环境
- ✅ **真实登录** - 必须使用您的邮箱和密码
- ✅ **访问控制** - 只有您的邮箱可以访问
- ✅ **安全隔离** - RLS 策略保护数据
- ✅ **会话管理** - 真正的登出功能

## 🎯 使用流程

### 开发环境 (localhost)
1. `npm run dev` - 自动以开发模式启动
2. 直接访问所有功能
3. 数据保存到 Supabase

### 生产环境 (云端)
1. 访问您的域名
2. 使用 `wangdong@51talk.com` 登录
3. 输入密码进入应用
4. 安全的单用户访问

## ⚠️ 注意事项

1. **密码安全**: 确保您的 Supabase 账户密码足够强
2. **邮箱验证**: 生产环境建议启用邮箱验证
3. **备份策略**: 定期备份 Supabase 数据
4. **域名安全**: 使用 HTTPS 和安全的域名配置

## 🚀 推荐部署平台

- **Vercel** - 零配置，自动 CI/CD
- **Netlify** - 简单部署，良好的静态站点支持
- **Cloudflare Pages** - 全球 CDN，快速访问

选择任一平台，连接您的 GitHub 仓库即可自动部署！