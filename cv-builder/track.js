/* Skilleaze CV Builder first-party analytics. Sends page views, checkouts, payments and
   which marketing tags actually fired to Supabase (cvb_track). Read on /admin. */
(function(){
if(window.skTrack||/\/admin/.test(location.pathname))return;
const C=window.SKP_CONFIG||{};if(!C.supabaseUrl)return;
const URL_=C.supabaseUrl+'/rest/v1/rpc/cvb_track';
const H={'Content-Type':'application/json',apikey:C.supabaseAnonKey,Authorization:'Bearer '+C.supabaseAnonKey};
const ss=(k,v)=>{try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v);}catch(e){return null;}};
let sid=ss('sk_sid');if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);ss('sk_sid',sid);}
const q=new URLSearchParams(location.search);
if(q.get('utm_source')||q.get('gclid')||q.get('fbclid')||q.get('ttclid')){const src=q.get('utm_source')||(q.get('gclid')?'google':q.get('fbclid')?'facebook':q.get('ttclid')?'tiktok':'');ss('sk_src',JSON.stringify({src,med:q.get('utm_medium')||(q.get('gclid')||q.get('fbclid')||q.get('ttclid')?'cpc':''),camp:q.get('utm_campaign')||''}));}
let first=ss('sk_ref');if(first===null){first=document.referrer&&!/cvbuilder\.skilleaze\.com|dodopayments/i.test(document.referrer)?document.referrer:'';ss('sk_ref',first);}
const S=(()=>{try{return JSON.parse(ss('sk_src')||'{}')}catch(e){return {}}})();
const ua=navigator.userAgent;const dev=/iPad|Tablet/i.test(ua)?'tablet':/Mobi|Android|iPhone/i.test(ua)?'mobile':'desktop';
let tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
let G=(()=>{try{return JSON.parse(ss('sk_geo')||'null')}catch(e){return null}})();
function send(ev,o){o=o||{};const g=G||{};const body=JSON.stringify({p:{sid,ev,lat:g.lat!=null?String(g.lat):'',lon:g.lon!=null?String(g.lon):'',city:g.city||'',country:g.country||'',path:location.pathname,ref:first,src:S.src||'',med:S.med||'',camp:S.camp||'',dev,tz,value:o.value!=null?String(o.value):'',currency:o.currency||'',tags:o.tags||null,meta:o.meta||null}});
 try{fetch(URL_,{method:'POST',headers:H,body,keepalive:true}).catch(()=>{});}catch(e){}}
window.skTrack=send;
const geo=()=>G?Promise.resolve():Promise.race([fetch('https://get.geojs.io/v1/ip/geo.json').then(r=>r.json()).then(j=>{if(j&&j.latitude){G={lat:+(+j.latitude).toFixed(2),lon:+(+j.longitude).toFixed(2),city:j.city||'',country:j.country||''};ss('sk_geo',JSON.stringify(G));}}).catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
geo().then(()=>send('page_view'));
setInterval(()=>{if(document.visibilityState==='visible')send('ping');},60000);
function tags(){const R=(performance.getEntriesByType&&performance.getEntriesByType('resource')||[]).map(e=>e.name);const has=re=>R.some(n=>re.test(n));
 return {ga:has(/google-analytics\.com\/(g\/)?collect|analytics\.google\.com\/g\/collect/),gads:has(/googleadservices\.com|googleads\.g\.doubleclick\.net|google\.com\/(pagead|rmkt|ccm)/),fb:has(/facebook\.com\/tr/),tt:has(/analytics\.tiktok\.com\/api/),oai:has(/openai\.com\/(?!sdk\/oaiq)/)||(has(/bzrcdn\.openai\.com\/sdk/)&&!!window.oaiq),clarity:has(/clarity\.ms\/collect|\.clarity\.ms\/collect/)};}
if(!ss('sk_tagchk')){setTimeout(()=>{ss('sk_tagchk','1');send('tags',{tags:tags()});},9000);}
document.addEventListener('click',e=>{const a=e.target&&e.target.closest&&e.target.closest('a[href]');if(a&&/wa\.me|api\.whatsapp\.com/i.test(a.href))send('whatsapp');},true);
const wo=window.open;window.open=function(u){try{if(/wa\.me|api\.whatsapp\.com/i.test(String(u||'')))send('whatsapp');}catch(e){}return wo.apply(window,arguments);};
})();
