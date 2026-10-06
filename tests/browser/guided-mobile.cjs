// Run with Playwright installed; optionally set PLAYWRIGHT_MODULE and CHROME_PATH. All APIs are mocked.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});let cards=[],revision=0,failPut=false;const errors=[];
 await context.route('**/*',async route=>{
 const u=new URL(route.request().url()),p=u.pathname;
 if(p==='/seller-auth.js')return route.fulfill({contentType:'application/javascript',body:'const sellerAuth={accessToken:async()=>"test",signIn:async()=>{},signOut:async()=>{}};'});
 if(p.startsWith('/api/v1/')){
 let data={};if(p.includes('/listings')){if(route.request().method()==='PUT'){const c=route.request().postDataJSON().card;const old=cards.find(x=>x.id===c.id);if(old?.version!==c.version)return route.fulfill({status:409,json:{detail:'Version conflict'}});cards=cards.filter(x=>x.id!==c.id);cards.push({...c,version:(old?.version||0)+1});revision++;if(failPut){failPut=false;return route.abort();}}data={cards,revision};}
 if(p.endsWith('/scan'))data={status:'matched',card:{id:'00000000-0000-4000-8000-000000000001',name:'Pikachu',set:'Base · 58/102'},confidence:.95};
 return route.fulfill({json:data});}
 const file=path.join(path.resolve(__dirname,'../../frontend'),p==='/'?'seller.html':p);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'image/jpeg'});return route.fulfill({status:404,body:''});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://bindr.test/seller.html');await page.locator('#newListing').waitFor({state:'visible'});
 await page.evaluate(()=>{uploadSellerPhoto=async()=>({url:'images/full/c1_1.jpg'});});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=500;c.height=700;const x=c.getContext('2d');x.fillStyle='gold';x.fillRect(0,0,500,700);return c.toDataURL('image/png').split(',')[1];});
 await page.click('#newListing');await page.locator('#guidedLibrary').setInputFiles({name:'front.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('#guidedCandidate').waitFor({state:'visible'});
 // Actual wheel input catches clipped grid content that locator.click auto-scroll can hide.
 await page.locator('#guidedUsePhoto').waitFor({state:'attached'});
 await page.waitForFunction(()=>!document.querySelector('#guidedUsePhoto').disabled);
 await page.locator('.guided-body').evaluate(e=>e.scrollTop=0);
 await page.mouse.move(190,400);await page.mouse.wheel(0,900);
 await page.waitForFunction(()=>document.querySelector('.guided-body').scrollTop>0);
 const exitBox=await page.locator('#guidedExit').boundingBox();assert.ok(exitBox.y>=0&&exitBox.y+exitBox.height<844);
 await page.click('#guidedUsePhoto');await page.locator('.guided-match').waitFor();assert.equal(cards.length,1);assert.equal(cards[0].status,'draft');assert.equal(cards[0].photoRoles[0],'front');
 await page.click('.guided-match');await page.click('#guidedNext');await page.locator('[data-guided-step="2"]').waitFor({state:'visible'});assert.equal(await page.locator('#guidedNext').textContent(),'Skip for now');await page.click('#guidedNext');await page.locator('[data-guided-step="3"]').waitFor({state:'visible'});await page.fill('#guidedPrice','25.50');await page.click('#guidedExit');await page.locator('#guidedEditor').waitFor({state:'hidden'});
 // Reload simulates resuming from another device: no guided state is persisted locally.
 await page.reload();await page.click('[data-resume]');await page.click('#guidedNext');assert.equal(await page.inputValue('#guidedPrice'),'25.5');
 assert.equal(await page.evaluate(()=>document.querySelector('#guidedEditor').scrollWidth<=document.querySelector('#guidedEditor').clientWidth+1),true);
 await page.screenshot({path:'/tmp/bindr-guided-mobile.png',fullPage:true});
 failPut=true;await page.click('#guidedPublish');await page.locator('#guidedRetry').waitFor({state:'visible'});await page.click('#guidedRetry');await page.locator('#guidedSuccess').waitFor({state:'visible'});assert.equal(cards[0].status,'available');assert.equal(cards.length,1);assert.equal(cards[0].photoRoles.length,1);await page.click('#guidedDone');await page.locator('#sellerGrid [data-edit]').first().click();assert.equal(await page.locator('#sellerEditor').isVisible(),true);await page.click('#closeSellerEditor');
 // Save & exit from the photo preview must attach the photo, not trap the seller.
 await page.evaluate(()=>{uploadSellerPhoto=async()=>({url:'images/full/c1_1.jpg'});});
 await page.click('#newListing');await page.locator('#guidedLibrary').setInputFiles({name:'front.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.waitForFunction(()=>!document.querySelector('#guidedCandidate').hidden&&!document.querySelector('#guidedExit').disabled);
 await page.click('#guidedExit');await page.locator('#guidedEditor').waitFor({state:'hidden'});
 assert.equal(cards.length,2);assert.equal(cards[1].status,'draft');assert.equal(cards[1].photos.length,1);
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile wheel scrolling, visible header, save preview and exit, mobile photo preview, draft attachment, automatic scan, optional back, autosave, reload/resume, lost publication retry, published editor; no page errors or horizontal overflow');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
