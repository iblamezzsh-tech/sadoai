const version = 'sadoai-app-2'
const pages = ['/', '/muloqot', '/iboralar', '/kamera', '/kamera/tajriba', '/sozlamalar', '/haqida', '/maxfiylik']

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(version)
    const assets = new Set()
    await Promise.all(pages.map(async path => {
      const response = await fetch(path)
      if (!response.ok) throw new Error('Could not cache ' + path)
      await cache.put(path, response.clone())
      const markup = await response.text()
      for (const item of markup.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(item[1])
    }))
    await cache.addAll([...assets])
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('sadoai-app-') && name !== version) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  if (event.request.mode === 'navigate' && pages.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match(url.pathname)) || Response.error()))
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(version)
      const saved = await cache.match(event.request)
      if (saved) return saved
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    })())
  }
})
