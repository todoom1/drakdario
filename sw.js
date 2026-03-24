// 配置
const CACHE_NAME = 'net-first-v1';
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

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    if (!e.request.url.startsWith(self.location.origin)) return;

    e.respondWith((async () => {
        const networkReq = fetch(e.request)
            .then(res => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(() => null);

        const timeoutReq = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
        );

        try {
            const res = await Promise.race([networkReq, timeoutReq]);
            if (res) return res;
            throw new Error('Network failed');
        } catch (err) {
            const cached = await caches.match(e.request);
            if (cached) return cached;
            
            // 彻底失败时的兜底响应 (防止 JS/CSS 挂起)
            if (e.request.headers.get('accept').includes('text/html')) {
                return new Response('<h1>Offline</h1><p>No network or cache.</p>', { 
                    status: 503, headers: {'Content-Type': 'text/html'} 
                });
            }
            return new Response('Unavailable', { status: 503 });
        }
    })());
});