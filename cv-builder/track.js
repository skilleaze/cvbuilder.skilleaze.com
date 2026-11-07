/* Skilleaze first-party analytics (CV Builder) -> Supabase (cvb_track). Read on /admin.
   Sessions, users (new/returning), channels incl. click IDs, UTM + keyword, landing page, active engagement time,
   scroll depth, browser/OS/screen/language, key actions, and a Clarity tag (sk_sid) to find each screen recording. */
(function(){
if(window.skTrack||/^\/admin/.test(location.pathname))return;
var C=window.SKP_CONFIG||{};if(!C.supabaseUrl)return;var SUPA=C.supabaseUrl,KEY=C.supabaseAnonKey;
var U=SUPA+'/rest/v1/rpc/cvb_track';
var H={'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY};
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v);}catch(e){return null;}}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
function rid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
var sid=ss('sk_sid');if(!sid){sid=rid();ss('sk_sid',sid);}
var vid=ls('sk_vid');if(!vid){vid=rid();ls('sk_vid',vid);ls('sk_vid_s',sid);}
var isNew=ls('sk_vid_s')===sid?'1':'0';
var q=new URLSearchParams(location.search);
var IDS=['gclid','gbraid','wbraid','dclid','msclkid','fbclid','ttclid','li_fat_id','twclid','sccid','epik'];
var MAP={gclid:'google',gbraid:'google',wbraid:'google',dclid:'google',msclkid:'bing',fbclid:'facebook',ttclid:'tiktok',li_fat_id:'linkedin',twclid:'x',sccid:'snapchat',epik:'pinterest'};
var clid='';for(var i=0;i<IDS.length;i++){if(q.get(IDS[i])){clid=IDS[i];break;}}
if(q.get('utm_source')||clid){ss('sk_src',JSON.stringify({src:q.get('utm_source')||MAP[clid]||'',med:q.get('utm_medium')||(clid&&clid!=='fbclid'?'cpc':''),camp:q.get('utm_campaign')||'',term:q.get('utm_term')||q.get('keyword')||'',content:q.get('utm_content')||'',clid:clid}));}
var first=ss('sk_ref');if(first===null){first=document.referrer&&!/cvbuilder\.skilleaze\.com|dodopayments/i.test(document.referrer)?document.referrer:'';ss('sk_ref',first);}
var S={};try{S=JSON.parse(ss('sk_src')||'{}')}catch(e){}
var ua=navigator.userAgent,dev=/iPad|Tablet/i.test(ua)?'tablet':/Mobi|Android|iPhone/i.test(ua)?'mobile':'desktop';
var br=/Edg\//.test(ua)?'Edge':/OPR\/|Opera/.test(ua)?'Opera':/SamsungBrowser/.test(ua)?'Samsung Internet':/FBAN|FBAV|Instagram/.test(ua)?(/Instagram/.test(ua)?'Instagram app':'Facebook app'):/CriOS|Chrome\//.test(ua)?'Chrome':/FxiOS|Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Other';
var os=/Windows/.test(ua)?'Windows':/iPhone|iPad|iPod/.test(ua)?'iOS':/Mac OS X/.test(ua)?'macOS':/Android/.test(ua)?'Android':/Linux/.test(ua)?'Linux':'Other';
var isBot=(navigator.webdriver||/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|facebookexternalhit|preview|python|curl|wget|axios|go-http|java\/|phantom|puppeteer|playwright|selenium/i.test(ua)||!navigator.languages||navigator.languages.length===0)?'1':'0';
var scr=(screen&&screen.width?screen.width+'x'+screen.height:'');var lang=(navigator.language||'').slice(0,10);
var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
var land=ss('sk_land');if(!land){land=location.pathname;ss('sk_land',land);}
var G=null;try{G=JSON.parse(ss('sk_geo')||'null')}catch(e){}
function send(ev,o){o=o||{};var g=G||{};var m={vid:vid};var x=o.meta||{};for(var k in x)m[k]=x[k];
 var body=JSON.stringify({p:{sid:sid,ev:ev,lat:g.lat!=null?String(g.lat):'',lon:g.lon!=null?String(g.lon):'',city:g.city||'',country:g.country||'',path:location.pathname,ref:first,src:S.src||'',med:S.med||'',camp:S.camp||'',dev:dev,tz:tz,value:o.value!=null?String(o.value):'',currency:o.currency||'',tags:o.tags||null,meta:m}});
 try{fetch(U,{method:'POST',headers:H,body:body,keepalive:true}).catch(function(){});}catch(e){}}
window.skTrack=send;
function pv(){send('page_view',{meta:{new:isNew,land:land,term:S.term||'',content:S.content||'',clid:S.clid||'',br:br,os:os,scr:scr,lang:lang,title:(document.title||'').slice(0,120),bot:isBot,v:'2'}});}
var hum=false;['pointermove','touchstart','keydown','wheel','scroll'].forEach(function(e){window.addEventListener(e,function(){if(hum)return;hum=true;send('human');},{passive:true,once:true});});
var geo=G?Promise.resolve():Promise.race([fetch('https://get.geojs.io/v1/ip/geo.json').then(function(r){return r.json();}).then(function(j){if(j&&j.latitude){G={lat:+(+j.latitude).toFixed(2),lon:+(+j.longitude).toFixed(2),city:j.city||'',country:j.country||''};ss('sk_geo',JSON.stringify(G));}}).catch(function(){}),new Promise(function(r){setTimeout(r,2500);})]);
geo.then(pv);
var last=location.pathname;function route(){if(location.pathname!==last){flush();last=location.pathname;sd={};pv();}}
var hp=history.pushState,hr=history.replaceState;history.pushState=function(){var r=hp.apply(this,arguments);setTimeout(route,0);return r;};history.replaceState=function(){var r=hr.apply(this,arguments);setTimeout(route,0);return r;};window.addEventListener('popstate',route);
/* active engagement time */
var act=0,lastAct=Date.now(),sinceSend=0;['mousemove','mousedown','keydown','scroll','touchstart','click','wheel'].forEach(function(e){window.addEventListener(e,function(){lastAct=Date.now();},{passive:true});});
function flush(){if(act>0){send('ping',{meta:{sec:act}});act=0;sinceSend=0;}}
setInterval(function(){if(document.visibilityState==='visible'&&Date.now()-lastAct<30000)act+=5;sinceSend+=5;if(act>=15)flush();else if(sinceSend>=60){send('ping',{meta:{sec:act}});act=0;sinceSend=0;}},5000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush();});window.addEventListener('pagehide',flush);
/* scroll depth */
var sd={};window.addEventListener('scroll',function(){var h=document.documentElement,t=(window.scrollY+window.innerHeight)/Math.max(1,h.scrollHeight)*100;[25,50,75,90].forEach(function(d){if(t>=d&&!sd[d]){sd[d]=1;send('scroll',{meta:{d:d}});}});},{passive:true});
/* Clarity: tag each recording with this session so it can be found from /admin */
function cl(){try{if(window.clarity){window.clarity('set','sk_sid',sid);window.clarity('identify',vid,sid);}}catch(e){}}setTimeout(cl,3000);setTimeout(cl,10000);
if(!ss('sk_tagchk')){setTimeout(function(){ss('sk_tagchk','1');var R=(performance.getEntriesByType&&performance.getEntriesByType('resource')||[]).map(function(e){return e.name;});var has=function(re){return R.some(function(n){return re.test(n);});};send('tags',{tags:{ga:has(/google-analytics\.com\/(g\/)?collect|analytics\.google\.com\/g\/collect/),gads:has(/googleadservices\.com|googleads\.g\.doubleclick\.net|google\.com\/(pagead|rmkt|ccm)/),fb:has(/facebook\.com\/tr/),tt:has(/analytics\.tiktok\.com\/api/),oai:has(/openai\.com\/(?!sdk\/oaiq)/)||(has(/bzrcdn\.openai\.com\/sdk/)&&!!window.oaiq),clarity:has(/clarity\.ms\/collect/)}});},9000);}
function kind(h){h=String(h||'');if(/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(h))return 'whatsapp';return '';}
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a)return;var k=kind(a.getAttribute('href'));if(k)send(k);},true);
var wo=window.open;window.open=function(u){try{var k=kind(u);if(k)send(k);}catch(e){}return wo.apply(window,arguments);};
})();
