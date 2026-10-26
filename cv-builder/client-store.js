// Customer CV Builder: no login. CVs live in this browser only.
(function(){if(window.SKP)return;
const G={username:'guest',name:'',role:'user'};
const rid=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s;};
window.SKP={client:true,me:async()=>G,logout:async()=>true,getCV:async()=>null,newCode:async k=>(k==='europass'?'EP-':'CV-')+rid(),saveCV:async()=>true,logCV:async()=>true};
})();
