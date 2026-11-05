import sys, asyncio, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script(MOCK)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelector('#t-pc').click()"); await pg.wait_for_timeout(400)
        await pg.evaluate("void __T('showTab(\"itens\")')"); await pg.wait_for_timeout(400)
        J=lambda s:pg.evaluate("__T(`JSON.stringify("+s+")`)")
        n=await J("S.items.length"); print('itens',n)
        await pg.evaluate("void __T('openEd(0,false)')"); await pg.wait_for_timeout(400)
        print('ant disabled',await pg.locator('[data-etgo="-1"][disabled]').count())
        await pg.fill('#f-nota','obs item 1'); await pg.click('[data-et="mat"]'); await pg.click('[data-etgo="1"]'); await pg.wait_for_timeout(400)
        print('sel',await J("S.sel"),'etab',await J("S.etab"),'nota1',await J("S.items[0].nota"))
        for k in range(10):
            t=await pg.inner_text('[data-etgo="1"]')
            if 'Novo' in t: break
            await pg.click('[data-etgo="1"]'); await pg.wait_for_timeout(250)
        print('ultimo',await J("S.sel"),t)
        await pg.click('[data-etgo="1"]'); await pg.wait_for_timeout(400); print('novo',await J("[S.sel,S.items.length]"))
        await pg.click('[data-edx="cancel"]'); await pg.wait_for_timeout(300); print('cancel novo',await J("S.items.length"),'nota mantida',await J("S.items[0].nota"))
        print('errs',errs)
        await b.close()
asyncio.run(main())
