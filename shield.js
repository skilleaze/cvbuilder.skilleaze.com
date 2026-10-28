/* Skilleaze screen shield (customer builder).
   Browsers cannot fully block screenshots. This makes them useless:
   - a tiled watermark over every on-screen CV page (not in downloads)
   - the screen goes black when a screenshot or screen-capture tool takes focus,
     on Print Screen / Cmd+Shift / Win+Shift, and when the tab is hidden
   - printing, right-click, copy and drag are blocked on the CV preview */
(function(){
if(window.__skShield)return;window.__skShield=1;
const SEL='[data-skb="prev"],[data-skb="jdprev"],[data-skb="cover"]';
const wm=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><g transform="rotate(-30 150 100)" fill="#042D7C" fill-opacity="0.13" font-family="Lato,Arial,sans-serif" font-weight="900"><text x="20" y="96" font-size="22" letter-spacing="3">SKILLEAZE PREVIEW</text><text x="44" y="124" font-size="12" letter-spacing="2">DOWNLOAD TO GET YOUR CV</text></g></svg>');
const css=document.createElement('style');css.id='sk-shield';css.textContent=`
${SEL.split(',').map(s=>s+' > *').join(',')}{position:relative!important}
${SEL.split(',').map(s=>s+' > *::after').join(',')}{content:"";position:absolute;inset:0;z-index:50;pointer-events:none;background-image:url("data:image/svg+xml,${wm}");background-repeat:repeat;background-size:300px 200px}
${SEL}{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
${SEL} [contenteditable="true"],${SEL} [data-f]:focus{-webkit-user-select:text;user-select:text}
${SEL} img{-webkit-user-drag:none;pointer-events:none}
#sk-shield-black{position:fixed;inset:0;z-index:2147483646;background:#000;display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;color:#FFFFFF;font:700 16px/1.5 Lato,system-ui,sans-serif;text-align:center}
#sk-shield-black.on{display:flex}
@media print{html:not(.sk-printing) body *{visibility:hidden!important}html:not(.sk-printing) body::before{content:"Printing is disabled. Download your CV as PDF or Word.";visibility:visible;position:fixed;top:40%;left:0;right:0;text-align:center;font:700 18px Lato,Arial,sans-serif;color:#000}}
`;document.head.appendChild(css);
const black=document.createElement('div');black.id='sk-shield-black';black.setAttribute('aria-hidden','true');black.innerHTML='<div>Preview hidden<br><span style="font-weight:400;font-size:14px;color:#C9D3E8">Click to continue</span></div>';
const mount=()=>{if(!black.isConnected)document.body.appendChild(black);};document.body?mount():document.addEventListener('DOMContentLoaded',mount);
let t=0;const editing=()=>{const a=document.activeElement;return a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable);};
const hasCv=()=>!!document.querySelector(SEL.split(',').map(s=>s+' > *').join(','));
const on=(ms)=>{if(!hasCv())return;mount();black.classList.add('on');clearTimeout(t);if(ms)t=setTimeout(off,ms);};
const off=()=>{black.classList.remove('on');};
black.addEventListener('click',off);
// file pickers / own dialogs open a native window and blur the page: don't black out for those
let picking=0;document.addEventListener('click',e=>{const x=e.target.closest&&e.target.closest('input[type=file],label');if(x){picking=Date.now();}},true);
window.addEventListener('blur',()=>{if(Date.now()-picking<4000||own())return;on(0);});
window.addEventListener('focus',()=>setTimeout(off,250));
document.addEventListener('visibilitychange',()=>{if(document.hidden)on(0);else setTimeout(off,250);});
document.addEventListener('keydown',e=>{const k=e.key;
  if(k==='PrintScreen'||k==='Snapshot'){on(1500);try{navigator.clipboard&&navigator.clipboard.writeText('');}catch(x){}}
  if(!e.repeat&&((e.metaKey&&e.shiftKey&&/^[345]$/.test(k))||(e.metaKey&&e.shiftKey&&/^Digit[345]$/.test(e.code||''))||((e.ctrlKey||e.metaKey)&&e.shiftKey&&/^[sS]$/.test(k)&&!editing())||(!editing()&&((k==='Shift'&&e.metaKey)||(k==='Meta'&&e.shiftKey)))))on(2500);
  if((e.metaKey||e.ctrlKey)&&/^[pP]$/.test(k)&&!own()){e.preventDefault();e.stopPropagation();}
  if((e.metaKey||e.ctrlKey)&&/^[sS]$/.test(k)&&!e.shiftKey){e.preventDefault();}
},true);
document.addEventListener('keyup',e=>{if(e.key==='PrintScreen'||e.key==='Snapshot'){on(1500);try{navigator.clipboard&&navigator.clipboard.writeText('');}catch(x){}}},true);
const inCv=e=>e.target&&e.target.closest&&e.target.closest(SEL);
document.addEventListener('contextmenu',e=>{if(inCv(e))e.preventDefault();},true);
document.addEventListener('copy',e=>{if(inCv(e)&&!editing()){e.preventDefault();}},true);
document.addEventListener('dragstart',e=>{if(inCv(e))e.preventDefault();},true);
const own=()=>document.documentElement.classList.contains('sk-printing')||!!document.getElementById('sk-print-root')||window.__skPrintOK;
window.addEventListener('beforeprint',()=>{if(own()){document.documentElement.classList.add('sk-printing');return;}on(0);});window.addEventListener('afterprint',()=>{document.documentElement.classList.remove('sk-printing');window.__skPrintOK=0;setTimeout(off,300);});
})();
