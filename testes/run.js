const fs=require('fs');
const page=fs.readFileSync('../index.html','utf8');

eval(fs.readFileSync('helpers.js','utf8'));
var UFS="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
eval(fs.readFileSync('cadregras.js','utf8'));
const casos=JSON.parse(fs.readFileSync('casos.json','utf8'));
const sem=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/^(banco|rua|avenida|rodovia)\s+/,'').replace(/[^a-z0-9@]/g,'');
let tot=0,ok=0;const only=process.argv[2];
for(const [n,c] of Object.entries(casos)){ if(only&&n!==only)continue;
  const r=crLer(c.texto,'forn',[]);console.log('=== '+n+' ok='+r.ok+' campos='+r.campos);
  for(const k of Object.keys(c.gt)){tot++;const g=c.gt[k],v=r.a[k];const hit=sem(g)===sem(v)||(g&&v&&(sem(v).includes(sem(g))||sem(g).includes(sem(v)))&&Math.min(sem(g).length,sem(v).length)>3);if(hit)ok++;else console.log('  X',k,'| esperado:',JSON.stringify(g),'| lido:',JSON.stringify(v))}
  console.log('  refs:',r.a.referencias.map(x=>x.nome+' ['+x.contato+'|'+x.tel+'|'+x.cidade+']').join(' ; '));
  console.log('  obs:',r.a.obs,' duv:',r.a.duvidas.map(d=>d.campo).join(','));
}
console.log('ACERTOS',ok+'/'+tot);
