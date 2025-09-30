/**
 * AI服务 - 与qwen模型交互，提供AI决策
 */
class AIService {
    constructor(apiKey = GameConfig.AI.API_KEY) {
        this.apiKey = apiKey;
        this.model = GameConfig.AI.MODEL;
        this.maxRetries = GameConfig.AI.MAX_RETRIES;
        this.timeout = GameConfig.AI.TIMEOUT;
        this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    }

    /**
     * AI决策落子
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能
     * @param {Array} gameHistory - 游戏历史
     * @returns {Promise<Object>} AI决策结果
     */
    async makeMove(boardState, availableSkills = [], gameHistory = []) {
        try {
            // 优先使用智能AI策略
            if (window.smartAI) {
                const smartMove = this.getSmartAIMove(boardState);
                if (smartMove) {
                    return smartMove;
                }
            }

            // 如果智能AI不可用，使用原有的API方式
            const prompt = this.createMovePrompt(boardState, availableSkills, gameHistory);
            const response = await this.callQwenAPI(prompt);
            return this.parseAIResponse(response, 'move');
        } catch (error) {
            console.error('AI落子决策失败:', error);
            return this.getFallbackMove(boardState);
        }
    }

    /**
     * AI决策是否使用技能
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能
     * @param {Array} gameHistory - 游戏历史
     * @returns {Promise<Object>} 技能使用决策
     */
    async shouldUseSkill(boardState, availableSkills = [], gameHistory = []) {
        if (availableSkills.length === 0) {
            return { useSkill: false };
        }

        // 首先尝试基于规则的快速决策（提高使用频率）
        const ruleBasedDecision = this.getRuleBasedSkillDecision(boardState, availableSkills, gameHistory);
        if (ruleBasedDecision.useSkill) {
            return ruleBasedDecision;
        }

        try {
            const prompt = this.createSkillPrompt(boardState, availableSkills, gameHistory);
            const response = await this.callQwenAPI(prompt);
            const aiDecision = this.parseAIResponse(response, 'skill');
            
            // 如果AI不想使用技能，但满足某些条件时强制使用
            if (!aiDecision.useSkill && this.shouldForceSkillUse(boardState, availableSkills, gameHistory)) {
                return this.getForceSkillDecision(availableSkills);
            }
            
            return aiDecision;
        } catch (error) {
            console.error('AI技能决策失败:', error);
            // API失败时，使用规则决策
            return this.getRuleBasedSkillDecision(boardState, availableSkills, gameHistory, true);
        }
    }

    /**
     * 基于规则的技能决策（提高使用频率）
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能列表
     * @param {Array} gameHistory - 游戏历史
     * @param {boolean} fallback - 是否为后备决策
     * @returns {Object} 技能决策结果
     */
    getRuleBasedSkillDecision(boardState, availableSkills, gameHistory, fallback = false) {
        const moveCount = gameHistory.length;
        
        // 游戏早期（前10步）更积极使用技能
        const earlyGameBonus = moveCount < 10 ? 0.3 : 0;
        
        // 中期（10-20步）适度使用
        const midGameBonus = moveCount >= 10 && moveCount < 20 ? 0.2 : 0;
        
        // 后期更保守，但仍有一定概率
        const lateGameBonus = moveCount >= 20 ? 0.1 : 0;
        
        // 基础使用概率（比原来大幅提高）
        let useChance = 0.4 + earlyGameBonus + midGameBonus + lateGameBonus;
        
        // 如果是后备决策，进一步提高概率
        if (fallback) {
            useChance += 0.3;
        }
        
        // 检查是否有紧急情况需要使用技能
        const urgentNeed = this.checkUrgentSkillNeed(boardState);
        if (urgentNeed.urgent) {
            return {
                useSkill: true,
                skillType: urgentNeed.recommendedSkill,
                reasoning: `紧急情况：${urgentNeed.reason}`
            };
        }
        
        // 随机决策，但概率较高
        if (Math.random() < useChance) {
            const selectedSkill = this.selectBestSkillForSituation(boardState, availableSkills);
            return {
                useSkill: true,
                skillType: selectedSkill.skill,
                reasoning: selectedSkill.reason
            };
        }
        
        return { useSkill: false };
    }

    /**
     * 检查是否有紧急情况需要使用技能
     * @param {Array} boardState - 棋盘状态
     * @returns {Object} 紧急情况检查结果
     */
    checkUrgentSkillNeed(boardState) {
        // 检查对手是否有连续的威胁
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        
        // 如果对手有3连或以上，建议使用力拔山兮
        if (humanThreats.maxConsecutive >= 3) {
            return {
                urgent: true,
                recommendedSkill: 'mountainMover',
                reason: `对手有${humanThreats.maxConsecutive}连，需要破坏`
            };
        }
        
        // 如果对手有多个2连，建议使用飞沙走石
        if (humanThreats.twoInARow >= 2) {
            return {
                urgent: true,
                recommendedSkill: 'flyingSand',
                reason: '对手有多个2连威胁，需要打乱布局'
            };
        }
        
        return { urgent: false };
    }

    /**
     * 为当前局面选择最佳技能
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能列表
     * @returns {Object} 技能选择结果
     */
    selectBestSkillForSituation(boardState, availableSkills) {
        const pieceCount = this.countTotalPieces(boardState);
        
        // 根据棋子数量和局面选择技能
        if (availableSkills.includes('mountainMover') && pieceCount > 8) {
            return {
                skill: 'mountainMover',
                reason: '棋盘上棋子较多，使用力拔山兮清理局面'
            };
        }
        
        if (availableSkills.includes('flyingSand') && pieceCount > 6) {
            return {
                skill: 'flyingSand',
                reason: '使用飞沙走石重新洗牌，创造新机会'
            };
        }
        
        if (availableSkills.includes('timeRewind')) {
            return {
                skill: 'timeRewind',
                reason: '使用时光倒流重新考虑策略'
            };
        }
        
        // 默认选择第一个可用技能
        return {
            skill: availableSkills[0],
            reason: '主动使用技能创造优势'
        };
    }

    /**
     * 判断是否应该强制使用技能
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能列表
     * @param {Array} gameHistory - 游戏历史
     * @returns {boolean} 是否强制使用
     */
    shouldForceSkillUse(boardState, availableSkills, gameHistory) {
        const moveCount = gameHistory.length;
        
        // 游戏进行到一定程度后，如果还没用过技能，强制使用
        if (moveCount > 15) {
            return Math.random() < 0.6; // 60%概率强制使用
        }
        
        if (moveCount > 10) {
            return Math.random() < 0.3; // 30%概率强制使用
        }
        
        return false;
    }

    /**
     * 获取强制技能决策
     * @param {Array} availableSkills - 可用技能列表
     * @returns {Object} 强制技能决策
     */
    getForceSkillDecision(availableSkills) {
        const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        return {
            useSkill: true,
            skillType: randomSkill,
            reasoning: '游戏进行较久，主动使用技能增加变数'
        };
    }

    /**
     * 统计连续棋子情况
     * @param {Array} boardState - 棋盘状态
     * @param {number} player - 玩家类型
     * @returns {Object} 连续棋子统计
     */
    countConsecutivePieces(boardState, player) {
        let maxConsecutive = 0;
        let twoInARow = 0;
        let threeInARow = 0;
        
        const directions = [[0,1], [1,0], [1,1], [1,-1]];
        
        for (let x = 0; x < boardState.length; x++) {
            for (let y = 0; y < boardState[x].length; y++) {
                if (boardState[x][y] === player) {
                    for (let [dx, dy] of directions) {
                        let count = 1;
                        let nx = x + dx, ny = y + dy;
                        
                        while (nx >= 0 && nx < boardState.length && 
                               ny >= 0 && ny < boardState[nx].length && 
                               boardState[nx][ny] === player) {
                            count++;
                            nx += dx;
                            ny += dy;
                        }
                        
                        maxConsecutive = Math.max(maxConsecutive, count);
                        if (count === 2) twoInARow++;
                        if (count === 3) threeInARow++;
                    }
                }
            }
        }
        
        return { maxConsecutive, twoInARow, threeInARow };
    }

    /**
     * 统计棋盘上的总棋子数
     * @param {Array} boardState - 棋盘状态
     * @returns {number} 总棋子数
     */
    countTotalPieces(boardState) {
        let count = 0;
        for (let x = 0; x < boardState.length; x++) {
            for (let y = 0; y < boardState[x].length; y++) {
                if (boardState[x][y] !== GameConfig.PLAYER.EMPTY) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 创建落子决策提示词
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能
     * @param {Array} gameHistory - 游戏历史
     * @returns {string} 提示词
     */
    createMovePrompt(boardState, availableSkills, gameHistory) {
        const boardStr = this.formatBoardForAI(boardState);
        const historyStr = this.formatHistoryForAI(gameHistory);
        
        return `你是一个专业的五子棋AI，需要分析当前棋局并做出最佳决策。

游戏规则：
- 15x15棋盘，先连成5子者获胜
- 你是白子(2)，对手是黑子(1)，空位是0
- 坐标从(0,0)到(14,14)

当前棋盘状态：
${boardStr}

最近几步历史：
${historyStr}

可用技能：${availableSkills.join(', ')}

请按以下优先级分析局势并选择最佳落子位置：

**最高优先级 - 防守**：
1. 检查对手是否有4连（即将获胜），必须立即阻止
2. 检查对手是否有活3连或双3连，需要防守
3. 检查对手是否有活2连，考虑防守

**次优先级 - 攻击**：
4. 检查自己是否能直接获胜（形成5连）
5. 检查自己是否能形成4连威胁
6. 检查自己是否能形成活3连

**基础策略**：
7. 选择能同时攻防的位置
8. 占据棋盘中心和关键位置
9. 避免给对手创造机会

**重要提醒**：防守比攻击更重要！优先阻止对手获胜！

请以JSON格式回复：
{
  "x": 落子x坐标(0-14),
  "y": 落子y坐标(0-14),
  "reasoning": "详细的决策理由，说明是攻击还是防守"
}`;
    }

    /**
     * 创建技能决策提示词
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能
     * @param {Array} gameHistory - 游戏历史
     * @returns {string} 提示词
     */
    createSkillPrompt(boardState, availableSkills, gameHistory) {
        const boardStr = this.formatBoardForAI(boardState);
        const skillDescriptions = {
            flyingSand: '飞沙走石：随机搅乱5颗棋子位置，适合打乱对手布局',
            mountainMover: '力拔山兮：随机移除3颗棋子，适合破坏棋局',
            timeRewind: '时光倒流：回退到上一回合，适合纠正不利局面'
        };

        const availableSkillsDesc = availableSkills.map(skill => 
            `- ${skillDescriptions[skill]}`
        ).join('\n');

        return `你是一个积极使用技能的五子棋AI，应该主动寻找使用技能的机会。

当前棋盘状态：
${boardStr}

可用技能：
${availableSkillsDesc}

**技能使用策略（优先级从高到低）**：
1. **防御优先**：如果对手有连线威胁，立即使用技能破坏
2. **主动出击**：即使局势平衡，也要主动使用技能创造优势
3. **早期使用**：游戏前中期就要积极使用技能，不要等到最后
4. **组合效应**：考虑技能与当前局面的配合效果

**使用建议**：
- 力拔山兮：当对手有2-3连线时使用，破坏其布局
- 飞沙走石：当棋局僵持时使用，打乱双方布局重新开始
- 时光倒流：当刚下了不利的棋时立即使用

**重要**：除非完全没有合适时机，否则应该倾向于使用技能！技能是获胜的重要工具！

请以JSON格式回复：
{
  "useSkill": true/false,
  "skillType": "技能类型(如果使用)",
  "reasoning": "决策理由"
}`;
    }

    /**
     * 调用qwen API
     * @param {string} prompt - 提示词
     * @returns {Promise<string>} API响应
     */
    async callQwenAPI(prompt) {
        const requestBody = {
            model: 'qwen-turbo',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            },
            parameters: {
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 0.9
            }
        };

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(this.baseURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-DashScope-SSE': 'disable'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.output && data.output.choices && data.output.choices[0]) {
                    return data.output.choices[0].message.content;
                } else {
                    throw new Error('API响应格式错误');
                }

            } catch (error) {
                console.warn(`API调用失败 (尝试 ${attempt + 1}/${this.maxRetries}):`, error.message);
                
                if (attempt === this.maxRetries - 1) {
                    throw error;
                }
                
                // 等待后重试
                await Utils.delay(1000 * (attempt + 1));
            }
        }
    }

    /**
     * 解析AI响应
     * @param {string} response - AI响应文本
     * @param {string} type - 响应类型 ('move' | 'skill')
     * @returns {Object} 解析后的决策
     */
    parseAIResponse(response, type) {
        try {
            // 尝试提取JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('响应中未找到JSON格式');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (type === 'move') {
                return this.validateMoveResponse(parsed);
            } else if (type === 'skill') {
                return this.validateSkillResponse(parsed);
            }

            throw new Error('未知响应类型');

        } catch (error) {
            console.error('解析AI响应失败:', error);
            
            if (type === 'move') {
                return this.getFallbackMove();
            } else {
                return { useSkill: false };
            }
        }
    }

    /**
     * 验证落子响应
     * @param {Object} response - 解析后的响应
     * @returns {Object} 验证后的落子决策
     */
    validateMoveResponse(response) {
        const { x, y, reasoning } = response;
        
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('坐标必须是数字');
        }
        
        if (!Utils.isValidCoordinate(x, y)) {
            throw new Error('坐标超出范围');
        }

        return {
            x: Math.floor(x),
            y: Math.floor(y),
            reasoning: reasoning || 'AI决策'
        };
    }

    /**
     * 验证技能响应
     * @param {Object} response - 解析后的响应
     * @returns {Object} 验证后的技能决策
     */
    validateSkillResponse(response) {
        const { useSkill, skillType, targets, reasoning } = response;
        
        if (typeof useSkill !== 'boolean') {
            return { useSkill: false };
        }

        if (!useSkill) {
            return { useSkill: false, reasoning };
        }

        if (!skillType || !GameConfig.SKILLS[skillType]) {
            return { useSkill: false };
        }

        const result = {
            useSkill: true,
            skillType,
            reasoning: reasoning || 'AI技能决策'
        };

        return result;
    }

    /**
     * 格式化棋盘状态供AI分析
     * @param {Array} boardState - 棋盘状态
     * @returns {string} 格式化的棋盘字符串
     */
    formatBoardForAI(boardState) {
        if (!boardState || !Array.isArray(boardState)) {
            return '空棋盘';
        }

        let result = '   ';
        for (let i = 0; i < 15; i++) {
            result += i.toString().padStart(2, ' ');
        }
        result += '\n';

        for (let x = 0; x < 15; x++) {
            result += x.toString().padStart(2, ' ') + ' ';
            for (let y = 0; y < 15; y++) {
                const piece = boardState[x] && boardState[x][y] ? boardState[x][y] : 0;
                result += piece.toString().padStart(2, ' ');
            }
            result += '\n';
        }

        return result;
    }

    /**
     * 格式化游戏历史供AI分析
     * @param {Array} gameHistory - 游戏历史
     * @returns {string} 格式化的历史字符串
     */
    formatHistoryForAI(gameHistory) {
        if (!gameHistory || gameHistory.length === 0) {
            return '暂无历史记录';
        }

        return gameHistory.slice(-6).map((move, index) => {
            const player = move.player === 1 ? '黑子' : '白子';
            return `${index + 1}. ${player}落子(${move.x}, ${move.y})`;
        }).join('\n');
    }

    /**
     * 使用智能AI获取落子决策
     * @param {Array} boardState - 棋盘状态
     * @returns {Object|null} 智能AI决策结果
     */
    getSmartAIMove(boardState) {
        try {
            const aiPlayer = GameConfig.PLAYER.AI;
            const humanPlayer = GameConfig.PLAYER.HUMAN;
            
            // 首先检查紧急威胁
            const urgentThreats = window.smartAI.findUrgentThreats(boardState, humanPlayer);
            if (urgentThreats.length > 0) {
                const threat = urgentThreats[0];
                return {
                    x: threat.x,
                    y: threat.y,
                    reasoning: '阻止对手获胜'
                };
            }

            // 使用智能AI获取最佳落子
            const bestMove = window.smartAI.getBestMove(boardState, aiPlayer, humanPlayer);
            if (bestMove) {
                return {
                    x: bestMove.x,
                    y: bestMove.y,
                    reasoning: bestMove.reasoning
                };
            }

            return null;
        } catch (error) {
            console.error('智能AI决策失败:', error);
            return null;
        }
    }

    /**
     * 获取后备落子方案（简单AI）
     * @param {Array} boardState - 棋盘状态
     * @returns {Object} 后备落子决策
     */
    getFallbackMove(boardState = null) {
        // 如果有棋盘状态，尝试简单的防守逻辑
        if (boardState && window.smartAI) {
            try {
                const move = window.smartAI.getBestMove(boardState, GameConfig.PLAYER.AI, GameConfig.PLAYER.HUMAN);
                if (move) {
                    return {
                        x: move.x,
                        y: move.y,
                        reasoning: '后备智能AI决策'
                    };
                }
            } catch (error) {
                console.warn('后备智能AI失败:', error);
            }
        }

        // 简单的后备AI逻辑
        if (boardState) {
            // 寻找空位
            for (let x = 0; x < 15; x++) {
                for (let y = 0; y < 15; y++) {
                    if (!boardState[x] || boardState[x][y] === 0) {
                        return {
                            x,
                            y,
                            reasoning: '简单后备AI决策'
                        };
                    }
                }
            }
        }

        // 随机落子
        const x = Utils.randomInt(0, 14);
        const y = Utils.randomInt(0, 14);
        
        return {
            x,
            y,
            reasoning: '随机落子'
        };
    }

    /**
     * 测试API连接
     * @returns {Promise<boolean>} 是否连接成功
     */
    async testConnection() {
        try {
            const testPrompt = '请回复"连接成功"';
            const response = await this.callQwenAPI(testPrompt);
            return response.includes('连接成功') || response.includes('成功');
        } catch (error) {
            console.error('API连接测试失败:', error);
            return false;
        }
    }

    /**
     * 获取AI状态信息
     * @returns {Object} AI状态
     */
    getStatus() {
        return {
            model: this.model,
            hasApiKey: !!this.apiKey,
            maxRetries: this.maxRetries,
            timeout: this.timeout
        };
    }
}