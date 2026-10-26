
/* ===== Painel de perguntas — cabeçalho, fases e fixação (agente-cnc-briefing.md, 23/10/2026) ===== */
var FIX_DEF=[
 {k:"placa-ext",nome:"Placa prendendo pelo externo",campos:["Ø de fixação","Comprimento de pega","Castanha (dura ou mole/usinada)","Altura saliente acima da castanha"],ordem:1},
 {k:"placa-int",nome:"Placa prendendo pelo interno",campos:["Ø do furo de fixação","Profundidade de pega","Tipo de castanha","Espessura mínima de parede na região presa"],ordem:2},
 {k:"morsa-tr",nome:"Morsa prendendo pelo eixo transversal (mordentes paralelos a X, aperto em Y)",campos:["Medida de pega (abertura)","Altura dos paralelos","Altura saliente acima do mordente","Mordente (liso, serrilhado ou mole/alumínio)","Lado do batente"],ordem:3},
 {k:"morsa-lo",nome:"Morsa prendendo pelo eixo longitudinal (mordentes paralelos a Y, aperto em X)",campos:["Medida de pega (abertura)","Altura dos paralelos","Altura saliente acima do mordente","Mordente (liso, serrilhado ou mole/alumínio)","Lado do batente"],ordem:4}
];
var ZXY=["Canto (lado do batente)","Centro da peça","Centro de um furo"],ZZ=["Face superior","Base"],FACES=["Superior","Inferior","Lateral"];
CN.fixl=[];CN.fsub=false;CN.ler=null;
(function wfx(){if(!PR.db){setTimeout(wfx,700);return}if(CN.fsub)return;CN.fsub=true;
  PR.db.collection("cnc_fixacoes").onSnapshot(function(sn){CN.fixl=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c}).sort(function(a,b){return(a.ordem||99)-(b.ordem||99)});if(S.tab==="m-cnc"&&!CN.open)cnRenderSide();if(S.tab==="m-fix")mxRender()},function(){})})();
function cnFixList(){return CN.fixl.length?CN.fixl:FIX_DEF.map(function(f){return{id:f.k,nome:f.nome,campos:f.campos,ordem:f.ordem}})}
function cnFix(id){return cnFixList().filter(function(f){return f.id===id})[0]||null}
function cnD(){var d=CN.draft;if(!d.fases)d.fases=[];if(!d.feats)d.feats=[];return d}
function cnNewFase(src){var f=src?JSON.parse(JSON.stringify(src)):{maq:"m70",face:"",vista:"",fix:"",fd:{},zx:"",zxd:"",zz:"",ops:[],obs:""};f.id=rid();return f}
function cnOpName(i){return"OP"+(i+1)*10}
function cnMissing(){
  var d=cnD(),m=[];if(!CN.file)m.push("Desenho");
  [["proc","Código MIX"],["rev","Revisão"],["cli","Cliente"],["mat","Material"],["bruto","Bruto"],["qtd","Quantidade"]].forEach(function(r){if(!String(d[r[0]]||"").trim())m.push(r[1])});
  if(!d.fases.length)m.push("Pelo menos uma fase");
  d.fases.forEach(function(f,i){var n="Fase "+(i+1)+": ",fx=cnFix(f.fix);
    if(!f.maq)m.push(n+"máquina");if(!f.face)m.push(n+"face");if(!fx)m.push(n+"fixação");
    if(fx)(fx.campos||[]).forEach(function(c){if(!String((f.fd||{})[c]||"").trim())m.push(n+c.toLowerCase())});
    if(!f.zx)m.push(n+"zero X/Y");else if(f.zx!=="Centro da peça"&&!String(f.zxd||"").trim())m.push(n+(f.zx.indexOf("Canto")===0?"qual canto":"qual furo"));
    if(!f.zz)m.push(n+"zero Z");if(!(f.ops||[]).length)m.push(n+"operações");if(!String(f.obs||"").trim())m.push(n+"observações")});
  var sem=d.feats.filter(function(c){return !d.fases.some(function(f){return(f.ops||[]).indexOf(c.id)>-1})});
  sem.forEach(function(c){m.push("Característica "+c.id+" sem fase")});
  return m;
}
function cnGate(){var b=$("cn-go"),l=$("cn-miss");if(!b)return;var m=cnMissing(),on=!!AG.sample&&!CN.ler;b.disabled=!!m.length||!on;
  if(l){l.className="cn-miss"+(m.length?"":" ok");l.innerHTML=!AG.sample?"Agente indisponível nesta visualização.":CN.ler?"Aguarde: o agente está lendo o desenho.":m.length?"<b>Falta ("+m.length+"):</b> "+m.slice(0,8).map(esc).join(" · ")+(m.length>8?" …":""):"Tudo preenchido e todas as características com fase. Pode gerar."}
  Array.prototype.forEach.call(document.querySelectorAll(".cn-side [data-cf]"),function(el){if(el.type==="checkbox")return;var w=el.closest(".cn-fld");if(w)w.classList.toggle("vazio",!String(el.value||"").trim())});
  var ck=$("cn-ck");if(ck){var d=cnD();ck.innerHTML=cnChecklistHtml(d)}}
function cnChecklistHtml(d){
  if(!d.feats.length)return'<p class="hint">Nenhuma característica listada ainda. O agente lista ao ler o desenho; você pode incluir.</p>';
  return d.feats.map(function(c,i){var fs=[];d.fases.forEach(function(f,k){if((f.ops||[]).indexOf(c.id)>-1)fs.push(cnOpName(k))});
    return'<div class="ck-r'+(fs.length?' ok':'')+'"><span class="ck-id">'+esc(c.id)+'</span><input data-cf="feat:'+i+':desc" value="'+esc(c.desc||"")+'" placeholder="ex.: 4 furos Ø9 passantes"><span class="ck-f">'+(fs.length?fs.join(", "):"sem fase")+'</span><button class="btn sm danger" type="button" data-cnx="feat-del" data-i="'+i+'" title="Remover característica">×</button></div>'}).join("");
}
function cnFaseHtml(f,i,n){
  var d=cnD(),fx=cnFix(f.fix);function sel(path,opts,v,ph){return'<select data-cf="'+path+'"><option value="">'+(ph||"escolha…")+'</option>'+opts.map(function(o){var val=typeof o==="string"?o:o[0],lab=typeof o==="string"?o:o[1];return'<option value="'+esc(val)+'"'+(v===val?" selected":"")+'>'+esc(lab)+'</option>'}).join("")+'</select>'}
  function fld(lab,html,cls){return'<label class="f cn-fld'+(cls?" "+cls:"")+'"><span class="lb">'+lab+' <i>*</i></span>'+html+'</label>'}
  var p="f:"+i+":";
  return'<div class="cn-fase" data-fi="'+i+'"><div class="cn-fase-h"><b>Fase '+(i+1)+' · '+cnOpName(i)+'</b><span class="sp"></span>'+
   '<button class="btn sm" type="button" data-cnx="fase-up" data-i="'+i+'"'+(i?'':' disabled')+' title="Subir">↑</button><button class="btn sm" type="button" data-cnx="fase-down" data-i="'+i+'"'+(i<n-1?'':' disabled')+' title="Descer">↓</button><button class="btn sm" type="button" data-cnx="fase-dup" data-i="'+i+'">Duplicar</button><button class="btn sm danger" type="button" data-cnx="fase-del" data-i="'+i+'">Excluir</button></div>'+
   '<div class="cn-fase-b">'+
   '<div class="cn-g2">'+fld("Máquina",sel(p+"maq",CN_CMDS.map(function(x){return[x.k,x.maq+" · "+x.n]}),f.maq))+fld("Face trabalhada",sel(p+"face",FACES,f.face))+'</div>'+
   '<label class="f"><span class="lb">Vista do desenho (opcional)</span><input data-cf="'+p+'vista" value="'+esc(f.vista||"")+'" placeholder="ex.: vista superior, corte A-A"></label>'+
   fld("Forma de fixação",sel(p+"fix",cnFixList().map(function(x){return[x.id,x.nome]}),f.fix))+
   (fx?'<div class="cn-g2">'+(fx.campos||[]).map(function(c){return fld(esc(c),'<input data-cf="'+p+'fd:'+esc(c)+'" value="'+esc((f.fd||{})[c]||"")+'">')}).join("")+'</div>':'')+
   '<div class="cn-g2">'+fld("Zero X/Y",sel(p+"zx",ZXY,f.zx))+fld("Zero Z",sel(p+"zz",ZZ,f.zz))+'</div>'+
   (f.zx&&f.zx!=="Centro da peça"?fld(f.zx.indexOf("Canto")===0?"Qual canto / lado do batente":"Qual furo",'<input data-cf="'+p+'zxd" value="'+esc(f.zxd||"")+'" placeholder="'+(f.zx.indexOf("Canto")===0?"ex.: canto inferior esquerdo, batente à esquerda":"ex.: furo central Ø20")+'">'):'')+
   '<div class="cn-fld'+((f.ops||[]).length?'':' vazio')+'"><span class="lb">Operações desta fase <i>*</i></span><div class="cn-ops">'+(d.feats.length?d.feats.map(function(c){return'<label class="cn-op"><input type="checkbox" data-cf="'+p+'op:'+esc(c.id)+'"'+((f.ops||[]).indexOf(c.id)>-1?" checked":"")+'> <b>'+esc(c.id)+'</b> '+esc(c.desc||"")+'</label>'}).join(""):'<span class="hint">Liste as características do desenho (o agente faz isso ao ler o desenho).</span>')+'</div></div>'+
   fld("Observações",'<textarea data-cf="'+p+'obs" rows="2" placeholder="ex.: parede fina, aperto leve; não marcar face A">'+esc(f.obs||"")+'</textarea>')+
   '</div></div>';
}
function cnSideHtml(){
  var d=cnD();function fld(lab,html){return'<label class="f cn-fld"><span class="lb">'+lab+' <i>*</i></span>'+html+'</label>'}
  function inp(k,ph){return'<input data-cf="'+k+'" value="'+esc(d[k]||"")+'" placeholder="'+esc(ph||"")+'">'}
  return'<aside class="cn-side" aria-label="Painel de perguntas"><div class="cn-side-h"><b>Painel de perguntas do agente</b><span>'+(CN.ler?'<span class="cn-spin"></span> O agente está lendo o desenho e preenchendo o painel…':'O agente preenche a partir do desenho; você confere. Todos os campos são obrigatórios.')+'</span></div><div class="cn-side-b">'+
   '<div class="cn-sec"><div class="cn-sec-h">1. Cabeçalho da peça</div>'+
   '<div class="cn-g2">'+fld("Código MIX",inp("proc","ex.: MIX-GCT-12.00.08"))+fld("Revisão do desenho",inp("rev","ex.: R1"))+'</div>'+
   '<div class="cn-g2">'+fld("Cliente",inp("cli"))+fld("Material",inp("mat","ex.: SAE 4140"))+'</div>'+
   fld("Bruto",'<textarea data-cf="bruto" rows="2" placeholder="ex.: Ø85 x 15 torneado; ou 160 x 85 x 22 esquadrejado">'+esc(d.bruto||"")+'</textarea>')+
   '<label class="cn-chk"><input type="checkbox" data-cf="torneada"'+(d.torneada?" checked":"")+'> Peça vem torneada (o centro não reusina o que o torno fez)</label>'+
   (d.torneada?'<label class="f"><span class="lb">O que já vem pronto do torno</span><input data-cf="prontos" value="'+esc(d.prontos||"")+'" placeholder="ex.: Ø85, faces, furo M12 central, rebaixo"></label>':'')+
   '<div class="cn-g2">'+fld("Quantidade",inp("qtd","ex.: 50"))+'<span></span></div></div>'+
   '<div class="cn-sec"><div class="cn-sec-h">2. Fases <span class="sp"></span><button class="btn sm pri" type="button" data-cnx="fase-add">+ Nova fase</button></div>'+
   (d.fases.length?d.fases.map(function(f,i){return cnFaseHtml(f,i,d.fases.length)}).join(""):'<p class="hint">Nenhuma fase. Clique em "+ Nova fase" (cada fase gera 1 programa e 1 folha).</p>')+'</div>'+
   '<div class="cn-sec"><div class="cn-sec-h">3. Checklist de cotas <span class="sp"></span><button class="btn sm" type="button" data-cnx="feat-add">+ Característica</button></div><p class="hint" style="margin:0">Toda característica do desenho precisa estar em alguma fase.</p><div id="cn-ck">'+cnChecklistHtml(d)+'</div></div>'+
   '</div><div class="cn-side-f"><button class="btn pri cn-go" id="cn-go" type="button" data-cnc="gerar" disabled>Gerar programa'+(d.fases.length>1?'s ('+d.fases.length+' fases)':'')+'</button><div class="cn-miss" id="cn-miss"></div></div></aside>';
}
function cnRenderSide(){var a=document.querySelector(".cn-side");if(!a)return;var ae=document.activeElement,key=ae&&ae.dataset?ae.dataset.cf:null,pos=key&&ae.selectionStart!=null?ae.selectionStart:null,sc=a.querySelector(".cn-side-b")?a.querySelector(".cn-side-b").scrollTop:0,ws=window.scrollY;
  a.outerHTML=cnSideHtml();var b=document.querySelector(".cn-side .cn-side-b");if(b)b.scrollTop=sc;window.scrollTo(0,ws);
  if(key){var el=document.querySelector('.cn-side [data-cf="'+key.replace(/"/g,'\\"')+'"]');if(el){el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos)}catch(e){}}}cnGate()}
function cnSetPath(path,v){var d=cnD(),p=path.split(":");
  if(p[0]==="f"){var f=d.fases[+p[1]];if(!f)return false;var k=p[2];
    if(k==="fd"){f.fd=f.fd||{};f.fd[p.slice(3).join(":")]=v;return false}
    if(k==="op"){var id=p.slice(3).join(":"),i=f.ops.indexOf(id);if(v&&i<0)f.ops.push(id);if(!v&&i>-1)f.ops.splice(i,1);return true}
    f[k]=v;return k==="fix"||k==="zx"}
  if(p[0]==="feat"){var c=d.feats[+p[1]];if(c)c[p[2]]=v;return false}
  d[path]=v;return path==="torneada"}
$("v-mx").addEventListener("input",function(e){if(S.tab!=="m-cnc"||!e.target.dataset||!e.target.dataset.cf||e.target.type==="checkbox"||e.target.tagName==="SELECT")return;cnSetPath(e.target.dataset.cf,e.target.value);cnGate()});
$("v-mx").addEventListener("change",function(e){if(S.tab!=="m-cnc"||!e.target.dataset||!e.target.dataset.cf)return;var re=cnSetPath(e.target.dataset.cf,e.target.type==="checkbox"?e.target.checked:e.target.value);if(re||e.target.type==="checkbox")cnRenderSide();else cnGate()});
$("v-mx").addEventListener("click",function(e){
  if(S.tab!=="m-cnc")return;var b=e.target.closest("[data-cnx]");if(!b)return;e.preventDefault();e.stopPropagation();
  var d=cnD(),a=b.dataset.cnx,i=+b.dataset.i;
  if(a==="fase-add"){d.fases.push(cnNewFase(d.fases.length?{maq:d.fases[d.fases.length-1].maq,face:"",vista:"",fix:"",fd:{},zx:"",zxd:"",zz:"",ops:[],obs:""}:null));cnRenderSide();return}
  if(a==="fase-dup"){d.fases.splice(i+1,0,cnNewFase(d.fases[i]));d.fases[i+1].ops=[];cnRenderSide();toast("Fase duplicada (sem as operações). Escolha as operações da nova fase.");return}
  if(a==="fase-up"&&i>0){var t=d.fases[i];d.fases[i]=d.fases[i-1];d.fases[i-1]=t;cnRenderSide();return}
  if(a==="fase-down"&&i<d.fases.length-1){var t2=d.fases[i];d.fases[i]=d.fases[i+1];d.fases[i+1]=t2;cnRenderSide();return}
  if(a==="fase-del"){askDel("Excluir a fase "+(i+1)+" ("+cnOpName(i)+")?","As fases seguintes são renumeradas.",function(){d.fases.splice(i,1);cnRenderSide()});return}
  if(a==="feat-add"){var n=1;d.feats.forEach(function(c){var m=/^C(\d+)$/.exec(c.id);if(m)n=Math.max(n,+m[1]+1)});d.feats.push({id:"C"+n,desc:"",face:""});cnRenderSide();setTimeout(function(){var el=document.querySelector('.cn-side [data-cf="feat:'+(d.feats.length-1)+':desc"]');if(el)el.focus()},30);return}
  if(a==="feat-del"){var c=d.feats[i];if(!c)return;askDel("Remover a característica "+c.id+"?",c.desc||"",function(){d.feats.splice(i,1);d.fases.forEach(function(f){f.ops=(f.ops||[]).filter(function(x){return x!==c.id})});cnRenderSide()});return}
},true);

/* --- o agente lê o desenho e preenche o painel --- */
function cnLer(f){
  if(!AG.sample)return;var tk=rid();CN.ler=tk;cnRenderSide();
  agPrep(f).then(function(prep){
    var fx=cnFixList().map(function(x){return x.nome}).join(" | ");
    var pr="Você é o agente de programação CNC da MIX USINAGEM. Leia o desenho anexado (arquivo "+f.name+") para preparar a programação em centro de usinagem (fresamento 2,5D). NÃO gere programa agora.\n"+
      "Devolva só um bloco ```json com:\n{\"processo\":\"código MIX no padrão MIX-<sigla do cliente>-<nº do desenho>, se der para montar\",\"part_number\":\"\",\"revisao\":\"\",\"cliente\":\"\",\"descricao\":\"\",\"material\":\"\",\"bruto\":\"medidas do bruto se o desenho indicar; senão vazio\",\"torneada\":true/false,\"prontos\":\"o que já vem pronto do torno, se torneada\",\"quantidade\":\"\",\n"+
      "\"caracteristicas\":[{\"id\":\"C1\",\"desc\":\"ex.: 4 furos Ø9 passantes escareados 90° no PCD 60\",\"face\":\"Superior|Inferior|Lateral\"}],\n"+
      "\"fases\":[{\"face\":\"Superior|Inferior|Lateral\",\"vista\":\"\",\"fixacao\":\"um destes nomes exatamente: "+fx+"\",\"detalhes\":{\"campo\":\"valor sugerido\"},\"zero_xy\":\""+ZXY.join("|")+"\",\"zero_xy_det\":\"\",\"zero_z\":\""+ZZ.join("|")+"\",\"operacoes\":[\"C1\"],\"obs\":\"\"}]}\n"+
      "Liste TODAS as características que o centro de usinagem precisa fazer (furos, roscas, rasgos, bolsões, faces, chanfros, contornos), uma por linha, e não liste o que o torno já faz. 80% das peças da casa chegam torneadas: se o desenho for de peça cilíndrica com diâmetros e roscas de torno, marque torneada=true. Sugira o mínimo de fases (fixações) e atribua cada característica a uma fase.\n"+
      (prep.texto?"TEXTO EXTRAÍDO DO DESENHO:\n"+String(prep.texto).slice(0,10000):"");
    var o={cache:false,modelTier:"complex"};if(prep.imgs&&prep.imgs.length)o.images=prep.imgs;
    return AG.sample(pr,o)}).then(function(r){
    if(CN.ler!==tk)return;var t=String(r&&r.text||""),m=t.match(/```json\s*([\s\S]*?)```/),j={};try{j=JSON.parse(m?m[1]:t.slice(t.indexOf("{"),t.lastIndexOf("}")+1))}catch(e){throw new Error("resposta ilegível")}
    var d=cnD();function put(k,v){if(v!=null&&String(v).trim()&&!String(d[k]||"").trim())d[k]=String(v).trim()}
    put("proc",j.processo);put("rev",j.revisao);put("cli",j.cliente);put("mat",j.material);put("bruto",j.bruto);put("qtd",j.quantidade);put("pn",j.part_number);put("desc",j.descricao);
    if(j.torneada===true&&!d.torneada){d.torneada=true;put("prontos",j.prontos)}
    if(!d.feats.length&&Array.isArray(j.caracteristicas))d.feats=j.caracteristicas.slice(0,60).map(function(c,i){return{id:String(c.id||("C"+(i+1))),desc:String(c.desc||""),face:String(c.face||"")}});
    if(!d.fases.length&&Array.isArray(j.fases))d.fases=j.fases.slice(0,8).map(function(s){var f=cnNewFase(),fl=cnFixList(),nm=String(s.fixacao||"").toLowerCase(),fx=fl.filter(function(x){return x.nome.toLowerCase()===nm})[0]||fl.filter(function(x){return nm&&x.nome.toLowerCase().indexOf(nm.slice(0,18))===0})[0];
      f.face=FACES.indexOf(s.face)>-1?s.face:"";f.vista=String(s.vista||"");if(fx){f.fix=fx.id;var dt=s.detalhes||{};(fx.campos||[]).forEach(function(c){if(dt[c]!=null)f.fd[c]=String(dt[c])})}
      f.zx=ZXY.indexOf(s.zero_xy)>-1?s.zero_xy:"";f.zxd=String(s.zero_xy_det||"");f.zz=ZZ.indexOf(s.zero_z)>-1?s.zero_z:"";f.ops=(s.operacoes||[]).map(String).filter(function(x){return d.feats.some(function(c){return c.id===x})});f.obs=String(s.obs||"");return f});
    CN.ler=null;cnRenderSide();toast("O agente preencheu o painel. Confira cada campo antes de gerar.");
  }).catch(function(e){if(CN.ler!==tk)return;CN.ler=null;cnRenderSide();toast("O agente não conseguiu ler o desenho ("+((e&&e.message)||agErr(e))+"). Preencha o painel à mão.")});
}
var _cnStage0=cnStage;cnStage=function(files){var f0=files&&files[0];_cnStage0(files);if(CN.file&&CN.file===f0){var d=cnD();if(!d.fases.length&&!d.feats.length)cnLer(f0);else cnGate()}};

/* --- geração com fases --- */
function cnFiles(files){
  if(!AG.sample){toast("O agente não está disponível nesta visualização. Abra o MISTA no claude.ai.");return}
  var m=cnMissing();if(m.length){toast("Preencha antes de gerar: "+m.slice(0,4).join(", ")+(m.length>4?"…":"")+".");cnGate();return}
  if(!PR.db){toast("Banco indisponível.");return}
  var f=files&&files[0];if(!f)return;var d=JSON.parse(JSON.stringify(cnD()));
  var c=cnCmd(d.fases[0].maq)||CN_CMDS[0];
  var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:c,entrada:d,draft:{bruto:d.bruto,mat:d.mat,inst:"",fix:"",zero:""}};
  CN.file=null;CN.pv=[];CN.draft={fases:[],feats:[]};
  CN.jobs.unshift(j);CN.jobs=CN.jobs.slice(0,8);cnRun(j);
}
function cnRetry(p){
  if(!AG.sample){toast("O agente não está disponível nesta visualização.");return}
  if(!p.fonte||!p.fonte.url){toast("O desenho original não está guardado. Arraste de novo.");return}
  var d=p.entrada||{proc:p.processo,rev:p.rev,cli:p.cliente,mat:p.materialInf,bruto:p.bruto,qtd:"1",feats:[],fases:[{maq:p.comando,face:"Superior",fix:"",fd:{},zx:"Centro da peça",zz:"Face superior",ops:[],obs:(p.fixacaoInf||"")+" "+(p.zeroInf||"")+" "+(p.instrucoes||"")}]};
  toast("Buscando o desenho guardado…");
  fetch(p.fonte.url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
    var f=new File([b],p.fonte.nome||"desenho",{type:b.type||(p.fonte.tipo==="pdf"?"application/pdf":"image/png")});
    var j={id:rid(),nome:f.name,st:"ler",ms:"Abrindo o desenho…",f:f,c:cnCmd(d.fases[0].maq)||CN_CMDS[0],docId:p.id,asset:{id:p.fonte.id,url:p.fonte.url},entrada:d,draft:{bruto:d.bruto,mat:d.mat,inst:"",fix:"",zero:""}};
    CN.jobs.unshift(j);cnRun(j)}).catch(function(){toast("Não consegui buscar o desenho guardado. Arraste de novo.")});
}
var _cnRun0=cnRun;cnRun=function(j){CN.curEntrada=j.entrada||null;return _cnRun0(j)};
function cnPrompt(c,nome,prep){
  var d=CN.curEntrada||cnD(),maqs=[];d.fases.forEach(function(f){if(maqs.indexOf(f.maq)<0)maqs.push(f.maq)});
  var regras=maqs.map(function(k){var cc=cnCmd(k)||{},dd=CN.dial[k]||{};return"### "+(cc.n||k)+" — máquina "+(cc.maq||"")+" (extensão "+(dd.ext||cc.ext||".NC")+")\n"+(dd.regras||CN_REGRAS_PADRAO)}).join("\n\n");
  var fases=d.fases.map(function(f,i){var fx=cnFix(f.fix)||{nome:f.fix,campos:[]},cc=cnCmd(f.maq)||{};
    return"FASE "+(i+1)+" = "+cnOpName(i)+"\n- Máquina: "+(cc.maq||"")+" ("+(cc.n||f.maq)+")\n- Face trabalhada: "+f.face+(f.vista?" (vista: "+f.vista+")":"")+"\n- Fixação: "+fx.nome+"\n"+(fx.campos||[]).map(function(k){return"  · "+k+": "+((f.fd||{})[k]||"")}).join("\n")+
      "\n- Zero X/Y: "+f.zx+(f.zxd?" — "+f.zxd:"")+"\n- Zero Z: "+f.zz+"\n- Operações desta fase: "+(f.ops||[]).map(function(id){var ft=d.feats.filter(function(x){return x.id===id})[0];return id+" ("+(ft?ft.desc:"")+")"}).join("; ")+"\n- Observações: "+f.obs}).join("\n\n");
  return"Você é o agente de programação CNC da MIX USINAGEM (usinagem sob encomenda, Indaiatuba SP). Gere os programas CNC de FRESAMENTO 2,5D da peça do desenho anexado (arquivo: "+nome+"), um programa por fase, seguindo EXATAMENTE as fases definidas pelo programador.\n\n"+
  "CABEÇALHO DA PEÇA\n- Código MIX: "+d.proc+"\n- Revisão do desenho: "+d.rev+"\n- Cliente: "+d.cli+"\n- Material: "+d.mat+"\n- Bruto: "+d.bruto+(d.torneada?"\n- PEÇA VEM TORNEADA: não reusinar o que o torno fez"+(d.prontos?" (pronto do torno: "+d.prontos+")":"")+"; usar as referências do torno para o zero; fixar sem marcar superfícies acabadas; escrever (PECA-TORNEADA) no cabeçalho.":"")+"\n- Quantidade: "+d.qtd+"\n\n"+
  "CARACTERÍSTICAS DO DESENHO (checklist de cotas)\n"+d.feats.map(function(x){return"- "+x.id+": "+x.desc}).join("\n")+"\n\n"+
  "FASES\n"+fases+"\n\n"+
  "HERANÇA: o bruto de entrada de cada fase é o resultado da fase anterior. Considere o que já foi usinado ao escolher onde prender e por onde entrar.\n"+
  "CONFERÊNCIAS ANTES DE GERAR (registre cada problema em duvidas começando com \"ALERTA:\"): altura saliente maior que a profundidade usinada + margem (senão risco de colisão com mordente/castanha); pega mínima suficiente; zero coerente com a fixação (ex.: zero no canto do lado do batente); toda característica coberta por alguma fase. Peça fora do calibrado (material novo, tolerância apertada, rosca acima de M16, peça fina) → escreva (ESTRATEGIA-NOVA-CONFERIR) no cabeçalho.\n\n"+
  "REGRAS DO DIALETO DA CASA POR MÁQUINA:\n"+regras+"\n\n"+
  "REGRAS DE SEGURANÇA: cada programa nasce aguardando validação (inclua (AGUARDANDO-VALIDACAO) no cabeçalho); nunca envie à máquina; 3D, 4º/5º eixo ou torneamento não entram (explique em duvidas). Em operacoes[], use \"op\" = OP10, OP20… na ordem das fases, e a fixacao/zero de cada fase.\n\n"+
  (prep.texto?"TEXTO EXTRAÍDO DO DESENHO:\n"+String(prep.texto).slice(0,10000)+"\n\n":"")+cnPromptFormato();
}
function cnFileName(p,o){var c=cnCmd((o&&o.comando)||p.comando)||CN_CMDS[0],d=CN.dial[c.k]||{},ext=d.ext||c.ext;
  var base=String(p.codigo||p.processo||"PROGRAMA").toUpperCase().replace(/[^A-Z0-9.\-]+/g,"-").replace(/^-+|-+$/g,"");
  return base+(o&&o.op?"_"+String(o.op).toUpperCase().replace(/[^A-Z0-9]+/g,""):"")+ext}

/* --- Engenharia › Formas de fixação (cadastro editável) --- */
IDP.cnc_fixacoes="FIX";
MODS.fix={n:"Formas de fixação",fase:"Fase 4",et:[],txt:"",plan:[]};MX_TABS.push("m-fix");
var _rmFix=renderMod;renderMod=function(box,k){if(k==="fix"){renderFix(box);return}return _rmFix.apply(this,arguments)};
function renderFix(box){
  var L=cnFixList(),dflt=!CN.fixl.length;
  box.innerHTML='<div class="mh"><div><h2>Formas de fixação</h2><p>Cadastro usado no painel de perguntas do agente CNC. Cada forma tem os detalhes que o programador precisa informar em cada fase. Inclua novas formas aqui, sem mudar o sistema.</p></div><span class="fase">Engenharia · F4</span></div>'+
   (dflt?'<div class="askbox">Mostrando as 4 formas padrão do briefing. Elas são gravadas no banco na primeira edição.</div>':'')+
   '<div class="mx-bar"><span class="hint">'+L.length+' formas</span><span class="sp"></span><button class="btn sm pri" type="button" data-fx="novo">+ Nova forma de fixação</button></div>'+
   '<div class="tbx"><div class="fx-r fh"><span>ID</span><span>Forma de fixação</span><span>Detalhes pedidos em cada fase</span><span></span></div>'+
   L.map(function(f){return'<div class="fx-r"><span class="idtag">'+esc(f.idSeq?cnIdTxt("cnc_fixacoes",f):"padrão")+'</span><span><b>'+esc(f.nome)+'</b></span><span class="fx-c">'+(f.campos||[]).map(function(c){return'<i>'+esc(c)+'</i>'}).join("")+'</span><span class="ra2">'+ibtn("edit","Editar",'data-fx="ed" data-id="'+esc(f.id)+'"')+ibtn("trash","Excluir",'data-fx="del" data-id="'+esc(f.id)+'"',"danger")+'</span></div>'}).join("")+'</div>';
}
function fixSeed(){if(CN.fixl.length)return Promise.resolve();var p=Promise.resolve();FIX_DEF.forEach(function(f){p=p.then(function(){return PR.db.doc("cnc_fixacoes/"+f.k).set({nome:f.nome,campos:f.campos,ordem:f.ordem,atualizado:Date.now()})})});return p}
function fixForm(f){var m=$("mx-modal");f=f||{};
  m.innerHTML='<div class="card" role="dialog" aria-modal="true"><h3>'+(f.id?"Editar forma de fixação":"Nova forma de fixação")+'</h3>'+
   '<label class="f cn-fld"><span class="lb">Nome <i>*</i></span><input id="fx-nome" value="'+esc(f.nome||"")+'" placeholder="ex.: Dispositivo dedicado"></label>'+
   '<label class="f cn-fld"><span class="lb">Detalhes pedidos em cada fase (um por linha) <i>*</i></span><textarea id="fx-campos" rows="6" placeholder="ex.:\nCódigo do dispositivo\nAltura saliente">'+esc((f.campos||[]).join("\n"))+'</textarea></label>'+
   '<div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-x="cfx">Cancelar</button><button class="btn pri" type="button" data-fxs="'+esc(f.id||"")+'">Salvar</button></div></div>';
  m.hidden=false;setTimeout(function(){$("fx-nome").focus()},30)}
$("mx-modal").addEventListener("click",function(e){var b=e.target.closest("[data-fxs]");if(!b)return;var id=b.dataset.fxs,nome=$("fx-nome").value.trim(),campos=$("fx-campos").value.split("\n").map(function(x){return x.trim()}).filter(Boolean);
  if(!nome||!campos.length){toast("Informe o nome e pelo menos um detalhe.");return}
  fixSeed().then(function(){var ex=CN.fixl.filter(function(x){return x.id===id})[0]||FIX_DEF.filter(function(x){return x.k===id})[0];return PR.db.doc("cnc_fixacoes/"+(id||("fx-"+rid().slice(0,8)))).set({nome:nome,campos:campos,ordem:ex?ex.ordem||99:99,atualizado:Date.now(),idSeq:ex&&ex.idSeq||null})})
   .then(function(){$("mx-modal").hidden=true;toast("Forma de fixação salva.")}).catch(function(){toast("Não consegui salvar.")})});
$("v-mx").addEventListener("click",function(e){if(S.tab!=="m-fix")return;var b=e.target.closest("[data-fx]");if(!b)return;e.stopPropagation();var a=b.dataset.fx,f=cnFix(b.dataset.id);
  if(a==="novo")fixForm(null);else if(a==="ed")fixForm(f);
  else if(a==="del"&&f)askDel("Excluir a forma \""+f.nome+"\"?","Fases já salvas não mudam; ela só deixa de aparecer no painel.",function(){fixSeed().then(function(){return PR.db.doc("cnc_fixacoes/"+f.id).delete()}).then(function(){toast("Forma excluída.")}).catch(function(){toast("Não consegui excluir.")})})},true);
var _stFix=showTab;showTab=function(t){var r=_stFix.apply(this,arguments);var a=$("t-fix");if(a)a.setAttribute("aria-selected",String(t==="m-fix"));
  if(t==="m-fix"){var g=document.querySelector('[data-tog2="eng"]');if(g){g.classList.add("open");g.setAttribute("aria-expanded","true")}var sg=$("s-eng");if(sg)sg.classList.add("open");$("crumb").innerHTML="Engenharia › <b>Formas de fixação</b>";$("crumb-t").textContent="Formas de fixação"}
  return r};
var _idSw=idSweep;idSweep=function(){_idSw();if(IDS_BUSY||!PR.db)return;var t=CN.fixl.filter(function(r){return !r.idSeq});if(!t.length)return;IDS_BUSY=true;var p=Promise.resolve();t.forEach(function(r){p=p.then(function(){return cnNextId("cnc_fixacoes").then(function(n){r.idSeq=n;return PR.db.doc("cnc_fixacoes/"+r.id).update({idSeq:n})})}).catch(function(){})});p.then(function(){IDS_BUSY=false})};
