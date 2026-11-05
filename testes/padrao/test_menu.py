import sys, asyncio
from playwright.async_api import async_playwright
PAGE = sys.argv[1]; OUT = sys.argv[2]
MOCK = r"""
(function(){
 var store={}, subs=[];
 function col(p){return Object.keys(store).filter(function(k){return k.split('/').length===p.split('/').length+1&&k.indexOf(p+'/')===0}).map(function(k){var id=k.split('/').pop();return{id:id,data:function(){return JSON.parse(JSON.stringify(store[k]))}}})}
 function fire(){subs.forEach(function(s){try{s.fn({docs:col(s.p)})}catch(e){console.error(e)}})}
 function C(p){var q={onSnapshot:function(fn,er){subs.push({p:p,fn:fn});setTimeout(function(){fn({docs:col(p)})},10);return function(){}},orderBy:function(){return q},limit:function(){return q},where:function(){return q},doc:function(id){return D(p+'/'+id)}};return q}
 function D(p){return{get:function(){return Promise.resolve({exists:p in store,data:function(){return JSON.parse(JSON.stringify(store[p]))}})},
  set:function(o){store[p]=JSON.parse(JSON.stringify(o));setTimeout(fire,5);return Promise.resolve()},
  update:function(o){store[p]=Object.assign(store[p]||{},JSON.parse(JSON.stringify(o)));setTimeout(fire,5);return Promise.resolve()},
  delete:function(){delete store[p];setTimeout(fire,5);return Promise.resolve()},
  acquire:function(){return Promise.resolve({acquired:true})}}}
 var t=Date.now();
 store['propostas/mx-26-0007']={num:'MX-0007/26',cliente:'GASCAT INDUSTRIA E COMERCIO LTDA',proposta:'',itens:1,total:1150,status:'Fechado',origem:'Manual',criado:t-9e5,atualizado:t-8e5,emp:'MIX',cv:2,codigos:'16.01.84S'};
 store['propostas_dados/mx-26-0007']={items:[{cod:'16.01.84S',name:'CAMISA',dwg:'16.032.3',rev:'2',qtd:10,preco:'115,00',mat:'',t:[]}],cli:'GASCAT INDUSTRIA E COMERCIO LTDA',emp:'MIX'};
 store['propostas/mx-26-0008']={num:'MX-0008/26',cliente:'AGS INDUSTRIA E COMERCIO LTDA',itens:2,total:480,status:'Em elaboração',criado:t-5e5,atualizado:t-4e5,emp:'STAR',cv:2,codigos:''};
 store['inbox/e1']={cliente:'HINE DO BRASIL',status:'novo',itens:[{cod:'8755',qtd:20}],recebido:t-1e5};
 window.__store=store;
 window.claude={use:function(n){return Promise.resolve(n==='db'?{collection:C,doc:D}:null)}};
})();
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':900})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e.stack)[:600]))
        pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await pg.add_init_script(MOCK)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+PAGE)
        await pg.wait_for_timeout(1500)
        await pg.click('#t-cli'); await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT+'/c1_clientes.png')
        await pg.click('#t-forn'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'/c2_forn.png')
        await pg.click('[data-tog2="cfg"]'); await pg.wait_for_timeout(300)
        await pg.click('#t-emp'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'/c3_emp.png')
        await pg.click('#t-pc'); await pg.wait_for_timeout(500)
        await pg.click('.mod[data-m="ped"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'/c4_ped.png')
        ped = await pg.evaluate("Object.keys(window.__store).filter(k=>k.startsWith('pedidos/')||k.startsWith('clientes/')).map(k=>k+' '+JSON.stringify(window.__store[k]).slice(0,300))")
        print('\n'.join(ped)); print('ERRORS:', errs)
        await b.close()
asyncio.run(main())
