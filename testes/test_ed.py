import sys, asyncio, json, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
M=MOCK
PFX=sys.argv[1] if len(sys.argv)>1 and sys.argv[1]!='x' else 'ed'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelector('#t-pc').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("void __T('showTab(\"itens\")')"); await pg.wait_for_timeout(500)
        await pg.click('#add'); await pg.wait_for_timeout(500)
        await pg.fill('#f-cod','170559'); await pg.fill('#f-desc','GUIA DA MOLA - DES.:4682'); await pg.fill('#f-qtd','100')
        for t in ['dados','mat','ops','trat','preco']:
            await pg.click(f'[data-et="{t}"]'); await pg.wait_for_timeout(300)
            if t=='ops':
                await pg.click('#op-add-int'); await pg.wait_for_timeout(200)
            if t=='trat':
                await pg.click('#tr-add'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'out/{PFX}_{t}.png')
        print('errs',errs)
        await b.close()
asyncio.run(main())
