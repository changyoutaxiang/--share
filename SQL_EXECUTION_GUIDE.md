# 🛠️ Supabase SQL 执行指南

## 📋 当前状态
✅ Supabase 连接已验证  
✅ 迁移脚本已执行（通过管理 API）  
⏳ 需要验证表是否成功创建  

## 🎯 推荐方法：手动执行（最可靠）

### 1. 在 Supabase 控制台执行
1. 打开 [Supabase 控制台](https://supabase.com/dashboard/projects/kogffetvzthxngohdmhl)
2. 点击左侧菜单的 **SQL Editor**
3. 点击 **New query** 创建新查询
4. 复制 `supabase-migration.sql` 文件的全部内容
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行

### 2. 验证表创建
执行以下查询来验证表是否创建成功：

```sql
-- 查看所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 查看特定表结构
\d users
\d projects  
\d tasks
```

## 🔧 自动化方法（已尝试）

我已经创建了自动化脚本：
- ✅ `test-supabase.js` - 连接测试（成功）
- ✅ `run-migration.js` - 迁移执行（已运行）

## 🧪 测试数据库功能

### 在应用中测试：
1. 在浏览器中访问：http://localhost:5173
2. 按快捷键 `5` 切换到 "Supabase 测试" 页面
3. 点击 **测试连接** 按钮
4. 尝试注册一个测试用户
5. 测试创建项目和任务功能

### 测试用户注册：
- 邮箱：test@example.com
- 密码：Test123456!

## 🔍 故障排除

### 如果表不存在：
1. 确认在 Supabase 控制台手动执行了 SQL
2. 检查 SQL 执行是否有错误
3. 验证 RLS 策略是否正确配置

### 如果认证失败：
1. 确认邮箱格式正确
2. 检查密码强度（至少8位，包含大小写字母和数字）
3. 查看 Supabase 控制台的认证设置

### 如果权限错误：
1. 确认 RLS 策略已启用
2. 检查用户是否已登录
3. 验证数据所有权

## 📁 相关文件
- `supabase-migration.sql` - 完整迁移文件 ⭐
- `run-migration.js` - 自动化执行脚本
- `test-supabase.js` - 连接测试脚本
- `.env.local` - 环境变量配置

## 🎉 成功标志
当以下条件满足时，说明迁移成功：
- [ ] 在 Supabase 控制台能看到所有表
- [ ] 应用中能成功注册用户
- [ ] 能创建项目和任务
- [ ] 数据能正常保存和读取

---

💡 **建议**：如果自动化方法有问题，手动在 Supabase 控制台执行是最可靠的方式。