/**
 * 性能监控和优化工具
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTime: [],
            aiResponseTime: [],
            memoryUsage: []
        };
        this.isMonitoring = false;
    }

    /**
     * 开始性能监控
     */
    startMonitoring() {
        this.isMonitoring = true;
        this.monitorMemory();
    }

    /**
     * 停止性能监控
     */
    stopMonitoring() {
        this.isMonitoring = false;
    }

    /**
     * 记录渲染时间
     */
    recordRenderTime(startTime) {
        if (!this.isMonitoring) return;
        
        const renderTime = performance.now() - startTime;
        this.metrics.renderTime.push(renderTime);
        
        // 保持最近100次记录
        if (this.metrics.renderTime.length > 100) {
            this.metrics.renderTime.shift();
        }
        
        // 如果渲染时间过长，发出警告
        if (renderTime > 16.67) { // 60fps阈值
            console.warn(`渲染时间过长: ${renderTime.toFixed(2)}ms`);
        }
    }

    /**
     * 记录AI响应时间
     */
    recordAIResponseTime(startTime) {
        if (!this.isMonitoring) return;
        
        const responseTime = performance.now() - startTime;
        this.metrics.aiResponseTime.push(responseTime);
        
        if (this.metrics.aiResponseTime.length > 50) {
            this.metrics.aiResponseTime.shift();
        }
    }

    /**
     * 监控内存使用
     */
    monitorMemory() {
        if (!this.isMonitoring || !performance.memory) return;
        
        const memoryInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            timestamp: Date.now()
        };
        
        this.metrics.memoryUsage.push(memoryInfo);
        
        if (this.metrics.memoryUsage.length > 60) { // 保持1分钟的数据
            this.metrics.memoryUsage.shift();
        }
        
        // 内存使用率过高警告
        const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
        if (usagePercent > 80) {
            console.warn(`内存使用率过高: ${usagePercent.toFixed(1)}%`);
        }
        
        setTimeout(() => this.monitorMemory(), 1000);
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        const avgRenderTime = this.metrics.renderTime.length > 0 
            ? this.metrics.renderTime.reduce((a, b) => a + b) / this.metrics.renderTime.length 
            : 0;
            
        const avgAIResponseTime = this.metrics.aiResponseTime.length > 0
            ? this.metrics.aiResponseTime.reduce((a, b) => a + b) / this.metrics.aiResponseTime.length
            : 0;

        return {
            averageRenderTime: avgRenderTime.toFixed(2) + 'ms',
            averageAIResponseTime: avgAIResponseTime.toFixed(2) + 'ms',
            currentMemoryUsage: this.getCurrentMemoryUsage(),
            fps: avgRenderTime > 0 ? Math.round(1000 / avgRenderTime) : 0
        };
    }

    /**
     * 获取当前内存使用情况
     */
    getCurrentMemoryUsage() {
        if (!performance.memory) return 'N/A';
        
        const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const total = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
        
        return `${used}MB / ${total}MB`;
    }
}

// 全局性能监控实例
window.performanceMonitor = new PerformanceMonitor();
