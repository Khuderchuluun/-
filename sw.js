var C='ugaalga-v9';
var FILES=['./','index.html','manifest.webmanifest','icon-180.png','icon-512.png'];

/* Суулгахдаа хөтчийн кэшийг алгасаж, сервер дээрх хамгийн шинэ файлуудыг татна */
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(C).then(function(c){
    return Promise.all(FILES.map(function(f){
      return fetch(new Request(f,{cache:'reload'})).then(function(r){
        if(!r||!r.ok) throw new Error('bad '+f);
        return c.put(f,r);
      });
    }));
  }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

function fromCache(req){
  return caches.match(req,{ignoreSearch:true}).then(function(h){return h||caches.match('index.html');});
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  if(new URL(req.url).origin!==self.location.origin) return;

  var isPage=req.mode==='navigate'||/\/(index\.html)?$/.test(new URL(req.url).pathname);
  if(isPage){
    /* Хуудас: интернэт байвал шинийг нь авна, 4 секундэд хариу ирэхгүй эсвэл офлайн бол хадгалснаа харуулна */
    e.respondWith(new Promise(function(resolve){
      var done=false;
      function finish(r){ if(!done&&r){ done=true; resolve(r); } }
      var t=setTimeout(function(){ fromCache(req).then(finish); },4000);
      fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(function(r){
        if(r&&r.ok){
          var cp=r.clone();
          caches.open(C).then(function(c){ c.put(req,cp.clone()); c.put('index.html',cp); });
          clearTimeout(t); finish(r);
        }else{
          fromCache(req).then(function(h){ clearTimeout(t); finish(h||r); });
        }
      }).catch(function(){
        fromCache(req).then(function(h){ clearTimeout(t); finish(h||Response.error()); });
      });
    }));
    return;
  }

  /* Зураг, manifest: хадгалснаа шууд өгч, ард нь шинэчилнэ */
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(function(hit){
    var net=fetch(req).then(function(r){
      if(r&&r.ok){var cp=r.clone(); caches.open(C).then(function(c){c.put(req,cp);});}
      return r;
    }).catch(function(){return hit;});
    return hit||net;
  }));
});
