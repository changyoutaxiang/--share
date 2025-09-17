# 部署说明

## 🚀 GitHub Pages 自动部署

### 配置步骤

1. **设置GitHub仓库Secrets**

   进入仓库 Settings → Secrets and variables → Actions，添加以下环境变量：

   ```
   VITE_SUPABASE_URL=你的supabase项目URL
   VITE_SUPABASE_ANON_KEY=你的supabase匿名密钥
   ```

2. **启用GitHub Pages**

   进入仓库 Settings → Pages：
   - Source: GitHub Actions
   - 保存设置

3. **自动部署**

   每次推送到main分支时，GitHub Actions会自动：
   - 安装依赖
   - 构建项目
   - 部署到GitHub Pages

### 部署地址

部署完成后，应用将可通过以下地址访问：
```
https://changyoutaxiang.github.io/--share/
```

### 手动部署

如需手动部署，可以运行：

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 🔧 生产环境配置

### 环境变量

确保在生产环境配置了正确的环境变量：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 数据库设置

1. **执行数据库迁移**（参考项目中的SQL文件）
2. **配置RLS策略**
3. **创建必要的表结构**

### 认证配置

在 `src/lib/config.ts` 中：
- 设置 `ENABLE_AUTH: true`
- 配置授权用户邮箱
- 调整其他生产环境参数

## 📱 功能验证

部署后请验证以下功能：

### 基础功能
- [ ] 用户登录/登出
- [ ] 项目管理（看板、列表、分析）
- [ ] 笔记管理（创建、编辑、搜索）
- [ ] AI对话（如已配置OpenRouter）

### 界面功能
- [ ] 主题切换（亮色/暗色）
- [ ] 侧边栏折叠
- [ ] 响应式布局
- [ ] 快捷键功能

### 导出功能
- [ ] 导出当日笔记
- [ ] 导出本周笔记
- [ ] Markdown格式验证

## 🔍 故障排除

### 常见问题

1. **白屏或加载失败**
   - 检查环境变量是否正确配置
   - 查看浏览器控制台错误信息

2. **数据库连接失败**
   - 验证Supabase URL和密钥
   - 检查网络连接和CORS设置

3. **GitHub Pages 404**
   - 确保vite.config.ts中的base路径正确
   - 检查GitHub Pages设置

### 调试方法

1. **本地调试**
   ```bash
   npm run dev
   ```

2. **生产构建测试**
   ```bash
   npm run build
   npm run preview
   ```

3. **查看构建日志**
   - GitHub Actions → 最新workflow → 查看详细日志

## 📞 技术支持

如有部署问题，请检查：
1. GitHub Actions 执行日志
2. 浏览器开发者工具控制台
3. 网络连接和API访问权限

---

**智能工作助手** - 现已成功部署到云端！🎉