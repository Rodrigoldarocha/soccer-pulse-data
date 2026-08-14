// Service Worker — Web Push notifications for Zagueiro.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // corpo não-JSON → notificação padrão
  }

  const title = payload.title || "Zagueiro";
  const options = {
    body: payload.body || "Nova atualização de previsões.",
    icon: "/apple-touch-icon.svg",
    badge: "/favicon.ico",
    data: { url: payload.url || "/valor" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
