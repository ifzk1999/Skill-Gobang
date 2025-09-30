/**
 * 游戏控制器 - 协调各个组件，管理游戏流程
 */
class GameController {
    constructor() {
        // 初始化组件
        this.boardManager = new BoardManager();
        this.historyManager = new GameHistoryManager();
        this.skillSystem = new SkillSystem(this);
        this.aiService = new AIService();
        
        // 游戏状态
        this.gameStatus = GameConfig.GAME_STATUS.PLAYING;
        this.currentPlayer = GameConfig.PLAYER.HUMAN;
        this.winner = null;
        this.moveCount = 0;
        this.lastMove = null;
        
        // 获取Canvas元素并初始化UI
        const canvas = document.getElementById('game-board');
        if (canvas) {
            this.gameUI = new GameUI(canvas, this);
        } else {
            throw new Error('找不到游戏画布元素');
        }
        
        // 初始化游戏
        this.initializeGame();
    }

    /**
     * 初始化游戏
     */
    initializeGame() {
        this.startNewGame();
        console.log('游戏控制器初始化完成');
    }

    /**
     * 开始新游戏
     */
    startNewGame() {
        // 重置所有状态
        this.boardManager.reset();
        this.historyManager.clearHistory();
        this.skillSystem.resetSkills();
        
        this.gameStatus = GameConfig.GAME_STATUS.PLAYING;
        this.currentPlayer = GameConfig.PLAYER.HUMAN;
        this.winner = null;
        this.moveCount = 0;
        this.lastMove = null;
        
        // 更新UI
        this.updateUI();
        this.gameUI.redraw();
        
        // 保存初始状态
        this.saveCurrentState();
        
        Utils.showSuccess('新游戏开始！');
        console.log('新游戏开始');
    }

    /**
     * 处理玩家落子
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {boolean} 是否成功落子
     */
    async handlePlayerMove(x, y) {
        // 检查游戏状态
        if (this.gameStatus !== GameConfig.GAME_STATUS.PLAYING) {
            return false;
        }
        
        // 检查是否是玩家回合
        if (this.currentPlayer !== GameConfig.PLAYER.HUMAN) {
            Utils.showError('请等待AI行动');
            return false;
        }
        
        // 检查位置是否有效
        if (!this.boardManager.isValidPosition(x, y) || !this.boardManager.isEmpty(x, y)) {
            Utils.showError('无效的落子位置');
            return false;
        }
        
        // 落子
        if (this.boardManager.placePiece(x, y, GameConfig.PLAYER.HUMAN)) {
            this.lastMove = { x, y, player: GameConfig.PLAYER.HUMAN };
            this.moveCount++;
            
            // 保存状态
            this.saveCurrentState();
            
            // 更新UI
            this.updateUI();
            this.gameUI.redraw();
            
            // 检查游戏结束
            if (this.checkGameEnd()) {
                return true;
            }
            
            // 切换到AI回合
            this.switchTurn();
            
            // AI行动
            setTimeout(() => {
                this.handleAITurn();
            }, GameConfig.AI.THINKING_DELAY);
            
            return true;
        }
        
        return false;
    }

    /**
     * 处理AI回合
     */
    async handleAITurn() {
        if (this.gameStatus !== GameConfig.GAME_STATUS.PLAYING || 
            this.currentPlayer !== GameConfig.PLAYER.AI) {
            return;
        }
        
        try {
            // 显示AI思考状态
            this.showAIThinking(true);
            
            // 首先检查是否使用技能
            const availableSkills = this.skillSystem.getAvailableSkills(GameConfig.PLAYER.AI);
            const gameHistory = this.getRecentMoves(6);
            
            if (availableSkills.length > 0) {
                const skillDecision = await this.aiService.shouldUseSkill(
                    this.boardManager.toArray(),
                    availableSkills,
                    gameHistory
                );
                
                if (skillDecision.useSkill && skillDecision.skillType) {
                    console.log('AI决定使用技能:', skillDecision.skillType);
                    
                    const skillUsed = await this.skillSystem.useSkill(
                        skillDecision.skillType,
                        GameConfig.PLAYER.AI,
                        {}
                    );
                    
                    if (skillUsed) {
                        this.saveCurrentState();
                        this.updateUI();
                        
                        // 检查游戏结束
                        if (this.checkGameEnd()) {
                            this.showAIThinking(false);
                            return;
                        }
                        
                        // 特殊处理：如果使用了时光倒流，游戏状态可能已经改变
                        if (skillDecision.skillType === 'timeRewind') {
                            this.showAIThinking(false);
                            console.log('AI使用时光倒流，游戏状态已改变，结束当前AI回合');
                            return; // 结束当前AI回合，让restoreGameState处理后续流程
                        }
                    }
                }
            }
            
            // AI落子
            const moveDecision = await this.aiService.makeMove(
                this.boardManager.toArray(),
                availableSkills,
                gameHistory
            );
            
            console.log('AI决策:', moveDecision);
            
            // 验证AI决策
            if (this.boardManager.isValidPosition(moveDecision.x, moveDecision.y) &&
                this.boardManager.isEmpty(moveDecision.x, moveDecision.y)) {
                
                // AI落子
                this.boardManager.placePiece(moveDecision.x, moveDecision.y, GameConfig.PLAYER.AI);
                this.lastMove = { x: moveDecision.x, y: moveDecision.y, player: GameConfig.PLAYER.AI };
                this.moveCount++;
                
                // 保存状态
                this.saveCurrentState();
                
                // 更新UI
                this.updateUI();
                this.gameUI.redraw();
                
                // 检查游戏结束
                if (this.checkGameEnd()) {
                    this.showAIThinking(false);
                    return;
                }
                
                // 切换到玩家回合
                this.switchTurn();
                
            } else {
                console.error('AI决策无效，使用后备方案');
                this.handleAIFallback();
            }
            
        } catch (error) {
            console.error('AI回合处理失败:', error);
            this.handleAIFallback();
        } finally {
            this.showAIThinking(false);
        }
    }

    /**
     * AI后备方案
     */
    handleAIFallback() {
        const emptyPositions = this.boardManager.getEmptyPositions();
        if (emptyPositions.length > 0) {
            const randomPos = emptyPositions[Utils.randomInt(0, emptyPositions.length - 1)];
            
            this.boardManager.placePiece(randomPos.x, randomPos.y, GameConfig.PLAYER.AI);
            this.lastMove = { x: randomPos.x, y: randomPos.y, player: GameConfig.PLAYER.AI };
            this.moveCount++;
            
            this.saveCurrentState();
            this.updateUI();
            this.gameUI.redraw();
            
            if (!this.checkGameEnd()) {
                this.switchTurn();
            }
        }
    }

    /**
     * 处理技能使用
     * @param {string} skillType - 技能类型
     */
    async handleSkillUse(skillType) {
        if (this.gameStatus !== GameConfig.GAME_STATUS.PLAYING) {
            return;
        }
        
        if (this.currentPlayer !== GameConfig.PLAYER.HUMAN) {
            Utils.showError('请等待AI行动');
            return;
        }
        
        if (!this.skillSystem.canUseSkill(skillType, GameConfig.PLAYER.HUMAN)) {
            Utils.showError('无法使用该技能');
            return;
        }
        
        const success = await this.skillSystem.useSkill(skillType, GameConfig.PLAYER.HUMAN);
        
        if (success) {
            this.saveCurrentState();
            this.updateUI();
            
            // 检查游戏结束
            if (!this.checkGameEnd()) {
                // 技能使用后继续当前玩家回合
                console.log('技能使用成功，继续当前回合');
            }
        }
    }

    /**
     * 确认技能选择
     */
    confirmSkillSelection() {
        this.skillSystem.confirmSkillSelection();
    }

    /**
     * 取消技能选择
     */
    cancelSkillSelection() {
        this.skillSystem.cancelSkillSelection();
    }

    /**
     * 切换回合
     */
    switchTurn() {
        this.currentPlayer = this.currentPlayer === GameConfig.PLAYER.HUMAN ? 
            GameConfig.PLAYER.AI : GameConfig.PLAYER.HUMAN;
        this.updateUI();
    }

    /**
     * 检查游戏结束
     * @returns {boolean} 游戏是否结束
     */
    checkGameEnd() {
        // 检查获胜
        if (this.lastMove) {
            const winner = WinChecker.checkWin(this.boardManager, this.lastMove);
            if (winner) {
                this.endGame(winner);
                return true;
            }
        }
        
        // 检查平局
        if (WinChecker.isDraw(this.boardManager)) {
            this.endGame('draw');
            return true;
        }
        
        return false;
    }

    /**
     * 结束游戏
     * @param {number|string} winner - 获胜者或'draw'
     */
    endGame(winner) {
        this.gameStatus = GameConfig.GAME_STATUS.ENDED;
        this.winner = winner;
        
        // 显示获胜线
        if (winner !== 'draw' && this.lastMove) {
            const winningLine = WinChecker.getWinningLine(this.boardManager, this.lastMove);
            if (winningLine) {
                this.gameUI.showWinningLine(winningLine);
            }
        }
        
        // 显示结果
        this.showGameResult(winner);
        
        console.log('游戏结束，获胜者:', winner);
    }

    /**
     * 显示游戏结果
     * @param {number|string} winner - 获胜者
     */
    showGameResult(winner) {
        const modal = document.getElementById('game-result-modal');
        const title = document.getElementById('result-title');
        const message = document.getElementById('result-message');
        
        if (winner === 'draw') {
            title.textContent = '平局';
            message.textContent = '棋盘已满，游戏平局！';
        } else if (winner === GameConfig.PLAYER.HUMAN) {
            title.textContent = '恭喜获胜！';
            message.textContent = '你成功击败了AI对手！';
        } else if (winner === GameConfig.PLAYER.AI) {
            title.textContent = '游戏结束';
            message.textContent = 'AI获得了胜利，再接再厉！';
        }
        
        modal.classList.remove('hidden');
    }

    /**
     * 保存当前游戏状态
     */
    saveCurrentState() {
        this.historyManager.saveState(
            this.boardManager.toArray(),
            this.currentPlayer,
            this.skillSystem.getSkillsUsed(),
            this.moveCount
        );
    }

    /**
     * 恢复游戏状态
     * @param {Object} state - 游戏状态
     */
    restoreGameState(state) {
        if (!state) return;
        
        this.boardManager.fromArray(state.boardState);
        this.currentPlayer = state.currentPlayer;
        this.skillSystem.setSkillsUsed(state.skillsUsed);
        this.moveCount = state.moveCount;
        
        this.updateUI();
        this.gameUI.redraw();
        
        console.log('游戏状态已恢复，当前玩家:', this.currentPlayer);
        
        // 重要：恢复状态后需要继续游戏流程
        // 如果当前是AI回合，需要触发AI行动
        if (this.currentPlayer === GameConfig.PLAYER.AI && 
            this.gameStatus === GameConfig.GAME_STATUS.PLAYING) {
            // 延迟一下让动画完成，然后继续AI回合
            setTimeout(() => {
                this.handleAITurn();
            }, 500);
        }
    }

    /**
     * 获取最近的移动记录
     * @param {number} count - 获取数量
     * @returns {Array} 移动记录数组
     */
    getRecentMoves(count) {
        const recentStates = this.historyManager.getRecentStates(count);
        const moves = [];
        
        for (let i = 1; i < recentStates.length; i++) {
            const prevBoard = recentStates[i - 1].boardState;
            const currBoard = recentStates[i].boardState;
            
            // 找出差异位置
            for (let x = 0; x < 15; x++) {
                for (let y = 0; y < 15; y++) {
                    if (prevBoard[x][y] !== currBoard[x][y] && currBoard[x][y] !== 0) {
                        moves.push({
                            x, y,
                            player: currBoard[x][y],
                            moveCount: recentStates[i].moveCount
                        });
                    }
                }
            }
        }
        
        return moves;
    }

    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新当前玩家显示
        const playerText = this.currentPlayer === GameConfig.PLAYER.HUMAN ? '玩家回合' : 'AI回合';
        updateGameStatus(playerText);
        
        // 更新移动计数
        updateMoveCount(this.moveCount);
        
        // 更新技能按钮
        this.skillSystem.updateSkillButtons();
    }

    /**
     * 显示/隐藏AI思考状态
     * @param {boolean} thinking - 是否在思考
     */
    showAIThinking(thinking) {
        showAIThinking(thinking);
    }

    /**
     * 重置游戏
     */
    resetGame() {
        this.startNewGame();
    }

    /**
     * 获取游戏状态
     * @returns {Object} 当前游戏状态
     */
    getGameState() {
        return {
            boardState: this.boardManager.toArray(),
            currentPlayer: this.currentPlayer,
            gameStatus: this.gameStatus,
            winner: this.winner,
            moveCount: this.moveCount,
            skillsUsed: this.skillSystem.getSkillsUsed(),
            lastMove: this.lastMove
        };
    }

    /**
     * 暂停游戏
     */
    pauseGame() {
        if (this.gameStatus === GameConfig.GAME_STATUS.PLAYING) {
            this.gameStatus = GameConfig.GAME_STATUS.PAUSED;
            this.updateUI();
        }
    }

    /**
     * 恢复游戏
     */
    resumeGame() {
        if (this.gameStatus === GameConfig.GAME_STATUS.PAUSED) {
            this.gameStatus = GameConfig.GAME_STATUS.PLAYING;
            this.updateUI();
        }
    }

    /**
     * 获取游戏统计信息
     * @returns {Object} 统计信息
     */
    getGameStats() {
        const pieceCount = this.boardManager.getPieceCount();
        const humanPieces = this.boardManager.getPlayerPieceCount(GameConfig.PLAYER.HUMAN);
        const aiPieces = this.boardManager.getPlayerPieceCount(GameConfig.PLAYER.AI);
        
        return {
            moveCount: this.moveCount,
            totalPieces: pieceCount,
            humanPieces,
            aiPieces,
            gameStatus: this.gameStatus,
            currentPlayer: this.currentPlayer,
            winner: this.winner
        };
    }
}