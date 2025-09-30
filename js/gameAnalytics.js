/**
 * 游戏分析和统计系统
 */
class GameAnalytics {
    constructor() {
        this.gameStats = this.loadStats();
        this.currentGameData = null;
        this.initializeTracking();
    }

    /**
     * 初始化统计数据结构
     */
    getDefaultStats() {
        return {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            totalMoves: 0,
            averageGameTime: 0,
            skillsUsed: {
                flyingSand: 0,
                mountainMover: 0,
                timeRewind: 0
            },
            winStreak: 0,
            maxWinStreak: 0,
            gameHistory: [],
            achievements: [],
            firstPlayDate: null,
            lastPlayDate: null
        };
    }

    /**
     * 加载统计数据
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('gomoku_analytics');
            return saved ? { ...this.getDefaultStats(), ...JSON.parse(saved) } : this.getDefaultStats();
        } catch (error) {
            console.warn('加载统计数据失败:', error);
            return this.getDefaultStats();
        }
    }

    /**
     * 保存统计数据
     */
    saveStats() {
        try {
            localStorage.setItem('gomoku_analytics', JSON.stringify(this.gameStats));
        } catch (error) {
            console.error('保存统计数据失败:', error);
        }
    }

    /**
     * 初始化跟踪
     */
    initializeTracking() {
        // 设置首次游戏时间
        if (!this.gameStats.firstPlayDate) {
            this.gameStats.firstPlayDate = new Date().toISOString();
        }
        this.gameStats.lastPlayDate = new Date().toISOString();
        this.saveStats();
    }

    /**
     * 开始新游戏跟踪
     */
    startGameTracking() {
        this.currentGameData = {
            startTime: Date.now(),
            moves: 0,
            skillsUsed: [],
            playerMoves: [],
            aiMoves: []
        };
    }

    /**
     * 记录移动
     */
    recordMove(x, y, player, moveCount) {
        if (!this.currentGameData) return;

        const move = { x, y, player, timestamp: Date.now(), moveNumber: moveCount };
        
        if (player === GameConfig.PLAYER.HUMAN) {
            this.currentGameData.playerMoves.push(move);
        } else {
            this.currentGameData.aiMoves.push(move);
        }
        
        this.currentGameData.moves++;
    }

    /**
     * 记录技能使用
     */
    recordSkillUse(skillType, player) {
        if (!this.currentGameData) return;

        this.currentGameData.skillsUsed.push({
            skill: skillType,
            player: player,
            timestamp: Date.now(),
            moveNumber: this.currentGameData.moves
        });

        // 更新总体统计
        if (player === GameConfig.PLAYER.HUMAN) {
            this.gameStats.skillsUsed[skillType]++;
        }
    }

    /**
     * 结束游戏跟踪
     */
    endGameTracking(winner) {
        if (!this.currentGameData) return;

        const gameTime = Date.now() - this.currentGameData.startTime;
        const gameResult = {
            ...this.currentGameData,
            endTime: Date.now(),
            duration: gameTime,
            winner: winner,
            result: this.getGameResult(winner),
            date: new Date().toISOString()
        };

        // 更新统计
        this.updateGameStats(gameResult);
        
        // 保存游戏历史
        this.gameStats.gameHistory.push(gameResult);
        
        // 限制历史记录数量
        if (this.gameStats.gameHistory.length > 100) {
            this.gameStats.gameHistory.shift();
        }

        // 检查成就
        this.checkAchievements(gameResult);

        this.saveStats();
        this.currentGameData = null;
    }

    /**
     * 获取游戏结果
     */
    getGameResult(winner) {
        if (winner === 'draw') return 'draw';
        return winner === GameConfig.PLAYER.HUMAN ? 'win' : 'loss';
    }

    /**
     * 更新游戏统计
     */
    updateGameStats(gameResult) {
        this.gameStats.totalGames++;
        this.gameStats.totalMoves += gameResult.moves;

        switch (gameResult.result) {
            case 'win':
                this.gameStats.wins++;
                this.gameStats.winStreak++;
                this.gameStats.maxWinStreak = Math.max(this.gameStats.maxWinStreak, this.gameStats.winStreak);
                break;
            case 'loss':
                this.gameStats.losses++;
                this.gameStats.winStreak = 0;
                break;
            case 'draw':
                this.gameStats.draws++;
                this.gameStats.winStreak = 0;
                break;
        }

        // 更新平均游戏时间
        const totalTime = this.gameStats.averageGameTime * (this.gameStats.totalGames - 1) + gameResult.duration;
        this.gameStats.averageGameTime = totalTime / this.gameStats.totalGames;
    }

    /**
     * 检查成就
     */
    checkAchievements(gameResult) {
        const achievements = [];

        // 首胜成就
        if (this.gameStats.wins === 1) {
            achievements.push({ id: 'first_win', name: '首次胜利', description: '赢得第一场游戏' });
        }

        // 连胜成就
        if (this.gameStats.winStreak === 3) {
            achievements.push({ id: 'win_streak_3', name: '三连胜', description: '连续赢得3场游戏' });
        }
        if (this.gameStats.winStreak === 5) {
            achievements.push({ id: 'win_streak_5', name: '五连胜', description: '连续赢得5场游戏' });
        }

        // 技能大师成就
        const totalSkillsUsed = Object.values(this.gameStats.skillsUsed).reduce((a, b) => a + b, 0);
        if (totalSkillsUsed === 10) {
            achievements.push({ id: 'skill_master', name: '技能大师', description: '累计使用10次技能' });
        }

        // 快速胜利成就
        if (gameResult.result === 'win' && gameResult.duration < 60000) {
            achievements.push({ id: 'quick_win', name: '闪电战', description: '1分钟内获胜' });
        }

        // 添加新成就
        achievements.forEach(achievement => {
            if (!this.gameStats.achievements.find(a => a.id === achievement.id)) {
                achievement.timestamp = new Date().toISOString();
                this.gameStats.achievements.push(achievement);
                this.showAchievement(achievement);
            }
        });
    }

    /**
     * 显示成就通知
     */
    showAchievement(achievement) {
        if (window.Utils && Utils.showSuccess) {
            Utils.showSuccess(`🏆 解锁成就: ${achievement.name}`, 5000);
        }
    }

    /**
     * 获取统计报告
     */
    getStatsReport() {
        const winRate = this.gameStats.totalGames > 0 
            ? (this.gameStats.wins / this.gameStats.totalGames * 100).toFixed(1)
            : 0;

        const avgMovesPerGame = this.gameStats.totalGames > 0
            ? Math.round(this.gameStats.totalMoves / this.gameStats.totalGames)
            : 0;

        const avgGameTimeMinutes = Math.round(this.gameStats.averageGameTime / 60000);

        return {
            总游戏数: this.gameStats.totalGames,
            胜率: `${winRate}%`,
            胜场: this.gameStats.wins,
            负场: this.gameStats.losses,
            平局: this.gameStats.draws,
            当前连胜: this.gameStats.winStreak,
            最高连胜: this.gameStats.maxWinStreak,
            平均每局步数: avgMovesPerGame,
            平均游戏时长: `${avgGameTimeMinutes}分钟`,
            技能使用统计: this.gameStats.skillsUsed,
            解锁成就数: this.gameStats.achievements.length,
            首次游戏: this.gameStats.firstPlayDate ? new Date(this.gameStats.firstPlayDate).toLocaleDateString() : '未知'
        };
    }

    /**
     * 显示统计界面
     */
    showStatsModal() {
        const report = this.getStatsReport();
        const achievements = this.gameStats.achievements;

        const modalHTML = `
            <div id="stats-modal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <h2>📊 游戏统计</h2>
                    <div class="stats-content">
                        <div class="stats-section">
                            <h3>基础统计</h3>
                            <div class="stats-grid">
                                ${Object.entries(report).map(([key, value]) => 
                                    `<div class="stat-item">
                                        <span class="stat-label">${key}:</span>
                                        <span class="stat-value">${value}</span>
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="stats-section">
                            <h3>🏆 成就 (${achievements.length})</h3>
                            <div class="achievements-list">
                                ${achievements.length > 0 ? achievements.map(achievement => 
                                    `<div class="achievement-item">
                                        <strong>${achievement.name}</strong>
                                        <p>${achievement.description}</p>
                                        <small>解锁时间: ${new Date(achievement.timestamp).toLocaleString()}</small>
                                    </div>`
                                ).join('') : '<p>暂无解锁成就</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="export-stats-btn" class="btn btn-secondary">导出数据</button>
                        <button id="reset-stats-btn" class="btn btn-secondary">重置统计</button>
                        <button id="close-stats-btn" class="btn btn-primary">关闭</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindStatsEvents();
    }

    /**
     * 绑定统计界面事件
     */
    bindStatsEvents() {
        const modal = document.getElementById('stats-modal');

        document.getElementById('export-stats-btn').onclick = () => {
            this.exportStats();
        };

        document.getElementById('reset-stats-btn').onclick = () => {
            if (confirm('确定要重置所有统计数据吗？此操作不可恢复！')) {
                this.resetStats();
                modal.remove();
            }
        };

        document.getElementById('close-stats-btn').onclick = () => {
            modal.remove();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    /**
     * 导出统计数据
     */
    exportStats() {
        const data = {
            stats: this.gameStats,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gomoku-stats-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        Utils.showSuccess('统计数据已导出！');
    }

    /**
     * 重置统计数据
     */
    resetStats() {
        this.gameStats = this.getDefaultStats();
        this.gameStats.firstPlayDate = new Date().toISOString();
        this.saveStats();
        Utils.showSuccess('统计数据已重置！');
    }
}

// 创建全局分析实例
window.gameAnalytics = new GameAnalytics();
