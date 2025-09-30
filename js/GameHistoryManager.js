/**
 * 游戏历史管理器 - 记录和管理游戏状态历史
 */
class GameHistoryManager {
    constructor() {
        this.history = [];
        this.maxHistorySize = 100; // 最大历史记录数
    }

    /**
     * 保存游戏状态
     * @param {Array} boardState - 棋盘状态
     * @param {number} currentPlayer - 当前玩家
     * @param {Object} skillsUsed - 已使用的技能
     * @param {number} moveCount - 移动计数
     */
    saveState(boardState, currentPlayer, skillsUsed, moveCount) {
        const state = {
            boardState: Utils.deepClone(boardState),
            currentPlayer,
            skillsUsed: Utils.deepClone(skillsUsed),
            moveCount,
            timestamp: Date.now()
        };
        
        this.history.push(state);
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 回退指定步数
     * @param {number} steps - 回退步数
     * @returns {Object|null} 回退后的状态，null表示无法回退
     */
    rewindSteps(steps) {
        if (steps <= 0 || steps > this.history.length) {
            return null;
        }
        
        // 移除最后的steps个状态
        for (let i = 0; i < steps; i++) {
            this.history.pop();
        }
        
        // 返回当前最新状态
        return this.getCurrentState();
    }

    /**
     * 获取当前状态
     * @returns {Object|null} 当前状态，null表示无历史记录
     */
    getCurrentState() {
        if (this.history.length === 0) {
            return null;
        }
        return Utils.deepClone(this.history[this.history.length - 1]);
    }

    /**
     * 检查是否可以回退指定步数
     * @param {number} steps - 回退步数
     * @returns {boolean} 是否可以回退
     */
    canRewind(steps) {
        return this.history.length >= steps && steps > 0;
    }

    /**
     * 获取历史记录长度
     * @returns {number} 历史记录数量
     */
    getHistoryLength() {
        return this.history.length;
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * 获取指定索引的历史状态
     * @param {number} index - 历史索引
     * @returns {Object|null} 历史状态
     */
    getStateAt(index) {
        if (index < 0 || index >= this.history.length) {
            return null;
        }
        return Utils.deepClone(this.history[index]);
    }

    /**
     * 获取最近的几个状态
     * @param {number} count - 获取数量
     * @returns {Array} 最近的状态数组
     */
    getRecentStates(count) {
        const startIndex = Math.max(0, this.history.length - count);
        return this.history.slice(startIndex).map(state => Utils.deepClone(state));
    }

    /**
     * 获取游戏统计信息
     * @returns {Object} 统计信息
     */
    getGameStats() {
        if (this.history.length === 0) {
            return {
                totalMoves: 0,
                playerMoves: 0,
                aiMoves: 0,
                gameTime: 0
            };
        }

        const currentState = this.getCurrentState();
        const boardState = currentState.boardState;
        
        let humanCount = 0;
        let aiCount = 0;
        
        for (let x = 0; x < boardState.length; x++) {
            for (let y = 0; y < boardState[x].length; y++) {
                if (boardState[x][y] === GameConfig.PLAYER.HUMAN) {
                    humanCount++;
                } else if (boardState[x][y] === GameConfig.PLAYER.AI) {
                    aiCount++;
                }
            }
        }

        return {
            totalMoves: this.history.length,
            playerMoves: Math.ceil(humanCount),
            aiMoves: Math.ceil(aiCount),
            gameTime: this.history.length > 0 ? 
                (this.history[this.history.length - 1].timestamp - this.history[0].timestamp) / 1000 : 0
        };
    }

    /**
     * 统计棋子数量
     * @param {Array} boardState - 棋盘状态
     * @returns {Object} 棋子统计
     */
    countPieces(boardState) {
        let humanCount = 0;
        let aiCount = 0;
        
        for (let x = 0; x < boardState.length; x++) {
            for (let y = 0; y < boardState[x].length; y++) {
                if (boardState[x][y] === GameConfig.PLAYER.HUMAN) {
                    humanCount++;
                } else if (boardState[x][y] === GameConfig.PLAYER.AI) {
                    aiCount++;
                }
            }
        }
        
        return { human: humanCount, ai: aiCount, total: humanCount + aiCount };
    }

    /**
     * 导出历史记录到JSON
     * @returns {string} JSON字符串
     */
    exportHistory() {
        return JSON.stringify(this.history, null, 2);
    }

    /**
     * 从JSON导入历史记录
     * @param {string} jsonString - JSON字符串
     * @returns {boolean} 是否导入成功
     */
    importHistory(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (Array.isArray(imported)) {
                this.history = imported;
                return true;
            }
        } catch (error) {
            console.error('导入历史记录失败:', error);
        }
        return false;
    }
}