self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { titulo: 'Nuevo reporte', cuerpo: '' }
  }

  const titulo = datos.titulo || 'Nuevo reporte'
  const opciones = {
    body: datos.cuerpo || '',
    tag: datos.folio || undefined,
    data: { url: datos.url || './' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || './'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if ('focus' in cliente) return cliente.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
