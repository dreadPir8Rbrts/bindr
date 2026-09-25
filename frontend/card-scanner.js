'use strict';
// Seller card scanner: sends a small JPEG of the card to the scan endpoint
// (Google Vision OCR + catalog match) and offers the matched card's name and set.
const SCAN_EDGE=800,SCAN_QUALITY=0.7;
let scanBusy=false,scanOffers=[];
function scanStatus(s){sellerEl('scanStatus').textContent=s;}
function scanPhotoSource(){const i=workingRoles.indexOf('front');return workingPhotos[i>=0?i:0]||null;}
function refreshScanButton(){const b=sellerEl('scanFrontPhoto');b.disabled=scanBusy||!scanPhotoSource();b.textContent=workingRoles.includes('front')?'Scan front photo':'Scan first photo';sellerEl('scanNewPhoto').disabled=scanBusy;}
function clearScan(){scanOffers=[];sellerEl('scanResults').innerHTML='';scanStatus('');}
// OCR reads text fine at 800px; a smaller upload keeps scans quick on phone data.
async function scanJpeg(blob){const img=await readPhotoImage(blob);try{const size=BinderPhotoPreparation.fitPhoto(img.width,img.height,SCAN_EDGE),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(img.source,0,0,size.width,size.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare this photo for scanning.')),'image/jpeg',SCAN_QUALITY));}finally{img.close();}}
function scanOffer(c,i,label){return `<div class="scan-offer">${c.image_url?`<img src="${sellerEsc(c.image_url)}" alt="" width="60" height="84" loading="lazy" referrerpolicy="no-referrer">`:'<span class="scan-offer-blank" aria-hidden="true"></span>'}<div><strong>${sellerEsc(c.name)}</strong><span>${sellerEsc(c.set)}</span></div><button type="button" data-scan-use="${i}">${label}</button></div>`;}
function renderScan(result){
 const read=[result.ocr?.name,result.ocr?.set_number].filter(Boolean).map(x=>`“${sellerEsc(x)}”`).join(' · ');
 if(result.status==='matched'){scanOffers=[result.card];scanStatus('');sellerEl('scanResults').innerHTML=`<p class="scan-heading">Best match</p>${scanOffer(result.card,0,'Use these details')}${result.confidence<0.9?'<p class="small">Lower-confidence match. Compare the set and card number with your card.</p>':''}`;return;}
 if(result.status==='ambiguous'){scanOffers=result.candidates;scanStatus('');sellerEl('scanResults').innerHTML=`<p class="scan-heading">Several cards match. Pick yours:</p>${result.candidates.map((c,i)=>scanOffer(c,i,'Use this card')).join('')}`;return;}
 scanOffers=[];sellerEl('scanResults').innerHTML='';
 scanStatus(result.status==='no_text'?'No text could be read. Try a closer photo in good light with the whole card in frame.':`This card wasn’t found in the catalog${read?` (read ${read})`:''}. Try a sharper photo of the whole card, or fill in the details yourself.`);
}
async function runScan(prepare){
 if(scanBusy)return;scanBusy=true;refreshScanButton();clearScan();
 try{scanStatus('Preparing photo…');const jpeg=await scanJpeg(await prepare());scanStatus('Scanning card…');renderScan(await sellerAPI('scan',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:jpeg}));}
 catch(e){scanStatus(e.message||'Scan failed. Try again, or fill in the details yourself.');}
 finally{scanBusy=false;refreshScanButton();}
}
sellerEl('scanFrontPhoto').onclick=()=>runScan(async()=>{const r=await fetch(scanPhotoSource(),{credentials:'same-origin'});if(!r.ok)throw Error('That photo couldn’t be loaded for scanning. Try scanning a new photo.');return r.blob();});
sellerEl('scanNewPhoto').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(file)runScan(async()=>(await prepareSellerPhoto(file,stage=>scanStatus(stage))).blob);};
sellerEl('scanResults').onclick=e=>{const b=e.target.closest('[data-scan-use]');if(!b)return;const c=scanOffers[Number(b.dataset.scanUse)];if(!c)return;sellerEl('sellerName').value=c.name;sellerEl('sellerSet').value=c.set;sellerEl('sellerName').dispatchEvent(new Event('input',{bubbles:true}));clearScan();sellerMessage('Name and set filled from the scan. Check them against your card, then choose this copy’s condition and price.');};
const renderPhotosBeforeScan=renderSellerPhotos;renderSellerPhotos=function(){renderPhotosBeforeScan.apply(this,arguments);refreshScanButton();};
const loadBeforeScan=loadSellerCard;loadSellerCard=function(id){loadBeforeScan(id);clearScan();refreshScanButton();};
sellerEl('sellerPhotos').addEventListener('change',refreshScanButton);
refreshScanButton();
