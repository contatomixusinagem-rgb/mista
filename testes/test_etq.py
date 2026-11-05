import sys, asyncio, json, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
SEED=r"""
store['itens/it1']={codigo:'VS-SS-01',descricao:'SEDE',cliente:'MARRUCCI',idSeq:1,criado:t,roteiro:{status:'liberado',ops:[{op:'Tornear',rec:'Torno CNC',setup:30,ciclo:2}]},estrutura:{status:'liberado',mats:[{tipo:'mp',desc:'Aluminio',forma:'redonda',medida:'Ø30 x 25',consumo:0.05,un:'kg'}]}};
store['pedidos/pd-1']={num:'PD-0001/26',cliente:'MARRUCCI',emp:'MIX',etapa:'qualidade',prazo:'2026-12-11',itens:[{cod:'VS-SS-01',desc:'SEDE',qtd:6,itemId:'it1',opId:'o1',opNum:'OP-0001/26',situacao:'produzido (OP-0001/26)'}],criado:t,cancelado:0,hist:[]};
store['pedidos/pd-2']={num:'PD-0002/26',cliente:'MARRUCCI',emp:'MIX',etapa:'pedido',prazo:'2026-12-20',itens:[{cod:'VS-SS-01',desc:'SEDE',qtd:3,itemId:'it1',situacao:'aguardando OP'}],criado:t,cancelado:0,hist:[]};
store['lotes/l1']={lote:'135/26',material:'Aluminio 6351 T6',forma:'redonda',medida:'Ø32',corrida:'88123',nf:'7890',fornecedor:'PASIFER',status:'liberado',tipo:'mp',saldo:12,qtdRec:12,un:'kg',empenhado:0,inspecao:{status:'aprovado',nome:'Thales'},criado:t};
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
        await pg.fill('[data-ife="aprovadas"]','8'); await pg.select_option('[data-ife="res"]','concessao'); await pg.fill('[data-ife="obs"]','2 pc com risco no diametro externo'); await pg.click('[data-ifx="y"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(1500)
        print('lote',await J("(function(l){return l&&[l.saldo,l.reservas.map(function(r){return r.pedidoNum+':'+r.qtd}),l.status]})(__store['pecas/pa-o1'])"))
        print('pd1',await J("[__store['pedidos/pd-1'].etapa,__store['pedidos/pd-1'].itens[0].situacao]"))
        await T("showTab('m-estpa')"); await pg.wait_for_timeout(700); await pg.screenshot(path='out/pa1.png')
        print('linhas',await pg.locator('.ls-pa.ls-row').count())
        await T("window.__sv=[];cnSave=function(n,b){window.__sv.push(n);window.__b=b}")
        async def salva(nome):
            b64=await pg.evaluate("new Promise(function(ok){var r=new FileReader();r.onload=function(){ok(r.result.split(',')[1])};r.readAsDataURL(window.__b)})")
            import base64; open('out/'+nome,'wb').write(base64.b64decode(b64))
        # etiqueta aprovado com 3 pacotes
        await T("showTab('m-estpa')"); await pg.wait_for_timeout(500); await pg.click('.ls-pa.ls-row'); await pg.wait_for_timeout(400)
        await pg.fill('#pa-loc','CX07'); await pg.click('[data-pa="loc"]'); await pg.wait_for_timeout(700)
        await pg.click('[data-etq="pa-apr"]'); await pg.wait_for_timeout(400)
        await pg.fill('[data-eqf="_pac"]','3'); await pg.dispatch_event('[data-eqf="_pac"]','change'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='out/etq1.png')
        await pg.click('[data-eqx="y"]'); await pg.wait_for_timeout(2500); await salva('etq_apr.pdf')
        print('sv',await J("window.__sv"),'regs',await J("Object.keys(__store).filter(function(k){return k.indexOf('etiquetas/')===0}).length"),'volta',await pg.locator('.pa-mod').count())
        # expedição pela reserva
        await pg.click('[data-etq="pa-exp"]'); await pg.wait_for_timeout(400); await pg.fill('[data-eqf="nf"]','1234'); await pg.click('[data-eqx="y"]'); await pg.wait_for_timeout(2000); await salva('etq_exp.pdf')
        await pg.click('[data-pax="n"]'); await pg.wait_for_timeout(300)
        # não conforme pela inspeção
        await T("showTab('m-inspfin');IF.aba='feito';mxRender()"); await pg.wait_for_timeout(500); await pg.click('.ls-if.ls-row'); await pg.wait_for_timeout(400)
        await pg.click('[data-etq="if-nc"]'); await pg.wait_for_timeout(400); await pg.click('[data-eqx="y"]'); await pg.wait_for_timeout(2000); await salva('etq_nc.pdf')
        # material recebido
        await T("showTab('m-estmp');cmSub();ltVer(CM.lotes.filter(function(x){return x.id==='l1'})[0])"); await pg.wait_for_timeout(600)
        await pg.click('[data-etq="lt-mat"]'); await pg.wait_for_timeout(400); await pg.click('[data-eqx="y"]'); await pg.wait_for_timeout(2000); await salva('etq_mat.pdf')
        # tela etiquetas
        await T("$('mx-modal').hidden=true;CM.ltv=null;showTab('m-etq')"); await pg.wait_for_timeout(600); print('lista',await pg.locator('.ls-etq.ls-row').count()); await pg.screenshot(path='out/etq2.png')
        await pg.click('#mx-box .ft-btn'); await pg.fill('[data-flt="in"]','CX07'); await pg.wait_for_timeout(600); print('filtro',await pg.locator('.ls-etq.ls-row').count())
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.click('[data-et="re"] >> nth=0'); await pg.wait_for_timeout(1500); print('reimp',await J("Object.keys(__store).filter(function(k){return k.indexOf('etiquetas/')===0&&__store[k].reimpressoes}).length"))
        await pg.click('[data-etqn]'); await pg.wait_for_timeout(300); await pg.click('[data-etqt="naoconforme"]'); await pg.wait_for_timeout(300); await pg.fill('[data-eqf="codigo"]','BARRA INOX'); await pg.click('[data-eqx="y"]'); await pg.wait_for_timeout(1500)
        print('avulsa',await pg.locator('.ls-etq.ls-row').count())
        print('errs',errs)
        await b.close()
asyncio.run(main())
