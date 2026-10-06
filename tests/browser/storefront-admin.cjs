// Optional browser regression: PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node tests/browser/storefront-admin.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 try{
 for(const role of ['anonymous','buyer','seller']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let currentRole=role,privateReads=0,revision=1;
  const base={...JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../inventory.json'))).cards[0],status:'available',sold:false,version:1};
  base.photoRoles=base.photos.map((_,i)=>i===0?'front':'detail');
  let cards=[base,{...base,id:'c900',name:'Private draft',status:'draft'}];const errors=[];
  await context.route('**/*',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;
   if(p==='/seller-auth.js')return route.fulfill({contentType:'application/javascript',body:`const sellerAuth={accessToken:async()=>(await (await fetch('/test-token')).json()).token,signIn:async()=>{sessionStorage.removeItem('bindr-admin-mode');await fetch('/test-signin')},signOut:async()=>{await fetch('/test-signout')}};`});
   if(p==='/test-token')return route.fulfill({json:{token:currentRole==='anonymous'?null:'test'}});
   if(p==='/test-signin'){currentRole='seller';return route.fulfill({json:{}});}
   if(p==='/test-signout'){currentRole='anonymous';return route.fulfill({json:{}});}
   if(p.startsWith('/api/v1/')){
    if(p.endsWith('/inventory'))return route.fulfill({json:{cards:cards.filter(c=>c.status!=='draft'),revision}});
    if(currentRole!=='seller')return route.fulfill({status:403,json:{detail:'Seller required'}});
    if(p.endsWith('/session'))return route.fulfill({json:{authenticated:true,email:'seller@example.test'}});
    if(p.includes('/listings')){
     privateReads++;
     if(req.method()==='PUT'){const c=req.postDataJSON().card;const previous=cards.find(x=>x.id===c.id);if(c.version!==previous?.version)return route.fulfill({status:409,json:{detail:'Stale version'}});cards=cards.filter(x=>x.id!==c.id);cards.push({...c,version:(previous?.version||0)+1});revision++;}
     return route.fulfill({json:{cards,revision}});
    }
    return route.fulfill({json:{}});
   }
   const file=path.join(path.resolve(__dirname,'../../frontend'),p==='/'?'index.html':p);
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({headers:{'X-Frame-Options':p==='/seller.html'?'SAMEORIGIN':'DENY'},body:fs.readFileSync(file),contentType:p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'image/jpeg'});
   return route.fulfill({status:404,body:''});
  });
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.stack);});await page.goto('http://bindr.test/index.html');await page.locator('#binderGrid [data-card]').first().waitFor();
  if(role!=='seller'){
   assert.equal(await page.locator('#storefrontMode').isVisible(),false);assert.equal(await page.locator('[data-admin-edit]').count(),0);assert.equal(privateReads,0);
   if(role==='anonymous'){
    await page.click('#storefrontLoginLink');await page.fill('#storefrontEmail','seller@example.test');await page.fill('#storefrontPassword','test-password');await page.click('#storefrontLoginSubmit');await page.locator('#storefrontMode').waitFor();assert.equal(await page.locator('#storefrontAdminTools').isVisible(),false);
   }
  }else{
   await page.locator('#storefrontMode').waitFor();assert.equal(await page.locator('#storefrontAdminTools').isVisible(),false);
   await page.click('#adminMode');await page.locator('[data-admin-resume="c900"]').waitFor();await page.locator('[data-admin-edit]').first().waitFor();
   assert.equal(await page.locator('#binderGrid').getByText('Private draft').count(),0);
   await page.reload();await page.locator('#storefrontNew').waitFor();await page.screenshot({path:'/tmp/bindr-storefront-admin-mobile.png',fullPage:true});
   await page.click('#storefrontNew');const editor=page.frameLocator('#storefrontEditorFrame');await editor.locator('#guidedEditor').waitFor();
   await editor.locator('#guidedExit').click();await page.locator('#storefrontEditor').waitFor({state:'hidden'});assert.equal(cards.length,3);
   await page.click('[data-admin-resume="c900"]');await editor.locator('#guidedEditor').waitFor();await editor.locator('#guidedNext').click();await editor.locator('#guidedPrice').fill('32');await editor.locator('#guidedPublish').click();await editor.locator('#guidedSuccess').waitFor();await editor.locator('#guidedDone').click();await page.locator('#binderGrid [data-card="c900"]').waitFor();
   await page.click('[data-admin-edit="c900"]');await editor.locator('#sellerEditor').waitFor();await editor.locator('#sellerPrice').fill('45');await editor.locator('#sellerSaveLabel').click();await page.locator('#storefrontEditor').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#binderGrid [data-card="c900"] .price').textContent.includes('45'));
   await page.click('#buyerMode');assert.equal(await page.locator('[data-admin-edit]').count(),0);assert.equal(await page.locator('#storefrontDrafts').isVisible(),false);
   await page.click('#adminMode');await page.locator('#storefrontNew').waitFor();await page.click('#storefrontSignOut');await page.locator('#storefrontMode').waitFor({state:'hidden'});assert.equal(await page.locator('[data-admin-edit]').count(),0);
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS storefront role:',role);
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
