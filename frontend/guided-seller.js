'use strict';
let guidedSession=null;
function renderGuidedDrafts(){
 const shelf=sellerEl('serverDraftShelf');if(!shelf)return;
 const drafts=inventory.filter(c=>c.status==='draft');shelf.hidden=!drafts.length;
 sellerEl('serverDraftCards').innerHTML=drafts.map(c=>`<div class="guided-draft-card"><button type="button" data-resume="${sellerEsc(c.id)}">${c.photos[0]?`<img src="${sellerEsc(c.thumb||c.photos[0])}" alt="">`:''}<span>${sellerEsc(c.name||'Untitled card')}<small>${c.photos.length} photos · Continue draft</small></span></button><button type="button" data-discard="${sellerEsc(c.id)}" aria-label="Delete draft ${sellerEsc(c.name||'Untitled card')}">Delete draft</button></div>`).join('');
}
(()=>{
 const dialog=document.createElement('dialog');dialog.id='guidedEditor';dialog.className='seller-editor guided-editor';dialog.setAttribute('aria-labelledby','guidedTitle');
 dialog.innerHTML=`<header class="dialog-head"><h2 id="guidedTitle">New listing</h2><button type="button" id="guidedExit">Save &amp; exit</button></header>
 <div class="guided-body"><ol id="guidedSteps" class="guided-steps">${['Front photo','Identify','More photos','Details & publish'].map(x=>`<li>${x}</li>`).join('')}</ol>
 <p id="guidedSave" role="status"></p><button id="guidedRetry" type="button" hidden>Retry saving</button>
 <section data-guided-step="0"><h3>Photograph the front</h3><p>Keep all four corners in frame. Use even lighting and check for glare.</p><div id="guidedFront"></div><div class="phone-upload-actions"><label class="upload-picker">Take front photo<input id="guidedCamera" type="file" accept="image/*" capture="environment"></label><label class="upload-picker">Choose front photo<input id="guidedLibrary" type="file" accept="image/*,.heic,.heif"></label></div></section>
 <section data-guided-step="1" hidden><h3>Identify your card</h3><p>Check the name and set against your card, or enter them yourself.</p><p id="guidedScanStatus" role="status"></p><div id="guidedMatches"></div><button id="guidedScan" type="button">Scan front again</button><label>Card name<input id="guidedName" maxlength="300" required></label><label>Set · card number · rarity<input id="guidedSet" maxlength="400" required></label></section>
 <section data-guided-step="2" hidden><h3>Add more photos</h3><p>A back photo is optional. Add one to help buyers assess condition, plus any close-ups of wear.</p><div class="phone-upload-actions"><label class="upload-picker">Take back photo<input id="guidedBackCamera" type="file" accept="image/*" capture="environment"></label><label class="upload-picker">Choose back photo<input id="guidedBack" type="file" accept="image/*,.heic,.heif"></label><label class="upload-picker">Add close-up<input id="guidedDetail" type="file" accept="image/*,.heic,.heif"></label></div><div id="guidedPhotos" class="seller-photos"></div></section>
 <section id="guidedCandidate" hidden><h3>Check your photo</h3><img id="guidedCandidateImage" alt="Photo preview"><button id="guidedUsePhoto" type="button" class="primary">Use photo</button><button id="guidedRetake" type="button">Choose another</button></section><p id="guidedPhotoStatus" role="status"></p>
 <section data-guided-step="3" hidden><h3>Details &amp; publish</h3><div class="seller-fields"><label>Condition<select id="guidedCondition">${sellerConditions.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Price (USD)<input id="guidedPrice" type="number" min="0.01" max="999999.99" step="0.01" inputmode="decimal" required></label></div><label>About this copy (optional)<textarea id="guidedDescription" rows="4" maxlength="20000" placeholder="Describe any wear or details buyers should know."></textarea></label><h3>Listing preview</h3><div id="guidedPreview"></div><p>Your draft is private until you press Publish to binder.</p></section>
 <p id="guidedError" role="alert"></p><footer id="guidedNavigation"><button id="guidedPrevious" type="button">Back</button><button id="guidedNext" class="primary" type="button">Continue</button><button id="guidedPublish" class="primary" type="button" hidden>Publish to binder</button></footer>
 <section id="guidedSuccess" hidden><h3>Your listing is live</h3><a id="guidedView">View listing</a><button id="guidedAnother" class="primary" type="button">Add another card</button><button id="guidedDone" type="button">Done</button></section></div>`;
 document.body.appendChild(dialog);
 const el=sellerEl;let step=0,busy=false,scanning=false,candidate=null,timer=null,generation=0,publishing=false,automaticDescription=true;
 function applyInventory(data){inventory=structuredClone(data.cards);onlineRevision=data.revision;originalInventory.clear();inventory.forEach(c=>originalInventory.set(c.id,JSON.stringify(c)));sellerList();}
 function error(e){el('guidedError').textContent=e?.message||'';}
 function lock(){dialog.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=busy||publishing);el('guidedScan').disabled=busy||publishing||scanning;}
 function releaseCandidate(){if(candidate?.url)URL.revokeObjectURL(candidate.url);candidate=null;el('guidedCandidate').hidden=true;}
 function render(){
  const c=guidedSession.card;
  if(automaticDescription&&c.name.trim()&&c.set.trim()){c.description=buildSellerDescription(c);el('guidedDescription').value=c.description;}
  dialog.querySelectorAll('[data-guided-step]').forEach(s=>s.hidden=Number(s.dataset.guidedStep)!==step);
  dialog.querySelectorAll('#guidedSteps li').forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
  el('guidedPrevious').hidden=step===0;el('guidedNext').hidden=step===3;el('guidedPublish').hidden=step!==3;
  el('guidedNext').textContent=step===2&&!c.photoRoles.includes('back')?'Skip for now':'Continue';
  el('guidedFront').innerHTML=c.photos[0]?`<img class="guided-front" src="${sellerEsc(c.photos[0])}" alt="Front of your card">`:'';
  el('guidedPhotos').innerHTML=c.photos.map((url,i)=>`<div><img src="${sellerEsc(url)}" alt="${sellerEsc(c.photoRoles[i]||'Card')} photo"><span>${sellerEsc(c.photoRoles[i]||'Detail')}${i===0?' · Cover':''}</span>${i?`<button type="button" data-remove-photo="${i}">Remove</button>`:''}</div>`).join('');
  el('guidedPreview').innerHTML=`${c.photos[0]?`<img class="guided-front" src="${sellerEsc(c.photos[0])}" alt="Listing cover">`:''}<strong>${sellerEsc(c.name)}</strong><p>${sellerEsc(c.set)}</p><p>${sellerEsc(c.condition)} · ${sellerMoney(c.price)}</p><p class="guided-description">${sellerEsc(c.description)}</p><small>${c.photos.length} photo${c.photos.length===1?'':'s'}${c.photoRoles.includes('back')?'':' · No back photo'}</small>`;
  lock();
 }
 async function save(){
  clearTimeout(timer);el('guidedSave').textContent='Saving…';el('guidedRetry').hidden=true;
  try{await guidedSession.save();el('guidedSave').textContent='Saved online · Private draft';return true;}
  catch(e){el('guidedSave').textContent='Retry needed · Keep this tab open';el('guidedRetry').hidden=false;error(e);return false;}
 }
 function schedule(){el('guidedSave').textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,500);}
 function open(card){
  generation++;clearTimeout(timer);releaseCandidate();busy=false;scanning=false;publishing=false;automaticDescription=!card.description||(!!card.name&&!!card.set&&card.description===buildSellerDescription(card));
  guidedSession=new GuidedDraft(card,sellerAPI,applyInventory);step=!card.photos.length?0:!card.name||!card.set?1:2;
  for(const [id,key] of [['guidedName','name'],['guidedSet','set'],['guidedPrice','price'],['guidedCondition','condition'],['guidedDescription','description']])el(id).value=card[key]||'';
  el('guidedSave').textContent=card.version?'Saved online · Private draft':'Add a front photo to start your private draft';el('guidedRetry').hidden=true;
  for(const id of ['guidedScanStatus','guidedMatches','guidedPhotoStatus'])el(id).textContent='';
  el('guidedSuccess').hidden=true;el('guidedNavigation').hidden=false;el('guidedSteps').hidden=false;el('guidedExit').hidden=false;error();render();if(!dialog.open)dialog.showModal();
 }
 function fresh(){open({id:'c'+(Date.now()*1000+crypto.getRandomValues(new Uint16Array(1))[0]%1000),name:'',set:'',price:0,condition:'Near Mint',description:'',photos:[],photoRoles:[],thumb:'',catalogCardId:null,status:'draft',sold:false});}
 async function exit(){if(busy||publishing)return;if(candidate){error(Error('Use this photo or choose another before leaving.'));return;}busy=true;lock();if(await save()){generation++;dialog.close();guidedSession=null;}busy=false;lock();}
 async function pick(file,role){
  if(!file||busy||publishing)return;if(candidate?.attached){error(Error('Retry saving the current photo first.'));return;}releaseCandidate();busy=true;lock();error();const token=generation;
  try{const prepared=await prepareSellerPhoto(file,s=>el('guidedPhotoStatus').textContent=s);if(token!==generation)return;candidate={blob:prepared.blob,role,url:URL.createObjectURL(prepared.blob)};el('guidedCandidateImage').src=candidate.url;el('guidedCandidate').hidden=false;el('guidedUsePhoto').textContent='Use photo';el('guidedPhotoStatus').textContent='Check focus and glare before using this photo.';}
  catch(e){error(e);}finally{busy=false;lock();}
 }
 async function scan(blob){
  const token=generation;scanning=true;lock();el('guidedMatches').textContent='';el('guidedScanStatus').textContent='Scanning card…';
  try{
   if(!blob){const r=await fetch(guidedSession.card.photos[0]);if(!r.ok)throw Error('Could not load the front photo. Enter details manually or try again.');blob=await r.blob();}
   const result=await sellerAPI('scan',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:await scanJpeg(blob)});if(token!==generation)return;
   const offers=result.status==='matched'?[result.card]:result.candidates||[];
   el('guidedScanStatus').textContent=offers.length?'Check the match before choosing. Condition and price are yours to enter.':'No confident match. Enter the name and set yourself, or try scanning again.';
   offers.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='guided-match';b.textContent=c.name+' · '+c.set+' — Use this card';b.onclick=()=>{if(busy||publishing)return;guidedSession.card.catalogCardId=c.id;guidedSession.card.name=c.name;guidedSession.card.set=c.set;el('guidedName').value=c.name;el('guidedSet').value=c.set;el('guidedMatches').textContent='';el('guidedScanStatus').textContent='Details filled. Check them, then continue.';render();schedule();};el('guidedMatches').appendChild(b);});
  }catch(e){if(token===generation)el('guidedScanStatus').textContent=e.message+' You can enter details manually.';}
  finally{if(token===generation){scanning=false;lock();}}
 }
 async function usePhoto(){
  if(!candidate||busy)return;busy=true;lock();error();
  try{
   const c=guidedSession.card,p=candidate;
   if(!p.attached){
    const index=p.role==='detail'?-1:c.photoRoles.indexOf(p.role);
    if(index<0&&c.photos.length>=20)throw Error('Maximum 20 photos. Remove a photo first.');
    if(!await save())return;
    el('guidedPhotoStatus').textContent='Uploading photo…';
    if(!p.upload)p.upload=await uploadSellerPhoto(p.blob,()=>{});
    if(index>=0){c.photos[index]=p.upload.url;c.photoRoles[index]=p.role;}else{c.photos.push(p.upload.url);c.photoRoles.push(p.role);}
    c.thumb=c.photos[0];p.attached=true;
   }
   if(!await save())return;
   const blob=p.blob,front=p.role==='front';releaseCandidate();el('guidedPhotoStatus').textContent='Photo saved online.';
   if(front){step=1;generation++;scan(blob);}render();
  }catch(e){error(e);el('guidedPhotoStatus').textContent='Photo was not confirmed. Retry Use photo.';}
  finally{busy=false;lock();}
 }
 for(const [id,role] of [['guidedCamera','front'],['guidedLibrary','front'],['guidedBackCamera','back'],['guidedBack','back'],['guidedDetail','detail']])el(id).onchange=e=>{const file=e.target.files?.[0];e.target.value='';pick(file,role);};
 el('guidedUsePhoto').onclick=usePhoto;
 el('guidedRetake').onclick=()=>{if(candidate?.attached){error(Error('Retry saving this photo before replacing it.'));return;}releaseCandidate();el('guidedPhotoStatus').textContent='Take or choose another photo.';};
 for(const [id,key] of [['guidedName','name'],['guidedSet','set'],['guidedPrice','price'],['guidedCondition','condition'],['guidedDescription','description']])el(id).oninput=()=>{if(key==='description')automaticDescription=false;guidedSession.card[key]=key==='price'?Number(el(id).value):el(id).value;if(key==='name'||key==='set')guidedSession.card.catalogCardId=null;render();schedule();};
 el('guidedPhotos').onclick=async e=>{const b=e.target.closest('[data-remove-photo]');if(!b||busy)return;const i=Number(b.dataset.removePhoto);guidedSession.card.photos.splice(i,1);guidedSession.card.photoRoles.splice(i,1);render();schedule();};
 el('guidedNext').onclick=async()=>{
  error();if(candidate){error(Error('Use this photo or choose another before continuing.'));return;}
  if(step===0&&!guidedSession.card.photos.length){error(Error('Add a front photo to continue.'));return;}
  if(step===1&&(!el('guidedName').reportValidity()||!el('guidedSet').reportValidity()||!guidedSession.card.name.trim()||!guidedSession.card.set.trim())){error(Error('Enter the card name and set.'));return;}
  busy=true;lock();if(await save()){step++;render();}busy=false;lock();
 };
 el('guidedPrevious').onclick=()=>{if(candidate){error(Error('Finish reviewing your photo first.'));return;}step--;error();render();};
 el('guidedScan').onclick=()=>scan();el('guidedExit').onclick=exit;dialog.addEventListener('cancel',e=>{e.preventDefault();exit();});
 el('guidedRetry').onclick=async()=>{if(publishing){await publish();return;}busy=true;lock();error();await save();busy=false;lock();};
 async function publish(){
  if(busy)return;error();
  if(!guidedSession.card.photos.length||!guidedSession.card.name.trim()||!guidedSession.card.set.trim()||!el('guidedPrice').reportValidity()||!(guidedSession.card.price>0)){error(Error('Add a photo, name, set, condition and positive price before publishing.'));return;}
  if(candidate){error(Error('Finish reviewing your photo first.'));return;}
  clearTimeout(timer);publishing=true;busy=true;lock();el('guidedSave').textContent='Publishing…';
  try{
   await guidedSession.publish();generation++;el('guidedSave').textContent='Published to your buyer binder';el('guidedRetry').hidden=true;
   dialog.querySelectorAll('[data-guided-step]').forEach(s=>s.hidden=true);el('guidedNavigation').hidden=true;el('guidedSteps').hidden=true;el('guidedExit').hidden=true;el('guidedSuccess').hidden=false;el('guidedView').href='index.html#card='+guidedSession.card.id;
   publishing=false;
  }catch(e){error(e);el('guidedSave').textContent='Publication not confirmed. Retry to check and finish.';el('guidedRetry').hidden=false;}
  finally{busy=false;lock();el('guidedRetry').disabled=false;}
 }
 el('guidedPublish').onclick=publish;el('guidedAnother').onclick=fresh;el('guidedDone').onclick=()=>{dialog.close();guidedSession=null;};
 el('newListing').onclick=()=>{if(!onlineBusy)fresh();};
 el('serverDraftCards').onclick=async e=>{
  const b=e.target.closest('button');if(!b||onlineBusy)return;
  if(b.dataset.resume){open(inventory.find(c=>c.id===b.dataset.resume));return;}
  const c=inventory.find(c=>c.id===b.dataset.discard);if(!c||!confirm('Delete this private draft and its photos?'))return;
  setOnlineBusy(true);b.disabled=true;
  try{applyInventory(await sellerAPI('listings/'+encodeURIComponent(c.id)+'?version='+c.version,{method:'DELETE'}));sellerMessage('Draft deleted.');}
  catch(e){sellerMessage(e.message+' Reload inventory before retrying deletion.');}
  finally{setOnlineBusy(false);b.disabled=false;}
 };
 window.addEventListener('beforeunload',e=>{if(dialog.open&&(candidate||busy||guidedSession?.dirty)){e.preventDefault();e.returnValue='';}});
 renderGuidedDrafts();
})();
