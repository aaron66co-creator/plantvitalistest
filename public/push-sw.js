// התראות בלבד (Web Push). בכוונה אין כאן שום טיפול בטעינת דפים ושום מטמון (fetch/cache) — זה מה שגרם בעבר
// לאתר לא לעלות (ראו sw.js). הקובץ רק מציג התראה כשמגיעה הודעה, ופותח את האפליקציה בלחיצה
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "PlantVitalis", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "PlantVitalis", {
    body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", tag: d.tag || "pv", lang: "he", dir: "auto",
    data: { url: d.url || "/" }, actions: Array.isArray(d.actions) ? d.actions : [],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = (event.notification.data && event.notification.data.url) || "/";
  if (event.action === "ate") url += (url.includes("?") ? "&" : "?") + "ate=1";
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) { if ("navigate" in c) { try { await c.navigate(url); return c.focus(); } catch {} } }
    return self.clients.openWindow(url);
  })());
});
