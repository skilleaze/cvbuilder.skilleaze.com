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
function run(o){return new Promise(res=>{const cur=o.currency||'USD';const v=num(o.price);const india=cur==='INR';
const fee=round(cur,v*FEE),total=round(cur,v+fee),send=india?total:v;
const ov=sheet();let done=false,timer=0,w=null;const end=ok=>{if(done)return;done=true;clearInterval(timer);try{if(w&&!w.closed&&!ok)w.close();}catch(e){}ov.remove();res(ok);};
ov.addEventListener('click',e=>{if(e.target===ov)end(false);});
ov.innerHTML='<div style="'+card+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:11px;font-weight:900;letter-spacing:.16em;color:#AFC4FF">ORDER SUMMARY</span><b style="font-family:\'Cormorant Garamond\',Georgia,serif;font-weight:600;font-size:30px;line-height:1.05;color:#FFFFFF">'+esc(o.title)+'</b>'+(o.line?'<span style="font-size:13px;color:#AEB9D3">'+esc(o.line)+'</span>':'')+'</div><button data-x aria-label="Close" style="all:unset;cursor:pointer;width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);color:#fff;font-size:20px;flex:none">×</button></div>'
+'<div style="display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(255,255,255,.12);padding-top:16px;font-size:14px;color:#C9D3E8">'+row('Price',fmt(cur,v)+(o.per||''))+row(india?'Platform fee (4%)':'Platform fee (4%, added at checkout)',fmt(cur,fee))+'</div>'
+'<div style="border-top:1px solid rgba(255,255,255,.12);padding-top:14px">'+row('<b style="color:#fff">Total</b>','<b style="color:#fff;font-size:20px">'+fmt(cur,total)+(o.per||'')+'</b>','align-items:baseline;font-size:15px')+'</div>'
+'<div data-msg style="display:none;font-size:13px;line-height:1.6;color:#AEB9D3"></div>'
+'<button data-go style="all:unset;box-sizing:border-box;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;background:#FFFFFF;color:#050E26;border-radius:14px;padding:15px 20px;font-weight:900;font-size:15px"><span data-gl>'+(india?'Pay '+fmt(cur,total):'Continue to payment')+'</span><span>→</span></button>'
+'<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#8E9AB8"><span style="width:6px;height:6px;border-radius:50%;background:#7FE0B0"></span>Secure checkout by Dodo Payments</div></div>';
const q=s=>ov.querySelector(s);const msg=t=>{const m=q('[data-msg]');m.style.display='block';m.textContent=t;};
q('[data-x]').onclick=()=>end(false);
q('[data-go]').onclick=async()=>{const b=q('[data-go]');if(b.dataset.busy)return;b.dataset.busy=1;try{w=window.open('about:blank','_blank');}catch(e){}q('[data-gl]').textContent='Opening secure checkout…';
 const R=await rates();const r=cur==='USD'?1:(R&&R[cur]);if(!r){msg('Could not load exchange rates. Please try again in a moment.');delete b.dataset.busy;q('[data-gl]').textContent='Try again';try{w&&w.close();}catch(e){}return;}
 const usdCents=Math.max(50,Math.round(send/r*100));
 call({kind:o.kind,cvId:o.cvId||'',cvName:o.cvName||'',amountCents:usdCents,currency:cur,local:cur+' '+send,fee:india?cur+' '+fee:''}).then(x=>{if(!x||!x.url||!x.ref)throw new Error((x&&x.error)||'');
  if(w&&!w.closed){try{w.location.href=x.url;}catch(e){w=null;}}
  if(!w||w.closed){b.outerHTML='<a href="'+x.url+'" target="_blank" rel="noopener" style="display:flex;justify-content:space-between;align-items:center;background:#FFFFFF;color:#050E26;border-radius:14px;padding:15px 20px;font-weight:900;font-size:15px;text-decoration:none"><span>Open payment page</span><span>→</span></a>';}
  else{q('[data-gl]').textContent='Waiting for payment…';}
  msg('Complete the payment in the new tab. This window updates by itself once it is done.');
  const t0=Date.now();timer=setInterval(()=>{if(Date.now()-t0>20*60*1000){end(false);return;}call({action:'status',ref:x.ref}).then(z=>{if(z&&z.status==='paid'){msg('Payment received. Unlocking…');setTimeout(()=>end(true),700);}else if(z&&z.status==='failed'){msg('The payment did not go through. You can try again.');clearInterval(timer);setTimeout(()=>end(false),2500);}}).catch(()=>{});},3000);
 }).catch(()=>{msg('We could not open the payment page. Please try again in a minute, or message us on WhatsApp.');delete b.dataset.busy;q('[data-gl]').textContent='Try again';try{w&&w.close();}catch(e){}});};
});}
const EP=/europass/i.test(location.pathname);
window.SKC_PAY=o=>run({kind:o.kind==='cover'?'cover':(EP?'europass':'ats'),title:o.kind==='cover'?'Cover letter download':(EP?'Europass CV download':'ATS CV download'),line:(o.cvName?o.cvName+' · ':'')+'PDF and Word',price:o.price,currency:o.currency,cvId:o.cvId,cvName:o.cvName});
window.SKC_SUBSCRIBE=o=>run({kind:'sub',title:'Tailor to every job',line:'Unlimited tailored CVs · monthly',price:o&&o.price,currency:o&&o.currency,per:' / month'});
})();
