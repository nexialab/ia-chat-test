// ===== SERVICE WORKER - PWA SUPPORT =====
const CACHE_NAME = "chat-teste-ai-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/scripts/main.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Cache aberto");
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: "reload" })));
      })
      .catch((error) => {
        console.error("Erro ao cachear arquivos:", error);
      })
  );
  
  // Força o service worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Ativando...");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Toma controle de todas as páginas imediatamente
  return self.clients.claim();
});

// Interceptação de requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Não cachear requisições para APIs externas (Supabase, Webhook)
  if (url.origin !== location.origin && !url.hostname.includes("cdnjs.cloudflare.com")) {
    return;
  }
  
  // Strategy: Network First, fallback to Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Verifica se recebeu uma resposta válida
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }
        
        // Clona a resposta
        const responseToCache = response.clone();
        
        // Adiciona ao cache
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Se falhar, tenta buscar do cache
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          // Se não encontrar no cache e for uma navegação, retorna página offline
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});

// Sincronização em background (opcional)
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Sincronizando...");
  
  if (event.tag === "sync-messages") {
    event.waitUntil(
      // Aqui você pode adicionar lógica para sincronizar mensagens offline
      Promise.resolve()
    );
  }
});

// Notificações Push (opcional para futuro)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push recebido");
  
  const options = {
    body: event.data ? event.data.text() : "Nova mensagem",
    icon: "/public/icon-192.png",
    badge: "/public/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "chat-notification",
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification("Chat VemMed", options)
  );
});

// Click em notificação
self.addEventListener("notificationclick", (event) => {
  console.log("Notificação clicada");
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow("/")
  );
});

