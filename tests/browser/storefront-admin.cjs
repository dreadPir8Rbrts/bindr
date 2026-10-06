// Optional browser regression: PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node tests/browser/storefront-admin.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 try{
 for(const role of ['anonymous','buyer','seller']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let currentRole=role,privateReads=0,revision=1,scanCalls=0,sessionChecks=0,sellerPages=0,expireScan=false;
  const base={...JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../inventory.json'))).cards[0],status:'available',sold:false,version:1};
  base.photoRoles=base.photos.map((_,i)=>i===0?'front':'detail');
  let cards=[base,{...base,id:'c900',name:'Private draft',status:'draft'}];const errors=[];
  await context.route('**/*',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;
   if(p==='/seller.html')sellerPages++;
   if(p==='/api/v1/session')sessionChecks++;
   if(p==='/api/v1/scan'&&expireScan){expireScan=false;currentRole='anonymous';return route.fulfill({status:401,json:{detail:'Session expired'}});}
   if(p==='/seller-auth.js')return route.fulfill({contentType:'application/javascript',body:`const sellerAuth={accessToken:async()=>(await (await fetch('/test-token')).json()).token,signIn:async()=>{sessionStorage.removeItem('bindr-admin-mode');await fetch('/test-signin')},signOut:async()=>{await fetch('/test-signout')}};`});
   if(p==='/test-token')return route.fulfill({json:{token:currentRole==='anonymous'?null:'test'}});
   if(p==='/test-signin'){currentRole='seller';return route.fulfill({json:{}});}
   if(p==='/test-signout'){currentRole='anonymous';return route.fulfill({json:{}});}
   if(p.startsWith('/api/v1/')){
    if(p.endsWith('/inventory'))return route.fulfill({json:{cards:cards.filter(c=>c.status!=='draft'),revision}});
    if(currentRole!=='seller')return route.fulfill({status:403,json:{detail:'Seller required'}});
    if(p.endsWith('/session'))return route.fulfill({json:{authenticated:true,email:'seller@example.test'}});
    if(p.endsWith('/scan')){scanCalls++;return route.fulfill({json:scanCalls===1?{status:'no_match'}:{status:'matched',card:{id:'00000000-0000-4000-8000-000000000001',name:'Pikachu',set:'Base Set · 58/102 · Common',image_url:'images/full/c1_1.jpg'},confidence:.99}});}
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
   await page.click('#adminMode');await page.locator('[data-admin-edit]').first().waitFor();
   assert.equal(await page.locator('#storefrontDrafts').isVisible(),false);assert.equal(await page.getByText('Seller tools',{exact:true}).count(),0);
   const beforeDrafts={sessionChecks,sellerPages};await page.click('[data-admin-nav="drafts"]');await page.locator('[data-admin-resume="c900"]').waitFor();assert.deepEqual({sessionChecks,sellerPages},beforeDrafts);assert.equal(await page.locator('#catalog').isVisible(),false);
   await page.screenshot({path:'/tmp/bindr-drafts-page.png'});
   await page.click('#storefrontDraftBack');assert.equal(await page.locator('#catalog').isVisible(),true);
   assert.equal(await page.locator('#binderGrid').getByText('Private draft').count(),0);
   await page.reload();await page.locator('[data-admin-nav="new"]').waitFor();await page.screenshot({path:'/tmp/bindr-storefront-admin-mobile.png',fullPage:true});
   await page.click('[data-admin-nav="new"]');const editor=page;await editor.locator('#guidedEditor').waitFor();
   await editor.locator('#guidedExit').click();await page.locator('#guidedEditor').waitFor({state:'hidden'});assert.equal(cards.length,3);
   await page.click('[data-admin-nav="drafts"]');await page.click('[data-admin-resume="c900"]');await editor.locator('#guidedEditor').waitFor();await editor.locator('#guidedNext').click();await editor.locator('#guidedPrice').fill('32');await editor.locator('#guidedPublish').click();await editor.locator('#guidedSuccess').waitFor();await editor.locator('#guidedDone').click();await page.locator('#guidedEditor').waitFor({state:'hidden'});await page.click('#storefrontDraftBack');await page.locator('#binderGrid [data-card="c900"]').waitFor();
   await page.click('[data-admin-edit="c900"]');await page.frameLocator('#storefrontEditorFrame').locator('#sellerEditor').waitFor();await page.frameLocator('#storefrontEditorFrame').locator('#sellerPrice').fill('45');await page.frameLocator('#storefrontEditorFrame').locator('#sellerSaveLabel').click();await page.locator('#storefrontEditor').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#binderGrid [data-card="c900"] .price').textContent.includes('45'));
   const beforeOpen={sessionChecks,sellerPages,privateReads};await page.click('[data-admin-nav="scan"]');await editor.locator('#guidedScanIntro').waitFor();assert.deepEqual({sessionChecks,sellerPages,privateReads},beforeOpen);
   assert.equal(await editor.locator('#guidedScanCamera').getAttribute('capture'),'environment');
   await page.screenshot({path:'/tmp/bindr-scan-start.png'});
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=700;const x=c.getContext('2d');x.fillStyle='gold';x.fillRect(0,0,500,700);return c.toDataURL('image/png').split(',')[1];});
   const photo={name:'front.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
   await editor.locator('#guidedScanCamera').setInputFiles(photo);await editor.getByRole('button',{name:'Quick Scan',exact:true}).waitFor();
   const writesBeforeScan=revision;assert.equal(scanCalls,0);const oldPreview=await editor.locator('#guidedCandidateImage').getAttribute('src');
   const choosing=page.waitForEvent('filechooser');await editor.getByRole('button',{name:'Retake Photo',exact:true}).click();await (await choosing).setFiles(photo);
   await page.waitForFunction(old=>document.querySelector('#guidedCandidateImage').src!==old,oldPreview);
   await page.screenshot({path:'/tmp/bindr-scan-preview.png'});
   await page.evaluate(()=>{uploadSellerPhoto=async()=>{throw Error('Identification must not upload a listing photo');};});
   expireScan=true;
   await editor.getByRole('button',{name:'Quick Scan',exact:true}).click();await page.locator('#storefrontLogin').waitFor();
   await page.fill('#storefrontEmail','seller@example.test');await page.fill('#storefrontPassword','test-password');await page.click('#storefrontLoginSubmit');await page.locator('#storefrontLogin').waitFor({state:'hidden'});
   assert.equal(await page.locator('#guidedEditor').isVisible(),true);await editor.locator('#guidedScan').click();await editor.locator('[data-guided-step="1"]').waitFor();await page.waitForFunction(()=>document.querySelector('#guidedScanStatus').textContent.includes('No confident match'));
   assert.equal(scanCalls,1);assert.equal(revision,writesBeforeScan);await editor.locator('#guidedScan').click();await editor.locator('[data-guided-step="4"]').waitFor();
   assert.ok((await editor.locator('#guidedIdentifiedCard').textContent()).includes('58/102'));
   await page.screenshot({path:'/tmp/bindr-identified-card.png'});
   const retake=page.waitForEvent('filechooser');await editor.locator('#guidedMatchRetake').click();await (await retake).setFiles(photo);await editor.getByRole('button',{name:'Quick Scan',exact:true}).click();await editor.locator('[data-guided-step="4"]').waitFor();
   assert.equal(revision,writesBeforeScan);await editor.getByRole('button',{name:'Create Listing',exact:true}).click();await editor.locator('[data-guided-step="5"]').waitFor();assert.equal(await editor.locator('#guidedName').inputValue(),'Pikachu');assert.equal(await editor.locator('#guidedSet').inputValue(),'Base Set · 58/102 · Common');
   await editor.locator('#guidedNext').click();assert.equal(await editor.locator('[data-guided-step="5"]').isVisible(),true);
   await editor.locator('#guidedPrice').fill('20');
   await page.evaluate(()=>{uploadSellerPhoto=async()=>({url:'images/full/c1_2.jpg'});});
   await editor.locator('#guidedDetail').setInputFiles(photo);await editor.locator('#guidedUsePhoto').click();await editor.locator('#guidedCandidate').waitFor({state:'hidden'});
   assert.equal(await editor.locator('#guidedPhotos img').count(),1);
   await editor.locator('#guidedNext').click();await editor.locator('[data-guided-step="6"]').waitFor();assert.ok((await editor.locator('#guidedPreview').textContent()).includes('1 photo'));
   await page.screenshot({path:'/tmp/bindr-listing-preview.png'});
   await editor.locator('#guidedPrevious').click();await editor.locator('[data-guided-step="5"]').waitFor();assert.equal(await editor.locator('#guidedPrice').inputValue(),'20');
   await editor.locator('#guidedNext').click();await editor.locator('#guidedPublish').click();await editor.locator('#guidedSuccess').waitFor();await editor.locator('#guidedDone').click();await page.locator('#guidedEditor').waitFor({state:'hidden'});
   await page.click('[data-admin-nav="scan"]');await editor.locator('#guidedScanIntro').waitFor();await page.click('[data-admin-nav="drafts"]');await page.locator('#guidedEditor').waitFor({state:'hidden'});await page.locator('#storefrontDrafts').waitFor();
   const savedCards=cards;cards=cards.filter(c=>c.status!=='draft');await page.click('#storefrontDraftRefresh');await page.waitForFunction(()=>document.querySelector('#storefrontDraftStatus').textContent.startsWith('No private drafts'));assert.equal(await page.locator('[data-admin-resume]').count(),0);cards=savedCards;
   await page.click('#buyerMode');assert.equal(await page.locator('#adminMobileNav').isVisible(),false);assert.equal(await page.locator('[data-admin-edit]').count(),0);assert.equal(await page.locator('#storefrontDrafts').isVisible(),false);
   await page.click('#adminMode');await page.locator('[data-admin-nav="new"]').waitFor();await page.click('#storefrontSignOut');await page.locator('#storefrontMode').waitFor({state:'hidden'});assert.equal(await page.locator('[data-admin-edit]').count(),0);
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS storefront role:',role);
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
