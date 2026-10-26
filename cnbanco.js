
/* ===== Programas CNC: banco de programas reais (cnc_banco) e feedback com o programa real (pedidos 2 e 3 do agente CNC, 26/10/2026) ===== */
var CB={p:null,itens:[],txt:{},novos:null};
function cbN(s){return normTxt(s).replace(/[^a-z0-9.,\-\/ ]+/g," ")}
function cbLoad(){
  if(CB.p)return CB.p;
  if(!PR.db)return Promise.resolve([]);
  CB.p=PR.db.doc("cnc_banco/meta").get().then(function(s){
    var m=s&&s.exists?s.data():{},ids=(m.indices||[]).slice();ids.push("novos");
    return Promise.all(ids.map(function(id){return PR.db.doc("cnc_banco/"+id).get().then(function(x){return x&&x.exists?x.data():null}).catch(function(){return null})}));
  }).then(function(docs){
    var all=[];docs.forEach(function(d){if(d&&Array.isArray(d.itens))all=all.concat(d.itens)});
    var byId={};all.forEach(function(x){if(x&&x.id)byId[x.id]=x});
    CB.itens=Object.keys(byId).map(function(k){return byId[k]});return CB.itens;
  }).catch(function(){CB.p=null;return[]});
  return CB.p;
}
function cbText(it){
  if(!it||!it.bloco)return Promise.resolve("");
  var b=it.bloco;
  var p=CB.txt[b]||(CB.txt[b]=PR.db.doc("cnc_banco/"+b).get().then(function(s){return s&&s.exists?(s.data().programas||{}):{}}).catch(function(){delete CB.txt[b];return{}}));
  return p.then(function(m){return String(m[it.id]||"")});
}
/* palavras do painel → tags do índice */
var CB_SIN=[[/\bfur(o|os|ar|acao)\b|\bbroca/,["furacao"]],[/\bfuro.{0,12}profund|\bprofund/,["furacao-profunda"]],[/\brosca|\bmacho|\bm\d{1,2}(x[\d.,]+)?\b/,["macho","rosca"]],[/\bmorsa/,["fix-morsa"]],[/\bduas morsas|2 morsas/,["fix-duas-morsas"]],[/\bplaca|castanha/,["fix-placa","placa"]],[/\bdispositivo/,["fix-dispositivo"]],[/\bmesa\b|grampo/,["fix-mesa"]],[/\bcal[cç]o/,["fix-calco"]],
  [/escare/,["escareador"]],[/alarg/,["alargador"]],[/chanfr/,["chanfro"]],[/\brasgo/,["rasgo"]],[/oblong/,["oblongo"]],[/rebaix/,["rebaixo"]],[/facea|faceamento/,["facear"]],[/contorn/,["contorno"]],[/repass/,["repasse"]],[/quadrad/,["quadrado"]],[/sextav/,["sextavado"]],[/esquadr/,["esquad"]],[/grava/,["grava"]],[/chavet/,["chaveta"]],[/grelha/,["grelha"]],[/flange/,["flange"]],[/tampa/,["tampa"]],[/helic|interpola/,["helice"]],[/conic/,["conica"]],[/toroid/,["toroidal"]],[/circul|pcd|divis/,["furos-em-circulo"]],[/\bg52\b/,["G52"]],[/rota[cç]/,["rotacao"]],[/cabe[cç]ote/,["cabecote"]],[/sub.?rotina/,["sub-rotina"]],[/compensa/,["compensacao-raio"]]];
function cbTags(txt){
  var t=cbN(txt),out={};
  CB_SIN.forEach(function(r){if(r[0].test(t))r[1].forEach(function(x){out[x]=1})});
  /* furo ou fresa pequena (Ø até 3 mm) → fresa fina */
  var re=/(?:ø|o|diam(?:etro)?\.?|furo de|fresa de|fresa)\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:mm)?/g,x;
  while((x=re.exec(t))){var v=parseFloat(x[1].replace(",","."));if(v>0&&v<=3){out["fresa-fina"]=1;out["furacao"]=1}}
  return Object.keys(out);
}
function cbFamilia(s){var m=String(s||"").match(/(\d{2,3})[.\-](\d{2,3})/);return m?m[1]+"-"+m[2]:""}
function cbMatTok(s){var t=cbN(s);var m=t.match(/\b(\d{4})\b|\b(inox|aluminio|latao|bronze|cobre|nylon|poliacetal|celeron|teflon|a36|vhm|h13|d2|p20)\b/g);return m||[]}
function cbScore(it,ctx){
  var s=0;
  if(ctx.cliente&&it.cliente&&cbN(it.cliente).indexOf(ctx.cliente)>-1)s+=5;
  else if(it.cliente&&ctx.texto.indexOf(cbN(it.cliente))>-1&&cbN(it.cliente).length>2)s+=5;
  var fa=cbFamilia(String(it.arq||"").split("/").pop());if(fa&&ctx.fams.indexOf(fa)>-1)s+=4;
  var mt=cbMatTok(it.material);if(mt.length&&mt.some(function(x){return ctx.mat.indexOf(x)>-1}))s+=2;
  (it.tags||[]).forEach(function(g){if(ctx.tags.indexOf(g)>-1)s+=3});
  var d=String(it.atualizado||"").match(/(\d{2})\/(\d{2})\/(\d{4})/);if(d&&(+d[3])>=new Date().getFullYear()-2)s+=1;
  return s;
}
function cbLinha(it){return[it.id,it.cmd,it.cliente||"",it.arq||"",it.op||"",it.material||"","ferr: "+(it.ferr||[]).join(", "),"tags: "+(it.tags||[]).join(", "),"tempo "+fmtT(it.tempo_s||0)].join(" | ")}
/* escolhe até 3 programas reais parecidos e devolve o bloco de texto para o pedido */
function cbRefs(j,prep){
  return cbLoad().then(function(itens){
    if(!itens.length)return null;
    var texto=cbN([j.f.name,j.draft.mat,j.draft.bruto,j.draft.fix,j.draft.zero,j.draft.inst,(prep&&prep.texto||"").slice(0,6000)].join(" \n "));
    var fams=[];(String(j.f.name)+" "+(prep&&prep.texto||"").slice(0,3000)).replace(/(\d{2,3})[.\-](\d{2,3})/g,function(a,b,c){fams.push(b+"-"+c);return a});
    var ctx={texto:texto,cliente:"",fams:fams,mat:cbMatTok(j.draft.mat),tags:cbTags(texto)};
    var mesmo=itens.filter(function(it){return it.cmd===j.c.k}).map(function(it){return{it:it,s:cbScore(it,ctx)}});
    var sel=mesmo.filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s});
    if(sel.length<10){sel=sel.concat(itens.filter(function(it){return it.cmd!==j.c.k}).map(function(it){return{it:it,s:cbScore(it,ctx)-2}}).filter(function(x){return x.s>0}).sort(function(a,b){return b.s-a.s}).slice(0,30-sel.length))}
    sel=sel.slice(0,30);if(!sel.length)return null;
    cnJob(j,"ia","Escolhendo programas parecidos no banco da casa…");
    var q="Você ajuda o programador CNC da MIX USINAGEM. Abaixo está a peça a programar (desenho anexado, se houver) e uma lista de programas reais da casa. Escolha ATÉ 3 programas que mais se parecem com esta peça em estratégia de usinagem (mesmo tipo de feature, fixação, ferramentas, material). Prefira o mesmo comando ("+j.c.k+").\n\nPEÇA: arquivo "+j.f.name+"\nMaterial: "+j.draft.mat+"\nBruto: "+j.draft.bruto+"\nFixação: "+j.draft.fix+"\nZero: "+j.draft.zero+"\nSequência e observações: "+j.draft.inst+(prep&&prep.texto?"\nTexto do desenho: "+String(prep.texto).slice(0,2500):"")+
      "\n\nPROGRAMAS (id | comando | cliente | arquivo | op | material | ferramentas | características | tempo):\n"+sel.map(function(x){return cbLinha(x.it)}).join("\n")+
      "\n\nResponda só com JSON: {\"ids\":[\"P00000\"],\"motivo\":\"uma frase\"}";
    var o={cache:false,modelTier:"default"};if(prep&&prep.imgs&&prep.imgs.length)o.images=prep.imgs.slice(0,1);
    return AG.sample(q,o).then(function(r){
      var ids=(String(r&&r.text||"").match(/\b[PC][0-9A-Z\-]{3,20}\b/g)||[]).filter(function(id,i,a){return a.indexOf(id)===i&&sel.some(function(x){return x.it.id===id})}).slice(0,3);
      if(!ids.length)ids=sel.slice(0,2).map(function(x){return x.it.id});
      var esc0=ids.map(function(id){return sel.filter(function(x){return x.it.id===id})[0].it});
      return Promise.all(esc0.map(cbText)).then(function(txts){
        var refs=[],partes=[];
        esc0.forEach(function(it,i){var tx=txts[i];if(!tx)return;refs.push({id:it.id,cmd:it.cmd,cliente:it.cliente||"",arq:it.arq||"",op:it.op||"",tempo_s:it.tempo_s||0,bloco:it.bloco||"",origem:it.origem||"casa"});
          partes.push("--- "+it.id+" · "+(it.cliente||"")+" · "+(it.arq||"")+" · "+(it.op||"")+" · comando "+it.cmd+" · tempo simulado "+fmtT(it.tempo_s||0)+" ---\n"+tx.slice(0,20000))});
        if(!refs.length)return null;
        return{refs:refs,txt:"PROGRAMAS REAIS DA CASA PARECIDOS COM ESTA PEÇA — siga a estratégia deles (sequência, ferramentas, rampas, repasse, compensação, dados de corte); cabeçalho e dialeto pelas regras de cnc_dialetos:\n\n"+partes.join("\n\n")+"\n\n"};
      });
    });
  }).catch(function(){return null});
}
/* programa validado (ou programa real do feedback) entra no banco */
function cbAdd(p,ops,real){
  if(!PR.db||!ops||!ops.length)return Promise.resolve();
  var num=("000"+(p.idSeq||0)).slice(-4),bl="N"+num,t=Date.now(),hoje=new Date().toLocaleDateString("pt-BR");
  var novos=ops.map(function(o){var nc=real?o.ncReal&&o.ncReal.nc:o.nc;if(!nc)return null;var sim=cnSim(nc);
    var ferr=[];String(nc).replace(/\(([^()]*)\)/g,function(a,b){if(/^(T\d|BROCA|FRESA|MACHO|CAB|ESCAR|ALARG|MD-|TOP|CENTRO)/i.test(b.trim()))ferr.push(b.trim().slice(0,40));return a});
    return{id:"C"+num+"-"+String(o.op||"OP").replace(/[^A-Z0-9]/gi,"")+(real?"-R":""),cmd:p.comando,cliente:p.cliente||"",arq:"CEREBRO/"+(p.codigo||"")+(p.rev?"-R"+p.rev:""),op:o.op||"",atualizado:hoje,material:p.material||p.materialInf||"",linhas:String(nc).split("\n").length,ferr:ferr.slice(0,12),tags:cbTags([p.descricao,p.instrucoes,p.fixacaoInf,o.descricao,nc.slice(0,4000)].join(" ")),tempo_s:Math.round(sim.tempo||0),bloco:bl,origem:real?"cerebro-real":"cerebro",programa:p.id,_nc:nc}}).filter(Boolean);
  if(!novos.length)return Promise.resolve();
  var docT=PR.db.doc("cnc_banco/"+bl),docI=PR.db.doc("cnc_banco/novos");
  return docT.get().then(function(s){var d=s&&s.exists?s.data():{programas:{}};d.programas=d.programas||{};d.origem="cerebro";d.atualizado=t;
    novos.forEach(function(n){d.programas[n.id]=n._nc});return docT.set(d)
  }).then(function(){return docI.get()}).then(function(s){var d=s&&s.exists?s.data():{itens:[]},it=(d.itens||[]).filter(function(x){return!novos.some(function(n){return n.id===x.id})});
    novos.forEach(function(n){var c={};for(var k in n)if(k!=="_nc")c[k]=n[k];it.push(c)});return docI.set({itens:it,atualizado:t})
  }).then(function(){CB.p=null;CB.txt={}}).catch(function(){toast("Não consegui guardar o programa no banco da casa.")});
}
/* ---- telas: referências usadas e feedback com o programa real ---- */
function cbRefsHtml(p){
  var r=p.referencias||[];if(!r.length)return"";
  return'<div class="card"><h3>Referências usadas</h3><p class="hint">Programas reais da casa que o agente recebeu como modelo de estratégia.</p><div class="cb-refs">'+r.map(function(x){return'<div class="cb-ref"><b class="mono">'+esc(x.id)+'</b><span>'+esc(x.cliente||"–")+'</span><span class="mono hint">'+esc(x.arq||"")+(x.op?" · "+esc(x.op):"")+'</span><span>'+esc((cnCmd(x.cmd)||{}).n||x.cmd||"")+'</span><span class="mono">'+fmtT(x.tempo_s||0)+'</span><button class="btn sm" type="button" data-cnc="refver" data-id="'+esc(p.id)+'" data-ref="'+esc(x.id)+'">Ver programa</button></div>'}).join("")+'</div></div>';
}
function cbCmp(o){
  var a=cnSim(o.nc),r=cnSim(o.ncReal.nc),ks={};
  function tk(k){return k.split(" ")[0]}
  [a,r].forEach(function(s){for(var k in s.porFerr)if(k!=="inicio")ks[k]=1});
  var linhas=Object.keys(ks).sort().map(function(k){return{k:k,a:a.porFerr[k]||0,r:r.porFerr[k]||0}});
  return{ta:a.tempo||0,tr:r.tempo||0,linhas:linhas,pct:r.tempo?Math.round((a.tempo-r.tempo)/r.tempo*100):null};
}
function cbFbHtml(p){
  var ops=p.ops||[];if(!ops.length||p.status==="gerando")return"";
  return'<div class="card cb-fb"><h3>Feedback: programa real da casa</h3><p class="hint">Solte ou escolha o .NC/.MPF que foi realmente para a máquina. O simulador compara os tempos, e o agente CNC aprende com a diferença.</p>'+
   ops.map(function(o,i){var nr=o.ncReal,key=p.id+"|"+i,dr=CN.fb&&CN.fb[key]!=null?CN.fb[key]:(nr&&nr.texto||"");
    var h='<div class="cb-op"><div class="mx-bar"><b>'+esc(o.op||("OP"+(i+1)*10))+'</b><span class="sp"></span>'+
     '<label class="btn sm" tabindex="0">'+(nr?"Trocar programa real":"Anexar programa real (feedback)")+'<input type="file" hidden data-cbfile="'+i+'" accept=".nc,.NC,.mpf,.MPF,.txt,.tap,.cnc,text/plain"></label></div>';
    if(nr){var c=cbCmp(o);
      h+='<p class="hint">Programa real: <b>'+esc(nr.nome||"")+'</b>'+(nr.em?' · anexado em '+esc(nowStr(nr.em)):'')+' <button class="btn sm" type="button" data-cnc="realver" data-id="'+esc(p.id)+'" data-op="'+i+'">Ver</button></p>'+
       '<table class="cb-t"><thead><tr><th>Ferramenta</th><th>Agente</th><th>Real (casa)</th></tr></thead><tbody>'+c.linhas.map(function(l){return'<tr><td>'+esc(l.k)+'</td><td class="mono">'+(l.a?fmtT(l.a):"–")+'</td><td class="mono">'+(l.r?fmtT(l.r):"–")+'</td></tr>'}).join("")+
       '</tbody><tfoot><tr><td>Total</td><td class="mono">'+fmtT(c.ta)+'</td><td class="mono">'+fmtT(c.tr)+'</td></tr><tr><td>Diferença</td><td colspan="2" class="'+(c.pct>15?"cb-pior":c.pct<-15?"cb-melhor":"")+'">'+(c.pct==null?"–":(c.pct>0?"agente "+c.pct+"% mais lento":c.pct<0?"agente "+(-c.pct)+"% mais rápido":"mesmo tempo"))+'</td></tr></tfoot></table>'+
       '<label class="f"><span class="lb">O que mudou e por quê</span><textarea rows="3" data-cbtxt="'+esc(key)+'" placeholder="ex.: a casa usa rampa nas paredes com MD-2 S5000 F1500 e repassa com MD-2,5">'+esc(dr)+'</textarea></label>'+
       '<div class="acts2"><span class="sp" style="flex:1"></span>'+(nr.salvo?'<span class="hint">Feedback salvo'+(nr.salvoEm?' em '+esc(nowStr(nr.salvoEm)):'')+'.</span>':'')+'<button class="btn pri" type="button" data-cnc="fbsave" data-id="'+esc(p.id)+'" data-op="'+i+'">Salvar feedback</button></div>';
    }
    return h+'</div>'}).join("")+'</div>';
}
function cbShowText(titulo,txt){
  var m=$("mx-modal");
  m.innerHTML='<div class="card" role="dialog" aria-modal="true" style="width:min(900px,100%)"><div class="mx-bar"><h3 style="margin:0">'+esc(titulo)+'</h3><span class="sp"></span><button class="btn pri" type="button" data-v="x">Fechar</button></div><pre class="cb-pre">'+esc(txt||"(texto não encontrado)")+'</pre></div>';
  m.hidden=false;m.onclick=function(e){if(e.target===m||e.target.closest('[data-v="x"]'))m.hidden=true};
}
function cbFbFile(p,i,f){
  if(!f)return;var r=new FileReader();
  r.onload=function(){var nc=String(r.result||"");if(!/[GM]\d/.test(nc)){toast("Este arquivo não parece um programa CNC.");return}
    var ops=JSON.parse(JSON.stringify(p.ops||[]));if(!ops[i])return;
    ops[i].ncReal={nc:nc.slice(0,200000),nome:f.name,por:AG.uid||"",em:Date.now(),texto:(ops[i].ncReal&&ops[i].ncReal.texto)||""};
    cnSet(p,{ops:ops},"Programa real anexado para feedback ("+(ops[i].op||"")+"): "+f.name+".").then(function(){toast("Programa real anexado. Veja a comparação.")});
  };
  r.onerror=function(){toast("Não consegui ler o arquivo.")};r.readAsText(f,"latin1");
}
function cbFbSave(p,i){
  var o=(p.ops||[])[i];if(!o||!o.ncReal)return;var key=p.id+"|"+i,txt=String((CN.fb&&CN.fb[key]!=null?CN.fb[key]:o.ncReal.texto)||"").trim();
  if(!txt){toast("Escreva o que mudou e por quê antes de salvar.");return}
  var c=cbCmp(o),pf={agente:{},real:{}};c.linhas.forEach(function(l){pf.agente[l.k]=Math.round(l.a);pf.real[l.k]=Math.round(l.r)});
  var t=Date.now(),fid=p.id+"-"+String(o.op||("op"+i)).replace(/[^A-Za-z0-9]/g,"");
  var doc={programa:p.id,idSeq:p.idSeq||0,codigo:p.codigo||"",rev:p.rev||"",cliente:p.cliente||"",material:p.material||p.materialInf||"",op:o.op||"",comando:p.comando,
    tempo_agente_s:Math.round(c.ta),tempo_real_s:Math.round(c.tr),diferenca_pct:c.pct,por_ferramenta:pf,texto:txt,arquivo_real:o.ncReal.nome||"",nc_agente:String(o.nc||"").slice(0,120000),nc_real:String(o.ncReal.nc||"").slice(0,120000),por:AG.uid||"",em:t};
  var ops=JSON.parse(JSON.stringify(p.ops));ops[i].ncReal.texto=txt;ops[i].ncReal.salvo=true;ops[i].ncReal.salvoEm=t;
  PR.db.doc("cnc_feedback/"+fid).set(doc).then(function(){
    return cnSet(p,{ops:ops},"Feedback salvo ("+(o.op||"")+"): agente "+fmtT(c.ta)+" × real "+fmtT(c.tr)+".");
  }).then(function(){if(CN.fb)delete CN.fb[key];toast("Feedback salvo. O agente CNC vai ler esta comparação.");
    var q=JSON.parse(JSON.stringify(p));q.ops=ops;return cbAdd(q,[ops[i]],true);
  }).catch(function(){toast("Não consegui salvar o feedback.")});
}
