#!/bin/bash

# 技能五子棋项目Git初始化脚本
# 使用方法：chmod +x init-git.sh && ./init-git.sh

echo "🎮 技能五子棋项目Git初始化"
echo "================================"

# 检查是否已经是Git仓库
if [ -d ".git" ]; then
    echo "⚠️  检测到已存在Git仓库"
    read -p "是否要重新初始化？(y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "❌ 操作已取消"
        exit 1
    fi
    rm -rf .git
fi

# 初始化Git仓库
echo "📦 初始化Git仓库..."
git init

# 添加所有文件
echo "📁 添加项目文件..."
git add .

# 创建初始提交
echo "💾 创建初始提交..."
git commit -m "🎮 Initial commit: 技能五子棋项目

✨ 功能特色:
- 经典五子棋游戏玩法
- 三种特殊技能系统
- 智能AI对手（多难度）
- 星空蓝主题界面
- 完整的移动端支持
- PWA应用支持

🔮 技能系统:
- 飞沙走石：随机搅乱5颗棋子位置
- 力拔山兮：随机移除3颗棋子
- 时光倒流：回溯到上一回合

🎨 界面特色:
- 响应式设计，适配各种设备
- 流畅的动画效果
- 无障碍支持
- 可安装为PWA应用

🤖 AI特性:
- 多难度设置（简单/普通/困难）
- 智能决策系统
- 主动使用技能
- 防御优先策略"

echo ""
echo "✅ Git仓库初始化完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 在GitHub上创建新仓库"
echo "2. 复制仓库URL"
echo "3. 运行以下命令连接远程仓库："
echo ""
echo "   git remote add origin https://github.com/你的用户名/仓库名.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "🌐 部署到GitHub Pages："
echo "1. 进入GitHub仓库设置"
echo "2. 找到Pages部分"
echo "3. Source选择'Deploy from a branch'"
echo "4. Branch选择'main'"
echo "5. 点击Save"
echo ""
echo "🎉 完成后你的游戏将在以下地址可访问："
echo "   https://你的用户名.github.io/仓库名"
echo ""
echo "📖 更多详细信息请查看："
echo "   - README.md - 项目说明"
echo "   - deploy.md - 部署指南"
echo "   - SHARE.md - 分享指南"
