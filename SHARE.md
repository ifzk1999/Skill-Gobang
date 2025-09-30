# 📤 分享指南

如何将技能五子棋分享给其他用户使用。

## 🚀 快速分享方式

### 1. GitHub Pages（推荐）
**最简单的免费部署方式**

1. **创建GitHub账户**（如果没有）
   - 访问 [github.com](https://github.com)
   - 点击"Sign up"注册

2. **创建新仓库**
   - 点击右上角"+"，选择"New repository"
   - 仓库名：`gomoku-skills`（或任何你喜欢的名字）
   - 设置为Public（公开）
   - 勾选"Add a README file"

3. **上传项目文件**
   - 点击"uploading an existing file"
   - 将所有项目文件拖拽上传
   - 提交更改

4. **启用GitHub Pages**
   - 进入仓库的Settings页面
   - 滚动到Pages部分
   - Source选择"Deploy from a branch"
   - Branch选择"main"
   - 点击Save

5. **获取分享链接**
   - 等待1-2分钟部署完成
   - 访问：`https://你的用户名.github.io/仓库名`
   - 这就是你的分享链接！

### 2. Netlify（拖拽部署）
**最快的部署方式**

1. 访问 [netlify.com](https://netlify.com)
2. 注册账户
3. 将整个项目文件夹拖拽到部署区域
4. 等待部署完成，获得分享链接

## 📱 移动端分享

### 微信分享
1. 将链接发送给朋友
2. 朋友可以直接在微信内置浏览器中游戏
3. 支持添加到手机桌面（PWA功能）

### QQ分享
1. 复制游戏链接
2. 在QQ中分享链接
3. 朋友点击即可游戏

### 生成二维码
使用在线二维码生成器：
- 草料二维码：[cli.im](https://cli.im)
- 联图二维码：[www.liantu.com](https://www.liantu.com)

输入你的游戏链接，生成二维码供他人扫描。

## 🎯 分享文案模板

### 朋友圈文案
```
🎮 发现了一个超有趣的五子棋游戏！
✨ 不是普通的五子棋，有三种特殊技能：
🌪️ 飞沙走石 - 打乱棋局
⚡ 力拔山兮 - 移除棋子  
⏰ 时光倒流 - 悔棋神器

🤖 AI对手很聪明，还有星空主题超好看！
📱 手机电脑都能玩，快来挑战吧！

👉 [你的游戏链接]
```

### 群聊分享
```
分享个好玩的五子棋游戏 🎮
有技能系统的创新玩法，AI很聪明
界面也很漂亮，支持手机和电脑
链接：[你的游戏链接]
```

## 🌐 社交媒体分享

### 微博分享
```
#五子棋游戏# #在线游戏# 
发现了个有趣的技能五子棋！🎮
不同于传统五子棋，加入了技能系统
AI对手智商在线，界面设计很棒
支持手机和电脑，免费在线玩
👉 [链接]
```

### 知乎/贴吧分享
可以写一篇详细的游戏介绍文章，包括：
- 游戏特色功能
- 技能系统介绍
- 游戏截图
- 体验感受
- 分享链接

## 📊 分享效果追踪

### 添加统计代码
在`index.html`中添加Google Analytics：
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 短链接生成
使用短链接服务让分享更方便：
- 新浪短链接：[t.cn](https://t.cn)
- 百度短链接：[dwz.cn](https://dwz.cn)

## 🎨 自定义分享

### 修改游戏信息
编辑`index.html`中的meta标签：
```html
<meta property="og:title" content="你的游戏标题">
<meta property="og:description" content="你的游戏描述">
<meta property="og:image" content="你的预览图片链接">
```

### 添加自己的联系方式
在`README.md`中添加：
- 你的GitHub主页
- 邮箱地址
- 其他联系方式

## 🔧 高级分享选项

### 自定义域名
- GitHub Pages：在仓库设置中添加自定义域名
- Netlify：在域名设置中绑定自己的域名

### CDN加速
- 使用jsDelivr加速GitHub仓库
- 格式：`https://cdn.jsdelivr.net/gh/用户名/仓库名@分支/文件路径`

### 国内访问优化
- 使用Gitee Pages（码云）
- 或使用国内CDN服务

## 📝 分享检查清单

分享前请确认：
- ✅ 游戏在不同设备上正常运行
- ✅ 所有功能都能正常使用
- ✅ 移动端适配良好
- ✅ 加载速度合理
- ✅ 没有明显的bug
- ✅ 分享链接可以正常访问

## 🎉 分享成功后

### 收集反馈
- 询问朋友的游戏体验
- 收集改进建议
- 记录常见问题

### 持续改进
- 根据反馈优化游戏
- 添加新功能
- 修复发现的问题

### 社区建设
- 创建QQ群或微信群
- 组织线上比赛
- 分享游戏技巧

---

开始分享你的技能五子棋，让更多人体验这个有趣的游戏吧！🎮✨
