const CACHE_NAME = 'chromatic-tuner-v1.0.0';
const urlsToCache = [
  '/tuner-pwa/',
  '/tuner-pwa/index.html',
  '/tuner-pwa/manifest.json',
  '/tuner-pwa/icon-192.png',
  '/tuner-pwa/icon-512.png',
  '/tuner-pwa/apple-touch-icon.png'
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 新しいService Workerを即座にアクティブにする
        return self.skipWaiting();
      })
  );
});

// アクティベーション時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 全てのクライアントを制御下に置く
      return self.clients.claim();
    })
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  // HTMLリクエストの場合はネットワーク優先
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // ネットワークから取得できた場合はキャッシュに保存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // ネットワークが利用できない場合はキャッシュから返す
          return caches.match(event.request);
        })
    );
  } else {
    // その他のリソースはキャッシュ優先
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then((response) => {
              // 有効なレスポンスの場合のみキャッシュに保存
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
              return response;
            });
        })
    );
  }
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/tuner-pwa/icon-192.png',
      badge: '/tuner-pwa/icon-192.png'
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});


