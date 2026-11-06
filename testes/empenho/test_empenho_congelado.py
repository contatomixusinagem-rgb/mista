import sys, asyncio, os
P=sys.argv[1];sys.argv=[sys.argv[0],'x','/tmp/x'];sys.argv_p=P
exec(open('test_menu.py').read().split('async def main')[0])
MF=MOCK.replace("JSON.parse(JSON.stringify(store[k]))","FZ(store[k])").replace("JSON.parse(JSON.stringify(store[p]))","FZ(store[p])").replace("var store={}, subs=[];","var store={}, subs=[];function FZ(o){o=JSON.parse(JSON.stringify(o));(function f(x){if(x&&typeof x=='object'){Object.freeze(x);Object.keys(x).forEach(function(k){f(x[k])})}})(o);return o}").replace("{collection:C,doc:D}","Object.freeze({collection:C,doc:D})")
M=MF.replace("window.__store=store;",open('seed2107.js').read()+"window.__store=store;")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300])); pg.on('console',lambda m:errs.append('C:'+m.text[:200]) if m.type=='error' else None)
        await pg.add_init_script(M)
        await pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.goto('file://'+os.getcwd()+'/'+sys.argv_p); await pg.wait_for_timeout(3000)
        J=lambda s:pg.evaluate("__T(`JSON.stringify("+s+")`)")
        await pg.evaluate("void __T('cmSub();ppSub()')"); await pg.wait_for_timeout(1000)
        print(await J("[CM.lotes.length,PP.ops.length,CM.lotes.map(function(l){return [l.lote,ltLib(l),ltDisp(l),l.un]})]"))
        print(await J("PP.ops.map(function(o){return (o.materiais||[]).map(function(m){return [o.num,m.un,mFalta(m),CM.lotes.map(function(l){return ltServe(l,m)})]})})"))
        await pg.wait_for_timeout(9000)
        print(await J("Object.keys(__store).filter(function(k){return k.indexOf('ordens/')===0}).map(function(k){return (__store[k].materiais||[]).map(function(m){return m.empenhos})})"))
        print(errs[:5])
        await b.close()
asyncio.run(main())
