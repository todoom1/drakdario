// 配置
const CACHE_NAME = 'static-net-first-v2'; // 修改此版本号可强制清除所有旧缓存
const NETWORK_TIMEOUT = 3000; // 网络超时时间 (毫秒)，防止弱网下长时间白屏

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/new.css',
  '/inpro.js',
  '/list.js',
  '/pg2.html',
  '/pgx.html',
  '/pgx2.html',
  '/pgz2.html',
  '/pgz.html',
  '/tea1.html',
  '/tea.html',
  '/teax.html',
  '/pptest.html',
  './svg/pg.svg',
  './svg/pp.svg',
  './svg/mg.svg',
  './svg/ap.svg',
  './svg/bbin.svg',
  './svg/by.svg',
  './svg/ps.svg',
  './png/null.png',
  './svg/cg.svg',
  './svg/sg.svg',
  './png/nullb.png',
  './svg/gr.svg',
  './png/qt.png',
  './png/fb.png',
  './png/cp.png',
  './svg/oy.svg',
  './svg/ba.svg',
  './png/npc.png',
  './png/ggy.png',
  './png/dkd.png',
  './png/vpn.png',
  './svg/id.svg',
  './png/rjdq.png',
  './svg/dxjm.svg',
  './svg/jable.svg',
  './svg/you.svg',
  './svg/njav.svg',
  './svg/phub.svg',
  './png/air.png'
  // ... 其他资源
];


// 1. 安装阶段：预缓存
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中，预缓存资源...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting(); // 跳过等待，立即激活
});

// 2. 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中，清理旧缓存...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] 删除旧缓存:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim(); // 立即接管所有页面
});

// 3. 请求拦截：网络优先 (带超时保护)
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // 只处理 GET 请求
    if (request.method !== 'GET') return;

    // 忽略非同源请求 (如果需要缓存 CDN，请注释掉下面这行)
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        (async () => {
            // 创建网络请求的 Promise
            const networkPromise = fetch(request)
                .then((networkResponse) => {
                    // A. 网络请求成功
                    if (networkResponse && networkResponse.ok) {
                        console.log(`[SW] ✅ 网络成功: ${request.url}`);
                        
                        // 克隆响应，一份给浏览器，一份存缓存
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                            // 可选：发送消息给页面用于调试
                            // self.clients.matchAll().then(clients => {
                            //     clients.forEach(c => c.postMessage({ type: 'CACHE_LOG', message: `已更新缓存: ${request.url}` }));
                            // });
                        });
                    }
                    return networkResponse;
                })
                .catch((error) => {
                    // B. 网络请求失败 (断网、DNS 错误等)
                    console.log(`[SW] ⚠️ 网络失败，回退缓存: ${request.url}`, error);
                    return null; // 返回 null 表示需要走缓存逻辑
                });

            // 创建超时 Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network Timeout')), NETWORK_TIMEOUT);
            });

            try {
                // 竞赛：看是网络先完成，还是先超时
                // 注意：如果不需要超时加速，可以直接 return networkPromise
                const response = await Promise.race([networkPromise, timeoutPromise]);
                
                if (response) {
                    return response; // 网络成功且未超时
                }
                
                // 如果 race 返回了 null (即 networkPromise catch 了错误)，走下方 catch
                throw new Error('Network failed or returned null');

            } catch (error) {
                // C. 网络失败 或 超时 -> 尝试读取缓存
                console.log(`[SW] ⏳ 触发回退逻辑 (超时或错误): ${request.url}`);
                
                const cachedResponse = await caches.match(request);
                
                if (cachedResponse) {
                    console.log(`[SW] ✅ 缓存命中: ${request.url}`);
                    return cachedResponse;
                }

                // D. 彻底失败 (无网、超时、且无缓存)
                console.warn(`[SW] ❌ 彻底失败: ${request.url}`);
                
                // 如果是 HTML 请求，返回一个友好的离线页
                if (request.headers.get('accept').includes('text/html')) {
                    // 这里可以返回一个专门的 offline.html，或者构造一个简单的
                    return new Response(`
                        <html><body>
                            <h1>离线 / 加载失败</h1>
                            <p>无法从网络获取资源，且缓存中也没有找到。</p>
                            <p>错误原因: ${error.message}</p>
                            <button onclick="location.reload()">重试</button>
                        </body></html>
                    `, {
                        headers: { 'Content-Type': 'text/html' },
                        status: 503
                    });
                }

                // 其他资源 (JS, CSS, 图片) 返回错误响应
                // 这一步至关重要：必须返回一个 Response，否则浏览器会认为 JS 加载失败（挂起）
                return new Response('Service Worker: Resource unavailable (No Network, No Cache)', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});