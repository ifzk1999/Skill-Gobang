/**
 * 全局错误处理器
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.initializeErrorHandling();
    }

    /**
     * 初始化错误处理
     */
    initializeErrorHandling() {
        // 捕获JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // 捕获Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // 捕获资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: 'Resource Load Error',
                    message: `Failed to load: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    timestamp: new Date().toISOString()
                });
            }
        }, true);
    }

    /**
     * 处理错误
     */
    handleError(errorInfo) {
        // 记录错误
        this.errors.push(errorInfo);
        
        // 限制错误数量
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // 控制台输出
        console.error('Error captured:', errorInfo);

        // 根据错误类型采取不同处理策略
        this.processError(errorInfo);
    }

    /**
     * 处理特定类型的错误
     */
    processError(errorInfo) {
        switch (errorInfo.type) {
            case 'JavaScript Error':
                this.handleJavaScriptError(errorInfo);
                break;
            case 'Unhandled Promise Rejection':
                this.handlePromiseRejection(errorInfo);
                break;
            case 'Resource Load Error':
                this.handleResourceError(errorInfo);
                break;
            default:
                this.handleGenericError(errorInfo);
        }
    }

    /**
     * 处理JavaScript错误
     */
    handleJavaScriptError(errorInfo) {
        // 如果是关键错误，显示用户友好的消息
        if (this.isCriticalError(errorInfo)) {
            this.showUserError('游戏遇到了一个问题，请刷新页面重试。');
        }
    }

    /**
     * 处理Promise拒绝
     */
    handlePromiseRejection(errorInfo) {
        // AI服务相关错误
        if (errorInfo.message?.includes('API') || errorInfo.message?.includes('fetch')) {
            this.showUserError('AI服务暂时不可用，将使用简单AI模式。');
        }
    }

    /**
     * 处理资源加载错误
     */
    handleResourceError(errorInfo) {
        this.showUserError('部分资源加载失败，可能影响游戏体验。');
    }

    /**
     * 处理通用错误
     */
    handleGenericError(errorInfo) {
        console.warn('Generic error handled:', errorInfo);
    }

    /**
     * 判断是否为关键错误
     */
    isCriticalError(errorInfo) {
        const criticalKeywords = ['GameController', 'BoardManager', 'Cannot read property'];
        return criticalKeywords.some(keyword => 
            errorInfo.message?.includes(keyword) || errorInfo.stack?.includes(keyword)
        );
    }

    /**
     * 显示用户错误消息
     */
    showUserError(message) {
        if (window.Utils && Utils.showError) {
            Utils.showError(message, 5000);
        } else {
            alert(message);
        }
    }

    /**
     * 获取错误报告
     */
    getErrorReport() {
        return {
            totalErrors: this.errors.length,
            recentErrors: this.errors.slice(-10),
            errorsByType: this.groupErrorsByType(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 按类型分组错误
     */
    groupErrorsByType() {
        const grouped = {};
        this.errors.forEach(error => {
            grouped[error.type] = (grouped[error.type] || 0) + 1;
        });
        return grouped;
    }

    /**
     * 清除错误记录
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * 手动报告错误
     */
    reportError(error, context = '') {
        this.handleError({
            type: 'Manual Report',
            message: error.message || error,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        });
    }
}

// 创建全局错误处理器实例
window.errorHandler = new ErrorHandler();

// 为现有代码提供错误报告函数
window.reportError = (error, context) => {
    window.errorHandler.reportError(error, context);
};
