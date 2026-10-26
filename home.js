/* ===== v81: estrutura de 7 módulos (config/modulos), menu novo, Início do usuário e perfis (26/10/2026) ===== */
var MODS_DEF={
  modulos:[
    {nome:"Administrativo",areas:[{nome:"Vendas",tela:"#t-ini"},{nome:"Compras",tela:"#t-mcomp"},{nome:"Financeiro",tela:"#t-mfin"},{nome:"Clientes",tela:"#t-cli"},{nome:"Fornecedores",tela:"#t-forn"},{nome:"Orçamentos",tela:"#t-pc"},{nome:"Pedidos",tela:"#t-ped"},{nome:"Contas a receber",tela:"#t-mfin"},{nome:"Contas a pagar"}]},
    {nome:"Engenharia",areas:[{nome:"Desenhos"},{nome:"Programas CNC",tela:"#t-cnc"},{nome:"Roteiros",tela:"#t-meng"},{nome:"Folhas de operação"},{nome:"Ferramentas"},{nome:"Dispositivos"}]},
    {nome:"Qualidade",areas:[{nome:"Primeira peça"},{nome:"Inspeções",tela:'.mod[data-m="qual"]'},{nome:"Certificados"},{nome:"Não conformidades"},{nome:"Instrumentos"}]},
    {nome:"PCP",areas:[{nome:"Ordens de produção",tela:'.mod[data-m="prod"]'},{nome:"Programação de máquinas"},{nome:"Máquinas"},{nome:"Apontamentos"},{nome:"Setup"}]},
    {nome:"Estoque",areas:[{nome:"Matéria-prima"},{nome:"Peças acabadas"},{nome:"Movimentações"},{nome:"Inventário"}]},
    {nome:"Configurações",areas:[{nome:"Usuários"},{nome:"Permissões"},{nome:"Empresas",tela:"#t-emp"},{nome:"Parâmetros de custo",tela:"#t-par"},{nome:"Painel de implantação",tela:".mod[data-cap]",gestor:true,grafo:false}]},
    {nome:"Controladoria",areas:[{nome:"Custos"},{nome:"Margens"},{nome:"Indicadores"},{nome:"Relatórios"}]}
  ],
  ligacoes_modulos:[["Administrativo","Engenharia"],["Engenharia","PCP"],["PCP","Qualidade"],["PCP","Estoque"],["Administrativo","Estoque"],["Administrativo","Controladoria"],["Configurações","Administrativo"],["Engenharia","Qualidade"]],
  ligacoes_areas:[["Administrativo","Orçamentos","Engenharia","Desenhos"],["Administrativo","Pedidos","PCP","Ordens de produção"],["Engenharia","Programas CNC","PCP","Máquinas"],["Administrativo","Compras","Estoque","Matéria-prima"],["Qualidade","Primeira peça","Engenharia","Programas CNC"],["PCP","Setup","Engenharia","Folhas de operação"],["PCP","Ordens de produção","Estoque","Matéria-prima"],["Qualidade","Inspeções","Estoque","Peças acabadas"],["Controladoria","Custos","Administrativo","Orçamentos"],["Controladoria","Indicadores","Administrativo","Financeiro"],["Configurações","Parâmetros de custo","Controladoria","Custos"],["PCP","Apontamentos","Controladoria","Custos"]]
};
var MS={def:MODS_DEF,gestor:false,open:null,cur:"",user:null,nome:""};
function msValid(d){return d&&Array.isArray(d.modulos)&&d.modulos.length&&d.modulos.every(function(m){return m&&m.nome&&Array.isArray(m.areas)})}
function msAreas(m){return(m.areas||[]).filter(function(a){return!a.gestor||MS.gestor})}

/* ---- menu ---- */
function msMenu(){
  var N=$("nmods");if(!N)return;var h='<button type="button" class="nm-i nm-home'+(S.tab==="home"?' on':'')+'" data-nm="home">Início</button><span class="nm-gap" aria-hidden="true"></span>';
  MS.def.modulos.forEach(function(m,i){var op=MS.open===m.nome;
    h+='<button type="button" class="nm-i'+(op?' open':'')+(MS.cur.indexOf(m.nome+"|")===0?' act':'')+'" data-nm="m" data-i="'+i+'" aria-expanded="'+op+'">'+esc(m.nome)+'</button>';
    if(op)h+='<div class="nm-sub">'+msAreas(m).map(function(a){var k=m.nome+"|"+a.nome;return'<button type="button" class="nm-a'+(MS.cur===k?' on':'')+(a.tela?'':' wip')+'" data-nm="a" data-i="'+i+'" data-a="'+esc(a.nome)+'">'+esc(a.nome)+'</button>'}).join("")+'</div>';
  });
  N.innerHTML=h;
}
function msGo(mi,an){
  var m=MS.def.modulos[mi];if(!m)return;var a=(m.areas||[]).filter(function(x){return x.nome===an})[0];if(!a)return;
  MS.open=m.nome;MS.cur=m.nome+"|"+a.nome;
  var el=a.tela?document.querySelector(a.tela):null;
  if(el){MS.going=1;try{el.click()}finally{MS.going=0}}
  else{MS.wip={m:m.nome,a:a.nome};showTab("wip")}
  msMenu();
}
function msOpenMod(nome){
  var i=-1;MS.def.modulos.forEach(function(m,k){if(m.nome===nome)i=k});if(i<0)return;
  var m=MS.def.modulos[i],first=msAreas(m).filter(function(a){return a.tela})[0]||msAreas(m)[0];
  MS.open=m.nome;if(first)msGo(i,first.nome);else msMenu();
}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-nm]");if(!b||!$("nmods")||!$("nmods").contains(b))return;
  var k=b.dataset.nm;
  if(k==="home"){MS.cur="";showTab("home");msMenu();return}
  if(k==="m"){var m=MS.def.modulos[+b.dataset.i];MS.open=MS.open===m.nome?null:m.nome;msMenu();return}
  if(k==="a")msGo(+b.dataset.i,b.dataset.a);
});
var _stMs=showTab;showTab=function(t){
  var r=_stMs.apply(this,arguments);
  $("v-home").hidden=t!=="home";$("v-wip").hidden=t!=="wip";
  if(t==="wip"&&MS.wip){$("wip-k").textContent=MS.wip.m;$("wip-t").textContent=MS.wip.a}
  if(t==="home"){MS.cur="";HM.start()}else HM.stop();
  if(!MS.going&&t!=="wip"&&t!=="home"){var k=msFind(t);if(k){MS.cur=k;MS.open=k.split("|")[0]}}
  msMenu();
  return r;
};
function msFind(t){
  var T={ini:"#t-ini",sv:"#t-pc",in:"#t-pc",itens:"#t-pc",prop:"#t-pc",ped:"#t-ped","m-comp":"#t-mcomp","m-fin":"#t-mfin","m-cnc":"#t-cnc","m-eng":"#t-meng",par:"#t-par",cap:".mod[data-cap]","m-prod":'.mod[data-m="prod"]',"m-qual":'.mod[data-m="qual"]'};
  var sel=t==="cad"?({cli:"#t-cli",forn:"#t-forn",emp:"#t-emp"}[PD.cadTab]||""):T[t];if(!sel)return"";
  var hit="";MS.def.modulos.forEach(function(m){(m.areas||[]).forEach(function(a){if(!hit&&a.tela===sel&&(!a.gestor||MS.gestor))hit=m.nome+"|"+a.nome})});return hit;
}

/* ---- Início: grafo de módulos (canvas 2D, forças) ---- */
var HM=(function(){
  var cv,cx,nodes=[],links=[],nbr=[],view={s:1,cx:0,cy:0},t=0,raf=0,W=1,H=1,dpr=1,hover=null,drag=null,moved=false,sel=null,reduce=false,built=false,on=false,ACC="#EC3237";
  function build(){
    var D=MS.def,seed=11,rnd=function(){seed=(seed*9301+49297)%233280;return seed/233280},idx={};nodes=[];links=[];
    function add(n){n.i=nodes.length;nodes.push(n);idx[n.label+"|"+n.mod]=n;return n}
    var mods=D.modulos;
    mods.forEach(function(m,k){var a=k/mods.length*Math.PI*2,h=add({label:m.nome,mod:m.nome,hub:true,x:Math.cos(a)*260,y:Math.sin(a)*170,vx:0,vy:0,deg:0});
      (m.areas||[]).forEach(function(s){if(s.grafo===false)return;var n=add({label:s.nome,mod:m.nome,hub:false,x:h.x+(rnd()-.5)*80,y:h.y+(rnd()-.5)*80,vx:0,vy:0,deg:0});links.push([h,n,70,.05])})});
    (D.ligacoes_modulos||[]).forEach(function(p){var a=idx[p[0]+"|"+p[0]],b=idx[p[1]+"|"+p[1]];if(a&&b)links.push([a,b,190,.012])});
    (D.ligacoes_areas||[]).forEach(function(p){var a=idx[p[1]+"|"+p[0]],b=idx[p[3]+"|"+p[2]];if(a&&b)links.push([a,b,150,.008])});
    links.forEach(function(l){l[0].deg++;l[1].deg++});
    nbr=nodes.map(function(){return{}});links.forEach(function(l){nbr[l[0].i][l[1].i]=1;nbr[l[1].i][l[0].i]=1});
    t=0;built=true;
  }
  function size(){if(!cv)return;var r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;W=Math.max(1,r.width);H=Math.max(1,r.height);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  function scr(n){return{x:(n.x-view.cx)*view.s+W/2,y:(n.y-view.cy)*view.s+H/2}}
  function wld(p){return{x:(p.x-W/2)/view.s+view.cx,y:(p.y-H/2)/view.s+view.cy}}
  function pick(p){var best=null,bd=1e9;nodes.forEach(function(n){var s=scr(n),dx=s.x-p.x,dy=s.y-p.y,d=dx*dx+dy*dy,lim=n.hub?22*22:16*16;if(d<lim&&d<bd){best=n;bd=d}});return best}
  function step(){
    var N=nodes,i,j;t++;
    for(i=0;i<N.length;i++){var a=N[i];for(j=i+1;j<N.length;j++){var b=N[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+.01;if(d2>90000)continue;var k=(a.hub&&b.hub)?9000:1300,f=k/d2,d=Math.sqrt(d2);dx/=d;dy/=d;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f}}
    links.forEach(function(l){var a=l[0],b=l[1],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-l[2])*l[3],fx=dx/d*f,fy=dy/d*f;a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy});
    var amb=reduce?0:.06;
    N.forEach(function(n){n.vx-=n.x*.0016;n.vy-=n.y*.0028;if(amb){n.vx+=Math.sin(t*.011+n.i*1.7)*amb;n.vy+=Math.cos(t*.009+n.i*2.3)*amb}n.vx*=.82;n.vy*=.82;if(n!==drag){n.x+=Math.max(-8,Math.min(8,n.vx));n.y+=Math.max(-8,Math.min(8,n.vy))}});
    var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;N.forEach(function(n){x0=Math.min(x0,n.x);x1=Math.max(x1,n.x);y0=Math.min(y0,n.y);y1=Math.max(y1,n.y)});
    var pad=Math.min(90,W*.08),ts=Math.min(1.9,Math.min((W-pad*2)/(x1-x0+1),(H-pad*2)/(y1-y0+1)));
    if(t<3){view.s=ts;view.cx=(x0+x1)/2;view.cy=(y0+y1)/2}
    view.s+=(ts-view.s)*.04;view.cx+=((x0+x1)/2-view.cx)*.04;view.cy+=((y0+y1)/2-view.cy)*.04;
  }
  function draw(){
    var c=cx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
    var g=c.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.6);g.addColorStop(0,"rgba(30,40,130,0.22)");g.addColorStop(1,"rgba(7,11,46,0)");c.fillStyle=g;c.fillRect(0,0,W,H);
    var f=hover,sm=!f&&sel?sel:null,act=f||sm;
    function lit(n){return!act?true:f?(n===f||nbr[f.i][n.i]||(f.hub&&n.mod===f.mod)):n.mod===sm}
    var P=nodes.map(scr);c.lineCap="round";
    links.forEach(function(l){var a=l[0],b=l[1],o=act?(lit(a)&&lit(b)):false,sa=P[a.i],sb=P[b.i];c.beginPath();c.moveTo(sa.x,sa.y);c.lineTo(sb.x,sb.y);
      if(o){c.strokeStyle=ACC;c.globalAlpha=.75;c.lineWidth=1.3}else{c.strokeStyle="#8C93C9";c.globalAlpha=act?.06:(a.hub&&b.hub?.32:.2);c.lineWidth=a.hub&&b.hub?1.1:.8}c.stroke()});
    c.globalAlpha=1;
    nodes.forEach(function(n){var s=P[n.i],o=lit(n),dim=act&&!o,r=n.hub?5+Math.min(6,n.deg*.45):3.2,hot=f===n||sm===n.mod;c.globalAlpha=dim?.18:1;
      if(n.hub){c.shadowColor=ACC;c.shadowBlur=hot?30:16;c.fillStyle=hot?"#FFFFFF":ACC}else{c.shadowBlur=(o&&act)?10:0;c.shadowColor=ACC;c.fillStyle=(o&&act)?"#FFB3B4":"#B4B9E6"}
      c.beginPath();c.arc(s.x,s.y,r,0,Math.PI*2);c.fill();c.shadowBlur=0});
    c.textAlign="center";c.textBaseline="top";
    nodes.forEach(function(n){var s=P[n.i],o=lit(n);
      if(n.hub){c.globalAlpha=act&&!o?.25:.95;c.font="600 14px Inter, system-ui, sans-serif";c.fillStyle="#F3F4FF";c.fillText(n.label,s.x,s.y+16)}
      else if(act&&o){c.globalAlpha=.9;c.font="500 12px Inter, system-ui, sans-serif";c.fillStyle="#D5D8F5";c.fillText(n.label,s.x,s.y+8)}});
    c.globalAlpha=1;
  }
  function card(){var m=(hover&&hover.mod)||sel,el=$("hm-card");if(!el)return;if(!m){el.hidden=true;return}
    var md=MS.def.modulos.filter(function(x){return x.nome===m})[0];if(!md){el.hidden=true;return}
    el.hidden=false;if(el.dataset.m===m)return;el.dataset.m=m;
    el.innerHTML='<span class="hm-cn">'+esc(m)+'</span><span class="hm-ci">'+esc(msAreas(md).filter(function(a){return a.grafo!==false}).map(function(a){return a.nome}).join(", "))+'</span><button type="button" class="hm-go" data-hmgo="'+esc(m)+'">Abrir '+esc(m)+'</button>'}
  function pos(e){var r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  function loop(){if(!on)return;step();draw();raf=requestAnimationFrame(loop)}
  function init(){
    cv=$("hm-cv");if(!cv||cx)return;cx=cv.getContext("2d");
    reduce=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if(window.ResizeObserver)new ResizeObserver(size).observe(cv);
    cv.addEventListener("pointermove",function(e){var p=pos(e);if(drag){var w=wld(p);drag.x=w.x;drag.y=w.y;drag.vx=0;drag.vy=0;moved=true;return}var n=pick(p);hover=n;cv.style.cursor=n?"pointer":"default";card()});
    cv.addEventListener("pointerleave",function(){hover=null;card()});
    cv.addEventListener("pointerdown",function(e){var n=pick(pos(e));if(n){drag=n;moved=false;try{cv.setPointerCapture(e.pointerId)}catch(x){}}else{sel=null;card()}});
    cv.addEventListener("pointerup",function(){if(drag&&!moved){sel=drag.mod;card()}drag=null});
    $("hm-card").addEventListener("click",function(e){var b=e.target.closest("[data-hmgo]");if(b)msOpenMod(b.dataset.hmgo)});
  }
  return{
    start:function(){init();if(!cx)return;if(!built)build();size();if(!on){on=true;loop()}},
    stop:function(){on=false;cancelAnimationFrame(raf)},
    rebuild:function(){built=false;sel=null;hover=null;var el=$("hm-card");if(el){el.hidden=true;el.dataset.m=""}if(on){build()}},
    accent:function(c){ACC=c||"#EC3237"}
  };
})();

/* ---- clima (Indaiatuba) ---- */
var CLIMA={c:"",at:0};
function climaShow(){var el=$("hm-w");if(!el)return;if(CLIMA.c===""){el.hidden=true;return}el.hidden=false;$("hm-wt").textContent=Math.round(+CLIMA.c)+"°C"}
function climaGet(){
  try{fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.09&longitude=-47.22&current=temperature_2m&timezone=America%2FSao_Paulo").then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.current&&isFinite(j.current.temperature_2m)){CLIMA.c=j.current.temperature_2m;CLIMA.at=Date.now();climaShow()}}).catch(function(){})}catch(e){}
}
climaGet();setInterval(climaGet,30*60*1000);

/* ---- banco: estrutura de módulos, perfis, clima de reserva ---- */
(function wms(){if(!PR.db){setTimeout(wms,700);return}if(MS.sub)return;MS.sub=1;
  try{PR.db.collection("config").onSnapshot(function(sn){
    sn.docs.forEach(function(x){var d=x.data()||{};
      if(x.id==="modulos"&&msValid(d)&&JSON.stringify(d.modulos)!==JSON.stringify(MS.def.modulos)){MS.def={modulos:d.modulos,ligacoes_modulos:d.ligacoes_modulos||[],ligacoes_areas:d.ligacoes_areas||[]};HM.rebuild();msMenu()}
      if(x.id==="perfis"){MS.perfis=d;msPerfil()}
      if(x.id==="clima"&&d.c!=null&&(!CLIMA.at||(d.at||0)>CLIMA.at)){CLIMA.c=d.c;CLIMA.at=d.at||1;climaShow()}
    })},function(){})}catch(e){}
})();
function msPerfil(){
  var u=MS.user,ids=(MS.perfis&&MS.perfis.gestores)||[];
  var p=u?u.isOwner():Promise.resolve(false);
  p.then(function(own){var g=!!own||(AG.uid&&ids.indexOf(AG.uid)>-1);if(g!==MS.gestor){MS.gestor=g;msMenu()}document.body.dataset.perfil=MS.gestor?"gestor":"usuario";msConta()}).catch(function(){});
}
function msConta(){var b=$("nacc");if(!b)return;b.title=(MS.nome?MS.nome+" · ":"")+(MS.gestor?"Perfil: gestor":"Perfil: usuário")}
(function(){try{claude.use("user").then(function(u){MS.user=u||null;if(u&&u.me)u.me().then(function(m){MS.nome=(m&&m.name)||"";msConta()}).catch(function(){});setTimeout(msPerfil,1500);msPerfil()}).catch(function(){})}catch(e){}})();
$("nacc").addEventListener("click",function(){toast((MS.nome||"Você")+" · "+(MS.gestor?"perfil gestor (vê o Painel de implantação em Configurações)":"perfil usuário"))});
msMenu();
