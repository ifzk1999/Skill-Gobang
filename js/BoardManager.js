/**
 * 棋盘管理器 - 管理棋盘状态和棋子操作
 */
class BoardManager {
    constructor(size = GameConfig.BOARD_SIZE) {
        this.size = size;
        this.board = this.createEmptyBoard();
    }

    /**
     * 创建空棋盘
     * @returns {Array} 二维数组表示的空棋盘
     */
    createEmptyBoard() {
        return Array(this.size).fill().map(() => Array(this.size).fill(GameConfig.PLAYER.EMPTY));
    }

    /**
     * 在指定位置放置棋子
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} player - 玩家标识
     * @returns {boolean} 是否成功放置
     */
    placePiece(x, y, player) {
        if (!this.isValidPosition(x, y) || this.board[x][y] !== GameConfig.PLAYER.EMPTY) {
            return false;
        }
        this.board[x][y] = player;
        return true;
    }

    /**
     * 移除指定位置的棋子
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {number} 被移除的棋子类型
     */
    removePiece(x, y) {
        if (!this.isValidPosition(x, y)) {
            return GameConfig.PLAYER.EMPTY;
        }
        const piece = this.board[x][y];
        this.board[x][y] = GameConfig.PLAYER.EMPTY;
        return piece;
    }

    /**
     * 获取指定位置的棋子
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {number} 棋子类型
     */
    getPiece(x, y) {
        if (!this.isValidPosition(x, y)) {
            return GameConfig.PLAYER.EMPTY;
        }
        return this.board[x][y];
    }

    /**
     * 获取所有空白位置
     * @returns {Array} 空白位置数组 [{x, y}, ...]
     */
    getEmptyPositions() {
        const positions = [];
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.board[x][y] === GameConfig.PLAYER.EMPTY) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }

    /**
     * 获取所有棋子位置
     * @param {number} player - 玩家标识，不指定则返回所有棋子
     * @returns {Array} 棋子位置数组 [{x, y, player}, ...]
     */
    getAllPieces(player = null) {
        const pieces = [];
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                const piece = this.board[x][y];
                if (piece !== GameConfig.PLAYER.EMPTY) {
                    if (player === null || piece === player) {
                        pieces.push({ x, y, player: piece });
                    }
                }
            }
        }
        return pieces;
    }

    /**
     * 检查指定位置是否为空
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {boolean} 是否为空
     */
    isEmpty(x, y) {
        return this.getPiece(x, y) === GameConfig.PLAYER.EMPTY;
    }

    /**
     * 检查位置是否有效
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {boolean} 是否有效
     */
    isValidPosition(x, y) {
        return Utils.isValidCoordinate(x, y, this.size);
    }

    /**
     * 重置棋盘
     */
    reset() {
        this.board = this.createEmptyBoard();
    }

    /**
     * 将棋盘转换为字符串表示
     * @returns {string} 棋盘字符串
     */
    toString() {
        return this.board.map(row => 
            row.map(cell => cell.toString()).join(' ')
        ).join('\n');
    }

    /**
     * 获取棋盘上棋子的总数
     * @returns {number} 棋子总数
     */
    getPieceCount() {
        let count = 0;
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.board[x][y] !== GameConfig.PLAYER.EMPTY) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 检查棋盘是否已满
     * @returns {boolean} 是否已满
     */
    isFull() {
        return this.getPieceCount() === this.size * this.size;
    }

    /**
     * 获取指定玩家的棋子数量
     * @param {number} player - 玩家标识
     * @returns {number} 棋子数量
     */
    getPlayerPieceCount(player) {
        return this.getAllPieces(player).length;
    }

    /**
     * 从数组状态恢复棋盘
     * @param {Array} boardArray - 二维数组表示的棋盘状态
     */
    fromArray(boardArray) {
        if (boardArray && boardArray.length === this.size) {
            this.board = Utils.deepClone(boardArray);
        }
    }

    /**
     * 将棋盘转换为数组
     * @returns {Array} 二维数组表示的棋盘状态
     */
    toArray() {
        return Utils.deepClone(this.board);
    }
}