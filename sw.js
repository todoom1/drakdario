// 配置
const CACHE_NAME = 'net-first-v1.01';
const TIMEOUT_MS = 3000; // 网络超时阈值

const PRECACHE = [
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
  '/svg/pg.svg',
  '/svg/pp.svg',
  '/svg/mg.svg',
  '/svg/ap.svg',
  '/svg/bbin.svg',
  '/svg/by.svg',
  '/svg/ps.svg',
  '/png/null.png',
  '/svg/cg.svg',
  '/svg/sg.svg',
  '/png/nullb.png',
  '/svg/gr.svg',
  '/png/qt.png',
  '/png/fb.png',
  '/png/cp.png',
  '/svg/oy.svg',
  '/svg/ba.svg',
  '/png/npc.png',
  '/png/ggy.png',
  '/png/dkd.png',
  '/png/vpn.png',
  '/svg/id.svg',
  '/png/rjdq.png',
  '/svg/dxjm.svg',
  '/svg/jable.svg',
  '/svg/you.svg',
  '/svg/njav.svg',
  '/svg/phub.svg',
  '/png/air.png',
  
  // ... 其他资源
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => 
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // 1. 只处理 GET 请求
    if (e.request.method !== 'GET') return;

    // 2. 只处理同域请求 (更稳健的写法)
    const url = new URL(e.request.url);
    if (url.origin !== location.origin) return;

    e.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
            // 尝试网络请求
            const networkResponse = await fetch(e.request);

            // 如果成功，更新缓存 (异步写入，不阻塞返回)
            if (networkResponse && networkResponse.ok) {
                // 注意：clone 必须在读取 body 之前，fetch 返回的响应流只能读一次
                const clone = networkResponse.clone();
                cache.put(e.request, clone).catch(err => {
                    // 忽略缓存写入错误 (如配额满)
                    console.warn('Cache write failed:', err);
                });
            }
            return networkResponse;

        } catch (error) {
            // 网络失败 (断网、超时、服务器错误)
            console.log('Network failed, trying cache...', error);
            
            const cachedResponse = await cache.match(e.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            // 彻底失败：返回兜底内容
            const acceptHeader = e.request.headers.get('accept') || '';
            
            // 判断是否为页面导航请求
            if (acceptHeader.includes('text/html')) {
                return new Response(
                    '<!DOCTYPE html><html><body><h1>Offline</h1><p>您已断开连接，且该页面未缓存。</p></body></html>', 
                    { 
                        status: 503, 
                        headers: {'Content-Type': 'text/html; charset=UTF-8'} 
                    }
                );
            }
            
            // 其他资源 (CSS, JS, 图片) 返回一个简单的文本错误，避免解析崩溃
            return new Response('Service Unavailable: Resource not cached and network is down.', { 
                status: 503,
                headers: {'Content-Type': 'text/plain'}
            });
        }
    })());
});
