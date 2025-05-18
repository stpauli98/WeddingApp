// Upravljanje push notifikacijama

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova uspomena je dodana!',
      icon: data.icon || '/apple-touch-icon.png',
      badge: data.badge || '/favicon.ico',
      data: data.data || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'DodajUspomenu', options)
    );
  }
});

// Upravljanje klikom na notifikaciju
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Prilagodi URL prema potrebi
  const urlToOpen = event.notification.data.url || '/guest/dashboard';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Provjeri postoji li već otvoren prozor i fokusiraj ga
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Ako nema otvorenog prozora, otvori novi
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
