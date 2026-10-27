
/* ===== Folha leve: montagem automática, folha nunca dá erro, completar folha (pedidos 4 e 5 do agente CNC, 27/10/2026) ===== */
function cnNum(v){var n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null}
function cnPts(a){return(Array.isArray(a)?a:[]).map(function(q){return Array.isArray(q)?[cnNum(q[0]),cnNum(q[1])]:q&&typeof q==="object"?[cnNum(q.x),cnNum(q.y)]:null}).filter(function(q){return q&&q[0]!=null&&q[1]!=null})}
function cnCircs(a){return(Array.isArray(a)?a:[]).map(function(q){return Array.isArray(q)?[cnNum(q[0]),cnNum(q[1]),cnNum(q[2])]:q&&typeof q==="object"?[cnNum(q.cx!=null?q.cx:q.x),cnNum(q.cy!=null?q.cy:q.y),cnNum(q.r!=null?q.r:(q.d!=null?q.d/2:null))]:null}).filter(function(q){return q&&q[0]!=null&&q[1]!=null&&q[2]!=null&&q[2]>0})}
function cnFmtN(v){var r=Math.round(v*100)/100;return String(r).replace(".",",")}
/* desenho de montagem automático, em mm do papel, dentro da caixa (x,y,w,h) */
function cnMontAuto(p,o,x,y,w,h){
  var pts=cnPts(o.contorno),cs=cnCircs(o.circulos),disp=(String(o.dispositivo||"")+" "+String(o.fixacao||p.fixacaoInf||"")).toUpperCase(),s="";
  if(!pts.length&&!cs.length)return ftext(x+w/2,y+h/2-2,"Montagem automática: o agente não mandou o contorno da peça",8,{c:FV.rot,a:"middle"})+ftext(x+w/2,y+h/2+4,(o.fixacao||p.fixacaoInf||""),8,{c:FV.azul,a:"middle"});
  var X0=0,X1=0,Y0=0,Y1=0;pts.forEach(function(q){X0=Math.min(X0,q[0]);X1=Math.max(X1,q[0]);Y0=Math.min(Y0,q[1]);Y1=Math.max(Y1,q[1])});
  cs.forEach(function(c){X0=Math.min(X0,c[0]-c[2]);X1=Math.max(X1,c[0]+c[2]);Y0=Math.min(Y0,c[1]-c[2]);Y1=Math.max(Y1,c[1]+c[2])});
  var pw=Math.max(X1-X0,1),ph=Math.max(Y1-Y0,1),mx=28,my=12,sc=Math.min((w-2*mx)/pw,(h-2*my)/ph);
  var ox=x+mx+((w-2*mx)-pw*sc)/2,oy=y+my+((h-2*my)-ph*sc)/2;
  function px(v){return(ox+(v-X0)*sc).toFixed(2)}function py(v){return(oy+(Y1-v)*sc).toFixed(2)}
  var bx0=+px(X0),bx1=+px(X1),by0=+py(Y1),by1=+py(Y0),hat='fill="#C9CCD8" stroke="#8E93A8" stroke-width="0.25"';
  /* dispositivo (sem posição exata) */
  if(/PLACA|CASTANHA/.test(disp)){var cx=(bx0+bx1)/2,cy=(by0+by1)/2,rr=Math.max(bx1-bx0,by1-by0)/2+4;s+='<circle cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="'+rr.toFixed(2)+'" fill="none" stroke="#8E93A8" stroke-width="3.2" opacity="0.6"/>';
    [0,120,240].forEach(function(a){var r2=a*Math.PI/180;s+='<rect x="'+(cx+Math.cos(r2)*(rr+1)-2.5).toFixed(2)+'" y="'+(cy+Math.sin(r2)*(rr+1)-2.5).toFixed(2)+'" width="5" height="5" '+hat+'/>'});s+=ftext(cx,by1+(rr-(by1-by0)/2)+7,"PLACA",6.5,{c:FV.rot,a:"middle"})}
  else if(/DUAS|2 MORSAS|DUAS-MORSAS/.test(disp)){var mw=Math.min(14,(bx1-bx0)/4);[0.25,0.75].forEach(function(f){var cxm=bx0+(bx1-bx0)*f;s+='<rect x="'+(cxm-mw/2).toFixed(2)+'" y="'+(by0-4).toFixed(2)+'" width="'+mw.toFixed(2)+'" height="3.2" '+hat+'/><rect x="'+(cxm-mw/2).toFixed(2)+'" y="'+(by1+0.8).toFixed(2)+'" width="'+mw.toFixed(2)+'" height="3.2" '+hat+'/>'});s+=ftext((bx0+bx1)/2,by1+9,"DUAS MORSAS",6.5,{c:FV.rot,a:"middle"})}
  else if(/MORSA|SF1|SF2/.test(disp)||!disp.trim()){var jw=Math.min(bx1-bx0+8,w-8);s+='<rect x="'+((bx0+bx1)/2-jw/2).toFixed(2)+'" y="'+(by0-4).toFixed(2)+'" width="'+jw.toFixed(2)+'" height="3.2" '+hat+'/><rect x="'+((bx0+bx1)/2-jw/2).toFixed(2)+'" y="'+(by1+0.8).toFixed(2)+'" width="'+jw.toFixed(2)+'" height="3.2" '+hat+'/>'+ftext((bx0+bx1)/2,by1+9,"MORSA",6.5,{c:FV.rot,a:"middle"})}
  else s+=ftext((bx0+bx1)/2,by1+9,String(o.dispositivo||"").slice(0,40),6.5,{c:FV.rot,a:"middle"});
  /* peça */
  if(pts.length>2)s+='<polygon points="'+pts.map(function(q){return px(q[0])+","+py(q[1])}).join(" ")+'" fill="#E8EAF2" stroke="#010066" stroke-width="0.35"/>';
  else if(pts.length)s+='<rect x="'+bx0+'" y="'+by0+'" width="'+(bx1-bx0).toFixed(2)+'" height="'+(by1-by0).toFixed(2)+'" fill="#E8EAF2" stroke="#010066" stroke-width="0.35"/>';
  /* furos com cota X/Y a partir do zero */
  var lab=0;cs.slice(0,60).forEach(function(c){var cx2=+px(c[0]),cy2=+py(c[1]),r=Math.max(c[2]*sc,0.6);
    s+='<circle cx="'+cx2.toFixed(2)+'" cy="'+cy2.toFixed(2)+'" r="'+r.toFixed(2)+'" fill="#fff" stroke="#010066" stroke-width="0.3"/><path d="M'+(cx2-0.9).toFixed(2)+' '+cy2.toFixed(2)+'h1.8M'+cx2.toFixed(2)+' '+(cy2-0.9).toFixed(2)+'v1.8" stroke="#010066" stroke-width="0.15"/>';
    if(lab<24){lab++;s+=ftext(cx2+r+0.8,cy2-0.6,"X"+cnFmtN(c[0])+" Y"+cnFmtN(c[1]),5,{c:FV.azul})+ftext(cx2+r+0.8,cy2+2.2,"Ø"+cnFmtN(c[2]*2),4.6,{c:FV.rot})}});
  /* zero peça */
  var zx=+px(0),zy=+py(0);s+='<path d="M'+(zx-3.5).toFixed(2)+' '+zy.toFixed(2)+'h7M'+zx.toFixed(2)+' '+(zy-3.5).toFixed(2)+'v7" stroke="#EC3237" stroke-width="0.5"/><circle cx="'+zx.toFixed(2)+'" cy="'+zy.toFixed(2)+'" r="1.1" fill="none" stroke="#EC3237" stroke-width="0.35"/>'+ftext(zx+1.8,zy-1.8,"X0 Y0",6,{bold:true,c:"#EC3237"});
  return s;
}
/* o que falta na folha desta operação */
function cnFolhaFalta(o){var f=[];
  if(!cnPts(o.contorno).length)f.push("contorno");
  if(!Array.isArray(o.circulos))f.push("circulos");
  if(!String(o.dispositivo||"").trim())f.push("dispositivo");
  if((o.ferramentas||[]).length&&(o.ferramentas||[]).some(function(t){return!String(t.classe||"").trim()&&!String(t.suporte||"").trim()}))f.push("classe/suporte das ferramentas");
  if(!(o.ferramentas||[]).length)f.push("ferramentas");
  return f}
function cnFaltaHtml(p){
  var ops=p.ops||[],l=[];ops.forEach(function(o){var f=cnFolhaFalta(o);if(f.length)l.push((o.op||"")+": "+f.join(", "))});
  if(!l.length)return"";
  var busy=CN.compl&&CN.compl[p.id];
  return'<div class="askbox cn-falta"><span><b>Folha incompleta.</b> O programa está salvo e liberado para download. Faltou: '+esc(l.join(" · "))+'.</span><span class="sp" style="flex:1"></span><button class="btn pri sm" type="button" data-cnc="completar" data-id="'+esc(p.id)+'"'+(busy||!AG.sample?' disabled':'')+'>'+(busy?"Completando…":"Completar folha")+'</button></div>';
}
function cnCompletar(p){
  if(!AG.sample){toast("O agente não está disponível nesta visualização.");return}
  CN.compl=CN.compl||{};if(CN.compl[p.id])return;CN.compl[p.id]=1;mxRender();
  var c=cnCmd(p.comando)||{},ops=p.ops||[];
  var falt=ops.map(function(o){return{op:o.op,f:cnFolhaFalta(o)}}).filter(function(x){return x.f.length});
  var q="Você é o agente de programação CNC da MIX USINAGEM. O programa abaixo JÁ ESTÁ PRONTO e não deve ser refeito nem alterado. Preciso só dos dados que faltaram para a folha de processo.\n\nComando: "+c.n+" · "+c.maq+"\nPeça: "+(p.codigo||"")+(p.rev?" R"+p.rev:"")+" · "+(p.descricao||"")+" · material "+(p.material||p.materialInf||"")+"\nBruto: "+(p.bruto||"")+"\nFixação: "+(p.fixacaoInf||"")+"\nZero peça: "+(p.zeroInf||"")+"\n\n"+
    ops.map(function(o){return"=== "+o.op+" — "+(o.descricao||"")+"\nFerramentas: "+(o.ferramentas||[]).map(function(t){return t.t+" "+t.nome}).join("; ")+"\nPrograma:\n"+String(o.nc||"").slice(0,30000)}).join("\n\n")+
    "\n\nFALTA (por operação): "+falt.map(function(x){return x.op+": "+x.f.join(", ")}).join(" · ")+
    "\n\nResponda só com um bloco ```json: {\"operacoes\":[{\"op\":\"OP10\",\"contorno\":[[x,y],…],\"circulos\":[[cx,cy,r],…],\"dispositivo\":\"MORSA | DUAS-MORSAS | PLACA | DISPOSITIVO …\",\"ferramentas\":[{\"t\":\"T01\",\"classe\":\"\",\"suporte\":\"\",\"balanco\":\"\"}]}]}\n"+
    "contorno = contorno externo da peça vista de cima, em mm, nas coordenadas do zero peça da operação (no máximo 40 pontos); circulos = furos e rebaixos vistos de cima (centro e raio, mesmas coordenadas; lista vazia se não houver). Use o programa e o desenho para as posições.";
  var o2={cache:false,modelTier:"default"};
  var go=function(imgs){if(imgs&&imgs.length)o2.images=imgs.slice(0,1);return AG.sample(q,o2)};
  var pre=p.fonte&&p.fonte.url?fetch(p.fonte.url).then(function(r){return r.ok?r.blob():null}).then(function(b){if(!b)return[];var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});return agPrep(f).then(function(pp){return pp.imgs||[]}).catch(function(){return[]})}).catch(function(){return[]}):Promise.resolve([]);
  toast("Pedindo ao agente só os dados da folha…");
  pre.then(go).then(function(r){
    var m={};var t=String(r&&r.text||""),mm=t.match(/```json\s*([\s\S]*?)```/)||[null,t.slice(t.indexOf("{"),t.lastIndexOf("}")+1)];try{m=JSON.parse(mm[1])}catch(e){m={}}
    var add=Array.isArray(m.operacoes)?m.operacoes:[];if(!add.length)throw new Error("O agente não devolveu os dados da folha.");
    var novo=JSON.parse(JSON.stringify(ops)),feitos=[];
    novo.forEach(function(o,i){var a=add.filter(function(x){return String(x.op||"").toUpperCase().replace("-","")===String(o.op||"").toUpperCase().replace("-","")})[0]||add[i];if(!a)return;var antes=cnFolhaFalta(o);
      if(antes.indexOf("contorno")>-1&&cnPts(a.contorno).length)o.contorno=a.contorno.slice(0,400);
      if(antes.indexOf("circulos")>-1&&Array.isArray(a.circulos))o.circulos=a.circulos.slice(0,80);
      if(!String(o.dispositivo||"").trim()&&a.dispositivo)o.dispositivo=String(a.dispositivo);
      (a.ferramentas||[]).forEach(function(af){var t=(o.ferramentas||[]).filter(function(x){return String(x.t).toUpperCase()===String(af.t||"").toUpperCase()})[0];if(t){if(!t.classe&&af.classe)t.classe=String(af.classe);if(!t.suporte&&af.suporte)t.suporte=String(af.suporte);if(!t.balanco&&af.balanco!=null)t.balanco=String(af.balanco)}});
      if(cnFolhaFalta(o).length<antes.length)feitos.push(o.op)});
    return cnSet(p,{ops:novo},feitos.length?"Folha completada pelo agente ("+feitos.join(", ")+"); programa não alterado.":"Completar folha: o agente não trouxe dados novos.").then(function(){toast(feitos.length?"Folha completada.":"O agente não trouxe dados novos para a folha.")});
  }).catch(function(e){toast("Não consegui completar a folha: "+((e&&e.code)?agErr(e):(e&&e.message)||""))}).then(function(){delete CN.compl[p.id];mxRender()});
}
