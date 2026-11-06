import sys, asyncio, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
FZ="function FZ(o){o=JSON.parse(JSON.stringify(o));(function f(x){if(x&&typeof x=='object'){Object.freeze(x);Object.keys(x).forEach(function(k){f(x[k])})}})(o);return o}"
PECAS="""
store['pedidos/pd-26-0001']="""+open('pedido_teste.json').read()+""";
store['clientes/c-marrucci']={nome:'MARRUCCI LTDA',razao:'MARRUCCI INDÚSTRIA LTDA',cnpj:'11.222.333/0001-81',rua:'Rua Exemplo',num:'100',bairro:'Centro',cidade:'Caxias do Sul',uf:'RS',email:'compras@exemplo.com'};
store['pecas/pa-op-mw46kxzy-0']={lote:'OP-0001/26',opId:'op-mw46kxzy-0',codigo:'170559',descricao:'GUIA DA MOLA',cliente:'MARRUCCI',emp:'MIX',qtd:600,saldo:600,local:'CX01',status:'estoque',criado:1,reservas:[{pedidoId:'pd-26-0001',pedidoNum:'PD-0001/26',itemIdx:0,qtd:500,origem:'op'}],hist:[]};
store['pecas/pa-op-mw46kxzy-1']={lote:'OP-0002/26',opId:'op-mw46kxzy-1',codigo:'170448',descricao:'BUJÃO MONTADO',cliente:'MARRUCCI',emp:'MIX',qtd:300,saldo:300,local:'CX02',status:'estoque',criado:2,reservas:[{pedidoId:'pd-26-0001',pedidoNum:'PD-0001/26',itemIdx:1,qtd:300,origem:'op'}],hist:[]};
store['pedidos/pd-26-0001'].itens[0].situacao='liberado';store['pedidos/pd-26-0001'].etapa='qualidade';
"""
M=MOCK.replace('JSON.parse(JSON.stringify(store[p]))','FZ(store[p])').replace('JSON.parse(JSON.stringify(store[k]))','FZ(store[k])').replace('var store={}, subs=[];',"var store={}, subs=[];"+FZ).replace("window.__store=store;",open('seed2107.js').read()+PECAS+"window.__store=store;")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(3000)
        J=lambda s:pg.evaluate("__T(`JSON.stringify("+s+")`)")
        await pg.evaluate("void __T('svgToJpeg=function(sv){window.__sv=sv;return Promise.reject(1)}')")
        await pg.evaluate("void __T('showTab(\"m-exped\")')"); await pg.wait_for_timeout(800)
        print('pend',await pg.locator('.ls-exp.ls-row').count(),'ft',await pg.locator('#mx-box .ft-btn').count()); await pg.screenshot(path='out/exp1.png')
        await pg.locator('.ls-exp.ls-row').first.click(); await pg.wait_for_timeout(500)
        await pg.select_option('[data-exe="transp"]','Transportadora'); await pg.fill('[data-exe="transportadora"]','Braspress'); await pg.fill('[data-exe="vol"]','3')
        await pg.fill('[data-exq="1"]','200')
        await pg.screenshot(path='out/exp2.png')
        await pg.click('[data-exx="y"]'); await pg.wait_for_timeout(400); await pg.click('#cfm-y'); await pg.wait_for_timeout(2500)
        print('exp',await J("EXP.list.map(function(r){return r.num+':'+r.status+':'+r.itens.map(function(x){return x.codigo+'='+x.qtd}).join('/')})"))
        print('pecas',await J("PAE.list.map(function(l){return l.lote+' saldo '+l.saldo+' res '+paRes(l)+' baixas '+(l.baixas||[]).length+' '+l.status})"))
        print('pedido',await J("(function(p){return p.etapa+' | '+p.itens.map(function(x){return x.cod+':'+x.expedido+':'+x.situacao}).join(' ; ')+' | nf '+p.nf})(PD.list.filter(function(p){return p.id==='pd-26-0001'})[0])"))
        print('movs',await J("Object.keys(__store).filter(function(k){return k.indexOf('movimentos/mv-pa')===0}).map(function(k){return __store[k].tipo+' '+__store[k].qtd+' '+__store[k].doc})"))
        await pg.screenshot(path='out/exp3.png')
        await pg.fill('[data-exv="nf"]','4567'); await pg.click('[data-exx="dados"]'); await pg.wait_for_timeout(1000)
        print('nf',await J("EXP.list[0].nf"),await J("PD.list.filter(function(p){return p.id==='pd-26-0001'})[0].nf"))
        await pg.click('#mx-modal [data-ex="pdf"]'); await pg.wait_for_timeout(800)
        sv=await pg.evaluate("window.__sv||''"); open('out/rom.svg','w').write(sv)
        # segunda expedição: resto do item 1
        await pg.evaluate("void __T('$(\"mx-modal\").hidden=true;EXP.aba=\"pend\";mxRender()')"); await pg.wait_for_timeout(500)
        print('pend2',await pg.locator('.ls-exp.ls-row').count())
        await pg.locator('.ls-exp.ls-row').first.click(); await pg.wait_for_timeout(500)
        await pg.select_option('[data-exe="transp"]','Retira cliente'); await pg.click('[data-exx="y"]'); await pg.wait_for_timeout(400); await pg.click('#cfm-y'); await pg.wait_for_timeout(2500)
        print('pedido2',await J("(function(p){return p.etapa+' | '+p.itens.map(function(x){return x.cod+':'+x.expedido+':'+x.situacao}).join(' ; ')})(PD.list.filter(function(p){return p.id==='pd-26-0001'})[0])"))
        await pg.evaluate("void __T('$(\"mx-modal\").hidden=true;mxRender()')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='out/exp4.png')
        # estorno da primeira
        await pg.locator('.ls-exp2.ls-row [data-ex="est"]').last.click(); await pg.wait_for_timeout(300)
        await pg.fill('#rev-txt','NF errada'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(2500)
        print('apos estorno exp',await J("EXP.list.map(function(r){return r.num+':'+r.status})"))
        print('pecas',await J("PAE.list.map(function(l){return l.lote+' saldo '+l.saldo+' res '+paRes(l)+' baixas ativas '+paBaixas(l)})"))
        print('pedido3',await J("(function(p){return p.etapa+' | '+p.itens.map(function(x){return x.cod+':'+x.expedido+':'+x.situacao}).join(' ; ')+' | nf '+p.nf})(PD.list.filter(function(p){return p.id==='pd-26-0001'})[0])"))
        print('demanda',await J("ppDemanda().map(function(r){return r.k+':'+r.qtd})"))
        print('errs',errs)
        await b.close()
asyncio.run(main())
