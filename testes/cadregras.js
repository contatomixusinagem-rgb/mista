/* ===== v94: leitor de fichas cadastrais por REGRAS (sem IA) =====
   Entrada: texto extraído (PDF com texto, Word, planilha, OCR). Saída no mesmo formato que a IA devolvia,
   para seguir o mesmo caminho de conferência. Usa dig, cnpjOk, cnpjFmt, cepFmt, UFS da página. */
var CR_UFN={"acre":"AC","alagoas":"AL","amapa":"AP","amazonas":"AM","bahia":"BA","ceara":"CE","distrito federal":"DF","espirito santo":"ES","goias":"GO","maranhao":"MA","mato grosso do sul":"MS","mato grosso":"MT","minas gerais":"MG","para":"PA","paraiba":"PB","parana":"PR","pernambuco":"PE","piaui":"PI","rio de janeiro":"RJ","rio grande do norte":"RN","rio grande do sul":"RS","rondonia":"RO","roraima":"RR","santa catarina":"SC","sao paulo":"SP","sergipe":"SE","tocantins":"TO"};
var CR_BANCOS=[[/banco do brasil|\bbb\b/i,"Banco do Brasil"],[/ita[uú]/i,"Itaú"],[/bradesco/i,"Bradesco"],[/santander/i,"Santander"],[/caixa econ|\bcef\b|\bcaixa\b/i,"Caixa Econômica Federal"],[/sicoob/i,"Sicoob"],[/sicredi/i,"Sicredi"],[/\binter\b/i,"Banco Inter"],[/nubank|nu pagamentos/i,"Nubank"],[/safra/i,"Safra"],[/btg/i,"BTG Pactual"],[/\bc6\b/i,"C6 Bank"],[/banrisul/i,"Banrisul"],[/mercantil/i,"Mercantil do Brasil"],[/unicred/i,"Unicred"],[/cresol/i,"Cresol"]];
function crSem(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
/* rótulo tolerante a letras separadas pelo PDF ("CE P", "R egime") */
function crRx(w){return w.split("").map(function(c){return/[a-z]/i.test(c)?c+"\\s?":c==="."?"\\.?":c.replace(/[\\^$*+?()[\]{}|]/g,"\\$&")}).join("").replace(/\\s\?$/,"")}
var CR_L={
  razao:"(?:raz[aã]o\\s?social|"+crRx("Razão Social")+"|nome\\s+empresarial)",
  fantasia:"(?:nome\\s?fantasia|fantasia)",
  cnpj:"(?:"+crRx("CNPJ")+"(?:\\/MF)?)",
  ie:"(?:inscri[çc][ãa]o\\s+estadual|insc\\.?\\s*est(?:adual)?\\.?|I\\.\\s?E\\.?|\\bIE)",
  im:"(?:inscri[çc][ãa]o\\s+municipal|insc\\.?\\s*mun(?:icipal)?\\.?|\\bI\\.?M\\.?)",
  end:"(?:endere[çc]o(?:\\s+comercial|\\s+completo)?|logradouro|\\brua(?=\\s*:))",
  num:"(?:n[úu]mero|\\bn[º°o]\\.?)",
  compl:"(?:complemento)",
  bairro:"(?:bairro)",
  cidade:"(?:cidade|munic[íi]pio)",
  uf:"(?:\\buf\\b|estado(?=\\s*:))",
  cep:"(?:"+crRx("CEP")+")",
  tel:"(?:telefones?(?:\\s*\\/\\s*fax)?|fones?|tel\\.?|celular|whats\\s?app|contato\\s+telef[ôo]nico)",
  email:"(?:e\\s?-?\\s?mails?|correio\\s+eletr[ôo]nico)",
  emailNf:"(?:(?:envio\\s+de\\s+)?nota\\s+fiscal(?:\\s+eletr[ôo]nica)?|nf-?e|xml|faturamento|para\\s+notas?\\s+fiscais[^:]*)",
  contato:"(?:contato|respons[áa]vel|comprador[a]?|aos\\s+cuidados)",
  banco:"(?:banco)",
  ag:"(?:ag[êe]ncia|\\bag\\b\\.?)",
  cc:"(?:conta\\s+corrente|c\\s?\\/\\s?c|\\bcc\\b|conta)",
  pix:"(?:chave\\s+pix|pix)",
  pagamento:"(?:condi[çc][ãa]o\\s+de\\s+pagamento|cond\\.?\\s+pagto|prazo\\s+de\\s+pagamento)",
  site:"(?:site|website|home\\s?page)"
};
var CR_ALL=new RegExp("(?:^|\\s{2,}|\\s[-–|]\\s|\\s)("+Object.keys(CR_L).map(function(k){return CR_L[k]}).join("|")+")\\s*[:\\-–]","i");
function crNorm(t){
  t=String(t||"").replace(/\r/g,"").replace(/\[p[áa]gina \d+\]/gi,"").replace(/\*\*/g,"").replace(/\[([^\]]+)\]\(mailto:[^)]+\)/g,"$1")
    .replace(/[\u00a0\t]/g," ").replace(/[‐‑‒—]/g,"–");
  t=t.replace(/\(\s*(\d{2})\s*\)/g,"($1)").replace(/(\d)\s+([.\/-])\s*(?=\d)/g,"$1$2").replace(/(\d)([.\/-])\s+(?=\d)/g,"$1$2");
  return t.split("\n").map(function(l){return l.replace(/ {2,}/g,"  ").replace(/\s+$/,"").replace(/^\s+/,"")}).filter(function(l){return l!==""});
}
function crIsRefHead(l){return/^(?:refer[êe]ncias?\s+(?:comerciais|de\s+fornecedores|de\s+clientes)|fornecedores\b|principais\s+fornecedores)/i.test(crSem(l).replace(/[^a-z\s]/g,"").trim()?l:"")||/^(?:refer[êe]ncias?\s+comerciais|fornecedores|principais\s+fornecedores)/i.test(l)}
function crIsBankHead(l){return/^(?:refer[êe]ncias?\s+banc[áa]rias?|ref\.?\s*banc[áa]rias?|dados\s+banc[áa]rios)/i.test(l)}
var CR_MAIN=/^(?:raz[aã]o|nome\s+fantasia|cnpj|inscri|endere|e-?mail|faturamento|financeiro|compras?\s*:|comercial\s*:|site|website|telefone|fone|cep|bairro|cidade|propriet|s[óo]cios|capital|objetivo|ramo|data\s+d|regime|descri)/i;
/* zonas: 0 = dados da empresa, 1 = referências comerciais, 2 = referências bancárias */
function crZonas(L){
  var z=[],cur=0,inl=0;
  L.forEach(function(l,i){
    if(crIsBankHead(l)){cur=2;inl=0;z.push(2);if(/:\s*\S/.test(l.replace(/^[^:]*banc[áa]ri[ao]s?/i,"")))z[i]=2;return}
    if(/^refer[êe]ncias?\s+comerciais\s*:\s*\S/i.test(l)){z.push(1);inl=2;cur=0;return}   /* referência numa linha só, com CNPJ/fone logo abaixo */
    if(crIsRefHead(l)){cur=1;inl=0;z.push(1);return}
    if(inl>0&&/^(cnpj|fone|tel)/i.test(l)){inl--;z.push(1);return}
    inl=0;
    if(cur&&CR_MAIN.test(l)&&!(cur===2&&/^(fone|telefone)/i.test(l)))cur=0;
    z.push(cur);
  });
  return z;
}
/* valor depois do rótulo, até o próximo rótulo na mesma linha; vazio = próxima linha */
function crVal(L,Z,key,zona,opt){
  var rx=new RegExp("(?:^|[\\s(|;,–-])"+CR_L[key]+"\\s*(?:\\([^)]*\\))?\\s*[:\\-–.]?\\s*","i");opt=opt||{};
  for(var i=0;i<L.length;i++){
    if(zona!=null&&Z[i]!==zona)continue;
    var l=L[i],m=rx.exec(l);if(!m)continue;
    if(opt.inicio&&m.index>2)continue;
    var v=l.slice(m.index+m[0].length),n=CR_ALL.exec(" "+v);
    if(n&&n.index>0)v=v.slice(0,Math.max(0,n.index-1));
    v=v.replace(/^[\s:\-–.]+|[\s\-–;,]+$/g,"");
    if(!v&&i+1<L.length&&!CR_ALL.test(" "+L[i+1]+":")&&!CR_MAIN.test(L[i+1]))v=L[i+1];
    if(v&&(!opt.ok||opt.ok(v)))return{v:v,i:i};
  }
  return null;
}
function crCnpjs(L,Z,own){
  var c={},rx=/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?!\d)/g;
  L.forEach(function(l,i){var m;rx.lastIndex=0;while((m=rx.exec(l))){if(!cnpjOk(m[1]))continue;var k=dig(m[1]),o=c[k]||(c[k]={k:k,s:0,n:0,i:i});
    o.n++;o.s+=2;if(/cnpj/i.test(l))o.s+=2;if(Z[i]===1)o.s-=6;if(/pix/i.test(l))o.s+=1;if(own.indexOf(k)>-1)o.s-=3}});
  return Object.keys(c).map(function(k){return c[k]}).sort(function(a,b){return b.s-a.s||a.i-b.i});
}
function crFones(s){var out=[],rx=/(?:\((\d{2})\)|\b(\d{2})(?=[\s.-]*\d{4}))[\s.-]*(9?\d{4})[\s.-]?(\d{4})(?![\d\/])/g,m;
  while((m=rx.exec(s))){var dd=m[1]||m[2];if(+dd<11)continue;out.push("("+dd+") "+m[3]+"-"+m[4])}return out}
function crEmails(s){return(String(s).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]).map(function(e){return e.replace(/\.$/,"").toLowerCase()})}
function crUf(s){var t=crSem(s).trim();if(UFS.indexOf(String(s).trim().toUpperCase())>-1)return String(s).trim().toUpperCase();return CR_UFN[t]||""}
/* "Zona Industrial – Sorocaba –SP", "Indaiatuba SP 13347-636", "São Roque da Chave , Itupeva - SP." */
function crLoc(s){
  var o={cep:"",uf:"",cidade:"",resto:[]};s=String(s||"").replace(/\bbrasil\b\.?/i,"");
  var c=s.match(/\b\d{5}-?\d{3}\b/);if(c){o.cep=cepFmt(c[0]);s=s.replace(c[0]," ")}
  var parts=s.split(/\s*[–,\/]\s*|\s+-\s*|\s*-\s+|\s*-(?=[A-Z]{2}\b)/).map(function(p){return p.replace(/^[\s.]+|[\s.]+$/g,"")}).filter(Boolean);
  if(parts.length){var last=parts[parts.length-1],m=last.match(/^(.*?)\s+([A-Za-z]{2})\.?$/);
    if(crUf(last)){o.uf=crUf(last);parts.pop()}else if(m&&crUf(m[2])&&UFS.indexOf(m[2].toUpperCase())>-1){o.uf=m[2].toUpperCase();parts[parts.length-1]=m[1]}}
  if(parts.length){o.cidade=parts.pop()}
  o.resto=parts;return o;
}
/* "Avenida Victor Andrew, n° 1250" · "Rua Esmeralda Martini Paula 309  Comercial Vitória Martini" · "Rua Júlio Ribeiro, 117 piso superior, Vila Santana" */
function crEnd(s){
  s=String(s||"").replace(/^[:\s]+/,"").replace(/\s{2,}/g,"  ");
  var m=s.match(/^(.*?)[,\s]+(?:n[º°o]\.?\s*|n[úu]mero\s*)?(\d{1,3}(?:\.\d{3})+|\d{1,6}[A-Za-z]?)(?![\d.\/-])\s*(.*)$/i);
  if(!m)return{rua:s.trim(),num:"",resto:""};
  return{rua:m[1].replace(/[,\s]+$/,"").trim(),num:m[2],resto:m[3].replace(/^[,\-–\s]+/,"").trim()};
}
var CR_SUF=/\b(ltda\.?|eireli|s\.?\/?a\.?|me|epp|mei|s\/s|cia\.?|ind[uú]stria|com[ée]rcio)\s*\.?$/i;
function crRazao(L,Z,cn){
  var best=null;
  L.forEach(function(l,i){if(Z[i]!==0)return;
    var t=l.replace(/^[:\s]+/,""),nx=L[i+1]||"",join=t;
    if(!CR_SUF.test(t)&&nx&&CR_SUF.test(nx)&&t===t.toUpperCase()&&nx===nx.toUpperCase()&&!/\d/.test(nx))join=t+" "+nx;
    if(!CR_SUF.test(join)||/@|\d{4}/.test(join)||join.length<6||CR_MAIN.test(t))return;
    var s=1;if(/^:/.test(l))s+=3;if(join===join.toUpperCase())s+=1;if(cn!=null&&Math.abs(cn-i)<=3)s+=1;if(/^(raz|nome)/i.test(l))s+=4;
    if(!best||s>best.s)best={v:join.trim(),s:s,i:i}});
  return best;
}
function crLer(texto,col,own){
  own=(own||[]).map(dig);
  var L=crNorm(texto),Z=crZonas(L),a={tipoDocumento:"ficha cadastral",razao:"",fantasia:"",cnpj:"",ie:"",rua:"",num:"",compl:"",bairro:"",cidade:"",uf:"",cep:"",tel:"",contato:"",email:"",emailNf:"",banco:"",ag:"",cc:"",pix:"",pagamento:"",obs:"",referencias:[],correspondeA:"",duvidas:[]};
  var duv=function(c,m){a.duvidas.push({campo:c,motivo:m})},obs=[],v;
  if(!L.length){a.tipoDocumento="arquivo sem texto";return{a:a,ok:false,campos:0}}
  /* CNPJ */
  var cs=crCnpjs(L,Z,own),cnI=null;
  if(cs.length){a.cnpj=cnpjFmt(cs[0].k);cnI=cs[0].i;if(cs.length>1&&cs[1].s===cs[0].s)duv("cnpj","Há mais de um CNPJ na ficha ("+cs.map(function(x){return cnpjFmt(x.k)}).join(", ")+"). Confira qual é o da empresa.")}
  else{var bad=L.join(" ").match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);if(bad){a.cnpj=cnpjFmt(bad[0])}}
  /* razão e fantasia */
  v=crVal(L,Z,"razao",0);if(v)a.razao=v.v;
  else{var rz=crRazao(L,Z,cnI);if(rz){a.razao=rz.v;duv("razao","Razão social deduzida (a ficha não traz o rótulo ao lado). Confira.")}}
  v=crVal(L,Z,"fantasia",0);if(v)a.fantasia=v.v;
  /* inscrições */
  v=crVal(L,Z,"ie",0);if(v){var ie=v.v.match(/[\d][\d.\/-]*\d|isento/i);a.ie=ie?ie[0]:v.v}
  v=crVal(L,Z,"im",0);if(v&&/\d/.test(v.v))obs.push("Inscrição municipal: "+v.v.match(/[\d][\d.\/-]*/)[0]);
  /* endereço */
  var ve=crVal(L,Z,"end",0,{ok:function(x){return/\d/.test(x)&&/[a-zà-ú]{3}/i.test(x)}}),loc=null;
  if(ve){var lab=/^rua\b/i.test(L[ve.i].replace(/^[^a-z]*/i,""))&&!/endere/i.test(L[ve.i]);var e=crEnd((lab?"Rua ":"")+ve.v);
    a.rua=e.rua;a.num=e.num;
    if(e.resto){var lr=crLoc(e.resto);if(lr.cep)a.cep=lr.cep;if(lr.uf)a.uf=lr.uf;
      var rs=lr.resto.concat(lr.cidade?[lr.cidade]:[]);
      if(lr.uf&&lr.cidade){a.cidade=lr.cidade;rs=lr.resto}
      rs.forEach(function(p){if(/^(piso|sala|andar|bloco|galp[ãa]o|lote|quadra|conj|apto|km)\b/i.test(p))a.compl=a.compl?a.compl+", "+p:p;else if(!a.bairro)a.bairro=p})}}
  else{  /* sem rótulo: primeira linha que começa com tipo de logradouro */
    for(var i=0;i<L.length;i++){if(Z[i]===0&&/^(rua|r\.|av\.?|avenida|rodovia|rod\.|estrada|alameda|al\.|travessa|pra[çc]a)\s/i.test(L[i].replace(/^[:\s]+/,""))){var e2=crEnd(L[i]);a.rua=e2.rua;a.num=e2.num;if(e2.resto){var l2=crLoc(e2.resto);a.bairro=l2.resto[0]||l2.cidade;if(l2.uf){a.uf=l2.uf;a.cidade=l2.resto.length?l2.cidade:"";if(!l2.resto.length)a.bairro=""}}duv("rua","Endereço achado sem rótulo. Confira.");break}}
  }
  v=crVal(L,Z,"num",0,{inicio:true});if(v&&!a.num){var nn=v.v.match(/^\d+[A-Za-z]?/);if(nn)a.num=nn[0]}
  v=crVal(L,Z,"compl",0);if(v)a.compl=v.v;
  v=crVal(L,Z,"bairro",0);if(v){var lb=crLoc(v.v);if(lb.uf||lb.cep){a.bairro=lb.resto.join(" - ")||(!a.cidade?"":lb.cidade);if(!a.cidade&&lb.resto.length)a.cidade=lb.cidade;if(!a.uf)a.uf=lb.uf;if(!a.cep&&lb.cep)a.cep=lb.cep;if(!a.bairro&&!lb.resto.length)a.bairro=lb.cidade}else a.bairro=v.v}
  v=crVal(L,Z,"cidade",0);if(v){var lc=crLoc(v.v);if(lc.cidade)a.cidade=lc.cidade;if(lc.uf&&!a.uf)a.uf=lc.uf;if(lc.cep&&!a.cep)a.cep=lc.cep}
  v=crVal(L,Z,"uf",0);if(v&&!a.uf&&crUf(v.v))a.uf=crUf(v.v);
  v=crVal(L,Z,"cep",0);if(v){var cp=v.v.match(/\d{5}-?\d{3}/);if(cp)a.cep=cepFmt(cp[0])}
  if(!a.cep){for(var j=0;j<L.length;j++){if(Z[j]!==0)continue;var cc0=L[j].match(/\b\d{5}-\d{3}\b/);if(cc0&&!/\(\d{2}\)/.test(L[j])){a.cep=cepFmt(cc0[0]);break}}}
  if(!a.cidade||!a.uf){  /* linha "Bairro, Cidade, UF" sem rótulo */
    for(var k=0;k<L.length;k++){if(Z[k]!==0||/@/.test(L[k]))continue;var lk=crLoc(L[k].replace(/^[^:]*:\s*/,""));
      if(lk.uf&&lk.cidade&&!/\d/.test(lk.cidade)&&lk.cidade.length<40){if(!a.cidade){a.cidade=lk.cidade;duv("cidade","Cidade achada sem rótulo. Confira.")}if(!a.uf)a.uf=lk.uf;if(!a.bairro&&lk.resto.length)a.bairro=lk.resto[lk.resto.length-1];break}}}
  if(a.bairro&&a.cidade&&crSem(a.bairro)===crSem(a.cidade))a.bairro="";
  /* telefones (só da empresa) */
  var tels=[];
  L.forEach(function(l,i){if(Z[i]!==0)return;var tl=new RegExp(CR_L.tel,"i").test(l),prev=i>0&&Z[i-1]===0&&/^(telefones?|fones?)\s*:?\s*$/i.test(L[i-1]),fs=crFones(l);
    if(!fs.length)return;if(tl||prev||/^\(\d{2}\)/.test(l)||new RegExp("^"+CR_L.tel,"i").test(L[i-1]||""))fs.forEach(function(f){if(tels.indexOf(f)<0)tels.push(f)})});
  a.tel=tels.slice(0,4).join(" · ");
  /* e-mails */
  var em=[],nf=[],out=[],lastLab="";
  L.forEach(function(l,i){if(Z[i]===1)return;var es=crEmails(l);
    if(/^[^@]{2,40}:\s*$/.test(l)){lastLab=l;return}
    if(!es.length){if(/:/.test(l))lastLab="";return}
    var ctx=crSem(l.split(es[0])[0]+" "+(es.length?"":lastLab)+" "+(l.indexOf(":")<0?lastLab:""));
    es.forEach(function(x){
      if(/nota|nf|fatura|xml|boleto|fiscal/.test(ctx)||(/^(nfe?|xml|fatura|faturamento)[._-]/.test(x)&&!/comercial|vendas/.test(ctx)))nf.indexOf(x)<0&&nf.push(x);
      else if(/financeiro|compra|cobran|rh\b|contab/.test(ctx))out.indexOf(x)<0&&out.push(x);
      else em.indexOf(x)<0&&em.push(x)})});
  if(!em.length&&out.length)em=out.splice(0,1);
  a.email=em.join("; ");a.emailNf=nf.join("; ");if(out.length)obs.push("Outros e-mails: "+out.join("; "));
  v=crVal(L,Z,"contato",0);if(v&&!/@|\d{4}/.test(v.v))a.contato=v.v;
  v=crVal(L,Z,"pagamento",0);if(v)a.pagamento=v.v;
  v=crVal(L,Z,"site",0);if(v)obs.push("Site: "+v.v.split(/\s/)[0]);
  /* banco: zona bancária ou rótulos */
  var bz=[];L.forEach(function(l,i){if(Z[i]===2||(Z[i]===0&&/\b(banco|ag[êe]ncia|\bag\b|c\/c|\bcc\b|conta)\b/i.test(l)))bz.push(i)});
  var nb=0,extra=[];
  bz.forEach(function(i){var l=L[i];
    var bn=null;CR_BANCOS.some(function(b){if(b[0].test(l)){bn=b[1];return true}});
    if(bn&&!/^pix/i.test(l)){nb++;if(nb===1){var bm=l.match(/banco\s+[A-Za-zÀ-ú .]+?(?=\s{2,}|\s+pix|\s*[-–:]|$)/i);a.banco=bm?bm[0].trim():bn}}
    if(nb>1){extra.push(l);return}
    var ag=l.match(new RegExp(CR_L.ag+"\\s*[:\\-–.]?\\s*(\\d[\\d.\\-]*)","i"));if(ag&&!a.ag)a.ag=ag[1].replace(/[.\-]$/,"");
    var cc=l.match(/(?:conta\s+corrente|c\s?\/\s?c|\bcc\b|conta)\s*[:\-–.]?\s*(\d[\d.\-]*[\dXx])/i);if(cc&&!a.cc)a.cc=cc[1]});
  if(extra.length)obs.push("Outra referência bancária: "+extra.join(" · "));
  v=crVal(L,Z,"pix",null);if(v){var pc=v.v.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/),pe=crEmails(v.v),pf=crFones(v.v);a.pix=pc?cnpjFmt(pc[0]):pe.length?pe[0]:pf.length?pf[0]:v.v.replace(/^cnpj\s*[-–:]?\s*/i,"")}
  /* referências comerciais */
  var R=null;
  function fecha(){if(R&&R.nome)a.referencias.push(R);R=null}
  L.forEach(function(l,i){if(Z[i]!==1)return;
    var t=l.replace(/^refer[êe]ncias?\s+comerciais\s*:?/i,"").trim();if(!t||crIsRefHead(l)&&!t)return;
    if(crIsRefHead(t)||/^fornecedores$/i.test(t))return;
    var fs=crFones(t),cep=t.match(/^\d{5}-?\d{3}$/),isEnd=/^(rua\b|r[.:]\s|av\s?\.?\s|avenida\b|rod\.?\s|rodovia\b|estrada\b|alameda\b|al\.\s)/i.test(t),isCont=/^contato/i.test(t);
    var pre=t.split(/\(\d{2}\)|\b\d{2}[\s-]?\d{4}/)[0].replace(/[\s\-–:]+$/,"").trim();
    if(/^cnpj/i.test(t)){if(R){var cj=t.match(/\d[\d.\/-]+/);if(cj)R.duvida=(R.duvida?R.duvida+" · ":"")+"CNPJ "+cj[0]}return}
    if(cep){if(R)R.cep=cepFmt(cep[0]);return}
    if(isEnd){if(R){var e3=crEnd(t.replace(/^r[.:]\s*/i,"Rua ").replace(/^av\s?\.\s*/i,"Av. ")),l3=crLoc(e3.resto);R.rua=e3.rua;R.num=e3.num;R.bairro=l3.resto.join(" - ");R.cidade=l3.cidade;R.uf=l3.uf;if(l3.cep)R.cep=l3.cep;
      if(/\d{4}-\d{4}\.\d/.test(t))R.duvida="CEP parece misturado com telefone: "+t}return}
    if(isCont||(!fs.length&&R&&!R.contato&&R.tel===""&&/^[A-ZÀ-Ú][a-zà-ú]+(\s[A-ZÀ-Ú][a-zà-ú]+)*$/.test(t)&&!CR_SUF.test(t))){if(R){R.contato=t.replace(/^contato\s*[:\-–]?\s*/i,"").replace(/^.*[–-]\s*/,"").trim();if(fs.length)R.tel=fs.join(" · ")}return}
    if(fs.length&&(!pre||(R&&/^[A-ZÀ-Ú][a-zà-ú]+$/.test(pre)&&!R.tel))){if(R){fs.forEach(function(f){if(R.tel.indexOf(f)<0)R.tel=(R.tel?R.tel+" · ":"")+f});if(pre&&!R.contato&&!new RegExp("^"+CR_L.tel+"\\s*:?$","i").test(pre))R.contato=pre}return}
    /* nome de empresa (com ou sem fone e contato na mesma linha) */
    fecha();R={nome:"",rua:"",num:"",bairro:"",cidade:"",uf:"",cep:"",contato:"",tel:"",duvida:""};
    R.nome=(pre.replace(/[\s\-–]+$/,"")||t).replace(/\s{2,}/g," ");
    if(fs.length){R.tel=fs.join(" · ");var pos=t.split(/\(?\d{2}\)?[\s-]*\d{4,5}[\s.-]?\d{4}/).pop().replace(/^[\s\-–\/]+/,"").trim();if(pos&&/^[A-Za-zÀ-ú ]+$/.test(pos))R.contato=pos}
  });
  fecha();
  if(obs.length)a.obs=obs.join(". ")+".";
  /* conferências */
  if(!a.razao&&!a.fantasia)duv("razao","Razão social não encontrada.");
  if(!a.rua)duv("rua","Endereço não encontrado.");
  if(!a.cidade)duv("cidade","Cidade não encontrada.");
  if(a.cep&&a.tel&&a.tel.indexOf(dig(a.cep).slice(0,4))>-1)duv("cep","Confira se o CEP não está misturado com o telefone.");
  for(var kk in a){if(typeof a[kk]==="string")a[kk]=a[kk].replace(/\s{2,}/g," ").trim()}
  var campos=["razao","cnpj","ie","rua","num","bairro","cidade","uf","cep","tel","email"].filter(function(k){return a[k]}).length;
  if(!cs.length&&!a.razao)a.tipoDocumento="documento sem CNPJ nem razão social (talvez não seja ficha cadastral)";
  return{a:a,ok:!!(cs.length&&(a.razao||a.fantasia)&&campos>=5),campos:campos};
}
