const {chromium,devices}=require('/Users/sebastienscott/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
for(const model of ['iPhone SE','iPhone 13','iPhone 13 Pro Max']){
 const context=await browser.newContext({...devices[model],defaultBrowserType:undefined});
 const page=await context.newPage();
 await context.route('**/.netlify/functions/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 await page.goto(process.env.PREVIEW_URL);await page.locator('.pocket').first().waitFor();
 await page.screenshot({path:'/tmp/bindr-'+model.replaceAll(' ','-')+'.png'});
 await page.locator('.photo-open').first().tap();
 await page.locator('#nextPhoto').tap();
 await page.waitForTimeout(500);
 assert.match(await page.locator('#photoCounter').innerText(),/Photo 2/);
 await page.locator('#prevPhoto').tap();
 await page.waitForTimeout(500);
 await page.locator('#photoReel img').first().evaluate(photo=>photo.dispatchEvent(new Event('error')));
 assert.match(await page.locator('#photoReel').innerText(),/Photo unavailable/);
 await page.locator('[data-enlarge]').first().tap();
 await page.waitForFunction(()=>{const image=document.querySelector('#photoReel img');return image.complete&&image.naturalWidth>0&&!image.parentElement.dataset.failed;});
 await page.locator('#detailAdd').tap();
 await page.locator('#detailReview').tap();
 await page.locator('#noteInput').fill('Please send another photo of the corners.');
 await page.locator('#noteInput').focus();
 assert.equal(await page.locator('#noteInput').evaluate(node=>document.activeElement===node),true);
 await page.screenshot({path:'/tmp/bindr-lot-'+model.replaceAll(' ','-')+'.png'});
 await page.setViewportSize({width:844,height:390});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.setViewportSize(devices[model].viewport);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 results.push({model,status:'PASS',checks:['touch photo navigation','failed photo retry','add/review lot','note focus','rotation without page overflow','200% root text without page overflow']});
 await context.close();
}
await browser.close();fs.writeFileSync('/tmp/bindr-iphone-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exit(1)});
