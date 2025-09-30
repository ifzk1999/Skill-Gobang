/**
 * 胜负判定器 - 检查游戏胜负条件
 */
class WinChecker {
    /**
     * 检查是否有玩家获胜
     * @param {BoardManager} boardManager - 棋盘管理器
     * @param {Object} lastMove - 最后一步棋 {x, y, player}
     * @returns {number|null} 获胜玩家，null表示无人获胜
     */
    static checkWin(boardManager, lastMove) {
        if (!lastMove) return null;
        
        const { x, y, player } = lastMove;
        const board = boardManager.board;
        
        // 检查四个方向：水平、垂直、主对角线、副对角线
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 主对角线
            [1, -1]   // 副对角线
        ];
        
        for (const [dx, dy] of directions) {
            if (this.checkDirection(board, x, y, dx, dy, player)) {
                return player;
            }
        }
        
        return null;
    }

    /**
     * 检查指定方向是否有五子连线
     * @param {Array} board - 棋盘数组
     * @param {number} x - 起始x坐标
     * @param {number} y - 起始y坐标
     * @param {number} dx - x方向增量
     * @param {number} dy - y方向增量
     * @param {number} player - 玩家标识
     * @returns {boolean} 是否有五子连线
     */
    static checkDirection(board, x, y, dx, dy, player) {
        let count = 1; // 包含当前位置
        
        // 向正方向检查
        let nx = x + dx;
        let ny = y + dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            count++;
            nx += dx;
            ny += dy;
        }
        
        // 向负方向检查
        nx = x - dx;
        ny = y - dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            count++;
            nx -= dx;
            ny -= dy;
        }
        
        return count >= 5;
    }

    /**
     * 检查位置是否有效
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} size - 棋盘大小
     * @returns {boolean} 是否有效
     */
    static isValidPosition(x, y, size) {
        return x >= 0 && x < size && y >= 0 && y < size;
    }

    /**
     * 检查是否平局
     * @param {BoardManager} boardManager - 棋盘管理器
     * @returns {boolean} 是否平局
     */
    static isDraw(boardManager) {
        return boardManager.isFull();
    }

    /**
     * 获取获胜线
     * @param {BoardManager} boardManager - 棋盘管理器
     * @param {Object} lastMove - 最后一步棋
     * @returns {Array|null} 获胜线位置数组
     */
    static getWinningLine(boardManager, lastMove) {
        if (!lastMove) return null;
        
        const { x, y, player } = lastMove;
        const board = boardManager.board;
        
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            const line = this.getDirectionLine(board, x, y, dx, dy, player);
            if (line) {
                return line;
            }
        }
        
        return null;
    }

    /**
     * 获取指定方向的连线
     * @param {Array} board - 棋盘数组
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} dx - x方向增量
     * @param {number} dy - y方向增量
     * @param {number} player - 玩家标识
     * @returns {Array|null} 连线位置数组
     */
    static getDirectionLine(board, x, y, dx, dy, player) {
        const line = [{x, y}];
        
        // 向正方向收集
        let nx = x + dx;
        let ny = y + dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            line.push({x: nx, y: ny});
            nx += dx;
            ny += dy;
        }
        
        // 向负方向收集
        nx = x - dx;
        ny = y - dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            line.unshift({x: nx, y: ny});
            nx -= dx;
            ny -= dy;
        }
        
        return line.length >= 5 ? line : null;
    }

    /**
     * 检查指定位置是否可能形成威胁
     * @param {BoardManager} boardManager - 棋盘管理器
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} player - 玩家标识
     * @returns {number} 威胁等级 (0-4)
     */
    static getThreatLevel(boardManager, x, y, player) {
        if (!boardManager.isEmpty(x, y)) return 0;
        
        const board = boardManager.board;
        let maxThreat = 0;
        
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            const threat = this.getDirectionThreat(board, x, y, dx, dy, player);
            maxThreat = Math.max(maxThreat, threat);
        }
        
        return maxThreat;
    }

    /**
     * 获取指定方向的威胁等级
     * @param {Array} board - 棋盘数组
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} dx - x方向增量
     * @param {number} dy - y方向增量
     * @param {number} player - 玩家标识
     * @returns {number} 威胁等级
     */
    static getDirectionThreat(board, x, y, dx, dy, player) {
        let count = 0;
        
        // 向正方向计数
        let nx = x + dx;
        let ny = y + dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            count++;
            nx += dx;
            ny += dy;
        }
        
        // 向负方向计数
        nx = x - dx;
        ny = y - dy;
        while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
            count++;
            nx -= dx;
            ny -= dy;
        }
        
        return count;
    }

    /**
     * 检查指定位置是否能形成威胁（四子连线）
     * @param {BoardManager} boardManager - 棋盘管理器
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} player - 玩家标识
     * @returns {boolean} 是否形成威胁
     */
    static checkThreat(boardManager, x, y, player) {
        const board = boardManager.board;
        const directions = [
            [0, 1], [1, 0], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            let count = 1;
            
            // 向正方向检查
            let nx = x + dx;
            let ny = y + dy;
            while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
                count++;
                nx += dx;
                ny += dy;
            }
            
            // 向负方向检查
            nx = x - dx;
            ny = y - dy;
            while (this.isValidPosition(nx, ny, board.length) && board[nx][ny] === player) {
                count++;
                nx -= dx;
                ny -= dy;
            }
            
            if (count >= 4) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 获取所有威胁位置
     * @param {BoardManager} boardManager - 棋盘管理器
     * @param {number} player - 玩家标识
     * @returns {Array} 威胁位置数组
     */
    static getAllThreats(boardManager, player) {
        const threats = [];
        const emptyPositions = boardManager.getEmptyPositions();
        
        for (const pos of emptyPositions) {
            if (this.checkThreat(boardManager, pos.x, pos.y, player)) {
                threats.push(pos);
            }
        }
        
        return threats;
    }
}