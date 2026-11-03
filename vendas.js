
/* ===== v96: Vendas › aprovar proposta → Pedido interno; Engenharia › Cadastro de itens (com dados fiscais) =====
   Etapa 1 do ERP (gestor, 03/11/2026). Etapas seguintes: roteiro e estrutura → PCP/OP → MRP/compras → estoque e Bloco K. */
var FX_ORIG=[["0","0 - Nacional"],["1","1 - Estrangeira, importação direta"],["2","2 - Estrangeira, adquirida no mercado interno"],["3","3 - Nacional, conteúdo de importação > 40% e ≤ 70%"],["4","4 - Nacional, processos produtivos básicos"],["5","5 - Nacional, conteúdo de importação ≤ 40%"],["6","6 - Estrangeira, importação direta, sem similar (CAMEX)"],["7","7 - Estrangeira, mercado interno, sem similar (CAMEX)"],["8","8 - Nacional, conteúdo de importação > 70%"]];
var FX_CSOSN=[["101","101 - Tributada com permissão de crédito"],["102","102 - Tributada sem permissão de crédito"],["103","103 - Isenção do ICMS para faixa de receita bruta"],["201","201 - Com permissão de crédito e com ST"],["202","202 - Sem permissão de crédito e com ST"],["203","203 - Isenção para faixa de receita bruta e com ST"],["300","300 - Imune"],["400","400 - Não tributada"],["500","500 - ICMS cobrado anteriormente por ST ou antecipação"],["900","900 - Outros"]];
var FX_CFOP=[["5101","5101 - Venda de produção do estabelecimento (SP)"],["6101","6101 - Venda de produção do estabelecimento (fora de SP)"],["5124","5124 - Industrialização efetuada para outra empresa (SP)"],["6124","6124 - Industrialização efetuada para outra empresa (fora de SP)"],["5902","5902 - Retorno de mercadoria usada na industrialização por encomenda (SP)"],["6902","6902 - Retorno de mercadoria usada na industrialização por encomenda (fora de SP)"],["5102","5102 - Venda de mercadoria adquirida de terceiros (SP)"],["6102","6102 - Venda de mercadoria adquirida de terceiros (fora de SP)"],["5949","5949 - Outra saída não especificada (SP)"],["6949","6949 - Outra saída não especificada (fora de SP)"]];
var FX_IPI=[["50","50 - Saída tributada"],["51","51 - Saída tributável com alíquota zero"],["52","52 - Saída isenta"],["53","53 - Saída não tributada"],["99","99 - Outras saídas"]];
var FX_PIS=[["49","49 - Outras operações de saída"],["99","99 - Outras operações"],["01","01 - Operação tributável (alíquota básica)"],["07","07 - Operação isenta"],["08","08 - Operação sem incidência"]];
var FX_TIPO=[["04","04 - Produto acabado"],["03","03 - Produto em processo"],["01","01 - Matéria-prima"],["06","06 - Produto intermediário"],["00","00 - Mercadoria para revenda"],["07","07 - Material de uso e consumo"],["09","09 - Serviços"],["10","10 - Outros insumos"],["99","99 - Outras"]];
var FX_UN=["PC","UN","CJ","KG","M","JG"];
var IT={list:[],sub:false,open:"",q:"",so:"",ed:null,edId:"",pad:{},sug:{}};
IDP.itens="IT";
function itSub(){
  if(IT.sub||!PR.db)return;IT.sub=true;
  PR.db.collection("itens").onSnapshot(function(sn){
    IT.list=sn.docs.map(function(x){var o=x.data()||{},c={};for(var k in o)c[k]=o[k];c.id=x.id;return c}).sort(function(a,b){return(b.idSeq||0)-(a.idSeq||0)});
    if(S.tab==="m-itens"&&!(IT.ed&&IT.ed.dirty))mxRender();else if(S.tab==="ped")mxRefresh();
  },function(){});
  ["MIX","STAR"].forEach(function(k){PR.db.doc("config/fiscal-"+k).get().then(function(s){IT.pad[k]=s&&s.exists?s.data()||{}:{}}).catch(function(){IT.pad[k]={}})});
}
(function wit(){if(typeof PR!=="undefined"&&PR&&PR.db){itSub();return}setTimeout(wit,700)})();
function itKey(cli,cod){return normTxt(cli)+"|"+normTxt(cod)}
function itFind(cli,cod){var k=itKey(cli,cod);return IT.list.filter(function(x){return itKey(x.cliente,x.codigo)===k})[0]||null}
function itById(id){return IT.list.filter(function(x){return x.id===id})[0]||null}
function itNcmOk(n){return/^\d{4}\.?\d{2}\.?\d{2}$/.test(String(n||"").trim())}
function itNcmFmt(n){var d=dig(n);return d.length===8?d.slice(0,4)+"."+d.slice(4,6)+"."+d.slice(6):String(n||"").trim()}
function itFalta(it){var f=it.fiscal||{},m=[];if(!itNcmOk(f.ncm))m.push("NCM");if(!f.origem)m.push("origem");if(!f.cfopDentro&&!f.cfopFora)m.push("CFOP");if(!f.csosn)m.push("CSOSN");if(!it.unidade)m.push("unidade");return m}
function itPill(it){if(!it)return'<span class="stp n">sem cadastro</span>';var m=itFalta(it);return m.length?'<span class="stp w" title="Falta: '+esc(m.join(", "))+'">Fiscal incompleto</span>':'<span class="stp g">Fiscal ok</span>'}
function itCfopPad(mod){return mod==="Industrialização"?{cfopDentro:"5124",cfopFora:"6124",cfopRetDentro:"5902",cfopRetFora:"6902"}:{cfopDentro:"5101",cfopFora:"6101",cfopRetDentro:"",cfopRetFora:""}}
/* cria (ou acha) o cadastro do item a partir de um item de proposta/pedido; devolve o id */
function itEnsure(x,cli,emp,mod,origem){
  var ex=itFind(cli,x.cod);if(ex)return Promise.resolve(ex.id);
  var pad=IT.pad[emp]||{},t=Date.now(),id="it-"+t.toString(36)+"-"+rid().slice(0,4);
  var f={ncm:"",cest:"",origem:"0",csosn:pad.csosn||"",cstIpi:pad.cstIpi||"",aliqIpi:"",cstPis:pad.cstPis||"",cstCofins:pad.cstCofins||""},cf=itCfopPad(mod);for(var k in cf)f[k]=cf[k];
  var doc={codigo:String(x.cod||"").trim(),cliente:cli||"",descricao:x.nome||x.desc||"",desenho:x.dwg||"",rev:x.rev||"",material:x.mat||"",unidade:"PC",emp:emp||"MIX",modalidade:mod||"Venda",tipoSped:"04",pesoKg:"",
    fiscal:f,origem:origem||"",criado:t,atualizado:t,hist:[{at:t,uid:AG.uid||"",txt:"Item cadastrado automaticamente"+(origem?" ("+origem+")":"")+"."}]};
  return cnNextId("itens").then(function(n){doc.idSeq=n;return PR.db.doc("itens/"+id).set(doc)}).then(function(){IT.list.push((doc.id=id,doc));return id});
}

/* ---------- aprovar proposta → pedido interno ---------- */
function pdAprovar(pid){
  var ex=PD.list.filter(function(x){return x.propostaId===pid&&!x.cancelado})[0];if(ex){PD.open=ex.id;showTab("ped");return}
  var sm=PR.list.filter(function(x){return x.id===pid})[0]||{};
  if(sm.status!=="Fechado"){toast("Conclua a proposta (Fechar rascunho) antes de aprovar.");return}
  PR.db.doc("propostas_dados/"+pid).get().then(function(sn){
    var d=sn.exists?sn.data():{},its=[],ind=0,cli=sm.cliente||d.cli||"";
    (d.items||[]).forEach(function(it){var c={};try{c=calc(it)}catch(e){}var q=Math.max(1,+parse(it.qtd)||1),u=c&&c.ok?c.preco:NaN;
      if(!isFinite(u)){var pv=parse(it.preco);u=isFinite(pv)?pv:0}var de="";try{de=pdfDesc(it)}catch(e){}if(!de)de=[it.name,it.dwg?"DES.:"+it.dwg:""].filter(Boolean).join(" - ")||it.desc||"";
      var mat=it.matTxt||"";try{if(!mat&&S.P&&S.P.mat&&S.P.mat[it.mat])mat=S.P.mat[it.mat].n}catch(e){}
      if(it.tipo==="Industrialização")ind++;
      var ent=it.entTxt?toDay(it.entTxt):NaN;
      its.push({ok:true,cod:it.cod||"",desc:de,nome:it.name||it.desc||"",dwg:dwgKey(it.dwg)||it.dwg||"",rev:it.revReq||"",mat:mat,ordem:it.ordem||"",qtd:q,unit:Math.round(u*100)/100,ent:isFinite(ent)?new Date(ent).toISOString().slice(0,10):""})});
    if(!its.length){toast("A proposta não tem itens.");return}
    var mod=ind===its.length?"Industrialização":modPadrao(cli),pz=new Date(Date.now()+15*86400000).toISOString().slice(0,10);
    IT.ap={pid:pid,sm:sm,cli:cli,its:its,mod:mod,emp:sm.emp==="STAR"?"STAR":"MIX",oc:"",prazo:pz};
    pdApHtml();
  }).catch(function(){toast("Não consegui ler a proposta.")});
}
function pdApTot(){var t=0,n=0;IT.ap.its.forEach(function(x){if(x.ok){t+=x.qtd*x.unit;n++}});return{t:t,n:n}}
function pdApHtml(){
  var a=IT.ap,m=$("mx-modal"),tt=pdApTot();
  m.innerHTML='<div class="card pd-ap" role="dialog" aria-modal="true" aria-label="Aprovar proposta"><h3>Cliente aprovou a proposta '+esc(a.sm.num||"")+'</h3><p class="hint">'+esc(a.cli)+'. Marque os itens que o cliente aprovou (pode ser só uma parte), confira quantidades e entregas. O pedido interno nasce na etapa Pedido recebido e cada item ganha cadastro com dados fiscais.</p>'+
   '<div class="fgrid"><label class="f"><span class="lb">Pedido do cliente (nº da OC)</span><input id="ap-oc" value="'+esc(a.oc)+'" placeholder="ex.: OC 45821"></label>'+
   '<label class="f"><span class="lb">Entrega padrão</span><input type="date" id="ap-prazo" value="'+esc(a.prazo)+'"></label>'+
   '<label class="f"><span class="lb">Empresa que executa</span><select id="ap-emp"><option'+(a.emp==="MIX"?" selected":"")+'>MIX</option><option'+(a.emp==="STAR"?" selected":"")+'>STAR</option></select></label>'+
   '<label class="f"><span class="lb">Modalidade</span><select id="ap-mod"><option'+(a.mod!=="Industrialização"?" selected":"")+'>Venda</option><option'+(a.mod==="Industrialização"?" selected":"")+'>Industrialização</option></select></label></div>'+
   '<div class="tbx" style="max-height:46vh;overflow:auto"><table class="itb"><thead><tr><th><input type="checkbox" id="ap-all"'+(a.its.every(function(x){return x.ok})?" checked":"")+' aria-label="Marcar todos"></th><th>Código</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th><th>Entrega</th><th>Cadastro</th></tr></thead><tbody>'+
   a.its.map(function(x,i){var c=itFind(a.cli,x.cod);return'<tr'+(x.ok?'':' class="off"')+'><td><input type="checkbox" data-ap="ok" data-i="'+i+'"'+(x.ok?" checked":"")+' aria-label="Aprovado"></td><td class="mono">'+esc(x.cod||"–")+'</td><td class="pd-desc">'+esc(x.desc)+'</td><td class="r"><input data-ap="qtd" data-i="'+i+'" value="'+esc(x.qtd)+'" inputmode="numeric" style="width:64px;text-align:right"></td><td class="r">'+brl(x.unit)+'</td><td class="r" data-apt="'+i+'">'+brl(x.qtd*x.unit)+'</td><td><input type="date" data-ap="ent" data-i="'+i+'" value="'+esc(x.ent||"")+'"></td><td>'+(c?'<span class="idtag">'+esc(cnIdTxt("itens",c))+'</span>':'<span class="hint">novo</span>')+'</td></tr>'}).join("")+
   '</tbody></table></div><div class="acts2" style="justify-content:flex-end;align-items:center"><span class="hint" id="ap-tot">'+tt.n+' de '+a.its.length+' itens · '+brl(tt.t)+'</span><span class="sp" style="flex:1"></span><button class="btn" type="button" data-ap2="n">Cancelar</button><button class="btn pri" type="button" data-ap2="y"'+(tt.n?'':' disabled')+'>Gerar pedido interno</button></div></div>';
  m.hidden=false;
}
function pdApSync(){var a=IT.ap;if(!a)return;var tt=pdApTot(),el=$("ap-tot");if(el)el.textContent=tt.n+" de "+a.its.length+" itens · "+brl(tt.t);var b=document.querySelector('[data-ap2="y"]');if(b)b.disabled=!tt.n}
$("mx-modal").addEventListener("input",function(e){var a=IT.ap;if(!a)return;var t=e.target;
  if(t.id==="ap-oc")a.oc=t.value;else if(t.id==="ap-prazo"){var old=a.prazo;a.prazo=t.value;a.its.forEach(function(x,i){if(!x.ent||x.ent===old){x.ent="";var el=document.querySelector('[data-ap="ent"][data-i="'+i+'"]');if(el)el.value=""}})}
  else if(t.dataset.ap==="qtd"){var x=a.its[+t.dataset.i];x.qtd=Math.max(0,+parse(t.value)||0);var c=document.querySelector('[data-apt="'+t.dataset.i+'"]');if(c)c.textContent=brl(x.qtd*x.unit);pdApSync()}
  else if(t.dataset.ap==="ent")a.its[+t.dataset.i].ent=t.value;},true);
$("mx-modal").addEventListener("change",function(e){var a=IT.ap;if(!a)return;var t=e.target;
  if(t.id==="ap-emp")a.emp=t.value;else if(t.id==="ap-mod")a.mod=t.value;
  else if(t.id==="ap-all"){a.its.forEach(function(x){x.ok=t.checked});pdApHtml()}
  else if(t.dataset.ap==="ok"){a.its[+t.dataset.i].ok=t.checked;var tr=t.closest("tr");if(tr)tr.classList.toggle("off",!t.checked);pdApSync()}},true);
$("mx-modal").addEventListener("click",function(e){var a=IT.ap;if(!a)return;var b=e.target.closest("[data-ap2]");var m=$("mx-modal");
  if(e.target===m||(b&&b.dataset.ap2==="n")){e.stopImmediatePropagation();m.hidden=true;IT.ap=null;return}
  if(!b)return;e.stopImmediatePropagation();
  var sel=a.its.filter(function(x){return x.ok&&x.qtd>0});if(!sel.length){toast("Marque pelo menos um item.");return}
  b.disabled=true;b.textContent="Gerando…";
  var ids=[],pr=Promise.resolve(),org="proposta "+(a.sm.num||"");
  sel.forEach(function(x){pr=pr.then(function(){return itEnsure(x,a.cli,a.emp,a.mod,org).then(function(id){ids.push(id)}).catch(function(){ids.push("")})})});
  pr.then(function(){
    var tot=0,its=sel.map(function(x,i){var ent=x.ent||a.prazo;tot+=x.qtd*x.unit;return{cod:x.cod,desc:x.desc,qtd:x.qtd,unit:x.unit,total:Math.round(x.qtd*x.unit*100)/100,entrega:ent,itemId:ids[i]||"",ordem:x.ordem||"",situacao:"aguardando OP"}});
    var prazo=its.reduce(function(m2,x){return x.entrega>m2?x.entrega:m2},"");
    m.hidden=true;var ap=IT.ap;IT.ap=null;
    return pdCreate({cliente:ap.cli,emp:ap.emp,modalidade:ap.mod,propostaId:ap.pid,propostaNum:ap.sm.num||"",itens:its,total:Math.round(tot*100)/100,pedidoCliente:ap.oc,prazo:prazo,
      histTxt:"Pedido interno criado a partir da proposta "+(ap.sm.num||"")+": "+its.length+" de "+ap.its.length+" itens aprovados"+(ap.oc?", pedido do cliente "+ap.oc:"")+"."});
  }).catch(function(){b.disabled=false;b.textContent="Gerar pedido interno";toast("Não consegui gerar o pedido. Tente de novo.")});
},true);
/* o botão "Gerar pedido" da lista de propostas e o modal antigo passam a usar a aprovação nova */
pdFromProposal=pdAprovar;
var _pdCreateOld=pdCreate;
pdCreate=function(base){
  if(!PR.db){toast("Banco indisponível.");return}
  return pdNext().then(function(r){
    var id="pd-"+pad(r.ano%100,2)+"-"+pad(r.n,4),t=Date.now();
    var doc={num:"PD-"+pad(r.n,4)+"/"+pad(r.ano%100,2),cliente:base.cliente||"",emp:base.emp||"MIX",modalidade:base.modalidade||modPadrao(base.cliente),
      propostaId:base.propostaId||"",propostaNum:base.propostaNum||"",itens:base.itens||[],total:base.total||0,etapa:"pedido",pedidoCliente:base.pedidoCliente||"",prazo:base.prazo||"",resp:"",nf:"",obs:"",
      criado:t,atualizado:t,cancelado:0,hist:[{at:t,uid:AG.uid||"",txt:base.histTxt||(base.propostaNum?"Pedido interno criado a partir da proposta "+base.propostaNum+".":"Pedido interno manual criado.")}]};
    PD.pend=id;PD.open=id;return PR.db.doc("pedidos/"+id).set(doc).then(function(){PD.open=id;toast("Pedido interno "+doc.num+" criado.");showTab("ped")});
  }).catch(function(){toast("Não consegui criar o pedido. Tente de novo.")});
};

/* ---------- pedido interno: títulos e itens com entrega e cadastro ---------- */
var _rpV=renderPed;renderPed=function(box){
  _rpV.apply(this,arguments);
  var h=box.querySelector(".mh h2");if(h&&h.textContent==="Pedidos")h.textContent="Pedidos internos";
  var bk=box.querySelector('[data-x="voltar"]');if(bk)bk.textContent="‹ Pedidos internos";
  if(!PD.open)return;var p=PD.list.filter(function(x){return x.id===PD.open})[0];if(!p)return;
  var its=p.itens||[];if(!its.length)return;
  var tb=null;Array.prototype.forEach.call(box.querySelectorAll(".card h3"),function(x){if(x.textContent==="Itens")tb=x.parentNode});if(!tb)return;
  var tot=0;its.forEach(function(x){tot+=+x.total||0});
  var falta=its.filter(function(x){var c=itById(x.itemId)||itFind(p.cliente,x.cod);return!c||itFalta(c).length}).length;
  tb.innerHTML='<div class="mx-bar"><h3 style="margin:0">Itens</h3><span class="sp"></span>'+(falta?'<span class="stp w">'+falta+(falta===1?" item com fiscal incompleto":" itens com fiscal incompleto")+'</span>':'<span class="stp g">Dados fiscais completos</span>')+'</div>'+
   '<div style="overflow:auto"><table class="itb"><thead><tr><th>Código</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Total</th><th>Entrega</th><th>Cadastro do item</th><th>Situação</th></tr></thead><tbody>'+
   its.map(function(x,i){var c=itById(x.itemId)||itFind(p.cliente,x.cod);return'<tr><td class="mono">'+esc(x.cod||"")+'</td><td class="pd-desc">'+esc(x.desc||"")+'</td><td class="r">'+esc(x.qtd)+'</td><td class="r">'+(x.unit?brl(+x.unit):"–")+'</td><td class="r">'+(x.total?brl(+x.total):"–")+'</td>'+
     '<td><input type="date" data-pdi="'+i+'" value="'+esc(x.entrega||"")+'" aria-label="Entrega do item"></td>'+
     '<td>'+(c?'<button type="button" class="btn sm" data-x="itopen" data-it="'+esc(c.id)+'">'+esc(cnIdTxt("itens",c))+'</button> '+itPill(c):'<button type="button" class="btn sm" data-x="itcriar" data-i="'+i+'">Cadastrar item</button>')+'</td>'+
     '<td><span class="hint">'+esc(x.situacao||"aguardando OP")+'</span></td></tr>'}).join("")+
   '</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">'+brl(tot)+'</td><td colspan="3"></td></tr></tfoot></table></div><p class="hint">A situação de cada item muda quando o PCP abrir a ordem de produção (próxima etapa).</p>';
};
$("v-mx").addEventListener("click",function(e){
  if(S.tab!=="ped")return;var b=e.target.closest('[data-x="itopen"],[data-x="itcriar"]');if(!b)return;e.stopPropagation();e.preventDefault();
  if(b.dataset.x==="itopen"){IT.open=b.dataset.it;IT.ed=null;IT.edId="";showTab("m-itens");return}
  var p=PD.list.filter(function(x){return x.id===PD.open})[0];if(!p)return;var i=+b.dataset.i,x=(p.itens||[])[i];if(!x)return;
  b.disabled=true;itEnsure({cod:x.cod,desc:x.desc},p.cliente,p.emp,p.modalidade,"pedido "+p.num).then(function(id){var its=JSON.parse(JSON.stringify(p.itens));its[i].itemId=id;return pdSet(p,{itens:its},"Item "+(x.cod||i+1)+" cadastrado.")}).catch(function(){toast("Não consegui cadastrar o item.")});
},true);
$("v-mx").addEventListener("change",function(e){
  if(S.tab!=="ped"||!e.target.dataset||e.target.dataset.pdi==null)return;e.stopPropagation();
  var p=PD.list.filter(function(x){return x.id===PD.open})[0];if(!p)return;var i=+e.target.dataset.pdi,its=JSON.parse(JSON.stringify(p.itens||[]));if(!its[i])return;
  var v=e.target.value,old=its[i].entrega||"";its[i].entrega=v;var pz=its.reduce(function(m2,x){return(x.entrega||"")>m2?x.entrega:m2},"");
  pdSet(p,{itens:its,prazo:pz||p.prazo||""},"Entrega do item "+(its[i].cod||i+1)+": "+(old?dStr(old):"–")+" → "+(v?dStr(v):"–")+".");
},true);

/* ---------- Engenharia › Cadastro de itens ---------- */
function itListHtml(){
  var q=normTxt(IT.q),L=IT.list.filter(function(x){if(IT.so==="falta"&&!itFalta(x).length)return false;return!q||normTxt([x.codigo,x.cliente,x.descricao,x.desenho,x.fiscal&&x.fiscal.ncm,cnIdTxt("itens",x)].join(" ")).indexOf(q)>-1});
  var nf=IT.list.filter(function(x){return itFalta(x).length}).length;
  return'<div class="mx-bar"><input type="search" id="it-q" placeholder="Buscar código, cliente, descrição, NCM…" value="'+esc(IT.q)+'"><label class="mx-chk"><input type="checkbox" id="it-so"'+(IT.so==="falta"?" checked":"")+'> Só fiscal incompleto ('+nf+')</label><span class="sp"></span><span class="hint">'+IT.list.length+(IT.list.length===1?" item":" itens")+'</span><button class="btn sm pri" type="button" data-it="novo">+ Novo item</button></div>'+
   '<div class="tbx"><div class="it-r fh"><span>ID</span><span>Código · descrição</span><span>Cliente</span><span>Desenho</span><span>NCM</span><span>Fiscal</span></div>'+
   (L.length?L.map(function(x){var f=x.fiscal||{};return'<div class="it-r" data-it="open" data-id="'+esc(x.id)+'" title="Abrir"><span class="idtag">'+esc(cnIdTxt("itens",x))+'</span><span><b>'+esc(x.codigo||"(sem código)")+'</b><small>'+esc(x.descricao||"")+'</small></span><span>'+esc(x.cliente||"–")+'</span><span>'+esc((x.desenho||"–")+(x.rev?" R"+x.rev:""))+'</span><span class="mono">'+esc(f.ncm||"–")+'</span><span>'+itPill(x)+'</span></div>'}).join(""):'<div class="mx-empty">'+(IT.list.length?"Nenhum item com esse filtro.":"Nenhum item ainda. Os itens são cadastrados sozinhos quando uma proposta é aprovada e vira pedido interno.")+'</div>')+'</div>';
}
var IT_ID=[["codigo","Código do cliente"],["descricao","Descrição"],["cliente","Cliente"],["desenho","Desenho"],["rev","Revisão"],["material","Material"],["pesoKg","Peso líquido (kg)"]];
function itEdOf(x){if(IT.ed&&IT.edId===x.id&&(IT.ed.dirty||IT.ed.at===x.atualizado))return IT.ed;var e=JSON.parse(JSON.stringify(x));e.fiscal=e.fiscal||{};e.dirty=false;e.at=x.atualizado;IT.ed=e;IT.edId=x.id;return e}
function itSel(k,opts,v,ro,vazio){return'<select data-itf="'+k+'"'+(ro?' disabled':'')+'><option value="">'+(vazio||"escolha…")+'</option>'+opts.map(function(o){var a=Array.isArray(o)?o:[o,o];return'<option value="'+esc(a[0])+'"'+(String(v||"")===a[0]?" selected":"")+'>'+esc(a[1])+'</option>'}).join("")+'</select>'}
function itDetail(box,x){
  var e=itEdOf(x),f=e.fiscal,falta=itFalta(e),ind=e.modalidade==="Industrialização";
  var peds=PD.list.filter(function(p){return(p.itens||[]).some(function(y){return y.itemId===x.id||itKey(p.cliente,y.cod)===itKey(x.cliente,x.codigo)})});
  var dk=normTxt(x.desenho||x.codigo);
  var cncs=(CN.list||[]).filter(function(p){return dk&&(normTxt(p.codigo)===dk||normTxt(p.codigo)===normTxt(x.codigo))});
  var pis=(typeof QI!=="undefined"?QI.list:[]).filter(function(p){return dk&&(normTxt(p.codigo)===dk||normTxt(p.codigo)===normTxt(x.codigo))});
  var sug=IT.sug[x.id];
  function inp(k,lab,ph){return'<label class="f"><span class="lb">'+lab+'</span><input data-iti="'+k+'" value="'+esc(e[k]==null?"":e[k])+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></label>'}
  box.innerHTML='<div class="mx-bar"><button class="btn sm" type="button" data-it="back">‹ Cadastro de itens</button><span class="sp"></span><button class="btn danger" type="button" data-it="del" data-id="'+esc(x.id)+'">Excluir</button></div>'+
   '<div class="card"><div class="dh2"><span class="idtag big">'+esc(cnIdTxt("itens",x))+'</span><h2>'+esc(x.codigo||"Item")+'</h2><span class="sub">'+esc([x.cliente,x.descricao].filter(Boolean).join(" · "))+'</span> '+itPill(e)+'</div>'+
   (falta.length?'<div class="askbox">Falta para o fiscal ficar completo: <b>'+esc(falta.join(", "))+'</b>. Com o fiscal completo o item fica pronto para a NF e para o Bloco K.</div>':'<div class="askbox" style="background:var(--good-bg);color:var(--good)">Dados fiscais completos.</div>')+'</div>'+
   '<div class="card"><h3>Identificação</h3><div class="it-g">'+IT_ID.map(function(k){return inp(k[0],k[1])}).join("")+
    '<label class="f"><span class="lb">Unidade</span>'+itSel("_un",FX_UN,e.unidade,false,"–")+'</label>'+
    '<label class="f"><span class="lb">Empresa que fabrica</span><select data-iti="emp"><option'+(e.emp!=="STAR"?" selected":"")+'>MIX</option><option'+(e.emp==="STAR"?" selected":"")+'>STAR</option></select></label>'+
    '<label class="f"><span class="lb">Modalidade</span><select data-iti="modalidade"><option'+(!ind?" selected":"")+'>Venda</option><option'+(ind?" selected":"")+'>Industrialização</option></select></label>'+
    '<label class="f"><span class="lb">Tipo do item (SPED 0200)</span>'+itSel("_tipo",FX_TIPO,e.tipoSped)+'</label></div></div>'+
   '<div class="card"><div class="mx-bar"><h3 style="margin:0">Dados fiscais</h3><span class="hint">MIX e STAR no Simples Nacional: ICMS por CSOSN. Confirme as escolhas com o contador.</span><span class="sp"></span><button class="btn sm" type="button" data-it="sugncm" data-id="'+esc(x.id)+'">Sugerir NCM</button></div>'+
    (sug?'<div class="it-sug">'+sug+'</div>':'')+
    '<div class="it-g">'+
     '<label class="f"><span class="lb">NCM</span><input data-itf="ncm" value="'+esc(f.ncm||"")+'" placeholder="0000.00.00" inputmode="numeric"></label>'+
     '<label class="f"><span class="lb">CEST <small>(só com ST)</small></span><input data-itf="cest" value="'+esc(f.cest||"")+'"></label>'+
     '<label class="f it-w"><span class="lb">Origem da mercadoria</span>'+itSel("origem",FX_ORIG,f.origem)+'</label>'+
     '<label class="f it-w"><span class="lb">CSOSN (ICMS do Simples)</span>'+itSel("csosn",FX_CSOSN,f.csosn)+'</label>'+
     '<label class="f it-w"><span class="lb">CFOP dentro de SP</span>'+itSel("cfopDentro",FX_CFOP,f.cfopDentro)+'</label>'+
     '<label class="f it-w"><span class="lb">CFOP fora de SP</span>'+itSel("cfopFora",FX_CFOP,f.cfopFora)+'</label>'+
     (ind?'<label class="f it-w"><span class="lb">CFOP de retorno do material (SP)</span>'+itSel("cfopRetDentro",FX_CFOP,f.cfopRetDentro)+'</label><label class="f it-w"><span class="lb">CFOP de retorno (fora de SP)</span>'+itSel("cfopRetFora",FX_CFOP,f.cfopRetFora)+'</label>':'')+
     '<label class="f"><span class="lb">CST do IPI</span>'+itSel("cstIpi",FX_IPI,f.cstIpi,false,"–")+'</label>'+
     '<label class="f"><span class="lb">Alíquota do IPI (%)</span><input data-itf="aliqIpi" value="'+esc(f.aliqIpi||"")+'" placeholder="pela TIPI"></label>'+
     '<label class="f"><span class="lb">CST do PIS</span>'+itSel("cstPis",FX_PIS,f.cstPis,false,"–")+'</label>'+
     '<label class="f"><span class="lb">CST da COFINS</span>'+itSel("cstCofins",FX_PIS,f.cstCofins,false,"–")+'</label>'+
    '</div><label class="f"><span class="lb">Observações fiscais</span><input data-itf="obs" value="'+esc(f.obs||"")+'" placeholder="ex.: cliente envia o material (industrialização); NF de retorno junto"></label>'+
    '<div class="acts2"><button class="btn sm" type="button" data-it="padrao" data-id="'+esc(x.id)+'">Usar CSOSN e CSTs deste item como padrão da '+esc(e.emp||"MIX")+'</button><span class="hint">Itens novos já nascem com eles.</span></div></div>'+
   '<div class="card"><h3>Vínculos</h3><dl class="cn-dl"><dt>Pedidos internos</dt><dd>'+(peds.length?peds.map(function(p){return'<button type="button" class="btn sm" data-it="ped" data-pd="'+esc(p.id)+'">'+esc(p.num)+'</button>'}).join(" "):'<span class="hint">nenhum</span>')+'</dd>'+
    '<dt>Programas CNC</dt><dd>'+(cncs.length?cncs.map(function(p){return'<span class="idtag">'+esc(cnIdTxt("programas_cnc",p))+'</span>'}).join(" "):'<span class="hint">nenhum com este código</span>')+'</dd>'+
    '<dt>Planos de inspeção</dt><dd>'+(pis.length?pis.map(function(p){return'<span class="idtag">'+esc(cnIdTxt("planos_inspecao",p))+'</span>'}).join(" "):'<span class="hint">nenhum com este código</span>')+'</dd>'+
    '<dt>Roteiro e estrutura</dt><dd><span class="hint">na próxima etapa (engenharia define operações, máquinas, tempos e material por peça)</span></dd></dl></div>'+
   '<div class="card"><div class="acts2"><button class="btn pri" type="button" data-it="salvar" data-id="'+esc(x.id)+'"'+(e.dirty?'':' disabled')+'>Salvar</button><button class="btn" type="button" data-it="desfaz"'+(e.dirty?'':' disabled')+'>Desfazer</button></div>'+
   '<h3>Histórico</h3><ul class="hist">'+((x.hist||[]).slice().reverse().map(function(h){return'<li><time>'+esc(nowStr(h.at))+'</time><span>'+esc(h.txt)+'</span></li>'}).join("")||'<li><span class="hint">Sem registros.</span></li>')+'</ul></div>';
}
function renderItens(box){
  itSub();
  if(IT.open){var x=itById(IT.open);if(x){
    var ae=document.activeElement,keep=null;if(ae&&box.contains(ae)&&ae.dataset){var at=["data-iti","data-itf"].filter(function(k){return ae.hasAttribute(k)})[0];if(at)keep={sel:"["+at+'="'+ae.getAttribute(at)+'"]',s:ae.selectionStart,e:ae.selectionEnd}}
    itDetail(box,x);if(keep){var ne=box.querySelector(keep.sel);if(ne)try{ne.focus({preventScroll:true});if(keep.s!=null&&ne.setSelectionRange)ne.setSelectionRange(keep.s,keep.e)}catch(er){}}return}IT.open=""}
  var ae2=document.activeElement,kid=ae2&&ae2.id==="it-q",pos=kid?ae2.selectionStart:null;
  box.innerHTML='<div class="mh"><div><h2>Cadastro de itens</h2><p>Cada peça fabricada tem um cadastro único: identificação, dados fiscais (NCM, origem, CSOSN, CFOP, IPI, PIS/COFINS, tipo SPED) e, na próxima etapa, roteiro e estrutura. Os itens nascem sozinhos quando uma proposta é aprovada.</p></div><span class="fase">Engenharia</span></div>'+itListHtml();
  if(kid){var q=$("it-q");if(q){q.focus();try{q.setSelectionRange(pos,pos)}catch(er){}}}
}
var _rmIt=renderMod;renderMod=function(box,k){if(k==="itens"){renderItens(box);return}return _rmIt.apply(this,arguments)};
function itMark(e){if(!e.dirty){e.dirty=true;["salvar","desfaz"].forEach(function(k){var b=document.querySelector('[data-it="'+k+'"]');if(b)b.disabled=false})}}
function itDiff(x,e){var ch=[];IT_ID.concat([["unidade","Unidade"],["emp","Empresa"],["modalidade","Modalidade"],["tipoSped","Tipo SPED"]]).forEach(function(k){var a=String(x[k[0]]==null?"":x[k[0]]),b=String(e[k[0]]==null?"":e[k[0]]);if(a!==b)ch.push(k[1]+": "+(a||"–")+" → "+(b||"–"))});
  var fa=x.fiscal||{},fb=e.fiscal||{};["ncm","cest","origem","csosn","cfopDentro","cfopFora","cfopRetDentro","cfopRetFora","cstIpi","aliqIpi","cstPis","cstCofins","obs"].forEach(function(k){var a=String(fa[k]||""),b=String(fb[k]||"");if(a!==b)ch.push(k.toUpperCase().replace("CFOPDENTRO","CFOP SP").replace("CFOPFORA","CFOP fora").replace("CSTIPI","CST IPI").replace("ALIQIPI","IPI %").replace("CSTPIS","CST PIS").replace("CSTCOFINS","CST COFINS")+": "+(a||"–")+" → "+(b||"–"))});return ch}
$("v-mx").addEventListener("input",function(ev){
  if(S.tab!=="m-itens")return;var t=ev.target;
  if(t.id==="it-q"){IT.q=t.value;clearTimeout(IT.qt);IT.qt=setTimeout(mxRender,250);return}
  var x=itById(IT.open);if(!x)return;var e=itEdOf(x);
  if(t.dataset.iti){e[t.dataset.iti]=t.value;itMark(e);if(t.dataset.iti==="modalidade"||t.dataset.iti==="emp")mxRender();return}
  if(t.dataset.itf){var k=t.dataset.itf;if(k==="_un")e.unidade=t.value;else if(k==="_tipo")e.tipoSped=t.value;else e.fiscal[k]=t.value;itMark(e)}
});
$("v-mx").addEventListener("change",function(ev){
  if(S.tab!=="m-itens")return;var t=ev.target;
  if(t.id==="it-so"){IT.so=t.checked?"falta":"";mxRender();return}
  var x=itById(IT.open);if(!x)return;var e=itEdOf(x);
  if(t.dataset.itf==="ncm"&&dig(t.value).length===8){e.fiscal.ncm=itNcmFmt(t.value);t.value=e.fiscal.ncm}
  if(t.dataset.iti==="modalidade"){var cf=itCfopPad(t.value);for(var k in cf)e.fiscal[k]=cf[k];itMark(e);mxRender()}
});
$("v-mx").addEventListener("click",function(ev){
  if(S.tab!=="m-itens")return;var b=ev.target.closest("[data-it]");if(!b)return;ev.stopPropagation();ev.preventDefault();
  var a=b.dataset.it,x=itById(b.dataset.id||IT.open);
  if(a==="back"){if(IT.ed&&IT.ed.dirty){askDel("Sair sem salvar?","As mudanças no cadastro ainda não foram salvas.",function(){IT.ed=null;IT.edId="";IT.open="";mxRender()});return}IT.ed=null;IT.edId="";IT.open="";mxRender();return}
  if(a==="novo"){if(!PR.db){toast("Banco indisponível.");return}itEnsure({cod:"NOVO-"+rid().slice(0,4).toUpperCase(),desc:""},"","MIX","Venda","cadastro manual").then(function(id){IT.open=id;mxRender();toast("Item criado. Preencha o código e a descrição.")});return}
  if(!x)return;
  if(a==="open"){IT.open=x.id;IT.ed=null;IT.edId="";mxRender();return}
  if(a==="ped"){PD.open=b.dataset.pd;showTab("ped");return}
  var e=itEdOf(x);
  if(a==="desfaz"){IT.ed=null;IT.edId="";mxRender();return}
  if(a==="salvar"){var ch=itDiff(x,e);if(!ch.length){toast("Nada mudou.");return}
    if(e.fiscal.ncm&&!itNcmOk(e.fiscal.ncm)){toast("NCM precisa ter 8 dígitos (0000.00.00).");return}
    var patch={atualizado:Date.now()};IT_ID.forEach(function(k){patch[k[0]]=e[k[0]]==null?"":e[k[0]]});["unidade","emp","modalidade","tipoSped"].forEach(function(k){patch[k]=e[k]||""});patch.fiscal=e.fiscal;
    var h=(x.hist||[]).slice(-199);h.push({at:Date.now(),uid:AG.uid||"",txt:"Cadastro alterado: "+ch.join("; ")+"."});patch.hist=h;
    PR.db.doc("itens/"+x.id).update(patch).then(function(){IT.ed=null;IT.edId="";toast("Item salvo.")}).catch(function(){toast("Não consegui salvar.")});return}
  if(a==="padrao"){var f=e.fiscal,emp=e.emp||"MIX",pd={csosn:f.csosn||"",cstIpi:f.cstIpi||"",cstPis:f.cstPis||"",cstCofins:f.cstCofins||"",atualizado:Date.now()};
    askDel("Usar como padrão fiscal da "+emp+"?","CSOSN "+(pd.csosn||"–")+" · CST IPI "+(pd.cstIpi||"–")+" · CST PIS "+(pd.cstPis||"–")+" · CST COFINS "+(pd.cstCofins||"–")+". Vale para os itens que forem cadastrados daqui em diante.",function(){
      PR.db.doc("config/fiscal-"+emp).set(pd).then(function(){IT.pad[emp]=pd;toast("Padrão fiscal da "+emp+" gravado.")}).catch(function(){toast("Não consegui gravar o padrão.")})});return}
  if(a==="del"){var usa=PD.list.some(function(p){return(p.itens||[]).some(function(y){return y.itemId===x.id})});
    askDel("Excluir o item "+(x.codigo||"")+"?",usa?"Atenção: este item está em pedidos internos; os pedidos ficam sem o vínculo.":"Esta ação não pode ser desfeita.",function(){PR.db.doc("itens/"+x.id).delete().then(function(){IT.open="";IT.ed=null;IT.edId="";mxRender();toast("Item excluído.")}).catch(function(){toast("Não consegui excluir.")})});return}
  if(a==="sugncm"){itSugNcm(x,e);return}
},true);
/* NCM: primeiro o histórico da casa (itens parecidos), a IA só se o usuário pedir */
function itSugNcm(x,e){
  var w=normTxt(e.descricao).split(" ").filter(function(s){return s.length>3}),viz=IT.list.filter(function(y){return y.id!==x.id&&itNcmOk(y.fiscal&&y.fiscal.ncm)}).map(function(y){var yw=normTxt(y.descricao).split(" "),s=w.filter(function(a){return yw.indexOf(a)>-1}).length+(normTxt(y.cliente)===normTxt(e.cliente)?0.5:0);return{y:y,s:s}}).filter(function(o){return o.s>=1}).sort(function(a,b){return b.s-a.s}).slice(0,4);
  var h=viz.length?'<b>Itens parecidos já cadastrados:</b> '+viz.map(function(o){return'<button type="button" class="btn sm" data-it="usancm" data-ncm="'+esc(o.y.fiscal.ncm)+'">'+esc(o.y.fiscal.ncm)+' · '+esc(o.y.codigo)+' '+esc(String(o.y.descricao).slice(0,40))+'</button>'}).join(" "):'<span class="hint">Nenhum item parecido com NCM cadastrado ainda.</span>';
  h+=AG.sample?' <button type="button" class="btn sm" data-it="ncmia" data-id="'+esc(x.id)+'">Perguntar ao agente</button>':'';
  IT.sug[x.id]=h;mxRender();
}
$("v-mx").addEventListener("click",function(ev){
  if(S.tab!=="m-itens")return;var b=ev.target.closest('[data-it="usancm"],[data-it="ncmia"]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  var x=itById(IT.open);if(!x)return;var e=itEdOf(x);
  if(b.dataset.it==="usancm"){e.fiscal.ncm=b.dataset.ncm;itMark(e);delete IT.sug[x.id];mxRender();toast("NCM aplicado. Confira e salve.");return}
  b.disabled=true;b.textContent="Consultando…";
  var pr="Você é assistente fiscal de uma usinagem brasileira (peças sob encomenda, Simples Nacional). Sugira o NCM (8 dígitos) para o item abaixo, considerando a TIPI. Responda só JSON: {\"ncm\":\"0000.00.00\",\"descricao_ncm\":\"\",\"confianca\":\"alta|média|baixa\",\"motivo\":\"curto\",\"alternativas\":[\"0000.00.00 - quando usar\"]}.\nItem: "+[e.descricao,e.material?"material "+e.material:"",e.cliente?"cliente "+e.cliente:"",e.modalidade].filter(Boolean).join("; ");
  var call=typeof AG.sample.json==="function"?AG.sample.json(pr,{cache:true,modelTier:"quick"}):AG.sample(pr,{cache:true}).then(function(r){var t=String(r&&r.text||"");return JSON.parse(t.slice(t.indexOf("{"),t.lastIndexOf("}")+1))});
  call.then(function(r){if(!r||!r.ncm)throw 0;IT.sug[x.id]='<b>Sugestão do agente:</b> <button type="button" class="btn sm pri" data-it="usancm" data-ncm="'+esc(itNcmFmt(r.ncm))+'">Usar '+esc(itNcmFmt(r.ncm))+'</button> '+esc(r.descricao_ncm||"")+' · confiança '+esc(r.confianca||"?")+'. '+esc(r.motivo||"")+((r.alternativas||[]).length?'<br><span class="hint">Alternativas: '+esc(r.alternativas.join(" · "))+'</span>':'')+'<br><span class="hint">Confirme com o contador antes de emitir NF.</span>';mxRender()})
   .catch(function(err){b.disabled=false;b.textContent="Perguntar ao agente";toast(err&&err.code?agErr(err):"O agente não conseguiu sugerir o NCM.")});
},true);

/* ---------- menu ---------- */
MODS.itens={n:"Cadastro de itens",fase:"",et:[],txt:"",plan:[]};
MX_TABS.push("m-itens");
var _stIt=showTab;showTab=function(t){var r=_stIt.apply(this,arguments);
  var a=$("t-itens");if(a)a.setAttribute("aria-selected",String(t==="m-itens"));
  if(t==="m-itens"){$("crumb").innerHTML="Engenharia › <b>Cadastro de itens</b>";$("crumb-t").textContent="Cadastro de itens"}
  if(t==="ped"){$("crumb").innerHTML="Vendas › <b>Pedidos internos</b>";$("crumb-t").textContent="Pedidos internos"}
  return r};
