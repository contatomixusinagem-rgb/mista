
/* ===== Esqueleto MISTA: status único do pedido, módulos e cadastros (22/10/2026) ===== */
var ET=[
 {k:"entrada",n:"Entrada",g:"ven"},
 {k:"orcamento",n:"Orçamento",g:"ven"},
 {k:"proposta",n:"Proposta em análise",g:"ven"},
 {k:"pedido",n:"Pedido recebido",g:"ped"},
 {k:"os",n:"OS de fabricação",g:"ped"},
 {k:"compras",n:"Compras",g:"ped"},
 {k:"producao",n:"Produção",g:"ped"},
 {k:"qualidade",n:"Qualidade",g:"ped"},
 {k:"expedicao",n:"Expedição e NF",g:"ped"},
 {k:"financeiro",n:"A receber",g:"ped"},
 {k:"concluido",n:"Concluído",g:"fim"}
];
function etIdx(k){for(var i=0;i<ET.length;i++)if(ET[i].k===k)return i;return -1}
var MODS={
 ped:{n:"Pedidos",trilha:"Fluxo"},
 eng:{n:"Engenharia e processos",fase:"Fase 4",et:["pedido","os"],txt:"Leitura de desenho, roteiro de fabricação e CAM. Hoje mostra os pedidos que precisam de desenho conferido e roteiro antes da OS.",plan:["Agente Engenharia lê o desenho (material, cotas, tratamentos)","Roteiro de fabricação por item, com máquina e tempo previsto","Tempos do CAM alimentando o Carlos"]},
 prod:{n:"Programação e produção",fase:"Fase 3",et:["os","producao"],txt:"OS de fabricação, programação das máquinas e apontamento de tempos. A OS ainda não existe: por enquanto o pedido só marca a etapa.",plan:["Criar a OS de fabricação a partir do pedido","Programação por máquina (MIX ou STAR)","Apontamento de tempos por OS (só depois da OS)"]},
 comp:{n:"Compras",fase:"Fase 2",et:["compras"],txt:"Material e serviços de terceiros (tratamento, retífica, erosão). Pedidos de industrialização normalmente pulam esta etapa.",plan:["Lista de material por pedido (barra, chapa, kg)","Cotação com fornecedores cadastrados","Pedido de compra só com aprovação do gestor"]},
 qual:{n:"Qualidade",fase:"Fase 4",et:["qualidade"],txt:"Plano de inspeção, relatório dimensional, certificados de material e não conformidades.",plan:["Plano de inspeção por item","Relatório dimensional e certificado do lote","Liberação do lote pela Qualidade, com o gestor ciente"]},
 exp:{n:"Expedição e faturamento",fase:"Fase 2",et:["expedicao"],txt:"Embalagem, nota fiscal e frete. A NF continua sendo emitida no sistema fiscal atual.",plan:["Registro do nº da NF e da data de saída","Romaneio e etiqueta de embalagem","Aviso de expedição ao cliente (rascunho, o gestor envia)"]},
 fin:{n:"Financeiro",fase:"Fase 5",et:["financeiro"],txt:"Contas a receber e a pagar, custo real e margem por pedido e por cliente.",plan:["Vencimento pelo prazo de pagamento (28 DDL)","Baixa do recebimento","Margem real: previsto do Carlos x custo real"]},
 pos:{n:"Pós-venda",fase:"Fase 5",et:["concluido"],txt:"Reclamações, retrabalho, recompra e satisfação do cliente.",plan:["Registro de reclamação ligado ao pedido","Retrabalho e não conformidade","Aviso de recompra para itens que se repetem"]},
 dir:{n:"Direção",fase:"Fase 5",txt:"Indicadores da empresa num só lugar. Os números abaixo já vêm das propostas e pedidos do MISTA."},
 cad:{n:"Cadastros"}
};
var PD={list:[],cli:[],sub:false,stage:"",open:"",q:"",emp:"",enc:false,cadTab:"cli",t:{}};
function nowStr(t){return t?new Date(t).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):""}
function dStr(s){if(!s)return"";var p=String(s).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0].slice(2):s}
var IND_CLI=["AGS","QUICKSHOT","PROMAQUINA"];
function cliRec(nome){var n=normTxt(nome);if(!n)return null;for(var i=0;i<PD.cli.length;i++){if(normTxt(PD.cli[i].nome)===n)return PD.cli[i]}return null}
function modPadrao(nome){var r=cliRec(nome);if(r&&r.modalidade)return r.modalidade;var n=normTxt(nome).toUpperCase();for(var i=0;i<IND_CLI.length;i++)if(n.indexOf(IND_CLI[i])>-1)return"Industrialização";return"Venda"}
function pdSubscribe(){
  if(PD.sub||!PR.db)return;PD.sub=true;
  PR.db.collection("pedidos").onSnapshot(function(sn){
    PD.list=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c});
    mxRefresh();
  },function(){});
  PR.db.collection("clientes").onSnapshot(function(sn){
    PD.cli=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c}).sort(function(a,b){return normTxt(a.nome)<normTxt(b.nome)?-1:1});
    mxRefresh();
  },function(){});
}
(function wait(){if(PR.db){pdSubscribe();return}setTimeout(wait,600)})();
var _mxT=null;function mxRefresh(){clearTimeout(_mxT);_mxT=setTimeout(function(){var t=S.tab;if(t==="ped"||t==="cad"||String(t).indexOf("m-")===0)mxRender()},120)}

/* linhas unificadas: caixa de entrada + propostas + pedidos */
function flowRows(){
  var rows=[],byProp={};
  PD.list.forEach(function(p){if(p.propostaId)byProp[p.propostaId]=p;
    rows.push({tipo:"ped",id:p.id,num:p.num,cli:p.cliente,emp:p.emp,mod:p.modalidade,et:p.etapa||"pedido",val:p.total||0,prazo:p.prazo,at:p.atualizado||p.criado,enc:!!p.cancelado||p.etapa==="concluido",canc:!!p.cancelado,ref:p.pedidoCliente?("Ped. cliente "+p.pedidoCliente):(p.propostaNum?("Proposta "+p.propostaNum):"Pedido manual")})});
  (PR.list||[]).forEach(function(d){if(byProp[d.id])return;
    rows.push({tipo:"prop",id:d.id,num:d.num||d.id,cli:d.cliente,emp:d.emp==="STAR"?"STAR":"MIX",mod:modPadrao(d.cliente),et:d.status==="Fechado"?"proposta":"orcamento",val:d.total||0,prazo:"",at:d.atualizado,enc:false,ref:(d.itens||0)+(d.itens===1?" item":" itens")+(d.proposta?" · Caprind "+d.proposta:"")})});
  (IB.docs||[]).forEach(function(d){if(d.status==="descartado"||d.pid)return;
    var n=(d.itens||[]).length;rows.push({tipo:"in",id:d.id,num:"E-mail",cli:d.cliente,emp:"",mod:modPadrao(d.cliente),et:"entrada",val:0,prazo:"",at:d.recebido||d.criado||d.at||0,enc:false,ref:n+(n===1?" item":" itens")+(d.proposta?" · "+d.proposta:"")})});
  return rows;
}
function etPill(r){var i=etIdx(r.et),e=ET[i]||ET[0],g=r.canc?"x":e.g;
  var pr="";for(var j=0;j<ET.length;j++)pr+='<i class="'+(j<i?"on":j===i?"cur":"")+'"></i>';
  return'<span class="etp"><span class="pill2" data-g="'+g+'">'+esc(r.canc?"Cancelado":e.n)+'</span><span class="prog" aria-hidden="true">'+pr+'</span></span>'}
function rowHtml(r){
  var e=r.emp?'<span class="emp-tag" data-e="'+r.emp+'">'+r.emp+'</span>':'<span class="hint">–</span>';
  return'<div class="fr'+(r.enc?' enc':'')+'" data-ft="'+r.tipo+'" data-fid="'+esc(r.id)+'" title="Abrir">'+
    '<span class="c"><b>'+esc(r.num||"")+'</b><small>'+(r.tipo==="ped"?"Pedido":r.tipo==="prop"?"Proposta":"Caixa de entrada")+'</small></span>'+
    '<span class="c"><b>'+esc(r.cli||"Sem cliente")+'</b><small>'+esc(r.ref||"")+'</small></span>'+
    '<span>'+etPill(r)+'</span>'+
    '<span>'+e+' <span class="hint">'+esc(r.mod||"")+'</span></span>'+
    '<span class="r">'+(r.val?brl(r.val):"–")+'</span>'+
    '<span>'+(r.prazo?dStr(r.prazo):'<span class="hint">–</span>')+'</span>'+
    '<span class="hint">'+esc(nowStr(r.at))+'</span></div>'}
function rowsHead(){return'<div class="fr fh"><span>Nº</span><span>Cliente</span><span>Etapa</span><span>Empresa · modalidade</span><span class="r">Valor</span><span>Prazo</span><span>Atualizado</span></div>'}
function filt(rows){
  var q=normTxt(PD.q);
  return rows.filter(function(r){
    if(PD.emp&&r.emp!==PD.emp)return false;
    if(!PD.enc&&r.enc)return false;
    if(PD.stage&&r.et!==PD.stage)return false;
    if(q&&normTxt([r.num,r.cli,r.ref,r.mod].join(" ")).indexOf(q)<0)return false;
    return true}).sort(function(a,b){return (b.at||0)-(a.at||0)})}

function renderPed(box){
  if(PD.open){var p=PD.list.filter(function(x){return x.id===PD.open})[0];if(p){renderDet(box,p);return}PD.open=""}
  var all=flowRows(),cnt={};all.forEach(function(r){if(!r.canc&&(r.et!=="concluido"||PD.enc))cnt[r.et]=(cnt[r.et]||0)+1});
  var rows=filt(all);
  box.innerHTML='<div class="mh"><div><h2>Pedidos</h2><p>Status único de cada demanda, do e-mail do cliente ao pós-venda. Entrada, orçamento e proposta vêm de Vendas; a partir do pedido do cliente, cada etapa muda aqui e fica no histórico.</p></div>'+
    '<div class="acts2"><button class="btn sm pri" type="button" data-x="novo">+ Pedido manual</button></div></div>'+
    '<div class="pipe" role="group" aria-label="Etapas">'+ET.map(function(e){var n=cnt[e.k]||0;return'<button type="button" data-st="'+e.k+'" aria-pressed="'+(PD.stage===e.k)+'"><i class="pm" data-g="'+e.g+'"></i><span class="pk">'+esc(e.n)+'</span><span class="pn'+(n?'':' z')+'">'+n+'</span></button>'}).join("")+'</div>'+
    '<div class="mx-bar"><input type="search" id="mx-q" placeholder="Buscar cliente, nº, pedido…" value="'+esc(PD.q)+'"><select id="mx-emp"><option value="">MIX e STAR</option><option'+(PD.emp==="MIX"?" selected":"")+'>MIX</option><option'+(PD.emp==="STAR"?" selected":"")+'>STAR</option></select>'+
    '<label class="mx-chk"><input type="checkbox" id="mx-enc"'+(PD.enc?" checked":"")+'> Mostrar concluídos e cancelados</label>'+(PD.stage?'<button class="btn sm" type="button" data-x="limpa">Limpar etapa</button>':'')+'<span class="sp"></span><span class="hint">'+rows.length+(rows.length===1?" demanda":" demandas")+'</span></div>'+
    '<div class="tbx">'+rowsHead()+(rows.length?rows.slice(0,250).map(rowHtml).join(""):'<div class="mx-empty">'+(PR.db?"Nada nesta seleção.":"Banco indisponível nesta visualização.")+'</div>')+'</div>';
}
function renderDet(box,p){
  var i=etIdx(p.etapa||"pedido"),nx=ET[i+1],enc=!!p.cancelado;
  var st="";for(var j=3;j<ET.length;j++)st+='<div class="st'+(j<i?" on":j===i?" on cur":"")+'"><i></i><span>'+esc(ET[j].n)+'</span></div>';
  var its=p.itens||[],tot=0;its.forEach(function(x){tot+=+x.total||0});
  var hist=(p.hist||[]).slice().reverse();
  box.innerHTML='<div class="mx-bar"><button class="btn sm" type="button" data-x="voltar">‹ Pedidos</button><span class="sp"></span><span class="hint">Salvo automaticamente</span></div>'+
  '<div class="card"><div class="dh2"><h2>'+esc(p.num||"Pedido")+'</h2><span class="emp-tag" data-e="'+esc(p.emp)+'">'+esc(p.emp)+'</span><span class="sub">'+esc(p.cliente||"")+' · '+esc(p.modalidade||"")+(p.propostaNum?' · da proposta '+esc(p.propostaNum):'')+'</span></div>'+
  (enc?'<div class="askbox">Pedido cancelado em '+esc(nowStr(p.cancelado))+'.</div>':'<div class="stepper">'+st+'</div>')+
  '<div class="acts2">'+(enc?'<button class="btn sm" type="button" data-x="reativar">Reativar pedido</button>':
    (nx?'<button class="btn pri" type="button" data-x="avanca">Avançar para '+esc(nx.n)+'</button>':'<span class="pill good">Pedido concluído</span>')+
    '<label class="mx-chk">Mover para <select id="dt-move"><option value="">escolha…</option>'+ET.slice(3).map(function(e){return'<option value="'+e.k+'"'+(e.k===p.etapa?" disabled":"")+'>'+esc(e.n)+'</option>'}).join("")+'</select></label>'+
    '<span class="sp" style="flex:1"></span><button class="btn sm danger" type="button" data-x="cancela">Cancelar pedido</button>')+'</div></div>'+
  '<div class="det"><div class="mx">'+
   '<div class="card"><h3>Dados do pedido</h3><div class="fgrid">'+
    '<label class="f"><span class="lb">Pedido do cliente (nº)</span><input data-f="pedidoCliente" value="'+esc(p.pedidoCliente||"")+'" placeholder="ex.: OC 45821"></label>'+
    '<label class="f"><span class="lb">Prazo de entrega</span><input type="date" data-f="prazo" value="'+esc(p.prazo||"")+'"></label>'+
    '<label class="f"><span class="lb">Modalidade</span><select data-f="modalidade"><option'+(p.modalidade!=="Industrialização"?" selected":"")+'>Venda</option><option'+(p.modalidade==="Industrialização"?" selected":"")+'>Industrialização</option></select></label>'+
    '<label class="f"><span class="lb">Empresa que executa</span><select data-f="emp"><option'+(p.emp!=="STAR"?" selected":"")+'>MIX</option><option'+(p.emp==="STAR"?" selected":"")+'>STAR</option></select></label>'+
    '<label class="f"><span class="lb">Responsável</span><input data-f="resp" value="'+esc(p.resp||"")+'" placeholder="Gestor"></label>'+
    '<label class="f"><span class="lb">Nº da NF</span><input data-f="nf" value="'+esc(p.nf||"")+'" placeholder="na expedição"></label>'+
   '</div><label class="f"><span class="lb">Observações</span><textarea data-f="obs" rows="2">'+esc(p.obs||"")+'</textarea></label></div>'+
   '<div class="card"><h3>Itens</h3>'+(its.length?'<div style="overflow:auto"><table class="itb"><thead><tr><th>Código</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th></tr></thead><tbody>'+
    its.map(function(x){return'<tr><td>'+esc(x.cod||"")+'</td><td>'+esc(x.desc||"")+'</td><td class="r">'+esc(x.qtd)+'</td><td class="r">'+(x.unit?brl(+x.unit):"–")+'</td><td class="r">'+(x.total?brl(+x.total):"–")+'</td></tr>'}).join("")+
    '</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">'+brl(tot)+'</td></tr></tfoot></table></div>':'<p class="hint">Pedido manual sem itens. Os itens vêm da proposta quando o pedido nasce dela.</p>')+'</div>'+
  '</div><div class="card"><h3>Histórico</h3><ul class="hist">'+(hist.length?hist.map(function(h){return'<li><time>'+esc(nowStr(h.at))+'</time><span>'+esc(h.txt)+'</span></li>'}).join(""):'<li><span class="hint">Sem registros.</span></li>')+'</ul></div></div>';
}
function pdSet(p,patch,txt){
  if(!PR.db){toast("Banco indisponível.");return Promise.resolve()}
  patch.atualizado=Date.now();
  if(txt){var h=(p.hist||[]).slice(-199);h.push({at:Date.now(),txt:txt});patch.hist=h}
  return PR.db.doc("pedidos/"+p.id).update(patch).catch(function(){toast("Não consegui gravar o pedido.")});
}
function pdNext(){
  var ano=new Date().getFullYear(),ref=PR.db.doc("config/pseq-"+ano),holder=rid();
  function tryAcq(k){return ref.acquire({holder:holder,ttlMs:8000}).then(function(r){
    if(!r.acquired){if(k>8)throw new Error("ocupado");return new Promise(function(ok){setTimeout(ok,500)}).then(function(){return tryAcq(k+1)})}
    return ref.get().then(function(sn){var n=((sn.exists&&sn.data().n)||0)+1;return ref.set({n:n}).then(function(){return{n:n,ano:ano}})})})}
  return tryAcq(0);
}
function pdCreate(base){
  if(!PR.db){toast("Banco indisponível.");return}
  return pdNext().then(function(r){
    var id="pd-"+pad(r.ano%100,2)+"-"+pad(r.n,4),t=Date.now();
    var doc={num:"PD-"+pad(r.n,4)+"/"+pad(r.ano%100,2),cliente:base.cliente||"",emp:base.emp||"MIX",modalidade:base.modalidade||modPadrao(base.cliente),
      propostaId:base.propostaId||"",propostaNum:base.propostaNum||"",itens:base.itens||[],total:base.total||0,etapa:"pedido",pedidoCliente:"",prazo:"",resp:"",nf:"",obs:"",
      criado:t,atualizado:t,cancelado:0,hist:[{at:t,txt:base.propostaNum?"Pedido criado a partir da proposta "+base.propostaNum+".":"Pedido manual criado."}]};
    return PR.db.doc("pedidos/"+id).set(doc).then(function(){PD.open=id;toast("Pedido "+doc.num+" criado.");showTab("ped")});
  }).catch(function(){toast("Não consegui criar o pedido. Tente de novo.")});
}
function pdFromProposal(pid){
  var ex=PD.list.filter(function(x){return x.propostaId===pid})[0];if(ex){PD.open=ex.id;showTab("ped");return}
  var sm=PR.list.filter(function(x){return x.id===pid})[0]||{};
  if(sm.status!=="Fechado"){toast("Conclua a proposta (Fechar rascunho) antes de gerar o pedido.");return}
  PR.db.doc("propostas_dados/"+pid).get().then(function(sn){
    var d=sn.exists?sn.data():{},its=[],tot=0,ind=0;
    (d.items||[]).forEach(function(it){var c={};try{c=calc(it)}catch(e){}var q=Math.max(1,+it.qtd||1),u=c&&c.ok?c.preco:NaN;
      if(!isFinite(u)){var pv=parse(it.preco);u=isFinite(pv)?pv:0}var de="";try{de=pdfDesc(it)}catch(e){de=it.desc||it.name||""}
      if(it.tipo==="Industrialização")ind++;
      its.push({cod:it.cod||"",desc:de,qtd:q,unit:Math.round(u*100)/100,total:Math.round(u*q*100)/100});tot+=u*q});
    var mod=its.length&&ind===its.length?"Industrialização":modPadrao(sm.cliente||d.cli);
    askDel("Cliente aprovou a proposta "+(sm.num||"")+"?","Vou criar o pedido com "+its.length+(its.length===1?" item":" itens")+" ("+brl(tot)+"), etapa Pedido recebido.",function(){
      pdCreate({cliente:sm.cliente||d.cli,emp:sm.emp==="STAR"?"STAR":"MIX",modalidade:mod,propostaId:pid,propostaNum:sm.num||"",itens:its,total:Math.round(tot*100)/100})});
  }).catch(function(){toast("Não consegui ler a proposta.")});
}

function renderMod(box,k){
  var m=MODS[k];
  if(k==="dir"){renderDir(box);return}
  var rows=flowRows().filter(function(r){return r.tipo==="ped"&&!r.canc&&m.et.indexOf(r.et)>-1}).sort(function(a,b){return(a.prazo||"9")<(b.prazo||"9")?-1:1});
  box.innerHTML='<div class="mh"><div><h2>'+esc(m.n)+'</h2><p>'+esc(m.txt)+'</p></div><span class="fase">Em construção · '+esc(m.fase)+'</span></div>'+
   '<div class="card"><h3>Pedidos nesta etapa ('+m.et.map(function(x){return ET[etIdx(x)].n}).join(" e ")+')</h3>'+
   '<div class="tbx" style="border:0">'+rowsHead()+(rows.length?rows.map(rowHtml).join(""):'<div class="mx-empty">Nenhum pedido nesta etapa agora.</div>')+'</div></div>'+
   '<div class="card"><h3>O que este módulo vai ter</h3><ul class="plan">'+m.plan.map(function(x){return'<li>'+esc(x)+'</li>'}).join("")+'</ul></div>';
}
function renderDir(box){
  var rows=flowRows(),cart=0,nCart=0,prop=0,nProp=0,orc=0,nOrc=0,emp={MIX:0,STAR:0},cnt={};
  rows.forEach(function(r){if(r.canc)return;cnt[r.et]=(cnt[r.et]||0)+1;
    if(r.tipo==="ped"&&r.et!=="concluido"){cart+=r.val;nCart++;emp[r.emp==="STAR"?"STAR":"MIX"]+=r.val}
    if(r.et==="proposta"){prop+=r.val;nProp++}if(r.et==="orcamento"){orc+=r.val;nOrc++}});
  var mx=1;ET.forEach(function(e){mx=Math.max(mx,cnt[e.k]||0)});
  box.innerHTML='<div class="mh"><div><h2>Direção</h2><p>'+esc(MODS.dir.txt)+'</p></div><span class="fase">Em construção · Fase 5</span></div>'+
   '<div class="kpis"><div class="kpi2"><span>Carteira de pedidos</span><b>'+brl(cart)+'</b><small>'+nCart+' em aberto</small></div>'+
   '<div class="kpi2"><span>Propostas em análise</span><b>'+brl(prop)+'</b><small>'+nProp+' com o cliente</small></div>'+
   '<div class="kpi2"><span>Orçamentos em elaboração</span><b>'+brl(orc)+'</b><small>'+nOrc+' rascunhos</small></div>'+
   '<div class="kpi2"><span>Carteira MIX / STAR</span><b>'+brl(emp.MIX)+'</b><small>STAR: '+brl(emp.STAR)+'</small></div></div>'+
   '<div class="card"><h3>Demandas por etapa</h3><div class="bars">'+ET.map(function(e){var n=cnt[e.k]||0;return'<div class="br"><span>'+esc(e.n)+'</span><div><i style="width:'+Math.round(n/mx*100)+'%"></i></div><b>'+n+'</b></div>'}).join("")+'</div></div>'+
   '<div class="card"><h3>Próximos indicadores</h3><ul class="plan"><li>Taxa de conversão de proposta em pedido, por cliente</li><li>Prazo prometido x entregue</li><li>Margem real por pedido e por cliente (fase 5)</li><li>Horas produtivas por máquina (depois do apontamento)</li></ul></div>';
}

function renderCad(box){
  var tabs='<div class="cadtabs" role="tablist"><button type="button" role="tab" data-ct="cli" aria-selected="'+(PD.cadTab==="cli")+'">Clientes</button><button type="button" role="tab" data-ct="emp" aria-selected="'+(PD.cadTab==="emp")+'">Empresas</button></div>';
  var head='<div class="mh"><div><h2>Cadastros</h2><p>Base comum a todos os módulos. Clientes cadastrados definem a modalidade padrão (venda ou industrialização) que o Carlos e os pedidos usam.</p></div></div>';
  if(PD.cadTab==="emp"){
    box.innerHTML=head+tabs+'<div class="empc">'+["MIX","STAR"].map(function(k){var e=empData(k);
      return'<div class="card"><img src="'+esc(e.logoPng)+'" alt="'+esc(e.nome)+'"><dl><dt>Razão social</dt><dd>'+esc(e.razao)+'</dd><dt>CNPJ</dt><dd>'+esc(e.cnpj)+'</dd><dt>I.E.</dt><dd>'+esc(e.ie)+'</dd><dt>Endereço</dt><dd>'+esc(e.end)+'</dd><dt>Telefone</dt><dd>'+esc(e.tel)+'</dd><dt>E-mail</dt><dd>'+esc(e.email)+'</dd><dt>Prefixo</dt><dd>'+esc(e.prefix)+' (numeração das propostas)</dd></dl></div>'}).join("")+'</div><p class="hint">Estes dados saem no PDF da proposta. Para alterar, use Controladoria › Parâmetros de custo.</p>';
    return}
  var seen={},nc=[];
  (PR.list||[]).concat(IB.docs||[]).forEach(function(d){var n=String(d.cliente||"").trim();if(!n)return;var k=normTxt(n);if(seen[k]||cliRec(n))return;seen[k]=1;nc.push(n)});
  nc.sort();
  box.innerHTML=head+tabs+'<div class="mx-bar"><span class="hint">'+PD.cli.length+' cadastrados'+(nc.length?' · '+nc.length+' clientes das propostas ainda sem cadastro':'')+'</span><span class="sp"></span><button class="btn sm pri" type="button" data-x="cnovo">+ Novo cliente</button></div>'+
   '<div class="tbx"><div class="cr2 fh"><span>Cliente</span><span>CNPJ</span><span>Modalidade</span><span>Contato</span><span></span></div>'+
   PD.cli.map(function(c){return'<div class="cr2"><span><b>'+esc(c.nome)+'</b></span><span class="mono">'+esc(c.cnpj||"–")+'</span><span>'+esc(c.modalidade||"Venda")+'</span><span>'+esc([c.contato,c.email,c.tel].filter(Boolean).join(" · ")||"–")+'</span><span class="ra2">'+ibtn("edit","Editar",'data-ce="'+esc(c.id)+'"')+ibtn("trash","Excluir",'data-cd="'+esc(c.id)+'"',"danger")+'</span></div>'}).join("")+
   nc.map(function(n){return'<div class="cr2 nc"><span>'+esc(n)+'</span><span>sem cadastro</span><span>'+esc(modPadrao(n))+' (suposta)</span><span></span><span class="ra2"><button class="btn sm" type="button" data-cn="'+esc(n)+'">Cadastrar</button></span></div>'}).join("")+
   (!PD.cli.length&&!nc.length?'<div class="mx-empty">Nenhum cliente ainda.</div>':'')+'</div>';
}
function cliForm(c){
  c=c||{};var m=$("mx-modal");
  m.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-label="Cliente"><h3>'+(c.id?"Editar cliente":"Novo cliente")+'</h3><div class="fgrid">'+
   '<label class="f" style="grid-column:1/-1"><span class="lb">Nome (como aparece nas propostas)</span><input id="cf-nome" value="'+esc(c.nome||"")+'"></label>'+
   '<label class="f"><span class="lb">CNPJ</span><input id="cf-cnpj" value="'+esc(c.cnpj||"")+'"></label>'+
   '<label class="f"><span class="lb">Modalidade padrão</span><select id="cf-mod">'+["Venda","Industrialização","Mista (marcar por item)"].map(function(x){return'<option'+((c.modalidade||modPadrao(c.nome))===x?" selected":"")+'>'+x+'</option>'}).join("")+'</select></label>'+
   '<label class="f"><span class="lb">Contato</span><input id="cf-contato" value="'+esc(c.contato||"")+'"></label>'+
   '<label class="f"><span class="lb">E-mail</span><input id="cf-email" type="email" value="'+esc(c.email||"")+'"></label>'+
   '<label class="f"><span class="lb">Telefone</span><input id="cf-tel" value="'+esc(c.tel||"")+'"></label>'+
   '<label class="f"><span class="lb">Pagamento padrão</span><input id="cf-pag" value="'+esc(c.pagamento||"28 DDL")+'"></label>'+
   '<label class="f" style="grid-column:1/-1"><span class="lb">Observações</span><textarea id="cf-obs" rows="2">'+esc(c.obs||"")+'</textarea></label></div>'+
   '<div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-x="cfx">Cancelar</button><button class="btn pri" type="button" data-x="cfok" data-id="'+esc(c.id||"")+'">Salvar</button></div></div>';
  m.hidden=false;setTimeout(function(){$("cf-nome").focus()},30);
}
function cliSave(id){
  var nome=$("cf-nome").value.trim();if(!nome){toast("Informe o nome do cliente.");return}
  var dup=cliRec(nome);if(dup&&dup.id!==id){toast("Já existe um cliente com esse nome.");return}
  var doc={nome:nome,cnpj:$("cf-cnpj").value.trim(),modalidade:$("cf-mod").value,contato:$("cf-contato").value.trim(),email:$("cf-email").value.trim(),tel:$("cf-tel").value.trim(),pagamento:$("cf-pag").value.trim(),obs:$("cf-obs").value.trim(),atualizado:Date.now()};
  var key=id||("c-"+normTxt(nome).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+rid().slice(0,4));
  if(!PR.db){toast("Banco indisponível.");return}
  PR.db.doc("clientes/"+key).set(doc).then(function(){$("mx-modal").hidden=true;toast("Cliente salvo.")}).catch(function(){toast("Não consegui salvar o cliente.")});
}

function mxRender(){
  var t=S.tab,box=$("mx-box");if(!box)return;
  if(t==="ped")renderPed(box);else if(t==="cad")renderCad(box);else if(String(t).indexOf("m-")===0)renderMod(box,t.slice(2));
}
var MX_TABS=["ped","cad"];Object.keys(MODS).forEach(function(k){if(MODS[k].et||k==="dir")MX_TABS.push("m-"+k)});
var _st2=showTab;showTab=function(t){
  var mine=MX_TABS.indexOf(t)>-1;
  $("v-mx").hidden=!mine;
  Array.prototype.forEach.call(document.querySelectorAll(".mod[data-m]"),function(b){var k=b.dataset.m,on=(k==="ped"&&t==="ped")||(k==="cad"&&t==="cad")||("m-"+k===t);if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  if(!mine){if(S.tab!==t&&MX_TABS.indexOf(S.tab)>-1)PD.open="";return _st2.apply(this,arguments)}
  if(S.tab!==t)PD.open=PD.open&&t==="ped"?PD.open:"";
  S.tab=t;document.body.dataset.tab=t;document.body.dataset.sub=t;
  ["cap","ini","par"].forEach(function(k){$("v-"+k).hidden=true});$("v-pc").hidden=true;$("closebox").hidden=true;
  try{BR.stop()}catch(e){}
  ["t-ini","t-pc","t-par"].forEach(function(id){var b=$(id);if(b)b.setAttribute("aria-selected","false")});
  var hb=document.querySelector(".mod[data-cap]");if(hb)hb.removeAttribute("aria-current");
  var nm=t==="ped"?"Pedidos":t==="cad"?"Cadastros":MODS[t.slice(2)].n;
  $("crumb").innerHTML=(t==="ped"?"Fluxo › ":t==="cad"?"Sistema › ":"Módulos › ")+"<b>"+esc(nm)+"</b>";$("crumb-t").textContent=nm;
  pdSubscribe();mxRender();try{save()}catch(e){}
};
document.querySelector(".mods").addEventListener("click",function(e){
  var b=e.target.closest(".mod[data-m]");if(!b)return;var k=b.dataset.m;
  if(k==="ped"){PD.open="";showTab("ped")}else if(k==="cad")showTab("cad");else showTab("m-"+k);
});
$("v-mx").addEventListener("click",function(e){
  var st=e.target.closest("[data-st]");if(st){PD.stage=PD.stage===st.dataset.st?"":st.dataset.st;mxRender();return}
  var ct=e.target.closest("[data-ct]");if(ct){PD.cadTab=ct.dataset.ct;mxRender();return}
  var ce=e.target.closest("[data-ce]");if(ce){cliForm(PD.cli.filter(function(c){return c.id===ce.dataset.ce})[0]);return}
  var cn=e.target.closest("[data-cn]");if(cn){cliForm({nome:cn.dataset.cn});return}
  var cd=e.target.closest("[data-cd]");if(cd){var c=PD.cli.filter(function(x){return x.id===cd.dataset.cd})[0]||{};askDel("Excluir o cliente "+(c.nome||"")+"?","O cadastro sai da lista. Propostas e pedidos desse cliente não são apagados.",function(){PR.db.doc("clientes/"+cd.dataset.cd).delete().then(function(){toast("Cliente excluído.")}).catch(function(){toast("Não consegui excluir.")})});return}
  var x=e.target.closest("[data-x]");
  if(x){var a=x.dataset.x,p=PD.list.filter(function(y){return y.id===PD.open})[0];
    if(a==="limpa"){PD.stage="";mxRender()}
    else if(a==="voltar"){PD.open="";mxRender()}
    else if(a==="novo")pmForm();
    else if(a==="cnovo")cliForm({});
    else if(p&&a==="avanca"){var i=etIdx(p.etapa),n=ET[i+1];if(n)pdSet(p,{etapa:n.k},"Etapa: "+ET[i].n+" → "+n.n+".")}
    else if(p&&a==="cancela")askDel("Cancelar o pedido "+(p.num||"")+"?","O pedido sai da carteira e fica no histórico como cancelado. Dá para reativar depois.",function(){pdSet(p,{cancelado:Date.now()},"Pedido cancelado.")});
    else if(p&&a==="reativar")pdSet(p,{cancelado:0},"Pedido reativado.");
    return}
  var r=e.target.closest("[data-ft]");
  if(r){var id=r.dataset.fid;
    if(r.dataset.ft==="ped"){PD.open=id;mxRender();try{$("v-mx").scrollIntoView({block:"start"})}catch(er){}}
    else if(r.dataset.ft==="prop"){var sm=PR.list.filter(function(y){return y.id===id})[0]||{};if(sm.status==="Fechado"&&!e.shiftKey){pdAsk(id)}else pOpen(id)}
    else showTab("in")}
});
function pdAsk(id){
  var m=$("mx-modal"),sm=PR.list.filter(function(y){return y.id===id})[0]||{};
  m.innerHTML='<div class="card" role="dialog" aria-modal="true"><h3>Proposta '+esc(sm.num||"")+' · '+esc(sm.cliente||"")+'</h3><p class="hint">Proposta em análise com o cliente ('+brl(sm.total||0)+').</p><div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-y="x">Fechar</button><button class="btn" type="button" data-y="abrir">Abrir proposta</button><button class="btn pri" type="button" data-y="ped">Cliente aprovou: gerar pedido</button></div></div>';
  m.hidden=false;m.dataset.pid=id;
}
$("mx-modal").addEventListener("click",function(e){
  var m=$("mx-modal");if(e.target===m){m.hidden=true;return}
  var x=e.target.closest("[data-x]");if(x&&x.dataset.x==="cfx"){m.hidden=true;return}if(x&&x.dataset.x==="cfok"){cliSave(x.dataset.id);return}
  if(x&&x.dataset.x==="pmok"){var cl=$("pm-cli").value.trim();if(!cl){toast("Informe o cliente.");return}m.hidden=true;pdCreate({cliente:cl,emp:$("pm-emp").value,modalidade:$("pm-mod").value});return}
  var y=e.target.closest("[data-y]");if(!y)return;var id=m.dataset.pid;m.hidden=true;
  if(y.dataset.y==="abrir")pOpen(id);else if(y.dataset.y==="ped")pdFromProposal(id);
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("mx-modal").hidden)$("mx-modal").hidden=true});
var _dtT=null;
$("v-mx").addEventListener("change",function(e){
  var p=PD.list.filter(function(y){return y.id===PD.open})[0];
  if(e.target.id==="mx-emp"){PD.emp=e.target.value;mxRender();return}
  if(e.target.id==="mx-enc"){PD.enc=e.target.checked;mxRender();return}
  if(!p)return;
  if(e.target.id==="dt-move"&&e.target.value){var to=e.target.value,fr=ET[etIdx(p.etapa)];pdSet(p,{etapa:to},"Etapa: "+(fr?fr.n:"?")+" → "+ET[etIdx(to)].n+" (movido manualmente).");return}
  var f=e.target.dataset.f;if(f){var v=e.target.value,o={};o[f]=v;var lb={pedidoCliente:"Pedido do cliente",prazo:"Prazo",modalidade:"Modalidade",emp:"Empresa",resp:"Responsável",nf:"NF",obs:"Observações"}[f];
    pdSet(p,o,(f==="obs")?"Observações atualizadas.":lb+": "+(f==="prazo"?dStr(v):v||"(vazio)")+".")}
});
$("v-mx").addEventListener("input",function(e){if(e.target.id==="mx-q"){PD.q=e.target.value;clearTimeout(_dtT);_dtT=setTimeout(function(){var pos=e.target.selectionStart;mxRender();var q=$("mx-q");if(q){q.focus();try{q.setSelectionRange(pos,pos)}catch(er){}}},250)}});
/* botão "Gerar pedido" na lista de propostas */
var _pR=pRender;pRender=function(){_pR.apply(this,arguments);mxRefresh();
  Array.prototype.forEach.call(document.querySelectorAll("#pf-list [data-rid]"),function(row){var id=row.dataset.rid,sm=PR.list.filter(function(x){return x.id===id})[0];if(!sm||sm.status!=="Fechado")return;
    var a=row.querySelector(".pl-a");if(!a||a.querySelector("[data-gp]"))return;var ex=PD.list.filter(function(x){return x.propostaId===id})[0];
    var b=document.createElement("button");b.type="button";b.className="btn sm";b.dataset.gp=id;b.textContent=ex?ex.num:"Gerar pedido";b.title=ex?"Abrir o pedido":"Cliente aprovou: gerar pedido";a.insertBefore(b,a.firstChild)})};
$("pf-list").addEventListener("click",function(e){var b=e.target.closest("[data-gp]");if(!b)return;e.stopPropagation();pdFromProposal(b.dataset.gp)},true);
var _ibR=ibRender;ibRender=function(){var r=_ibR.apply(this,arguments);mxRefresh();return r};
function pmForm(){
  var m=$("mx-modal"),names={};PD.cli.forEach(function(c){names[c.nome]=1});(PR.list||[]).forEach(function(d){if(d.cliente)names[d.cliente]=1});
  m.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-label="Pedido manual"><h3>Pedido manual</h3><p class="hint">Use quando o pedido chegou sem proposta no MISTA. Os itens podem ser lançados depois, quando o módulo de pedidos ganhar edição de itens.</p><div class="fgrid">'+
   '<label class="f" style="grid-column:1/-1"><span class="lb">Cliente</span><input id="pm-cli" list="pm-dl" autocomplete="off"><datalist id="pm-dl">'+Object.keys(names).sort().map(function(n){return'<option value="'+esc(n)+'">'}).join("")+'</datalist></label>'+
   '<label class="f"><span class="lb">Empresa que executa</span><select id="pm-emp"><option'+(empKey()==="MIX"?" selected":"")+'>MIX</option><option'+(empKey()==="STAR"?" selected":"")+'>STAR</option></select></label>'+
   '<label class="f"><span class="lb">Modalidade</span><select id="pm-mod"><option>Venda</option><option>Industrialização</option></select></label></div>'+
   '<div class="acts2" style="justify-content:flex-end"><button class="btn" type="button" data-x="cfx">Cancelar</button><button class="btn pri" type="button" data-x="pmok">Criar pedido</button></div></div>';
  m.hidden=false;var ci=$("pm-cli");ci.addEventListener("change",function(){$("pm-mod").value=modPadrao(ci.value)==="Industrialização"?"Industrialização":"Venda"});setTimeout(function(){ci.focus()},30);
}
