import sys, asyncio, json, os
sys.argv=[sys.argv[0],'x','/tmp/x']
exec(open('test_menu.py').read().split('async def main')[0])
SEED=r"""
store['fornecedores/f1']={nome:'PASIFER',razao:'PASIFER ACOS ESPECIAIS LTDA',cnpj:'11.222.333/0001-81',email:'vendas@pasifer.test',cidade:'Campinas',uf:'SP'};
store['fornecedores/f2']={nome:'KENNTOOLS',razao:'KENNTOOLS FERRAMENTAS',cnpj:'22.333.444/0001-81',email:'kt@kenn.test',uf:'SP'};
store['requisicoes/rq1']={num:'RC-0001/26',uid:'u1',nome:'Wander',setor:'Usinagem',para:'2026-11-20',urgente:false,itens:[{tipo:'mp',desc:'Aço 11SMNPB30',qtd:9.45,un:'kg',status:'aberta'},{tipo:'ferr',desc:'Inserto CNMG 120408',qtd:20,un:'pç',status:'aberta'}],criado:t,hist:[]};
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
        await T("showTab('m-comp');CM.aba='nec';mxRender()"); await pg.wait_for_timeout(800)
        for el in await pg.locator('[data-cmsel]').all(): await el.check()
        await pg.wait_for_timeout(300); await pg.screenshot(path='out/cot0.png')
        await pg.click('[data-cot="gerar"]'); await pg.wait_for_timeout(500)
        for f in ['PASIFER','KENNTOOLS']:
            await pg.fill('#ct-fq',f); await pg.press('#ct-fq','Enter'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='out/cot1.png')
        await pg.click('[data-ctx="y"]'); await pg.wait_for_timeout(1800)
        print('cot',await J("COT.list.map(function(c){return [c.num,c.status,c.itens.length,c.forn.length]})"),'ver',await pg.locator('.cot-cmp').count())
        print('nec pend',await J("cmLinhas().filter(function(r){return r.pend}).length"))
        # preços
        vals={'0:0:preco':'21,50','0:0:ipi':'5','1:0:preco':'23','0:1:preco':'48','1:1:preco':'39,90','1:1:ipi':'10'}
        for k,v in vals.items(): await pg.fill(f'[data-cvp="{k}"]',v)
        await pg.fill('[data-cvf="0:prazo"]','10'); await pg.fill('[data-cvf="1:prazo"]','5'); await pg.fill('[data-cvf="0:condPag"]','28 dias')
        await pg.click('[data-cvx="gravar"]'); await pg.wait_for_timeout(1200)
        await pg.click('[data-cvx="menor"]'); await pg.wait_for_timeout(400); await pg.screenshot(path='out/cot2.png',full_page=True)
        await pg.click('[data-cvx="aprovar"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(1200)
        print('aprov',await J("COT.list[0].status"),await J("COT.list[0].venc"))
        await pg.click('[data-cvx="gerar"]'); await pg.wait_for_timeout(300); await pg.click('#cfm-y'); await pg.wait_for_timeout(4000)
        print('conv',await J("COT.list[0].status"),await J("COT.list[0].pcs"))
        print('pcs',await J("CM.pcs.map(function(p){return [p.num,p.fornecedor,p.itens.map(function(x){return x.desc+'@'+x.preco}),p.condPag,p.prazo,p.validacao.status]})"))
        print('rq',await J("__store['requisicoes/rq1'].itens.map(function(x){return x.status+' '+(x.pcNum||'')})"))
        await pg.screenshot(path='out/cot3.png')
        # desfazer
        await T("CM.aba='cot';mxRender()"); await pg.wait_for_timeout(500); await pg.click('.ls-cot.ls-row'); await pg.wait_for_timeout(500)
        await pg.click('[data-cvx="desfazer"]'); await pg.fill('#rev-txt','preço errado'); await pg.click('[data-rvx="y"]'); await pg.wait_for_timeout(2500)
        print('desf',await J("COT.list[0].status"),await J("CM.pcs.map(function(p){return p.num+':'+p.status})"),await J("__store['requisicoes/rq1'].itens.map(function(x){return x.status})"))
        await T("$('mx-modal').hidden=true;COT.ver=null;CM.aba='cot';mxRender()"); await pg.wait_for_timeout(500); await pg.screenshot(path='out/cot4.png')
        # formulário de PC
        await T("pcNovo([])"); await pg.wait_for_timeout(600); await pg.click('[data-pcx="add"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='out/pcf.png')
        print('errs',errs)
        await b.close()
asyncio.run(main())
