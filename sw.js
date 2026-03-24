const CACHE_NAME = 'my-site-v2'; // 每次更新内容时，记得手动改这个版本号，或者依靠文件哈希

const ASSETS_TO_CACHE = [
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

// 1. 安装阶段
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 跳过等待，直接激活（可选，但通常配合 skipWaiting 使用）
  self.skipWaiting(); 
});

// 2. 激活阶段 (清理旧缓存)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 告诉所有客户端（打开的网页）Service Worker 已激活
  self.clients.claim();
});

// 3. 拦截请求 (缓存优先)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// 【关键】监听消息，当主页面发送 'SKIP_WAITING' 消息时，立即激活新版本
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
