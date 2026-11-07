import sys, asyncio, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
FZ="function FZ(o){o=JSON.parse(JSON.stringify(o));(function f(x){if(x&&typeof x=='object'){Object.freeze(x);Object.keys(x).forEach(function(k){f(x[k])})}})(o);return o}"
PECAS="""
store['pedidos/pd-26-0001']="""+open('pedido_teste.json').read()+""";
store['clientes/c-marrucci']={nome:'MARRUCCI LTDA',razao:'MARRUCCI INDÚSTRIA LTDA',cnpj:'11.222.333/0001-81',rua:'Rua Exemplo',num:'100',bairro:'Centro',cidade:'Caxias do Sul',uf:'RS',email:'compras@exemplo.com',pagamento:'28/35 DDL'};
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
        P="(function(p){return p.etapa+' | '+p.itens.map(function(x){return x.cod+':'+x.expedido+':'+(x.encerrado?'enc'+x.encerrado.qtd:'')+':'+x.situacao}).join(' ; ')+' | nf '+p.nf})(PD.list.filter(function(p){return p.id==='pd-26-0001'})[0])"
        await pg.evaluate("void __T('showTab(`m-exped`)')"); await pg.wait_for_timeout(800)
        await pg.locator('.ls-exp.ls-row').first.click(); await pg.wait_for_timeout(500)
        await pg.select_option('[data-exe="transp"]','Transportadora'); await pg.fill('[data-exq="1"]','200')
        await pg.click('[data-exx="y"]'); await pg.wait_for_timeout(400); await pg.click('#cfm-y'); await pg.wait_for_timeout(2500)
        await pg.evaluate("void __T('$(`mx-modal`).hidden=true;EXP.aba=`afat`;mxRender()')"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='out/fat1.png'); print('afat',await pg.locator('.ls-exp2.ls-row').count())
        await pg.click('[data-ex="fat"]'); await pg.wait_for_timeout(500)
        await pg.fill('[data-ftf="nf"]','1234'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='out/fat2.png')
        await pg.click('[data-ftx="y"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(3000)
        print('receber',await J("RCB.list.map(function(t){return t.nf+' '+t.parcela+' '+t.venc+' '+t.valor+' '+t.status})"))
        print('ped',await J(P))
        await pg.screenshot(path='out/fat3.png')
        # encerrar saldo item 2 no pedido
        await pg.evaluate("void __T('PD.open=`pd-26-0001`;showTab(`ped`)')"); await pg.wait_for_timeout(1000)
        await pg.screenshot(path='out/pde1.png'); print('enc btn',await pg.locator('[data-pde="enc"]').count())
        await pg.click('[data-pde="enc"]'); await pg.wait_for_timeout(300); await pg.select_option('#pde-aval','1'); await pg.fill('#pde-mot','cliente aceitou'); await pg.click('[data-pdx="y"]'); await pg.wait_for_timeout(2500)
        print('ped enc',await J(P))
        await pg.evaluate("void __T('showTab(`m-fin`)')"); await pg.wait_for_timeout(800); await pg.screenshot(path='out/rcb1.png')
        for i in range(2):
            await pg.locator('[data-rc="baixa"]').first.click(); await pg.wait_for_timeout(300); await pg.click('[data-rcx="y"]'); await pg.wait_for_timeout(1500)
        print('receber2',await J("RCB.list.map(function(t){return t.parcela+' '+t.status})")); await pg.wait_for_timeout(1000)
        print('ped final',await J(P))
        await pg.click('[data-rc="aba"][data-a="rc"]'); await pg.wait_for_timeout(400); await pg.locator('[data-rc="estb"]').first.click(); await pg.fill('#rev-txt','erro'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(2500)
        print('ped estorno',await J(P))
        print('errs',errs)
        await b.close()
asyncio.run(main())
