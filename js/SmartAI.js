/**
 * 智能AI策略系统 - 提供更强的五子棋AI逻辑
 */
class SmartAI {
    constructor() {
        this.DIRECTIONS = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 主对角线
            [1, -1]   // 副对角线
        ];
        
        // 难度设置
        this.difficulty = 'normal'; // easy, normal, hard
        
        // 基础评分权重
        this.BASE_SCORES = {
            WIN: 100000,        // 获胜
            BLOCK_WIN: 50000,   // 阻止对手获胜
            FOUR: 10000,        // 四连
            BLOCK_FOUR: 8000,   // 阻止对手四连
            THREE: 1000,        // 三连
            BLOCK_THREE: 800,   // 阻止对手三连
            TWO: 100,           // 二连
            BLOCK_TWO: 80,      // 阻止对手二连
            ONE: 10,            // 单子
            CENTER: 5           // 中心位置加分
        };
        
        this.updateScoresForDifficulty();
    }

    /**
     * 设置AI难度
     * @param {string} difficulty - 难度等级 (easy, normal, hard)
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.updateScoresForDifficulty();
    }

    /**
     * 根据难度更新评分权重
     */
    updateScoresForDifficulty() {
        const multipliers = {
            easy: {
                defense: 0.3,    // 防守能力降低
                attack: 0.8,     // 攻击能力稍降低
                mistake: 0.2     // 20%概率犯错
            },
            normal: {
                defense: 0.9,    // 正常防守
                attack: 1.0,     // 正常攻击
                mistake: 0.05    // 5%概率犯错
            },
            hard: {
                defense: 1.2,    // 加强防守
                attack: 1.1,     // 加强攻击
                mistake: 0       // 不犯错
            }
        };

        const mult = multipliers[this.difficulty] || multipliers.normal;
        
        this.SCORES = {
            WIN: this.BASE_SCORES.WIN,
            BLOCK_WIN: Math.floor(this.BASE_SCORES.BLOCK_WIN * mult.defense),
            FOUR: Math.floor(this.BASE_SCORES.FOUR * mult.attack),
            BLOCK_FOUR: Math.floor(this.BASE_SCORES.BLOCK_FOUR * mult.defense),
            THREE: Math.floor(this.BASE_SCORES.THREE * mult.attack),
            BLOCK_THREE: Math.floor(this.BASE_SCORES.BLOCK_THREE * mult.defense),
            TWO: Math.floor(this.BASE_SCORES.TWO * mult.attack),
            BLOCK_TWO: Math.floor(this.BASE_SCORES.BLOCK_TWO * mult.defense),
            ONE: this.BASE_SCORES.ONE,
            CENTER: this.BASE_SCORES.CENTER
        };

        this.mistakeChance = mult.mistake;
    }

    /**
     * 获取最佳落子位置
     * @param {Array} boardState - 棋盘状态
     * @param {number} aiPlayer - AI玩家标识
     * @param {number} humanPlayer - 人类玩家标识
     * @returns {Object} 最佳落子位置和评分
     */
    getBestMove(boardState, aiPlayer = 2, humanPlayer = 1) {
        const emptyPositions = this.getEmptyPositions(boardState);
        
        if (emptyPositions.length === 0) {
            return null;
        }

        // 如果是开局，选择中心附近
        if (emptyPositions.length >= 220) { // 棋盘基本为空
            return this.getOpeningMove(boardState);
        }

        let bestMove = null;
        let bestScore = -Infinity;

        // 评估每个可能的位置
        const moves = [];
        for (const pos of emptyPositions) {
            const score = this.evaluatePosition(boardState, pos.x, pos.y, aiPlayer, humanPlayer);
            moves.push({
                x: pos.x,
                y: pos.y,
                score: score,
                reasoning: this.getReasoningForScore(score)
            });
        }

        // 按分数排序
        moves.sort((a, b) => b.score - a.score);
        
        // 根据难度决定是否犯错
        if (this.mistakeChance > 0 && Math.random() < this.mistakeChance) {
            // 简单难度时可能选择次优解
            const topMoves = moves.slice(0, Math.min(5, moves.length));
            const randomIndex = Math.floor(Math.random() * topMoves.length);
            bestMove = topMoves[randomIndex];
            bestMove.reasoning += ' (随机选择)';
        } else {
            bestMove = moves[0];
        }

        return bestMove;
    }

    /**
     * 评估指定位置的分数
     * @param {Array} boardState - 棋盘状态
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} aiPlayer - AI玩家
     * @param {number} humanPlayer - 人类玩家
     * @returns {number} 位置评分
     */
    evaluatePosition(boardState, x, y, aiPlayer, humanPlayer) {
        let score = 0;

        // 临时放置AI棋子
        boardState[x][y] = aiPlayer;
        
        // 检查AI的攻击机会
        const aiAttackScore = this.getAttackScore(boardState, x, y, aiPlayer);
        score += aiAttackScore;

        // 恢复原状态
        boardState[x][y] = 0;

        // 临时放置人类棋子，检查防守价值
        boardState[x][y] = humanPlayer;
        const humanAttackScore = this.getAttackScore(boardState, x, y, humanPlayer);
        const defenseScore = humanAttackScore * 0.9; // 防守稍微低于攻击
        score += defenseScore;

        // 恢复原状态
        boardState[x][y] = 0;

        // 位置价值加分（中心位置更有价值）
        const centerBonus = this.getCenterBonus(x, y);
        score += centerBonus;

        return score;
    }

    /**
     * 获取攻击分数
     * @param {Array} boardState - 棋盘状态
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} player - 玩家标识
     * @returns {number} 攻击分数
     */
    getAttackScore(boardState, x, y, player) {
        let totalScore = 0;

        for (const [dx, dy] of this.DIRECTIONS) {
            const lineInfo = this.analyzeLine(boardState, x, y, dx, dy, player);
            totalScore += this.getLineScore(lineInfo, player);
        }

        return totalScore;
    }

    /**
     * 分析一条线上的棋子情况
     * @param {Array} boardState - 棋盘状态
     * @param {number} x - 中心x坐标
     * @param {number} y - 中心y坐标
     * @param {number} dx - x方向增量
     * @param {number} dy - y方向增量
     * @param {number} player - 玩家标识
     * @returns {Object} 线分析结果
     */
    analyzeLine(boardState, x, y, dx, dy, player) {
        let count = 1; // 包含当前位置
        let blocked = 0; // 被阻挡的端点数
        let spaces = 0; // 空位数

        // 向正方向分析
        let posCount = 0;
        let posBlocked = false;
        let posSpaces = 0;
        
        for (let i = 1; i < 5; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            
            if (!this.isValidPosition(nx, ny, boardState.length)) {
                posBlocked = true;
                break;
            }
            
            if (boardState[nx][ny] === player) {
                posCount++;
            } else if (boardState[nx][ny] === 0) {
                posSpaces++;
                break; // 遇到空位停止
            } else {
                posBlocked = true;
                break; // 遇到对手棋子停止
            }
        }

        // 向负方向分析
        let negCount = 0;
        let negBlocked = false;
        let negSpaces = 0;
        
        for (let i = 1; i < 5; i++) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            
            if (!this.isValidPosition(nx, ny, boardState.length)) {
                negBlocked = true;
                break;
            }
            
            if (boardState[nx][ny] === player) {
                negCount++;
            } else if (boardState[nx][ny] === 0) {
                negSpaces++;
                break;
            } else {
                negBlocked = true;
                break;
            }
        }

        count += posCount + negCount;
        blocked = (posBlocked ? 1 : 0) + (negBlocked ? 1 : 0);
        spaces = posSpaces + negSpaces;

        return {
            count,
            blocked,
            spaces,
            canWin: count >= 5
        };
    }

    /**
     * 根据线分析结果获取分数
     * @param {Object} lineInfo - 线分析结果
     * @param {number} player - 玩家标识
     * @returns {number} 线分数
     */
    getLineScore(lineInfo, player) {
        const { count, blocked, spaces, canWin } = lineInfo;

        // 直接获胜
        if (canWin) {
            return this.SCORES.WIN;
        }

        // 根据连子数和阻挡情况评分
        if (count === 4) {
            if (blocked === 0) return this.SCORES.FOUR;
            if (blocked === 1) return this.SCORES.FOUR * 0.5;
        }
        
        if (count === 3) {
            if (blocked === 0) return this.SCORES.THREE;
            if (blocked === 1) return this.SCORES.THREE * 0.5;
        }
        
        if (count === 2) {
            if (blocked === 0) return this.SCORES.TWO;
            if (blocked === 1) return this.SCORES.TWO * 0.5;
        }
        
        if (count === 1) {
            return this.SCORES.ONE;
        }

        return 0;
    }

    /**
     * 获取中心位置加分
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {number} 中心加分
     */
    getCenterBonus(x, y) {
        const center = 7; // 15x15棋盘的中心
        const distance = Math.abs(x - center) + Math.abs(y - center);
        return Math.max(0, this.SCORES.CENTER * (8 - distance));
    }

    /**
     * 获取开局落子
     * @param {Array} boardState - 棋盘状态
     * @returns {Object} 开局落子位置
     */
    getOpeningMove(boardState) {
        const center = 7;
        const openingMoves = [
            { x: center, y: center },           // 天元
            { x: center - 1, y: center },       // 天元附近
            { x: center + 1, y: center },
            { x: center, y: center - 1 },
            { x: center, y: center + 1 },
            { x: center - 1, y: center - 1 },   // 对角
            { x: center + 1, y: center + 1 },
            { x: center - 1, y: center + 1 },
            { x: center + 1, y: center - 1 }
        ];

        for (const move of openingMoves) {
            if (boardState[move.x][move.y] === 0) {
                return {
                    x: move.x,
                    y: move.y,
                    score: this.SCORES.CENTER,
                    reasoning: '开局占据中心位置'
                };
            }
        }

        // 如果中心都被占了，随机选择
        const emptyPositions = this.getEmptyPositions(boardState);
        const randomPos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        return {
            x: randomPos.x,
            y: randomPos.y,
            score: 0,
            reasoning: '随机开局位置'
        };
    }

    /**
     * 获取空白位置
     * @param {Array} boardState - 棋盘状态
     * @returns {Array} 空白位置数组
     */
    getEmptyPositions(boardState) {
        const positions = [];
        for (let x = 0; x < boardState.length; x++) {
            for (let y = 0; y < boardState[x].length; y++) {
                if (boardState[x][y] === 0) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }

    /**
     * 检查位置是否有效
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} size - 棋盘大小
     * @returns {boolean} 是否有效
     */
    isValidPosition(x, y, size) {
        return x >= 0 && x < size && y >= 0 && y < size;
    }

    /**
     * 根据分数获取推理说明
     * @param {number} score - 分数
     * @returns {string} 推理说明
     */
    getReasoningForScore(score) {
        if (score >= this.SCORES.WIN) return '直接获胜';
        if (score >= this.SCORES.BLOCK_WIN) return '阻止对手获胜';
        if (score >= this.SCORES.FOUR) return '形成四连威胁';
        if (score >= this.SCORES.BLOCK_FOUR) return '阻止对手四连';
        if (score >= this.SCORES.THREE) return '形成三连';
        if (score >= this.SCORES.BLOCK_THREE) return '阻止对手三连';
        if (score >= this.SCORES.TWO) return '形成二连';
        if (score >= this.SCORES.BLOCK_TWO) return '阻止对手二连';
        return '战略位置';
    }

    /**
     * 检查是否存在紧急威胁
     * @param {Array} boardState - 棋盘状态
     * @param {number} humanPlayer - 人类玩家标识
     * @returns {Array} 威胁位置数组
     */
    findUrgentThreats(boardState, humanPlayer) {
        const threats = [];
        const emptyPositions = this.getEmptyPositions(boardState);

        for (const pos of emptyPositions) {
            // 临时放置人类棋子
            boardState[pos.x][pos.y] = humanPlayer;
            
            // 检查是否能获胜
            if (this.checkWin(boardState, pos.x, pos.y, humanPlayer)) {
                threats.push({
                    x: pos.x,
                    y: pos.y,
                    priority: 'critical' // 必须阻止
                });
            }
            
            // 恢复状态
            boardState[pos.x][pos.y] = 0;
        }

        return threats;
    }

    /**
     * 检查是否获胜
     * @param {Array} boardState - 棋盘状态
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} player - 玩家标识
     * @returns {boolean} 是否获胜
     */
    checkWin(boardState, x, y, player) {
        for (const [dx, dy] of this.DIRECTIONS) {
            let count = 1;
            
            // 正方向
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (this.isValidPosition(nx, ny, boardState.length) && 
                    boardState[nx][ny] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 负方向
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (this.isValidPosition(nx, ny, boardState.length) && 
                    boardState[nx][ny] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= 5) {
                return true;
            }
        }
        
        return false;
    }
}

// 创建全局智能AI实例
window.smartAI = new SmartAI();
