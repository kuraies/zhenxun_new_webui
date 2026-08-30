/**
 * OneBot 调试客户端的轻量 Service Worker
 *
 * 策略：
 * - 导航请求：网络优先（保证拿到新版本），断网回退缓存的壳
 * - 同源静态资源（带 hash 的构建产物）：缓存优先
 * - 后端接口（/zhenxun/）与跨域资源（QQ 头像等）：一律不缓存
 */
const CACHE = "ob-debug-v1";
// 用精确的 index.html 而不是 "./"，不依赖服务器的目录默认页配置
const SHELL = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys =>
                Promise.all(
                    keys.filter(key => key !== CACHE).map(key => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== location.origin) return;
    if (url.pathname.includes("/zhenxun/")) return;

    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(cache => cache.put(req, copy));
                    return res;
                })
                .catch(() =>
                    caches
                        .match(req)
                        .then(hit => hit || caches.match("./index.html")),
                ),
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(
            hit =>
                hit ||
                fetch(req).then(res => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then(cache => cache.put(req, copy));
                    }
                    return res;
                }),
        ),
    );
});
