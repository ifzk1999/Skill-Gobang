// 环境变量配置示例文件
// 复制此文件为 env.js 并填入你的实际配置

const ENV_CONFIG = {
    AI: {
        API_KEY: 'your-api-key-here',  // 请填入你的qwen API密钥
        API_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    },
    
    // 开发模式配置
    DEV_MODE: false,  // 设为true启用调试模式
    
    // 其他敏感配置...
};

// 导出配置
if (typeof window !== 'undefined') {
    window.ENV_CONFIG = ENV_CONFIG;
}
