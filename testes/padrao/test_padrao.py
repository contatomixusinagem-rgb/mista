import sys, asyncio, json, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
M=MOCK.replace("window.__store=store;",open('seed.js').read()+"window.__store=store;")
TELAS=json.load(open('db1105/mod_upd.json'))['modulos']
ISENTAS={'Dashboard de vendas','Monitor de produção','Apontamentos','Programação de máquinas','Permissões','Parâmetros de custo','Empresas','Painel de implantação','Financeiro','Contas a receber'}
AUD=r"""(function(){var b=document.querySelector('#v-mx')&&!document.querySelector('#v-mx').hidden?document.querySelector('#v-mx'):document.querySelector('main')||document.body;
 function vis(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'}
 var P=Array.prototype.filter.call(document.querySelectorAll('.mh p, p.hint, .hint, .mx-bar>span'),function(e){return vis(e)&&!e.querySelector('button,input,select')&&e.innerText.trim().length>25&&!e.closest('#mx-modal')&&!e.closest('.pg-bar,.pgb')});
 var rows=Array.prototype.filter.call(document.querySelectorAll('tbody tr, .ls-row, [class$="-r"]:not(.fh)'),function(e){return vis(e)&&!e.closest('#mx-modal')});
 var txtBtn=0,ex=[];Array.prototype.filter.call(document.querySelectorAll('.tbx, #pf-list, table'),function(e){return vis(e)&&!e.closest('#mx-modal')}).forEach(function(r){Array.prototype.forEach.call(r.querySelectorAll('.ls-row button, tbody button, [data-rid] button, [class$="-r"]:not(.fh) button, .cr3 button'),function(x){var t=x.innerText.trim();if(t&&vis(x)&&!x.classList.contains('lnk')){txtBtn++;if(ex.length<6&&ex.indexOf(t)<0)ex.push(t)}})});
 var cards=Array.prototype.filter.call(document.querySelectorAll('.card'),function(e){return vis(e)&&!e.closest('#mx-modal')}).length;
 var ft=!!Array.prototype.filter.call(document.querySelectorAll('.ft-btn'),vis).length;
 var novo=Array.prototype.filter.call(document.querySelectorAll('button'),function(x){return vis(x)&&/^\+\s*Novo/.test(x.innerText.trim())}).length;
 var pg=!!Array.prototype.filter.call(document.querySelectorAll('.pg-bar,.pgb,[class*="pg-"]'),vis).length;
 return {hint:P.map(function(e){return e.innerText.trim().slice(0,60)}).slice(0,3),linhas:rows.length,botoesTexto:txtBtn,ex:ex,cards:cards,filtrar:ft,novo:novo,pag:pg}})()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1500,'height':950})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/out/probe.html'); await pg.wait_for_timeout(3000)
        await pg.evaluate("void __T('USR.dono=true;usrAplica()')")
        res={}
        for m in TELAS:
            for a in m['areas']:
                if not a.get('tela'):continue
                nm=m['nome']+' › '+a['nome']
                try:
                    await pg.evaluate("void __T(`(function(){var e=document.querySelector('"+a['tela'].replace("'","\\'")+"');if(e)e.click()})()`)")
                    await pg.wait_for_timeout(900)
                    r=await pg.evaluate(AUD); r['isenta']=a['nome'] in ISENTAS; res[nm]=r
                    if not r['isenta'] and r['filtrar']:
                        tab0=await pg.evaluate("__T('S.tab')")
                        fb=pg.locator('.ft-btn:visible').first
                        await fb.click(); await pg.wait_for_timeout(200)
                        inp=pg.locator('[data-flt="in"]:visible, #pf-q:visible').first
                        if await inp.count():
                            await inp.click(); await inp.fill('zzqq'); await inp.dispatch_event('input'); await pg.wait_for_timeout(700)
                        tab1=await pg.evaluate("__T('S.tab')")
                        r['ftok']=(tab0==tab1) and await inp.count()>0
                        if await inp.count():
                            await inp.fill(''); await inp.dispatch_event('input'); await pg.wait_for_timeout(400)
                        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
                    await pg.screenshot(path='out/aud/'+nm.replace(' › ','_').replace(' ','-').replace('/','-')+'.png')
                except Exception as e: res[nm]={'erro':str(e)[:200]}
        for k,v in res.items():
            if v.get('isenta'):continue
            prob=[]
            if v.get('erro'):prob.append('ERRO '+v['erro'])
            else:
                if not v['filtrar']:prob.append('sem Filtrar')
                elif v.get('ftok') is False:prob.append('Filtrar não funciona (muda de tela ou não abre o campo)')
                if v['hint']:prob.append('texto: '+' | '.join(v['hint']))
                if v['botoesTexto']:prob.append('%d botões com texto na linha %s'%(v['botoesTexto'],v['ex']))
                if v['cards']>3:prob.append('%d painéis/cards'%v['cards'])
                if not v['pag']:prob.append('sem paginação')
            print(('OK  ' if not prob else 'FORA')+' '+k+(' — '+'; '.join(prob) if prob else ''))
        print('errs',errs[:5])
        await b.close()
asyncio.run(main())
