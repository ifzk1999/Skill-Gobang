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
        const pieceCount = this.countTotalPieces(boardState);
        
        // 检查是否有紧急情况需要使用技能（最高优先级）
        const urgentNeed = this.checkUrgentSkillNeed(boardState);
        if (urgentNeed.urgent) {
            return {
                useSkill: true,
                skillType: urgentNeed.recommendedSkill,
                reasoning: `紧急情况：${urgentNeed.reason}`
            };
        }
        
        // 游戏阶段判断 - 更保守的策略
        let useChance = 0;
        
        if (moveCount < 8) {
            // 超早期：几乎不使用技能，让游戏自然发展
            useChance = 0.05;
        } else if (moveCount < 15) {
            // 早期：很少使用，只在特殊情况下
            useChance = 0.1;
        } else if (moveCount < 25) {
            // 中期：开始考虑使用技能
            useChance = 0.25;
        } else if (moveCount < 35) {
            // 中后期：更积极使用
            useChance = 0.4;
        } else {
            // 后期：必要时使用
            useChance = 0.6;
        }
        
        // 根据棋盘复杂度调整
        const complexity = this.getBoardComplexity(boardState);
        if (complexity.hasThreats) {
            useChance += 0.3; // 有威胁时更倾向使用技能
        }
        if (complexity.isStalemate) {
            useChance += 0.2; // 僵局时考虑使用技能打破
        }
        
        // 如果是后备决策，适度提高概率
        if (fallback) {
            useChance += 0.2;
        }
        
        // 技能价值评估 - 只在有价值时使用
        const skillValue = this.evaluateSkillValue(boardState, availableSkills);
        if (skillValue.maxValue < 0.3) {
            useChance *= 0.5; // 技能价值低时降低使用概率
        }
        
        // 随机决策
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
        // 使用技能价值评估来选择最佳技能
        const skillValue = this.evaluateSkillValue(boardState, availableSkills);
        
        if (skillValue.bestSkill && skillValue.maxValue > 0.3) {
            return {
                skill: skillValue.bestSkill,
                reason: skillValue.reasoning
            };
        }
        
        // 如果没有高价值技能，使用保守策略
        const pieceCount = this.countTotalPieces(boardState);
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        
        // 优先级：防御 > 打破僵局 > 主动出击
        if (availableSkills.includes('mountainMover') && humanThreats.maxConsecutive >= 2) {
            return {
                skill: 'mountainMover',
                reason: '对手有连线威胁，使用力拔山兮进行防御'
            };
        }
        
        if (availableSkills.includes('flyingSand') && pieceCount > 18) {
            return {
                skill: 'flyingSand',
                reason: '棋局进入中后期，使用飞沙走石打破僵局'
            };
        }
        
        if (availableSkills.includes('timeRewind') && humanThreats.maxConsecutive > 2) {
            return {
                skill: 'timeRewind',
                reason: '对手获得优势，使用时光倒流重新布局'
            };
        }
        
        // 最后选择可用的技能
        if (availableSkills.length > 0) {
            return {
                skill: availableSkills[0],
                reason: '谨慎使用技能，寻找合适时机'
            };
        }
        
        return {
            skill: null,
            reason: '暂无合适的技能使用时机'
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
        const pieceCount = this.countTotalPieces(boardState);
        
        // 只在游戏后期且有明确价值时才考虑强制使用
        if (moveCount > 30) {
            // 检查是否有高价值的技能可用
            const skillValue = this.evaluateSkillValue(boardState, availableSkills);
            if (skillValue.maxValue > 0.4) {
                return Math.random() < 0.4; // 40%概率强制使用高价值技能
            }
        }
        
        if (moveCount > 40) {
            // 游戏很晚期，适度使用技能避免浪费
            return Math.random() < 0.3;
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
     * 评估棋盘复杂度
     * @param {Array} boardState - 棋盘状态
     * @returns {Object} 复杂度分析结果
     */
    getBoardComplexity(boardState) {
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        const aiThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.AI);
        
        const hasThreats = humanThreats.maxConsecutive >= 3 || aiThreats.maxConsecutive >= 3 ||
                          humanThreats.twoInARow >= 2 || aiThreats.twoInARow >= 2;
        
        const isStalemate = this.countTotalPieces(boardState) > 20 && 
                           humanThreats.maxConsecutive <= 2 && aiThreats.maxConsecutive <= 2;
        
        return {
            hasThreats,
            isStalemate,
            humanMaxConsecutive: humanThreats.maxConsecutive,
            aiMaxConsecutive: aiThreats.maxConsecutive,
            totalThreats: humanThreats.twoInARow + aiThreats.twoInARow
        };
    }

    /**
     * 评估技能使用价值
     * @param {Array} boardState - 棋盘状态
     * @param {Array} availableSkills - 可用技能列表
     * @returns {Object} 技能价值评估
     */
    evaluateSkillValue(boardState, availableSkills) {
        let maxValue = 0;
        let bestSkill = null;
        let reasoning = '';
        
        const pieceCount = this.countTotalPieces(boardState);
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        const aiThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.AI);
        
        availableSkills.forEach(skill => {
            let value = 0;
            let reason = '';
            
            switch (skill) {
                case 'mountainMover':
                    // 力拔山兮：在对手有威胁或棋盘拥挤时价值高
                    if (humanThreats.maxConsecutive >= 3) {
                        value = 0.9;
                        reason = '对手有3连威胁，急需破坏';
                    } else if (humanThreats.twoInARow >= 2) {
                        value = 0.6;
                        reason = '对手有多个2连，需要干扰';
                    } else if (pieceCount > 15) {
                        value = 0.4;
                        reason = '棋盘较拥挤，清理有价值';
                    } else {
                        value = 0.2;
                        reason = '当前使用价值较低';
                    }
                    break;
                    
                case 'flyingSand':
                    // 飞沙走石：在僵局或双方都有威胁时价值高
                    if (humanThreats.maxConsecutive >= 3 && aiThreats.maxConsecutive >= 3) {
                        value = 0.8;
                        reason = '双方都有威胁，重新洗牌有利';
                    } else if (pieceCount > 20 && humanThreats.maxConsecutive <= 2 && aiThreats.maxConsecutive <= 2) {
                        value = 0.7;
                        reason = '局面僵持，需要打破平衡';
                    } else if (humanThreats.maxConsecutive > aiThreats.maxConsecutive) {
                        value = 0.5;
                        reason = '对手局面更好，搅乱有利';
                    } else {
                        value = 0.3;
                        reason = '搅乱效果一般';
                    }
                    break;
                    
                case 'timeRewind':
                    // 时光倒流：在刚犯错误或对手刚获得优势时价值高
                    if (humanThreats.maxConsecutive >= 3) {
                        value = 0.7;
                        reason = '对手刚获得优势，回退有价值';
                    } else if (pieceCount >= 4 && aiThreats.maxConsecutive < humanThreats.maxConsecutive) {
                        value = 0.5;
                        reason = '局面不利，考虑重新开始';
                    } else {
                        value = 0.2;
                        reason = '当前回退价值不高';
                    }
                    break;
            }
            
            if (value > maxValue) {
                maxValue = value;
                bestSkill = skill;
                reasoning = reason;
            }
        });
        
        return {
            maxValue,
            bestSkill,
            reasoning
        };
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

        return `你是一个理性的五子棋AI，需要在合适的时机使用技能，而不是盲目使用。

当前棋盘状态：
${boardStr}

可用技能：
${availableSkillsDesc}

**技能使用原则（按重要性排序）**：
1. **紧急防御**：对手有4连或即将获胜时，必须立即使用技能阻止
2. **威胁应对**：对手有3连或多个2连时，考虑使用技能干扰
3. **打破僵局**：棋局进入中后期且双方都没有明显优势时，适时使用技能
4. **价值最大化**：只在技能能产生明显效果时使用，避免浪费

**技能特点分析**：
- 力拔山兮：最适合破坏对手的连线威胁，在防守时价值最高
- 飞沙走石：适合在棋局僵持或需要重新洗牌时使用
- 时光倒流：适合在对手刚获得优势或自己犯错后使用

**使用时机建议**：
- 游戏前8步：几乎不使用，让棋局自然发展
- 游戏8-15步：只在紧急情况下使用
- 游戏15-25步：开始考虑使用，但要有明确价值
- 游戏25步以后：更积极使用，但仍要评估效果

**重要提醒**：技能是有限资源，要在最关键的时刻使用才能发挥最大价值！

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