
/* ===== Folha de processo no molde do agente CNC (agente-cnc-folha-padrao.md, 23/10/2026) ===== */
/* --- simulador M70 (porte do simm70.py) --- */
function simM70(text){
  var RAP=24000,TROCA=8,RET=1;
  var raw=String(text||"").replace(/\r/g,"").split("\n");
  var lines=raw.map(function(l){var t=l.replace(/\([^)]*\)/g,"").toUpperCase().trim(),tk=[],re=/([A-Z])\s*([-+]?\d*\.?\d+|[-+]?\d+\.)/g,m;while((m=re.exec(t)))tk.push([m[1],m[2]]);return tk});
  var labels={};lines.forEach(function(tk,i){if(tk.length&&tk[0][0]==="N")labels[parseInt(parseFloat(tk[0][1]))]=i});
  var st={x:0,y:0,z:200,abs:true,mode:0,f:0,s:0,t:null,h:null,comp:40,d:null,cyc:null,r:null,zc:null,q:null,ox:0,oy:0,spiral:false};
  var tempo=0,avisos=[],cam=[],por={},atual="inicio",stack=[],pc=0,passos=0;
  function add(t){tempo+=t;por[atual]=(por[atual]||0)+t}
  function dist3(a,b){return Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2)+Math.pow(a[2]-b[2],2))}
  function furo(x,y){var prof=st.r-st.zc;
    if(st.cyc===84){var fz=st.f<20?st.f*st.s:st.f;add(2*prof/fz*60)}
    else{add(prof/st.f*60);if(st.cyc===83&&st.q){var n=Math.ceil(prof/st.q);add(n*2*(prof/2)/RAP*60)}}
    add(RET);cam.push([atual,"furo",[x,y,st.zc]]);st.x=x;st.y=y}
  while(pc<lines.length){
    passos++;if(passos>3000000){avisos.push("loop infinito?");break}
    var tk=lines[pc];pc++;if(!tk.length)continue;
    var w={},gs=[],me={},curAbs=st.abs;
    tk.forEach(function(p){var k=p[0],v=parseFloat(p[1]);if(k==="G"){gs.push(v);if(v===90)curAbs=true;else if(v===91)curAbs=false}else if(!(k in w)){w[k]=v;me[k]=curAbs}});
    var ms=tk.filter(function(p){return p[0]==="M"}).map(function(p){return parseInt(parseFloat(p[1]))});
    var has=function(g){return gs.indexOf(g)>-1};
    gs.forEach(function(g){
      if(g===0||g===1||g===2||g===3){st.mode=g;st.spiral=false}
      else if(Math.abs(g-2.1)<1e-6||Math.abs(g-3.1)<1e-6){st.mode=Math.floor(g);st.spiral=true}
      else if(g===90)st.abs=true;else if(g===91)st.abs=false;
      else if(g===40||g===41||g===42)st.comp=g;
      else if(g===80)st.cyc=null;
      else if([73,81,82,83,84].indexOf(g)>-1)st.cyc=g;
      else if(g===43)st.h="H" in w?w.H:-1;
      else if(g===53)add("Z" in w?Math.abs(200-st.z)/RAP*60:1);
    });
    if(has(28)||has(4)){add(1);continue}
    if(has(34)){
      if(!st.cyc){avisos.push("linha "+pc+": G34 sem ciclo ativo");continue}
      var cx=(w.X||0)+st.ox,cy=(w.Y||0)+st.oy,R=w.I||0,a0=w.J||0,K=parseInt(w.K||1);
      for(var i=0;i<K;i++){var ang=(a0+360*i/K)*Math.PI/180,x=cx+R*Math.cos(ang),y=cy+R*Math.sin(ang);add(Math.hypot(x-st.x,y-st.y)/RAP*60);furo(x,y)}
      continue}
    if(has(52)){st.ox=w.X||0;st.oy=w.Y||0;continue}
    if(has(53))continue;
    if("F" in w)st.f=w.F;
    if("S" in w)st.s=parseInt(w.S);
    if("D" in w){st.d=parseInt(w.D);if(st.t!==null&&st.d!==st.t)avisos.push("linha "+pc+": D"+st.d+" diferente de T"+st.t)}
    if(has(43)&&st.t!==null&&st.h!==st.t)avisos.push("linha "+pc+": H"+st.h+" diferente de T"+st.t);
    if("T" in w&&ms.indexOf(6)>-1){st.t=parseInt(w.T);var mm=/\(([^)]*)\)/.exec(raw[pc-1]);atual="T"+("0"+st.t).slice(-2)+" "+(mm?mm[1]:"");add(TROCA);st.h=null;continue}
    if(ms.indexOf(98)>-1){var nH=parseInt(w.H||0),L=parseInt("L" in w?w.L:1);if(!(nH in labels)){avisos.push("linha "+pc+": N"+nH+" não existe");continue}stack.push([pc,labels[nH]+1,L]);pc=labels[nH]+1;continue}
    if(ms.indexOf(99)>-1){if(!stack.length){avisos.push("linha "+pc+": M99 sem chamada");continue}var fr=stack[stack.length-1];fr[2]--;if(fr[2]>0)pc=fr[1];else{pc=fr[0];stack.pop()}continue}
    if(ms.indexOf(30)>-1)break;
    if(!("X" in w||"Y" in w||"Z" in w))continue;
    var tgt=function(k,cur,off){if(!(k in w))return cur;var ab=k in me?me[k]:st.abs;return ab?w[k]+off:cur+w[k]};
    var nx=tgt("X",st.x,st.ox),ny=tgt("Y",st.y,st.oy),nz=tgt("Z",st.z,0);
    if(st.cyc&&!(has(0)||has(1)||has(2)||has(3))){
      if("R" in w)st.r=w.R;if("Z" in w)st.zc=w.Z;if("Q" in w)st.q=w.Q;
      if(st.zc===null||st.r===null||st.f<=0){avisos.push("linha "+pc+": ciclo sem Z/R/F");continue}
      if("L" in w&&w.L===0){st.x=nx;st.y=ny;continue}
      add(Math.hypot(nx-st.x,ny-st.y)/RAP*60);furo(nx,ny);if(st.t===null)avisos.push("linha "+pc+": furo sem ferramenta");continue}
    var mode=st.mode,x0=st.x,y0=st.y,z0=st.z;
    if(mode===0){add(dist3([x0,y0,z0],[nx,ny,nz])/RAP*60);cam.push([atual,"g0",[[x0,y0,z0],[nx,ny,nz]]])}
    else if(mode===1){var d=dist3([x0,y0,z0],[nx,ny,nz]);if(st.f<=0)avisos.push("linha "+pc+": G1 sem F");else add(d/st.f*60);if(st.s===0)avisos.push("linha "+pc+": corte sem rotação");cam.push([atual,"g1",[[x0,y0,z0],[nx,ny,nz]]])}
    else{
      var voltas="P" in w?parseInt(w.P):0;
      if(!("I" in w||"J" in w||"R" in w)||("R" in w&&Math.hypot(nx-x0,ny-y0)<1e-6)){var d2=dist3([x0,y0,z0],[nx,ny,nz]);if(st.f>0)add(d2/st.f*60);cam.push([atual,"g1",[[x0,y0,z0],[nx,ny,nz]]]);st.x=nx;st.y=ny;st.z=nz;continue}
      var ccx,ccy;
      if("I" in w||"J" in w){ccx=x0+(w.I||0);ccy=y0+(w.J||0)}
      else{var Rr=w.R,mx=(x0+nx)/2,my=(y0+ny)/2,q=Math.hypot(nx-x0,ny-y0),hh=Math.sqrt(Math.max(Rr*Rr-q*q/4,0)),ux=-(ny-y0)/q,uy=(nx-x0)/q,sg=((mode===3)===(Rr>0))?1:-1;ccx=mx+sg*hh*ux;ccy=my+sg*hh*uy}
      var r1=Math.hypot(x0-ccx,y0-ccy),r2=Math.hypot(nx-ccx,ny-ccy);
      if(Math.abs(r1-r2)>0.01&&!st.spiral)avisos.push("linha "+pc+": arco com raio inconsistente "+r1.toFixed(3)+"/"+r2.toFixed(3));
      var A0=Math.atan2(y0-ccy,x0-ccx),A1=Math.atan2(ny-ccy,nx-ccx),TW=2*Math.PI,da;
      if(mode===3)da=((A1-A0)%TW+TW)%TW;else da=-(((A0-A1)%TW+TW)%TW);
      if(Math.abs(da)<1e-9)da=mode===3?TW:-TW;
      if(voltas>1)da+=(voltas-1)*TW*(mode===3?1:-1);
      var rm=(r1+r2)/2,LL=Math.hypot(Math.abs(da)*rm,nz-z0);if(st.f>0)add(LL/st.f*60);
      var pts=[],n=Math.min(1500,Math.max(8,Math.floor(Math.abs(da)*rm/2)));
      for(var k=0;k<=n;k++){var aa=A0+da*k/n,ri=r1+(r2-r1)*k/n;pts.push([ccx+ri*Math.cos(aa),ccy+ri*Math.sin(aa),z0+(nz-z0)*k/n])}
      cam.push([atual,"arc",pts]);
    }
    st.x=nx;st.y=ny;st.z=nz;
  }
  if(stack.length)avisos.push("subrotina sem M99 no fim");
  var seen={};avisos=avisos.filter(function(a){if(seen[a])return false;seen[a]=1;return true});
  return{tempo:tempo,porFerr:por,avisos:avisos,caminho:cam};
}
var SIMC={};
function cnSim(nc){var k=String(nc||"");var key=k.length+":"+k.slice(0,80)+":"+k.slice(-80);if(SIMC[key])return SIMC[key];var r;try{r=simM70(k)}catch(e){r={tempo:0,porFerr:{},avisos:["simulador falhou: "+(e&&e.message)],caminho:[]}}SIMC[key]=r;return r}
function fmtT(s){s=Math.round(s||0);return("0"+Math.floor(s/3600)).slice(-2)+":"+("0"+Math.floor(s%3600/60)).slice(-2)+":"+("0"+s%60).slice(-2)}
function cnTempo(p){var t=0;(p.ops||[]).forEach(function(o){t+=cnSim(o.nc).tempo});if(!t)return"–";var m=Math.round(t/60);return m>=60?Math.floor(m/60)+"h"+("0"+m%60).slice(-2):m+" min"}
function cnToolTime(sim,t){var tot=0,key=String(t||"").toUpperCase().replace(/^T(\d)$/,"T0$1");for(var k in sim.porFerr){if(k==="inicio")continue;if(k.split(" ")[0]===key)tot+=sim.porFerr[k]}return tot}

/* --- SVG da folha (A4 retrato, mm) --- */
var FV={verm:"#EC3237",azul:"#010066",cinza:"#F2F3F7",linha:"#9AA0B4",rot:"#555A70",ff:"Helvetica, Arial, sans-serif"};
function fx(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function fwrap(s,wmm,pt,bold){var cw=pt*0.3528*(bold?0.58:0.53),max=Math.max(4,Math.floor(wmm/cw)),out=[];String(s==null?"":s).split(/\n/).forEach(function(par){var cur="";par.split(/\s+/).forEach(function(wd){if(!wd)return;while(wd.length>max){if(cur){out.push(cur);cur=""}out.push(wd.slice(0,max));wd=wd.slice(max)}var t=cur?cur+" "+wd:wd;if(t.length<=max)cur=t;else{out.push(cur);cur=wd}});out.push(cur)});return out}
function ftext(x,y,s,pt,o){o=o||{};return'<text x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" font-family="'+FV.ff+'" font-size="'+(pt*0.3528).toFixed(3)+'"'+(o.bold?' font-weight="bold"':'')+' fill="'+(o.c||"#000")+'"'+(o.a?' text-anchor="'+o.a+'"':'')+'>'+fx(s)+'</text>'}
function fbox(x,y,w,h,rot,val,pt,o){o=o||{};var s=(o.fill?'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+o.fill+'"/>':'')+'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="'+FV.linha+'" stroke-width="0.18"/>';
  s+=ftext(x+1.4,y+2.6,rot,5.8,{c:FV.rot});
  var ls=fwrap(val,w-4,pt,o.bold),lh=(pt+1.6)*0.3528,yy=y+2.6+(pt+1.5)*0.3528,maxL=Math.max(1,Math.floor((h-2.6-1)/lh));
  if(ls.length>maxL){ls=ls.slice(0,maxL);ls[maxL-1]=ls[maxL-1].replace(/.{0,2}$/,"…")}
  ls.forEach(function(l){s+=ftext(x+2,yy,l,pt,{bold:o.bold,c:o.c});yy+=lh});return s}
function fSanSvg(src){
  if(!src)return null;
  try{var doc=new DOMParser().parseFromString(String(src),"image/svg+xml"),sv=doc.documentElement;if(!sv||sv.nodeName.toLowerCase()!=="svg"||doc.getElementsByTagName("parsererror").length)return null;
    Array.prototype.slice.call(sv.querySelectorAll("script,foreignObject,iframe,image,use,a,style")).forEach(function(n){n.parentNode.removeChild(n)});
    Array.prototype.slice.call(sv.querySelectorAll("*")).concat([sv]).forEach(function(n){Array.prototype.slice.call(n.attributes).forEach(function(at){if(/^on/i.test(at.name)||/href$/i.test(at.name)||/url\(\s*['"]?(https?:|\/\/)/i.test(at.value))n.removeAttribute(at.name)})});
    var vb=sv.getAttribute("viewBox");if(!vb){var w=parseFloat(sv.getAttribute("width"))||800,h=parseFloat(sv.getAttribute("height"))||400;vb="0 0 "+w+" "+h}
    return{vb:vb,inner:sv.innerHTML}}catch(e){return null}
}
var FCORES=["#010066","#EC3237","#2E8B57","#D98E04","#6A3D9A","#1F78B4"];
function fPercurso(o,x,y,w,h){
  var sim=cnSim(o.nc),ferr=[],segs=[];
  sim.caminho.forEach(function(c){if(c[0]==="inicio"||c[1]==="g0")return;if(ferr.indexOf(c[0])<0)ferr.push(c[0]);segs.push(c)});
  var xs=[0],ys=[0];
  segs.forEach(function(c){if(c[1]==="furo"){xs.push(c[2][0]);ys.push(c[2][1])}else c[2].forEach(function(p){xs.push(p[0]);ys.push(p[1])})});
  var cont=Array.isArray(o.contorno)?o.contorno.filter(function(p){return Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1])}):[];
  var circ=Array.isArray(o.circulos)?o.circulos.filter(function(c){return Array.isArray(c)&&c.length>=3&&isFinite(c[2])}):[];
  cont.forEach(function(p){xs.push(+p[0]);ys.push(+p[1])});circ.forEach(function(c){xs.push(c[0]-c[2],c[0]+c[2]);ys.push(c[1]-c[2],c[1]+c[2])});
  var x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);
  var pad=Math.max((x1-x0),(y1-y0))*0.06+1;x0-=pad;x1+=pad;y0-=pad;y1+=pad;
  var ah=h-8,aw=w-4,sc=Math.min(aw/Math.max(x1-x0,1),ah/Math.max(y1-y0,1)),ox=x+2+(aw-(x1-x0)*sc)/2,oy=y+4+(ah-(y1-y0)*sc)/2;
  function P(px,py){return[(ox+(px-x0)*sc).toFixed(2),(oy+(y1-py)*sc).toFixed(2)]}
  var s='<clipPath id="cp'+Math.round(x)+'_'+Math.round(y)+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/></clipPath><g clip-path="url(#cp'+Math.round(x)+'_'+Math.round(y)+')">';
  if(cont.length>2)s+='<polygon points="'+cont.map(function(p){return P(+p[0],+p[1]).join(",")}).join(" ")+'" fill="'+FV.cinza+'" stroke="#555" stroke-width="0.25"/>';
  else{var bx=Math.min.apply(null,xs.slice(1).concat([0])),bX=Math.max.apply(null,xs.slice(1).concat([0])),by=Math.min.apply(null,ys.slice(1).concat([0])),bY=Math.max.apply(null,ys.slice(1).concat([0]));var a=P(bx,bY),b=P(bX,by);s+='<rect x="'+a[0]+'" y="'+a[1]+'" width="'+(b[0]-a[0]).toFixed(2)+'" height="'+(b[1]-a[1]).toFixed(2)+'" fill="'+FV.cinza+'" stroke="#999" stroke-width="0.2" stroke-dasharray="1 0.8"/>'}
  circ.forEach(function(c){var q=P(c[0],c[1]);s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+(c[2]*sc).toFixed(2)+'" fill="none" stroke="#999" stroke-width="0.18" stroke-dasharray="0.8 0.6"/>'});
  ferr.forEach(function(f,i){var cor=FCORES[i%FCORES.length],d="";
    segs.forEach(function(c){if(c[0]!==f)return;if(c[1]==="furo"){var q=P(c[2][0],c[2][1]);s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="0.9" fill="'+cor+'"/>'}else{var pts=c[2],step=Math.max(1,Math.floor(pts.length/400));d+="M"+P(pts[0][0],pts[0][1]).join(" ");for(var k=step;k<pts.length;k+=step)d+="L"+P(pts[k][0],pts[k][1]).join(" ");var l=pts[pts.length-1];d+="L"+P(l[0],l[1]).join(" ")}});
    if(d)s+='<path d="'+d+'" fill="none" stroke="'+cor+'" stroke-width="0.28" stroke-linejoin="round"/>'});
  var z=P(0,0);s+='<path d="M'+(z[0]-2.2)+' '+z[1]+'h4.4M'+z[0]+' '+(z[1]-2.2)+'v4.4" stroke="'+FV.verm+'" stroke-width="0.5"/>'+ftext(+z[0]+1.4,+z[1]-1.2,"X0 Y0",6,{c:FV.verm});
  s+='</g>';
  var lx=x+3,ly=y+h-2;ferr.slice(0,6).forEach(function(f,i){var cor=FCORES[i%FCORES.length];s+='<rect x="'+lx+'" y="'+(ly-1.6)+'" width="3" height="1.2" fill="'+cor+'"/>'+ftext(lx+4,ly-0.5,f.split(" ")[0],5.5,{c:"#333"});lx+=14});
  if(!segs.length)s+=ftext(x+w/2,y+h/2,"Sem percurso (programa vazio)",7,{c:FV.rot,a:"middle"});
  return s;
}
function cnFolhaSvg(p,o,n,total){
  var c=cnCmd(p.comando)||{},E=empData(),val=p.status==="validado",sim=cnSim(o.nc),X=10,W=190,y=10,s="";
  var dt=new Date(p.criado||Date.now()).toLocaleDateString("pt-BR");
  s+='<rect x="0" y="0" width="210" height="297" fill="#fff"/>';
  s+='<rect x="'+X+'" y="'+y+'" width="'+W+'" height="24" fill="none" stroke="'+FV.linha+'" stroke-width="0.18"/>';
  s+='<image x="'+(X+2)+'" y="'+(y+3.3)+'" width="38" height="17.4" preserveAspectRatio="xMidYMid meet" href="'+fx(E.logoPng)+'"/>';
  s+=ftext(X+W/2-8,y+11,"FOLHA DE OPERAÇÃO DE PROCESSO",14,{bold:true,c:FV.azul,a:"middle"})+ftext(X+W/2-8,y+16,"Roteiro de fabricação - Centro de usinagem",8,{c:FV.rot,a:"middle"});
  s+=fbox(X+W-55,y,55,12,"Processo nº",p.processo||cnIdTxt("programas_cnc",p),8.5,{c:FV.azul,bold:true})+fbox(X+W-55,y+12,55,12,"Part number (cliente)",p.part_number||((p.codigo||"")+(p.rev?" R"+p.rev:"")),8.5);
  y+=24;
  var xx=X;[[32,"Cliente",p.cliente||"–"],[58,"Descrição",p.descricao||"–"],[26,"Data",dt],[20,"Revisão",p.rev||"–"],[22,"Nº Operação",String(o.op||"").replace(/^OP-?/i,"")],[32,"Estação",c.maq||""]].forEach(function(cc){var op=cc[1]==="Nº Operação";s+=fbox(xx,y,cc[0],11,cc[1],cc[2],op?11:8.5,{c:op?FV.verm:"#000",bold:op});xx+=cc[0]});
  y+=11;xx=X;[[54,"Material",p.material||p.materialInf||"–"],[90,"Descrição da operação",o.descricao||"–"],[46,"Responsável técnico",p.responsavel||"________________"]].forEach(function(cc){var d=cc[1]==="Descrição da operação";s+=fbox(xx,y,cc[0],11,cc[1],cc[2],8.5,{c:d?FV.azul:"#000",bold:d});xx+=cc[0]});
  y+=11;
  s+='<rect x="'+X+'" y="'+y+'" width="'+W+'" height="70" fill="none" stroke="'+FV.linha+'" stroke-width="0.18"/>'+ftext(X+1.4,y+2.6,"Montagem / fixação",5.8,{c:FV.rot});
  var mg=fSanSvg(o.montagem_svg);
  if(mg)s+='<svg x="'+(X+3)+'" y="'+(y+5)+'" width="'+(W-6)+'" height="63" viewBox="'+fx(mg.vb)+'" preserveAspectRatio="xMidYMid meet" overflow="hidden">'+mg.inner+'</svg>';
  else s+=ftext(X+W/2,y+35,"Desenho de montagem não fornecido pelo agente",8,{c:FV.rot,a:"middle"})+ftext(X+W/2,y+40,(o.fixacao||p.fixacaoInf||""),8,{c:FV.azul,a:"middle"});
  y+=70;
  var wl=W*0.52,wr=W-wl,yy=y;
  [["Fixação",o.fixacao||p.fixacaoInf||"–",13],["Zero peça / Obs.",o.zero||p.zeroInf||"–",13],["Nota",o.nota||(p.duvidas||[]).join(" · ")||"–",17]].forEach(function(b){s+=fbox(X,yy,wl,b[2],b[0],b[1],7.6);yy+=b[2]});
  var h2=(y+66-yy)/2;
  s+=fbox(X,yy,wl*0.6,h2,"Programa",cnFileName(p,o),7.6)+fbox(X+wl*0.6,yy,wl*0.4,h2,"Bruto (blank)",p.bruto||"–",7.6);
  s+=fbox(X,yy+h2,wl*0.6,h2,"Dispositivo",o.dispositivo||p.fixacaoInf||"–",7.6)+fbox(X+wl*0.6,yy+h2,wl*0.4,h2,"Ciclo (simulado)",fmtT(sim.tempo),11,{c:FV.verm,bold:true});
  s+='<rect x="'+(X+wl)+'" y="'+y+'" width="'+wr+'" height="66" fill="none" stroke="'+FV.linha+'" stroke-width="0.18"/>'+ftext(X+wl+1.4,y+2.6,"Percurso da ferramenta (vista de cima)",5.8,{c:FV.rot});
  s+=fPercurso(o,X+wl,y,wr,66);
  y+=66+3;
  s+='<rect x="'+X+'" y="'+y+'" width="'+W+'" height="7" fill="'+FV.azul+'"/>'+ftext(X+W/2,y+4.8,"Dados de ferramentas",9.5,{bold:true,c:"#fff",a:"middle"});y+=7;
  var hdr=[["#",10],["Ferramenta",46],["Classe",20],["Suporte",30],["Balanço mín.",20],["S (rpm)",16],["F (mm/min)",22],["Ciclo",26]];
  s+='<rect x="'+X+'" y="'+y+'" width="'+W+'" height="6" fill="'+FV.cinza+'"/>';xx=X;hdr.forEach(function(hh){s+=ftext(xx+hh[1]/2,y+4,hh[0],7,{bold:true,c:FV.azul,a:"middle"});xx+=hh[1]});y+=6;
  var fe=o.ferramentas||[],room=297-10-4-14-11-y,rh=fe.length?Math.max(4.2,Math.min(6,room/fe.length)):6;
  fe.forEach(function(f,i){if(y+rh>297-10-29)return;if(i%2)s+='<rect x="'+X+'" y="'+y+'" width="'+W+'" height="'+rh+'" fill="'+FV.cinza+'"/>';
    var vals=[f.t,f.nome,f.classe||"–",f.suporte||"–",f.balanco||"–",f.s,f.f,fmtT(cnToolTime(sim,f.t))];xx=X;
    hdr.forEach(function(hh,j){var v=fwrap(vals[j]==null?"":vals[j],hh[1]-2,7,j===0||j===7)[0]||"";s+=ftext(xx+hh[1]/2,y+rh/2+1,v,7,{bold:j===0||j===7,c:j===7?FV.verm:j===0?FV.azul:"#000",a:"middle"});xx+=hh[1]});
    s+='<line x1="'+X+'" y1="'+(y+rh)+'" x2="'+(X+W)+'" y2="'+(y+rh)+'" stroke="'+FV.linha+'" stroke-width="0.1"/>';y+=rh});
  if(!fe.length){s+=ftext(X+2,y+4,"Ferramentas não listadas pelo agente.",7,{c:FV.rot});y+=6}
  y+=4;var wa=W/3;
  [["Elaborado","Agente CNC - "+dt],["Simulado no CIMCO","___/___/______   visto: ________"],["Aprovado para produção",val?("Validado em "+new Date(p.validadoEm||Date.now()).toLocaleDateString("pt-BR")):"Nome: ________________  ___/___"]].forEach(function(b,k){s+=fbox(X+k*wa,y,wa,14,b[0],b[1],7.6)});
  y+=14;
  s+='<rect x="'+(X+W-48)+'" y="'+(y+2)+'" width="48" height="7" rx="1.5" fill="none" stroke="'+(val?"#26704A":FV.verm)+'" stroke-width="0.42"/>'+ftext(X+W-24,y+6.9,val?"VALIDADO":"AGUARDANDO VALIDAÇÃO",9,{bold:true,c:val?"#26704A":FV.verm,a:"middle"});
  if(sim.avisos.length)s+=ftext(X,y+6.9,"Simulador: "+sim.avisos.length+(sim.avisos.length===1?" aviso":" avisos")+" (ver no MISTA)",6.5,{c:FV.verm});
  s+=ftext(X+W,297-7,"Folha "+n+"/"+total,7,{bold:true,c:FV.azul,a:"end"});
  return'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 210 297" width="210mm" height="297mm">'+s+'</svg>';
}
function cnFolhaHtml(p,o,i){
  var ops=p.ops||[],sim=cnSim(o.nc);
  return'<div class="cn-folha-svg">'+cnFolhaSvg(p,o,i+1,ops.length)+'</div>'+(sim.avisos.length?'<div class="askbox" style="margin-top:6px">Simulador ('+esc(o.op||"")+'): '+sim.avisos.slice(0,6).map(esc).join(" · ")+(sim.avisos.length>6?" …":"")+'</div>':'');
}
/* --- PDF retrato a partir das páginas SVG --- */
function svgToJpeg(svg,pxW){return new Promise(function(ok,no){var im=new Image();im.onload=function(){var w=pxW,h=Math.round(pxW*297/210),cv=document.createElement("canvas");cv.width=w;cv.height=h;var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);try{ok({b:atob(cv.toDataURL("image/jpeg",0.9).split(",")[1]),w:w,h:h})}catch(e){no(e)}};im.onerror=function(){no(new Error("svg"))};im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)})}
function pdfJpegPages(pgs,title){
  var objs=[],np=pgs.length,kids=[],raw={},first=4;
  for(var i=0;i<np;i++)kids.push((first+i*3)+" 0 R");
  objs[1]="<< /Type /Catalog /Pages 2 0 R >>";objs[2]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+np+" >>";objs[3]="<< /Producer (MISTA - MIX USINAGEM) /Title ("+String(title||"").replace(/[()\\]/g,"").replace(/[^\x20-\x7e]/g,"")+") >>";
  pgs.forEach(function(g,k){var pid=first+k*3,iid=pid+1,cid=pid+2,st="q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
    objs[pid]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 "+iid+" 0 R >> >> /Contents "+cid+" 0 R >>";
    raw[iid]=g.b;objs[iid]="<< /Type /XObject /Subtype /Image /Width "+g.w+" /Height "+g.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+g.b.length+" >>";
    objs[cid]="<< /Length "+st.length+" >>\nstream\n"+st+"\nendstream"});
  var out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offs=[];
  for(var n=1;n<objs.length;n++){offs[n]=out.length;out+=raw[n]?n+" 0 obj\n"+objs[n]+"\nstream\n"+raw[n]+"\nendstream\nendobj\n":n+" 0 obj\n"+objs[n]+"\nendobj\n"}
  var xr=out.length;out+="xref\n0 "+objs.length+"\n0000000000 65535 f \n";for(var m=1;m<objs.length;m++)out+=("0000000000"+offs[m]).slice(-10)+" 00000 n \n";
  out+="trailer\n<< /Size "+objs.length+" /Root 1 0 R /Info 3 0 R >>\nstartxref\n"+xr+"\n%%EOF";
  var u=new Uint8Array(out.length);for(var q=0;q<out.length;q++)u[q]=out.charCodeAt(q)&255;return new Blob([u],{type:"application/pdf"});
}
function cnFolhaPDF(p){
  var ops=p.ops||[],pages=[],pr=Promise.resolve();
  ops.forEach(function(o,i){pr=pr.then(function(){return svgToJpeg(cnFolhaSvg(p,o,i+1,ops.length),1654)}).then(function(j){pages.push(j)})});
  return pr.then(function(){return pdfJpegPages(pages,(p.processo||p.codigo||"")+" - Folha de operacao")});
}
