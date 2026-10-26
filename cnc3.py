import sys
f=sys.argv[1];s=open(f,encoding='utf8').read()
def swap(start,end,new):
    global s
    i=s.find(start);assert i>=0,start
    j=s.find(end,i+len(start));assert j>=0,end
    s=s[:i]+new+s[j:]
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:110]); s=s.replace(a,b)

# ---------- side panel (required fields + Gerar) and drop/preview ----------
SIDE=r'''var CN_REQ=[["cmd","Comando da máquina"],["mat","Material"],["bruto","Bruto"],["fix","Fixação"],["zero","Zero peça"],["inst","Sequência e observações"]];
function cnMissing(){var m=[];if(!CN.file)m.push("Desenho");CN_REQ.forEach(function(r){var v=r[0]==="cmd"?CN.cmd:CN.draft[r[0]];if(!String(v||"").trim())m.push(r[1])});return m}
function cnGate(){var b=$("cn-go"),l=$("cn-miss");if(!b)return;var m=cnMissing(),on=!!AG.sample;b.disabled=!!m.length||!on;
  if(l)l.innerHTML=!on?"Agente indisponível nesta visualização.":m.length?"Falta: "+m.map(esc).join(", "):"Tudo preenchido. Pode gerar.";
  if(l)l.className="cn-miss"+(m.length?"":" ok");
  Array.prototype.forEach.call(document.querySelectorAll(".cn-side [data-req]"),function(el){var k=el.dataset.req,v=k==="cmd"?CN.cmd:CN.draft[k];el.classList.toggle("vazio",!String(v||"").trim())})}
function cnSideHtml(){
  var c=cnCmd(CN.cmd);
  function fld(k,lab,html){return'<label class="f cn-fld" data-req="'+k+'"><span class="lb">'+lab+' <i>*</i></span>'+html+'</label>'}
  return'<aside class="cn-side" aria-label="Dados para o agente"><div class="cn-side-h"><b>Dados para o agente</b><span>Todos obrigatórios. O botão Gerar só libera com tudo preenchido.</span></div><div class="cn-side-b">'+
   fld("cmd","Comando da máquina",'<select id="cn-cmd"><option value="">Escolha o comando…</option>'+CN_CMDS.map(function(x){var d=CN.dial[x.k]||{};return'<option value="'+x.k+'"'+(CN.cmd===x.k?" selected":"")+'>'+esc(x.n)+' · '+esc(x.maq)+(d.status==="validado"?"":" (dialeto a levantar)")+'</option>'}).join("")+'</select>')+
   (c&&(CN.dial[c.k]||{}).status!=="validado"?'<p class="hint cn-warn">Dialeto deste comando ainda não levantado: o programa sai em ISO conservador, com aviso.</p>':'')+
   fld("mat","Material",'<input id="cn-mat" value="'+esc(CN.draft.mat||"")+'" placeholder="ex.: alumínio 6351, SAE 1045, inox 304">')+
   fld("bruto","Bruto",'<textarea id="cn-bruto" rows="3" placeholder="ex.: 160 x 85 x 22 esquadrejado; ou peça do torno Ø80 x 40">'+esc(CN.draft.bruto||"")+'</textarea>')+
   fld("fix","Fixação",'<textarea id="cn-fix" rows="2" placeholder="ex.: 1 morsa, calço retificado de 32 mm">'+esc(CN.draft.fix||"")+'</textarea>')+
   fld("zero","Zero peça",'<textarea id="cn-zero" rows="2" placeholder="ex.: X/Y no centro do furo central; Z no topo">'+esc(CN.draft.zero||"")+'</textarea>')+
   fld("inst","Sequência e observações",'<textarea id="cn-inst" rows="7" placeholder="Ordem das operações, o que já vem pronto, ferramentas a usar ou evitar, refrigeração…">'+esc(CN.draft.inst||"")+'</textarea>')+
   '</div><div class="cn-side-f"><button class="btn pri cn-go" id="cn-go" type="button" data-cnc="gerar" disabled>Gerar programa</button><div class="cn-miss" id="cn-miss"></div></div></aside>';
}
function cnDropHtml(){
  var on=!!AG.sample,img=!!(AG.lim&&AG.lim.images);
  var pend=CN.jobs.filter(function(j){return !j.docId&&(j.st==="ler"||j.st==="erro")});
  var jobs=pend.length?'<div class="agjobs cn-pend">'+pend.map(function(j){return'<div class="agjob '+j.st+'"><b>'+esc(j.nome)+'</b> <span>'+esc(j.ms)+'</span>'+(j.st==="erro"?' <button class="btn sm" type="button" data-cnc="clr" data-j="'+j.id+'">Fechar</button>':'')+'</div>'}).join("")+'</div>':'';
  if(CN.file)return'<div class="card cn-prev"><div class="mx-bar"><h3 style="margin:0">Desenho</h3><span class="hint">'+esc(CN.file.name)+'</span><span class="sp"></span><button class="btn sm" type="button" data-cnc="pick">Trocar desenho</button><button class="btn sm danger" type="button" data-cnc="unstage">Remover</button></div>'+
    '<div class="cn-pv" id="cn-pv">'+(CN.pv&&CN.pv.length?CN.pv.map(function(u){return'<img src="'+u+'" alt="Página do desenho">'}).join(""):'<span class="hint">'+(CN.pvErr?esc(CN.pvErr):"Gerando a prévia…")+'</span>')+'</div>'+
    '<input type="file" id="cn-file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"></div>'+jobs;
  return'<div class="agdrop cn-drop'+(on?'':' off')+'" '+(on?'role="button" tabindex="0" data-cnc="pick"':'')+'><span class="ai" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 15l3-3 3 3"/></svg></span><span class="tx">'+
   (!on?(AG.ready?'<b>Agente CNC indisponível nesta visualização</b><span>Abra o Cérebro MISTA no claude.ai para gerar programas.</span>':'<b>Ligando o agente…</b><span>Um instante.</span>'):
    '<b>1. Arraste o desenho de fresamento aqui</b><span>PDF'+(img?' ou imagem':'')+'. Você vê a prévia, preenche os dados ao lado e clica em Gerar programa. Ou clique para escolher o arquivo.</span>')+
   '</span>'+(on?'<input type="file" id="cn-file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*">':'')+'</div>'+jobs;
}
function cnStage(files){
  var f=files&&files[0];if(!f)return;var k=agKind(f);
  if(k!=="pdf"&&k!=="img"){toast("Use o desenho em PDF ou imagem (PNG/JPG).");return}
  CN.file=f;CN.pv=[];CN.pvErr="";mxRender();
  cnPreview(f,3,1200).then(function(urls){if(CN.file!==f)return;CN.pv=urls;var el=$("cn-pv");if(el)el.innerHTML=urls.map(function(u){return'<img src="'+u+'" alt="Página do desenho">'}).join("")})
   .catch(function(){if(CN.file!==f)return;CN.pvErr="Não consegui mostrar a prévia, mas o arquivo será enviado ao agente.";var el=$("cn-pv");if(el)el.innerHTML='<span class="hint">'+esc(CN.pvErr)+'</span>'});
  cnGate();
}
function cnPreview(blobOrFile,pages,width){
  var k=/pdf/i.test(blobOrFile.type||"")||/\.pdf$/i.test(blobOrFile.name||"")?"pdf":"img";
  if(k==="img")return Promise.resolve([URL.createObjectURL(blobOrFile)]);
  return agBuf(blobOrFile).then(function(buf){return agPdfLib().then(function(lib){return lib.getDocument({data:new Uint8Array(buf)}).promise})})
   .then(function(pdf){return agPdfRender(pdf,pages,width)}).then(function(cvs){return cvs.map(function(cv){return cv.toDataURL("image/jpeg",0.85)})});
}
'''
swap('function cnSideHtml(){','function cnElapsed(t){',SIDE)

# ---------- render: keep focus + gate ----------
rep('''  if(keep){var qi=$(keep);if(qi){qi.focus();try{if(pos!=null)qi.setSelectionRange(pos,pos);qi.scrollTop=sc}catch(er){}}}
}''','''  if(keep){var qi=$(keep);if(qi){qi.focus();try{if(pos!=null)qi.setSelectionRange(pos,pos);qi.scrollTop=sc}catch(er){}}}
  cnGate();
}''')
rep("<p>Preencha os dados ao lado, arraste o desenho de fresamento e o agente gera o programa no dialeto da máquina. Fase 1: fresamento 2,5D.</p>",
    "<p>1. Arraste o desenho · 2. Preencha os dados ao lado · 3. Gerar programa. O agente devolve o programa CNC e a folha de processo. Fase 1: fresamento 2,5D.</p>")

# ---------- files: generate from staged file ----------
rep('''function cnFiles(files){
  if(!AG.sample){toast("O agente não está disponível nesta visualização. Abra o MISTA no claude.ai.");return}
  var c=cnCmd(CN.cmd);if(!c){toast("Escolha o comando da máquina antes de arrastar o desenho.");var s=$("cn-cmd");if(s)s.focus();return}
  if(!PR.db){toast("Banco indisponível.");return}
  var f=files&&files[0];if(!f)return;
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,draft:{bruto:CN.draft.bruto||"",mat:CN.draft.mat||"",inst:CN.draft.inst||""}};''','''function cnFiles(files){
  if(!AG.sample){toast("O agente não está disponível nesta visualização. Abra o MISTA no claude.ai.");return}
  var m=cnMissing();if(m.length){toast("Preencha antes de gerar: "+m.join(", ")+".");cnGate();return}
  var c=cnCmd(CN.cmd);
  if(!PR.db){toast("Banco indisponível.");return}
  var f=files&&files[0];if(!f)return;
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,draft:{bruto:CN.draft.bruto||"",mat:CN.draft.mat||"",inst:CN.draft.inst||"",fix:CN.draft.fix||"",zero:CN.draft.zero||""}};
  CN.file=null;CN.pv=[];''')
rep('''draft:{bruto:p.bruto||"",mat:p.materialInf||"",inst:p.instrucoes||""}};''','''draft:{bruto:p.bruto||"",mat:p.materialInf||"",inst:p.instrucoes||"",fix:p.fixacaoInf||"",zero:p.zeroInf||""}};''')
rep('''var base={comando:j.c.k,bruto:j.draft.bruto,instrucoes:j.draft.inst,materialInf:j.draft.mat,status:"gerando"''','''var base={comando:j.c.k,bruto:j.draft.bruto,instrucoes:j.draft.inst,materialInf:j.draft.mat,fixacaoInf:j.draft.fix,zeroInf:j.draft.zero,status:"gerando"''')
rep('''    return PR.db.doc("programas_cnc/"+j.docId).set(base);''','''    return cnNextId("programas_cnc").then(function(idn){base.idSeq=idn;return PR.db.doc("programas_cnc/"+j.docId).set(base)});''')

# ---------- prompt: fixação, zero, folha fields ----------
rep('''"\\n- Instruções: "+(CN.draft.inst||"nenhuma")+"\\n\\n"+''','''"\\n- Fixação: "+(CN.draft.fix||"")+"\\n- Zero peça: "+(CN.draft.zero||"")+"\\n- Sequência e observações: "+(CN.draft.inst||"nenhuma")+"\\nSiga a fixação, o zero e a sequência do programador; se algo for inviável, diga em duvidas.\\n\\n"+''')
rep('''{\\"op\\":\\"OP10\\",\\"fixacao\\":\\"\\",\\"tempo\\":\\"XXMIN-XXS\\",''','''{\\"op\\":\\"OP10\\",\\"descricao\\":\\"o que esta operação usina, em uma ou duas frases\\",\\"fixacao\\":\\"\\",\\"zero\\":\\"\\",\\"tempo\\":\\"XXMIN-XXS\\",''')
rep('''return{op:String(o.op||n.op||"OP"+(i+1)*10).toUpperCase(),fixacao:String(o.fixacao||""),''','''return{op:String(o.op||n.op||"OP"+(i+1)*10).toUpperCase(),descricao:String(o.descricao||""),zero:String(o.zero||""),fixacao:String(o.fixacao||""),''')

# ---------- list: ID column + new download icons ----------
rep('''<div class="cn-r fh"><span>Peça</span>''','''<div class="cn-r fh"><span>ID</span><span>Peça</span>''')
rep('''     return'<div class="cn-r" data-cnc="open" data-id="'+esc(p.id)+'" title="Abrir"><span><b>'+esc(p.codigo''','''     return'<div class="cn-r" data-cnc="open" data-id="'+esc(p.id)+'" title="Abrir"><span class="idtag">'+esc(cnIdTxt("programas_cnc",p))+'</span><span><b>'+esc(p.codigo''')
rep('''(ok?ibtn("open","Baixar NC",'data-cnc="dl" data-id="'+esc(p.id)+'"').replace(IC.open,CN_IC.dl)+''','''(ok?'<button class="btn sm" type="button" data-cnc="dlzip" data-id="'+esc(p.id)+'" title="Baixar o programa CNC">CNC</button><button class="btn sm" type="button" data-cnc="dlfolha" data-id="'+esc(p.id)+'" title="Baixar a folha de processo">Folha</button>'+''')

# ---------- detail ----------
DET=r'''function cnDetail(box,p){
  var c=cnCmd(p.comando)||{},val=p.status==="validado",ops=p.ops||[],ok=!!ops.length;
  var busy=p.status==="gerando"||p.status==="erro";
  box.innerHTML='<div class="mx-bar"><button class="btn sm" type="button" data-cnc="back">‹ Programas CNC</button><span class="sp"></span>'+
   (ok?'<button class="btn pri" type="button" data-cnc="dlzip" data-id="'+esc(p.id)+'">Baixar CNC</button><button class="btn pri" type="button" data-cnc="dlfolha" data-id="'+esc(p.id)+'">Baixar folha de processo</button><button class="btn" type="button" data-cnc="share" data-id="'+esc(p.id)+'">Compartilhar</button>':'')+
   '<button class="btn danger" type="button" data-cnc="del" data-id="'+esc(p.id)+'">Excluir</button></div>'+
   '<div class="card"><div class="dh2"><span class="idtag big">'+esc(cnIdTxt("programas_cnc",p))+'</span><h2>'+esc(p.codigo||"Programa")+(p.rev?' R'+esc(p.rev):'')+'</h2><span class="sub">'+esc([p.cliente,p.descricao,p.material].filter(Boolean).join(" · "))+'</span></div>'+
   (busy?'<div class="askbox"'+(p.status==="erro"?' style="background:var(--bad-bg);color:var(--bad)"':'')+'>'+(p.status==="erro"?'A geração falhou: '+esc(p.erro||"")+(p.fonte&&p.fonte.url?' <button class="btn sm" type="button" data-cnc="retry" data-id="'+esc(p.id)+'">Gerar de novo</button>':''):'O agente está programando este desenho ('+cnElapsed(p.inicio||p.criado)+' min). O resultado aparece aqui sozinho.')+'</div>':
    val?'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Validado'+(p.validadoEm?' em '+esc(nowStr(p.validadoEm)):'')+'. Simule no CIMCO antes de levar à máquina.</div>':
    '<div class="askbox">Aguardando validação. Confira a folha e o programa, simule no CIMCO e só depois valide. O agente nunca envia programa à máquina.</div>')+
   '</div>'+
   '<div class="cn-det"><div class="card"><h3>Desenho</h3><div class="cn-pv" id="cn-dpv"><span class="hint">'+(p.fonte&&p.fonte.url?"Carregando o desenho…":"Desenho não guardado.")+'</span></div></div>'+
   '<div class="card"><h3>Dados informados</h3><dl class="cn-dl"><dt>Comando</dt><dd>'+esc(c.n||p.comando)+' · '+esc(c.maq||"")+'</dd><dt>Material</dt><dd>'+esc(p.materialInf||p.material||"–")+'</dd><dt>Bruto</dt><dd>'+esc(p.bruto||"–")+'</dd><dt>Fixação</dt><dd>'+esc(p.fixacaoInf||"–")+'</dd><dt>Zero peça</dt><dd>'+esc(p.zeroInf||"–")+'</dd><dt>Sequência</dt><dd>'+esc(p.instrucoes||"–")+'</dd></dl>'+
   ((p.duvidas||[]).length?'<div class="cn-notes"><b>Dúvidas do agente</b><ul class="plan">'+p.duvidas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+((p.premissas||[]).length?'<div class="cn-notes"><b>Premissas adotadas</b><ul class="plan">'+p.premissas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+'</div></div>'+
   (ok?'<div class="card"><div class="mx-bar"><h3 style="margin:0">Folha de processo · prévia</h3><span class="sp"></span><button class="btn sm pri" type="button" data-cnc="dlfolha" data-id="'+esc(p.id)+'">Baixar PDF</button></div><div class="cn-folhas">'+ops.map(function(o,i){return cnFolhaHtml(p,o,i)}).join("")+'</div></div>':'')+
   ops.map(function(o,i){return'<details class="card cn-progc"'+(i===0?'':'')+'><summary><b>Programa '+esc(o.op||("OP"+(i+1)*10))+'</b> <span class="mono hint">'+esc(cnFileName(p,o))+'</span> <span class="hint">· '+(String(o.nc||"").split("\n").length)+' linhas · abrir para conferir ou corrigir</span></summary>'+
     '<textarea class="cn-nc" data-cncop="'+i+'" spellcheck="false"'+(val?' readonly':'')+'>'+esc(o.nc||"")+'</textarea></details>'}).join("")+
   (busy?'<div class="card">':'<div class="card"><div class="acts2">'+(val?'<button class="btn" type="button" data-cnc="reopen" data-id="'+esc(p.id)+'">Reabrir para correção</button>':'<button class="btn" type="button" data-cnc="savenc" data-id="'+esc(p.id)+'">Salvar correções</button><span class="sp" style="flex:1"></span><button class="btn pri" type="button" data-cnc="validate" data-id="'+esc(p.id)+'">Validar programa</button>')+'</div>')+
   '<h3>Histórico</h3><ul class="hist">'+((p.hist||[]).slice().reverse().map(function(h){return'<li><time>'+esc(nowStr(h.at))+'</time><span>'+esc(h.txt)+'</span></li>'}).join("")||'<li><span class="hint">Sem registros.</span></li>')+'</ul></div>';
  cnDrawing(p).then(function(urls){var el=$("cn-dpv");if(!el)return;el.innerHTML=urls.length?urls.map(function(u){return'<img src="'+u+'" alt="Página do desenho">'}).join(""):'<span class="hint">Desenho não guardado.</span>';
    Array.prototype.forEach.call(document.querySelectorAll(".cn-f-img"),function(b){b.innerHTML=urls[0]?'<img src="'+urls[0]+'" alt="">':'<span class="hint">sem desenho</span>'})}).catch(function(){var el=$("cn-dpv");if(el)el.innerHTML='<span class="hint">Não consegui abrir o desenho guardado.</span>'});
}
CN.img={};
function cnDrawing(p){
  if(!p.fonte||!p.fonte.url)return Promise.resolve([]);
  if(CN.img[p.id])return Promise.resolve(CN.img[p.id]);
  return fetch(p.fonte.url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});
    return cnPreview(f,2,1400)}).then(function(u){CN.img[p.id]=u;return u});
}
function cnFolhaHtml(p,o,i){
  var c=cnCmd(p.comando)||{},E=empData(),val=p.status==="validado";
  var fe=o.ferramentas||[];
  return'<div class="cn-folha"><div class="cf-h"><img src="'+esc(E.logoPng)+'" alt=""><div><b>'+esc(E.razao)+'</b><small>CNPJ '+esc(E.cnpj)+'</small></div><div class="cf-t"><b>FOLHA DE OPERAÇÃO DE PROCESSO</b><span>'+esc(cnIdTxt("programas_cnc",p))+' · '+esc(o.op||"")+'</span><em class="'+(val?"ok":"")+'">'+(val?"VALIDADO":"AGUARDANDO VALIDAÇÃO")+'</em></div></div>'+
   '<div class="cf-g"><div><span>Peça / desenho</span><b>'+esc(p.codigo||"–")+(p.rev?' R'+esc(p.rev):'')+'</b></div><div><span>Cliente</span><b>'+esc(p.cliente||"–")+'</b></div><div><span>Descrição</span><b>'+esc(p.descricao||"–")+'</b></div><div><span>Material</span><b>'+esc(p.material||p.materialInf||"–")+'</b></div>'+
   '<div><span>Máquina</span><b>'+esc(c.maq||"")+' ('+esc(c.n||"")+')</b></div><div><span>Programa</span><b class="mono">'+esc(cnFileName(p,o))+'</b></div><div><span>Bruto</span><b>'+esc(p.bruto||"–")+'</b></div><div><span>Tempo estimado</span><b>'+esc(o.tempo||"–")+'</b></div></div>'+
   '<div class="cf-m"><div class="cn-f-img"><span class="hint">Carregando desenho…</span></div><div class="cf-o"><div><span>Operação</span><b>'+esc(o.descricao||"–")+'</b></div><div><span>Fixação</span><b>'+esc(o.fixacao||p.fixacaoInf||"–")+'</b></div><div><span>Zero peça</span><b>'+esc(o.zero||p.zeroInf||"–")+'</b></div></div></div>'+
   (fe.length?'<table class="itb"><thead><tr><th>T</th><th>Ferramenta</th><th class="r">S (rpm)</th><th class="r">F (mm/min)</th><th>Uso</th></tr></thead><tbody>'+fe.map(function(x){return'<tr><td>'+esc(x.t)+'</td><td>'+esc(x.nome)+'</td><td class="r">'+esc(x.s)+'</td><td class="r">'+esc(x.f)+'</td><td>'+esc(x.uso)+'</td></tr>'}).join("")+'</tbody></table>':'<p class="hint">O agente não listou as ferramentas desta operação.</p>')+
   '<div class="cf-s"><div>Elaborado: Agente CNC · '+esc(nowStr(p.criado))+'</div><div>Simulado no CIMCO: ____________</div><div>Aprovado: '+(val?esc(nowStr(p.validadoEm)):'____________')+'</div></div></div>';
}
'''
swap('function cnDetail(box,p){','function renderCnc(box){',DET)

# ---------- downloads: zip + folha pdf ----------
DL=r'''var CRCT=(function(){var t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipStore(files){
  var enc=new TextEncoder(),parts=[],cen=[],off=0,d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  function h(n,b){var a=new Uint8Array(n);var v=new DataView(a.buffer);b(v);return a}
  files.forEach(function(f){var nm=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:enc.encode(f.data),cr=crc32(data);
    var lh=h(30,function(v){v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint16(10,dt,true);v.setUint16(12,dd,true);v.setUint32(14,cr,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nm.length,true);v.setUint16(28,0,true)});
    parts.push(lh,nm,data);
    cen.push(h(46,function(v){v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint16(10,0,true);v.setUint16(12,dt,true);v.setUint16(14,dd,true);v.setUint32(16,cr,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,nm.length,true);v.setUint32(42,off,true)}),nm);
    off+=30+nm.length+data.length});
  var cs=0;cen.forEach(function(a){cs+=a.length});
  var end=h(22,function(v){v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,cs,true);v.setUint32(16,off,true)});
  return new Blob(parts.concat(cen,[end]),{type:"application/zip"});
}
function cnBase(p){return (cnIdTxt("programas_cnc",p)+"_"+String(p.codigo||"PROGRAMA")+(p.rev?"-R"+p.rev:"")).toUpperCase().replace(/[^A-Z0-9.\-_]+/g,"-").replace(/^-+|-+$/g,"")}
function cnZip(p,o){var ops=o?[o]:(p.ops||[]);return zipStore(ops.map(function(x){return{name:cnFileName(p,x),data:String(x.nc||"").replace(/\r?\n/g,"\r\n")+"\r\n"}}))}
function cnDownload(p,i){
  var ops=p.ops||[];if(!ops.length){toast("Este registro não tem programa.");return}
  var o=i==null?null:ops[i];cnSave(cnBase(p)+(o?"-"+o.op:"")+"_CNC.zip",cnZip(p,o));
}
function cnSave(name,blob){
  if(DLC&&DLC.save)return DLC.save({filename:name,data:blob}).then(function(){toast(name+" salvo.")}).catch(function(e){var c=e&&e.code;toast(c==="declined"?"Download cancelado.":"Não consegui baixar ("+(c||"erro")+").")});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},500);return Promise.resolve();
}
function cnJpg(url){return new Promise(function(ok,no){var im=new Image();im.onload=function(){var cv=document.createElement("canvas"),w=Math.min(1400,im.naturalWidth),h=Math.round(im.naturalHeight*w/im.naturalWidth);cv.width=w;cv.height=h;var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);ok({b:atob(cv.toDataURL("image/jpeg",0.82).split(",")[1]),w:w,h:h})};im.onerror=no;im.src=url})}
function PDFF(){PDFW.call(this);this.imgs=[]}
PDFF.prototype=Object.create(PDFW.prototype);
PDFF.prototype.img=function(name,jpg,x,y,w,h){if(!this.imgs.some(function(i){return i.n===name}))this.imgs.push({n:name,b:jpg.b,w:jpg.w,h:jpg.h});this.cur().push("q "+this.f(w*this.PT)+" 0 0 "+this.f(h*this.PT)+" "+this.f(x*this.PT)+" "+this.f((this.H-y-h)*this.PT)+" cm /"+name+" Do Q")};
PDFF.prototype.rgb=function(x,y,w,h,r,g,b){this.cur().push(this.f(r)+" "+this.f(g)+" "+this.f(b)+" rg "+this.f(x*this.PT)+" "+this.f((this.H-y-h)*this.PT)+" "+this.f(w*this.PT)+" "+this.f(h*this.PT)+" re f")};
PDFF.prototype.box=function(x,y,w,h){this.cur().push("0.75 G 0.5 w "+this.f(x*this.PT)+" "+this.f((this.H-y-h)*this.PT)+" "+this.f(w*this.PT)+" "+this.f(h*this.PT)+" re S")};
PDFF.prototype.tc=function(s,x,y,o,r,g,b){o=o||{};var size=o.size||9,bold=!!o.bold;s=String(s);if(o.align==="right")x-=this.tw(s,size,bold);else if(o.align==="center")x-=this.tw(s,size,bold)/2;
  this.cur().push(this.f(r)+" "+this.f(g)+" "+this.f(b)+" rg BT /"+(bold?"F2":"F1")+" "+size+" Tf "+this.f(x*this.PT)+" "+this.f((this.H-y)*this.PT)+" Td ("+this.esc(s)+") Tj ET")};
PDFF.prototype.build=function(){
  var objs=[],np=this.pages.length,im=this.imgs,first=6+im.length,kids=[],raw={},xo=[];
  for(var i=0;i<np;i++)kids.push((first+i*2)+" 0 R");
  objs[1]="<< /Type /Catalog /Pages 2 0 R >>";objs[2]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+np+" >>";
  objs[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";objs[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";objs[5]="<< /Producer (MISTA) >>";
  im.forEach(function(g,k){var n=6+k;raw[n]=g.b;objs[n]="<< /Type /XObject /Subtype /Image /Width "+g.w+" /Height "+g.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+g.b.length+" >>";xo.push("/"+g.n+" "+n+" 0 R")});
  var res="<< /Font << /F1 3 0 R /F2 4 0 R >>"+(xo.length?" /XObject << "+xo.join(" ")+" >>":"")+" >>";
  for(var p=0;p<np;p++){var pid=first+p*2,cid=pid+1,st=this.pages[p].join("\n");objs[pid]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources "+res+" /Contents "+cid+" 0 R >>";objs[cid]="<< /Length "+st.length+" >>\nstream\n"+st+"\nendstream"}
  var out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offs=[];
  for(var n=1;n<objs.length;n++){offs[n]=out.length;out+=raw[n]?n+" 0 obj\n"+objs[n]+"\nstream\n"+raw[n]+"\nendstream\nendobj\n":n+" 0 obj\n"+objs[n]+"\nendobj\n"}
  var xr=out.length;out+="xref\n0 "+objs.length+"\n0000000000 65535 f \n";for(var m=1;m<objs.length;m++)out+=("0000000000"+offs[m]).slice(-10)+" 00000 n \n";
  out+="trailer\n<< /Size "+objs.length+" /Root 1 0 R /Info 5 0 R >>\nstartxref\n"+xr+"\n%%EOF";
  var u=new Uint8Array(out.length);for(var k=0;k<out.length;k++)u[k]=out.charCodeAt(k)&255;return u};
function cnFolhaPDF(p){
  var E=empData(),c=cnCmd(p.comando)||{},val=p.status==="validado",W=297,H=210,M=10,P=new PDFF();
  var logo={b:atob(E.logoJpg),w:E.jw,h:E.jh};
  return cnDrawing(p).catch(function(){return[]}).then(function(urls){return urls[0]?cnJpg(urls[0]).catch(function(){return null}):null}).then(function(dw){
    (p.ops||[]).forEach(function(o,oi){
      if(oi)P.add();var t=pdfClean,y=M;
      P.img("Im1",logo,M,y,30,30*logo.h/logo.w);
      P.text(t(E.razao),M+34,y+5,{size:10,bold:true});P.text(t("CNPJ "+E.cnpj+"   I.E. "+E.ie),M+34,y+9.5,{size:7.5,gray:0.3});P.text(t(E.end),M+34,y+13.5,{size:7.5,gray:0.3});
      P.tc("FOLHA DE OPERACAO DE PROCESSO",W-M,y+5,{size:13,bold:true,align:"right"},0.004,0.004,0.4);
      P.text(t(cnIdTxt("programas_cnc",p)+"  ·  "+(o.op||"")+"  ·  "+new Date().toLocaleDateString("pt-BR")),W-M,y+10.5,{size:9,align:"right"});
      if(val)P.tc("VALIDADO",W-M,y+16,{size:10,bold:true,align:"right"},0.15,0.44,0.29);else P.tc("AGUARDANDO VALIDACAO",W-M,y+16,{size:10,bold:true,align:"right"},0.93,0.2,0.22);
      y=29;P.rgb(M,y,W-2*M,1.2,0.925,0.196,0.224);y+=4;
      var cells=[["Peça / desenho",(p.codigo||"-")+(p.rev?" R"+p.rev:"")],["Cliente",p.cliente||"-"],["Descrição",p.descricao||"-"],["Material",p.material||p.materialInf||"-"],
        ["Máquina",(c.maq||"")+" ("+(c.n||"")+")"],["Programa",cnFileName(p,o)],["Bruto",p.bruto||"-"],["Tempo estimado",o.tempo||"-"]];
      var cw=(W-2*M)/4;cells.forEach(function(cc,k){var x=M+(k%4)*cw,yy=y+Math.floor(k/4)*12;P.box(x,yy,cw,12);P.text(t(cc[0]).toUpperCase(),x+2,yy+4,{size:6.5,gray:0.4});P.text(P.wrap(t(cc[1]),cw-4,9,true)[0],x+2,yy+9.2,{size:9,bold:true})});
      y+=27;
      var iw=118,ih=72;P.box(M,y,iw,ih);P.text("DESENHO DE REFERENCIA",M+2,y+4,{size:6.5,gray:0.4});
      if(dw){var r=Math.min((iw-4)/dw.w,(ih-8)/dw.h),w2=dw.w*r,h2=dw.h*r;P.img("Im2",dw,M+2+(iw-4-w2)/2,y+6+(ih-8-h2)/2,w2,h2)}
      var ox=M+iw+4,ow=W-M-ox,yy=y;
      [["OPERACAO",o.descricao||"-"],["FIXACAO",o.fixacao||p.fixacaoInf||"-"],["ZERO PECA",o.zero||p.zeroInf||"-"]].forEach(function(b){var ls=P.wrap(t(b[1]),ow-4,9,false).slice(0,4),bh=6+ls.length*4.2;P.box(ox,yy,ow,bh);P.text(b[0],ox+2,yy+4,{size:6.5,gray:0.4});ls.forEach(function(l,k){P.text(l,ox+2,yy+8.5+k*4.2,{size:9})});yy+=bh+2});
      var nt=[].concat((p.duvidas||[]).map(function(x){return"Duvida: "+x}),(p.premissas||[]).map(function(x){return"Premissa: "+x})).slice(0,6);
      if(nt.length&&yy<y+ih-8){var room=Math.floor((y+ih-yy-6)/3.8),ls2=[];nt.forEach(function(n){ls2=ls2.concat(P.wrap(t(n),ow-4,7.5,false))});ls2=ls2.slice(0,Math.max(1,room));var bh2=y+ih-yy;P.box(ox,yy,ow,bh2);P.text("NOTAS DE CONFERENCIA",ox+2,yy+4,{size:6.5,gray:0.4});ls2.forEach(function(l,k){P.text(l,ox+2,yy+8+k*3.8,{size:7.5})})}
      y+=ih+5;
      var cols=[["T",12],["FERRAMENTA",95],["S (rpm)",25],["F (mm/min)",28],["USO",W-2*M-160]];
      P.rgb(M,y,W-2*M,6,0.004,0.004,0.4);var x=M;cols.forEach(function(cc){P.tc(cc[0],x+2,y+4.2,{size:7.5,bold:true},1,1,1);x+=cc[1]});y+=6;
      var fe=(o.ferramentas||[]).slice(0,Math.floor((H-30-y)/5));
      fe.forEach(function(f2,k){if(k%2)P.rect(M,y,W-2*M,5,0.95);var x2=M,v=[f2.t,f2.nome,f2.s,f2.f,f2.uso];cols.forEach(function(cc,q){var s2=P.wrap(t(v[q]==null?"":v[q]),cc[1]-3,8,false)[0];P.text(s2,q===2||q===3?x2+cc[1]-2:x2+2,y+3.6,{size:8,align:q===2||q===3?"right":"left"});x2+=cc[1]});y+=5});
      if(!fe.length){P.text("Ferramentas não listadas pelo agente.",M+2,y+4,{size:8,gray:0.4})}
      var sy=H-22,sw=(W-2*M)/3;["Elaborado: Agente CNC  "+nowStr(p.criado),"Simulado no CIMCO: ________________","Aprovado: "+(val?nowStr(p.validadoEm):"________________")].forEach(function(s2,k){P.box(M+k*sw,sy,sw,9);P.text(t(s2),M+k*sw+2,sy+5.8,{size:8})});
      P.rgb(M,H-11,W-2*M,5,0.004,0.004,0.4);P.tc(t("Documento MIX USINAGEM - uso exclusivo interno - "+E.razao+" - "+(E.tel||"")+" - "+(E.email||"")),W/2,H-7.6,{size:7,align:"center"},1,1,1);
    });
    return new Blob([P.build()],{type:"application/pdf"});
  });
}
function cnFolhaDl(p){if(!(p.ops||[]).length){toast("Ainda não há programa para gerar a folha.");return}toast("Montando a folha de processo…");cnFolhaPDF(p).then(function(b){cnSave(cnBase(p)+"_FOLHA-PROCESSO.pdf",b)}).catch(function(){toast("Não consegui montar a folha.")})}
'''
swap('function cnDownload(p,i){','function cnShare(p){',DL)
# ---------- share: zip + pdf files ----------
rep('''  var files=ops.map(function(o){return new File([cnBlob(p,o)],cnFileName(p,o),{type:"text/plain"})});''','''  var files=[new File([cnZip(p)],cnBase(p)+"_CNC.zip",{type:"application/zip"})];''')
rep('''    else if(b.dataset.cs==="dl"){m.hidden=true;cnDownload(p,ops.length>1?null:0)}''','''    else if(b.dataset.cs==="dl"){m.hidden=true;cnDownload(p)}
    else if(b.dataset.cs==="folha"){m.hidden=true;cnFolhaDl(p)}''')
rep('''   '<button class="btn" type="button" data-cs="dl">Baixar para anexar</button>'+''','''   '<button class="btn" type="button" data-cs="dl">Baixar CNC para anexar</button><button class="btn" type="button" data-cs="folha">Baixar folha (PDF)</button>'+''')

# ---------- click handler ----------
rep('''  if(a==="pick"){var fi=$("cn-file");if(fi)fi.click();return}''','''  if(a==="pick"){var fi=$("cn-file");if(fi)fi.click();return}
  if(a==="unstage"){CN.file=null;CN.pv=[];mxRender();return}
  if(a==="gerar"){var m0=cnMissing();if(m0.length){toast("Preencha antes de gerar: "+m0.join(", ")+".");cnGate();return}cnFiles([CN.file]);return}''')
rep('''  if(a==="dl"){cnDownload(p);return}
  if(a==="dlop"){var c0=cnCollectNc(p);var o=c0.ops[+b.dataset.i];if(o)cnSave(cnFileName(p,o),cnBlob(p,o));return}''','''  if(a==="dl"||a==="dlzip"){cnDownload(p);return}
  if(a==="dlfolha"){cnFolhaDl(p);return}''')
rep('''  if(e.target.id==="cn-cmd"){CN.cmd=e.target.value;mxRender();return}
  if(e.target.id==="cn-file"){cnFiles(e.target.files);e.target.value="";return}''','''  if(e.target.id==="cn-cmd"){CN.cmd=e.target.value;mxRender();return}
  if(e.target.id==="cn-file"){cnStage(e.target.files);e.target.value="";return}''')
rep('''  if(id==="cn-bruto")CN.draft.bruto=e.target.value;else if(id==="cn-mat")CN.draft.mat=e.target.value;else if(id==="cn-inst")CN.draft.inst=e.target.value;''','''  if(id==="cn-bruto")CN.draft.bruto=e.target.value;else if(id==="cn-mat")CN.draft.mat=e.target.value;else if(id==="cn-inst")CN.draft.inst=e.target.value;else if(id==="cn-fix")CN.draft.fix=e.target.value;else if(id==="cn-zero")CN.draft.zero=e.target.value;
  if(/^cn-(bruto|mat|inst|fix|zero)$/.test(id))cnGate();''')
rep('''  if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)cnFiles(e.dataTransfer.files);
},true);''','''  if(CN.open)return;if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)cnStage(e.dataTransfer.files);
},true);''')
rep('''function cnJob(j,st,ms){j.st=st;j.ms=ms;if(S.tab==="m-cnc"&&!CN.open){var a=document.activeElement;if(a&&/^cn-(bruto|inst|mat)$/.test(a.id))return;mxRender()}}''','''function cnJob(j,st,ms){j.st=st;j.ms=ms;if(S.tab==="m-cnc"&&!CN.open){var a=document.activeElement;if(a&&/^cn-(bruto|inst|mat|fix|zero)$/.test(a.id))return;mxRender()}}''')

# ---------- IDs for every cadastro ----------
IDS=r'''
/* ---- ID sequencial para todo cadastro (gestor, 23/10/2026) ---- */
var IDP={clientes:"CLI",fornecedores:"FOR",programas_cnc:"CNC"};
function cnIdTxt(col,r){return r&&r.idSeq?IDP[col]+"-"+("000"+r.idSeq).slice(-4):IDP[col]+"-…"}
function cnNextId(col){
  var ref=PR.db.doc("config/ids-"+col),holder=rid();
  function go(k){return ref.acquire({holder:holder,ttlMs:8000}).then(function(r){
    if(!r.acquired){if(k>10)throw new Error("ocupado");return new Promise(function(ok){setTimeout(ok,400)}).then(function(){return go(k+1)})}
    return ref.get().then(function(sn){var n=((sn.exists&&sn.data().n)||0)+1;return ref.set({n:n}).then(function(){return n})})})}
  return go(0);
}
var IDS_BUSY=false;
function idSweep(){
  if(IDS_BUSY||!PR.db)return;
  var todo=[];
  [["clientes",PD.cli||[]],["fornecedores",AG.forn||[]],["programas_cnc",CN.list||[]]].forEach(function(x){
    x[1].filter(function(r){return r&&r.id&&!r.idSeq&&!(x[0]==="programas_cnc"&&r.status==="gerando")}).sort(function(a,b){return((a.criado||a.atualizado||0)-(b.criado||b.atualizado||0))||(normTxt(a.nome||a.codigo)<normTxt(b.nome||b.codigo)?-1:1)}).forEach(function(r){todo.push([x[0],r])})});
  if(!todo.length)return;IDS_BUSY=true;
  var p=Promise.resolve();
  todo.slice(0,20).forEach(function(t){p=p.then(function(){if(t[1].idSeq)return;return cnNextId(t[0]).then(function(n){t[1].idSeq=n;return PR.db.doc(t[0]+"/"+t[1].id).update({idSeq:n})})}).catch(function(){})});
  p.then(function(){IDS_BUSY=false;if(S.tab==="cad"||S.tab==="m-cnc")mxRender()});
}
setInterval(idSweep,5000);
var _agLV2=agListView;agListView=function(box){_agLV2.apply(this,arguments);
  var col=PD.cadTab==="forn"?"fornecedores":"clientes",L=col==="fornecedores"?(AG.forn||[]):(PD.cli||[]);
  Array.prototype.forEach.call(box.querySelectorAll(".cr3[data-id]"),function(row){var r=L.filter(function(x){return x.id===row.dataset.id})[0];var b=row.querySelector("span b");if(r&&b&&!row.querySelector(".idtag"))b.insertAdjacentHTML("beforebegin",'<span class="idtag">'+esc(cnIdTxt(col,r))+'</span> ')})};
'''
rep('''/* ---- excluir direto na lista de clientes e fornecedores ---- */''',IDS+'''/* ---- excluir direto na lista de clientes e fornecedores ---- */''')

# ---------- CSS ----------
rep('.cn-wrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:14px;align-items:start}','''.cn-wrap{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:16px;align-items:start}
.cn-side{border:2px solid var(--accent);border-radius:16px;background:var(--surface);box-shadow:0 8px 28px rgba(10,20,80,.14);overflow:hidden;display:flex;flex-direction:column}
.cn-side-h{background:var(--accent);color:var(--accent-ink);padding:14px 18px;display:flex;flex-direction:column;gap:3px}
.cn-side-h b{font:700 17px var(--f-body);letter-spacing:.01em}.cn-side-h span{font-size:12.5px;opacity:.85}
.cn-side-b{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.cn-fld .lb{font-size:14px!important}.cn-fld .lb i{color:var(--red);font-style:normal}
.cn-fld input,.cn-fld select,.cn-fld textarea{border:1.5px solid #9fb0d8;background:#fbfcff;border-radius:8px;padding:9px 11px}
.cn-fld input:focus,.cn-fld select:focus,.cn-fld textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent);outline:0}
.cn-fld.vazio input,.cn-fld.vazio select,.cn-fld.vazio textarea{border-color:#e8a23a;background:#fffaf0}
.cn-side-f{padding:14px 18px;border-top:1px solid var(--line);background:var(--surface2);display:flex;flex-direction:column;gap:8px}
.cn-go{width:100%;padding:13px 16px!important;font-size:16px!important}
.cn-go[disabled]{opacity:.45}
.cn-miss{font-size:12.5px;color:var(--warn);font-weight:600}.cn-miss.ok{color:var(--good)}
.cn-pv{display:flex;flex-direction:column;gap:10px;max-height:62vh;overflow:auto;background:#eef0f6;border-radius:10px;padding:10px}
.cn-pv img{width:100%;height:auto;background:#fff;border:1px solid var(--line);border-radius:6px}
.cn-prev{border:2px solid var(--accent)}
.idtag{display:inline-block;font:600 11px var(--f-mono);padding:2px 7px;border-radius:6px;background:var(--surface2);color:var(--accent);border:1px solid #c9d2ee;white-space:nowrap}
.idtag.big{font-size:13px;padding:3px 9px;margin-right:6px}
.cn-det{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr);gap:12px;align-items:start}
@media (max-width:1100px){.cn-det{grid-template-columns:minmax(0,1fr)}}
.cn-dl{display:grid;grid-template-columns:110px minmax(0,1fr);gap:6px 10px;margin:0;font-size:13.5px}.cn-dl dt{color:var(--muted);font-weight:600}.cn-dl dd{margin:0;white-space:pre-wrap}
.cn-notes{margin-top:8px;font-size:13px}
.cn-progc summary{cursor:pointer;padding:2px 0}.cn-progc[open] summary{margin-bottom:8px}
.cn-folhas{display:flex;flex-direction:column;gap:16px}
.cn-folha{border:1px solid #c9cfe0;border-radius:6px;background:#fff;color:#14163A;padding:14px 16px;display:flex;flex-direction:column;gap:10px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.cf-h{display:flex;gap:12px;align-items:center;border-bottom:3px solid #EC3237;padding-bottom:8px}.cf-h img{height:42px}.cf-h small{display:block;color:#666;font-size:11px}
.cf-t{margin-left:auto;text-align:right;display:flex;flex-direction:column;gap:2px}.cf-t b{color:#010066;font-size:15px}.cf-t span{font:600 11.5px var(--f-mono)}.cf-t em{font-style:normal;font-weight:800;font-size:12px;color:#EC3237}.cf-t em.ok{color:#26704A}
.cf-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #c9cfe0}.cf-g>div,.cf-o>div{padding:5px 8px;border:1px solid #e1e5ef;display:flex;flex-direction:column;gap:1px;min-width:0}
.cf-g span,.cf-o span{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777}.cf-g b,.cf-o b{font-size:12.5px;overflow-wrap:anywhere;white-space:pre-wrap}
.cf-m{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:8px}.cn-f-img{border:1px solid #c9cfe0;min-height:160px;display:flex;align-items:center;justify-content:center;background:#fafbfd}.cn-f-img img{max-width:100%;max-height:300px}
.cf-o{display:flex;flex-direction:column}
.cf-s{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #c9cfe0;font-size:12px}.cf-s>div{padding:6px 8px;border-right:1px solid #e1e5ef}
@media (max-width:800px){.cf-g{grid-template-columns:repeat(2,1fr)}.cf-m{grid-template-columns:1fr}}
.cn-r{grid-template-columns:78px minmax(180px,1.6fr) minmax(110px,1fr) 160px 44px 70px 170px 200px!important;min-width:1060px!important}
.cn-drop{min-height:150px;border-width:2.5px;border-color:var(--accent)}
.card:has(.agf){border:2px solid var(--accent);box-shadow:0 8px 28px rgba(10,20,80,.12)}
.agf input,.agf select,.agf textarea{border:1.5px solid #9fb0d8!important;background:#fbfcff;border-radius:8px}
.agf input:focus,.agf select:focus,.agf textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}''')
rep('.cn-side{position:sticky;top:12px;gap:12px}','.cn-side{position:sticky;top:12px}')
open(f,'w',encoding='utf8').write(s)
print('ok')
