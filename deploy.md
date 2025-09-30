# 🚀 部署指南

本文档详细介绍如何将技能五子棋项目部署到各种平台，让其他用户可以在线访问。

## 📋 部署前准备

### 1. 项目检查
确保以下文件存在且正常：
- ✅ `index.html` - 主页面
- ✅ `styles.css` - 样式文件
- ✅ `js/` 目录及所有JavaScript文件
- ✅ `README.md` - 项目说明

### 2. 本地测试
在部署前，请先本地测试：
```bash
# 方法1：直接打开文件
open index.html

# 方法2：使用Python服务器
python -m http.server 8000
# 访问 http://localhost:8000

# 方法3：使用Node.js服务器
npx http-server
```

## 🌐 GitHub Pages部署（推荐）

### 步骤1：创建GitHub仓库
1. 登录GitHub，点击"New repository"
2. 仓库名建议：`gomoku-skills` 或 `五子棋技能版`
3. 设置为Public（免费用户必须）
4. 勾选"Add a README file"

### 步骤2：上传代码
```bash
# 初始化Git仓库
git init
git add .
git commit -m "Initial commit: 技能五子棋项目"

# 连接远程仓库
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 步骤3：启用GitHub Pages
1. 进入仓库设置页面
2. 滚动到"Pages"部分
3. Source选择"Deploy from a branch"
4. Branch选择"main"，文件夹选择"/ (root)"
5. 点击"Save"

### 步骤4：访问网站
- 等待1-2分钟部署完成
- 访问：`https://你的用户名.github.io/仓库名`

## 🚀 Netlify部署

### 方法1：拖拽部署
1. 访问 [Netlify](https://netlify.com)
2. 注册/登录账户
3. 将整个项目文件夹拖拽到部署区域
4. 等待部署完成，获得随机域名

### 方法2：Git连接部署
1. 将代码推送到GitHub
2. 在Netlify中点击"New site from Git"
3. 选择GitHub，授权并选择仓库
4. 构建设置：
   - Build command: 留空
   - Publish directory: 留空（根目录）
5. 点击"Deploy site"

### 自定义域名
- 在Site settings中可以设置自定义域名
- 免费版提供 `.netlify.app` 子域名

## ⚡ Vercel部署

### 安装Vercel CLI
```bash
npm i -g vercel
```

### 部署步骤
```bash
# 在项目目录运行
vercel

# 首次使用需要登录
# 按提示选择设置：
# - Set up and deploy? Yes
# - Which scope? 选择你的账户
# - Link to existing project? No
# - Project name? 输入项目名
# - In which directory? ./ (当前目录)
# - Override settings? No
```

### 后续更新
```bash
# 每次更新后重新部署
vercel --prod
```

## 🔧 其他部署选项

### Firebase Hosting
```bash
# 安装Firebase CLI
npm install -g firebase-tools

# 登录Firebase
firebase login

# 初始化项目
firebase init hosting

# 部署
firebase deploy
```

### Surge.sh
```bash
# 安装Surge
npm install -g surge

# 部署（在项目目录运行）
surge
```

## 📱 移动端优化

### PWA配置
创建 `manifest.json`：
```json
{
  "name": "技能五子棋",
  "short_name": "五子棋",
  "description": "具有特殊技能的创新五子棋游戏",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#1e3c72",
  "theme_color": "#1e3c72",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

在 `index.html` 中添加：
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#1e3c72">
```

## 🔒 安全考虑

### API密钥保护
如果使用了AI API：
1. 不要将真实API密钥提交到公共仓库
2. 使用环境变量或服务器端代理
3. 考虑实现API调用限制

### HTTPS强制
大多数现代部署平台默认提供HTTPS，确保：
- 所有资源使用HTTPS加载
- 避免混合内容警告

## 📊 性能优化

### 文件压缩
```bash
# 压缩JavaScript（可选）
npx terser js/*.js --compress --mangle -o js/bundle.min.js

# 压缩CSS（可选）
npx clean-css-cli styles.css -o styles.min.css
```

### 缓存策略
在部署平台设置适当的缓存头：
- HTML文件：短期缓存
- CSS/JS文件：长期缓存（使用版本号）

## 🌍 国际化部署

### 中国大陆用户
- 考虑使用Gitee Pages（码云）
- 或使用国内CDN加速

### 全球用户
- GitHub Pages和Netlify在全球都有良好表现
- Vercel提供全球CDN

## 📈 监控和分析

### 添加Google Analytics
```html
<!-- 在index.html的<head>中添加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🎯 分享策略

### 社交媒体分享
在 `index.html` 添加Open Graph标签：
```html
<meta property="og:title" content="技能五子棋 - 创新的在线五子棋游戏">
<meta property="og:description" content="具有特殊技能系统的五子棋游戏，支持AI对战">
<meta property="og:image" content="https://your-domain.com/preview.png">
<meta property="og:url" content="https://your-domain.com">
```

### 二维码生成
为移动端分享生成二维码：
- 使用在线工具生成网站二维码
- 添加到README或宣传材料中

## 🔧 故障排除

### 常见问题
1. **页面空白**：检查JavaScript控制台错误
2. **样式丢失**：确认CSS文件路径正确
3. **功能异常**：检查所有JS文件是否正确加载

### 调试工具
- 浏览器开发者工具
- 在线HTML/CSS/JS验证器
- 移动端调试：Chrome DevTools设备模拟

---

选择最适合你的部署方式，开始分享你的技能五子棋项目吧！🎮
