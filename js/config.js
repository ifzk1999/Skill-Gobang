// 游戏配置文件
const GameConfig = {
    // 棋盘设置
    BOARD_SIZE: 15,
    CELL_SIZE: 35,
    BOARD_PADDING: 30,
    
    // 玩家标识
    PLAYER: {
        EMPTY: 0,
        HUMAN: 1,
        AI: 2
    },
    
    // 游戏状态
    GAME_STATUS: {
        PLAYING: 'playing',
        ENDED: 'ended',
        PAUSED: 'paused'
    },
    
    // 技能配置
    SKILLS: {
        flyingSand: {
            name: '飞沙走石',
            description: '随机搅乱5颗棋子位置',
            targetCount: 5,
            usesPerGame: 1
        },
        mountainMover: {
            name: '力拔山兮',
            description: '随机移除3颗棋子',
            targetCount: 3,
            usesPerGame: 1,
            requiresSelection: false
        },
        timeRewind: {
            name: '时光倒流',
            description: '回溯到上一回合',
            rewindSteps: 2, // 1回合 = 2步 (玩家+AI各一步)
            usesPerGame: 1
        }
    },
    
    // AI配置
    AI: {
        API_KEY: (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.AI.API_KEY) || 'your-api-key-here',
        MODEL: 'qwen',
        THINKING_DELAY: 1000, // AI思考延迟(毫秒)
        MAX_RETRIES: 3,
        TIMEOUT: 10000 // 10秒超时
    },
    
    // 渲染配置
    RENDER: {
        PIECE_RADIUS: 15,
        LINE_WIDTH: 1,
        GRID_COLOR: '#8B4513',
        PIECE_COLORS: {
            [1]: '#000000', // 玩家 - 黑子
            [2]: '#FFFFFF'  // AI - 白子
        },
        PIECE_BORDER_COLOR: '#333333',
        HIGHLIGHT_COLOR: 'rgba(255, 215, 0, 0.5)', // 高亮颜色
        PREVIEW_COLOR: 'rgba(0, 0, 0, 0.3)' // 预览颜色
    },
    
    // 动画配置
    ANIMATION: {
        SKILL_DURATION: 1000,
        PIECE_PLACE_DURATION: 300,
        WIN_CELEBRATION_DURATION: 2000
    }
};

// 导出配置（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
}