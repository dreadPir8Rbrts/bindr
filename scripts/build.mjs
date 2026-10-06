import { readFileSync,writeFileSync,mkdirSync,cpSync,rmSync } from 'node:fs';
import vm from 'node:vm';
const context={seed:JSON.parse(readFileSync('inventory.json','utf8')).cards};
mkdirSync('server',{recursive:true});writeFileSync('server/seed.mjs','export default '+JSON.stringify(context.seed)+';\n');
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const f of ['index.html','seller.html','styles.css','cards.js','helpers.js','dialog-history.js','app.js','binder-tools.js','seller.js','live-binder.js','live-seller.js','marketplace.js','description-builder.js','seller-drafts.js','photo-preparation.js','phone-photos.js','heic-photo-worker.js','images','refinement.css','seller-refinement.css','budget-picker.js','appearance.js','seller-appearance.js','card-framing.js','seller-framing.js','card-scanner.js','guided-draft.js','guided-seller.js','guided-seller.css','assets'])cpSync('frontend/'+f,'dist/'+f,{recursive:true});
cpSync('frontend/catalog-frames.js','dist/catalog-frames.js');
console.log('Buyer/seller assets built. Inventory seed contains '+context.seed.length+' cards.');

mkdirSync('dist/vendor',{recursive:true});
cpSync('node_modules/heic-to/dist/next/heic-to.js','dist/vendor/heic-to-next.js');
cpSync('node_modules/heic-to/LICENSE','dist/vendor/HEIC-TO-LICENSE.txt');
writeFileSync('dist/vendor/NOTICE.txt','HEIC conversion: heic-to 1.5.2 (LGPL-3.0), using libheif. Source and license: https://github.com/hoppergee/heic-to/tree/v1.5.2 . Distributed as a separate replaceable module.\n');
