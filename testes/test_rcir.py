import sys, asyncio, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
M=MOCK.replace("window.__store=store;",open('seed2107.js').read()+"for(var k in store){if(k.indexOf('lotes/')===0){store[k].status='aguardando inspeção';delete store[k].inspecao}if(k.indexOf('ordens/')===0){store[k].materiais.forEach(function(m){delete m.empenhos})}}window.__store=store;")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(3000)
        J=lambda s:pg.evaluate("__T(`JSON.stringify("+s+")`)")
        await pg.evaluate("void __T('showTab(\"m-receb\")')"); await pg.wait_for_timeout(700)
        await pg.click('[data-ls="rcaba"][data-a="i"]'); await pg.wait_for_timeout(600)
        print('linhas',await pg.locator('.ls-ir.ls-row').count(),'ft',await pg.locator('#mx-box .ft-btn').count()); await pg.screenshot(path='out/rcir1.png')
        await pg.locator('.ls-ir.ls-row').first.click(); await pg.wait_for_timeout(500)
        print('form',await pg.locator('#mx-modal:not([hidden]) [data-irx="y"]').count())
        for el in await pg.locator('#mx-modal input[type=radio][value="C"]').all(): await el.check()
        if await pg.locator('#mx-modal select').count():
            sels=await pg.locator('#mx-modal select').all()
            for s_ in sels:
                opts=await s_.evaluate("e=>Array.from(e.options).map(o=>o.value)")
                if 'aprovado' in opts: await s_.select_option('aprovado')
        await pg.click('[data-irx="y"]'); await pg.wait_for_timeout(500)
        if await pg.locator('#cfm-y:visible').count(): await pg.click('#cfm-y')
        await pg.wait_for_timeout(2500)
        print('lotes',await J("CM.lotes.map(function(l){return l.lote+':'+l.status})"),'tab',await J("[S.tab,CM.rcAba]"))
        await pg.click('[data-ir="aba"][data-a="feito"]'); await pg.wait_for_timeout(400); print('feitos',await pg.locator('.ls-ir.ls-row').count())
        print('menu',await J("MSM.def.modulos.filter(function(m){return m.nome==='Qualidade'})[0].areas.map(function(a){return a.nome})"))
        print('errs',errs)
        await b.close()
asyncio.run(main())
