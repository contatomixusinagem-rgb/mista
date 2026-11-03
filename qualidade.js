
/* ===== v95: Qualidade › Planos de inspeção (Agente da Qualidade, mesmo molde do Agente CNC) =====
   Arrasta o desenho → o agente escolhe as características e baloneia → conferência com balões arrastáveis,
   tabela editável, orientar o agente, validar → PDF (desenho balonado + plano) na identidade MIX ou STAR. */
var QI_INSTR=["Paquímetro","Paquímetro de profundidade","Micrômetro externo","Micrômetro interno","Micrômetro de profundidade","Relógio comparador","Súbito","Traçador de altura","Tampão passa/não passa","Anel passa/não passa","Calibrador de rosca","Calibrador de raio","Projetor de perfil","Rugosímetro","Durômetro","Goniômetro","Visual"];
var QI_COR={MIX:{p:"#EC3237",a:"#010066"},STAR:{p:"#FF781F",a:"#001C3E"}};
var QI={list:[],sub:false,open:"",jobs:[],file:null,pv:[],pvErr:"",draft:{emp:"",pecas:"5",cli:"",mat:"",trat:"",obs:""},q:"",ed:null,edId:"",add:false,or:{},img:{},drag:null};
IDP.planos_inspecao="PI";
function qiSub(){
  if(QI.sub||!PR.db)return;QI.sub=true;
  PR.db.collection("planos_inspecao").onSnapshot(function(sn){
    QI.list=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c}).sort(function(a,b){return(b.criado||0)-(a.criado||0)});
    qiRefresh();
  },function(){});
}
(function wqi(){if(typeof PR!=="undefined"&&PR&&PR.db){qiSub();return}setTimeout(wqi,700)})();
function qiRefresh(){if(S.tab!=="m-qpi")return;if(QI.drag)return;mxRender()}
function qiP(id){return QI.list.filter(function(x){return x.id===id})[0]||null}

/* ---------- números: limites a partir do nominal e da tolerância ---------- */
function qiNum(s){var m=String(s==null?"":s).replace(/\s/g,"").match(/[-+]?\d+(?:[.,]\d+)?/);return m?parseFloat(m[0].replace(",",".")):NaN}
function qiDec(s){var m=String(s||"").match(/[.,](\d+)/g);var d=0;(m||[]).forEach(function(x){d=Math.max(d,x.length-1)});return d}
function qiFmt(v,d){return isFinite(v)?v.toFixed(Math.max(d,1)).replace(".",","):""}
function qiLim(nom,tol){
  var n=qiNum(String(nom||"").replace(/^[^\d+-]*(?=\d)/,"")),t=String(tol||"").replace(/\s+/g," ").trim();if(!isFinite(n)||!t)return null;
  var d=Math.max(qiDec(nom),qiDec(t)),m;
  if((m=t.match(/^(?:±|\+\/-|\+-)\s*([\d.,]+)/)))return{min:qiFmt(n-qiNum(m[1]),d),max:qiFmt(n+qiNum(m[1]),d)};
  var nums=t.match(/[+-]?\s*\d+(?:[.,]\d+)?/g);
  if(nums&&nums.length>=2&&/[+-]/.test(t)){var a=qiNum(nums[0].replace(/\s/g,"")),b=qiNum(nums[1].replace(/\s/g,""));
    if(/^\s*\+/.test(nums[1])===false&&/^\s*-/.test(nums[1])===false&&/^\s*-/.test(nums[0]))b=0;
    var hi=Math.max(a,b),lo=Math.min(a,b);return{min:qiFmt(n+lo,d),max:qiFmt(n+hi,d)}}
  if(nums&&nums.length===1&&/^[+-]/.test(t)){var c=qiNum(nums[0].replace(/\s/g,""));return c>=0?{min:qiFmt(n,d),max:qiFmt(n+c,d)}:{min:qiFmt(n+c,d),max:qiFmt(n,d)}}
  return null;
}
/* balões: posição inicial sem sobrepor (coordenadas 0..1 da página) */
function qiPlace(its,asp){
  var R=0.022,placed=[];
  its.forEach(function(it){if(it.bx!=null&&it.by!=null){placed.push(it);return}
    var ax=it.ax,ay=it.ay,best=null;
    var offs=[[-1,-1],[1,-1],[-1,1],[1,1],[0,-1.4],[-1.4,0],[1.4,0],[0,1.4]];
    for(var ring=1;ring<=4&&!best;ring++)for(var k=0;k<offs.length;k++){
      var x=ax+offs[k][0]*0.035*ring,y=ay+offs[k][1]*0.035*ring*asp;
      if(x<R||x>1-R||y<R*asp||y>1-R*asp)continue;
      if(placed.every(function(q){return q.pg!==it.pg||Math.hypot(q.bx-x,(q.by-y)/asp)>2.3*R})){best=[x,y];break}}
    if(!best)best=[Math.min(1-R,Math.max(R,ax-0.035)),Math.min(1-R,Math.max(R,ay-0.035*asp))];
    it.bx=best[0];it.by=best[1];placed.push(it)});
  return its;
}

/* ---------- textos do PDF com posição (desenho com texto; CAD em curvas não tem) ---------- */
function qiTokens(f){
  if(agKind(f)!=="pdf")return Promise.resolve([]);
  return agBuf(f).then(function(buf){return agPdfLib().then(function(lib){return lib.getDocument({data:new Uint8Array(buf)}).promise.then(function(pdf){
    var out=[],p=Promise.resolve(),n=Math.min(pdf.numPages,2);
    for(var i=1;i<=n;i++)(function(i){p=p.then(function(){return pdf.getPage(i)}).then(function(pg){var vp=pg.getViewport({scale:1});return pg.getTextContent().then(function(tc){
      tc.items.forEach(function(it){var s=String(it.str||"").trim();if(!s||!/\d/.test(s)||s.length>40)return;
        var t=lib.Util.transform(vp.transform,it.transform),h=Math.hypot(t[2],t[3])||8,w=it.width||s.length*h*0.5;
        var rot=Math.atan2(it.transform[1],it.transform[0]),cx=t[4]+Math.cos(rot)*w/2,cy=t[5]-Math.sin(rot)*w/2-h*0.35;
        out.push({id:"T"+(out.length+1),pg:i,s:s,x:cx/vp.width,y:cy/vp.height})})})})})(i);
    return p.then(function(){return out.slice(0,400)})})})}).catch(function(){return[]});
}
function qiImgSize(b){return new Promise(function(ok){var u=URL.createObjectURL(b),im=new Image();im.onload=function(){ok({w:im.naturalWidth,h:im.naturalHeight});URL.revokeObjectURL(u)};im.onerror=function(){ok({w:0,h:0})};im.src=u})}

/* ---------- tela: lista + dados para o agente ---------- */
var QI_REQ=[["emp","Empresa do documento"],["pecas","Peças a medir"]];
function qiMissing(){var m=[];if(!QI.file)m.push("Desenho");QI_REQ.forEach(function(r){if(!String(QI.draft[r[0]]||"").trim())m.push(r[1])});return m}
function qiCanIa(){return!!(AG.sample&&AG.lim&&AG.lim.images)}
function qiGate(){var b=$("qi-go"),l=$("qi-miss");if(!b)return;var m=qiMissing(),on=qiCanIa();b.disabled=!!m.length||!on;
  if(l){l.innerHTML=!AG.sample?"Agente indisponível nesta visualização.":!on?"Esta visualização não envia imagens ao agente.":m.length?"Falta: "+m.map(esc).join(", "):"Tudo pronto. Pode gerar.";l.className="cn-miss"+(m.length||!on?"":" ok")}
  Array.prototype.forEach.call(document.querySelectorAll(".qi-side [data-req]"),function(el){el.classList.toggle("vazio",!String(QI.draft[el.dataset.req]||"").trim())})}
function qiSideHtml(){
  if(!QI.draft.emp)QI.draft.emp=empKey();
  function fld(k,lab,html,req){return'<label class="f cn-fld"'+(req?' data-req="'+k+'"':'')+'><span class="lb">'+lab+(req?' <i>*</i>':' <small>(opcional: o agente lê do desenho)</small>')+'</span>'+html+'</label>'}
  var cl=(PD.cli||[]).map(function(c){return'<option value="'+esc(c.nome)+'">'}).join("");
  return'<aside class="cn-side qi-side" aria-label="Dados para o agente"><div class="cn-side-h"><b>Dados para o agente</b><span>Só empresa e peças são obrigatórios; o resto o agente lê do desenho.</span></div><div class="cn-side-b">'+
   fld("emp","Empresa do documento",'<select id="qi-emp"><option value="MIX"'+(QI.draft.emp==="MIX"?" selected":"")+'>MIX Usinagem</option><option value="STAR"'+(QI.draft.emp==="STAR"?" selected":"")+'>STAR Tornearia</option></select>',1)+
   fld("pecas","Peças a medir",'<input id="qi-pecas" type="number" min="1" max="10" value="'+esc(QI.draft.pecas||"5")+'">',1)+
   fld("cli","Cliente",'<input id="qi-cli" list="qi-cli-l" value="'+esc(QI.draft.cli||"")+'" placeholder="ex.: GASCAT"><datalist id="qi-cli-l">'+cl+'</datalist>')+
   fld("mat","Material",'<input id="qi-mat" value="'+esc(QI.draft.mat||"")+'" placeholder="ex.: AISI 304">')+
   fld("trat","Tratamento",'<input id="qi-trat" value="'+esc(QI.draft.trat||"")+'" placeholder="ex.: zinco trivalente 12 µm">')+
   fld("obs","Observações para o agente",'<textarea id="qi-obs" rows="4" placeholder="ex.: medir 100% o Ø12 h7; cliente pede relatório de 10 peças">'+esc(QI.draft.obs||"")+'</textarea>')+
   '</div><div class="cn-side-f"><button class="btn pri cn-go" id="qi-go" type="button" data-qi="gerar" disabled>Gerar plano de inspeção</button><div class="cn-miss" id="qi-miss"></div></div></aside>';
}
function qiDropHtml(){
  var on=qiCanIa();
  var pend=QI.jobs.filter(function(j){return!j.docId&&(j.st==="ler"||j.st==="erro")});
  var jobs=pend.length?'<div class="agjobs cn-pend">'+pend.map(function(j){return'<div class="agjob '+j.st+'"><b>'+esc(j.nome)+'</b> <span>'+esc(j.ms)+'</span>'+(j.st==="erro"?' <button class="btn sm" type="button" data-qi="clr" data-j="'+j.id+'">Fechar</button>':'')+'</div>'}).join("")+'</div>':'';
  var inp='<input type="file" id="qi-file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*">';
  if(QI.file)return'<div class="card cn-prev"><div class="mx-bar"><h3 style="margin:0">Desenho</h3><span class="hint">'+esc(QI.file.name)+'</span><span class="sp"></span><button class="btn sm" type="button" data-qi="pick">Trocar desenho</button><button class="btn sm danger" type="button" data-qi="unstage">Remover</button></div>'+
    '<div class="cn-pv" id="qi-pv">'+(QI.pv.length?QI.pv.map(function(u){return'<img src="'+u+'" alt="Página do desenho">'}).join(""):'<span class="hint">'+(QI.pvErr?esc(QI.pvErr):"Gerando a prévia…")+'</span>')+'</div>'+inp+'</div>'+jobs;
  return'<div class="agdrop cn-drop'+(on?'':' off')+'" '+(on?'role="button" tabindex="0" data-qi="pick"':'')+'><span class="ai" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 15l3-3 3 3"/></svg></span><span class="tx">'+
   (!AG.sample?(AG.ready?'<b>Agente da Qualidade indisponível nesta visualização</b><span>Abra o Cérebro MISTA no claude.ai para gerar planos.</span>':'<b>Ligando o agente…</b><span>Um instante.</span>'):!on?'<b>Esta visualização não envia imagens ao agente</b><span>Abra o Cérebro MISTA no claude.ai.</span>':
    '<b>1. Arraste o desenho do cliente aqui</b><span>PDF ou imagem. Você vê a prévia, confere os dados ao lado e clica em Gerar plano. Ou clique para escolher o arquivo.</span>')+'</span>'+(on?inp:'')+'</div>'+jobs;
}
function qiStage(files){
  var f=files&&files[0];if(!f)return;var k=agKind(f);
  if(k!=="pdf"&&k!=="img"){toast("Use o desenho em PDF ou imagem (PNG/JPG).");return}
  QI.file=f;QI.pv=[];QI.pvErr="";mxRender();
  cnPreview(f,2,1200).then(function(u){if(QI.file!==f)return;QI.pv=u;var el=$("qi-pv");if(el)el.innerHTML=u.map(function(x){return'<img src="'+x+'" alt="Página do desenho">'}).join("")})
   .catch(function(){if(QI.file!==f)return;QI.pvErr="Não consegui mostrar a prévia, mas o arquivo será enviado ao agente.";var el=$("qi-pv");if(el)el.innerHTML='<span class="hint">'+esc(QI.pvErr)+'</span>'});
}
function qiLocal(id){return QI.jobs.filter(function(j){return j.docId===id&&(j.st==="ler"||j.st==="ia")})[0]}
function qiState(p){
  if(p.status==="gerando"){var loc=qiLocal(p.id),old=Date.now()-(p.inicio||p.criado||0)>12*60000;
    if(!loc&&old)return{c:"b",t:"Interrompido",sub:"a aba fechou durante a geração",retry:1};
    return{c:"i",t:"Gerando…",sub:'<span data-el="'+(p.inicio||p.criado||0)+'">'+cnElapsed(p.inicio||p.criado)+'</span>'+(loc?"":" · em outra aba"),run:1}}
  if(p.status==="erro")return{c:"b",t:"Erro",sub:esc(p.erro||""),retry:1};
  if(p.status==="validado")return{c:"g",t:"Validado",sub:esc(nowStr(p.validadoEm||p.criado))};
  return{c:"w",t:"Aguardando validação",sub:esc(nowStr(p.criado))};
}
function qiListHtml(){
  var q=normTxt(QI.q),L=QI.list.filter(function(p){return!q||normTxt([p.codigo,p.cliente,p.descricao,p.material,p.fonte&&p.fonte.nome].join(" ")).indexOf(q)>-1});
  return'<div class="mx-bar"><input type="search" id="qi-q" placeholder="Buscar peça, cliente, material…" value="'+esc(QI.q)+'"><span class="sp"></span><span class="hint">'+QI.list.length+(QI.list.length===1?" plano":" planos")+'</span></div>'+
   '<div class="tbx"><div class="qi-r fh"><span>ID</span><span>Peça</span><span>Cliente</span><span>Empresa</span><span>Itens</span><span>Situação</span><span></span></div>'+
   (L.length?L.map(function(p){var st=qiState(p),n=(p.itens||[]).length;
     return'<div class="qi-r" data-qi="open" data-id="'+esc(p.id)+'" title="Abrir"><span class="idtag">'+esc(cnIdTxt("planos_inspecao",p))+'</span><span><b>'+esc(p.codigo||(p.fonte&&p.fonte.nome)||"(sem código)")+(p.rev?' R'+esc(p.rev):'')+'</b><small>'+esc(p.descricao||"")+(p.material?' · '+esc(p.material):'')+'</small></span><span>'+esc(p.cliente||"–")+'</span><span>'+esc(p.emp||"MIX")+'</span><span>'+(n||"–")+'</span><span><span class="stp '+st.c+'">'+st.t+'</span><small>'+st.sub+'</small></span>'+
      '<span class="ra2">'+(st.retry&&p.fonte&&p.fonte.url?'<button class="btn sm" type="button" data-qi="retry" data-id="'+esc(p.id)+'">Gerar de novo</button>':'')+(n?'<button class="btn sm" type="button" data-qi="pdf" data-id="'+esc(p.id)+'" title="Baixar o plano em PDF">PDF</button>':'')+ibtn("trash","Excluir",'data-qi="del" data-id="'+esc(p.id)+'"',"danger")+'</span></div>'}).join(""):'<div class="mx-empty">'+(QI.list.length?"Nenhum plano com esse filtro.":"Nenhum plano ainda. Arraste um desenho acima.")+'</div>')+'</div>';
}
function renderQpi(box){
  qiSub();
  if(QI.open){var p=qiP(QI.open);if(p){
    var ae=document.activeElement,keep=null;if(ae&&box.contains(ae)&&/^(TEXTAREA|INPUT|SELECT)$/.test(ae.tagName)){var at=["data-qf","data-qh","data-qior"].filter(function(k){return ae.hasAttribute(k)})[0];if(at)keep={sel:"["+at+'="'+ae.getAttribute(at)+'"]',s:ae.selectionStart,e:ae.selectionEnd}}
    qiDetail(box,p);
    if(keep){var ne=box.querySelector(keep.sel);if(ne){try{ne.focus({preventScroll:true});if(keep.s!=null&&ne.setSelectionRange)ne.setSelectionRange(keep.s,keep.e)}catch(er){}}}
    return}QI.open=""}
  var ae2=document.activeElement,kid=ae2&&ae2.id&&/^qi-/.test(ae2.id)?ae2.id:"",pos=kid&&ae2.selectionStart!=null?ae2.selectionStart:null;
  box.innerHTML='<div class="mh"><div><h2>Planos de inspeção</h2><p>1. Arraste o desenho · 2. Confira os dados ao lado · 3. Gerar plano. O agente escolhe as características, baloneia o desenho e monta o plano; você ajusta os balões, corrige a tabela e valida.</p></div><span class="fase">Qualidade · F4</span></div>'+
   '<div class="cn-wrap"><div class="cn-main">'+qiDropHtml()+'</div>'+qiSideHtml()+'</div><div class="cn-list">'+qiListHtml()+'</div>';
  if(kid){var el=$(kid);if(el){el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos)}catch(er){}}}
  qiGate();
}
var _rmQi=renderMod;renderMod=function(box,k){if(k==="qpi"){renderQpi(box);return}return _rmQi.apply(this,arguments)};

/* ---------- conferência ---------- */
var QI_H=[["codigo","Desenho / código"],["rev","Revisão"],["cliente","Cliente"],["descricao","Descrição"],["material","Material"],["tratamento","Tratamento"],["tolGeral","Tolerância geral"],["pecas","Peças a medir"]];
function qiEdOf(p){
  if(QI.ed&&QI.edId===p.id&&(QI.ed.dirty||QI.ed.at===p.atualizado))return QI.ed;
  var e={at:p.atualizado,dirty:false,h:{},itens:JSON.parse(JSON.stringify(p.itens||[])),emp:p.emp||"MIX"};
  QI_H.forEach(function(k){e.h[k[0]]=p[k[0]]==null?"":String(p[k[0]])});
  QI.ed=e;QI.edId=p.id;return e;
}
function qiBalSvg(e,pg,asp,cor){
  var s="",W=1000,H=1000*asp,r=17;
  e.itens.forEach(function(it,i){if((it.pg||1)!==pg)return;var ax=it.ax*W,ay=it.ay*H,bx=it.bx*W,by=it.by*H,dx=ax-bx,dy=ay-by,d=Math.hypot(dx,dy)||1;
    s+='<line x1="'+(bx+dx/d*r).toFixed(1)+'" y1="'+(by+dy/d*r).toFixed(1)+'" x2="'+ax.toFixed(1)+'" y2="'+ay.toFixed(1)+'" stroke="'+cor+'" stroke-width="2"/>'+
      '<circle class="qi-anc" data-qa="'+i+'" cx="'+ax.toFixed(1)+'" cy="'+ay.toFixed(1)+'" r="5" fill="'+cor+'"/>'+
      '<g class="qi-bal'+(QI.sel===i?" sel":"")+'" data-qb="'+i+'"><circle cx="'+bx.toFixed(1)+'" cy="'+by.toFixed(1)+'" r="'+r+'" fill="#fff" stroke="'+cor+'" stroke-width="3"/><text x="'+bx.toFixed(1)+'" y="'+(by+6.5).toFixed(1)+'" text-anchor="middle" font-size="19" font-weight="700" fill="'+cor+'" font-family="Inter,Arial,sans-serif">'+(i+1)+'</text></g>'});
  return'<svg class="qi-ov" data-pg="'+pg+'" viewBox="0 0 '+W+' '+H.toFixed(1)+'" preserveAspectRatio="none">'+s+'</svg>';
}
function qiDwHtml(p,e){
  var urls=QI.img[p.id];if(!urls)return'<span class="hint">'+(p.fonte&&p.fonte.url?"Carregando o desenho…":"Desenho não guardado.")+'</span>';
  var cor=(QI_COR[e.emp]||QI_COR.MIX).p;
  return urls.map(function(u,i){return'<div class="qi-pg'+(QI.add?" add":"")+'" data-pgn="'+(i+1)+'"><img src="'+u.url+'" alt="Página '+(i+1)+' do desenho">'+qiBalSvg(e,i+1,u.h/u.w,cor)+'</div>'}).join("");
}
function qiTabHtml(e,ro){
  function inp(i,k,w,list){var v=e.itens[i][k]==null?"":e.itens[i][k];return'<input data-qf="'+i+':'+k+'" value="'+esc(v)+'"'+(list?' list="qi-ins-l"':'')+(ro?' readonly':'')+' style="width:100%">'}
  return'<datalist id="qi-ins-l">'+QI_INSTR.map(function(x){return'<option value="'+esc(x)+'">'}).join("")+'</datalist>'+
   '<div class="tbx"><table class="itb qi-tab"><thead><tr><th>Nº</th><th>Característica</th><th>Nominal</th><th>Tolerância</th><th>Mín.</th><th>Máx.</th><th>Instrumento</th><th>Frequência</th><th></th></tr></thead><tbody>'+
   e.itens.map(function(it,i){return'<tr data-qrow="'+i+'"'+(QI.sel===i?' class="sel"':'')+'><td class="qi-n"><button type="button" class="qi-nb" data-qi="selb" data-i="'+i+'" title="Mostrar o balão">'+(i+1)+'</button></td><td>'+inp(i,"carac")+'</td><td>'+inp(i,"nominal")+'</td><td>'+inp(i,"tol")+'</td><td>'+inp(i,"min")+'</td><td>'+inp(i,"max")+'</td><td>'+inp(i,"instr",0,1)+'</td><td>'+inp(i,"freq")+'</td><td>'+(ro?'':'<span class="qi-mv"><button type="button" class="btn sm" data-qi="up" data-i="'+i+'" title="Subir"'+(i?'':' disabled')+'>↑</button><button type="button" class="btn sm" data-qi="down" data-i="'+i+'" title="Descer"'+(i<e.itens.length-1?'':' disabled')+'>↓</button>'+ibtn("trash","Tirar este item",'data-qi="rmit" data-i="'+i+'"',"danger")+'</span>')+'</td></tr>'}).join("")+
   '<tr class="qi-vis"><td>V</td><td colspan="8">Isenção de rebarbas e aspecto visual: <b>OK / NOK</b> (sempre no plano)</td></tr></tbody></table></div>';
}
function qiOrientHtml(p,busy){
  if(!(p.itens||[]).length&&!p.orientacoes)return"";
  var d=QI.or[p.id]||"",pode=!!(p.fonte&&p.fonte.url),ant=p.orientacoes||[];
  return'<div class="card cn-or"><div class="mx-bar"><h3 style="margin:0">Orientar o agente</h3><span class="hint">Diga o que ficou errado e como deve ser. O agente refaz o plano com a sua orientação.</span></div>'+
   (ant.length?'<ul class="cn-or-l">'+ant.map(function(x){return'<li><time>'+esc(nowStr(x.em))+'</time><span>'+esc(x.txt)+'</span></li>'}).join("")+'</ul><p class="hint">Estas orientações continuam valendo em toda nova geração desta peça.</p>':'')+
   '<textarea rows="3" data-qior="'+esc(p.id)+'" placeholder="ex.: tire os chanfros; o Ø12 é medido com tampão passa/não passa; acrescente a planicidade da face A"'+(busy?' disabled':'')+'>'+esc(d)+'</textarea>'+
   '<div class="acts2"><span class="sp" style="flex:1"></span>'+(pode?'<button class="btn pri" type="button" data-qi="orientar" data-id="'+esc(p.id)+'"'+(busy||!d.trim()?' disabled':'')+'>Mandar corrigir</button>':'<span class="hint">Desenho não guardado: arraste o desenho de novo para refazer.</span>')+'</div></div>';
}
function qiDetail(box,p){
  var e=qiEdOf(p),val=p.status==="validado",busy=p.status==="gerando"||p.status==="erro",ok=!!e.itens.length,ro=val||busy;
  box.innerHTML='<div class="mx-bar"><button class="btn sm" type="button" data-qi="back">‹ Planos de inspeção</button><span class="sp"></span>'+
   (ok?'<button class="btn pri" type="button" data-qi="pdf" data-id="'+esc(p.id)+'">Baixar PDF</button>':'')+
   '<button class="btn danger" type="button" data-qi="del" data-id="'+esc(p.id)+'">Excluir</button></div>'+
   '<div class="card"><div class="dh2"><span class="idtag big">'+esc(cnIdTxt("planos_inspecao",p))+'</span><h2>'+esc(p.codigo||"Plano de inspeção")+(p.rev?' R'+esc(p.rev):'')+'</h2><span class="sub">'+esc([p.cliente,p.descricao,p.material].filter(Boolean).join(" · "))+'</span></div>'+
   (busy?'<div class="askbox"'+(p.status==="erro"?' style="background:var(--bad-bg);color:var(--bad)"':'')+'>'+(p.status==="erro"?'A geração falhou: '+esc(p.erro||"")+(p.fonte&&p.fonte.url?' <button class="btn sm" type="button" data-qi="retry" data-id="'+esc(p.id)+'">Gerar de novo</button>':''):'O agente está lendo o desenho e montando o plano ('+cnElapsed(p.inicio||p.criado)+' min). O resultado aparece aqui sozinho.')+'</div>':
    val?'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Validado'+(p.validadoEm?' em '+esc(nowStr(p.validadoEm)):'')+'. Para mudar, reabra para correção.</div>':
    '<div class="askbox">Aguardando validação. Confira os balões e a tabela, corrija o que precisar e valide. '+(e.dirty?'<b>Há correções não salvas.</b>':'')+'</div>')+'</div>'+
   '<div class="card"><div class="mx-bar"><h3 style="margin:0">Desenho balonado</h3><span class="hint">'+(ro?"":"Arraste o balão (círculo) ou a ponta da linha para ajustar. ")+'</span><span class="sp"></span>'+(ro?'':'<button class="btn sm'+(QI.add?' pri':'')+'" type="button" data-qi="addmode">'+(QI.add?"Clique no desenho onde fica a cota…":"+ Acrescentar balão")+'</button>')+'</div><div class="qi-dw" id="qi-dw">'+qiDwHtml(p,e)+'</div></div>'+
   '<div class="card"><div class="mx-bar"><h3 style="margin:0">Plano de inspeção</h3><span class="hint">'+e.itens.length+(e.itens.length===1?" característica":" características")+' + aspecto visual. Mín./máx. se recalculam ao mudar nominal ou tolerância.</span></div>'+qiTabHtml(e,ro)+'</div>'+
   '<div class="card"><h3>Identificação</h3><div class="qi-hd">'+QI_H.map(function(k){return'<label class="f"><span class="lb">'+k[1]+'</span><input data-qh="'+k[0]+'" value="'+esc(e.h[k[0]])+'"'+(ro?' readonly':'')+'></label>'}).join("")+
   '<label class="f"><span class="lb">Empresa do documento</span><select data-qh="emp"'+(ro?' disabled':'')+'><option value="MIX"'+(e.emp==="MIX"?" selected":"")+'>MIX Usinagem</option><option value="STAR"'+(e.emp==="STAR"?" selected":"")+'>STAR Tornearia</option></select></label></div>'+
   ((p.duvidas||[]).length?'<div class="cn-notes"><b>Dúvidas do agente</b><ul class="plan">'+p.duvidas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+((p.premissas||[]).length?'<div class="cn-notes"><b>Premissas adotadas</b><ul class="plan">'+p.premissas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+
   ((p.fora||[]).length?'<div class="cn-notes"><b>Ficou fora do balonamento (regra da casa)</b><p class="hint" style="margin:4px 0 0">'+esc(p.fora.join(" · "))+'</p></div>':'')+'</div>'+
   qiOrientHtml(p,busy)+
   (busy?'<div class="card">':'<div class="card"><div class="acts2">'+(val?'<button class="btn" type="button" data-qi="reopen" data-id="'+esc(p.id)+'">Reabrir para correção</button>':'<button class="btn" type="button" data-qi="save" data-id="'+esc(p.id)+'">Salvar correções</button><button class="btn" type="button" data-qi="desfaz" data-id="'+esc(p.id)+'"'+(e.dirty?'':' disabled')+'>Desfazer correções não salvas</button><span class="sp" style="flex:1"></span><button class="btn pri" type="button" data-qi="validate" data-id="'+esc(p.id)+'">Validar plano</button>')+'</div>')+
   '<h3>Histórico</h3><ul class="hist">'+((p.hist||[]).slice().reverse().map(function(h){return'<li><time>'+esc(nowStr(h.at))+'</time><span>'+esc(h.txt)+'</span></li>'}).join("")||'<li><span class="hint">Sem registros.</span></li>')+'</ul></div>';
  if(!QI.img[p.id]&&p.fonte&&p.fonte.url)qiDrawing(p).then(function(){if(QI.open===p.id)mxRender()}).catch(function(){var el=$("qi-dw");if(el)el.innerHTML='<span class="hint">Não consegui abrir o desenho guardado.</span>'});
}
function qiDrawing(p){
  if(QI.img[p.id])return Promise.resolve(QI.img[p.id]);
  return fetch(p.fonte.url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});
    return cnPreview(f,2,1800)}).then(function(us){return Promise.all(us.map(function(u){return new Promise(function(ok){var im=new Image();im.onload=function(){ok({url:u,w:im.naturalWidth,h:im.naturalHeight})};im.onerror=function(){ok({url:u,w:1,h:0.7})};im.src=u})}))}).then(function(a){QI.img[p.id]=a;return a});
}

/* ---------- edição: arrastar balões, acrescentar, tabela ---------- */
function qiMark(e){if(!e.dirty){e.dirty=true;var b=document.querySelector('[data-qi="desfaz"]');if(b)b.disabled=false}}
function qiPt(svg,ev){var r=svg.getBoundingClientRect();return{x:Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height))}}
document.addEventListener("pointerdown",function(ev){
  if(S.tab!=="m-qpi"||!QI.open)return;var p=qiP(QI.open);if(!p||p.status==="validado"||p.status==="gerando")return;
  var svg=ev.target.closest&&ev.target.closest(".qi-ov");if(!svg)return;var e=qiEdOf(p);
  if(QI.add){var pt=qiPt(svg,ev),pg=+svg.dataset.pg,asp=svg.viewBox.baseVal.height/1000;
    var it={pg:pg,ax:pt.x,ay:pt.y,carac:"",nominal:"",tol:"",min:"",max:"",instr:"",freq:"",manual:1};qiPlace([it].concat([]),asp);
    e.itens.push(it);QI.add=false;QI.sel=e.itens.length-1;qiMark(e);mxRender();setTimeout(function(){var x=document.querySelector('[data-qf="'+(e.itens.length-1)+':carac"]');if(x)x.focus()},40);ev.preventDefault();return}
  var g=ev.target.closest("[data-qb]"),a=ev.target.closest("[data-qa]");if(!g&&!a)return;
  ev.preventDefault();QI.drag={svg:svg,i:+(g?g.dataset.qb:a.dataset.qa),k:g?"b":"a",moved:false};
  QI.sel=QI.drag.i;
},true);
document.addEventListener("pointermove",function(ev){
  var d=QI.drag;if(!d)return;var p=qiP(QI.open);if(!p)return;var e=qiEdOf(p),it=e.itens[d.i];if(!it)return;var pt=qiPt(d.svg,ev);
  if(d.k==="b"){it.bx=pt.x;it.by=pt.y}else{it.ax=pt.x;it.ay=pt.y}d.moved=true;
  var urls=QI.img[p.id]||[],u=urls[(it.pg||1)-1]||{w:1,h:0.7};d.svg.outerHTML=qiBalSvg(e,it.pg||1,u.h/u.w,(QI_COR[e.emp]||QI_COR.MIX).p);
  d.svg=document.querySelector('.qi-ov[data-pg="'+(it.pg||1)+'"]');
});
document.addEventListener("pointerup",function(){var d=QI.drag;if(!d)return;QI.drag=null;var p=qiP(QI.open);if(!p)return;var e=qiEdOf(p);if(d.moved)qiMark(e);
  var row=document.querySelector('[data-qrow="'+d.i+'"]');Array.prototype.forEach.call(document.querySelectorAll(".qi-tab tr.sel"),function(r){r.classList.remove("sel")});if(row){row.classList.add("sel");try{row.scrollIntoView({block:"nearest"})}catch(er){}}});
function qiDiffTxt(p,e){
  var ch=[];QI_H.forEach(function(k){var a=p[k[0]]==null?"":String(p[k[0]]),b=e.h[k[0]];if(a!==b)ch.push(k[1]+": "+(a||"–")+" → "+(b||"–"))});
  if((p.emp||"MIX")!==e.emp)ch.push("Empresa: "+(p.emp||"MIX")+" → "+e.emp);
  var a0=p.itens||[],n0=a0.length,n1=e.itens.length;if(n0!==n1)ch.push("Itens: "+n0+" → "+n1);
  var ed=0,mv=0;e.itens.forEach(function(it,i){var o=a0[i];if(!o)return;if(["carac","nominal","tol","min","max","instr","freq"].some(function(k){return String(o[k]||"")!==String(it[k]||"")}))ed++;if(o.bx!==it.bx||o.by!==it.by||o.ax!==it.ax||o.ay!==it.ay)mv++});
  if(ed)ch.push(ed+(ed===1?" item corrigido na tabela":" itens corrigidos na tabela"));if(mv)ch.push(mv+(mv===1?" balão reposicionado":" balões reposicionados"));
  return ch;
}
function qiSet(p,patch,txt){patch.atualizado=Date.now();if(txt){var h=(p.hist||[]).slice(-199);h.push({at:Date.now(),uid:AG.uid||"",txt:txt});patch.hist=h}
  return PR.db.doc("planos_inspecao/"+p.id).update(patch).catch(function(){toast("Não consegui gravar.");throw 0})}
function qiPatch(e){var o={itens:e.itens.map(function(it){var c={};["pg","ax","ay","bx","by","carac","nominal","tol","min","max","instr","freq","manual","tok"].forEach(function(k){if(it[k]!=null)c[k]=it[k]});return c}),emp:e.emp};QI_H.forEach(function(k){o[k[0]]=e.h[k[0]]});return o}
function qiSalvar(p,extra,txt){var e=qiEdOf(p),ch=qiDiffTxt(p,e),patch=qiPatch(e);if(extra)for(var k in extra)patch[k]=extra[k];
  if(!ch.length&&!extra){toast("Nada mudou.");return Promise.resolve()}
  return qiSet(p,patch,(txt||"Correções salvas")+(ch.length?": "+ch.join("; ")+".":".")).then(function(){e.dirty=false;QI.ed=null;QI.edId=""})}

/* ---------- eventos ---------- */
$("v-mx").addEventListener("click",function(e){
  if(S.tab!=="m-qpi")return;
  if(e.target&&e.target.tagName==="INPUT"&&e.target.type==="file")return;
  var b=e.target.closest("[data-qi]");if(!b)return;e.stopPropagation();e.preventDefault();
  var a=b.dataset.qi,p=qiP(b.dataset.id||QI.open);
  if(a==="pick"){var fi=$("qi-file");if(fi)fi.click();return}
  if(a==="unstage"){QI.file=null;QI.pv=[];mxRender();return}
  if(a==="gerar"){var m=qiMissing();if(m.length){toast("Preencha antes de gerar: "+m.join(", ")+".");qiGate();return}qiGerar(QI.file);return}
  if(a==="clr"){QI.jobs=QI.jobs.filter(function(x){return x.id!==b.dataset.j});mxRender();return}
  if(a==="back"){var e0=QI.ed;if(e0&&e0.dirty){askDel("Sair sem salvar as correções?","As mudanças nos balões e na tabela ainda não foram salvas.",function(){QI.ed=null;QI.edId="";QI.open="";QI.add=false;mxRender()});return}QI.ed=null;QI.edId="";QI.open="";QI.add=false;mxRender();return}
  if(!p)return;
  if(a==="open"){QI.open=p.id;QI.sel=null;QI.add=false;if(QI.edId!==p.id){QI.ed=null;QI.edId=""}mxRender();return}
  if(a==="retry"){qiRetry(p);return}
  if(a==="pdf"){qiPdfDl(p);return}
  if(a==="addmode"){QI.add=!QI.add;mxRender();return}
  if(a==="selb"){QI.sel=+b.dataset.i;mxRender();var g=document.querySelector('[data-qb="'+b.dataset.i+'"]');if(g)try{g.scrollIntoView({block:"center",behavior:"smooth"})}catch(er){}return}
  var ed=qiEdOf(p),i=+b.dataset.i;
  if(a==="rmit"){var it=ed.itens[i];askDel("Tirar o item "+(i+1)+" do plano?",(it.carac||"")+" "+(it.nominal||""),function(){ed.itens.splice(i,1);QI.sel=null;qiMark(ed);mxRender()});return}
  if(a==="up"||a==="down"){var j=a==="up"?i-1:i+1;if(j<0||j>=ed.itens.length)return;var t=ed.itens[i];ed.itens[i]=ed.itens[j];ed.itens[j]=t;QI.sel=j;qiMark(ed);mxRender();return}
  if(a==="desfaz"){QI.ed=null;QI.edId="";QI.sel=null;mxRender();toast("Correções não salvas descartadas.");return}
  if(a==="save"){qiSalvar(p).then(function(){toast("Correções salvas.")});return}
  if(a==="validate"){askValidaQi(p);return}
  if(a==="reopen"){qiSet(p,{status:"aguardando"},"Reaberto para correção.");return}
  if(a==="orientar"){qiOrientar(p);return}
  if(a==="del"){askDel("Excluir o plano "+(p.codigo||"")+"?",(p.cliente||"Sem cliente")+" · "+(p.itens||[]).length+" características. Esta ação não pode ser desfeita.",function(){var lj=qiLocal(p.id);if(lj&&lj.ctl)try{lj.ctl.abort()}catch(er){}
    PR.db.doc("planos_inspecao/"+p.id).delete().then(function(){toast("Plano excluído.");if(QI.open===p.id){QI.open="";QI.ed=null;QI.edId=""}mxRender()}).catch(function(){toast("Não consegui excluir.")})});return}
},true);
$("v-mx").addEventListener("input",function(e){
  if(S.tab!=="m-qpi")return;var t=e.target,id=t.id;
  if(id==="qi-q"){QI.q=t.value;clearTimeout(QI.qt);QI.qt=setTimeout(mxRender,250);return}
  if(/^qi-(cli|mat|trat|obs|pecas)$/.test(id)){QI.draft[id.slice(3)]=t.value;qiGate();return}
  if(t.dataset&&t.dataset.qior){QI.or[t.dataset.qior]=t.value;var bt=document.querySelector('[data-qi="orientar"]');if(bt)bt.disabled=!t.value.trim();return}
  var p=qiP(QI.open);if(!p)return;var ed=qiEdOf(p);
  if(t.dataset&&t.dataset.qh){ed.h[t.dataset.qh]=t.value;qiMark(ed);return}
  if(t.dataset&&t.dataset.qf){var pr=t.dataset.qf.split(":"),i=+pr[0],k=pr[1],it=ed.itens[i];if(!it)return;it[k]=t.value;qiMark(ed);
    if(k==="nominal"||k==="tol"){var l=qiLim(it.nominal,it.tol);if(l){it.min=l.min;it.max=l.max;var a1=document.querySelector('[data-qf="'+i+':min"]'),a2=document.querySelector('[data-qf="'+i+':max"]');if(a1)a1.value=l.min;if(a2)a2.value=l.max}}}
});
$("v-mx").addEventListener("change",function(e){
  if(S.tab!=="m-qpi")return;var t=e.target;
  if(t.id==="qi-file"){qiStage(t.files);t.value="";return}
  if(t.id==="qi-emp"){QI.draft.emp=t.value;qiGate();return}
  if(t.dataset&&t.dataset.qh==="emp"){var p=qiP(QI.open);if(!p)return;var ed=qiEdOf(p);ed.emp=t.value;qiMark(ed);mxRender()}
});
$("v-mx").addEventListener("focusin",function(e){if(S.tab!=="m-qpi")return;var t=e.target;if(t.dataset&&t.dataset.qf){var i=+t.dataset.qf.split(":")[0];if(QI.sel!==i){QI.sel=i;Array.prototype.forEach.call(document.querySelectorAll(".qi-bal.sel,.qi-tab tr.sel"),function(x){x.classList.remove("sel")});var g=document.querySelector('[data-qb="'+i+'"]'),r=document.querySelector('[data-qrow="'+i+'"]');if(g)g.classList.add("sel");if(r)r.classList.add("sel")}}});
$("v-mx").addEventListener("keydown",function(e){if(S.tab==="m-qpi"&&(e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.qi==="pick"){e.preventDefault();var fi=$("qi-file");if(fi)fi.click()}});
window.addEventListener("drop",function(e){
  if(S.tab!=="m-qpi")return;e.preventDefault();e.stopImmediatePropagation();document.body.classList.remove("dragging");
  if(QI.open)return;if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)qiStage(e.dataTransfer.files);
},true);
setInterval(function(){if(S.tab!=="m-qpi")return;Array.prototype.forEach.call(document.querySelectorAll("[data-el]"),function(x){x.textContent=cnElapsed(+x.dataset.el)})},1000);
function askValidaQi(p){
  var m=$("mx-modal");
  m.innerHTML='<div class="card" role="dialog" aria-modal="true"><h3>Validar o plano '+esc(p.codigo||"")+'?</h3><p>Confirme que os balões e a tabela foram conferidos com o desenho. A validação fica no histórico com seu nome e a data.</p><div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-v="n">Não</button><button class="btn pri" type="button" data-v="y">Sim, validar</button></div></div>';
  m.hidden=false;setTimeout(function(){var n=m.querySelector('[data-v="n"]');if(n)n.focus()},40);
  m.onclick=function(ev){if(ev.target===m){m.hidden=true;return}var b=ev.target.closest("[data-v]");if(!b)return;m.hidden=true;
    if(b.dataset.v==="y")qiSalvar(p,{status:"validado",validadoPor:AG.uid||"",validadoEm:Date.now()},"Plano validado").then(function(){toast("Plano validado.")}).catch(function(){})};
}

/* ---------- geração ---------- */
function qiPrompt(j,sizes,toks){
  var d=j.draft;
  return"Você é o Agente da Qualidade da "+(d.emp==="STAR"?"STAR TORNEARIA":"MIX USINAGEM")+" (usinagem sob encomenda, Indaiatuba SP). Monte o PLANO DE INSPEÇÃO dimensional da peça do desenho anexado (arquivo: "+j.f.name+") e indique onde fica cada balão.\n\n"+
  "REGRAS DE BALONAMENTO DA CASA (validadas pelo gestor):\n"+
  "- Nem tudo é balonado. Ficam FORA por padrão: ângulos, chanfros, raios, medidas visuais, cotas de referência entre parênteses, dureza, rugosidade e notas de texto (quebrar cantos, região de corte etc.). Liste o que deixou fora em \"fora\" (curto).\n"+
  "- ENTRAM: diâmetros, comprimentos, alturas e posições funcionais com tolerância, espessura, roscas (como característica com calibrador de rosca), e planicidade/paralelismo/GD&T quando indicados.\n"+
  "- Exemplo de corte do gestor: num desenho com 37 cotas, ficaram 13. Seja enxuto.\n"+
  "- Cota sem tolerância indicada: use a tolerância geral do desenho (ex.: ±0,1 ou ISO 2768-mK com a faixa calculada) e diga isso em premissas.\n"+
  "- O item de isenção de rebarbas e aspecto visual (OK/NOK) é fixo e a página acrescenta sozinha: NÃO o liste.\n"+
  "- instrumento: o tipo adequado à tolerância (Paquímetro, Micrômetro externo/interno, Relógio comparador, Súbito, Traçador de altura, Tampão passa/não passa, Anel passa/não passa, Calibrador de rosca, Projetor de perfil…), com a faixa quando fizer sentido (ex.: Micrômetro externo 0-25). Ainda não há cadastro de instrumentos: não invente tag.\n"+
  "- freq: frequência de inspeção (padrão \""+(d.pecas||5)+" peças\"; 100% quando a cota for crítica ou o cliente pedir).\n"+
  "- min e max: limites já calculados (vírgula decimal). Para ajuste ISO (h7, H7, g6…) calcule pela tabela ISO 286.\n\n"+
  "DADOS INFORMADOS: empresa "+d.emp+"; peças a medir: "+(d.pecas||5)+"; cliente: "+(d.cli||"ler do desenho")+"; material: "+(d.mat||"ler do desenho")+"; tratamento: "+(d.trat||"ler do desenho")+"; observações: "+(d.obs||"nenhuma")+".\n\n"+
  "POSIÇÃO DOS BALÕES: as imagens anexadas são as páginas do desenho, na ordem ("+sizes.map(function(s,i){return"página "+(i+1)+": "+s.w+" x "+s.h+" pixels"}).join("; ")+"). Para cada característica dê pg (nº da página) e x, y = centro do TEXTO da cota em PIXELS da imagem (origem no canto superior esquerdo). Seja preciso: o balão é desenhado com essa ponta.\n"+
  (toks.length?"TEXTOS DO PDF COM POSIÇÃO EXATA (id, página, texto): "+toks.map(function(t){return t.id+" p"+t.pg+" "+JSON.stringify(t.s)}).join("; ")+"\nQuando a cota escolhida for um desses textos, preencha tok com o id (a página usa a posição exata) e ainda dê x, y aproximados.\n":"")+
  "\nFORMATO DA RESPOSTA: só um bloco ```json com:\n{\"codigo\":\"nº do desenho/código da peça\",\"revisao\":\"\",\"cliente\":\"\",\"descricao\":\"\",\"material\":\"\",\"tratamento\":\"\",\"tolGeral\":\"\",\"itens\":[{\"pg\":1,\"x\":0,\"y\":0,\"tok\":\"\",\"carac\":\"ex.: Diâmetro externo\",\"nominal\":\"ex.: Ø25\",\"tol\":\"ex.: h7 ou ±0,1 ou +0,05/-0\",\"min\":\"\",\"max\":\"\",\"instr\":\"\",\"freq\":\"\"}],\"fora\":[\"ex.: chanfros 0,5x45°\"],\"premissas\":[\"...\"],\"duvidas\":[\"...\"]}\n"+
  "Ordem dos itens: leia o desenho da esquerda para a direita e de cima para baixo, vista por vista. premissas e duvidas com no máximo 5 itens cada.";
}
function qiParse(t){t=String(t||"");var m=t.match(/```(?:json)?\s*([\s\S]*?)```/),s=m?m[1]:t.slice(t.indexOf("{"),t.lastIndexOf("}")+1);try{return JSON.parse(s)}catch(e){return null}}
function qiGerar(f){
  if(!qiCanIa()){toast("O agente não está disponível nesta visualização.");return}
  if(!PR.db){toast("Banco indisponível.");return}if(!f)return;
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,draft:JSON.parse(JSON.stringify(QI.draft))};
  QI.file=null;QI.pv=[];QI.jobs.unshift(j);QI.jobs=QI.jobs.slice(0,8);qiRun(j);
}
function qiRetry(p,extra){
  if(!qiCanIa()){toast("O agente não está disponível nesta visualização.");return}
  if(!p.fonte||!p.fonte.url){toast("O desenho original não está guardado. Arraste de novo.");return}
  toast("Buscando o desenho guardado…");
  fetch(p.fonte.url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});
    var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,docId:p.id,asset:{id:p.fonte.id,url:p.fonte.url},orients:(p.orientacoes||[]).map(function(x){return x.txt}),
      draft:{emp:p.emp||"MIX",pecas:p.pecas||"5",cli:p.cliInf||"",mat:p.matInf||"",trat:p.tratInf||"",obs:p.obsInf||""}};
    if(extra)for(var k in extra)j[k]=extra[k];
    QI.jobs.unshift(j);qiRun(j);
  }).catch(function(){toast("Não consegui buscar o desenho guardado. Arraste de novo.")});
}
function qiJob(j,st,ms){j.st=st;j.ms=ms;if(S.tab==="m-qpi"&&!QI.open){var a=document.activeElement;if(a&&/^qi-(cli|mat|trat|obs|pecas)$/.test(a.id))return;mxRender()}}
function qiRun(j){
  var prep,asset=j.asset||null,t0=Date.now(),toks=[],sizes=[];
  qiJob(j,"ler","Abrindo o desenho…");
  return agPrep(j.f).then(function(p){prep=p;
    if(!prep.imgs||!prep.imgs.length)throw new Error("Não consegui preparar a imagem do desenho para o agente.");
    return Promise.all(prep.imgs.map(qiImgSize)).then(function(s){sizes=s});
  }).then(function(){return qiTokens(j.f).then(function(t){toks=t})
  }).then(function(){
    if(!asset&&AG.assets&&AG.assets.upload){qiJob(j,"ler","Guardando o desenho…");return AG.assets.upload(j.f).then(function(r){asset=r}).catch(function(){asset=null})}
  }).then(function(){
    var d=j.draft,base={emp:d.emp||"MIX",pecas:String(d.pecas||"5"),cliInf:d.cli||"",matInf:d.mat||"",tratInf:d.trat||"",obsInf:d.obs||"",status:"gerando",erro:"",inicio:t0,atualizado:t0,
      fonte:{nome:j.f.name,tipo:prep.kind,id:asset?asset.id:"",url:asset?asset.url:""}};
    if(j.docId){var old=qiP(j.docId)||{},h=(old.hist||[]).slice(-199);h.push({at:t0,uid:AG.uid||"",txt:j.orient?"Correção pedida ao agente: "+j.orient:"Nova geração iniciada."});base.hist=h;
      return PR.db.doc("planos_inspecao/"+j.docId).update(base)}
    j.docId="pi-"+t0.toString(36)+"-"+rid().slice(0,4);
    base.codigo=j.f.name.replace(/\.[^.]+$/,"");base.rev="";base.cliente=d.cli||"";base.descricao="";base.material=d.mat||"";base.tratamento=d.trat||"";base.itens=[];base.premissas=[];base.duvidas=[];
    base.criado=t0;base.criadoPor=AG.uid||"";base.hist=[{at:t0,uid:AG.uid||"",txt:"Desenho "+j.f.name+" recebido; geração do plano iniciada."}];
    return cnNextId("planos_inspecao").then(function(n){base.idSeq=n;return PR.db.doc("planos_inspecao/"+j.docId).set(base)});
  }).then(function(){
    if(j.st==="erro")throw new Error("Cancelado pelo usuário.");
    qiJob(j,"ia","O agente está lendo o desenho…");
    j.ctl=new AbortController();
    var o={signal:j.ctl.signal,cache:false,modelTier:"complex",images:prep.imgs};
    j.to=setTimeout(function(){j.tempo=1;try{j.ctl.abort()}catch(er){}},8*60000);
    var pr=qiPrompt(j,sizes,toks);
    if(j.orients&&j.orients.length)pr+="\n\nORIENTAÇÕES DO INSPETOR PARA ESTA PEÇA (valem sempre e têm prioridade; siga à risca):\n- "+j.orients.join("\n- ");
    if(j.orient&&j.antes)pr+="\n\nCORREÇÃO PEDIDA AGORA: "+j.orient+"\nPLANO ATUAL (x,y já em pixels; refaça aplicando a correção, mantenha o que não foi criticado e devolva o plano completo no mesmo formato):\n"+JSON.stringify(j.antes).slice(0,30000);
    return AG.sample(pr,o).then(function(r){clearTimeout(j.to);return r},function(e){clearTimeout(j.to);throw new Error(j.tempo?"O agente passou de 8 minutos sem terminar. Tente de novo.":e&&(e.name==="AbortError"||e.code==="aborted")?"Cancelado pelo usuário.":agErr(e))});
  }).then(function(r){
    var m=qiParse(r&&r.text);if(!m||!Array.isArray(m.itens))throw new Error("O agente não devolveu o plano no formato. Tente de novo.");
    var tk={};toks.forEach(function(t){tk[t.id]=t});
    var its=m.itens.slice(0,80).map(function(x){var pg=Math.max(1,Math.min(sizes.length,parseInt(x.pg,10)||1)),s=sizes[pg-1]||{w:1,h:1},t=x.tok&&tk[x.tok];
      var it={pg:t?t.pg:pg,ax:t?t.x:Math.min(1,Math.max(0,(+x.x||0)/(s.w||1))),ay:t?t.y:Math.min(1,Math.max(0,(+x.y||0)/(s.h||1))),tok:t?t.id:"",
        carac:String(x.carac||""),nominal:String(x.nominal||""),tol:String(x.tol||""),min:String(x.min||""),max:String(x.max||""),instr:String(x.instr||""),freq:String(x.freq||"")};
      if(!it.tol&&/^\s*(±|\+\/-)/.test(String(m.tolGeral||""))&&isFinite(qiNum(it.nominal)))it.tol=String(m.tolGeral).trim();
      if(!it.min||!it.max){var l=qiLim(it.nominal,it.tol);if(l){it.min=it.min||l.min;it.max=it.max||l.max}}return it});
    var pgs={};its.forEach(function(it){(pgs[it.pg]=pgs[it.pg]||[]).push(it)});
    Object.keys(pgs).forEach(function(k){var s=sizes[k-1]||{w:1,h:0.7};qiPlace(pgs[k],s.h/s.w)});
    var t=Date.now(),old=qiP(j.docId)||{},h=(old.hist||[]).slice(-199);
    h.push({at:t,uid:AG.uid||"",txt:"Plano gerado pelo agente em "+cnElapsed(t0)+" min ("+its.length+" características"+(toks.length?"; "+its.filter(function(x){return x.tok}).length+" com posição exata do PDF":"")+")."});
    var doc={codigo:String(m.codigo||j.f.name.replace(/\.[^.]+$/,"")),rev:String(m.revisao||""),cliente:String(m.cliente||j.draft.cli||""),descricao:String(m.descricao||""),material:String(m.material||j.draft.mat||""),tratamento:String(m.tratamento||j.draft.trat||""),tolGeral:String(m.tolGeral||""),
      itens:its,fora:(Array.isArray(m.fora)?m.fora:[]).map(String).slice(0,30),premissas:(Array.isArray(m.premissas)?m.premissas:[]).map(String).slice(0,5),duvidas:(Array.isArray(m.duvidas)?m.duvidas:[]).map(String).slice(0,5),
      status:"aguardando",erro:"",atualizado:t,hist:h};
    if(old.fixos)for(var fk in old.fixos)doc[fk]=old.fixos[fk];
    if(QI.edId===j.docId){QI.ed=null;QI.edId=""}
    return PR.db.doc("planos_inspecao/"+j.docId).update(doc).then(function(){qiJob(j,"ok","Plano gerado.");toast("Plano "+doc.codigo+" gerado. Aguardando validação.")});
  }).catch(function(e){
    var msg=(e&&e.message)||"Não consegui gerar o plano.";qiJob(j,"erro",msg);
    if(j.docId&&PR.db){var old=qiP(j.docId)||{},h=(old.hist||[]).slice(-199);h.push({at:Date.now(),uid:AG.uid||"",txt:"Geração falhou: "+msg});
      PR.db.doc("planos_inspecao/"+j.docId).update({status:"erro",erro:msg,atualizado:Date.now(),hist:h}).catch(function(){})}
  });
}
function qiOrientar(p){
  var txt=String(QI.or[p.id]||"").trim();if(!txt){toast("Escreva a orientação antes.");return}
  askDel("Mandar o agente corrigir o plano?","Ele recebe o plano atual e a sua orientação e refaz o "+(p.codigo||"plano")+" no mesmo ID. Correções feitas à mão e ainda não salvas serão perdidas"+(p.status==="validado"?"; a validação será desfeita":"")+".",function(){
    var t=Date.now(),lista=(p.orientacoes||[]).concat([{txt:txt,em:t,por:AG.uid||""}]),urls=QI.img[p.id]||[];
    var antes=(p.itens||[]).map(function(it){var u=urls[(it.pg||1)-1]||{w:1000,h:700};return{pg:it.pg,x:Math.round(it.ax*u.w),y:Math.round(it.ay*u.h),carac:it.carac,nominal:it.nominal,tol:it.tol,min:it.min,max:it.max,instr:it.instr,freq:it.freq}});
    var fx={};QI_H.forEach(function(k){if(k[0]!=="pecas"&&p[k[0]])fx[k[0]]=p[k[0]]});
    qiSet(p,{orientacoes:lista,fixos:fx},null).then(function(){
      try{PR.db.doc("qualidade_feedback/o-"+t.toString(36)).set({tipo:"orientacao",plano:p.id,codigo:p.codigo||"",cliente:p.cliente||"",txt:txt,em:t,por:AG.uid||""})}catch(e){}
      QI.or[p.id]="";QI.ed=null;QI.edId="";
      qiRetry(qiP(p.id)||p,{orient:txt,antes:antes});toast("Pedido enviado ao agente. O plano é refeito no mesmo ID.");
    });
  });
}

/* ---------- PDF: desenho balonado + plano (A4 paisagem), identidade da empresa ---------- */
function qiSvgJpeg(svg,pxW){return new Promise(function(ok,no){var im=new Image();im.onload=function(){var w=pxW,h=Math.round(pxW*210/297),cv=document.createElement("canvas");cv.width=w;cv.height=h;var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);try{ok({b:atob(cv.toDataURL("image/jpeg",0.9).split(",")[1]),w:w,h:h})}catch(e){no(e)}};im.onerror=function(){no(new Error("svg"))};
  im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+pxW+'" height="'+Math.round(pxW*210/297)+'" viewBox="0 0 297 210">'+svg+'</svg>')})}
function qiPdfPages(pgs,title){
  var objs=[],raw={},kids=[],first=4;pgs.forEach(function(g,k){kids.push((first+k*3)+" 0 R")});
  objs[1]="<< /Type /Catalog /Pages 2 0 R >>";objs[2]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+pgs.length+" >>";objs[3]="<< /Producer (MISTA) /Title ("+String(title||"").replace(/[()\\]/g,"").replace(/[^\x20-\x7e]/g,"")+") >>";
  pgs.forEach(function(g,k){var pid=first+k*3,iid=pid+1,cid=pid+2,st="q 841.89 0 0 595.28 0 0 cm /Im0 Do Q";
    objs[pid]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 "+iid+" 0 R >> >> /Contents "+cid+" 0 R >>";
    raw[iid]=g.b;objs[iid]="<< /Type /XObject /Subtype /Image /Width "+g.w+" /Height "+g.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+g.b.length+" >>";
    objs[cid]="<< /Length "+st.length+" >>\nstream\n"+st+"\nendstream"});
  var out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offs=[];
  for(var n=1;n<objs.length;n++){offs[n]=out.length;out+=raw[n]!=null?n+" 0 obj\n"+objs[n]+"\nstream\n"+raw[n]+"\nendstream\nendobj\n":n+" 0 obj\n"+objs[n]+"\nendobj\n"}
  var xr=out.length;out+="xref\n0 "+objs.length+"\n0000000000 65535 f \n";for(var m=1;m<objs.length;m++)out+=("0000000000"+offs[m]).slice(-10)+" 00000 n \n";
  out+="trailer\n<< /Size "+objs.length+" /Root 1 0 R /Info 3 0 R >>\nstartxref\n"+xr+"\n%%EOF";
  var u=new Uint8Array(out.length);for(var i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return new Blob([u],{type:"application/pdf"});
}
function qiT(x,y,s,pt,o){o=o||{};return'<text x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" font-family="Helvetica, Arial, sans-serif" font-size="'+(pt*0.3528).toFixed(3)+'"'+(o.bold?' font-weight="bold"':'')+' fill="'+(o.c||"#111")+'"'+(o.a?' text-anchor="'+o.a+'"':'')+'>'+fx(s)+'</text>'}
function qiCut(s,mm,pt){s=String(s||"");var mx=Math.max(3,Math.floor(mm/(pt*0.3528*0.52)));return s.length>mx?s.slice(0,mx-1)+"…":s}
function qiHead(p,E,cor,tit,pag,tot){
  var s='<rect x="10" y="8" width="277" height="20" fill="none" stroke="#9AA0B4" stroke-width="0.2"/>'+
    '<image x="12" y="10" width="40" height="16" preserveAspectRatio="xMinYMid meet" href="'+fx(E.logoPng)+'"/>'+
    qiT(148.5,17,tit,14,{bold:true,c:cor.a,a:"middle"})+qiT(148.5,23,E.razao+" · CNPJ "+E.cnpj,7,{c:"#555A70",a:"middle"})+
    qiT(285,15,cnIdTxt("planos_inspecao",p),11,{bold:true,c:cor.a,a:"end"})+qiT(285,20,"Folha "+pag+" de "+tot,7.5,{c:"#555A70",a:"end"})+
    qiT(285,25,p.status==="validado"?"VALIDADO":"AGUARDANDO VALIDAÇÃO",7.5,{bold:true,c:p.status==="validado"?"#1E7A4A":cor.p,a:"end"})+
    '<rect x="10" y="28" width="277" height="0.8" fill="'+cor.p+'"/>';
  return s;
}
function qiPdfSvgs(p,dw){
  var E=empData(p.emp==="STAR"?"STAR":"MIX"),cor=QI_COR[p.emp]||QI_COR.MIX,its=p.itens||[],n=Math.max(1,Math.min(10,parseInt(p.pecas,10)||5)),out=[];
  var RPP=14,tabPgs=Math.max(1,Math.ceil(its.length/RPP)),tot=dw.length+tabPgs;
  /* desenho balonado */
  dw.forEach(function(u,k){
    var bx=10,by=31,bw=277,bh=172,asp=u.h/u.w,w=bw,h=bw*asp;if(h>bh){h=bh;w=bh/asp}var x0=bx+(bw-w)/2,y0=by+(bh-h)/2,r=Math.max(2.4,Math.min(3.4,w/90));
    var s=qiHead(p,E,cor,"DESENHO BALONADO",k+1,tot)+'<image x="'+x0.toFixed(2)+'" y="'+y0.toFixed(2)+'" width="'+w.toFixed(2)+'" height="'+h.toFixed(2)+'" href="'+fx(u.url)+'"/>'+
      '<rect x="'+x0.toFixed(2)+'" y="'+y0.toFixed(2)+'" width="'+w.toFixed(2)+'" height="'+h.toFixed(2)+'" fill="none" stroke="#C9CDDA" stroke-width="0.2"/>';
    its.forEach(function(it,i){if((it.pg||1)!==k+1)return;var ax=x0+it.ax*w,ay=y0+it.ay*h,cx=x0+it.bx*w,cy=y0+it.by*h,dx=ax-cx,dy=ay-cy,dd=Math.hypot(dx,dy)||1;
      s+='<line x1="'+(cx+dx/dd*r).toFixed(2)+'" y1="'+(cy+dy/dd*r).toFixed(2)+'" x2="'+ax.toFixed(2)+'" y2="'+ay.toFixed(2)+'" stroke="'+cor.p+'" stroke-width="0.35"/><circle cx="'+ax.toFixed(2)+'" cy="'+ay.toFixed(2)+'" r="0.6" fill="'+cor.p+'"/>'+
        '<circle cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="'+r.toFixed(2)+'" fill="#fff" stroke="'+cor.p+'" stroke-width="0.45"/>'+qiT(cx,cy+r*0.38,String(i+1),r*2.6,{bold:true,c:cor.p,a:"middle"})});
    s+=qiT(10,207,"Peça "+(p.codigo||"")+(p.rev?" R"+p.rev:"")+"  ·  Cliente "+(p.cliente||"–")+"  ·  "+its.length+" características balonadas + aspecto visual",7,{c:"#555A70"});
    out.push(s)});
  /* plano */
  var cols=[["Nº",9],["Característica",52],["Nominal",22],["Tolerância",22],["Mín.",16],["Máx.",16],["Instrumento",38],["Frequência",20]],fixo=195,ok=14,pw=(277-fixo-ok)/n;
  for(var i=0;i<n;i++)cols.push(["P"+(i+1),pw]);cols.push(["OK/NOK",ok]);
  for(var tp=0;tp<tabPgs;tp++){
    var s=qiHead(p,E,cor,"PLANO DE INSPEÇÃO DIMENSIONAL",dw.length+tp+1,tot),y=32;
    var idf=[["Cliente",p.cliente],["Peça / desenho",(p.codigo||"")+(p.rev?" R"+p.rev:"")],["Descrição",p.descricao],["Material",p.material],["Tratamento",p.tratamento||"–"],["Tol. geral",p.tolGeral||"–"],["Peças medidas",String(n)],["Data",new Date().toLocaleDateString("pt-BR")]];
    idf.forEach(function(f,k){var cx=10+(k%4)*69.25,cy=y+Math.floor(k/4)*9;s+='<rect x="'+cx.toFixed(2)+'" y="'+cy+'" width="69.25" height="9" fill="'+(k%2?"#fff":"#F6F7FA")+'" stroke="#C9CDDA" stroke-width="0.15"/>'+qiT(cx+1.5,cy+3.4,f[0],6,{c:"#555A70"})+qiT(cx+1.5,cy+7.4,qiCut(f[1]||"–",66,8),8,{bold:true})});
    y+=21;var x=10;
    s+='<rect x="10" y="'+y+'" width="277" height="7" fill="'+cor.a+'"/>';cols.forEach(function(c){s+=qiT(x+c[1]/2,y+4.8,c[0],7,{bold:true,c:"#fff",a:"middle"});x+=c[1]});y+=7;
    var part=its.slice(tp*RPP,tp*RPP+RPP),last=tp===tabPgs-1;
    var rows=part.map(function(it,k){return[String(tp*RPP+k+1),it.carac,it.nominal,it.tol,it.min,it.max,it.instr,it.freq]});
    if(last)rows.push(["V","Isenção de rebarbas e aspecto visual","","","","","Visual",n+" peças"]);
    rows.forEach(function(r,k){x=10;s+='<rect x="10" y="'+y+'" width="277" height="7.4" fill="'+(k%2?"#F6F7FA":"#fff")+'"/>';
      cols.forEach(function(c,ci){var v=ci<r.length?r[ci]:"";s+='<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+c[1].toFixed(2)+'" height="7.4" fill="none" stroke="#C9CDDA" stroke-width="0.15"/>';
        if(v)s+=ci===0?'<circle cx="'+(x+c[1]/2).toFixed(2)+'" cy="'+(y+3.7)+'" r="2.6" fill="#fff" stroke="'+cor.p+'" stroke-width="0.35"/>'+qiT(x+c[1]/2,y+4.9,v,7,{bold:true,c:cor.p,a:"middle"}):qiT(ci===1||ci===6?x+1.2:x+c[1]/2,y+4.9,qiCut(v,c[1]-2,7.5),7.5,{a:ci===1||ci===6?null:"middle",bold:ci===2});
        x+=c[1]});y+=7.4});
    if(last){y+=4;
      s+=qiT(10,y+3,"Observações:",7.5,{bold:true})+'<line x1="32" y1="'+(y+3.6)+'" x2="287" y2="'+(y+3.6)+'" stroke="#9AA0B4" stroke-width="0.2"/>';y+=8;
      s+=qiT(10,y+3,"Disposição do lote:",7.5,{bold:true})+["Aprovado","Reprovado","Aprovado com concessão"].map(function(t,k){var xx=42+k*45;return'<rect x="'+xx+'" y="'+(y+0.5)+'" width="3.2" height="3.2" fill="none" stroke="#333" stroke-width="0.25"/>'+qiT(xx+5,y+3.2,t,7.5)}).join("");y+=10;
      [["Inspetor","Thales / João Pedro"],["Aprovação da Qualidade",""]].forEach(function(a,k){var xx=10+k*140;s+='<line x1="'+xx+'" y1="'+(y+8)+'" x2="'+(xx+120)+'" y2="'+(y+8)+'" stroke="#333" stroke-width="0.25"/>'+qiT(xx,y+11.5,a[0]+(a[1]?" ("+a[1]+")":"")+"   Data: ____/____/______",7,{c:"#555A70"})})}
    s+=qiT(10,207,E.razao+" · "+E.end+" · "+E.tel,6.5,{c:"#555A70"});
    out.push(s)}
  return out;
}
function qiPdf(p){
  return qiDrawing(p).catch(function(){return[]}).then(function(dw){var svgs=qiPdfSvgs(p,dw),pgs=[],pr=Promise.resolve();
    svgs.forEach(function(s){pr=pr.then(function(){return qiSvgJpeg(s,2480)}).then(function(j){pgs.push(j)})});
    return pr.then(function(){return qiPdfPages(pgs,(p.codigo||"")+" - Plano de inspecao")})});
}
function qiPdfDl(p){
  if(!(p.itens||[]).length){toast("Ainda não há plano para baixar.");return}
  var e=QI.edId===p.id&&QI.ed&&QI.ed.dirty;if(e)toast("Atenção: o PDF sai com a última versão salva. Salve as correções antes.");
  toast("Montando o PDF do plano…");
  qiPdf(p).then(function(b){cnSave((cnIdTxt("planos_inspecao",p)+"_"+(p.codigo||"PLANO")+(p.rev?"-R"+p.rev:"")).toUpperCase().replace(/[^A-Z0-9.\-_]+/g,"-")+"_PLANO-INSPECAO.pdf",b)}).catch(function(){toast("Não consegui montar o PDF.")});
}

/* ---------- menu ---------- */
MODS.qpi={n:"Planos de inspeção",fase:"Fase 4",et:[],txt:"",plan:[]};
MX_TABS.push("m-qpi");
var _stQpi=showTab;showTab=function(t){var r=_stQpi.apply(this,arguments);
  var a=$("t-qpi");if(a)a.setAttribute("aria-selected",String(t==="m-qpi"));
  if(t==="m-qpi"){$("crumb").innerHTML="Qualidade › <b>Planos de inspeção</b>";$("crumb-t").textContent="Planos de inspeção"}else{QI.add=false}
  return r};
