// GeoProfessor Service Worker - handles push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "GeoProfessor", body: event.data.text() };
  }

  const options = {
    body: data.body || "Today's Middle East brief is ready.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: "daily-brief", // replaces previous notification
    renotify: true,
    data: { url: "/" },
    actions: [{ action: "open", title: "Read Brief" }],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "GeoProfessor Daily Brief",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow("/");
      })
  );
});
