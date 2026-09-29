/* =============================================================================
   sw.js — OT Request · HRM PROCESS
   ทำให้ติดตั้งเป็นแอปจริงบน Android/iPhone และเปิดใช้ได้แม้ไม่มีเน็ต

   ทุกครั้งที่อัปไฟล์ใหม่ขึ้น GitHub ให้เปลี่ยนเลข CACHE ด้านล่าง
   (หน้า index ดึงของใหม่ก่อนอยู่แล้ว แต่ไอคอน/ไฟล์อื่นจะใช้ของในแคช)
============================================================================= */
const CACHE = 'otreq-v5';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-64.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith('otreq-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* หน้าแอป: เอาของใหม่ก่อน (รอไม่เกิน 3.5 วิ) เน็ตช้า/ล่มค่อยใช้ของในแคช
   ไฟล์อื่น: ใช้แคชก่อนเพื่อความเร็ว แล้วค่อยอัปเดตเบื้องหลัง */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3500))
        ]);
        if (net && net.ok) cache.put('./index.html', net.clone());
        return net;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const refresh = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await refresh) || Response.error();
  })());
});
