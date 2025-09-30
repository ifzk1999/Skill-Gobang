/**
 * 游戏设置管理器
 */
class GameSettings {
    constructor() {
        this.settings = this.loadSettings();
        this.initializeSettings();
    }

    /**
     * 默认设置
     */
    getDefaultSettings() {
        return {
            // 游戏设置
            soundEnabled: true,
            animationsEnabled: true,
            showCoordinates: false,
            autoSave: true,
            
            // AI设置
            aiDifficulty: 'normal', // easy, normal, hard
            aiThinkingTime: 1000,
            
            // 界面设置
            theme: 'default', // default, dark, classic
            boardSize: 'normal', // small, normal, large
            pieceStyle: 'classic', // classic, modern, minimal
            
            // 辅助功能
            highContrast: false,
            largeText: false,
            keyboardNavigation: false
        };
    }

    /**
     * 加载设置
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('gomoku_settings');
            return saved ? { ...this.getDefaultSettings(), ...JSON.parse(saved) } : this.getDefaultSettings();
        } catch (error) {
            console.warn('加载设置失败，使用默认设置:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('gomoku_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    /**
     * 获取设置值
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * 设置值
     */
    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    /**
     * 批量更新设置
     */
    update(newSettings) {
        Object.assign(this.settings, newSettings);
        this.saveSettings();
        this.applySettings();
    }

    /**
     * 重置为默认设置
     */
    reset() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
        this.applySettings();
    }

    /**
     * 初始化设置
     */
    initializeSettings() {
        this.applySettings();
        this.createSettingsUI();
    }

    /**
     * 应用设置
     */
    applySettings() {
        // 应用主题
        document.body.className = `theme-${this.settings.theme}`;
        
        // 应用高对比度
        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        
        // 应用大字体
        if (this.settings.largeText) {
            document.body.classList.add('large-text');
        } else {
            document.body.classList.remove('large-text');
        }
        
        // 更新AI配置
        if (window.GameConfig) {
            GameConfig.AI.THINKING_DELAY = this.settings.aiThinkingTime;
        }
        
        // 更新智能AI难度
        if (window.smartAI) {
            window.smartAI.setDifficulty(this.settings.aiDifficulty);
        }
    }

    /**
     * 创建设置界面
     */
    createSettingsUI() {
        // 创建设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.className = 'btn btn-secondary settings-btn';
        settingsBtn.innerHTML = '⚙️ 设置';
        settingsBtn.onclick = () => this.showSettingsModal();
        
        // 添加到游戏头部
        const gameStatus = document.querySelector('.game-status');
        if (gameStatus) {
            gameStatus.appendChild(settingsBtn);
        }
    }

    /**
     * 显示设置模态框
     */
    showSettingsModal() {
        // 创建设置模态框HTML
        const modalHTML = `
            <div id="settings-modal" class="modal">
                <div class="modal-content">
                    <h2>游戏设置</h2>
                    <div class="settings-form">
                        <div class="setting-group">
                            <h3>游戏设置</h3>
                            <label>
                                <input type="checkbox" id="sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''}>
                                启用音效
                            </label>
                            <label>
                                <input type="checkbox" id="animations-enabled" ${this.settings.animationsEnabled ? 'checked' : ''}>
                                启用动画
                            </label>
                            <label>
                                <input type="checkbox" id="show-coordinates" ${this.settings.showCoordinates ? 'checked' : ''}>
                                显示坐标
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <h3>AI设置</h3>
                            <label>
                                AI难度:
                                <select id="ai-difficulty">
                                    <option value="easy" ${this.settings.aiDifficulty === 'easy' ? 'selected' : ''}>简单</option>
                                    <option value="normal" ${this.settings.aiDifficulty === 'normal' ? 'selected' : ''}>普通</option>
                                    <option value="hard" ${this.settings.aiDifficulty === 'hard' ? 'selected' : ''}>困难</option>
                                </select>
                            </label>
                        </div>
                        
                        <div class="setting-group">
                            <h3>辅助功能</h3>
                            <label>
                                <input type="checkbox" id="high-contrast" ${this.settings.highContrast ? 'checked' : ''}>
                                高对比度
                            </label>
                            <label>
                                <input type="checkbox" id="large-text" ${this.settings.largeText ? 'checked' : ''}>
                                大字体
                            </label>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="save-settings-btn" class="btn btn-primary">保存</button>
                        <button id="reset-settings-btn" class="btn btn-secondary">重置</button>
                        <button id="close-settings-btn" class="btn btn-secondary">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 绑定事件
        this.bindSettingsEvents();
    }

    /**
     * 绑定设置事件
     */
    bindSettingsEvents() {
        const modal = document.getElementById('settings-modal');
        
        // 保存设置
        document.getElementById('save-settings-btn').onclick = () => {
            this.saveSettingsFromForm();
            modal.remove();
        };
        
        // 重置设置
        document.getElementById('reset-settings-btn').onclick = () => {
            if (confirm('确定要重置所有设置吗？')) {
                this.reset();
                modal.remove();
            }
        };
        
        // 关闭模态框
        document.getElementById('close-settings-btn').onclick = () => {
            modal.remove();
        };
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    /**
     * 从表单保存设置
     */
    saveSettingsFromForm() {
        const newSettings = {
            soundEnabled: document.getElementById('sound-enabled').checked,
            animationsEnabled: document.getElementById('animations-enabled').checked,
            showCoordinates: document.getElementById('show-coordinates').checked,
            aiDifficulty: document.getElementById('ai-difficulty').value,
            highContrast: document.getElementById('high-contrast').checked,
            largeText: document.getElementById('large-text').checked
        };
        
        this.update(newSettings);
        Utils.showSuccess('设置已保存！');
    }
}

// 全局设置实例
window.gameSettings = new GameSettings();
