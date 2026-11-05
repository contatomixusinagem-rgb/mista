import sys, asyncio, json, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
SEED=r"""
store['itens/it1']={codigo:'VS-SS-01',descricao:'SEDE',cliente:'MARRUCCI',idSeq:1,criado:t,roteiro:{status:'liberado',ops:[{op:'Tornear',rec:'Torno CNC',setup:30,ciclo:2}]},estrutura:{status:'liberado',mats:[{tipo:'mp',desc:'Aluminio',forma:'redonda',medida:'Ø30 x 25',consumo:0.05,un:'kg'}]}};
store['pedidos/pd-1']={num:'PD-0001/26',cliente:'MARRUCCI',emp:'MIX',etapa:'qualidade',prazo:'2026-12-11',itens:[{cod:'VS-SS-01',desc:'SEDE',qtd:6,itemId:'it1',opId:'o1',opNum:'OP-0001/26',situacao:'produzido (OP-0001/26)'}],criado:t,cancelado:0,hist:[]};
store['pedidos/pd-2']={num:'PD-0002/26',cliente:'MARRUCCI',emp:'MIX',etapa:'pedido',prazo:'2026-12-20',itens:[{cod:'VS-SS-01',desc:'SEDE',qtd:3,itemId:'it1',situacao:'aguardando OP'}],criado:t,cancelado:0,hist:[]};
store['ordens/o1']={num:'OP-0001/26',idSeq:1,codigo:'VS-SS-01',descricao:'SEDE',cliente:'MARRUCCI',emp:'MIX',qtd:10,entrega:'2026-11-20',status:'concluida',pedidoId:'pd-1',pedidoNum:'PD-0001/26',itemIdx:0,itemId:'it1',material:'Aluminio',roteiro:[{seq:10,op:'Tornear',status:'concluida',boas:10,refugo:0,fimEm:Date.now()-3600000}],materiais:[],hist:[],criado:t};
window.__store=store;"""
M=MOCK.replace("window.__store=store;",SEED)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1500,'height':950})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:400]))
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(2500)
        T=lambda s:pg.evaluate("void __T(`"+s+"`)")
        J=lambda s:pg.evaluate("__T(`JSON.stringify("+s+")`)")
        # inspeção final aprovando 10
        await T("showTab('m-inspfin')"); await pg.wait_for_timeout(600)
        await pg.click('.ls-if.ls-row[data-id="o1"]'); await pg.wait_for_timeout(300)
        for c in ['dim','visual','trat','qtd','ident']: await pg.check(f'[data-ifc="{c}"][value="C"]')
        await pg.select_option('[data-ife="res"]','aprovado'); await pg.click('[data-ifx="y"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(1500)
        print('lote',await J("(function(l){return l&&[l.saldo,l.reservas.map(function(r){return r.pedidoNum+':'+r.qtd}),l.status]})(__store['pecas/pa-o1'])"))
        print('pd1',await J("[__store['pedidos/pd-1'].etapa,__store['pedidos/pd-1'].itens[0].situacao]"))
        await T("showTab('m-estpa')"); await pg.wait_for_timeout(700); await pg.screenshot(path='out/pa1.png')
        print('linhas',await pg.locator('.ls-pa.ls-row').count())
        # PCP demanda com estoque
        await T("showTab('m-prod')"); await pg.wait_for_timeout(800)
        print('atender',await pg.locator('[data-pa="atender"]').count()); await pg.screenshot(path='out/pa2.png')
        await pg.click('[data-pa="atender"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(1500)
        print('pd2',await J("[__store['pedidos/pd-2'].etapa,__store['pedidos/pd-2'].itens[0].situacao]"),await J("__store['pecas/pa-o1'].reservas.map(function(r){return r.pedidoNum+':'+r.qtd})"))
        print('demanda',await pg.locator('.pp-r:not(.fh)').count())
        # desfazer bloqueado
        await T("showTab('m-inspfin');IF.aba='feito';mxRender()"); await pg.wait_for_timeout(500)
        await pg.click('[data-if="desfaz"][data-id="o1"]'); await pg.wait_for_timeout(400); print('bloq',await pg.locator('#toast').inner_text() if await pg.locator('#toast').count() else '', await pg.locator('#rev-txt').count())
        # estornar reserva do pd-2
        await T("showTab('m-estpa')"); await pg.wait_for_timeout(500)
        await pg.click('.ls-pa.ls-row'); await pg.wait_for_timeout(400); await pg.screenshot(path='out/pa3.png',full_page=True)
        await pg.click('[data-pa="estres"][data-k="1"]'); await pg.fill('#rev-txt','teste'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(1500)
        print('estorno',await J("__store['pecas/pa-o1'].reservas.length"),await J("[__store['pedidos/pd-2'].etapa,__store['pedidos/pd-2'].itens[0].situacao]"))
        # ajuste abaixo do reservado bloqueado; ajuste ok
        await pg.fill('#pa-aj','3'); await pg.click('[data-pa="aj"]'); await pg.wait_for_timeout(300); print('aj-bloq',await pg.locator('#rev-txt').count())
        await pg.fill('#pa-aj','8'); await pg.click('[data-pa="aj"]'); await pg.fill('#rev-txt','contagem'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(1200)
        print('saldo',await J("__store['pecas/pa-o1'].saldo"))
        await pg.click('[data-pax="n"]'); await pg.wait_for_timeout(300)
        # desfazer agora pode
        await T("showTab('m-inspfin');IF.aba='feito';mxRender()"); await pg.wait_for_timeout(500)
        await pg.click('[data-if="desfaz"][data-id="o1"]'); await pg.wait_for_timeout(300); await pg.fill('#rev-txt','erro'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(1800)
        print('desf',await J("[__store['pecas/pa-o1'].status,__store['pecas/pa-o1'].saldo,__store['ordens/o1'].inspFinal.status,__store['pedidos/pd-1'].itens[0].situacao]"))
        # entrada avulsa
        await T("showTab('m-estpa')"); await pg.wait_for_timeout(500)
        await pg.click('[data-padn="m-estpa"]'); await pg.wait_for_timeout(300); await pg.select_option('#pa-it','it1'); await pg.fill('#pa-q','50'); await pg.fill('#pa-obs','inventario'); await pg.click('[data-pax="y"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(1200)
        print('avulsa',await J("Object.keys(__store).filter(function(k){return k.indexOf('pecas/pa-av')===0}).map(function(k){return __store[k].saldo})"),'movs',await J("Object.keys(__store).filter(function(k){return k.indexOf('movimentos/mv-pa')===0}).length"))
        print('errs',errs)
        await b.close()
asyncio.run(main())
