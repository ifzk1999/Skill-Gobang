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
        
        // 【策略文档核心规则1】开局阶段：绝对不要使用任何技能
        if (moveCount < 16) {  // 前8回合（16步）绝对不使用
            return {
                useSkill: false,
                reasoning: '开局阶段，按策略文档绝对不使用技能'
            };
        }
        
        // 【策略文档核心规则2】分析当前局势和威胁
        const threatAnalysis = this.analyzeGameSituation(boardState, moveCount);
        
        // 【时光倒流】最高优先级 - 精确的"否定权"
        if (availableSkills.includes('timeRewind')) {
            const timeRewindDecision = this.shouldUseTimeRewind(threatAnalysis);
            if (timeRewindDecision.use) {
                return {
                    useSkill: true,
                    skillType: 'timeRewind',
                    reasoning: timeRewindDecision.reason
                };
            }
        }
        
        // 【力拔山兮】高风险搅局技能 - 只在劣势时使用
        if (availableSkills.includes('mountainMover')) {
            const mountainMoverDecision = this.shouldUseMountainMover(threatAnalysis);
            if (mountainMoverDecision.use) {
                return {
                    useSkill: true,
                    skillType: 'mountainMover',
                    reasoning: mountainMoverDecision.reason
                };
            }
        }
        
        // 【飞沙走石】终极绝望选择 - 最后的希望
        if (availableSkills.includes('flyingSand')) {
            const flyingSandDecision = this.shouldUseFlySand(threatAnalysis);
            if (flyingSandDecision.use) {
                return {
                    useSkill: true,
                    skillType: 'flyingSand',
                    reasoning: flyingSandDecision.reason
                };
            }
        }
        
        return {
            useSkill: false,
            reasoning: '当前局面不符合策略文档中任何技能使用条件'
        };
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
        
        return `你是一个大师级五子棋AI，拥有深厚的棋理功底和完美的计算能力。你的目标是展现五子棋的最高水平，做到近乎无敌。

游戏规则：
- 15x15棋盘，先连成5子者获胜
- 你是白子(2)，对手是黑子(1)，空位是0
- 坐标从(0,0)到(14,14)

当前棋盘状态：
${boardStr}

最近几步历史：
${historyStr}

可用技能：${availableSkills.join(', ')}

**核心战略原则**：
1. **先手占优，抢占中心**：开局必须控制中心区域(6-8,6-8)，形成"势"
2. **攻防兼备**：最好的防守就是进攻，在防守的同时制造威胁
3. **制造多重威胁**：迫使对手"防不胜防"，形成"双三"或"四三"必胜局
4. **深度计算**：每步棋都要看到至少3-5步后的变化

**战术优先级（严格按顺序执行）**：

**第一优先级 - 必胜检查**：
1. 检查是否能形成"四三"（同时活四+活三）→ 立即执行，这是必胜棋
2. 检查是否能形成"双三"（同时两个活三）→ 立即执行，这是必胜棋
3. 检查是否有直接获胜的5连 → 立即执行

**第二优先级 - 必防检查**：
1. 对手是否有5连威胁 → 必须阻止
2. 对手是否能形成"四三"或"双三" → 必须阻止，这是生死关头
3. 对手是否有活4连 → 必须防守
4. 对手是否有活3连 → 必须防守

**第三优先级 - 战略进攻**：
1. 创造自己的活4连，迫使对手防守
2. 创造自己的活3连，为"四三"做准备
3. 形成多个活2连，制造多重威胁
4. 占据关键点位，限制对手发展

**第四优先级 - 高级战术**：
1. **VCF战术**：通过连续冲四强制获胜
2. **VCT战术**：通过连续威胁强制获胜
3. **阻断战术**：切断对手的连线可能性
4. **牵制战术**：用假威胁吸引对手注意力

**第五优先级 - 位置价值**：
1. 中心区域价值最高（7,7为最佳，6-8,6-8为优秀）
2. 次中心区域（距离中心2-3格）
3. 能同时威胁多个方向的交叉点
4. 避免边角区域（除非有特殊战术目的）

**计算深度要求**：
- 每个候选位置必须计算至少3步后的局面
- 关键位置必须计算到5步以上
- 考虑对手的最佳应对，不能有侥幸心理
- 评估每步棋的攻防价值

**绝对禁止**：
1. 不能下无意义的棋（没有攻防价值）
2. 不能给对手送礼（创造对手的进攻机会）
3. 不能忽视对手的威胁，哪怕是潜在威胁
4. 不能在劣势时保守，必须积极寻找反击机会
5. 不能浪费先手优势

**特殊情况处理**：
- 开局：必须抢占中心，首选(7,7)，次选周围一格
- 中盘：专注于制造"活三"和"双威胁"
- 残局：计算精确，不给对手任何机会

请以JSON格式回复：
{
  "x": 落子x坐标(0-14),
  "y": 落子y坐标(0-14),
  "reasoning": "详细的决策理由，必须包括：1.威胁分析 2.候选点评估 3.选择理由 4.后续计划"
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

        return `你是一个大师级五子棋AI，拥有完美的技能使用策略。技能是你的战术武器，必须在最关键的时刻发挥最大价值。

当前棋盘状态：
${boardStr}

可用技能：
${availableSkillsDesc}

**技能战略价值排序**：
1. **时光倒流** - 最重要的战术武器，精确的"否定权"
2. **力拔山兮** - 高风险高收益的搅局技能
3. **飞沙走石** - 终极绝望彩票，最后的选择

**时光倒流使用策略**：
这是你最重要的技能，是战术核心，必须珍惜使用：

**立即使用的情况**：
- 对手刚走出"四三"或"双三"等必胜棋 → 立即使用，这是免死金牌
- 对手刚获得决定性优势，而你有更好的应对 → 立即使用
- 你刚犯重大失误，给对手送去绝佳进攻点 → 立即使用

**威慑价值**：
- 只要你还有这个技能，对手就会有心理压力
- 不要轻易使用，让对手知道你有这个底牌

**力拔山兮使用策略**：
高风险搅局技能，谨慎使用：

**适合使用的情况**：
- 处于绝对劣势，对手形成多个威胁点，败局已定
- 对手即将形成但尚未形成必杀棋，有多个潜力点
- 你感觉步步受制，需要赌一把运气

**绝对禁止**：
- 优势时绝对不要用！会自毁长城
- 要有赌输的心理准备

**飞沙走石使用策略**：
终极混沌炸弹，最后的选择：

**只在以下情况使用**：
- 对手已经走出必杀棋，时光倒流已用完，这是最后希望
- 棋局陷入死寂僵局，双方都无法进攻

**绝对警告**：
- 这是最后的选择，99%会让局面更糟
- 将胜负完全交给运气

**使用时机判断**：

**开局阶段（前10步）**：
- 绝对不要使用任何技能，这是最大的浪费
- 专注于标准五子棋策略

**中盘阶段（10-25步）**：
- 时光倒流作为威慑和底牌，不轻易使用
- 只有在生死关头才考虑力拔山兮

**终局阶段（25步以后）**：
- 如果占优：不使用随机技能，用棋力压制
- 如果劣势：
  * 对手必杀 → 时光倒流
  * 时光倒流已用，对手即将必杀 → 力拔山兮
  * 所有技能用尽或无力回天 → 飞沙走石

**心理博弈**：
- 让对手知道你有技能，特别是时光倒流
- 造成心理压力，迫使对手不敢冒险

请以JSON格式回复：
{
  "useSkill": true/false,
  "skillType": "技能类型(如果使用)",
  "reasoning": "详细决策理由，包括当前局势分析和技能价值评估"
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

    /**
     * 分析游戏局势
     * @param {Array} boardState - 棋盘状态
     * @param {number} moveCount - 步数
     * @returns {Object} 局势分析结果
     */
    analyzeGameSituation(boardState, moveCount) {
        const aiThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.AI);
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        
        // 判断游戏阶段
        let gamePhase = 'opening';
        if (moveCount >= 16 && moveCount < 30) gamePhase = 'middle';
        else if (moveCount >= 30) gamePhase = 'endgame';
        
        // 判断优劣势
        let advantage = 'neutral';
        if (humanThreats.maxConsecutive >= 3 || humanThreats.twoInARow >= 2) {
            advantage = 'disadvantage'; // AI劣势
        } else if (aiThreats.maxConsecutive >= 3 || aiThreats.twoInARow >= 2) {
            advantage = 'advantage'; // AI优势
        }
        
        // 检测紧急威胁
        const emergencyThreats = {
            humanWinThreat: humanThreats.maxConsecutive >= 4,
            humanMultipleThreats: humanThreats.threeInARow >= 1 || humanThreats.twoInARow >= 3,
            aiWinThreat: aiThreats.maxConsecutive >= 4,
            stalemate: this.isStalemate(boardState)
        };
        
        return {
            gamePhase,
            advantage,
            aiThreats,
            humanThreats,
            emergencyThreats,
            moveCount
        };
    }

    /**
     * 时光倒流决策 - 最重要的技能
     * @param {Object} threatAnalysis - 威胁分析结果
     * @returns {Object} 决策结果
     */
    shouldUseTimeRewind(threatAnalysis) {
        // 策略文档：破解对方的必杀棋
        if (threatAnalysis.emergencyThreats.humanWinThreat) {
            return {
                use: true,
                reason: '对手有必杀威胁，使用时光倒流否定其关键棋步'
            };
        }
        
        // 策略文档：对手刚形成四三或双三等必胜棋
        if (threatAnalysis.humanThreats.threeInARow >= 2) {
            return {
                use: true,
                reason: '对手形成双三威胁，使用时光倒流破解'
            };
        }
        
        // 策略文档：对手即将形成不可防守的威胁
        if (threatAnalysis.emergencyThreats.humanMultipleThreats && 
            threatAnalysis.gamePhase === 'endgame') {
            return {
                use: true,
                reason: '对手多重威胁，终局阶段使用时光倒流'
            };
        }
        
        return { use: false };
    }

    /**
     * 力拔山兮决策 - 劣势搅局技能
     * @param {Object} threatAnalysis - 威胁分析结果
     * @returns {Object} 决策结果
     */
    shouldUseMountainMover(threatAnalysis) {
        // 策略文档：优势时绝对不要用
        if (threatAnalysis.advantage === 'advantage') {
            return { use: false };
        }
        
        // 策略文档：处于绝对劣势时
        if (threatAnalysis.advantage === 'disadvantage' && 
            threatAnalysis.emergencyThreats.humanMultipleThreats) {
            return {
                use: true,
                reason: '处于绝对劣势，对手多重威胁，使用力拔山兮搅局'
            };
        }
        
        // 策略文档：对方即将形成但尚未形成必杀棋
        if (threatAnalysis.humanThreats.maxConsecutive === 3 && 
            threatAnalysis.humanThreats.twoInARow >= 2) {
            return {
                use: true,
                reason: '对手即将形成必杀棋，使用力拔山兮破坏布局'
            };
        }
        
        return { use: false };
    }

    /**
     * 飞沙走石决策 - 绝望时的最后选择
     * @param {Object} threatAnalysis - 威胁分析结果
     * @returns {Object} 决策结果
     */
    shouldUseFlySand(threatAnalysis) {
        // 策略文档：必输无疑的最后挣扎
        if (threatAnalysis.emergencyThreats.humanWinThreat && 
            threatAnalysis.gamePhase === 'endgame') {
            return {
                use: true,
                reason: '对手已有必杀棋，最后的绝望挣扎'
            };
        }
        
        // 策略文档：棋局陷入死寂僵局
        if (threatAnalysis.emergencyThreats.stalemate && 
            threatAnalysis.moveCount > 40) {
            return {
                use: true,
                reason: '棋局陷入僵局，使用飞沙走石打破'
            };
        }
        
        return { use: false };
    }

    /**
     * 检测是否僵局
     * @param {Array} boardState - 棋盘状态
     * @returns {boolean} 是否僵局
     */
    isStalemate(boardState) {
        // 简单的僵局检测：棋盘大部分被占用但没有明显威胁
        const totalPieces = this.countTotalPieces(boardState);
        return totalPieces > 100 && !this.hasSignificantThreats(boardState);
    }

    /**
     * 检测是否有重大威胁
     * @param {Array} boardState - 棋盘状态
     * @returns {boolean} 是否有重大威胁
     */
    hasSignificantThreats(boardState) {
        const aiThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.AI);
        const humanThreats = this.countConsecutivePieces(boardState, GameConfig.PLAYER.HUMAN);
        
        return aiThreats.maxConsecutive >= 3 || humanThreats.maxConsecutive >= 3 ||
               aiThreats.twoInARow >= 2 || humanThreats.twoInARow >= 2;
    }
}