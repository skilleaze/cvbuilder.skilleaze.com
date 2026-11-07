/* Skilleaze admin live alerts.
   Polls Supabase (sk_admin_feed) every 10s while an admin is signed in and, for every key action,
   shows a system notification + an on-page toast and plays a sound that is different for each action. */
(function(){
if(window.SKNotify)return;
var POLL=10000,KEY_ON='sk_notify_on',KEY_SND='sk_notify_sound',KEY_SINCE='sk_notify_since',KEY_SEEN='sk_notify_seen';
var T={
  paid:     {title:'Payment completed', color:'#1E8F6A'},
  checkout: {title:'Checkout started', color:'#C9821A'},
  failed:   {title:'Payment failed', color:'#C0392B'},
  whatsapp: {title:'WhatsApp chat started', color:'#25D366'},
  free_cv:  {title:'Free CV button clicked', color:'#053BA0'},
  download: {title:'CV downloaded', color:'#042D7C'},
  call:     {title:'Call button tapped', color:'#2C3E50'},
  email:    {title:'Email link clicked', color:'#2C3E50'}
};
var SITE={website:'skilleaze.com',cvbuilder:'CV Builder'};
var KIND={'ats':'ATS CV','europass':'Europass CV','sub':'Tailor plan','tailor':'Tailor plan','jd':'Tailor plan'};
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
var cred=null,timer=null,ac=null,ui=null,unread=0,baseTitle=document.title,swReg=null;
var on=ls(KEY_ON)==='1',snd=ls(KEY_SND)!=='0';
var seen={};try{seen=JSON.parse(ls(KEY_SEEN)||'{}')||{};}catch(e){seen={};}

/* ---------- sounds (synthesised, one per action) ---------- */
function ctx(){if(!ac){var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ac=new A();}if(ac.state==='suspended')ac.resume();return ac;}
function tone(f,t0,d,type,vol,slide){var c=ctx();if(!c)return;var o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,c.currentTime+t0);if(slide)o.frequency.exponentialRampToValueAtTime(slide,c.currentTime+t0+d);g.gain.setValueAtTime(0.0001,c.currentTime+t0);g.gain.exponentialRampToValueAtTime(vol||0.25,c.currentTime+t0+0.015);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+t0+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime+t0);o.stop(c.currentTime+t0+d+0.05);}
var SOUND={
  paid:function(){[523.25,659.25,783.99,1046.5].forEach(function(f,i){tone(f,i*0.11,0.5,'triangle',0.28);});tone(2093,0.46,0.6,'sine',0.12);},   /* bright rising chord: money in */
  checkout:function(){tone(587.33,0,0.22,'sine',0.25);tone(880,0.16,0.35,'sine',0.25);},                                          /* two-tone up: someone is paying */
  failed:function(){tone(440,0,0.25,'square',0.12);tone(311.13,0.22,0.4,'square',0.12);},                                          /* low falling buzz */
  whatsapp:function(){tone(1200,0,0.07,'sine',0.3,700);tone(1500,0.12,0.09,'sine',0.3,900);},                                     /* double pop */
  free_cv:function(){tone(1318.5,0,0.9,'sine',0.18);tone(1975.5,0,0.6,'sine',0.06);},                                               /* soft bell */
  download:function(){tone(988,0,0.12,'triangle',0.22);tone(740,0.1,0.12,'triangle',0.22);tone(494,0.2,0.2,'triangle',0.22);},     /* falling blips */
  call:function(){tone(700,0,0.1,'sine',0.22);tone(700,0.16,0.1,'sine',0.22);},
  email:function(){tone(1046.5,0,0.18,'sine',0.2);}
};
function play(ev){if(!snd)return;try{(SOUND[ev]||SOUND.email)();}catch(e){}}

/* ---------- system notification ---------- */
function regSW(){if(swReg||!('serviceWorker' in navigator))return Promise.resolve(swReg);return navigator.serviceWorker.register('/admin-notify/sw.js',{scope:'/admin-notify/'}).then(function(r){swReg=r;return r;}).catch(function(){return null;});}
function sys(title,body,tag){if(!('Notification' in window)||Notification.permission!=='granted')return;var o={body:body,tag:tag,badge:'/assets/icons/admin-48.png',silent:true,renotify:true,data:{url:location.href}};
  var fallback=function(){try{var n=new Notification(title,o);n.onclick=function(){window.focus();n.close();};}catch(e){}};
  regSW().then(function(r){if(r&&r.showNotification)r.showNotification(title,o).catch(fallback);else fallback();});}

/* ---------- on-page UI ---------- */
function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function build(){if(ui)return;ui={};
  ui.stack=el('div','position:fixed;right:16px;bottom:84px;z-index:99998;display:flex;flex-direction:column;gap:10px;width:min(340px,calc(100vw - 32px));pointer-events:none');
  ui.btn=el('button','position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:10px;border:1px solid #E3E4E8;background:#FFFFFF;color:#042D7C;border-radius:999px;padding:12px 18px 12px 14px;font:700 14px Lato,system-ui,sans-serif;box-shadow:0 10px 30px rgba(4,45,124,.16);cursor:pointer');
  ui.btn.onclick=toggle;ui.dot=el('span','width:10px;height:10px;border-radius:50%;flex:none');ui.lbl=el('span');ui.btn.appendChild(ui.dot);ui.btn.appendChild(ui.lbl);
  ui.mute=el('button','position:fixed;right:16px;bottom:66px;z-index:99999;display:none;border:1px solid #E3E4E8;background:#FFFFFF;color:#2C3E50;border-radius:999px;padding:6px 12px;font:700 12px Lato,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(4,45,124,.12)');
  ui.mute.onclick=function(){snd=!snd;ls(KEY_SND,snd?'1':'0');paint();if(snd)play('free_cv');};
  ui.test=el('button','position:fixed;right:118px;bottom:66px;z-index:99999;display:none;border:1px solid #E3E4E8;background:#FFFFFF;color:#2C3E50;border-radius:999px;padding:6px 12px;font:700 12px Lato,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(4,45,124,.12)','Test sounds');
  ui.test.onclick=testAll;
  document.body.appendChild(ui.stack);document.body.appendChild(ui.mute);document.body.appendChild(ui.test);document.body.appendChild(ui.btn);paint();}
function paint(){if(!ui)return;var perm=('Notification' in window)?Notification.permission:'unsupported';
  ui.dot.style.background=on?(perm==='denied'?'#C9821A':'#1E8F6A'):'#B8C0CC';
  ui.lbl.textContent=on?(perm==='denied'?'Live alerts on · browser notifications blocked':'Live alerts on'):'Turn on live alerts';
  ui.mute.style.display=on?'block':'none';ui.test.style.display=on?'block':'none';ui.mute.textContent=snd?'Sound: on':'Sound: off';}
function toast(ev,body,when){if(!ui)return;var t=T[ev]||{title:ev,color:'#042D7C'};
  var c=el('div','pointer-events:auto;background:#FFFFFF;border:1px solid #E3E4E8;border-left:5px solid '+t.color+';border-radius:14px;padding:12px 14px;box-shadow:0 14px 36px rgba(4,45,124,.18);font:400 13px/1.45 Lato,system-ui,sans-serif;color:#2C3E50;opacity:0;transform:translateY(8px);transition:all .25s ease;cursor:pointer',
   '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><strong style="font-size:14px;color:#042D7C">'+esc(t.title)+'</strong><span style="font-size:11px;color:#5B6B7F;white-space:nowrap">'+esc(when)+'</span></div><div style="margin-top:3px">'+esc(body)+'</div>');
  c.onclick=function(){c.remove();};ui.stack.appendChild(c);requestAnimationFrame(function(){c.style.opacity='1';c.style.transform='none';});
  while(ui.stack.children.length>4)ui.stack.firstChild.remove();
  setTimeout(function(){c.style.opacity='0';setTimeout(function(){c.remove();},300);},12000);}

/* ---------- feed ---------- */
function money(a,c){if(a==null||a==='')return '';var n=Number(a);if(!isFinite(n))return '';var z={JPY:1,KRW:1,IDR:1,VND:1,BHD:1000,KWD:1000,OMR:1000,JOD:1000,TND:1000}[String(c||'').toUpperCase()]||100;var v=z===1?n:n/z;return (c?String(c).toUpperCase()+' ':'')+(z===1000?v.toFixed(3):v.toFixed(z===1?0:2));}
function describe(x){var where=SITE[x.site]||x.site||'';var bits=[];
  if(x.ev==='paid'||x.ev==='checkout'||x.ev==='failed'){bits.push(KIND[String(x.path||'').toLowerCase()]||x.path||'Order');var m=money(x.amount,x.currency);if(m)bits.push(m);if(x.who)bits.push(x.who);}
  else{if(x.path)bits.push(x.path);var g=[x.city,x.country].filter(Boolean).join(', ');if(g)bits.push(g);}
  return (where?where+' · ':'')+bits.join(' · ');}
function rpc(fn,body){var C=window.SKP_CONFIG||{};return fetch(C.supabaseUrl+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.supabaseAnonKey,Authorization:'Bearer '+C.supabaseAnonKey},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error((j&&j.message)||'Request failed');return j;});});}
var warned=false;
function poll(){if(!cred||!on)return;var since=ls(KEY_SINCE)||new Date(Date.now()-60000).toISOString();
  rpc('sk_admin_feed',{p_user:cred.u,p_pass:cred.p,p_since:since}).then(function(list){
    list=Array.isArray(list)?list:[];var last=since;var fresh=[];
    list.forEach(function(x){if(x.at>last)last=x.at;if(seen[x.k])return;seen[x.k]=Date.now();fresh.push(x);});
    ls(KEY_SINCE,last);
    var cut=Date.now()-3*864e5;Object.keys(seen).forEach(function(k){if(seen[k]<cut)delete seen[k];});ls(KEY_SEEN,JSON.stringify(seen));
    if(fresh.length>6){var top=fresh.filter(function(x){return x.ev==='paid'})[0]||fresh[fresh.length-1];alert1(top);toast('free_cv',fresh.length+' new actions since you last looked',time(top.at));return;}
    fresh.forEach(function(x,i){setTimeout(function(){alert1(x);},i*900);});
  }).catch(function(e){if(!warned&&/does not exist|Could not find/i.test(e.message)){warned=true;toast('failed','Run admin-notify.sql in Supabase → SQL Editor to switch alerts on.','setup');}});}
function time(a){try{return new Date(a).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function alert1(x){var t=T[x.ev]||{title:x.ev};var body=describe(x);play(x.ev);toast(x.ev,body,time(x.at));sys(t.title,body,x.k);
  if(document.visibilityState!=='visible'){unread++;document.title='('+unread+') '+baseTitle;}}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){unread=0;document.title=baseTitle;poll();}});

function testAll(){var demo=[['paid','CV Builder · ATS CV · AED 10.40 · Test customer'],['checkout','CV Builder · Tailor plan · INR 1,040'],['whatsapp','skilleaze.com · /dubai/ats-friendly-cv/ · Dubai, AE'],['free_cv','skilleaze.com · / · Mangaluru, IN'],['download','CV Builder · /ats-cv-builder'],['failed','CV Builder · Europass CV']];
  demo.forEach(function(d,i){setTimeout(function(){play(d[0]);toast(d[0],d[1],'test');},i*1300);});}
function toggle(){if(on){on=false;ls(KEY_ON,'0');paint();return;}
  on=true;ls(KEY_ON,'1');ctx();regSW();
  var go=function(){paint();ls(KEY_SINCE,new Date().toISOString());play('paid');toast('paid','Live alerts are on. Keep this tab open (it can be in the background).','now');poll();};
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(go,go);else go();}
document.addEventListener('pointerdown',function(){if(on)ctx();},{once:true,capture:true});

window.SKNotify={
  start:function(c){if(!c||!c.u)return;cred=c;baseTitle=document.title;var b=function(){build();if(on){regSW();poll();}clearInterval(timer);timer=setInterval(poll,POLL);};if(document.body)b();else document.addEventListener('DOMContentLoaded',b);},
  stop:function(){cred=null;clearInterval(timer);if(ui){[ui.btn,ui.mute,ui.test,ui.stack].forEach(function(e){e.remove();});ui=null;}},
  test:testAll
};
})();
