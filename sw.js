// えほんスタジオ service worker — シェルのみキャッシュ（絵本データはIndexedDB）
// デプロイ時は CACHE の版数を必ずバンプすること（deploy-appスキルが自動で行う）
const CACHE = "ehon-studio-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // API等の外部リクエストには触らない
  if (e.request.mode === "navigate") {
    // ネットワーク優先（更新を確実に取得）、オフライン時はキャッシュ
    e.respondWith(fetch(e.request).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && SHELL.some(p => url.pathname.endsWith(p.replace("./", "/")))) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
