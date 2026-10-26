import sys
f=sys.argv[1];s=open(f,encoding='utf8').read();fol=open(sys.argv[2],encoding='utf8').read()
def swap(start,end,new):
    global s
    i=s.find(start);assert i>=0,start
    j=s.find(end,i+len(start));assert j>=0,end
    s=s[:i]+new+s[j:]
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:110]); s=s.replace(a,b)

FMT=r'''  "FORMATO DA RESPOSTA (obrigatório):\n1) Primeiro um bloco ```json com: {\"processo\":\"código MIX da peça, ex.: MIX-GCT-12.00.08\",\"part_number\":\"part number/código do cliente\",\"codigo\":\"nº do desenho\",\"revisao\":\"\",\"cliente\":\"\",\"descricao\":\"\",\"material\":\"\",\"operacoes\":[{\"op\":\"OP10\",\"descricao\":\"o que esta operação usina, em uma ou duas frases\",\"fixacao\":\"\",\"zero\":\"\",\"nota\":\"cuidados para o operador\",\"dispositivo\":\"morsa, placa, calços…\",\"contorno\":[[x,y],…],\"circulos\":[[cx,cy,r],…],\"ferramentas\":[{\"t\":\"T01\",\"nome\":\"\",\"classe\":\"\",\"suporte\":\"\",\"balanco\":\"\",\"s\":0,\"f\":0,\"uso\":\"\"}]}],\"premissas\":[\"...\"],\"duvidas\":[\"...\"]}\n"+
  "   contorno = contorno externo da peça vista de cima, em mm, nas coordenadas do zero peça desta operação; circulos = furos/rebaixos vistos de cima. Servem de fundo para o percurso.\n"+
  "2) Para cada operação, um bloco com o desenho de MONTAGEM em SVG:\n```svg OP10\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"...\">…</svg>\n```\n"+
  "   Guia da montagem (desenhado para esta peça): 2 ou 3 vistas lado a lado (vista principal de cima ou frontal + corte mostrando apoio e folga embaixo; se houver tombos, uma tira com a sequência 1-2-3 com o lado usinado em vermelho). Peça: preenchimento #E8EAF2 e contorno #010066; furos em branco com centro marcado. Morsa/castanhas/placa: #C9CCD8 com hachura (linhas diagonais). Paralelos e calços: retângulos tracejados vermelhos #EC3237 na vista de cima ou rosa claro #FFE3E4 no corte. Zero peça: cruz vermelha com rótulo (X0 Y0, Z0). Face a usinar: faixa vermelha translúcida. Textos curtos em vermelho apontando o que importa (ex.: folga ≥ 10). Sem cotas completas. Só elementos SVG básicos (rect, line, path, circle, polygon, text, g); sem imagens, scripts ou fontes externas; viewBox proporcional a 184x63.\n"+
  "3) Depois, um bloco por operação com o programa, na mesma ordem:\n```nc OP10\n%\n(...programa completo...)\n%\n```\nNada fora desses blocos.";
}
function cnParse(t){
  t=String(t||"");var meta={},ncs=[],svgs={},re=/```([A-Za-z]*)[ \t]*([A-Za-z]*-?\d*)?[ \t]*\n([\s\S]*?)```/g,x,ord=0;
  while((x=re.exec(t))){var lang=(x[1]||"").toLowerCase(),tag=(x[2]||"").toUpperCase().replace("-",""),body=x[3].trim();if(!body)continue;
    if(lang==="json"||(!lang&&/^\{/.test(body))){try{meta=JSON.parse(body)}catch(e){}continue}
    if(lang==="svg"||/^<svg[\s>]/i.test(body)){svgs[tag||("#"+ord)]=body;ord++;continue}
    if(/^\{/.test(body))continue;
    ncs.push({op:tag,nc:body})}
  var svgList=Object.keys(svgs).map(function(k){return svgs[k]});
  var ops=(Array.isArray(meta.operacoes)?meta.operacoes:[]).map(function(o,i){var key=String(o.op||"").toUpperCase().replace("-",""),n=ncs.filter(function(z){return z.op&&key===z.op})[0]||ncs[i]||{};
    return{op:String(o.op||n.op||"OP"+(i+1)*10).toUpperCase(),descricao:String(o.descricao||""),zero:String(o.zero||""),fixacao:String(o.fixacao||""),nota:String(o.nota||""),dispositivo:String(o.dispositivo||""),tempo:String(o.tempo||""),
      contorno:Array.isArray(o.contorno)?o.contorno.slice(0,400):[],circulos:Array.isArray(o.circulos)?o.circulos.slice(0,80):[],montagem_svg:(svgs[key]||svgList[i]||"").slice(0,60000),
      ferramentas:(Array.isArray(o.ferramentas)?o.ferramentas:[]).slice(0,25).map(function(f){return{t:String(f.t||""),nome:String(f.nome||""),classe:String(f.classe||""),suporte:String(f.suporte||""),balanco:String(f.balanco==null?"":f.balanco),s:f.s==null?"":f.s,f:f.f==null?"":f.f,uso:String(f.uso||"")}}),nc:n.nc||""}});
  if(!ops.length)ops=ncs.map(function(n,i){return{op:n.op||"OP"+(i+1)*10,fixacao:"",tempo:"",ferramentas:[],montagem_svg:svgList[i]||"",nc:n.nc}});
  return{meta:meta,ops:ops.filter(function(o){return o.nc})};
}
'''
swap('  "FORMATO DA RESPOSTA (obrigatório):','function cnJob(j,st,ms){',FMT)
# store processo / part_number
rep('''    var doc={codigo:String(m.codigo||j.f.name.replace(/\\.[^.]+$/,"")),rev:String(m.revisao||""),''','''    var doc={processo:String(m.processo||""),part_number:String(m.part_number||""),codigo:String(m.codigo||j.f.name.replace(/\\.[^.]+$/,"")),rev:String(m.revisao||""),''')
# tempo do registro vem do simulador
rep('''    if(doc.truncado)doc.duvidas.unshift("A resposta do agente foi cortada: confira se o último programa termina com M30 e %.");
    return PR.db.doc("programas_cnc/"+j.docId).update(doc)''','''    if(doc.truncado)doc.duvidas.unshift("A resposta do agente foi cortada: confira se o último programa termina com M30 e %.");
    doc.ops.forEach(function(o){var sm=cnSim(o.nc);o.tempoModelo=o.tempo;o.tempo=fmtT(sm.tempo);o.avisosSim=sm.avisos.slice(0,20)});
    return PR.db.doc("programas_cnc/"+j.docId).update(doc)''')
# insert folha module just before the "baixar, compartilhar" section end — append after cnFolhaDl
rep('''function cnFolhaDl(p){''',fol+'''\nfunction cnFolhaDl(p){''')
# detail: preview header text
rep('''<h3 style="margin:0">Folha de processo · prévia</h3>''','''<h3 style="margin:0">Folha de processo · prévia</h3><span class="hint">Tempo e percurso calculados do próprio programa (simulador M70)</span>''')
# list op time col & detail ops: "tempo estimado" not shown anymore. css
rep('.cn-folhas{display:flex;flex-direction:column;gap:16px}','''.cn-folhas{display:flex;flex-direction:column;gap:18px;align-items:center}
.cn-folha-svg{width:100%;max-width:860px;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.14);border:1px solid #c9cfe0}
.cn-folha-svg svg{display:block;width:100%;height:auto}''')
open(f,'w',encoding='utf8').write(s)
print('ok')
