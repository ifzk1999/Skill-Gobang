// Service Worker for 技能五子棋
const CACHE_NAME = 'gomoku-skills-2025-10-03';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './js/main.js',
    './js/config.js',
    './js/utils.js',
    './js/BoardManager.js',
    './js/GameUI.js',
    './js/GameController.js',
    './js/GameHistoryManager.js',
    './js/SkillSystem.js',
    './js/AIService.js',
    './js/SmartAI.js',
    './js/WinChecker.js',
    './js/gameSettings.js',
    './js/gameAnalytics.js',
    './js/errorHandler.js',
    './js/performance.js'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
    console.log('Service Worker: 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: 缓存文件');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: 安装完成');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: 安装失败', error);
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('Service Worker: 激活中...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 删除旧缓存', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // 对 HTML 文档采用网络优先策略，确保页面总是最新
    if (req.mode === 'navigate' || req.destination === 'document') {
        event.respondWith(
            fetch(req)
                .then((networkResp) => {
                    const copy = networkResp.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    return networkResp;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 其他资源采用缓存优先，网络回填
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((resp) => {
                if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
                const copy = resp.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                return resp;
            });
        })
    );
});

// 后台同步（如果支持）
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Service Worker: 后台同步');
        event.waitUntil(doBackgroundSync());
    }
});

// 推送通知（如果需要）
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            },
            actions: [
                {
                    action: 'explore',
                    title: '开始游戏',
                    icon: './icon-192.png'
                },
                {
                    action: 'close',
                    title: '关闭',
                    icon: './icon-192.png'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// 后台同步函数
async function doBackgroundSync() {
    try {
        // 这里可以添加需要后台同步的逻辑
        // 比如同步游戏数据、统计信息等
        console.log('执行后台同步任务');
    } catch (error) {
        console.error('后台同步失败:', error);
    }
}

// 消息处理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker未处理的Promise拒绝:', event.reason);
});
