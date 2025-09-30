/**
 * 技能系统 - 管理三种技能的实现
 */
class SkillSystem {
    constructor(gameController) {
        this.gameController = gameController;
        this.skillsUsed = {
            [GameConfig.PLAYER.HUMAN]: {
                flyingSand: false,
                mountainMover: false,
                timeRewind: false
            },
            [GameConfig.PLAYER.AI]: {
                flyingSand: false,
                mountainMover: false,
                timeRewind: false
            }
        };
    }

    /**
     * 使用技能
     * @param {string} skillType - 技能类型
     * @param {number} player - 玩家标识
     * @param {Object} params - 技能参数
     * @returns {boolean} 是否成功使用
     */
    async useSkill(skillType, player, params = {}) {
        if (!this.canUseSkill(skillType, player)) {
            return false;
        }

        try {
            let result = false;
            
            switch (skillType) {
                case 'flyingSand':
                    result = await this.flyingSandStorm(params);
                    break;
                case 'mountainMover':
                    result = await this.mountainMover(params);
                    break;
                case 'timeRewind':
                    result = await this.timeRewind(params);
                    break;
                default:
                    console.error('未知技能类型:', skillType);
                    return false;
            }

            if (result) {
                this.skillsUsed[player][skillType] = true;
                this.updateSkillButtons();
                
                // 显示技能使用消息
                const skillName = GameConfig.SKILLS[skillType].name;
                const playerName = player === GameConfig.PLAYER.HUMAN ? '玩家' : 'AI';
                Utils.showSuccess(`${playerName}使用了${skillName}！`);
            }

            return result;
        } catch (error) {
            console.error('技能使用失败:', error);
            Utils.showError('技能使用失败，请重试');
            return false;
        }
    }

    /**
     * 检查是否可以使用技能
     * @param {string} skillType - 技能类型
     * @param {number} player - 玩家标识
     * @returns {boolean} 是否可以使用
     */
    canUseSkill(skillType, player) {
        // 检查技能是否存在
        if (!GameConfig.SKILLS[skillType]) {
            return false;
        }

        // 检查是否已使用
        if (this.skillsUsed[player][skillType]) {
            return false;
        }

        // 检查游戏状态
        if (this.gameController.gameStatus !== GameConfig.GAME_STATUS.PLAYING) {
            return false;
        }

        return true;
    }

    /**
     * 飞沙走石技能 - 搅乱5颗棋子位置
     * @param {Object} params - 参数
     * @returns {boolean} 是否成功执行
     */
    async flyingSandStorm(params = {}) {
        const boardManager = this.gameController.boardManager;
        const allPieces = boardManager.getAllPieces();
        
        if (allPieces.length === 0) {
            Utils.showError('棋盘上没有棋子可以搅乱');
            return false;
        }

        // 选择要搅乱的棋子数量
        const targetCount = Math.min(GameConfig.SKILLS.flyingSand.targetCount, allPieces.length);
        const selectedPieces = Utils.randomSelect(allPieces, targetCount);
        
        // 获取空白位置
        const emptyPositions = boardManager.getEmptyPositions();
        
        if (emptyPositions.length < selectedPieces.length) {
            Utils.showError('没有足够的空白位置来重新分布棋子');
            return false;
        }

        // 动画效果
        await this.animateSkillEffect('flyingSand', selectedPieces);

        // 移除选中的棋子
        const removedPieces = [];
        selectedPieces.forEach(piece => {
            removedPieces.push({
                x: piece.x,
                y: piece.y,
                player: boardManager.removePiece(piece.x, piece.y)
            });
        });

        // 随机重新分布
        const newPositions = Utils.randomSelect(emptyPositions, removedPieces.length);
        removedPieces.forEach((piece, index) => {
            const newPos = newPositions[index];
            boardManager.placePiece(newPos.x, newPos.y, piece.player);
        });

        // 更新显示
        this.gameController.gameUI.redraw();
        
        return true;
    }

    /**
     * 力拔山兮技能 - 随机移除3颗棋子
     * @param {Object} params - 参数
     * @returns {boolean} 是否成功执行
     */
    async mountainMover(params = {}) {
        const boardManager = this.gameController.boardManager;
        const allPieces = boardManager.getAllPieces();
        
        if (allPieces.length === 0) {
            Utils.showError('棋盘上没有棋子可以移除');
            return false;
        }

        // 随机选择要移除的棋子数量
        const targetCount = Math.min(GameConfig.SKILLS.mountainMover.targetCount, allPieces.length);
        const selectedPieces = Utils.randomSelect(allPieces, targetCount);

        // 动画效果
        await this.animateSkillEffect('mountainMover', selectedPieces);

        // 移除选中的棋子
        selectedPieces.forEach(piece => {
            boardManager.removePiece(piece.x, piece.y);
        });

        // 更新显示
        this.gameController.gameUI.redraw();
        
        return true;
    }

    /**
     * 时光倒流技能 - 回溯到上一回合
     * @param {Object} params - 参数
     * @returns {boolean} 是否成功执行
     */
    async timeRewind(params = {}) {
        const historyManager = this.gameController.historyManager;
        const rewindSteps = GameConfig.SKILLS.timeRewind.rewindSteps;

        if (!historyManager.canRewind(rewindSteps)) {
            const availableSteps = historyManager.getHistoryLength();
            if (availableSteps === 0) {
                Utils.showError('没有历史记录可以回退');
                return false;
            } else if (availableSteps < rewindSteps) {
                Utils.showError(`历史记录不足，无法回溯到上一回合（需要${rewindSteps}步，当前只有${availableSteps}步）`);
                return false;
            }
            return false;
        }

        // 动画效果
        await this.animateSkillEffect('timeRewind');

        // 回退指定步数
        const previousState = historyManager.rewindSteps(rewindSteps);
        if (previousState) {
            this.gameController.restoreGameState(previousState);
            return true;
        }

        return false;
    }

    /**
     * 请求用户选择目标
     * @param {string} skillType - 技能类型
     * @returns {Promise<boolean>} 是否成功
     */
    async requestTargetSelection(skillType) {
        return new Promise((resolve) => {
            const skillConfig = GameConfig.SKILLS[skillType];
            const gameUI = this.gameController.gameUI;
            
            // 进入选择模式
            gameUI.enterSelectionMode(skillConfig.targetCount);
            
            // 显示选择模态框
            const modal = document.getElementById('skill-selection-modal');
            const title = document.getElementById('skill-selection-title');
            const message = document.getElementById('skill-selection-message');
            
            title.textContent = skillConfig.name;
            message.textContent = `请选择${skillConfig.targetCount}个目标`;
            
            modal.classList.remove('hidden');
            
            // 保存回调函数
            this.selectionCallback = resolve;
            this.currentSkillType = skillType;
        });
    }

    /**
     * 确认技能选择
     */
    confirmSkillSelection() {
        const gameUI = this.gameController.gameUI;
        const selectedPositions = gameUI.getSelectedPositions();
        const skillConfig = GameConfig.SKILLS[this.currentSkillType];
        
        if (selectedPositions.length === 0) {
            Utils.showError('请至少选择一个目标');
            return;
        }
        
        if (selectedPositions.length > skillConfig.targetCount) {
            Utils.showError(`最多只能选择${skillConfig.targetCount}个目标`);
            return;
        }

        // 隐藏模态框
        document.getElementById('skill-selection-modal').classList.add('hidden');
        gameUI.exitSelectionMode();

        // 执行技能
        const params = { targets: selectedPositions };
        this.useSkill(this.currentSkillType, GameConfig.PLAYER.HUMAN, params)
            .then(result => {
                if (this.selectionCallback) {
                    this.selectionCallback(result);
                    this.selectionCallback = null;
                    this.currentSkillType = null;
                }
            });
    }

    /**
     * 取消技能选择
     */
    cancelSkillSelection() {
        const gameUI = this.gameController.gameUI;
        gameUI.exitSelectionMode();
        
        if (this.selectionCallback) {
            this.selectionCallback(false);
            this.selectionCallback = null;
            this.currentSkillType = null;
        }
    }

    /**
     * 技能动画效果
     * @param {string} skillType - 技能类型
     * @param {Array} targets - 目标位置数组
     */
    async animateSkillEffect(skillType, targets = []) {
        const duration = GameConfig.ANIMATION.SKILL_DURATION;
        
        switch (skillType) {
            case 'flyingSand':
                await this.animateFlyingSand(targets, duration);
                break;
            case 'mountainMover':
                await this.animateMountainMover(targets, duration);
                break;
            case 'timeRewind':
                await this.animateTimeRewind(duration);
                break;
        }
    }

    /**
     * 飞沙走石动画
     */
    async animateFlyingSand(targets, duration) {
        const gameUI = this.gameController.gameUI;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            gameUI.redraw();
            
            // 闪烁效果
            if (Math.sin(progress * Math.PI * 8) > 0) {
                targets.forEach(target => {
                    gameUI.highlightPosition(target.x, target.y, 'rgba(255, 255, 0, 0.7)');
                });
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        await Utils.delay(duration);
    }

    /**
     * 力拔山兮动画
     */
    async animateMountainMover(targets, duration) {
        const gameUI = this.gameController.gameUI;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            gameUI.redraw();
            
            // 红色高亮效果
            targets.forEach(target => {
                const alpha = 0.8 * (1 - progress);
                gameUI.highlightPosition(target.x, target.y, `rgba(255, 0, 0, ${alpha})`);
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        await Utils.delay(duration);
    }

    /**
     * 时光倒流动画
     */
    async animateTimeRewind(duration) {
        const gameUI = this.gameController.gameUI;
        const canvas = gameUI.canvas;
        const ctx = gameUI.ctx;
        
        // 创建波纹效果
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.max(canvas.width, canvas.height);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            gameUI.redraw();
            
            // 绘制时光波纹
            const radius = progress * maxRadius;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(0, 255, 255, ${1 - progress})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        await Utils.delay(duration);
    }

    /**
     * 更新技能按钮状态
     */
    updateSkillButtons() {
        const humanSkills = this.skillsUsed[GameConfig.PLAYER.HUMAN];
        
        Object.keys(humanSkills).forEach(skillType => {
            const button = document.querySelector(`[data-skill="${skillType}"]`);
            if (button) {
                const usesSpan = button.querySelector('.skill-uses');
                const isUsed = humanSkills[skillType];
                
                if (isUsed) {
                    button.disabled = true;
                    usesSpan.textContent = '剩余: 0';
                } else {
                    button.disabled = false;
                    usesSpan.textContent = '剩余: 1';
                }
            }
        });
    }

    /**
     * 重置技能状态
     */
    resetSkills() {
        this.skillsUsed = {
            [GameConfig.PLAYER.HUMAN]: {
                flyingSand: false,
                mountainMover: false,
                timeRewind: false
            },
            [GameConfig.PLAYER.AI]: {
                flyingSand: false,
                mountainMover: false,
                timeRewind: false
            }
        };
        
        this.updateSkillButtons();
    }

    /**
     * 获取可用技能列表
     * @param {number} player - 玩家标识
     * @returns {Array} 可用技能数组
     */
    getAvailableSkills(player) {
        const skills = [];
        const playerSkills = this.skillsUsed[player];
        
        Object.keys(playerSkills).forEach(skillType => {
            if (!playerSkills[skillType]) {
                skills.push(skillType);
            }
        });
        
        return skills;
    }

    /**
     * 获取技能使用状态
     * @returns {Object} 技能使用状态
     */
    getSkillsUsed() {
        return Utils.deepClone(this.skillsUsed);
    }

    /**
     * 设置技能使用状态
     * @param {Object} skillsUsed - 技能使用状态
     */
    setSkillsUsed(skillsUsed) {
        this.skillsUsed = Utils.deepClone(skillsUsed);
        this.updateSkillButtons();
    }
}