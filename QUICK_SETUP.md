# 🚀 Supabase 快速设置指南

## 当前状态
✅ 环境变量已配置  
✅ 应用已启动 (http://localhost:5173)  
⏳ 需要执行数据库迁移  

## 下一步操作

### 1. 执行数据库迁移

1. 打开 [Supabase 控制台](https://supabase.com/dashboard/projects)
2. 选择你的项目：`kogffetvzthxngohdmhl`
3. 在左侧菜单中点击 **SQL Editor**
4. 点击 **New query** 创建新查询
5. 复制 `supabase-migration.sql` 文件的全部内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 执行迁移

### 2. 启用认证功能

1. 在 Supabase 控制台中，点击左侧菜单的 **Authentication**
2. 点击 **Settings** 标签
3. 确保 **Enable email confirmations** 已启用
4. 在 **Site URL** 中添加：`http://localhost:5173`
5. 在 **Redirect URLs** 中添加：`http://localhost:5173/**`

### 3. 测试功能

1. 在应用中按快捷键 `5` 或点击导航切换到 "Supabase 测试" 页面
2. 点击 **测试连接** 按钮
3. 如果连接成功，尝试注册一个测试用户
4. 测试创建项目和任务功能

## 🔧 故障排除

### 如果连接失败：
- 检查环境变量是否正确配置
- 确认 Supabase 项目状态正常
- 查看浏览器控制台的错误信息

### 如果认证失败：
- 确认已执行数据库迁移
- 检查 Supabase 认证设置
- 验证邮箱格式和密码强度

## 📋 迁移 SQL 文件位置
- 完整版本：`supabase-schema.sql`
- 迁移版本：`supabase-migration.sql` ⭐ **推荐使用**

## 🎯 测试清单
- [ ] 数据库连接测试
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 创建项目功能
- [ ] 创建任务功能
- [ ] 数据同步验证

完成这些步骤后，你的项目就可以完全使用 Supabase 云端数据库了！