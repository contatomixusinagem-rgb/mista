
/* ===== Engenharia › Programas CNC (estrutura; regras do dialeto vêm da coleção cnc_dialetos, mantida pela conversa do agente CNC) ===== */
var CN_CMDS=[
 {k:"m70",n:"Mitsubishi M70",maq:"Pinnacle LV1000",ext:".NC"},
 {k:"s802d",n:"Siemens Sinumerik 802D",maq:"Jyoti VMC430",ext:".MPF"},
 {k:"mach9",n:"ROMI Mach 9",maq:"Bridgeport/ROMI 4022",ext:".NC"}
];
var CN_REGRAS_PADRAO="Dialeto ainda não levantado para este comando. Gere em código ISO (G-code) conservador, com cabeçalho em comentários entre parênteses, MAIÚSCULAS e sem acento, linha de segurança G90 G80 G40 no início de cada ferramenta, G43 H igual ao T, e liste em 'duvidas' que o dialeto deste comando ainda não foi validado pelo gestor.";
var CN={list:[],dial:{},sub:false,open:"",cmd:"",jobs:[],busy:false,q:"",draft:{}};
function cnCmd(k){for(var i=0;i<CN_CMDS.length;i++)if(CN_CMDS[i].k===k)return CN_CMDS[i];return null}
function cnSub(){
  if(CN.sub||!PR.db)return;CN.sub=true;
  PR.db.collection("programas_cnc").onSnapshot(function(sn){
    CN.list=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c}).sort(function(a,b){return (b.criado||0)-(a.criado||0)});
    cnRefresh();try{capSync()}catch(e){}
  },function(){});
  PR.db.collection("cnc_dialetos").onSnapshot(function(sn){
    var d={};sn.docs.forEach(function(x){d[x.id]=x.data()||{}});CN.dial=d;cnRefresh();
  },function(){});
}
(function wcn(){if(PR.db){cnSub();return}setTimeout(wcn,700)})();
function cnRefresh(){if(S.tab==="m-cnc")mxRender()}
function cnFileName(p,op){var c=cnCmd(p.comando)||CN_CMDS[0],d=CN.dial[p.comando]||{};var ext=d.ext||c.ext;
  var base=String((p.codigo||"PROGRAMA")+(p.rev?"-R"+p.rev:"")).toUpperCase().replace(/[^A-Z0-9.\-]+/g,"-").replace(/^-+|-+$/g,"");
  return base+(op&&op.op?"-"+String(op.op).toUpperCase().replace(/[^A-Z0-9]+/g,""):"")+ext}
function cnTempo(p){var t=0;(p.ops||[]).forEach(function(o){var m=String(o.tempo||"").match(/(\d+)\s*H/i),mm=String(o.tempo||"").match(/(\d+)\s*MIN/i);t+=(m?+m[1]*60:0)+(mm?+mm[1]:0)});return t?(t>=60?Math.floor(t/60)+"h"+("0"+t%60).slice(-2):t+" min"):"–"}

function cnDropHtml(){
  var on=!!AG.sample,img=!!(AG.lim&&AG.lim.images);
  var c=cnCmd(CN.cmd);
  return'<div class="card cn-new"><h3>Novo programa</h3>'+
   '<div class="fgrid">'+
   '<label class="f"><span class="lb">Comando da máquina *</span><select id="cn-cmd"><option value="">Escolha o comando…</option>'+CN_CMDS.map(function(x){var d=CN.dial[x.k]||{};return'<option value="'+x.k+'"'+(CN.cmd===x.k?" selected":"")+'>'+esc(x.n)+' · '+esc(x.maq)+(d.status==="validado"?"":" (dialeto a levantar)")+'</option>'}).join("")+'</select></label>'+
   '<label class="f"><span class="lb">Bruto (medidas)</span><input id="cn-bruto" value="'+esc(CN.draft.bruto||"")+'" placeholder="ex.: 160 x 85 x 22, já esquadrejado"></label>'+
   '<label class="f"><span class="lb">Material</span><input id="cn-mat" value="'+esc(CN.draft.mat||"")+'" placeholder="se não estiver no desenho"></label>'+
   '<label class="f" style="grid-column:1/-1"><span class="lb">Instruções ao agente (fixação, sequência, zero)</span><input id="cn-inst" value="'+esc(CN.draft.inst||"")+'" placeholder="ex.: duas morsas, OP10 face de referência, zero no centro"></label>'+
   '</div>'+
   '<div class="agdrop'+(on&&c?'':' off')+'" '+(on&&c?'role="button" tabindex="0" data-cnc="pick"':'')+'><span class="ai" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 15l3-3 3 3"/></svg></span><span class="tx">'+
   (!on?(AG.ready?'<b>Agente CNC indisponível nesta visualização</b><span>Abra o Cérebro MISTA no claude.ai para gerar programas.</span>':'<b>Ligando o agente…</b><span>Um instante.</span>'):
    !c?'<b>Escolha o comando primeiro</b><span>O programa sai no dialeto da máquina escolhida.</span>':
    '<b>Arraste o desenho de fresamento aqui</b><span>PDF'+(img?' ou imagem':'')+'. O agente lê o desenho e gera o programa para <b>'+esc(c.n)+'</b>. O programa nasce <b>aguardando validação</b>. Ou clique para escolher o arquivo.</span>')+
   '</span>'+(on?'<input type="file" id="cn-file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*">':'')+'</div>'+
   (CN.jobs.length?'<div class="agjobs">'+CN.jobs.map(function(j){return'<div class="agjob '+j.st+'"><b>'+esc(j.nome)+'</b> <span>'+esc(j.ms)+'</span>'+(j.st==="ia"||j.st==="ler"?' <button class="btn sm" type="button" data-cnc="stop" data-j="'+j.id+'">Cancelar</button>':'')+(j.st==="erro"||j.st==="ok"?' <button class="btn sm" type="button" data-cnc="clr" data-j="'+j.id+'">Fechar</button>':'')+'</div>'}).join("")+'</div>':'')+
   '</div>';
}
function cnListHtml(){
  var q=normTxt(CN.q),L=CN.list.filter(function(p){return !q||normTxt([p.codigo,p.cliente,p.descricao,p.material].join(" ")).indexOf(q)>-1});
  return'<div class="mx-bar"><input type="search" id="cn-q" placeholder="Buscar peça, cliente, material…" value="'+esc(CN.q)+'"><span class="sp"></span><span class="hint">'+CN.list.length+(CN.list.length===1?" programa":" programas")+'</span></div>'+
   '<div class="tbx"><div class="cn-r fh"><span>Peça</span><span>Cliente</span><span>Comando</span><span>OPs</span><span>Tempo</span><span>Situação</span><span></span></div>'+
   (L.length?L.map(function(p){var c=cnCmd(p.comando)||{};var st=p.status==="validado"?'<span class="stp g">Validado</span>':'<span class="stp w">Aguardando validação</span>';
     return'<div class="cn-r" data-cnc="open" data-id="'+esc(p.id)+'" title="Abrir"><span><b>'+esc(p.codigo||"(sem código)")+(p.rev?' R'+esc(p.rev):'')+'</b><small>'+esc(p.descricao||"")+(p.material?' · '+esc(p.material):'')+'</small></span><span>'+esc(p.cliente||"–")+'</span><span>'+esc(c.n||p.comando||"–")+'<small>'+esc(c.maq||"")+'</small></span><span>'+(p.ops||[]).length+'</span><span class="mono">'+esc(cnTempo(p))+'</span><span>'+st+'<small>'+esc(nowStr(p.criado))+'</small></span>'+
      '<span class="ra2">'+ibtn("open","Baixar NC",'data-cnc="dl" data-id="'+esc(p.id)+'"').replace(IC.open,CN_IC.dl)+ibtn("open","Compartilhar",'data-cnc="share" data-id="'+esc(p.id)+'"').replace(IC.open,CN_IC.share)+ibtn("trash","Excluir",'data-cnc="del" data-id="'+esc(p.id)+'"',"danger")+'</span></div>'}).join(""):'<div class="mx-empty">'+(CN.list.length?"Nenhum programa com esse filtro.":"Nenhum programa ainda. Escolha o comando e arraste um desenho acima.")+'</div>')+'</div>';
}
var CN_IC={
 dl:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
 share:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>'
};
function cnDetail(box,p){
  var c=cnCmd(p.comando)||{},val=p.status==="validado";
  var ops=p.ops||[];
  box.innerHTML='<div class="mx-bar"><button class="btn sm" type="button" data-cnc="back">‹ Programas CNC</button><span class="sp"></span>'+
   '<button class="btn sm" type="button" data-cnc="share" data-id="'+esc(p.id)+'">Compartilhar</button><button class="btn sm danger" type="button" data-cnc="del" data-id="'+esc(p.id)+'">Excluir</button></div>'+
   '<div class="card"><div class="dh2"><h2>'+esc(p.codigo||"Programa")+(p.rev?' R'+esc(p.rev):'')+'</h2><span class="sub">'+esc([p.cliente,p.descricao,p.material].filter(Boolean).join(" · "))+'</span></div>'+
   '<div class="hint">Comando: <b>'+esc(c.n||p.comando)+'</b> ('+esc(c.maq||"")+')'+(p.bruto?' · Bruto: '+esc(p.bruto):'')+(p.fonte&&p.fonte.nome?' · Desenho: '+(p.fonte.url?'<a href="'+esc(p.fonte.url)+'" target="_blank" rel="noopener">'+esc(p.fonte.nome)+'</a>':esc(p.fonte.nome)):'')+'</div>'+
   (val?'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Validado'+(p.validadoEm?' em '+esc(nowStr(p.validadoEm)):'')+'. Simule no CIMCO antes de levar à máquina.</div>':
    '<div class="askbox">Aguardando validação. Confira o programa, simule no CIMCO e só depois valide. O agente nunca envia programa à máquina.</div>')+
   ((p.duvidas||[]).length||(p.premissas||[]).length?'<div class="fgrid">'+((p.duvidas||[]).length?'<div><b>Dúvidas do agente</b><ul class="plan">'+p.duvidas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+((p.premissas||[]).length?'<div><b>Premissas adotadas</b><ul class="plan">'+p.premissas.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':'')+'</div>':'')+
   '</div>'+
   ops.map(function(o,i){return'<div class="card"><div class="mx-bar"><h3 style="margin:0">'+esc(o.op||("OP"+(i+1)*10))+'</h3><span class="hint">'+esc(o.fixacao||"")+(o.tempo?' · tempo estimado '+esc(o.tempo):'')+'</span><span class="sp"></span><span class="mono hint">'+esc(cnFileName(p,o))+'</span><button class="btn sm pri" type="button" data-cnc="dlop" data-id="'+esc(p.id)+'" data-i="'+i+'">Baixar NC</button></div>'+
     ((o.ferramentas||[]).length?'<div style="overflow:auto"><table class="itb"><thead><tr><th>T</th><th>Ferramenta</th><th class="r">S</th><th class="r">F</th><th>Uso</th></tr></thead><tbody>'+o.ferramentas.map(function(f){return'<tr><td>'+esc(f.t||"")+'</td><td>'+esc(f.nome||"")+'</td><td class="r">'+esc(f.s==null?"":f.s)+'</td><td class="r">'+esc(f.f==null?"":f.f)+'</td><td>'+esc(f.uso||"")+'</td></tr>'}).join("")+'</tbody></table></div>':'')+
     '<label class="f"><span class="lb">Programa</span><textarea class="cn-nc" data-cncop="'+i+'" spellcheck="false"'+(val?' readonly':'')+'>'+esc(o.nc||"")+'</textarea></label></div>'}).join("")+
   '<div class="card"><div class="acts2">'+(val?'<button class="btn" type="button" data-cnc="reopen" data-id="'+esc(p.id)+'">Reabrir para correção</button>':'<button class="btn" type="button" data-cnc="savenc" data-id="'+esc(p.id)+'">Salvar correções</button><span class="sp" style="flex:1"></span><button class="btn pri" type="button" data-cnc="validate" data-id="'+esc(p.id)+'">Validar programa</button>')+'</div>'+
   '<h3>Histórico</h3><ul class="hist">'+((p.hist||[]).slice().reverse().map(function(h){return'<li><time>'+esc(nowStr(h.at))+'</time><span>'+esc(h.txt)+'</span></li>'}).join("")||'<li><span class="hint">Sem registros.</span></li>')+'</ul></div>';
}
function renderCnc(box){
  cnSub();
  if(CN.open){var p=CN.list.filter(function(x){return x.id===CN.open})[0];if(p){cnDetail(box,p);return}CN.open=""}
  var ae=document.activeElement,keep=ae&&ae.id&&/^cn-/.test(ae.id)?ae.id:"",pos=keep&&ae.selectionStart!=null?ae.selectionStart:null;
  box.innerHTML='<div class="mh"><div><h2>Programas CNC</h2><p>Escolha o comando, arraste o desenho de fresamento e o agente gera o programa no dialeto da máquina. Cada programa fica salvo aqui para conferir, baixar o NC e compartilhar. Fase 1: fresamento 2,5D.</p></div><span class="fase">Engenharia · F4</span></div>'+cnDropHtml()+cnListHtml();
  if(keep){var qi=$(keep);if(qi){qi.focus();try{if(pos!=null)qi.setSelectionRange(pos,pos)}catch(er){}}}
}
var _rmCnc=renderMod;renderMod=function(box,k){if(k==="cnc"){renderCnc(box);return}return _rmCnc.apply(this,arguments)};

/* ---- geração ---- */
function cnPrompt(c,nome,prep){
  var d=CN.dial[c.k]||{},regras=d.regras||CN_REGRAS_PADRAO;
  return"Você é o agente de programação CNC da MIX USINAGEM (usinagem sob encomenda, Indaiatuba SP). Gere o programa CNC de FRESAMENTO 2,5D da peça do desenho anexado (arquivo: "+nome+").\n\n"+
  "COMANDO: "+c.n+" — máquina "+c.maq+". Extensão do arquivo: "+(d.ext||c.ext)+".\n\nREGRAS DO DIALETO DA CASA PARA ESTE COMANDO:\n"+regras+"\n\n"+
  "DADOS DO PROGRAMADOR:\n- Bruto: "+(CN.draft.bruto||"NÃO INFORMADO (não invente: adote uma premissa explícita e registre em duvidas)")+"\n- Material: "+(CN.draft.mat||"ler do desenho")+"\n- Instruções: "+(CN.draft.inst||"nenhuma")+"\n\n"+
  "REGRAS DE SEGURANÇA: o programa nasce aguardando validação (inclua (AGUARDANDO-VALIDACAO) no cabeçalho); nunca envie à máquina; se a peça exigir 3D, 4º/5º eixo ou torneamento, não gere o programa: explique em duvidas. Seja conservador em dados de corte quando houver dúvida.\n\n"+
  (prep.texto?"TEXTO EXTRAÍDO DO DESENHO:\n"+String(prep.texto).slice(0,12000)+"\n\n":"")+
  "FORMATO DA RESPOSTA (obrigatório):\n1) Primeiro um bloco ```json com: {\"codigo\":\"código/nº do desenho\",\"revisao\":\"\",\"cliente\":\"\",\"descricao\":\"\",\"material\":\"\",\"operacoes\":[{\"op\":\"OP10\",\"fixacao\":\"\",\"tempo\":\"XXMIN-XXS\",\"ferramentas\":[{\"t\":\"T01\",\"nome\":\"\",\"s\":0,\"f\":0,\"uso\":\"\"}]}],\"premissas\":[\"...\"],\"duvidas\":[\"...\"]}\n"+
  "2) Depois, um bloco por operação, na mesma ordem, assim:\n```nc OP10\n%\n(...programa completo...)\n%\n```\nNada fora desses blocos.";
}
function cnParse(t){
  t=String(t||"");var m=t.match(/```json\s*([\s\S]*?)```/),meta={};
  if(m){try{meta=JSON.parse(m[1])}catch(e){meta={}}}
  var ncs=[],re=/```(?:nc|gcode|cnc)?[ \t]*([A-Za-z]*\d*)?[ \t]*\n([\s\S]*?)```/g,x;
  while((x=re.exec(t))){if(m&&x.index===m.index)continue;var body=x[2].trim();if(!body||/^\s*\{/.test(body))continue;ncs.push({op:(x[1]||"").toUpperCase(),nc:body})}
  var ops=(Array.isArray(meta.operacoes)?meta.operacoes:[]).map(function(o,i){var n=ncs.filter(function(z){return z.op&&String(o.op||"").toUpperCase()===z.op})[0]||ncs[i]||{};
    return{op:String(o.op||n.op||"OP"+(i+1)*10).toUpperCase(),fixacao:String(o.fixacao||""),tempo:String(o.tempo||""),ferramentas:(Array.isArray(o.ferramentas)?o.ferramentas:[]).slice(0,25).map(function(f){return{t:String(f.t||""),nome:String(f.nome||""),s:f.s==null?"":f.s,f:f.f==null?"":f.f,uso:String(f.uso||"")}}),nc:n.nc||""}});
  if(!ops.length)ops=ncs.map(function(n,i){return{op:n.op||"OP"+(i+1)*10,fixacao:"",tempo:"",ferramentas:[],nc:n.nc}});
  return{meta:meta,ops:ops.filter(function(o){return o.nc})};
}
function cnJob(j,st,ms){j.st=st;j.ms=ms;if(S.tab==="m-cnc"&&!CN.open){var b=document.querySelector(".cn-new");if(b)mxRender()}}
function cnFiles(files){
  if(!AG.sample){toast("O agente não está disponível nesta visualização. Abra o MISTA no claude.ai.");return}
  var c=cnCmd(CN.cmd);if(!c){toast("Escolha o comando da máquina antes de arrastar o desenho.");var s=$("cn-cmd");if(s)s.focus();return}
  if(!PR.db){toast("Banco indisponível.");return}
  var f=files&&files[0];if(!f)return;
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,draft:{bruto:CN.draft.bruto||"",mat:CN.draft.mat||"",inst:CN.draft.inst||""}};
  CN.jobs.unshift(j);CN.jobs=CN.jobs.slice(0,5);cnRun(j);
}
function cnRun(j){
  var prep,asset=null;cnJob(j,"ler","Abrindo o desenho…");
  return agPrep(j.f).then(function(p){prep=p;
    if(AG.assets&&AG.assets.upload&&(prep.kind==="pdf"||prep.kind==="img")){cnJob(j,"ler","Guardando o desenho…");return AG.assets.upload(j.f).then(function(r){asset=r}).catch(function(){asset=null})}
  }).then(function(){
    if(j.st==="erro")throw new Error("Cancelado.");
    cnJob(j,"ia","O agente está programando… (pode levar 1 a 3 minutos)");
    j.ctl=new AbortController();
    var o={signal:j.ctl.signal,cache:false,modelTier:"complex"};if(prep.imgs&&prep.imgs.length)o.images=prep.imgs;
    var sv=CN.draft;CN.draft=j.draft;var pr=cnPrompt(j.c,j.f.name,prep);CN.draft=sv;
    return AG.sample(pr,o).catch(function(e){throw new Error(agErr(e))});
  }).then(function(r){
    var res=cnParse(r&&r.text);
    if(!res.ops.length){var dv=(res.meta&&res.meta.duvidas)||[];throw new Error(dv.length?"O agente não gerou programa: "+dv.join(" · "):"O agente não devolveu um programa. Tente de novo.")}
    var m=res.meta||{},t=Date.now(),id="cnc-"+t.toString(36)+"-"+rid().slice(0,4);
    var doc={codigo:String(m.codigo||j.f.name.replace(/\.[^.]+$/,"")),rev:String(m.revisao||""),cliente:String(m.cliente||""),descricao:String(m.descricao||""),material:String(m.material||j.draft.mat||""),
      comando:j.c.k,bruto:j.draft.bruto,instrucoes:j.draft.inst,ops:res.ops,premissas:(Array.isArray(m.premissas)?m.premissas:[]).map(String).slice(0,20),duvidas:(Array.isArray(m.duvidas)?m.duvidas:[]).map(String).slice(0,20),
      truncado:!!(r&&r.truncated),status:"aguardando",fonte:{nome:j.f.name,tipo:prep.kind,id:asset?asset.id:"",url:asset?asset.url:""},criado:t,criadoPor:AG.uid||"",atualizado:t,
      hist:[{at:t,uid:AG.uid||"",txt:"Programa gerado pelo agente a partir de "+j.f.name+" ("+j.c.n+")."+(r&&r.truncated?" Resposta cortada: conferir o fim do programa.":"")}]};
    if(doc.truncado)doc.duvidas.unshift("A resposta do agente foi cortada: confira se o último programa termina com M30 e %.");
    return PR.db.doc("programas_cnc/"+id).set(doc).then(function(){cnJob(j,"ok","Programa gerado: "+doc.codigo+" ("+doc.ops.length+(doc.ops.length===1?" operação)":" operações)"));toast("Programa "+doc.codigo+" gerado. Aguardando validação.")});
  }).catch(function(e){cnJob(j,"erro",(e&&e.message)||"Não consegui gerar o programa.")});
}

/* ---- baixar, compartilhar, excluir, validar ---- */
function cnBlob(p,o){return new Blob([String(o.nc||"").replace(/\r?\n/g,"\r\n")+"\r\n"],{type:"text/plain"})}
function cnSave(name,blob){
  if(DLC&&DLC.save)return DLC.save({filename:name,data:blob}).then(function(){toast(name+" salvo.")}).catch(function(){toast("Download cancelado.")});
  var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},500);return Promise.resolve();
}
function cnDownload(p,i){
  var ops=p.ops||[];if(!ops.length){toast("Este registro não tem programa.");return}
  if(i==null&&ops.length>1){CN.open=p.id;mxRender();toast("Este desenho tem "+ops.length+" operações: baixe cada uma.");return}
  var o=ops[i||0];cnSave(cnFileName(p,o),cnBlob(p,o));
}
function cnShare(p){
  var ops=p.ops||[],m=$("mx-modal");
  var files=ops.map(function(o){return new File([cnBlob(p,o)],cnFileName(p,o),{type:"text/plain"})});
  var txt="Programa CNC "+(p.codigo||"")+(p.rev?" R"+p.rev:"")+(p.cliente?" · "+p.cliente:"")+" · "+((cnCmd(p.comando)||{}).n||"")+(p.status==="validado"?"":" · AGUARDANDO VALIDAÇÃO");
  var canFiles=false;try{canFiles=!!(navigator.canShare&&navigator.canShare({files:files}))}catch(e){}
  var body=txt+"\n\n"+ops.map(function(o){return"=== "+cnFileName(p,o)+" ===\n"+o.nc}).join("\n\n");
  var big=body.length>6000;
  m.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-label="Compartilhar"><h3>Compartilhar '+esc(p.codigo||"programa")+'</h3>'+
   '<p class="hint">Programas e desenhos de cliente são confidenciais. Envie só para quem vai usar.'+(p.status!=="validado"?' Este programa ainda <b>não foi validado</b>.':'')+'</p>'+
   '<div class="acts2">'+
   (navigator.share?'<button class="btn pri" type="button" data-cs="native">'+(canFiles?'Compartilhar arquivo (WhatsApp, e-mail…)':'Compartilhar…')+'</button>':'')+
   '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(big?txt+"\n(arquivo NC enviado à parte)":body)+'">WhatsApp</a>'+
   '<a class="btn" target="_blank" rel="noopener" href="mailto:?subject='+encodeURIComponent(txt)+'&body='+encodeURIComponent(big?txt+"\n\nArquivo NC em anexo.":body)+'">E-mail</a>'+
   '<button class="btn" type="button" data-cs="copy">Copiar programa</button>'+
   '<button class="btn" type="button" data-cs="dl">Baixar para anexar</button>'+
   '</div>'+(big?'<p class="hint">O programa é longo para ir no corpo da mensagem: baixe o arquivo e anexe no WhatsApp ou no e-mail.</p>':'')+
   '<div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-x="cfx">Fechar</button></div></div>';
  m.hidden=false;
  m.onclick=function(e){
    if(e.target===m){m.hidden=true;return}
    var b=e.target.closest("[data-cs]");if(!b)return;
    if(b.dataset.cs==="native"){var dt=canFiles?{files:files,title:txt,text:txt}:{title:txt,text:body};navigator.share(dt).then(function(){m.hidden=true}).catch(function(er){if(!er||er.name!=="AbortError")toast("Este navegador não deixou compartilhar daqui. Use WhatsApp, E-mail ou Baixar.")})}
    else if(b.dataset.cs==="copy"){try{navigator.clipboard.writeText(body).then(function(){toast("Programa copiado.")},function(){toast("Não consegui copiar.")})}catch(er){toast("Não consegui copiar.")}}
    else if(b.dataset.cs==="dl"){m.hidden=true;cnDownload(p,ops.length>1?null:0)}
  };
}
function cnSet(p,patch,txt){patch.atualizado=Date.now();if(txt){var h=(p.hist||[]).slice(-199);h.push({at:Date.now(),uid:AG.uid||"",txt:txt});patch.hist=h}
  return PR.db.doc("programas_cnc/"+p.id).update(patch).catch(function(){toast("Não consegui gravar.")})}
function cnCollectNc(p){var ops=JSON.parse(JSON.stringify(p.ops||[])),ch=[];
  Array.prototype.forEach.call(document.querySelectorAll("textarea[data-cncop]"),function(t){var i=+t.dataset.cncop;if(ops[i]&&ops[i].nc!==t.value){ops[i].nc=t.value;ch.push(ops[i].op)}});return{ops:ops,ch:ch}}

$("v-mx").addEventListener("click",function(e){
  if(S.tab!=="m-cnc")return;
  var b=e.target.closest("[data-cnc]");if(!b)return;e.stopPropagation();e.preventDefault();
  var a=b.dataset.cnc,p=CN.list.filter(function(x){return x.id===(b.dataset.id||CN.open)})[0];
  if(a==="pick"){var fi=$("cn-file");if(fi)fi.click();return}
  if(a==="stop"||a==="clr"){var j=CN.jobs.filter(function(x){return x.id===b.dataset.j})[0];if(j){if(j.ctl)try{j.ctl.abort()}catch(er){}if(a==="stop")cnJob(j,"erro","Cancelado.");CN.jobs=CN.jobs.filter(function(x){return x!==j||a==="stop"})}mxRender();return}
  if(a==="back"){CN.open="";mxRender();return}
  if(!p)return;
  if(a==="open"){CN.open=p.id;mxRender();return}
  if(a==="dl"){cnDownload(p);return}
  if(a==="dlop"){var c0=cnCollectNc(p);var o=c0.ops[+b.dataset.i];if(o)cnSave(cnFileName(p,o),cnBlob(p,o));return}
  if(a==="share"){cnShare(p);return}
  if(a==="del"){askDel("Excluir o programa "+(p.codigo||"")+"?",(p.cliente||"Sem cliente")+" · "+((cnCmd(p.comando)||{}).n||"")+" · "+(p.ops||[]).length+" operação(ões). Esta ação não pode ser desfeita.",function(){PR.db.doc("programas_cnc/"+p.id).delete().then(function(){toast("Programa excluído.");if(CN.open===p.id)CN.open="";mxRender()}).catch(function(){toast("Não consegui excluir.")})});return}
  if(a==="savenc"){var c1=cnCollectNc(p);if(!c1.ch.length){toast("Nada mudou.");return}cnSet(p,{ops:c1.ops},"Programa corrigido à mão: "+c1.ch.join(", ")+".").then(function(){toast("Correções salvas.")});return}
  if(a==="validate"){var c2=cnCollectNc(p);askValidate(p,c2);return}
  if(a==="reopen"){cnSet(p,{status:"aguardando"},"Reaberto para correção.");return}
},true);
function askValidate(p,c2){
  var m=$("mx-modal");
  m.innerHTML='<div class="card" role="dialog" aria-modal="true"><h3>Validar o programa '+esc(p.codigo||"")+'?</h3><p>Confirme que o programa foi conferido e simulado no CIMCO. A validação fica no histórico com seu nome e a data.</p><div class="acts2" style="justify-content:flex-end"><button class="btn pri" type="button" data-v="n">Não</button><button class="btn" type="button" data-v="y">Sim, validar</button></div></div>';
  m.hidden=false;setTimeout(function(){var n=m.querySelector('[data-v="n"]');if(n)n.focus()},40);
  m.onclick=function(e){if(e.target===m){m.hidden=true;return}var b=e.target.closest("[data-v]");if(!b)return;m.hidden=true;
    if(b.dataset.v==="y")cnSet(p,{ops:c2.ops,status:"validado",validadoPor:AG.uid||"",validadoEm:Date.now()},"Programa validado"+(c2.ch.length?" com correções em "+c2.ch.join(", "):"")+".").then(function(){toast("Programa validado.")})};
}
$("v-mx").addEventListener("change",function(e){
  if(S.tab!=="m-cnc")return;
  if(e.target.id==="cn-cmd"){CN.cmd=e.target.value;mxRender();return}
  if(e.target.id==="cn-file"){cnFiles(e.target.files);e.target.value="";return}
});
$("v-mx").addEventListener("input",function(e){
  if(S.tab!=="m-cnc")return;
  var id=e.target.id;
  if(id==="cn-bruto")CN.draft.bruto=e.target.value;else if(id==="cn-mat")CN.draft.mat=e.target.value;else if(id==="cn-inst")CN.draft.inst=e.target.value;
  else if(id==="cn-q"){CN.q=e.target.value;clearTimeout(CN.qt);CN.qt=setTimeout(mxRender,250)}
});
$("v-mx").addEventListener("keydown",function(e){if(S.tab==="m-cnc"&&(e.key==="Enter"||e.key===" ")&&e.target.dataset&&e.target.dataset.cnc==="pick"){e.preventDefault();var fi=$("cn-file");if(fi)fi.click()}});
window.addEventListener("drop",function(e){
  if(S.tab!=="m-cnc")return;e.preventDefault();e.stopImmediatePropagation();document.body.classList.remove("dragging");
  if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length)cnFiles(e.dataTransfer.files);
},true);

/* ---- menu e Cérebro ---- */
MODS.cnc={n:"Programas CNC",fase:"Fase 4",et:[],txt:"",plan:[]};
MX_TABS.push("m-cnc");
var _stCnc=showTab;showTab=function(t){var r=_stCnc.apply(this,arguments);
  var a=$("t-cnc"),b=$("t-meng");if(a)a.setAttribute("aria-selected",String(t==="m-cnc"));if(b)b.setAttribute("aria-selected",String(t==="m-eng"));
  if(t==="m-cnc"||t==="m-eng"){var g=document.querySelector('[data-tog2="eng"]');if(g){g.classList.add("open");g.setAttribute("aria-expanded","true")}var sg=$("s-eng");if(sg)sg.classList.add("open");
    $("crumb").innerHTML="Engenharia › <b>"+(t==="m-cnc"?"Programas CNC":"Pedidos em engenharia")+"</b>";$("crumb-t").textContent=t==="m-cnc"?"Programas CNC":"Pedidos em engenharia";
    if(t!=="m-cnc")CN.open=""}
  return r};
var _capCnc=capSync;capSync=function(){_capCnc();try{var A=BR.agents;for(var k=0;k<A.length;k++){if(A[k][0]==="Engenharia"){var v=CN.list.length>0?1:0;if(A[k][3]!==v){BR.setOn(k,v);if(window.__capList)window.__capList()}}}}catch(e){}};

/* ---- excluir direto na lista de clientes e fornecedores ---- */
var _agLV=agListView;agListView=function(box){_agLV.apply(this,arguments);
  Array.prototype.forEach.call(box.querySelectorAll(".cr3[data-id] .ra2"),function(sp){var row=sp.closest(".cr3");if(sp.querySelector("[data-rowdel]"))return;
    sp.insertAdjacentHTML("beforeend",ibtn("trash","Excluir",'data-rowdel="'+esc(row.dataset.id)+'" data-col="'+esc(row.dataset.col)+'"',"danger"))})};
$("v-mx").addEventListener("click",function(e){
  var b=e.target.closest("[data-rowdel]");if(!b)return;e.stopPropagation();e.preventDefault();
  var col=b.dataset.col==="forn"?"forn":"cli",id=b.dataset.rowdel,r=agList(col).filter(function(x){return x.id===id})[0]||{};
  askDel("Excluir "+(r.nome||"este cadastro")+"?",(col==="forn"?"O fornecedor":"O cliente")+" sai da lista. Propostas e pedidos não são apagados. Esta ação não pode ser desfeita.",function(){
    PR.db.doc(AG_COL[col]+"/"+id).delete().then(function(){toast("Cadastro excluído.");mxRender()}).catch(function(){toast("Não consegui excluir.")})});
},true);
