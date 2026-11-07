self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url.split('#')[0]===u.split('#')[0]&&'focus' in c)return c.focus();}return self.clients.openWindow(u);}));});
