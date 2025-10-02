/**
 * 增强AI系统 - 集成强化学习的智能AI
 */
class EnhancedAI extends SmartAI {
    constructor() {
        super();
        this.rl = window.reinforcementLearning;
        this.useReinforcement = true;
        this.adaptiveWeights = true;
        
        // 学习统计
        this.learningStats = {
            movesEvaluated: 0,
            correctPredictions: 0,
            winningMovesFound: 0,
            skillsUsedWisely: 0
        };
        
        // 动态调整的权重
        this.dynamicWeights = {
            positionValue: 1.0,
            patternRecognition: 1.0,
            threatAssessment: 1.0,
            skillTiming: 1.0
        };
    }

    /**
     * 获取最佳落子位置（增强版）
     */
    getBestMove(boardState, aiPlayer = 2, humanPlayer = 1) {
        this.learningStats.movesEvaluated++;
        
        // 如果启用强化学习，优先使用学习后的策略
        if (this.useReinforcement && this.rl) {
            const rlMove = this.getRLMove(boardState, aiPlayer, humanPlayer);
            if (rlMove && rlMove.confidence > 0.7) {
                return rlMove;
            }
        }
        
        // 使用增强的传统算法
        return this.getEnhancedTraditionalMove(boardState, aiPlayer, humanPlayer);
    }

    /**
     * 使用强化学习获取移动
     */
    getRLMove(boardState, aiPlayer, humanPlayer) {
        try {
            const availableSkills = this.getAvailableSkills();
            const move = this.rl.selectMoveWithPolicy(boardState, aiPlayer, availableSkills);
            
            if (move && move.x !== undefined && move.y !== undefined) {
                // 评估移动的置信度
                const confidence = this.evaluateMoveConfidence(boardState, move, aiPlayer);
                
                return {
                    x: move.x,
                    y: move.y,
                    score: move.value || 0,
                    reasoning: `强化学习决策 (置信度: ${(confidence * 100).toFixed(1)}%)`,
                    confidence: confidence,
                    source: 'reinforcement_learning'
                };
            }
        } catch (error) {
            console.warn('强化学习决策失败，使用传统算法:', error);
        }
        
        return null;
    }

    /**
     * 获取增强的传统移动
     */
    getEnhancedTraditionalMove(boardState, aiPlayer, humanPlayer) {
        const emptyPositions = this.getEmptyPositions(boardState);
        
        if (emptyPositions.length === 0) {
            return null;
        }

        // 开局优化
        if (emptyPositions.length >= 220) {
            return this.getOptimizedOpeningMove(boardState);
        }

        // 必胜检查（增强版）
        const winMove = this.findCriticalMove(boardState, aiPlayer, 'win');
        if (winMove) {
            this.learningStats.winningMovesFound++;
            winMove.reasoning = '发现必胜机会';
            return winMove;
        }

        // 必防检查（增强版）
        const blockMove = this.findCriticalMove(boardState, humanPlayer, 'block');
        if (blockMove) {
            blockMove.reasoning = '阻止对手获胜';
            return blockMove;
        }

        // 高级战术检查
        if (this.difficulty === 'hard') {
            const tacticMove = this.findAdvancedTacticMove(boardState, aiPlayer);
            if (tacticMove) {
                return tacticMove;
            }
        }

        // 使用动态权重评估所有位置
        return this.evaluateAllPositionsWithDynamicWeights(boardState, aiPlayer, humanPlayer);
    }

    /**
     * 寻找关键移动（必胜/必防）
     */
    findCriticalMove(boardState, player, type) {
        const emptyPositions = this.getEmptyPositions(boardState);
        const criticalMoves = [];

        for (const pos of emptyPositions) {
            // 临时放置棋子
            boardState[pos.x][pos.y] = player;
            
            // 检查是否形成5连
            if (this.checkWin(boardState, pos.x, pos.y, player)) {
                boardState[pos.x][pos.y] = 0; // 恢复
                return {
                    x: pos.x,
                    y: pos.y,
                    score: type === 'win' ? this.SCORES.WIN : this.SCORES.BLOCK_WIN,
                    source: 'critical_analysis'
                };
            }
            
            // 检查是否形成活四
            const threatLevel = this.analyzeThreatLevel(boardState, pos.x, pos.y, player);
            if (threatLevel >= 4) {
                criticalMoves.push({
                    x: pos.x,
                    y: pos.y,
                    score: threatLevel * 1000,
                    threatLevel: threatLevel
                });
            }
            
            boardState[pos.x][pos.y] = 0; // 恢复
        }

        // 返回威胁等级最高的移动
        if (criticalMoves.length > 0) {
            criticalMoves.sort((a, b) => b.score - a.score);
            return criticalMoves[0];
        }

        return null;
    }

    /**
     * 分析威胁等级
     */
    analyzeThreatLevel(boardState, x, y, player) {
        let maxThreat = 0;
        
        for (const [dx, dy] of this.DIRECTIONS) {
            const lineInfo = this.analyzeLineAdvanced(boardState, x, y, dx, dy, player);
            
            if (lineInfo.count >= 4) {
                maxThreat = Math.max(maxThreat, 5); // 必胜威胁
            } else if (lineInfo.count === 3 && !lineInfo.leftBlocked && !lineInfo.rightBlocked) {
                maxThreat = Math.max(maxThreat, 4); // 活三威胁
            } else if (lineInfo.count === 3) {
                maxThreat = Math.max(maxThreat, 3); // 眠三威胁
            } else if (lineInfo.count === 2 && !lineInfo.leftBlocked && !lineInfo.rightBlocked) {
                maxThreat = Math.max(maxThreat, 2); // 活二威胁
            }
        }
        
        return maxThreat;
    }

    /**
     * 优化的开局移动
     */
    getOptimizedOpeningMove(boardState) {
        // 检查是否是第一步
        const totalPieces = this.countTotalPieces(boardState);
        
        if (totalPieces === 0) {
            // 第一步：天元
            return {
                x: 7, y: 7,
                score: 1000,
                reasoning: '开局天元，占据中心'
            };
        } else if (totalPieces === 1) {
            // 第二步：寻找最佳应对
            return this.getSecondMoveOptimal(boardState);
        } else {
            // 后续开局：使用开局库
            return this.getOpeningBookMove(boardState) || this.getOpeningMove(boardState);
        }
    }

    /**
     * 获取最佳第二步
     */
    getSecondMoveOptimal(boardState) {
        // 找到对手的第一步
        let opponentMove = null;
        for (let x = 0; x < 15; x++) {
            for (let y = 0; y < 15; y++) {
                if (boardState[x][y] !== 0) {
                    opponentMove = { x, y };
                    break;
                }
            }
            if (opponentMove) break;
        }

        if (!opponentMove) return this.getOpeningMove(boardState);

        // 计算与对手棋子的距离
        const distance = Math.abs(opponentMove.x - 7) + Math.abs(opponentMove.y - 7);
        
        if (distance <= 2) {
            // 对手在中心附近，采用贴身战术
            const candidates = [
                { x: opponentMove.x + 1, y: opponentMove.y },
                { x: opponentMove.x - 1, y: opponentMove.y },
                { x: opponentMove.x, y: opponentMove.y + 1 },
                { x: opponentMove.x, y: opponentMove.y - 1 },
                { x: opponentMove.x + 1, y: opponentMove.y + 1 },
                { x: opponentMove.x - 1, y: opponentMove.y - 1 }
            ];
            
            for (const pos of candidates) {
                if (this.isValidPosition(pos.x, pos.y, 15) && boardState[pos.x][pos.y] === 0) {
                    return {
                        x: pos.x, y: pos.y,
                        score: 800,
                        reasoning: '贴身防守，限制对手发展'
                    };
                }
            }
        }

        // 默认占据另一个好位置
        return {
            x: 7, y: 7,
            score: 600,
            reasoning: '占据中心要点'
        };
    }

    /**
     * 使用动态权重评估所有位置
     */
    evaluateAllPositionsWithDynamicWeights(boardState, aiPlayer, humanPlayer) {
        const emptyPositions = this.getEmptyPositions(boardState);
        const moves = [];

        for (const pos of emptyPositions) {
            const score = this.evaluatePositionEnhanced(boardState, pos.x, pos.y, aiPlayer, humanPlayer);
            moves.push({
                x: pos.x,
                y: pos.y,
                score: score,
                reasoning: this.getReasoningForScore(score)
            });
        }

        // 按分数排序
        moves.sort((a, b) => b.score - a.score);
        
        // 应用学习到的权重调整
        if (this.adaptiveWeights && moves.length > 0) {
            this.adjustMoveScores(moves, boardState);
        }

        // 根据难度决定是否犯错
        if (this.mistakeChance > 0 && Math.random() < this.mistakeChance) {
            const topMoves = moves.slice(0, Math.min(3, moves.length));
            const randomIndex = Math.floor(Math.random() * topMoves.length);
            const selectedMove = topMoves[randomIndex];
            selectedMove.reasoning += ' (随机选择)';
            return selectedMove;
        }

        return moves[0];
    }

    /**
     * 增强的位置评估
     */
    evaluatePositionEnhanced(boardState, x, y, aiPlayer, humanPlayer) {
        let score = 0;

        // 临时放置AI棋子
        boardState[x][y] = aiPlayer;
        
        // AI攻击价值（使用动态权重）
        const aiAttackScore = this.getAttackScore(boardState, x, y, aiPlayer) * this.dynamicWeights.patternRecognition;
        score += aiAttackScore;
        
        // 高级战术检测
        if (this.difficulty === 'hard') {
            const advancedTactics = this.checkAdvancedTactics(boardState, x, y, aiPlayer) * this.dynamicWeights.threatAssessment;
            score += advancedTactics;
        }

        // 恢复原状态
        boardState[x][y] = 0;

        // 临时放置人类棋子，检查防守价值
        boardState[x][y] = humanPlayer;
        const humanAttackScore = this.getAttackScore(boardState, x, y, humanPlayer);
        let defenseScore = humanAttackScore * (this.difficulty === 'hard' ? 1.3 : 0.9);
        
        // 高级防守检测
        if (this.difficulty === 'hard') {
            const blockAdvancedTactics = this.checkAdvancedTactics(boardState, x, y, humanPlayer);
            if (blockAdvancedTactics > 0) {
                defenseScore += blockAdvancedTactics * 0.9 * this.dynamicWeights.threatAssessment;
            }
        }
        
        score += defenseScore;

        // 恢复原状态
        boardState[x][y] = 0;

        // 位置价值（使用动态权重）
        const centerBonus = this.getCenterBonus(x, y) * this.dynamicWeights.positionValue;
        score += centerBonus;

        // 如果启用强化学习，添加学习到的位置价值
        if (this.useReinforcement && this.rl && this.rl.policyWeights) {
            const learnedValue = this.rl.policyWeights.positionValues[x][y] || 0;
            score += learnedValue * 10; // 放大学习到的权重
        }

        return score;
    }

    /**
     * 调整移动分数（基于学习经验）
     */
    adjustMoveScores(moves, boardState) {
        // 基于历史表现调整分数
        for (const move of moves) {
            // 如果这个位置在历史中表现良好，提升分数
            const historicalValue = this.getHistoricalValue(move.x, move.y);
            move.score += historicalValue;
            
            // 基于当前局面的相似性调整
            const similarityBonus = this.getSimilarityBonus(boardState, move);
            move.score += similarityBonus;
        }
        
        // 重新排序
        moves.sort((a, b) => b.score - a.score);
    }

    /**
     * 获取历史价值
     */
    getHistoricalValue(x, y) {
        if (!this.rl || !this.rl.policyWeights) return 0;
        return this.rl.policyWeights.positionValues[x][y] || 0;
    }

    /**
     * 获取相似性奖励
     */
    getSimilarityBonus(boardState, move) {
        // 简化的相似性计算
        // 在实际实现中，这里可以使用更复杂的模式匹配
        return 0;
    }

    /**
     * 评估移动置信度
     */
    evaluateMoveConfidence(boardState, move, player) {
        // 基于多个因素计算置信度
        let confidence = 0.5; // 基础置信度
        
        // 威胁等级影响置信度
        const threatLevel = this.analyzeThreatLevel(boardState, move.x, move.y, player);
        confidence += threatLevel * 0.1;
        
        // 位置价值影响置信度
        const centerDistance = Math.abs(move.x - 7) + Math.abs(move.y - 7);
        confidence += (14 - centerDistance) / 28; // 越靠近中心置信度越高
        
        // 学习经验影响置信度
        if (this.rl && this.rl.trainingStats.gamesPlayed > 100) {
            confidence += 0.2; // 训练充分的AI置信度更高
        }
        
        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * 获取可用技能（模拟）
     */
    getAvailableSkills() {
        // 这里应该从游戏控制器获取实际的可用技能
        return ['timeRewind', 'mountainMover', 'flyingSand'];
    }

    /**
     * 计算棋盘上的总棋子数
     */
    countTotalPieces(boardState) {
        let count = 0;
        for (let x = 0; x < 15; x++) {
            for (let y = 0; y < 15; y++) {
                if (boardState[x][y] !== 0) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 获取开局库移动
     */
    getOpeningBookMove(boardState) {
        // 简化的开局库
        // 在实际实现中，这里可以包含更多的开局定式
        return null;
    }

    /**
     * 更新学习统计
     */
    updateLearningStats(result) {
        if (result.correct) {
            this.learningStats.correctPredictions++;
        }
        if (result.foundWinningMove) {
            this.learningStats.winningMovesFound++;
        }
        if (result.skillUsedWisely) {
            this.learningStats.skillsUsedWisely++;
        }
    }

    /**
     * 获取学习统计
     */
    getLearningStats() {
        return {
            ...this.learningStats,
            accuracy: this.learningStats.movesEvaluated > 0 ? 
                     this.learningStats.correctPredictions / this.learningStats.movesEvaluated : 0,
            winningMoveRate: this.learningStats.movesEvaluated > 0 ? 
                            this.learningStats.winningMovesFound / this.learningStats.movesEvaluated : 0
        };
    }

    /**
     * 启用/禁用强化学习
     */
    setReinforcementLearning(enabled) {
        this.useReinforcement = enabled;
        console.log(`强化学习已${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 启用/禁用自适应权重
     */
    setAdaptiveWeights(enabled) {
        this.adaptiveWeights = enabled;
        console.log(`自适应权重已${enabled ? '启用' : '禁用'}`);
    }
}

// 创建增强AI实例
window.enhancedAI = new EnhancedAI();
