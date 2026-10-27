/* ---- Simulador ROMI Mach 9 (Discovery 4022) — porte do agente-cnc-simmach9.py (gestor, 27/10/2026); mesma saída do simM70 ---- */
function simMach9(text){
  var RAP=15000,TROCA=7,RET=1,ZMAQ=200;
  var raw=String(text||"").replace(/\r/g,"").split("\n"),lines=[];
  raw.forEach(function(l){var t=l.split(";")[0].toUpperCase().trim();if(t.charAt(0)===":"||t.charAt(0)==="%")t="";var fl={};
    ["GZO","GYO"].forEach(function(k){if(t.indexOf(k)>-1){fl[k]=1;t=t.split(k).join(" ")}});
    var g91z=/G91Z(?![-\d.])/.test(t),g90z=/G90Z(?![-\d.])/.test(t);t=t.replace(/G9([01])Z(?![-\d.])/g,"G9$1");
    var tk=[],re=/([A-Z])\s*([-+]?\d*\.?\d+|[-+]?\d+\.)/g,m;while((m=re.exec(t)))tk.push([m[1],m[2]]);lines.push([tk,fl,g91z,g90z,l])});
  var labels={};lines.forEach(function(L,i){var tk=L[0];if(tk.length&&tk[0][0]==="N")labels[parseInt(parseFloat(tk[0][1]))]=i});
  var st={x:0,y:0,z:ZMAQ,absxy:true,absz:true,mode:0,f:0,s:0,t:null,cyc:null,r:null,zc:null,i:null,w:null,zi:ZMAQ};
  var tempo=0,avisos=[],cam=[],por={},atual="inicio",stack=[],pc=0,passos=0,lastT=0;
  function add(t){tempo+=t;por[atual]=(por[atual]||0)+t}
  function cpush(e){e.push(pc-1,st.s,st.f,tempo-lastT);lastT=tempo;cam.push(e)}
  function furo(x,y){if(st.zc===null){avisos.push("ciclo sem Z");return}
    var prof=(st.r!==null?st.r:st.zi)-st.zc;
    if(st.cyc===84)add(2*prof/st.f*60);else{add(prof/st.f*60);if(st.cyc===83&&st.i){var n=Math.ceil(prof/st.i);add(n*prof/RAP*60)}}
    add(RET);cpush([atual,"furo",[x,y,st.zc,st.r!==null?st.r:st.zi]]);st.x=x;st.y=y}
  while(pc<lines.length){
    passos++;if(passos>5000000){avisos.push("loop infinito?");break}
    var L=lines[pc],tk=L[0],fl=L[1],orig=L[4];pc++;
    if(stack.length&&pc-1===stack[stack.length-1].fim){var fr=stack[stack.length-1];fr.L--;if(fr.L>0){pc=fr.ini;continue}pc=fr.volta;stack.pop();continue}
    if(fl.GZO){add(Math.abs(ZMAQ-st.z)/RAP*60);cpush([atual,"g0",[[st.x,st.y,st.z],[st.x,st.y,ZMAQ]]]);st.z=ZMAQ}
    if(fl.GYO)add(1);
    if(L[2])st.absz=false;if(L[3])st.absz=true;
    if(!tk.length)continue;
    var w={},gs=[];tk.forEach(function(p){if(p[0]==="G")gs.push(parseInt(parseFloat(p[1])));else if(!(p[0] in w))w[p[0]]=parseFloat(p[1])});
    var ms=tk.filter(function(p){return p[0]==="M"}).map(function(p){return parseInt(parseFloat(p[1]))});
    gs.forEach(function(g){
      if(g===0||g===1||g===2||g===3)st.mode=g;
      else if(g===90&&!L[3]){st.absxy=true;st.absz=true}
      else if(g===91&&!L[2]){st.absxy=false;st.absz=false}
      else if(g===80)st.cyc=null;
      else if([81,83,84,85,86].indexOf(g)>-1){st.cyc=g;st.zi=st.z}
      else if(g===92)avisos.push("linha "+pc+": G92 (origem temporária) não se usa mais - usar G45O##");
      else if(g===4)add(w.F||1)});
    if(ms.indexOf(0)>-1)avisos.push("linha "+pc+": M00 abolido");
    if(ms.indexOf(8)>-1)avisos.push("linha "+pc+": M08 não liga o óleo na ROMI da MIX - usar M07");
    if("F" in w&&gs.indexOf(4)<0)st.f=w.F;
    if("S" in w)st.s=parseInt(w.S);
    if("T" in w&&ms.indexOf(6)>-1){st.t=parseInt(w.T);var nome=orig.indexOf(";")>-1?orig.split(";").slice(1).join(";").trim():"";atual="T"+("0"+st.t).slice(-2)+" "+nome;add(TROCA);continue}
    if("H" in w&&!gs.length){var n=parseInt(w.H),e="E" in w?parseInt(w.E):null,LL=parseInt("L" in w?w.L:1);
      if(!(n in labels)){avisos.push("linha "+pc+": N"+n+" não existe");continue}
      var fim=e!==null&&(e in labels)?labels[e]:null;if(fim===null){avisos.push("linha "+pc+": E"+e+" não existe");continue}
      stack.push({ini:labels[n],fim:fim,L:LL,volta:pc});pc=labels[n];continue}
    if(ms.indexOf(30)>-1)break;
    if(gs.indexOf(24)>-1){if(!st.cyc){avisos.push("linha "+pc+": G24 sem ciclo");continue}
      var cx="I" in w?w.I:st.x,cy="J" in w?w.J:st.y,R=w.R||0,c0=w.C||0,Lc=parseInt(w.L||1),W=parseInt("W" in w?w.W:Lc);
      for(var k=0;k<Lc;k++){var ang=(c0+360*k/W)*Math.PI/180,x=cx+R*Math.cos(ang),y=cy+R*Math.sin(ang);add(Math.hypot(x-st.x,y-st.y)/RAP*60);furo(x,y)}continue}
    if(gs.indexOf(25)>-1){var dx=w.X||0,dy=w.Y||0,I=Math.abs(parseInt(w.I||1)),J=Math.abs(parseInt(w.J||1)),x0=st.x,y0=st.y;
      for(var jj=0;jj<J;jj++)for(var ii=0;ii<I;ii++){if(!ii&&!jj)continue;var xx=x0+ii*dx,yy=y0+jj*dy;add(Math.hypot(xx-st.x,yy-st.y)/RAP*60);furo(xx,yy)}continue}
    if(st.cyc&&gs.some(function(g){return[81,83,84,85,86].indexOf(g)>-1})){
      if("Z" in w)st.zc=w.Z;if("R" in w)st.r=w.R;if("I" in w)st.i=w.I;if("W" in w)st.w=w.W;if(st.f<=0)avisos.push("linha "+pc+": ciclo sem F");continue}
    if(!("X" in w||"Y" in w||"Z" in w))continue;
    var nx="X" in w?(st.absxy?w.X:st.x+w.X):st.x,ny="Y" in w?(st.absxy?w.Y:st.y+w.Y):st.y,nz="Z" in w?(st.absz?w.Z:st.z+w.Z):st.z;
    if(st.cyc&&st.mode===0&&("X" in w||"Y" in w)){add(Math.hypot(nx-st.x,ny-st.y)/RAP*60);furo(nx,ny);continue}
    var mode=st.mode,X0=st.x,Y0=st.y,Z0=st.z;
    if(mode===0){add(Math.hypot(nx-X0,ny-Y0,nz-Z0)/RAP*60);cpush([atual,"g0",[[X0,Y0,Z0],[nx,ny,nz]]])}
    else if(mode===1){if(st.f<=0)avisos.push("linha "+pc+": G1 sem F");else add(Math.hypot(nx-X0,ny-Y0,nz-Z0)/st.f*60);if(st.s===0)avisos.push("linha "+pc+": corte sem rotação");cpush([atual,"g1",[[X0,Y0,Z0],[nx,ny,nz]]])}
    else{if(!("I" in w)&&!("J" in w)){avisos.push("linha "+pc+": arco sem I/J");continue}
      var ccx="I" in w?w.I:X0,ccy="J" in w?w.J:Y0,r=Math.hypot(X0-ccx,Y0-ccy),r2=Math.hypot(nx-ccx,ny-ccy);
      if(Math.abs(r-r2)>0.01)avisos.push("linha "+pc+": arco com raio inconsistente "+r.toFixed(3)+"/"+r2.toFixed(3)+" (I/J são absolutos no Mach 9)");
      var a0=Math.atan2(Y0-ccy,X0-ccx),a1=Math.atan2(ny-ccy,nx-ccx),TW=2*Math.PI,da=mode===3?((a1-a0)%TW+TW)%TW:-(((a0-a1)%TW+TW)%TW);
      if(Math.abs(da)<1e-9)da=mode===3?TW:-TW;
      var Lr=Math.hypot(Math.abs(da)*r,nz-Z0);if(st.f>0)add(Lr/st.f*60);
      var nn=Math.max(8,Math.floor(Math.abs(da)*r/2)),pts=[];for(var q=0;q<=nn;q++){var aa=a0+da*q/nn;pts.push([ccx+r*Math.cos(aa),ccy+r*Math.sin(aa),Z0+(nz-Z0)*q/nn])}
      cpush([atual,"arc",pts])}
    st.x=nx;st.y=ny;st.z=nz;
  }
  var seen={};avisos=avisos.filter(function(a){if(seen[a])return false;seen[a]=1;return true});
  return{tempo:tempo,porFerr:por,avisos:avisos,caminho:cam};
}
