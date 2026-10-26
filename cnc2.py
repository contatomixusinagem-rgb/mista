import sys,re
f=sys.argv[1];s=open(f,encoding='utf8').read()
def block(start,end):
    i=s.find(start);assert i>=0,start
    j=s.find(end,i+len(start));assert j>=0,end
    return i,j
def swap(start,end,new):
    global s
    i,j=block(start,end);s=s[:i]+new+s[j:]

SIDE=r'''function cnSideHtml(){
  var c=cnCmd(CN.cmd);
  return'<aside class="card cn-side" aria-label="Dados para o agente"><h3>Dados para o agente</h3>'+
   '<label class="f"><span class="lb">Comando da máquina *</span><select id="cn-cmd"><option value="">Escolha o comando…</option>'+CN_CMDS.map(function(x){var d=CN.dial[x.k]||{};return'<option value="'+x.k+'"'+(CN.cmd===x.k?" selected":"")+'>'+esc(x.n)+' · '+esc(x.maq)+(d.status==="validado"?"":" (dialeto a levantar)")+'</option>'}).join("")+'</select></label>'+
   (c&&(CN.dial[c.k]||{}).status!=="validado"?'<p class="hint cn-warn">Dialeto deste comando ainda não levantado: o programa sai em ISO conservador, com aviso.</p>':'')+
   '<label class="f"><span class="lb">Material</span><input id="cn-mat" value="'+esc(CN.draft.mat||"")+'" placeholder="se não estiver no desenho"></label>'+
   '<label class="f"><span class="lb">Bruto</span><textarea id="cn-bruto" rows="3" placeholder="ex.: 160 x 85 x 22, já esquadrejado; ou peça vinda do torno com Ø e comprimento">'+esc(CN.draft.bruto||"")+'</textarea></label>'+
   '<label class="f"><span class="lb">Instruções ao agente</span><textarea id="cn-inst" rows="11" placeholder="Fixação (morsa, duas morsas, placa), sequência de operações, onde fica o zero, o que já vem pronto, ferramentas a usar ou evitar, refrigeração…">'+esc(CN.draft.inst||"")+'</textarea></label>'+
   '<p class="hint">Estes dados valem para o próximo desenho que você arrastar. O agente usa o que estiver aqui e anota o que precisou supor.</p></aside>';
}
function cnDropHtml(){
  var on=!!AG.sample,img=!!(AG.lim&&AG.lim.images),c=cnCmd(CN.cmd);
  var pend=CN.jobs.filter(function(j){return !j.docId&&(j.st==="ler"||j.st==="erro")});
  return'<div class="agdrop cn-drop'+(on&&c?'':' off')+'" '+(on&&c?'role="button" tabindex="0" data-cnc="pick"':'')+'><span class="ai" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 15l3-3 3 3"/></svg></span><span class="tx">'+
   (!on?(AG.ready?'<b>Agente CNC indisponível nesta visualização</b><span>Abra o Cérebro MISTA no claude.ai para gerar programas.</span>':'<b>Ligando o agente…</b><span>Um instante.</span>'):
    !c?'<b>Escolha o comando da máquina ao lado</b><span>O programa sai no dialeto da máquina escolhida.</span>':
    '<b>Arraste o desenho de fresamento aqui</b><span>PDF'+(img?' ou imagem':'')+'. O programa entra na lista abaixo na hora, como "Gerando", e você acompanha de qualquer tela. Ou clique para escolher o arquivo.</span>')+
   '</span>'+(on?'<input type="file" id="cn-file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*">':'')+'</div>'+
   (pend.length?'<div class="agjobs cn-pend">'+pend.map(function(j){return'<div class="agjob '+j.st+'"><b>'+esc(j.nome)+'</b> <span>'+esc(j.ms)+'</span>'+(j.st==="erro"?' <button class="btn sm" type="button" data-cnc="clr" data-j="'+j.id+'">Fechar</button>':'')+'</div>'}).join("")+'</div>':'');
}
'''
swap('function cnDropHtml(){','function cnListHtml(){',SIDE)

LIST=r'''function cnElapsed(t){var s=Math.max(0,Math.round((Date.now()-(t||Date.now()))/1000));return Math.floor(s/60)+":"+("0"+s%60).slice(-2)}
function cnLocal(id){return CN.jobs.filter(function(j){return j.docId===id&&(j.st==="ler"||j.st==="ia")})[0]}
function cnState(p){
  if(p.status==="gerando"){var loc=cnLocal(p.id),old=Date.now()-(p.inicio||p.criado||0)>12*60000;
    if(!loc&&old)return{c:"b",t:"Interrompido",sub:"a aba fechou durante a geração",retry:1};
    return{c:"i",t:"Gerando…",sub:'<span data-el="'+(p.inicio||p.criado||0)+'">'+cnElapsed(p.inicio||p.criado)+'</span>'+(loc?"":" · em outra aba"),run:1}}
  if(p.status==="erro")return{c:"b",t:"Erro",sub:esc(p.erro||""),retry:1};
  if(p.status==="validado")return{c:"g",t:"Validado",sub:esc(nowStr(p.validadoEm||p.criado))};
  return{c:"w",t:"Aguardando validação",sub:esc(nowStr(p.criado))};
}
function cnListHtml(){
  var q=normTxt(CN.q),L=CN.list.filter(function(p){return !q||normTxt([p.codigo,p.cliente,p.descricao,p.material,p.fonte&&p.fonte.nome].join(" ")).indexOf(q)>-1});
  return'<div class="mx-bar"><input type="search" id="cn-q" placeholder="Buscar peça, cliente, material…" value="'+esc(CN.q)+'"><span class="sp"></span><span class="hint">'+CN.list.length+(CN.list.length===1?" programa":" programas")+'</span></div>'+
   '<div class="tbx"><div class="cn-r fh"><span>Peça</span><span>Cliente</span><span>Comando</span><span>OPs</span><span>Tempo</span><span>Situação</span><span></span></div>'+
   (L.length?L.map(function(p){var c=cnCmd(p.comando)||{},st=cnState(p),ok=!!(p.ops||[]).length;
     return'<div class="cn-r" data-cnc="open" data-id="'+esc(p.id)+'" title="Abrir"><span><b>'+esc(p.codigo||(p.fonte&&p.fonte.nome)||"(sem código)")+(p.rev?' R'+esc(p.rev):'')+'</b><small>'+esc(p.descricao||"")+(p.material?' · '+esc(p.material):'')+'</small></span><span>'+esc(p.cliente||"–")+'</span><span>'+esc(c.n||p.comando||"–")+'<small>'+esc(c.maq||"")+'</small></span><span>'+(ok?(p.ops||[]).length:"–")+'</span><span class="mono">'+esc(ok?cnTempo(p):"–")+'</span><span><span class="stp '+st.c+'">'+st.t+'</span><small>'+st.sub+'</small></span>'+
      '<span class="ra2">'+(st.retry&&p.fonte&&p.fonte.url?'<button class="btn sm" type="button" data-cnc="retry" data-id="'+esc(p.id)+'">Gerar de novo</button>':'')+(ok?ibtn("open","Baixar NC",'data-cnc="dl" data-id="'+esc(p.id)+'"').replace(IC.open,CN_IC.dl)+ibtn("open","Compartilhar",'data-cnc="share" data-id="'+esc(p.id)+'"').replace(IC.open,CN_IC.share):'')+ibtn("trash","Excluir",'data-cnc="del" data-id="'+esc(p.id)+'"',"danger")+'</span></div>'}).join(""):'<div class="mx-empty">'+(CN.list.length?"Nenhum programa com esse filtro.":"Nenhum programa ainda. Escolha o comando ao lado e arraste um desenho acima.")+'</div>')+'</div>';
}
'''
swap('function cnListHtml(){','var CN_IC={',LIST)

REND=r'''function renderCnc(box){
  cnSub();
  if(CN.open){var p=CN.list.filter(function(x){return x.id===CN.open})[0];if(p){cnDetail(box,p);return}CN.open=""}
  var ae=document.activeElement,keep=ae&&ae.id&&/^cn-/.test(ae.id)?ae.id:"",pos=keep&&ae.selectionStart!=null?ae.selectionStart:null,sc=keep&&ae.scrollTop||0;
  box.innerHTML='<div class="mh"><div><h2>Programas CNC</h2><p>Preencha os dados ao lado, arraste o desenho de fresamento e o agente gera o programa no dialeto da máquina. Fase 1: fresamento 2,5D.</p></div><span class="fase">Engenharia · F4</span></div>'+
   '<div class="cn-wrap"><div class="cn-main">'+cnDropHtml()+cnListHtml()+'</div>'+cnSideHtml()+'</div>';
  if(keep){var qi=$(keep);if(qi){qi.focus();try{if(pos!=null)qi.setSelectionRange(pos,pos);qi.scrollTop=sc}catch(er){}}}
}
'''
swap('function renderCnc(box){','var _rmCnc=renderMod;',REND)

RUN=r'''function cnJob(j,st,ms){j.st=st;j.ms=ms;if(S.tab==="m-cnc"&&!CN.open){var a=document.activeElement;if(a&&/^cn-(bruto|inst|mat)$/.test(a.id))return;mxRender()}}
function cnFiles(files){
  if(!AG.sample){toast("O agente não está disponível nesta visualização. Abra o MISTA no claude.ai.");return}
  var c=cnCmd(CN.cmd);if(!c){toast("Escolha o comando da máquina antes de arrastar o desenho.");var s=$("cn-cmd");if(s)s.focus();return}
  if(!PR.db){toast("Banco indisponível.");return}
  var f=files&&files[0];if(!f)return;
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,draft:{bruto:CN.draft.bruto||"",mat:CN.draft.mat||"",inst:CN.draft.inst||""}};
  CN.jobs.unshift(j);CN.jobs=CN.jobs.slice(0,8);cnRun(j);
}
function cnRetry(p){
  if(!AG.sample){toast("O agente não está disponível nesta visualização.");return}
  var c=cnCmd(p.comando);if(!c||!p.fonte||!p.fonte.url){toast("O desenho original não está guardado. Arraste de novo.");return}
  toast("Buscando o desenho guardado…");
  fetch(p.fonte.url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});
    var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,docId:p.id,asset:{id:p.fonte.id,url:p.fonte.url},draft:{bruto:p.bruto||"",mat:p.materialInf||"",inst:p.instrucoes||""}};
    CN.jobs.unshift(j);cnRun(j);
  }).catch(function(){toast("Não consegui buscar o desenho guardado. Arraste de novo.")});
}
function cnRun(j){
  var prep,asset=j.asset||null,t0=Date.now();
  cnJob(j,"ler","Abrindo o desenho…");
  return agPrep(j.f).then(function(p){prep=p;
    if(!asset&&AG.assets&&AG.assets.upload&&(prep.kind==="pdf"||prep.kind==="img")){cnJob(j,"ler","Guardando o desenho…");return AG.assets.upload(j.f).then(function(r){asset=r}).catch(function(){asset=null})}
  }).then(function(){
    var base={comando:j.c.k,bruto:j.draft.bruto,instrucoes:j.draft.inst,materialInf:j.draft.mat,status:"gerando",erro:"",inicio:t0,atualizado:t0,
      fonte:{nome:j.f.name,tipo:prep.kind,id:asset?asset.id:"",url:asset?asset.url:""}};
    if(j.docId){var old=CN.list.filter(function(x){return x.id===j.docId})[0]||{},h=(old.hist||[]).slice(-199);h.push({at:t0,uid:AG.uid||"",txt:"Nova geração iniciada ("+j.c.n+")."});base.hist=h;
      return PR.db.doc("programas_cnc/"+j.docId).update(base)}
    j.docId="cnc-"+t0.toString(36)+"-"+rid().slice(0,4);
    base.codigo=j.f.name.replace(/\.[^.]+$/,"");base.rev="";base.cliente="";base.descricao="";base.material=j.draft.mat;base.ops=[];base.premissas=[];base.duvidas=[];
    base.criado=t0;base.criadoPor=AG.uid||"";base.hist=[{at:t0,uid:AG.uid||"",txt:"Desenho "+j.f.name+" recebido; geração iniciada ("+j.c.n+")."}];
    return PR.db.doc("programas_cnc/"+j.docId).set(base);
  }).then(function(){
    if(j.st==="erro")throw new Error("Cancelado pelo usuário.");
    cnJob(j,"ia","O agente está programando…");
    j.ctl=new AbortController();
    var o={signal:j.ctl.signal,cache:false,modelTier:"complex"};if(prep.imgs&&prep.imgs.length)o.images=prep.imgs;
    var sv=CN.draft;CN.draft=j.draft;var pr=cnPrompt(j.c,j.f.name,prep);CN.draft=sv;
    return AG.sample(pr,o).catch(function(e){throw new Error(e&&e.name==="AbortError"?"Cancelado pelo usuário.":agErr(e))});
  }).then(function(r){
    var res=cnParse(r&&r.text);
    if(!res.ops.length){var dv=(res.meta&&res.meta.duvidas)||[];throw new Error(dv.length?"O agente não gerou programa: "+dv.join(" · "):"O agente não devolveu um programa. Tente de novo.")}
    var m=res.meta||{},t=Date.now(),old=CN.list.filter(function(x){return x.id===j.docId})[0]||{},h=(old.hist||[]).slice(-199);
    h.push({at:t,uid:AG.uid||"",txt:"Programa gerado pelo agente em "+cnElapsed(t0)+" min ("+res.ops.length+(res.ops.length===1?" operação).":" operações).")+(r&&r.truncated?" Resposta cortada: conferir o fim do programa.":"")});
    var doc={codigo:String(m.codigo||j.f.name.replace(/\.[^.]+$/,"")),rev:String(m.revisao||""),cliente:String(m.cliente||""),descricao:String(m.descricao||""),material:String(m.material||j.draft.mat||""),
      ops:res.ops,premissas:(Array.isArray(m.premissas)?m.premissas:[]).map(String).slice(0,20),duvidas:(Array.isArray(m.duvidas)?m.duvidas:[]).map(String).slice(0,20),
      truncado:!!(r&&r.truncated),status:"aguardando",erro:"",atualizado:t,hist:h};
    if(doc.truncado)doc.duvidas.unshift("A resposta do agente foi cortada: confira se o último programa termina com M30 e %.");
    return PR.db.doc("programas_cnc/"+j.docId).update(doc).then(function(){cnJob(j,"ok","Programa gerado.");toast("Programa "+doc.codigo+" gerado. Aguardando validação.")});
  }).catch(function(e){
    var msg=(e&&e.message)||"Não consegui gerar o programa.";cnJob(j,"erro",msg);
    if(j.docId&&PR.db){var old=CN.list.filter(function(x){return x.id===j.docId})[0]||{},h=(old.hist||[]).slice(-199);h.push({at:Date.now(),uid:AG.uid||"",txt:"Geração falhou: "+msg});
      PR.db.doc("programas_cnc/"+j.docId).update({status:"erro",erro:msg,atualizado:Date.now(),hist:h}).catch(function(){})}
  });
}
'''
swap('function cnJob(j,st,ms){','/* ---- baixar, compartilhar, excluir, validar ---- */',RUN)

def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:100]); s=s.replace(a,b)
# click handlers: retry, stop on row (del aborts local job)
rep('''  if(a==="dl"){cnDownload(p);return}''','''  if(a==="retry"){cnRetry(p);return}
  if(a==="dl"){cnDownload(p);return}''')
rep('''askDel("Excluir o programa "+(p.codigo||"")+"?",''','''askDel("Excluir o programa "+(p.codigo||"")+"?"+(p.status==="gerando"?" (a geração será cancelada)":""),''')
rep('''PR.db.doc("programas_cnc/"+p.id).delete().then(function(){toast("Programa excluído.");''','''var lj=cnLocal(p.id);if(lj){lj.st="erro";if(lj.ctl)try{lj.ctl.abort()}catch(er){}}PR.db.doc("programas_cnc/"+p.id).delete().then(function(){toast("Programa excluído.");''')
# detail: states gerando / erro
rep('''   (val?'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Validado''','''   (p.status==="gerando"||p.status==="erro"?'<div class="askbox"'+(p.status==="erro"?' style="background:var(--bad-bg);color:var(--bad)"':'')+'>'+(p.status==="erro"?'A geração falhou: '+esc(p.erro||"")+(p.fonte&&p.fonte.url?' <button class="btn sm" type="button" data-cnc="retry" data-id="'+esc(p.id)+'">Gerar de novo</button>':''):'O agente está programando este desenho ('+cnElapsed(p.inicio||p.criado)+' min). O resultado aparece aqui sozinho.')+'</div>':
   val?'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Validado''')
rep('''   '<div class="card"><div class="acts2">'+(val?''','''   (p.status==="gerando"||p.status==="erro"?'<div class="card">':'<div class="card"><div class="acts2">'+(val?''')
i=s.find('''<button class="btn pri" type="button" data-cnc="validate" data-id="'+esc(p.id)+'">Validar programa</button>')+'</div>'+''')
assert i>0
s=s.replace('''<button class="btn pri" type="button" data-cnc="validate" data-id="'+esc(p.id)+'">Validar programa</button>')+'</div>'+''','''<button class="btn pri" type="button" data-cnc="validate" data-id="'+esc(p.id)+'">Validar programa</button>')+'</div>')+''',1)
# elapsed ticker
rep('''/* ---- menu e Cérebro ---- */''','''setInterval(function(){if(S.tab!=="m-cnc")return;Array.prototype.forEach.call(document.querySelectorAll("[data-el]"),function(e){e.textContent=cnElapsed(+e.dataset.el)})},1000);
/* ---- menu e Cérebro ---- */''')
# capSync only counts real programs
rep('var v=CN.list.length>0?1:0;','var v=CN.list.some(function(p){return (p.ops||[]).length})?1:0;')
# css
rep('.cn-new .agdrop{margin-top:4px}','''.cn-wrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:14px;align-items:start}
.cn-main{display:flex;flex-direction:column;gap:12px;min-width:0}
.cn-side{position:sticky;top:12px;gap:12px}
.cn-side textarea,.cn-side input,.cn-side select{font-size:14px;line-height:1.45}
.cn-side textarea{resize:vertical}
.cn-side #cn-inst{min-height:240px}
.cn-warn{background:var(--warn-bg);color:var(--warn);padding:6px 9px;border-radius:6px;margin:0}
.cn-drop{min-height:130px;padding:22px 24px}
.cn-drop .tx b{font-size:16px}
.stp.i{background:#e3eeff;color:#1b4fa8}.stp.b{background:var(--bad-bg);color:var(--bad)}
.cn-r .stp+small{white-space:normal}
@media (max-width:1100px){.cn-wrap{grid-template-columns:minmax(0,1fr)}.cn-side{position:static;order:-1}}
.cn-new .agdrop{margin-top:4px}''')
open(f,'w',encoding='utf8').write(s)
print("ok")
