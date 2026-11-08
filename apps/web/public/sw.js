// Talaan's service worker: only shows reminder notifications (no caching).

self.addEventListener("push", (event) => {
  let message = { title: "Talaan", body: "", url: "/reminders", tag: "talaan" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // Not JSON: show the defaults
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: message.url },
    }),
  );
});

// Tapping it opens the reminder (in a Talaan tab if one is open)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((tabs) => {
        const tab = tabs.find((t) => t.url.startsWith(self.location.origin));
        if (tab) {
          tab.navigate(url);
          return tab.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
