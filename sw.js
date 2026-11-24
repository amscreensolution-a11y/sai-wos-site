var C='saiwos-v928';
/* the app lives on several free hosts; this page keeps its own address but takes files from whichever host
   is up and has the newest version (so a host that is down, out of free credit or one update behind never stops the shop) */
var HOSTS=['https://sai-workshop-os.pages.dev/','https://sai-workshop-os.web.app/','https://amscreensolution-a11y.github.io/sai-wos-site/','https://unique-chaja-2fb526.netlify.app/'];
var BEST=null,BEST_AT=0,BUSY=null;
function scopeBase(){return self.registration&&self.registration.scope||self.location.href.replace(/sw\.js.*$/,'');}
function vnum(v){var p=(''+(v||'')).split('.'),n=0;for(var i=0;i<4;i++)n=n*1000+(parseInt(p[i]||'0',10)||0);return n;}
function tget(url,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej('timeout');},ms);
  fetch(url,{cache:'no-store',mode:'cors'}).then(function(r){clearTimeout(t);res(r);},function(e){clearTimeout(t);rej(e);});});}
function pickBest(){if(BEST&&Date.now()-BEST_AT<6e5)return Promise.resolve(BEST);if(BUSY)return BUSY;
  var me=scopeBase(),list=[me].concat(HOSTS.filter(function(h){return h!==me;}));
  BUSY=Promise.all(list.map(function(h){return tget(h+'versions.json?t='+Date.now(),3500).then(function(r){return r.ok?r.json():null;}).then(function(a){return a&&a[0]?vnum(a[0].v):0;},function(){return 0;});}))
    .then(function(vs){var k=-1;vs.forEach(function(v,i){if(v>0&&(k<0||v>vs[k]))k=i;});BEST=k>=0?list[k]:me;BEST_AT=Date.now();BUSY=null;return BEST;},function(){BUSY=null;return me;});
  return BUSY;}
function fromHost(h,rel,req){if(h===scopeBase())return fetch(req);
  return tget(h+rel,15000).then(function(r){if(!r.ok)throw r.status;return r.blob().then(function(b){return new Response(b,{status:200,headers:{'Content-Type':r.headers.get('Content-Type')||'text/html; charset=utf-8'}});});});}
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(C).then(function(c){return c.addAll(['./','./index.html','./manifest.json','./track.html','./display.html','./tv/','./desk/']).catch(function(){});}));
  self.skipWaiting();});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);}));}));
  self.clients.claim();});
/* network-first for this site's own files and the cloud library scripts only.
   The cloud's live data stream is never touched (caching a never-ending stream wastes memory and can stall it).
   Offline: the saved copy of the same file; for a page, the saved page of that screen (TV, desk or app). */
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var u;try{u=new URL(e.request.url);}catch(x){return;}
  var same=u.origin===self.location.origin,lib=/^https:\/\/www\.gstatic\.com\/firebasejs\//.test(u.href);
  if(!same&&!lib)return;
  var base=scopeBase(),rel=same&&u.href.indexOf(base)===0?u.href.slice(base.length):null,net;
  if(rel!==null&&!/^versions\.json/.test(rel)&&!/^sw\.js/.test(rel)){
    var others=function(skip){var hs=HOSTS.filter(function(h){return h!==skip&&h!==base;});
      return hs.reduce(function(p,h){return p.catch(function(){return fromHost(h,rel,e.request);});},Promise.reject(0));};
    net=pickBest().then(function(h){return fromHost(h,rel,e.request).then(function(r){if(!r.ok&&r.status>=500)throw r.status;return r;})
      .catch(function(){return h===base?others(base):fetch(e.request).then(function(r){if(!r.ok)throw r.status;return r;}).catch(function(){return others(h);});});});
  } else net=fetch(e.request);
  e.respondWith(net.then(function(r){
    if(r&&r.ok){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp);});}return r;
  }).catch(function(){return caches.match(e.request).then(function(r){
    if(r)return r;
    if(e.request.mode==='navigate'){var p=u.pathname;return caches.match(/\/tv\/?$/.test(p)?'./tv/':/\/desk\/?$/.test(p)?'./desk/':'./index.html');}
    return Response.error();});}));});
/* tapping a notification (e.g. URGENT JOB) opens the app on top */
self.addEventListener('notificationclick',function(e){e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){if('focus' in cs[i])return cs[i].focus();}
    if(self.clients.openWindow)return self.clients.openWindow('./');}));});
