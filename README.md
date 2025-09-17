# 智能工作助手

一个基于 React + TypeScript + Supabase 的现代化个人工作管理平台，集成项目管理、智能笔记和AI对话功能。

## ✨ 核心功能

### 📊 项目管理
- **看板视图** - 可视化任务管理，拖拽式操作
- **列表视图** - 详细任务列表，支持筛选排序
- **数据分析** - 项目进度统计和效率分析
- **多项目支持** - 项目切换和独立管理

### 📝 智能笔记
- **分类管理** - 工作、学习、个人、想法等分类
- **标签系统** - 灵活的标签组织和搜索
- **时间筛选** - 按日期范围查看笔记
- **收藏功能** - 重要笔记快速标记
- **导出功能** - 支持导出当日/本周笔记为Markdown

### 🤖 AI对话
- **多模型支持** - Gemini、Claude、GPT等主流模型
- **提示词模板** - 预设和自定义模板系统
- **流式响应** - 实时显示AI回复过程
- **对话管理** - 历史对话保存和管理

## 🎨 界面特色

- **现代化设计** - 简洁美观的用户界面
- **暗色主题** - 支持亮色/暗色主题切换
- **响应式布局** - 完美适配桌面和移动端
- **可折叠侧边栏** - 沉浸式工作体验
- **快捷键支持** - 键盘快捷操作

## 🚀 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS + Lucide Icons
- **后端**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: OpenRouter API (多模型支持)
- **部署**: GitHub Pages / Vercel

## 📦 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Supabase 账户

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/changyoutaxiang/--share.git
cd --share
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
# 复制环境变量模板
cp .env.production.example .env.local

# 编辑 .env.local，配置你的 Supabase 信息
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **数据库设置**
- 在 Supabase Dashboard 中执行数据库迁移
- 参考 `SUPABASE_SETUP.md` 详细配置说明

5. **启动开发服务器**
```bash
npm run dev
```

## 🔧 配置说明

### 认证模式
- **生产模式**: 需要邮箱认证登录
- **开发模式**: 可配置为免登录模式

### AI功能配置
- 需要 OpenRouter API Key
- 支持配置默认模型和参数
- 可自定义提示词模板

## 📱 功能说明

### 快捷键
- `1-3`: 项目管理功能切换
- `4`: 我的笔记
- `5`: AI对话
- `6`: 设置
- `?`: 显示快捷键帮助

### 导出功能
- **导出当日**: 将今天的笔记导出为Markdown
- **导出本周**: 将本周的笔记导出为Markdown
- 可配合外部AI工具生成日报周报

## 🌟 特色亮点

- **数据安全** - 基于Supabase的企业级数据安全
- **实时同步** - 多设备数据实时同步
- **智能分析** - AI驱动的内容理解和建议
- **高度可定制** - 灵活的配置和扩展能力

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过 GitHub Issues 联系。

---

**智能工作助手** - 让工作更高效，让生活更有序 🚀