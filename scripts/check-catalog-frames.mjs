import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('frontend/card-framing.js','utf8')+fs.readFileSync('frontend/catalog-frames.js','utf8')+';globalThis.frames=reviewedCatalogFrames;',context);
const cards=JSON.parse(fs.readFileSync('inventory.json','utf8')).cards.filter(card=>!card.sold);
for(const card of cards){
 const entry=context.frames[card.id];
 assert(entry,'Missing '+card.id);
 assert.equal(entry.photo,card.photos[0]);
 assert.equal(entry.thumb,card.thumb);
 const {x,y,w,h}=entry.frame;
 assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1.00001&&y+h<=1.00001,'Invalid bounds '+card.id);
 assert(context.reviewedCatalogFrameStyle(card));
 assert.equal(context.reviewedCatalogFrameStyle({...card,sold:true}),'');
 assert.equal(context.reviewedCatalogFrameStyle({...card,photos:['replacement.jpg']}),'');
}
console.log(`Validated ${cards.length} photo-specific frames, bounds, sold exclusion, and replacement-photo fallback.`);
