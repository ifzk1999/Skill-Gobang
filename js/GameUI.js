/**
 * 游戏用户界面 - 处理用户交互和视觉反馈
 */
class GameUI {
    constructor(canvasElement, gameController) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.gameController = gameController;
        
        // 渲染配置
        this.cellSize = GameConfig.CELL_SIZE;
        this.boardPadding = GameConfig.BOARD_PADDING;
        this.pieceRadius = GameConfig.RENDER.PIECE_RADIUS;
        
        // 交互状态
        this.hoveredPosition = null;
        this.selectedPositions = [];
        this.isSelectionMode = false;
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化画布
        this.initCanvas();
    }

    /**
     * 初始化画布
     */
    initCanvas() {
        const size = GameConfig.BOARD_SIZE * this.cellSize + this.boardPadding * 2;
        this.canvas.width = size;
        this.canvas.height = size;
        
        // 设置画布样式
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }

    /**
     * 处理点击事件
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const boardPos = Utils.pixelToBoard(x, y);
        
        if (this.isSelectionMode) {
            this.handleSelectionClick(boardPos);
        } else {
            this.handleGameClick(boardPos);
        }
    }

    /**
     * 处理游戏点击
     */
    handleGameClick(boardPos) {
        if (this.gameController) {
            this.gameController.handlePlayerMove(boardPos.x, boardPos.y);
        }
    }

    /**
     * 处理选择模式点击
     */
    handleSelectionClick(boardPos) {
        const { x, y } = boardPos;
        const boardManager = this.gameController.boardManager;
        
        if (boardManager.getPiece(x, y) === GameConfig.PLAYER.EMPTY) {
            return;
        }
        
        const existingIndex = this.selectedPositions.findIndex(pos => pos.x === x && pos.y === y);
        
        if (existingIndex >= 0) {
            this.selectedPositions.splice(existingIndex, 1);
        } else {
            this.selectedPositions.push({ x, y });
        }
        
        this.redraw();
    }

    /**
     * 处理鼠标移动事件
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const boardPos = Utils.pixelToBoard(x, y);
        
        if (this.hoveredPosition?.x !== boardPos.x || this.hoveredPosition?.y !== boardPos.y) {
            this.hoveredPosition = boardPos;
            this.redraw();
        }
    }

    /**
     * 处理鼠标离开事件
     */
    handleMouseLeave() {
        this.hoveredPosition = null;
        this.redraw();
    }

    /**
     * 绘制棋盘
     */
    drawBoard() {
        const ctx = this.ctx;
        const size = GameConfig.BOARD_SIZE;
        
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.strokeStyle = GameConfig.RENDER.GRID_COLOR;
        ctx.lineWidth = GameConfig.RENDER.LINE_WIDTH;
        
        ctx.beginPath();
        
        for (let i = 0; i < size; i++) {
            const x = i * this.cellSize + this.boardPadding;
            ctx.moveTo(x, this.boardPadding);
            ctx.lineTo(x, (size - 1) * this.cellSize + this.boardPadding);
        }
        
        for (let i = 0; i < size; i++) {
            const y = i * this.cellSize + this.boardPadding;
            ctx.moveTo(this.boardPadding, y);
            ctx.lineTo((size - 1) * this.cellSize + this.boardPadding, y);
        }
        
        ctx.stroke();
        this.drawStarPoints();
    }

    /**
     * 绘制星位点
     */
    drawStarPoints() {
        const ctx = this.ctx;
        const starPoints = [
            { x: 3, y: 3 }, { x: 3, y: 11 }, { x: 11, y: 3 }, { x: 11, y: 11 },
            { x: 7, y: 7 }
        ];
        
        ctx.fillStyle = GameConfig.RENDER.GRID_COLOR;
        
        starPoints.forEach(point => {
            const pixelPos = Utils.boardToPixel(point.x, point.y);
            ctx.beginPath();
            ctx.arc(pixelPos.x, pixelPos.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    /**
     * 绘制棋子
     */
    drawPiece(x, y, player) {
        if (player === GameConfig.PLAYER.EMPTY) return;
        
        const ctx = this.ctx;
        const pixelPos = Utils.boardToPixel(x, y);
        const color = GameConfig.RENDER.PIECE_COLORS[player];
        
        // 阴影
        ctx.beginPath();
        ctx.arc(pixelPos.x + 1, pixelPos.y + 1, this.pieceRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        // 棋子
        ctx.beginPath();
        ctx.arc(pixelPos.x, pixelPos.y, this.pieceRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        
        // 边框
        ctx.strokeStyle = GameConfig.RENDER.PIECE_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 白子高光
        if (player === GameConfig.PLAYER.AI) {
            ctx.beginPath();
            ctx.arc(pixelPos.x - 3, pixelPos.y - 3, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        }
    }

    /**
     * 高亮显示位置
     */
    highlightPosition(x, y, color = GameConfig.RENDER.HIGHLIGHT_COLOR) {
        const ctx = this.ctx;
        const pixelPos = Utils.boardToPixel(x, y);
        
        ctx.beginPath();
        ctx.arc(pixelPos.x, pixelPos.y, this.pieceRadius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    /**
     * 显示预览棋子
     */
    showPreview(x, y, player) {
        const ctx = this.ctx;
        const pixelPos = Utils.boardToPixel(x, y);
        const color = GameConfig.RENDER.PIECE_COLORS[player];
        
        ctx.beginPath();
        ctx.arc(pixelPos.x, pixelPos.y, this.pieceRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    /**
     * 重新绘制整个棋盘
     */
    redraw() {
        if (!this.gameController || !this.gameController.boardManager) return;
        
        const boardManager = this.gameController.boardManager;
        
        this.drawBoard();
        
        for (let x = 0; x < GameConfig.BOARD_SIZE; x++) {
            for (let y = 0; y < GameConfig.BOARD_SIZE; y++) {
                const piece = boardManager.getPiece(x, y);
                if (piece !== GameConfig.PLAYER.EMPTY) {
                    this.drawPiece(x, y, piece);
                }
            }
        }
        
        this.selectedPositions.forEach(pos => {
            this.highlightPosition(pos.x, pos.y, 'rgba(255, 0, 0, 0.5)');
        });
        
        if (this.hoveredPosition && !this.isSelectionMode) {
            const { x, y } = this.hoveredPosition;
            if (boardManager.isEmpty(x, y) && Utils.isValidCoordinate(x, y)) {
                this.showPreview(x, y, GameConfig.PLAYER.HUMAN);
            }
        }
    }

    /**
     * 进入选择模式
     */
    enterSelectionMode(maxSelections = 3) {
        this.isSelectionMode = true;
        this.selectedPositions = [];
        this.maxSelections = maxSelections;
        this.canvas.style.cursor = 'pointer';
    }

    /**
     * 退出选择模式
     */
    exitSelectionMode() {
        this.isSelectionMode = false;
        this.selectedPositions = [];
        this.canvas.style.cursor = 'crosshair';
        this.redraw();
    }

    /**
     * 获取选中的位置
     */
    getSelectedPositions() {
        return [...this.selectedPositions];
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.initCanvas();
        this.redraw();
    }

    /**
     * 显示获胜线
     */
    showWinningLine(winningLine) {
        if (!winningLine || winningLine.length === 0) return;
        
        const ctx = this.ctx;
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 4;
        
        const startPos = Utils.boardToPixel(winningLine[0].x, winningLine[0].y);
        const endPos = Utils.boardToPixel(winningLine[winningLine.length - 1].x, winningLine[winningLine.length - 1].y);
        
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        
        winningLine.forEach(pos => {
            this.highlightPosition(pos.x, pos.y, 'rgba(255, 215, 0, 0.6)');
        });
    }
}