// Lista nomes globais declarados mais de uma vez no index.html (var/let/const/function no nível de linha)
const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8');
const js=[...t.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const seen={};let ln=0;
for(const line of js.split('\n')){ln++;
  let m=line.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
  const names=[];if(m)names.push(m[1]);
  m=line.match(/^(?:var|let|const)\s+(.*)/);
  if(m){ // nomes separados por vírgula no nível 0
    let s=m[1],d=0,cur='',parts=[];for(const ch of s){if('([{'.includes(ch))d++;else if(')]}'.includes(ch))d--;if(ch===','&&d===0){parts.push(cur);cur=''}else if(ch===';'&&d===0)break;else cur+=ch}parts.push(cur);
    parts.forEach(p=>{const n=p.trim().match(/^([A-Za-z_$][\w$]*)/);if(n)names.push(n[1])})}
  const kind=/^(?:async\s+)?function/.test(line)?'f':'v';
  names.forEach(n=>(seen[n]=seen[n]||[]).push([ln,kind]));
}
// funções reescritas de propósito (versão nova substitui a antiga, a última vence)
const OVERRIDE=['cnTempo','cnFolhaHtml','cnSave','cnFolhaPDF'];
let bad=0;
Object.entries(seen).filter(([k,v])=>v.length>1).forEach(([k,v])=>{
  const soF=v.every(x=>x[1]==='f');
  if(soF&&OVERRIDE.includes(k))return;
  bad++;console.log('ERRO: nome "'+k+'" declarado '+v.length+'x (linhas '+v.map(x=>x[0]+x[1]).join(', ')+')');
});
if(bad){console.log(bad+' conflito(s). NÃO publicar.');process.exit(1)}
console.log('ok: nenhum nome global em conflito');

/* v130: também confere a sintaxe de cada <script> (um erro de aspas passou pelo verificador de nomes) */
(function(){var fs=require("fs"),vm=require("vm"),f=process.argv[2]||"index.html",s=fs.readFileSync(f,"utf8"),re=/<script>([\s\S]*?)<\/script>/g,m,k=0,bad=0;
  while((m=re.exec(s))){k++;try{new vm.Script(m[1],{filename:"script"+k+".js"})}catch(e){bad++;console.log("ERRO DE SINTAXE no script "+k+": "+e.message)}}
  if(bad)process.exitCode=1;else console.log("ok: sintaxe dos "+k+" scripts")})();
