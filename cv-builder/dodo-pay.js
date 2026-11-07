// Skilleaze x Dodo Payments: pay-what-you-want checkout priced by the visitor's country.
// India: 4% platform fee is added here and charged. Other countries: the 4% fee is shown here and Dodo adds it at checkout.
(function(){
const C=window.SKP_CONFIG||{};const FN=C.supabaseUrl+'/functions/v1/dodo-checkout';const FEE=0.04;
const H={'Content-Type':'application/json',apikey:C.supabaseAnonKey,Authorization:'Bearer '+C.supabaseAnonKey};
const call=b=>fetch(FN,{method:'POST',headers:H,body:JSON.stringify(b)}).then(r=>r.json());
let RATES=null;const rates=()=>RATES?Promise.resolve(RATES):fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).then(j=>(RATES=j&&j.rates)||null).catch(()=>null);rates();
const num=p=>{const m=String(p||'').replace(/,/g,'').match(/[\d.]+/);return m?parseFloat(m[0]):0;};
const DEC={KWD:3,BHD:3,OMR:3,INR:0};
const fmt=(c,v)=>{try{return new Intl.NumberFormat('en',{style:'currency',currency:c,currencyDisplay:c==='INR'||c==='USD'?'symbol':'code',minimumFractionDigits:0,maximumFractionDigits:DEC[c]!=null?DEC[c]:2}).format(v);}catch(e){return c+' '+v;}};
const round=(c,v)=>{const d=DEC[c]!=null?DEC[c]:2;const f=Math.pow(10,d);return Math.round(v*f)/f;};
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const card='width:100%;max-width:440px;background:rgba(10,22,56,.96);border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:28px;color:#E6ECF7;display:flex;flex-direction:column;gap:16px;box-shadow:0 30px 80px rgba(0,0,0,.55);box-sizing:border-box';
const row=(a,b,st)=>'<div style="display:flex;justify-content:space-between;gap:12px;'+(st||'')+'"><span>'+a+'</span><span style="white-space:nowrap">'+b+'</span></div>';
function sheet(){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(3,8,24,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Lato,system-ui,sans-serif;overflow-y:auto';document.body.appendChild(o);return o;}
const ck=n=>{try{return (document.cookie.match('(^|;)\\s*'+n+'=([^;]*)')||[])[2]||'';}catch(e){return '';}};
const fbcFromUrl=()=>{try{const f=new URLSearchParams(location.search).get('fbclid');if(f){const v='fb.1.'+Date.now()+'.'+f;document.cookie='_fbc='+v+';path=/;max-age=7776000;SameSite=Lax';return v;}}catch(e){}return '';};
function pend(){try{const p=JSON.parse(localStorage.getItem('skc_pay_pending')||'null');if(p&&Date.now()-p.t<2*60*60*1000)return p;}catch(e){}return null;}
const fbt=(ev,p,id)=>{try{if(window.skTrack)window.skTrack(ev==='InitiateCheckout'?'checkout':ev==='Purchase'?'purchase':ev,{value:p.value,currency:p.currency,meta:{kind:p.content_category||'',ref:id||''}});}catch(e){}
 try{if(window.fbq)window.fbq('track',ev,p,id?{eventID:id}:undefined);}catch(e){}
 try{if(window.ttq){const tev=ev==='Purchase'?'CompletePayment':ev;window.ttq.track(tev,{value:p.value,currency:p.currency,content_type:'product',contents:[{content_id:p.content_category||'cv',content_name:p.content_name||'',quantity:1,price:p.value}]},id?{event_id:id}:undefined);}}catch(e){}};
function run(o){const P=pend();if(P&&P.paid&&P.kind===o.kind&&(o.kind==='sub'||!P.cvId||P.cvId===(o.cvId||''))){try{localStorage.removeItem('skc_pay_pending');}catch(e){}return Promise.resolve(true);}return new Promise(res=>{const cur=o.currency||'USD';const v=num(o.price);const india=cur==='INR';
const fee=round(cur,v*FEE),total=round(cur,v+fee),send=india?total:v;
fbt('InitiateCheckout',{value:total,currency:cur,content_name:o.title,content_category:o.kind});const ov=sheet();let done=false,timer=0,w=null;const end=ok=>{if(done)return;done=true;clearInterval(timer);try{if(w&&!w.closed&&!ok)w.close();}catch(e){}ov.remove();res(ok);};
ov.addEventListener('click',e=>{if(e.target===ov)end(false);});
ov.innerHTML='<div style="'+card+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:11px;font-weight:900;letter-spacing:.16em;color:#AFC4FF">ORDER SUMMARY</span><b style="font-family:\'Cormorant Garamond\',Georgia,serif;font-weight:600;font-size:30px;line-height:1.05;color:#FFFFFF">'+esc(o.title)+'</b>'+(o.line?'<span style="font-size:13px;color:#AEB9D3">'+esc(o.line)+'</span>':'')+'</div><button data-x aria-label="Close" style="all:unset;cursor:pointer;width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);color:#fff;font-size:20px;flex:none">×</button></div>'
+'<div style="display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(255,255,255,.12);padding-top:16px;font-size:14px;color:#C9D3E8">'+row('Price',fmt(cur,v)+(o.per||''))+row(india?'Platform fee (4%)':'Platform fee (4%, added at checkout)',fmt(cur,fee))+'</div>'
+'<div style="border-top:1px solid rgba(255,255,255,.12);padding-top:14px">'+row('<b style="color:#fff">Total</b>','<b style="color:#fff;font-size:20px">'+fmt(cur,total)+(o.per||'')+'</b>','align-items:baseline;font-size:15px')+'</div>'
+'<div data-msg style="display:none;font-size:13px;line-height:1.6;color:#AEB9D3"></div>'
+'<button data-go style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;background:#FFFFFF;color:#050E26;border-radius:14px;padding:15px 20px;font-weight:900;font-size:15px"><span data-gl>'+(india?'Pay '+fmt(cur,total):'Continue to payment')+'</span><span>→</span></button>'
+'<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8E9AB8"><span style="width:6px;height:6px;border-radius:50%;background:#7FE0B0"></span>Secure checkout by Dodo Payments</div></div>';
const q=s=>ov.querySelector(s);const msg=t=>{const m=q('[data-msg]');m.style.display='block';m.textContent=t;};
q('[data-x]').onclick=()=>end(false);
q('[data-go]').onclick=async()=>{const b=q('[data-go]');if(b.dataset.busy)return;b.dataset.busy=1;q('[data-gl]').textContent='Opening secure checkout…';
 const R=await rates();const r=cur==='USD'?1:(R&&R[cur]);if(!r){msg('Could not load exchange rates. Please try again in a moment.');delete b.dataset.busy;q('[data-gl]').textContent='Try again';try{w&&w.close();}catch(e){}return;}
 const usdCents=Math.max(50,Math.round(send/r*100));
 call({kind:o.kind,cvId:o.cvId||'',cvName:o.cvName||'',amountCents:usdCents,currency:cur,local:cur+' '+send,fee:india?cur+' '+fee:'',page:location.pathname,value:total,title:o.title||'',fbp:ck('_fbp'),fbc:ck('_fbc')||fbcFromUrl()}).then(x=>{if(!x||!x.url||!x.ref)throw new Error((x&&x.error)||'');
  try{localStorage.setItem('skc_pay_pending',JSON.stringify({ref:x.ref,value:total,currency:cur,title:o.title,kind:o.kind,cvId:o.cvId||'',page:location.pathname+location.search,t:Date.now()}));}catch(e){}
  q('[data-gl]').textContent='Opening secure checkout…';location.href=x.url;return;
  const t0=Date.now();timer=setInterval(()=>{if(Date.now()-t0>20*60*1000){end(false);return;}call({action:'status',ref:x.ref}).then(z=>{if(z&&z.status==='paid'){msg('Payment received. Unlocking…');setTimeout(()=>end(true),700);}else if(z&&z.status==='failed'){msg('The payment did not go through. You can try again.');clearInterval(timer);setTimeout(()=>end(false),2500);}}).catch(()=>{});},3000);
 }).catch(()=>{msg('We could not open the payment page. Please try again in a minute, or message us on WhatsApp.');delete b.dataset.busy;q('[data-gl]').textContent='Try again';try{w&&w.close();}catch(e){}});};
});}
const EP=/europass/i.test(location.pathname);try{if(!ck('_fbc'))fbcFromUrl();}catch(e){}
function resume(){const P=pend();if(!P||P.paid)return;if(Date.now()-(P.t||0)>2*60*60*1000){try{localStorage.removeItem('skc_pay_pending');}catch(e){}return;}const qref=new URLSearchParams(location.search).get('pay_ref');if(P.page&&P.page.split('?')[0]!==location.pathname&&!/paid/.test(location.pathname)&&qref!==P.ref)return;
 const ov=sheet();ov.innerHTML='<div style="'+card+'"><span style="font-size:11px;font-weight:900;letter-spacing:.16em;color:#AFC4FF">SECURE PAYMENT</span><b data-t style="font-family:\'Cormorant Garamond\',Georgia,serif;font-weight:600;font-size:30px;line-height:1.1;color:#FFFFFF">Confirming your payment…</b><span data-m style="font-size:14px;line-height:1.6;color:#C9D3E8">This takes a few seconds.</span><div data-a style="display:flex;gap:10px;flex-wrap:wrap"><button data-back style="all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#FFFFFF;border-radius:14px;padding:12px 18px;font-weight:900;font-size:14px"><span>←</span>Go back</button></div></div>';
 const q=s=>ov.querySelector(s);let n=0;let tm=0;const close=()=>{clearInterval(tm);ov.remove();};
 const cancel=()=>{clearInterval(tm);try{localStorage.removeItem('skc_pay_pending');}catch(e){}try{const u=new URL(location.href);['payment_id','status','ref','paid'].forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+u.search+u.hash);}catch(e){}ov.remove();};
 q('[data-back]').onclick=cancel;
 try{const st=new URLSearchParams(location.search).get('status');if(st&&/fail|cancel|declin|expire/i.test(st)){cancel();return;}}catch(e){}
 const done=ok=>{clearInterval(tm);if(ok){if(!P.paid)fbt('Purchase',{value:P.value||0,currency:P.currency||'USD',content_name:P.title||P.kind,content_category:P.kind},P.ref);P.paid=1;try{localStorage.setItem('skc_pay_pending',JSON.stringify(P));}catch(e){}q('[data-t]').textContent='Payment received';q('[data-m]').textContent=P.kind==='sub'?'Your plan is ready. Tap below to activate it.':'Your download is unlocked. Tap below to download.';
   q('[data-a]').innerHTML='<button data-go style="all:unset;cursor:pointer;background:#FFFFFF;color:#050E26;border-radius:14px;padding:14px 20px;font-weight:900;font-size:15px">'+(P.kind==='sub'?'Activate my plan':'Download my CV')+'</button>';
   q('[data-go]').onclick=()=>{close();const fn=window.__skPayResume;if(typeof fn==='function')fn(P);};}
  else{try{localStorage.removeItem('skc_pay_pending');}catch(e){}q('[data-t]').textContent='Payment not completed';q('[data-m]').textContent='No money was taken. You can try again any time.';q('[data-a]').innerHTML='<button data-c style="all:unset;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;border-radius:14px;padding:13px 18px;font-weight:900;font-size:14px">Close</button>';q('[data-c]').onclick=close;}};
 const tick=()=>{n++;call({action:'status',ref:P.ref}).then(z=>{if(z&&z.status==='paid')done(true);else if((z&&z.status==='failed')||n>40)done(false);}).catch(()=>{if(n>40)done(false);});};
 tm=setInterval(tick,2500);tick();
 setTimeout(()=>{if(!ov.isConnected||P.paid)return;const m=q('[data-m]');if(m&&/few seconds/.test(m.textContent))m.textContent='Still checking. If you closed the payment page or chose not to pay, tap Go back.';},12000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(resume,600));else setTimeout(resume,600);
window.addEventListener('pageshow',e=>{if(e.persisted)setTimeout(resume,300);});
window.SKC_PAY=o=>run({kind:o.kind==='cover'?'cover':(EP?'europass':'ats'),title:o.kind==='cover'?'Cover letter download':(EP?'Europass CV download':'ATS CV download'),line:(o.cvName?o.cvName+' · ':'')+'PDF and Word',price:o.price,currency:o.currency,cvId:o.cvId,cvName:o.cvName});
window.SKC_SUBSCRIBE=o=>run({kind:'sub',title:'Tailor to every job',line:'Unlimited tailored CVs · monthly',price:o&&o.price,currency:o&&o.currency,per:' / month'});
})();
