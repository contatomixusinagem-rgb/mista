
/* ===== Simulador CNC 3D (etapas 1 e 2: animação + remoção de material) — gestor, 27/10/2026 =====
   Interpretação: simM70 (M70 e 802D ISO com opt.d="s802d") e simMach9; cada trecho do caminho traz [ferr, tipo, pontos, linha, S, F, dt].
   Material: mapa de alturas (grade 0,25–0,5 mm). Cada movimento rebaixa a faixa varrida pela ferramenta de uma vez (distância ao segmento),
   com perfil reto (fresa), ponta 118° (broca) ou 90° (escareador/centro). Desenho: three.js r128, carregado só ao abrir. */
function cnDialeto(nc,cmd){if(cmd==="mach9"||cmd==="s802d"||cmd==="m70")return cmd;var t=String(nc||"");if(/\bGZO\b|G45O\d|^\s*;/m.test(t))return"mach9";if(/G29[01]|\bREPEAT\b|TURN\s*=/.test(t))return"s802d";return"m70"}
function cnSimRun(nc,cmd){var d=cnDialeto(nc,cmd);return d==="mach9"?simMach9(nc):simM70(nc,{d:d})}
var SIM3={libs:null};
function sim3Libs(){
  if(SIM3.libs)return SIM3.libs;
  function load(src){return new Promise(function(ok,no){var s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=function(){no(new Error("Não consegui carregar "+src))};document.head.appendChild(s)})}
  SIM3.libs=(window.THREE?Promise.resolve():load("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js")).then(function(){return THREE.OrbitControls?null:load("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js")}).catch(function(e){SIM3.libs=null;throw e});
  return SIM3.libs;
}
/* ferramenta pelo nome (ou cadastro) */
function sim3Ferr(nome){
  var n=String(nome||"").toUpperCase(),cad=(typeof cnFerrCad==="function"&&cnFerrCad(nome.replace(/^T\d+\s*/,"")))||{},d=cnNum(cad.diametro);
  if(!d){var m=/(\d+(?:[.,]\d+)?)\s*MM/.exec(n)||/(?:MD|CAB|FRESA|BROCA|TMAX|T-MAX|ESCAREADOR|HSS|TOP|TOROIDAL|MACHO|ALARGADOR)[A-Z\- ]*?(\d+(?:[.,]\d+)?)/.exec(n)||/-(\d+(?:[.,]\d+)?)\b/.exec(n);d=m?cnNum(m[1]):null}
  var tipo=/ESCAR|CHANFR/.test(n)?"esc":/CENTRO/.test(n)?"centro":/BROCA|T-?MAX/.test(n)?"broca":"reta";
  if(!d)d=tipo==="centro"?3:10;if(/M(\d+)\s*X/.test(n)&&/MACHO/.test(n))tipo="reta";
  return{d:d,r:d/2,tipo:tipo,nome:String(nome||"").replace(/^T\d+\s*/,"")||"ferramenta",bal:cnNum(cad.balanco)||Math.max(30,d*3)};
}
/* linha do tempo: trechos com tempo inicial/final e pontos */
function sim3Linha(sim){
  var segs=[],t=0,pos=[0,0,200],RAP=24000;
  sim.caminho.forEach(function(c){
    var ferr=c[0],k=c[1],pts,line=c[3],s=c[4],f=c[5],dt=c[6]||0;
    if(k==="furo"){var x=c[2][0],y=c[2][1],zc=c[2][2],zr=c[2][3]!=null?c[2][3]:Math.max(pos[2],zc+2);pts=[pos.slice(),[x,y,Math.max(zr,zc)],[x,y,zc],[x,y,Math.max(zr,zc)]]}
    else if(k==="arc")pts=c[2].map(function(p){return p.slice()});else pts=c[2].map(function(p){return p.slice()});
    if(!pts.length)return;
    var L=[0];for(var i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]));
    var len=L[L.length-1],mt=k==="g0"?len/RAP*60:(k==="furo"?dt:(f>0?len/f*60:dt));mt=Math.min(mt,dt||mt);if(!(mt>0))mt=Math.min(dt,0.05);
    segs.push({ferr:ferr,k:k,pts:pts,L:L,len:len,line:line,s:s,f:f,t0:t,tm:t+Math.max(0,dt-mt),t1:t+Math.max(dt,mt)});
    t+=Math.max(dt,mt);pos=pts[pts.length-1].slice();
  });
  return{segs:segs,total:Math.max(t,sim.tempo||0)};
}
function sim3Pos(sg,t){var u=sg.t1>sg.tm?Math.max(0,Math.min(1,(t-sg.tm)/(sg.t1-sg.tm))):1,dl=u*sg.len,P=sg.pts,L=sg.L;
  if(P.length===1||dl<=0)return P[0].slice();for(var i=1;i<P.length;i++){if(L[i]>=dl){var a=(dl-L[i-1])/((L[i]-L[i-1])||1);return[P[i-1][0]+(P[i][0]-P[i-1][0])*a,P[i-1][1]+(P[i][1]-P[i-1][1])*a,P[i-1][2]+(P[i][2]-P[i-1][2])*a]}}return P[P.length-1].slice()}
/* bruto e mapa de alturas */
function sim3Bruto(p,o,segs){
  var dims=(typeof cnBrutoDims==="function"?cnBrutoDims(p.bruto||""):[])||[],txt=String(p.bruto||"")+" "+String(o.fixacao||p.fixacaoInf||""),redondo=/Ø|DIAM|REDOND/i.test(String(p.bruto||""))&&/PLACA/i.test(String(o.dispositivo||"")+" "+txt);
  var X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9,zmin=0;
  segs.forEach(function(s){if(s.k==="g0")return;s.pts.forEach(function(q){if(q[2]<0.5){X0=Math.min(X0,q[0]);X1=Math.max(X1,q[0]);Y0=Math.min(Y0,q[1]);Y1=Math.max(Y1,q[1]);zmin=Math.min(zmin,q[2])}})});
  if(X0>X1){X0=-50;X1=50;Y0=-50;Y1=50}
  var pts=cnPts(o.contorno),b;
  if(pts.length>2){var a=1e9,bb=-1e9,c=1e9,d=-1e9;pts.forEach(function(q){a=Math.min(a,q[0]);bb=Math.max(bb,q[0]);c=Math.min(c,q[1]);d=Math.max(d,q[1])});b={x0:a,x1:bb,y0:c,y1:d}}
  if(redondo){var D=dims.length?dims.filter(function(v){return v<=60}).slice(-1)[0]||dims[dims.length-1]:Math.max(X1-X0,Y1-Y0)+4;var cx=(X0+X1)/2,cy=(Y0+Y1)/2;if(Math.abs(cx)<D/2&&Math.abs(cy)<D/2){cx=0;cy=0}
    return{x0:cx-D/2,x1:cx+D/2,y0:cy-D/2,y1:cy+D/2,zt:0,zb:-Math.min(dims.length?dims[0]:40,Math.max(25,-zmin+12)),esp:dims.length?dims[0]:40,red:{cx:cx,cy:cy,r:D/2}}}
  if(!b){var px=X1-X0,py=Y1-Y0,cx2=(X0+X1)/2,cy2=(Y0+Y1)/2,lx=px+12,ly=py+12;
    if(dims.length>=2){var big=Math.max(dims[0],dims[1]),sm=Math.min(dims[0],dims[1]);if(px>=py){lx=Math.max(big,px);ly=Math.max(sm,py)}else{lx=Math.max(sm,px);ly=Math.max(big,py)}}
    b={x0:cx2-lx/2,x1:cx2+lx/2,y0:cy2-ly/2,y1:cy2+ly/2}}
  var esp=dims.length>=3?dims[2]:(dims.length?Math.min.apply(null,dims):Math.max(10,-zmin));
  b.zt=0;b.zb=-esp;b.esp=esp;return b;
}
function sim3Grade(b){
  var w=b.x1-b.x0,h=b.y1-b.y0,area=w*h,res=Math.max(0.25,Math.sqrt(area/1.5e6));res=Math.min(Math.max(res,0.25),Math.max(0.5,res));res=Math.ceil(res*20)/20;
  var nx=Math.max(2,Math.round(w/res)),ny=Math.max(2,Math.round(h/res)),H=new Float32Array(nx*ny),M=new Uint8Array(nx*ny);
  for(var j=0;j<ny;j++)for(var i=0;i<nx;i++){var k=j*nx+i,x=b.x0+(i+0.5)*res,y=b.y0+(j+0.5)*res,dentro=!b.red||Math.hypot(x-b.red.cx,y-b.red.cy)<=b.red.r;M[k]=dentro?1:0;H[k]=dentro?b.zt:b.zb}
  return{nx:nx,ny:ny,res:res,H:H,M:M,b:b,dirty:null};
}
function sim3Perfil(f,d){return f.tipo==="broca"?d/Math.tan(59*Math.PI/180):(f.tipo==="esc"||f.tipo==="centro")?d:0}
/* rebaixa a grade pelo segmento a→b (só onde a ferramenta está abaixo do topo atual); devolve true se cortou material */
function sim3Corta(G,f,a,c){
  var r=f.r,b=G.b,res=G.res,minz=Math.min(a[2],c[2]);if(minz>=b.zt+0.001)return false;
  var x0=Math.min(a[0],c[0])-r,x1=Math.max(a[0],c[0])+r,y0=Math.min(a[1],c[1])-r,y1=Math.max(a[1],c[1])+r;
  var i0=Math.max(0,Math.floor((x0-b.x0)/res)),i1=Math.min(G.nx-1,Math.ceil((x1-b.x0)/res)),j0=Math.max(0,Math.floor((y0-b.y0)/res)),j1=Math.min(G.ny-1,Math.ceil((y1-b.y0)/res));
  if(i0>i1||j0>j1)return false;
  var dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],l2=dx*dx+dy*dy,cut=false,H=G.H,M=G.M,nx=G.nx,r2=r*r;
  for(var j=j0;j<=j1;j++){var py=b.y0+(j+0.5)*res;for(var i=i0;i<=i1;i++){var k=j*nx+i;if(!M[k])continue;var px=b.x0+(i+0.5)*res,t,qz;
      if(l2<1e-12){t=dz<0?1:0}else{t=((px-a[0])*dx+(py-a[1])*dy)/l2;if(t<0)t=0;else if(t>1)t=1}
      var qx=a[0]+dx*t-px,qy=a[1]+dy*t-py,d2=qx*qx+qy*qy;if(d2>r2)continue;qz=a[2]+dz*t;
      var z=qz+sim3Perfil(f,Math.sqrt(d2));if(z<H[k]-1e-4){H[k]=z<b.zb?b.zb:z;cut=true;
        if(!G.dirty)G.dirty=[i,i,j,j];else{if(i<G.dirty[0])G.dirty[0]=i;if(i>G.dirty[1])G.dirty[1]=i;if(j<G.dirty[2])G.dirty[2]=j;if(j>G.dirty[3])G.dirty[3]=j}}}}
  return cut;
}
function sim3Altura(G,x,y){var i=Math.floor((x-G.b.x0)/G.res),j=Math.floor((y-G.b.y0)/G.res);if(i<0||j<0||i>=G.nx||j>=G.ny)return-1e9;var k=j*G.nx+i;return G.M[k]?G.H[k]:-1e9}

/* ---- tela ---- */
function sim3Abrir(p,oi){
  var o=(p.ops||[])[oi];if(!o||!o.nc){toast("Esta operação não tem programa.");return}
  var V=SIM3.v={p:p,o:o,oi:oi,play:false,vel:5,t:0,last:0,raf:0,avisos:[],ok:true};
  var el=$("sim3");if(!el){document.body.insertAdjacentHTML("beforeend",'<div class="sim3" id="sim3" role="dialog" aria-modal="true" aria-label="Simulador CNC"></div>');el=$("sim3")}
  var cmd=cnCmd(p.comando)||{};
  el.innerHTML='<div class="s3-top"><b>Simulador</b><span class="s3-tt">'+esc((p.codigo||"")+(p.rev?" R"+p.rev:"")+" · "+(o.op||"")+" · "+(cmd.n||"")+(cmd.maq?" · "+cmd.maq:""))+'</span><span class="sp"></span>'+
   '<button class="btn sm" type="button" data-s3="vista" data-v="iso">Isométrica</button><button class="btn sm" type="button" data-s3="vista" data-v="cima">Cima</button><button class="btn sm" type="button" data-s3="vista" data-v="frente">Frente</button>'+
   '<label class="s3-ck"><input type="checkbox" id="s3-cam" checked> Percurso</label><button class="btn" type="button" data-s3="fechar">Fechar</button></div>'+
   '<div class="s3-main"><div class="s3-vw" id="s3-vw"><div class="s3-msg" id="s3-msg">Carregando o simulador…</div>'+
   '<div class="s3-info" id="s3-info"></div></div>'+
   '<aside class="s3-side"><div class="s3-ctl"><button class="btn pri" type="button" data-s3="play" id="s3-play">▶ Play</button><button class="btn" type="button" data-s3="passo" title="Próximo bloco">⏭ Bloco</button><button class="btn" type="button" data-s3="inicio" title="Voltar ao início">⏮</button><button class="btn" type="button" data-s3="fim" title="Ir para o fim">⏩ Fim</button>'+
   '<label class="s3-vel">Velocidade <select id="s3-vel">'+[1,2,5,10,20,50].map(function(v){return'<option value="'+v+'"'+(v===5?" selected":"")+'>'+v+'×</option>'}).join("")+'</select></label></div>'+
   '<input type="range" id="s3-bar" min="0" max="1000" value="0" aria-label="Progresso"><div class="s3-tm" id="s3-tm"></div>'+
   '<div class="s3-av" id="s3-av"></div><div class="s3-prog" id="s3-prog"></div></aside></div>';
  el.hidden=false;document.body.classList.add("s3-on");
  /* simulação */
  var sim;try{sim=cnSimRun(o.nc,p.comando)}catch(e){$("s3-msg").textContent="O simulador não conseguiu ler o programa: "+(e&&e.message);return}
  var tl=sim3Linha(sim);V.sim=sim;V.segs=tl.segs;V.total=tl.total;
  V.ferrs={};V.segs.forEach(function(s){if(!V.ferrs[s.ferr])V.ferrs[s.ferr]=sim3Ferr(s.ferr)});
  var cores=["#EC3237","#2F6FED","#1E9E5A","#E39B1B","#8E44C8","#11A5B5","#D6337F","#6B7A1E"],ci=0;for(var fk in V.ferrs)V.ferrs[fk].cor=cores[(ci++)%cores.length];
  V.b=sim3Bruto(p,o,V.segs);V.G=sim3Grade(V.b);V.ix=0;
  V.lines=String(o.nc).replace(/\r/g,"").split("\n");
  $("s3-prog").innerHTML=V.lines.map(function(l,i){return'<div class="s3-l" data-s3l="'+i+'"><i>'+(i+1)+'</i><span>'+esc(l)+'</span></div>'}).join("");
  sim.avisos.forEach(function(a){var m=/linha (\d+)/.exec(a);V.avisos.push({txt:a,line:m?+m[1]-1:null})});
  sim3Avisos();
  sim3Libs().then(function(){sim3Cena();sim3Ir(0);$("s3-msg").hidden=true}).catch(function(e){$("s3-msg").textContent=(e&&e.message)||"Não consegui carregar o desenho 3D."});
}
function sim3Avisos(){var V=SIM3.v,el=$("s3-av");if(!el)return;
  el.innerHTML=V.avisos.length?'<b>Avisos</b>'+V.avisos.slice(0,60).map(function(a,i){return'<button type="button" class="s3-a" data-s3a="'+i+'">'+esc(a.txt)+'</button>'}).join(""):'<span class="s3-okv">Sem avisos até aqui.</span>'}
function sim3Aviso(txt,line){var V=SIM3.v,k=txt+"|"+line;V.av=V.av||{};if(V.av[k])return;V.av[k]=1;V.avisos.push({txt:(line!=null?"linha "+(line+1)+": ":"")+txt,line:line});sim3Avisos()}
function sim3Cena(){
  var V=SIM3.v,vw=$("s3-vw"),W=vw.clientWidth||900,H=vw.clientHeight||600;
  var R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(Math.min(2,window.devicePixelRatio||1));R.setSize(W,H);R.setClearColor(0x0B1033);vw.insertBefore(R.domElement,vw.firstChild);
  var S=new THREE.Scene(),b=V.b,span=Math.max(b.x1-b.x0,b.y1-b.y0,40);
  var C=new THREE.PerspectiveCamera(40,W/H,0.1,span*40);
  var ctl=new THREE.OrbitControls(C,R.domElement);ctl.enableDamping=true;
  S.add(new THREE.HemisphereLight(0xffffff,0x334466,0.85));var dl=new THREE.DirectionalLight(0xffffff,0.75);dl.position.set(span,span*1.6,span*0.8);S.add(dl);
  function T(x,y,z){return new THREE.Vector3(x,z,-y)}
  V.T=T;V.R=R;V.S=S;V.C=C;V.ctl=ctl;V.span=span;
  /* superfície do material */
  var G=V.G,st=Math.max(1,Math.ceil(Math.sqrt(G.nx*G.ny/260000))),dx=Math.ceil(G.nx/st),dy=Math.ceil(G.ny/st);V.st=st;V.dx=dx;V.dy=dy;
  var pos=new Float32Array(dx*dy*3),col=new Float32Array(dx*dy*3),idx=[];
  for(var j=0;j<dy;j++)for(var i=0;i<dx;i++){var gi=Math.min(G.nx-1,i*st),gj=Math.min(G.ny-1,j*st),k=(j*dx+i)*3;pos[k]=b.x0+(gi+0.5)*G.res;pos[k+1]=G.H[gj*G.nx+gi];pos[k+2]=-(b.y0+(gj+0.5)*G.res)}
  for(j=0;j<dy-1;j++)for(i=0;i<dx-1;i++){var a=j*dx+i,c=a+1,d=a+dx,e=d+1;
    var ma=G.M[Math.min(G.ny-1,j*st)*G.nx+Math.min(G.nx-1,i*st)];if(!ma&&b.red)continue;idx.push(a,d,c,c,d,e)}
  var geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setAttribute("color",new THREE.BufferAttribute(col,3));geo.setIndex(idx);
  V.geo=geo;sim3Cores(0,dx-1,0,dy-1);geo.computeVertexNormals();
  S.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,metalness:0.35,roughness:0.55,side:THREE.DoubleSide})));
  /* laterais e base do bruto */
  var lat=new THREE.MeshStandardMaterial({color:0x8E97B8,metalness:0.2,roughness:0.7,transparent:true,opacity:0.92,side:THREE.DoubleSide});
  if(b.red){var cy=new THREE.CylinderGeometry(b.red.r,b.red.r,b.zt-b.zb,64,1,true),m=new THREE.Mesh(cy,lat);m.position.copy(T(b.red.cx,b.red.cy,(b.zt+b.zb)/2));S.add(m)}
  else{var bx=new THREE.BoxGeometry(b.x1-b.x0,b.zt-b.zb,b.y1-b.y0),mb=new THREE.Mesh(bx,[lat,lat,new THREE.MeshBasicMaterial({visible:false}),lat,lat,lat]);mb.position.copy(T((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.zt+b.zb)/2-0.02));mb.scale.set(1.0005,0.9995,1.0005);S.add(mb)}
  /* percurso: uma cor por ferramenta, G0 tracejado */
  var grp=new THREE.Group();V.camG=grp;S.add(grp);
  var porF={};V.segs.forEach(function(s){var key=s.ferr+"|"+(s.k==="g0"?"r":"c");(porF[key]=porF[key]||[]).push(s)});
  Object.keys(porF).forEach(function(key){var arr=[],g0=key.slice(-1)==="r",f=V.ferrs[key.slice(0,-2)];porF[key].forEach(function(s){for(var q=1;q<s.pts.length;q++){var A=T(s.pts[q-1][0],s.pts[q-1][1],s.pts[q-1][2]),B=T(s.pts[q][0],s.pts[q][1],s.pts[q][2]);arr.push(A.x,A.y,A.z,B.x,B.y,B.z)}});
    var gg=new THREE.BufferGeometry();gg.setAttribute("position",new THREE.Float32BufferAttribute(arr,3));
    var ln=new THREE.LineSegments(gg,g0?new THREE.LineDashedMaterial({color:0xC9CDF2,dashSize:Math.max(1,span/120),gapSize:Math.max(1,span/120),transparent:true,opacity:0.55}):new THREE.LineBasicMaterial({color:new THREE.Color(f.cor)}));if(g0)ln.computeLineDistances();grp.add(ln)});
  /* zero peça */
  var zs=Math.max(6,span*0.05),zg=new THREE.BufferGeometry().setFromPoints([T(-zs,0,0.05),T(zs,0,0.05),T(0,-zs,0.05),T(0,zs,0.05),T(0,0,0),T(0,0,zs)]);S.add(new THREE.LineSegments(zg,new THREE.LineBasicMaterial({color:0xEC3237})));
  /* ferramenta */
  V.tool=new THREE.Group();S.add(V.tool);V.toolKey="";
  sim3Vista("iso");
  window.addEventListener("resize",sim3Tam);
  var loop=function(ts){if(!SIM3.v||SIM3.v!==V)return;V.raf=requestAnimationFrame(loop);var dt=V.last?(ts-V.last)/1000:0;V.last=ts;if(V.play){var nt=V.t+dt*V.vel;if(nt>=V.total){nt=V.total;V.play=false;sim3BtnPlay()}sim3Ir(nt)}ctl.update();R.render(S,C)};
  V.raf=requestAnimationFrame(loop);
}
function sim3Tam(){var V=SIM3.v;if(!V||!V.R)return;var vw=$("s3-vw");if(!vw)return;var W=vw.clientWidth,H=vw.clientHeight;V.R.setSize(W,H);V.C.aspect=W/H;V.C.updateProjectionMatrix()}
function sim3Vista(v){var V=SIM3.v,b=V.b,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,c=V.T(cx,cy,(b.zt+b.zb)/2),d=V.span*1.25;V.ctl.target.copy(c);
  if(v==="cima")V.C.position.set(c.x,c.y+d*1.3,c.z+0.001);else if(v==="frente")V.C.position.set(c.x,c.y+d*0.15,c.z+d*1.3);else V.C.position.set(c.x+d*0.8,c.y+d*0.75,c.z+d*0.95);V.C.lookAt(c);V.ctl.update()}
function sim3Cores(i0,i1,j0,j1){var V=SIM3.v,G=V.G,b=V.b,st=V.st,dx=V.dx,pos=V.geo.attributes.position.array,col=V.geo.attributes.color.array;
  for(var j=j0;j<=j1;j++)for(var i=i0;i<=i1;i++){var gi=Math.min(G.nx-1,i*st),gj=Math.min(G.ny-1,j*st),h=G.H[gj*G.nx+gi],k=(j*dx+i)*3;pos[k+1]=h;
    var cut=h<b.zt-0.01;if(cut){var u=Math.max(0,Math.min(1,(b.zt-h)/Math.max(1,b.esp)));col[k]=0.80-0.25*u;col[k+1]=0.84-0.2*u;col[k+2]=0.92-0.1*u}else{col[k]=0.45;col[k+1]=0.5;col[k+2]=0.66}}}
function sim3Malha(){var V=SIM3.v,G=V.G;if(!G.dirty||!V.geo)return;var d=G.dirty,st=V.st;
  sim3Cores(Math.max(0,Math.floor(d[0]/st)-1),Math.min(V.dx-1,Math.ceil(d[1]/st)+1),Math.max(0,Math.floor(d[2]/st)-1),Math.min(V.dy-1,Math.ceil(d[3]/st)+1));
  G.dirty=null;V.geo.attributes.position.needsUpdate=true;V.geo.attributes.color.needsUpdate=true;V.geo.computeVertexNormals()}
/* aplica os trechos até o tempo t (do zero, se voltou) */
function sim3Ir(t){
  var V=SIM3.v;if(!V)return;t=Math.max(0,Math.min(V.total,t));
  if(t<V.t-1e-9){V.G=sim3Grade(V.b);V.ix=0;V.G.dirty=[0,V.G.nx-1,0,V.G.ny-1]}
  var segs=V.segs,G=V.G,cur=null;
  while(V.ix<segs.length&&segs[V.ix].t1<=t){sim3Aplica(segs[V.ix],null);V.ix++}
  if(V.ix<segs.length&&segs[V.ix].t0<=t){cur=segs[V.ix];sim3Aplica(cur,t)}
  V.t=t;sim3Malha();
  var sg=cur||segs[Math.max(0,V.ix-1)];if(!sg)return;
  var p=cur?sim3Pos(cur,t):sg.pts[sg.pts.length-1],f=V.ferrs[sg.ferr];
  sim3Ferramenta(sg.ferr,f,p);
  var bar=$("s3-bar");if(bar&&!V.arr)bar.value=Math.round(t/V.total*1000);
  $("s3-tm").textContent=fmtT(t)+" / "+fmtT(V.total);
  $("s3-info").innerHTML='<b style="color:'+f.cor+'">'+esc(sg.ferr)+'</b><span>Ø'+cnFmtN(f.d)+' · '+({reta:"fresa",broca:"broca 118°",esc:"escareador 90°",centro:"broca de centro"}[f.tipo])+'</span><span>S '+(sg.s||0)+' · F '+(sg.k==="g0"?"rápido":(sg.f||0))+'</span><span class="mono">X '+p[0].toFixed(3)+'  Y '+p[1].toFixed(3)+'  Z '+p[2].toFixed(3)+'</span><span>'+fmtT(t)+' / '+fmtT(V.total)+'</span>';
  if(sg.line!==V.lineOn){var o=document.querySelector('.s3-l.on');if(o)o.classList.remove("on");var n=document.querySelector('.s3-l[data-s3l="'+sg.line+'"]');if(n){n.classList.add("on");var pr=$("s3-prog");if(pr&&(n.offsetTop<pr.scrollTop+20||n.offsetTop>pr.scrollTop+pr.clientHeight-40))pr.scrollTop=n.offsetTop-pr.clientHeight/2}V.lineOn=sg.line}
}
function sim3Aplica(sg,t){
  var V=SIM3.v,f=V.ferrs[sg.ferr],G=V.G,P=sg.pts,end=t==null?P.length-1:null,pe=null;
  if(t!=null){var u=sg.t1>sg.tm?Math.max(0,Math.min(1,(t-sg.tm)/(sg.t1-sg.tm))):1,dl=u*sg.len;for(var i=1;i<P.length;i++){if(sg.L[i]>=dl){end=i-1;pe=sim3Pos(sg,t);break}}if(end==null)end=P.length-1}
  for(var q=1;q<=end;q++)sim3Seg(sg,f,P[q-1],P[q]);
  if(pe)sim3Seg(sg,f,P[end],pe);
}
function sim3Seg(sg,f,a,c){
  var V=SIM3.v,G=V.G,b=V.b,dentroXY=function(x,y){return x>b.x0&&x<b.x1&&y>b.y0&&y<b.y1};
  if(sg.k==="g0"){if(Math.min(a[2],c[2])<b.zt-0.01){var n=Math.max(2,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/Math.max(G.res,f.r/2)));for(var i=0;i<=n;i++){var x=a[0]+(c[0]-a[0])*i/n,y=a[1]+(c[1]-a[1])*i/n,z=a[2]+(c[2]-a[2])*i/n;if(sim3Altura(G,x,y)>z+0.05){sim3Aviso("G0 entrando no material (X"+x.toFixed(1)+" Y"+y.toFixed(1)+" Z"+z.toFixed(1)+")",sg.line);break}}}
    sim3Corta(G,f,a,c);return}
  var cut=sim3Corta(G,f,a,c);
  if(cut&&!sg.s)sim3Aviso("corte com S = 0",sg.line);
  if(cut&&Math.min(a[2],c[2])<b.zb-0.01&&!/PARALEL|CAL[ÇC]O|DISPOSITIVO|PLACA/i.test(String(V.o.fixacao||"")+" "+String(V.p.fixacaoInf||"")))sim3Aviso("fundo abaixo da base do bruto (Z"+Math.min(a[2],c[2]).toFixed(2)+", base Z"+b.zb.toFixed(2)+") sem paralelo na fixação",sg.line);
}
/* fim da simulação: passante que não chegou ao fundo */
function sim3Passantes(){var V=SIM3.v,b=V.b,txt=String(V.o.descricao||"")+" "+String(V.o.nota||"");
  V.segs.forEach(function(sg){if(sg.k!=="furo")return;var l=String(V.lines[sg.line]||"")+" "+String(V.lines[sg.line-1]||"");if(!/PASSANTE/i.test(l)&&!/PASSANTE/i.test(txt))return;var zc=sg.pts[2][2],f=V.ferrs[sg.ferr],fundo=zc+sim3Perfil(f,f.r);
    if(fundo>b.zb+0.01)sim3Aviso("furo passante não chegou ao fundo (Z"+zc.toFixed(2)+", diâmetro cheio só em Z"+fundo.toFixed(2)+"; base Z"+b.zb.toFixed(2)+")",sg.line)})}
function sim3Ferramenta(key,f,p){var V=SIM3.v;if(!V.tool)return;
  if(V.toolKey!==key){while(V.tool.children.length)V.tool.remove(V.tool.children[0]);V.toolKey=key;
    var mat=new THREE.MeshStandardMaterial({color:new THREE.Color(f.cor),metalness:0.5,roughness:0.35}),hl=Math.max(8,f.bal);
    var corpo=new THREE.CylinderGeometry(f.r,f.r,hl,24);corpo.translate(0,hl/2,0);V.tool.add(new THREE.Mesh(corpo,mat));
    if(f.tipo!=="reta"){var hp=sim3Perfil(f,f.r)||f.r,pt=new THREE.ConeGeometry(f.r,hp,24);pt.rotateX(Math.PI);pt.translate(0,hp/2,0);V.tool.children[0].position.y=hp;V.tool.add(new THREE.Mesh(pt,mat))}
    var ph=Math.max(20,f.d*1.2),porta=new THREE.CylinderGeometry(Math.max(f.r*1.6,8),Math.max(f.r*1.1,5),ph,24);porta.translate(0,hl+ph/2,0);V.tool.add(new THREE.Mesh(porta,new THREE.MeshStandardMaterial({color:0x9AA0B4,metalness:0.6,roughness:0.4})))}
  V.tool.position.copy(V.T(p[0],p[1],p[2]))}
function sim3BtnPlay(){var V=SIM3.v,b=$("s3-play");if(b&&V)b.textContent=V.play?"⏸ Pausa":"▶ Play"}
function sim3Fechar(){var V=SIM3.v;if(V){cancelAnimationFrame(V.raf);try{V.R.dispose();V.R.forceContextLoss()}catch(e){}}SIM3.v=null;var el=$("sim3");if(el){el.hidden=true;el.innerHTML=""}document.body.classList.remove("s3-on");window.removeEventListener("resize",sim3Tam)}
document.addEventListener("click",function(e){
  var s3=e.target.closest("[data-s3],[data-s3l],[data-s3a]");if(!s3||!$("sim3")||!$("sim3").contains(s3))return;var V=SIM3.v;if(!V)return;
  if(s3.dataset.s3l!=null){var ln=+s3.dataset.s3l,sg=V.segs.filter(function(x){return x.line>=ln})[0];if(sg){V.play=false;sim3BtnPlay();sim3Ir(sg.t1)}return}
  if(s3.dataset.s3a!=null){var av=V.avisos[+s3.dataset.s3a];if(av&&av.line!=null){var s2=V.segs.filter(function(x){return x.line>=av.line})[0];if(s2){V.play=false;sim3BtnPlay();sim3Ir(s2.t1)}}return}
  var a=s3.dataset.s3;
  if(a==="fechar"){sim3Fechar();return}
  if(!V.geo)return;
  if(a==="play"){if(V.t>=V.total)sim3Ir(0);V.play=!V.play;V.last=0;sim3BtnPlay();return}
  if(a==="passo"){V.play=false;sim3BtnPlay();var cl=V.lineOn,nx=V.segs.filter(function(x){return x.t1>V.t+1e-6&&x.line!==cl})[0]||V.segs[V.segs.length-1];sim3Ir(nx.t1);return}
  if(a==="inicio"){V.play=false;sim3BtnPlay();sim3Ir(0);return}
  if(a==="fim"){V.play=false;sim3BtnPlay();sim3Ir(V.total);sim3Passantes();return}
  if(a==="vista"){sim3Vista(s3.dataset.v);return}
});
document.addEventListener("input",function(e){var V=SIM3.v;if(!V)return;
  if(e.target.id==="s3-bar"){V.play=false;sim3BtnPlay();sim3Ir(+e.target.value/1000*V.total);if(V.t>=V.total)sim3Passantes()}
  else if(e.target.id==="s3-vel")V.vel=+e.target.value;
  else if(e.target.id==="s3-cam"&&V.camG)V.camG.visible=e.target.checked});
document.addEventListener("keydown",function(e){if(SIM3.v&&e.key==="Escape"){sim3Fechar()}});
