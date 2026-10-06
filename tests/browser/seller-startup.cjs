// Optional Playwright check. All auth/API traffic is mocked; no production writes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 try{for(const state of ['seller','signed-out','failed']){
  const page=await browser.newPage();let release;const pending=new Promise(resolve=>release=resolve);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const p=new URL(route.request().url()).pathname;
   if(p==='/seller-auth.js')return route.fulfill({contentType:'application/javascript',body:'const sellerAuth={accessToken:async()=>(await (await fetch("/test-token")).json()).token};'});
   if(p==='/test-token'){await pending;return route.fulfill({json:{token:state==='signed-out'?null:'test'}});}
   if(p==='/api/v1/session')return route.fulfill({status:state==='failed'?503:200,json:state==='failed'?{detail:'Connection unavailable'}:{authenticated:true}});
   if(p.startsWith('/api/'))return route.fulfill({json:{cards:[],revision:1}});
   const file=path.join(path.resolve(__dirname,'../../frontend'),p);
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'image/jpeg'});
   return route.fulfill({status:404,body:''});
  });
  await page.goto('http://bindr.test/seller.html',{waitUntil:'domcontentloaded'});
  await page.locator('#sellerSessionLoading').waitFor();assert.equal(await page.locator('#sellerAuth').isVisible(),false);
  release();await page.locator('#sellerSessionLoading').waitFor({state:'hidden'});
  if(state==='seller'){await page.locator('#onlineSellerMain').waitFor();assert.equal(await page.locator('#sellerAuth').isVisible(),false);}
  else{await page.locator('#sellerAuth').waitFor();if(state==='failed')assert.match(await page.locator('#loginStatus').textContent(),/Connection unavailable/);}
  assert.deepEqual(errors,[]);console.log('PASS seller startup:',state);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
