/**
 * 游戏主入口文件
 */

// 全局游戏控制器实例
let gameController = null;

/**
 * 初始化游戏
 */
function initGame() {
    try {
        // 创建游戏控制器
        gameController = new GameController();
        
        // 绑定事件监听器
        bindEventListeners();
        
        // 显示成功消息
        Utils.showSuccess('游戏初始化成功！');
        
        console.log('技能五子棋游戏已启动');
    } catch (error) {
        console.error('游戏初始化失败:', error);
        Utils.showError('游戏初始化失败，请刷新页面重试');
    }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 新游戏按钮
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            gameController.startNewGame();
        });
    }

    // 技能按钮
    const skillButtons = document.querySelectorAll('.skill-btn');
    skillButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const skillType = e.currentTarget.dataset.skill;
            if (skillType && gameController) {
                gameController.handleSkillUse(skillType);
            }
        });
    });

    // 游戏结果模态框
    const playAgainBtn = document.getElementById('play-again-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            hideModal('game-result-modal');
            gameController.startNewGame();
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideModal('game-result-modal');
        });
    }

    // 技能选择模态框
    const confirmSkillBtn = document.getElementById('confirm-skill-btn');
    const cancelSkillBtn = document.getElementById('cancel-skill-btn');
    
    if (confirmSkillBtn) {
        confirmSkillBtn.addEventListener('click', () => {
            if (gameController) {
                gameController.confirmSkillSelection();
            }
        });
    }
    
    if (cancelSkillBtn) {
        cancelSkillBtn.addEventListener('click', () => {
            hideModal('skill-selection-modal');
            if (gameController) {
                gameController.cancelSkillSelection();
            }
        });
    }

    // 键盘事件
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * 处理键盘按键事件
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyPress(event) {
    if (!gameController) return;
    
    switch (event.key) {
        case 'Escape':
            // 取消当前操作
            if (gameController.skillSystem) {
                gameController.skillSystem.cancelSkillSelection();
            }
            break;
        case 'r':
        case 'R':
            // 重新开始游戏
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                gameController.startNewGame();
            }
            break;
    }
}

/**
 * 显示模态框
 * @param {string} modalId - 模态框ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 隐藏模态框
 * @param {string} modalId - 模态框ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 更新游戏状态文本
 * @param {string} status - 状态文本
 */
function updateGameStatus(status) {
    const statusElement = document.getElementById('current-player');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

/**
 * 更新移动计数显示
 * @param {number} count - 移动次数
 */
function updateMoveCount(count) {
    const countElement = document.getElementById('move-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

/**
 * 显示AI思考状态
 * @param {boolean} thinking - 是否在思考
 */
function showAIThinking(thinking) {
    const aiElement = document.getElementById('ai-thinking');
    if (aiElement) {
        if (thinking) {
            aiElement.classList.remove('hidden');
        } else {
            aiElement.classList.add('hidden');
        }
    }
}

/**
 * 显示AI思考状态
 * @param {boolean} thinking - 是否在思考
 */
function showAIThinking(thinking) {
    const aiElement = document.getElementById('ai-thinking');
    if (aiElement) {
        if (thinking) {
            aiElement.classList.remove('hidden');
        } else {
            aiElement.classList.add('hidden');
        }
    }
}

/**
 * 页面加载完成后初始化游戏
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化游戏...');
    
    // 延迟初始化，确保所有资源加载完成
    setTimeout(() => {
        initGame();
    }, 100);
});

/**
 * 页面卸载前清理资源
 */
window.addEventListener('beforeunload', () => {
    if (gameController) {
        // 保存游戏状态到本地存储
        try {
            const gameState = gameController.getGameState();
            localStorage.setItem('gomoku_game_state', JSON.stringify(gameState));
        } catch (error) {
            console.warn('保存游戏状态失败:', error);
        }
    }
});

// 导出全局函数供其他模块使用
window.showModal = showModal;
window.hideModal = hideModal;
window.updateGameStatus = updateGameStatus;
window.updateMoveCount = updateMoveCount;
window.showAIThinking = showAIThinking;