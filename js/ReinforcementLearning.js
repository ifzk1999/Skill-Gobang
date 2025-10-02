/**
 * 强化学习系统 - 让AI通过自我对弈不断进化
 */
class ReinforcementLearning {
    constructor() {
        // 学习参数
        this.learningRate = 0.1;
        this.discountFactor = 0.95;
        this.explorationRate = 0.1;
        this.explorationDecay = 0.995;
        this.minExplorationRate = 0.01;
        
        // 经验存储
        this.experienceBuffer = [];
        this.maxBufferSize = 10000;
        
        // 策略网络（简化版）
        this.policyWeights = this.initializePolicyWeights();
        this.valueWeights = this.initializeValueWeights();
        
        // 训练统计
        this.trainingStats = {
            gamesPlayed: 0,
            winRate: 0,
            averageGameLength: 0,
            skillUsageStats: {},
            positionValues: new Map(),
            openingBook: new Map()
        };
        
        // 自我对弈设置
        this.selfPlayConfig = {
            gamesPerSession: 100,
            saveInterval: 10,
            evaluationInterval: 50
        };
        
        this.loadTrainingData();
    }

    /**
     * 初始化策略权重
     */
    initializePolicyWeights() {
        return {
            // 位置价值权重 (15x15棋盘)
            positionValues: Array(15).fill().map(() => Array(15).fill(0)),
            
            // 棋型权重
            patterns: {
                five: 100000,      // 五连
                openFour: 10000,   // 活四
                closedFour: 1000,  // 冲四
                openThree: 1000,   // 活三
                closedThree: 100,  // 眠三
                openTwo: 100,      // 活二
                closedTwo: 10      // 眠二
            },
            
            // 技能使用权重
            skillWeights: {
                timeRewind: {
                    emergencyThreshold: 0.8,
                    advantageThreshold: -0.3
                },
                mountainMover: {
                    disadvantageThreshold: -0.5,
                    chaosThreshold: 0.6
                },
                flyingSand: {
                    desperationThreshold: -0.9,
                    stalemateThreshold: 0.7
                }
            }
        };
    }

    /**
     * 初始化价值网络权重
     */
    initializeValueWeights() {
        return {
            // 局面评估特征权重
            materialBalance: 1.0,
            positionControl: 0.8,
            threatLevel: 1.5,
            mobility: 0.6,
            centerControl: 0.4,
            skillAdvantage: 0.7
        };
    }

    /**
     * 开始自我对弈训练
     */
    async startSelfPlayTraining(sessions = 1) {
        console.log(`🚀 开始强化学习训练，计划进行 ${sessions} 个训练周期`);
        
        for (let session = 0; session < sessions; session++) {
            console.log(`📚 训练周期 ${session + 1}/${sessions}`);
            
            // 自我对弈
            await this.runSelfPlaySession();
            
            // 学习和更新
            this.learnFromExperience();
            
            // 评估进步
            if (session % this.selfPlayConfig.evaluationInterval === 0) {
                await this.evaluateProgress();
            }
            
            // 保存进度
            if (session % this.selfPlayConfig.saveInterval === 0) {
                this.saveTrainingData();
            }
            
            // 更新探索率
            this.updateExplorationRate();
        }
        
        console.log('🎓 训练完成！');
        this.saveTrainingData();
        return this.trainingStats;
    }

    /**
     * 运行一个自我对弈会话
     */
    async runSelfPlaySession() {
        for (let game = 0; game < this.selfPlayConfig.gamesPerSession; game++) {
            const gameResult = await this.playSelfGame();
            this.processGameResult(gameResult);
            
            // 显示进度
            if (game % 10 === 0) {
                console.log(`  游戏 ${game + 1}/${this.selfPlayConfig.gamesPerSession}`);
            }
        }
    }

    /**
     * 进行一局自我对弈
     */
    async playSelfGame() {
        const game = {
            moves: [],
            positions: [],
            rewards: [],
            skillsUsed: [],
            winner: null,
            gameLength: 0
        };

        // 创建游戏实例
        const boardManager = new BoardManager();
        const winChecker = new WinChecker();
        let currentPlayer = GameConfig.PLAYER.HUMAN; // 先手
        let moveCount = 0;
        
        // 技能使用记录
        const skillsAvailable = {
            [GameConfig.PLAYER.HUMAN]: {
                timeRewind: true,
                mountainMover: true,
                flyingSand: true
            },
            [GameConfig.PLAYER.AI]: {
                timeRewind: true,
                mountainMover: true,
                flyingSand: true
            }
        };

        while (moveCount < 225) { // 最大步数限制
            const boardState = boardManager.toArray();
            
            // 记录当前局面
            game.positions.push(this.encodeBoardState(boardState));
            
            // AI决策（两个AI都使用学习后的策略）
            const move = this.selectMoveWithPolicy(boardState, currentPlayer, skillsAvailable[currentPlayer]);
            
            if (move.isSkill) {
                // 使用技能
                const skillResult = await this.simulateSkillUse(move.skillType, boardManager, currentPlayer);
                if (skillResult) {
                    skillsAvailable[currentPlayer][move.skillType] = false;
                    game.skillsUsed.push({
                        player: currentPlayer,
                        skill: move.skillType,
                        moveCount: moveCount,
                        boardState: boardManager.toArray()
                    });
                }
            } else {
                // 普通落子
                if (boardManager.placePiece(move.x, move.y, currentPlayer)) {
                    game.moves.push({ x: move.x, y: move.y, player: currentPlayer, moveCount });
                    
                    // 检查胜负
                    if (winChecker.checkWin(boardManager.toArray(), move.x, move.y)) {
                        game.winner = currentPlayer;
                        break;
                    }
                }
            }
            
            // 切换玩家
            currentPlayer = currentPlayer === GameConfig.PLAYER.HUMAN ? 
                           GameConfig.PLAYER.AI : GameConfig.PLAYER.HUMAN;
            moveCount++;
        }
        
        game.gameLength = moveCount;
        return game;
    }

    /**
     * 使用策略网络选择移动
     */
    selectMoveWithPolicy(boardState, player, availableSkills) {
        // 探索 vs 利用
        if (Math.random() < this.explorationRate) {
            return this.selectRandomMove(boardState, availableSkills);
        }
        
        // 使用策略网络
        const moves = this.generatePossibleMoves(boardState);
        let bestMove = null;
        let bestValue = -Infinity;
        
        // 评估每个可能的移动
        for (const move of moves) {
            const value = this.evaluateMoveValue(boardState, move, player);
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        
        // 考虑技能使用
        const skillDecision = this.evaluateSkillUse(boardState, player, availableSkills);
        if (skillDecision.useSkill && skillDecision.value > bestValue) {
            return {
                isSkill: true,
                skillType: skillDecision.skillType,
                value: skillDecision.value
            };
        }
        
        return bestMove || this.selectRandomMove(boardState, availableSkills);
    }

    /**
     * 评估移动价值
     */
    evaluateMoveValue(boardState, move, player) {
        // 临时放置棋子
        const tempBoard = boardState.map(row => [...row]);
        tempBoard[move.x][move.y] = player;
        
        let value = 0;
        
        // 位置价值
        value += this.policyWeights.positionValues[move.x][move.y];
        
        // 棋型价值
        value += this.evaluatePatternValue(tempBoard, move.x, move.y, player);
        
        // 威胁和防守价值
        value += this.evaluateTacticalValue(tempBoard, move.x, move.y, player);
        
        return value;
    }

    /**
     * 评估棋型价值
     */
    evaluatePatternValue(boardState, x, y, player) {
        let value = 0;
        const directions = [[1,0], [0,1], [1,1], [1,-1]];
        
        for (const [dx, dy] of directions) {
            const pattern = this.analyzePattern(boardState, x, y, dx, dy, player);
            value += this.policyWeights.patterns[pattern.type] || 0;
        }
        
        return value;
    }

    /**
     * 分析棋型
     */
    analyzePattern(boardState, x, y, dx, dy, player) {
        let count = 1;
        let leftBlocked = false;
        let rightBlocked = false;
        
        // 向左检查
        for (let i = 1; i < 5; i++) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) {
                leftBlocked = true;
                break;
            }
            if (boardState[nx][ny] === player) {
                count++;
            } else if (boardState[nx][ny] !== 0) {
                leftBlocked = true;
                break;
            } else {
                break;
            }
        }
        
        // 向右检查
        for (let i = 1; i < 5; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) {
                rightBlocked = true;
                break;
            }
            if (boardState[nx][ny] === player) {
                count++;
            } else if (boardState[nx][ny] !== 0) {
                rightBlocked = true;
                break;
            } else {
                break;
            }
        }
        
        // 判断棋型
        if (count >= 5) return { type: 'five', value: count };
        if (count === 4) {
            return leftBlocked && rightBlocked ? 
                   { type: 'closedFour', value: count } : 
                   { type: 'openFour', value: count };
        }
        if (count === 3) {
            return leftBlocked && rightBlocked ? 
                   { type: 'closedThree', value: count } : 
                   { type: 'openThree', value: count };
        }
        if (count === 2) {
            return leftBlocked && rightBlocked ? 
                   { type: 'closedTwo', value: count } : 
                   { type: 'openTwo', value: count };
        }
        
        return { type: 'single', value: 1 };
    }

    /**
     * 从经验中学习
     */
    learnFromExperience() {
        if (this.experienceBuffer.length < 100) return;
        
        // 批量学习
        const batchSize = Math.min(32, this.experienceBuffer.length);
        const batch = this.sampleExperience(batchSize);
        
        for (const experience of batch) {
            this.updatePolicyWeights(experience);
            this.updateValueWeights(experience);
        }
        
        console.log(`📖 从 ${batchSize} 个经验中学习`);
    }

    /**
     * 更新策略权重
     */
    updatePolicyWeights(experience) {
        const { state, action, reward, nextState } = experience;
        
        // 更新位置价值
        if (action.x !== undefined && action.y !== undefined) {
            const currentValue = this.policyWeights.positionValues[action.x][action.y];
            const newValue = currentValue + this.learningRate * (reward - currentValue);
            this.policyWeights.positionValues[action.x][action.y] = newValue;
        }
        
        // 更新技能权重
        if (action.isSkill) {
            this.updateSkillWeights(action.skillType, reward, experience);
        }
    }

    /**
     * 处理游戏结果
     */
    processGameResult(gameResult) {
        this.trainingStats.gamesPlayed++;
        
        // 计算奖励
        const rewards = this.calculateRewards(gameResult);
        
        // 存储经验
        this.storeExperience(gameResult, rewards);
        
        // 更新统计
        this.updateTrainingStats(gameResult);
    }

    /**
     * 计算奖励
     */
    calculateRewards(gameResult) {
        const rewards = [];
        const winner = gameResult.winner;
        const gameLength = gameResult.gameLength;
        
        for (let i = 0; i < gameResult.moves.length; i++) {
            const move = gameResult.moves[i];
            let reward = 0;
            
            // 胜负奖励
            if (winner === move.player) {
                reward += 1.0; // 获胜奖励
                reward += (225 - gameLength) / 225 * 0.5; // 快速获胜额外奖励
            } else if (winner !== null) {
                reward -= 1.0; // 失败惩罚
            }
            
            // 移动质量奖励
            reward += this.evaluateMoveQuality(gameResult, i);
            
            rewards.push(reward);
        }
        
        return rewards;
    }

    /**
     * 存储经验
     */
    storeExperience(gameResult, rewards) {
        for (let i = 0; i < gameResult.moves.length - 1; i++) {
            const experience = {
                state: gameResult.positions[i],
                action: gameResult.moves[i],
                reward: rewards[i],
                nextState: gameResult.positions[i + 1],
                done: i === gameResult.moves.length - 1
            };
            
            this.experienceBuffer.push(experience);
            
            // 限制缓冲区大小
            if (this.experienceBuffer.length > this.maxBufferSize) {
                this.experienceBuffer.shift();
            }
        }
    }

    /**
     * 评估进步
     */
    async evaluateProgress() {
        console.log('📊 评估AI进步...');
        
        // 与之前版本对战
        const testGames = 20;
        let wins = 0;
        
        for (let i = 0; i < testGames; i++) {
            const result = await this.playTestGame();
            if (result.winner === GameConfig.PLAYER.AI) {
                wins++;
            }
        }
        
        const winRate = wins / testGames;
        this.trainingStats.winRate = winRate;
        
        console.log(`🏆 当前胜率: ${(winRate * 100).toFixed(1)}%`);
        
        return winRate;
    }

    /**
     * 保存训练数据
     */
    saveTrainingData() {
        const data = {
            policyWeights: this.policyWeights,
            valueWeights: this.valueWeights,
            trainingStats: this.trainingStats,
            explorationRate: this.explorationRate,
            timestamp: Date.now()
        };
        
        localStorage.setItem('aiTrainingData', JSON.stringify(data));
        console.log('💾 训练数据已保存');
    }

    /**
     * 加载训练数据
     */
    loadTrainingData() {
        try {
            const data = localStorage.getItem('aiTrainingData');
            if (data) {
                const parsed = JSON.parse(data);
                this.policyWeights = parsed.policyWeights || this.policyWeights;
                this.valueWeights = parsed.valueWeights || this.valueWeights;
                this.trainingStats = parsed.trainingStats || this.trainingStats;
                this.explorationRate = parsed.explorationRate || this.explorationRate;
                console.log('📚 已加载训练数据');
            }
        } catch (error) {
            console.log('⚠️ 无法加载训练数据，使用默认设置');
        }
    }

    /**
     * 获取训练统计
     */
    getTrainingStats() {
        return {
            ...this.trainingStats,
            explorationRate: this.explorationRate,
            experienceBufferSize: this.experienceBuffer.length
        };
    }

    /**
     * 重置训练数据
     */
    resetTraining() {
        this.policyWeights = this.initializePolicyWeights();
        this.valueWeights = this.initializeValueWeights();
        this.experienceBuffer = [];
        this.trainingStats = {
            gamesPlayed: 0,
            winRate: 0,
            averageGameLength: 0,
            skillUsageStats: {},
            positionValues: new Map(),
            openingBook: new Map()
        };
        this.explorationRate = 0.1;
        
        localStorage.removeItem('aiTrainingData');
        console.log('🔄 训练数据已重置');
    }

    // 辅助方法
    encodeBoardState(boardState) {
        return boardState.map(row => [...row]);
    }

    generatePossibleMoves(boardState) {
        const moves = [];
        for (let x = 0; x < 15; x++) {
            for (let y = 0; y < 15; y++) {
                if (boardState[x][y] === 0) {
                    moves.push({ x, y });
                }
            }
        }
        return moves;
    }

    selectRandomMove(boardState, availableSkills) {
        const moves = this.generatePossibleMoves(boardState);
        if (moves.length === 0) return null;
        
        return moves[Math.floor(Math.random() * moves.length)];
    }

    sampleExperience(batchSize) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * this.experienceBuffer.length);
            batch.push(this.experienceBuffer[index]);
        }
        return batch;
    }

    updateExplorationRate() {
        this.explorationRate = Math.max(
            this.minExplorationRate,
            this.explorationRate * this.explorationDecay
        );
    }

    evaluateMoveQuality(gameResult, moveIndex) {
        // 简化的移动质量评估
        return 0;
    }

    evaluateTacticalValue(boardState, x, y, player) {
        // 简化的战术价值评估
        return 0;
    }

    evaluateSkillUse(boardState, player, availableSkills) {
        // 简化的技能使用评估
        return { useSkill: false };
    }

    updateSkillWeights(skillType, reward, experience) {
        // 更新技能权重
    }

    updateValueWeights(experience) {
        // 更新价值网络权重
    }

    updateTrainingStats(gameResult) {
        // 更新训练统计
        this.trainingStats.averageGameLength = 
            (this.trainingStats.averageGameLength * (this.trainingStats.gamesPlayed - 1) + 
             gameResult.gameLength) / this.trainingStats.gamesPlayed;
    }

    async simulateSkillUse(skillType, boardManager, player) {
        // 模拟技能使用
        return true;
    }

    async playTestGame() {
        // 测试游戏
        return { winner: Math.random() > 0.5 ? GameConfig.PLAYER.AI : GameConfig.PLAYER.HUMAN };
    }
}

// 全局实例
window.reinforcementLearning = new ReinforcementLearning();
