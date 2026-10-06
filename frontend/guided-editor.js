'use strict';
// Shared guided editor. The host supplies its existing authorized API client.
function createGuidedSeller(options){
 let guidedSession=null;
 const sellerEl=id=>document.getElementById(id);
 const sellerEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sellerConditions=['Near Mint+','Near Mint','Near Mint-','Lightly Played+','Lightly Played','Lightly Played-','Moderately Played'];
 const sellerMoney=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
 const sellerAPI=options.api;
 const uploadPhoto=(blob,progress)=>uploadSellerPhoto(blob,progress,sellerAPI);
 const dialog=document.createElement('dialog');dialog.id='guidedEditor';dialog.className='seller-editor guided-editor';dialog.setAttribute('aria-labelledby','guidedTitle');
 dialog.innerHTML=`<header class="dialog-head"><h2 id="guidedTitle" tabindex="-1">New listing</h2><button type="button" id="guidedDiscard" hidden>Exit without saving</button><button type="button" id="guidedExit">Save &amp; exit</button></header>
 <div class="guided-body"><ol id="guidedSteps" class="guided-steps">${['Front photo','Identify','Add Photos','Details & publish'].map(x=>`<li>${x}</li>`).join('')}</ol>
 <p id="guidedSave" role="status"></p><button id="guidedRetry" type="button" hidden>Retry saving</button>
 <section id="guidedScanIntro" hidden><div class="scan-intro-heading"><span class="scan-photo-badge">Photo scan</span><h3>Scan your card</h3><p>Take a clear photo of the front to identify your card.</p></div><label class="upload-picker scan-camera-picker">Open Camera to Take Photo<input id="guidedScanCamera" type="file" accept="image/*" capture="environment"></label><aside class="scan-photo-tips"><h4>Tips for best results</h4><ul><li>Keep the card name and number clearly visible</li><li>Include all four corners</li><li>Use even lighting and avoid glare</li><li>Hold steady for a sharp photo</li></ul></aside></section>
 <section data-guided-step="0"><h3>Photograph the front</h3><p>Keep all four corners in frame. Use even lighting and check for glare.</p><div id="guidedFront"></div><div class="phone-upload-actions"><label class="upload-picker">Take front photo<input id="guidedCamera" type="file" accept="image/*" capture="environment"></label><label class="upload-picker">Choose front photo<input id="guidedLibrary" type="file" accept="image/*,.heic,.heif"></label></div></section>
 <section data-guided-step="1" hidden><h3>Identify your card</h3><p>Check the name and set against your card, or enter them yourself.</p><p id="guidedScanStatus" role="status"></p><div id="guidedMatches"></div><button id="guidedScan" type="button">Scan front again</button><label>Card name<input id="guidedName" maxlength="300" required></label><label>Set · card number · rarity<input id="guidedSet" maxlength="400" required></label></section>
 <section data-guided-step="2" hidden><h3>Add Photos</h3><p>Add up to 6 photos of this card. Include the front, back, and any details you want buyers to see. The first photo is your listing cover.</p><div class="phone-upload-actions"><label class="upload-picker">Take Photo<input id="guidedPhotoCamera" type="file" accept="image/*" capture="environment"></label><label class="upload-picker">Choose Photo<input id="guidedDetail" type="file" accept="image/*,.heic,.heif"></label></div><p id="guidedPhotoCount" role="status"></p><div id="guidedPhotos" class="seller-photos"></div></section>
 <section id="guidedCandidate" hidden><h3>Check your photo</h3><img id="guidedCandidateImage" alt="Photo preview"><button id="guidedUsePhoto" type="button" class="primary">Use photo</button><button id="guidedRetake" type="button">Choose another</button></section><p id="guidedPhotoStatus" role="status"></p>
 <section data-guided-step="3" hidden><h3>Details &amp; publish</h3><div class="seller-fields"><label>Condition<select id="guidedCondition">${sellerConditions.map(c=>`<option>${c}</option>`).join('')}</select></label><label>Price (USD)<input id="guidedPrice" type="number" min="0.01" max="999999.99" step="0.01" inputmode="decimal" required></label></div><label>About this copy (optional)<textarea id="guidedDescription" rows="4" maxlength="20000" placeholder="Describe any wear or details buyers should know."></textarea></label><h3>Listing preview</h3><div id="guidedPreview"></div><p>Your draft is private until you press Publish to binder.</p></section>
 <section data-guided-step="4" hidden><div id="guidedIdentifiedCard" class="identified-card"></div><div class="identified-actions"><button id="guidedCreateListing" type="button" class="primary">Create Listing</button><button id="guidedMatchRetake" type="button">Retake photo</button></div></section>
 <section data-guided-step="5" hidden><h3>Listing details</h3><p>Check the card details, choose this copy’s condition and price, and add listing photos. Identification photos are not added to your listing.</p><div id="guidedDetailsHost"></div><label id="guidedAvailabilityLabel" hidden>Availability<select id="guidedAvailability"><option value="available">Available</option><option value="sold">Sold</option></select></label><button type="button" id="guidedDeleteListing" hidden>Delete listing</button></section>
 <section data-guided-step="7" hidden><h3>Find your card</h3><label>Search the card catalog<input id="guidedCatalogQuery" type="search" maxlength="100" autocomplete="off" placeholder="Card name, number, or set"></label><p id="guidedCatalogStatus" role="status">Enter at least 2 characters to search.</p><div id="guidedCatalogResults"></div><button id="guidedManual" type="button">Enter details manually</button></section>
 <section data-guided-step="6" hidden><h3>Listing preview</h3><div id="guidedPreviewHost"></div><p>Your listing stays private until you publish it.</p></section>
 <p id="guidedError" role="alert"></p><footer id="guidedNavigation"><button id="guidedPrevious" type="button">Back</button><button id="guidedNext" class="primary" type="button">Continue</button><button id="guidedPublish" class="primary" type="button" hidden>Publish to binder</button></footer>
 <section id="guidedSuccess" hidden><h3>Your listing is live</h3><a id="guidedView">View listing</a><button id="guidedAnother" class="primary" type="button">Add another card</button><button id="guidedDone" type="button">Done</button></section></div>`;
 document.body.appendChild(dialog);
 let discardAllowed=false,editEntry=false,searchEntry=false,searchTimer=null,searchRequest=0;
 const el=sellerEl;let step=0,busy=false,scanning=false,candidate=null,timer=null,generation=0,publishing=false,automaticDescription=true,scanEntry=false,identifiedCard=null,scanSource=null;
 // Move the shared fields, rather than maintaining two sets of draft inputs.
 const detailNodes=[el('guidedName').parentElement,el('guidedSet').parentElement,el('guidedCondition').closest('.seller-fields'),el('guidedDescription').parentElement,dialog.querySelector('[data-guided-step="2"]')];
 const movable=[...detailNodes,el('guidedPreview')].map(node=>{const marker=document.createComment('listing field location');node.before(marker);return {node,marker};});
 function detailLayout(enabled){for(const {node,marker} of movable){if(enabled)(node.id==='guidedPreview'?el('guidedPreviewHost'):el('guidedDetailsHost')).appendChild(node);else marker.after(node);}}
 function showIdentified(card){
  identifiedCard=card;step=4;detailLayout(false);
  const parts=card.set.split('·').map(x=>x.trim()),number=card.printed_number||parts[1]||'';
  el('guidedIdentifiedCard').innerHTML=`<img src="${sellerEsc(card.image_url||scanSource?.url||guidedSession.card.photos[0])}" alt="${sellerEsc(card.name)}"><h3>${sellerEsc(card.name)}</h3><p>${sellerEsc(parts[0])}</p><p class="identified-number">${number?'Card number: '+sellerEsc(number):'Card number unavailable'}</p>`;
  const image=el('guidedIdentifiedCard').querySelector('img');image.onerror=()=>{image.onerror=null;image.src=scanSource?.url||guidedSession.card.photos[0]||'';};
  render();dialog.querySelector('.guided-body').scrollTop=0;
 }
 function applyInventory(data){options.onSaved?.(data);}

 function error(e){el('guidedError').textContent=e?.message||'';}
 function lock(){dialog.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=busy||publishing);el('guidedScan').disabled=busy||publishing||scanning;el('guidedExit').textContent=busy?'Working…':publishing?'Save needs retry':editEntry?'Close':'Save & exit';el('guidedUsePhoto').disabled=busy||publishing||scanning;el('guidedRetake').disabled=busy||publishing||scanning;el('guidedCandidate').setAttribute('aria-busy',String(scanEntry&&scanning));dialog.setAttribute('aria-busy',String(busy||scanning));for(const id of ['guidedPhotoCamera','guidedDetail'])el(id).disabled=busy||publishing||!!candidate||(guidedSession?.card.photos.length||0)>=6;}
 function releaseScan(){if(scanSource?.url)URL.revokeObjectURL(scanSource.url);scanSource=null;}
 dialog.addEventListener('close',()=>{releaseScan();clearTimeout(searchTimer);searchRequest++;});
 function releaseCandidate(){if(candidate?.url)URL.revokeObjectURL(candidate.url);candidate=null;el('guidedCandidate').hidden=true;}
 function render(){
  const c=guidedSession.card,scanLoading=scanEntry&&step===1&&scanning;
  dialog.classList.toggle('scan-loading',scanLoading);
  el('guidedCandidate').hidden=!candidate&&!scanLoading;
  if(scanLoading){el('guidedCandidateImage').src=scanSource.url;el('guidedUsePhoto').textContent='Identifying card…';el('guidedRetake').textContent='Retake Photo';}
  el('guidedDiscard').hidden=!discardAllowed;el('guidedAvailabilityLabel').hidden=!editEntry;el('guidedDeleteListing').hidden=!editEntry;
  el('guidedPublish').textContent=editEntry?'Save changes':'Publish to binder';
  dialog.querySelector('[data-guided-step="5"]>h3').textContent=editEntry?'Edit listing':'Listing details';
  dialog.querySelector('[data-guided-step="5"]>p').textContent=editEntry?'Update the details and photos, then preview and save your changes.':'Check the card details, choose this copy’s condition and price, and add listing photos. Identification photos are not added to your listing.';
  dialog.querySelector('[data-guided-step="6"]>p').textContent=editEntry?'Your changes go live when you press Save changes.':'Your listing stays private until you publish it.';
  dialog.classList.toggle('scan-entry',scanEntry&&(step===0||scanLoading));dialog.classList.toggle('has-scan-photo',!!candidate);el('guidedScanIntro').hidden=!scanEntry||step!==0||!!candidate;
  el('guidedTitle').textContent=editEntry?(step===6?'Preview changes':'Edit listing'):step===7?'Add listing':step===4?'Card identified':step===5?'Create listing':step===6?'Preview listing':scanEntry&&(step===0||scanLoading)?'Scan a card':'New listing';
  el('guidedPhotoStatus').hidden=step===4||step===6||scanLoading;
  el('guidedSteps').hidden=step>=4;el('guidedNavigation').hidden=step===4||step===7;
  if(automaticDescription&&c.name.trim()&&c.set.trim()){c.description=buildSellerDescription(c);el('guidedDescription').value=c.description;}
  dialog.querySelectorAll('[data-guided-step]').forEach(s=>s.hidden=Number(s.dataset.guidedStep)!==step&&!(step===5&&s.dataset.guidedStep==='2'));
  dialog.querySelectorAll('#guidedSteps li').forEach((li,i)=>{if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
  el('guidedPrevious').hidden=step===0||(step===5&&!identifiedCard&&!searchEntry);el('guidedNext').hidden=step===3||step===6;el('guidedPublish').hidden=step!==3&&step!==6;
  el('guidedNext').textContent='Continue';
  el('guidedFront').innerHTML=c.photos[0]?`<img class="guided-front" src="${sellerEsc(c.photos[0])}" alt="Front of your card">`:'';
  el('guidedPhotoCount').textContent=c.photos.length+' / 6 photos'+(c.photos.length>=6?' · Remove a photo to add another.':'');
  el('guidedPhotos').innerHTML=c.photos.map((url,i)=>`<div><img src="${sellerEsc(url)}" alt="${sellerEsc(c.photoRoles[i]||'Card')} photo"><span>${sellerEsc(c.photoRoles[i]||'Detail')}${i===0?' · Cover':''}</span>${editEntry&&i?`<button type="button" data-cover-photo="${i}">Make cover</button>`:''}${i||editEntry||step===5?`<button type="button" data-remove-photo="${i}">Remove</button>`:''}</div>`).join('');
  el('guidedPreview').innerHTML=`${c.photos[0]?`<img class="guided-front" src="${sellerEsc(c.photos[0])}" alt="Listing cover">`:''}<div class="guided-preview-extras">${c.photos.slice(1).map(url=>`<img src="${sellerEsc(url)}" alt="Additional listing photo">`).join('')}</div><strong>${sellerEsc(c.name)}</strong><p>${sellerEsc(c.set)}</p><p>${sellerEsc(c.condition)} · ${sellerMoney(c.price)}</p><p class="guided-description">${sellerEsc(c.description)}</p><small>${c.photos.length} photo${c.photos.length===1?'':'s'}</small>`;
  lock();
 }
 async function save(force=false){
  if(editEntry&&!force)return true;
  clearTimeout(timer);el('guidedSave').textContent='Saving…';el('guidedRetry').hidden=true;
  try{await guidedSession.save();el('guidedSave').textContent=editEntry?'Changes saved':'Saved online · Private draft';return true;}
  catch(e){el('guidedSave').textContent='Retry needed · Keep this tab open';el('guidedRetry').hidden=false;error(e);return false;}
 }
 function schedule(){if(editEntry){el('guidedSave').textContent='Unsaved changes';return;}el('guidedSave').textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,500);}
 function open(card,forEdit=false){
  editEntry=forEdit;discardAllowed=!forEdit&&!card.version;
  clearTimeout(searchTimer);searchRequest++;searchEntry=false;el('guidedCatalogQuery').value='';el('guidedCatalogResults').textContent='';el('guidedCatalogStatus').textContent='Enter at least 2 characters to search.';releaseScan();detailLayout(false);identifiedCard=null;scanEntry=false;generation++;clearTimeout(timer);releaseCandidate();busy=false;scanning=false;publishing=false;automaticDescription=!forEdit&&(!card.description||(!!card.name&&!!card.set&&card.description===buildSellerDescription(card)));
  guidedSession=new GuidedDraft(card,sellerAPI,applyInventory);step=!card.photos.length?0:!card.name||!card.set?1:2;
  for(const [id,key] of [['guidedName','name'],['guidedSet','set'],['guidedPrice','price'],['guidedCondition','condition'],['guidedDescription','description']])el(id).value=card[key]||'';
  if(card.catalogCardId&&card.name&&card.set){step=5;detailLayout(true);}
  el('guidedSave').textContent=card.version?'Saved online · Private draft':'Add a front photo to start your private draft';el('guidedRetry').hidden=true;
  for(const id of ['guidedScanStatus','guidedMatches','guidedPhotoStatus'])el(id).textContent='';
  el('guidedSuccess').hidden=true;el('guidedNavigation').hidden=false;el('guidedSteps').hidden=false;el('guidedExit').hidden=false;error();render();if(!dialog.open){dialog.showModal();el('guidedTitle').focus({preventScroll:true});}
 }
 function fresh(){open({id:'c'+(Date.now()*1000+crypto.getRandomValues(new Uint16Array(1))[0]%1000),name:'',set:'',price:0,condition:'Near Mint',description:'',photos:[],photoRoles:[],thumb:'',catalogCardId:null,status:'draft',sold:false});}
 async function exit(){if(busy||publishing)return;if(editEntry){if((candidate||guidedSession.dirty)&&!confirm('Discard unsaved changes to this listing?'))return;generation++;releaseCandidate();dialog.close();guidedSession=null;return;}if(candidate&&scanEntry&&step===0)releaseCandidate();
  if((scanEntry||searchEntry)&&!guidedSession.card.version&&!guidedSession.card.name.trim()&&!guidedSession.card.set.trim()){generation++;dialog.close();guidedSession=null;return;}
  if(candidate){await usePhoto(false);if(candidate)return;}busy=true;lock();if(await save()){generation++;dialog.close();guidedSession=null;}busy=false;lock();}
 // New listings may already have autosaved; discard must remove that draft too.
 el('guidedDiscard').onclick=async()=>{
  if(busy||publishing||!discardAllowed)return;
  if((guidedSession.card.name||guidedSession.card.photos.length||candidate||guidedSession.card.version)&&!confirm('Exit without saving? This listing and any autosaved draft will be discarded.'))return;
  clearTimeout(timer);clearTimeout(searchTimer);searchRequest++;generation++;busy=true;lock();error();
  try{
   const session=guidedSession;
   if(session.running)await session.running.catch(()=>{});
   if(session.card.version||session.pending){
    const data=await sellerAPI('listings'),remote=data.cards.find(c=>c.id===session.card.id);
    if(remote){
     const matchesPending=session.pending&&session.signature(remote)===session.signature(session.pending);
     if(remote.status!=='draft'||(remote.version!==session.card.version&&!matchesPending))throw Error('This draft changed elsewhere. Refresh drafts to review it before deleting.');
     await sellerAPI('listings/'+encodeURIComponent(remote.id)+'?version='+remote.version,{method:'DELETE'});
    }
   }
   releaseCandidate();dialog.close();guidedSession=null;
  }catch(e){error(e);el('guidedSave').textContent='Could not discard the draft. Retry Exit without saving.';}
  finally{busy=false;lock();}
 };
 async function pick(file,role){
  if(!file||busy||publishing)return;if(role==='detail'&&guidedSession.card.photos.length>=6){error(Error('Maximum 6 photos. Remove a photo first.'));return;}if(candidate?.attached){error(Error('Retry saving the current photo first.'));return;}releaseCandidate();busy=true;lock();error();const token=generation;
  try{const prepared=await prepareSellerPhoto(file,s=>el('guidedPhotoStatus').textContent=s);if(token!==generation)return;if(role==='front'&&scanEntry&&step!==5){identifiedCard=null;step=0;detailLayout(false);guidedSession.card.catalogCardId=null;guidedSession.card.name='';guidedSession.card.set='';el('guidedName').value='';el('guidedSet').value='';if(automaticDescription){guidedSession.card.description='';el('guidedDescription').value='';}}candidate={blob:prepared.blob,role,url:URL.createObjectURL(prepared.blob)};el('guidedCandidateImage').src=candidate.url;el('guidedCandidate').hidden=false;el('guidedUsePhoto').textContent=scanEntry&&step===0?'Quick Scan':'Use photo';el('guidedRetake').textContent=scanEntry&&step===0?'Retake Photo':'Choose another';render();el('guidedPhotoStatus').textContent='Check focus and glare before using this photo.';}
  catch(e){error(e);}finally{busy=false;render();}
 }
 async function scan(blob){
  if(scanning)return;const token=generation;scanning=true;render();el('guidedMatches').textContent='';el('guidedScanStatus').textContent='Scanning card…';
  try{
   if(!blob&&scanEntry&&scanSource)blob=scanSource.blob;
   if(!blob){const r=await fetch(guidedSession.card.photos[0]);if(!r.ok)throw Error('Could not load the front photo. Enter details manually or try again.');blob=await r.blob();}
   const result=await sellerAPI('scan',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:await scanJpeg(blob)});if(token!==generation||step!==1)return;
   if(scanEntry&&result.status==='matched'){showIdentified(result.card);return;}
   const offers=result.status==='matched'?[result.card]:result.candidates||[];
   el('guidedScanStatus').textContent=offers.length?'Check the match before choosing. Condition and price are yours to enter.':'No confident match. Enter the name and set yourself, or try scanning again.';
   offers.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='guided-match';b.textContent=c.name+' · '+c.set+' — Use this card';b.onclick=()=>{if(busy||publishing)return;if(scanEntry){showIdentified(c);return;}guidedSession.card.catalogCardId=c.id;guidedSession.card.name=c.name;guidedSession.card.set=c.set;el('guidedName').value=c.name;el('guidedSet').value=c.set;el('guidedMatches').textContent='';el('guidedScanStatus').textContent='Details filled. Check them, then continue.';render();schedule();};el('guidedMatches').appendChild(b);});
  }catch(e){if(token===generation)el('guidedScanStatus').textContent=e.message+' You can enter details manually.';}
  finally{if(token===generation){scanning=false;if(guidedSession&&dialog.open)render();else lock();}}
 }
 async function usePhoto(scanAfter=true){
  if(!candidate||busy)return;
  if(scanEntry&&step===0){
   releaseScan();scanSource={blob:candidate.blob,url:candidate.url};candidate.url=null;releaseCandidate();step=1;generation++;
   el('guidedPhotoStatus').textContent='Scan photo is for identification only. Add listing photos after choosing your card.';el('guidedSave').textContent='Scan photo is not saved';
   if(scanAfter)await scan(scanSource.blob);else render();return;
  }
  busy=true;lock();error();
  try{
   const c=guidedSession.card,p=candidate;
   if(!p.attached){
    const index=p.role==='detail'?-1:c.photoRoles.indexOf(p.role);
    if(index<0&&c.photos.length>=6)throw Error('Maximum 6 photos. Remove a photo first.');
    el('guidedPhotoStatus').textContent='Uploading photo…';
    if(!p.upload)p.upload=await uploadPhoto(p.blob,percent=>{el('guidedPhotoStatus').textContent=percent<99?'Uploading photo… '+percent+'%':'Finalizing photo…';});
    if(index>=0){c.photos[index]=p.upload.url;c.photoRoles[index]=p.role;}else{c.photos.push(p.upload.url);c.photoRoles.push(c.photos.length===1?'front':p.role);}
    c.thumb=c.photos[0];p.attached=true;
   }
   if(!await save())return;
   const blob=p.blob,front=p.role==='front';releaseCandidate();el('guidedPhotoStatus').textContent=editEntry?'Photo uploaded. Save changes to attach it to the listing.':'Photo saved online.';
   if(front&&step!==5){step=1;generation++;if(scanAfter)scan(blob);}render();
  }catch(e){error(e);el('guidedPhotoStatus').textContent='Photo was not confirmed. Retry Use photo.';}
  finally{busy=false;lock();}
 }
 for(const [id,role] of [['guidedScanCamera','front'],['guidedCamera','front'],['guidedLibrary','front'],['guidedPhotoCamera','detail'],['guidedDetail','detail']])el(id).onchange=e=>{const file=e.target.files?.[0];e.target.value='';pick(file,role);};
 el('guidedCreateListing').onclick=async()=>{
  if(!identifiedCard||busy)return;
  const c=identifiedCard;Object.assign(guidedSession.card,{catalogCardId:c.id,name:c.name,set:c.set});el('guidedName').value=c.name;el('guidedSet').value=c.set;
  step=5;detailLayout(true);render();schedule();dialog.querySelector('.guided-body').scrollTop=0;
 };
 el('guidedMatchRetake').onclick=()=>{el('guidedScanCamera').click();};
 el('guidedUsePhoto').onclick=()=>usePhoto();
 el('guidedRetake').onclick=()=>{if(scanEntry&&step===0&&!candidate?.attached){el('guidedScanCamera').click();return;}if(candidate?.attached){error(Error('Retry saving this photo before replacing it.'));return;}releaseCandidate();el('guidedPhotoStatus').textContent='Take or choose another photo.';};
 for(const [id,key] of [['guidedName','name'],['guidedSet','set'],['guidedPrice','price'],['guidedCondition','condition'],['guidedDescription','description']])el(id).oninput=()=>{if(key==='description')automaticDescription=false;guidedSession.card[key]=key==='price'?Number(el(id).value):el(id).value;if(key==='name'||key==='set')guidedSession.card.catalogCardId=null;render();schedule();};
 el('guidedPhotos').onclick=e=>{
  const b=e.target.closest('[data-remove-photo],[data-cover-photo]');if(!b||busy)return;
  const c=guidedSession.card,i=Number(b.dataset.removePhoto??b.dataset.coverPhoto);
  if(b.dataset.coverPhoto!==undefined){const [url]=c.photos.splice(i,1),[role]=c.photoRoles.splice(i,1);c.photos.unshift(url);c.photoRoles.unshift(role);}
  else{if(editEntry&&c.photos.length===1){error(Error('Add another photo before removing the last listing photo.'));return;}const [url]=c.photos.splice(i,1);c.photoRoles.splice(i,1);if(c.photoFrames)delete c.photoFrames[url];}
  c.thumb=c.photos[0];render();schedule();
 };
 el('guidedNext').onclick=async()=>{
  error();if(candidate){error(Error('Use this photo or choose another before continuing.'));return;}
  if(step===0&&!guidedSession.card.photos.length){error(Error('Add a front photo to continue.'));return;}
  if((step===1||step===5)&&(!el('guidedName').reportValidity()||!el('guidedSet').reportValidity()||!guidedSession.card.name.trim()||!guidedSession.card.set.trim())){error(Error('Enter the card name and set.'));return;}
  if(step===5&&!guidedSession.card.photos.length){error(Error('Add at least one listing photo. The scan photo is only used for identification.'));return;}
  if(step===5&&(!el('guidedPrice').reportValidity()||!(guidedSession.card.price>0))){error(Error('Enter a positive price before previewing.'));return;}
  busy=true;lock();if(await save()){step=scanEntry&&step===1?5:step+1;if(step===5)detailLayout(true);render();dialog.querySelector('.guided-body').scrollTop=0;}busy=false;lock();
 };
 el('guidedPrevious').onclick=()=>{if(candidate){error(Error('Finish reviewing your photo first.'));return;}if(step===5){if(searchEntry){step=7;detailLayout(false);}else showIdentified(identifiedCard);}else{step--;if(step===5)detailLayout(true);}error();render();};
 el('guidedScan').onclick=()=>scan();el('guidedExit').onclick=exit;dialog.addEventListener('cancel',e=>{e.preventDefault();exit();});
 el('guidedRetry').onclick=async()=>{if(publishing){await publish();return;}busy=true;lock();error();await save(true);busy=false;lock();};
 async function publish(){
  if(busy)return;error();
  if(!guidedSession.card.photos.length||!guidedSession.card.name.trim()||!guidedSession.card.set.trim()||!el('guidedPrice').reportValidity()||!(guidedSession.card.price>0)){error(Error('Add a photo, name, set, condition and positive price before publishing.'));return;}
  if(candidate){error(Error('Finish reviewing your photo first.'));return;}
  clearTimeout(timer);publishing=true;busy=true;lock();el('guidedSave').textContent=editEntry?'Saving changes…':'Publishing…';
  try{
   if(editEntry){if(await save(true)){publishing=false;generation++;dialog.close();guidedSession=null;}else publishing=false;return;}
   await guidedSession.publish();generation++;el('guidedSave').textContent='Published to your buyer binder';el('guidedRetry').hidden=true;
   dialog.querySelectorAll('[data-guided-step]').forEach(s=>s.hidden=true);el('guidedNavigation').hidden=true;el('guidedSteps').hidden=true;el('guidedExit').hidden=true;el('guidedDiscard').hidden=true;el('guidedSuccess').hidden=false;el('guidedView').href='index.html#card='+guidedSession.card.id;
   publishing=false;
  }catch(e){error(e);el('guidedSave').textContent='Publication not confirmed. Retry to check and finish.';el('guidedRetry').hidden=false;}
  finally{busy=false;lock();el('guidedRetry').disabled=false;}
 }
 el('guidedPublish').onclick=publish;el('guidedAnother').onclick=()=>searchEntry?search():fresh();el('guidedDone').onclick=()=>{dialog.close();guidedSession=null;};
 dialog.addEventListener('scan-entry',()=>{scanEntry=true;render();});
 window.addEventListener('beforeunload',e=>{if(dialog.open&&(candidate||busy||guidedSession?.dirty)){e.preventDefault();e.returnValue='';}});
 function edit(card){open(card,true);automaticDescription=false;step=5;detailLayout(true);el('guidedAvailability').value=card.sold?'sold':'available';el('guidedSave').textContent='Changes are saved only when you press Save changes.';render();}
 el('guidedAvailability').onchange=()=>{guidedSession.card.sold=el('guidedAvailability').value==='sold';guidedSession.card.status=guidedSession.card.sold?'sold':'available';render();schedule();};
 el('guidedDeleteListing').onclick=async()=>{
  if(busy||publishing||!confirm('Delete this listing and its photos? This cannot be undone.'))return;
  busy=true;lock();error();
  try{if(guidedSession.pending)await guidedSession.reconcile();await sellerAPI('listings/'+encodeURIComponent(guidedSession.card.id)+'?version='+guidedSession.card.version,{method:'DELETE'});generation++;releaseCandidate();dialog.close();guidedSession=null;}
  catch(e){error(e);}finally{busy=false;lock();}
 };
 function search(){fresh();searchEntry=true;showSearch();}
 function showSearch(){step=7;detailLayout(false);el('guidedSave').textContent=guidedSession.card.version?'Saved online · Private draft':'Choose a card to start your listing';render();el('guidedCatalogQuery').focus();}
 function chooseCatalog(card){
  searchRequest++;clearTimeout(searchTimer);identifiedCard=null;
  Object.assign(guidedSession.card,{catalogCardId:card?.id||null,name:card?.name||'',set:card?.set||''});
  el('guidedName').value=guidedSession.card.name;el('guidedSet').value=guidedSession.card.set;
  step=5;detailLayout(true);error();render();if(card)schedule();dialog.querySelector('.guided-body').scrollTop=0;
 }
 el('guidedManual').onclick=()=>chooseCatalog(null);
 el('guidedCatalogQuery').oninput=()=>{
  clearTimeout(searchTimer);const request=++searchRequest,q=el('guidedCatalogQuery').value.trim();
  el('guidedCatalogResults').textContent='';el('guidedCatalogStatus').textContent=q.length<2?'Enter at least 2 characters to search.':'Searching…';
  if(q.length<2)return;
  searchTimer=setTimeout(async()=>{
   try{
    const result=await sellerAPI('catalog/search?q='+encodeURIComponent(q));
    if(request!==searchRequest||!dialog.open||step!==7)return;
    el('guidedCatalogStatus').textContent=result.cards.length?(result.has_more?'Showing 25 matches. Add a set or card number to narrow your search.':'Choose your card to fill in the listing details.'):'No cards found. Try a different name or number, or enter details manually.';
    for(const card of result.cards){const b=document.createElement('button');b.type='button';b.className='catalog-result';
     b.innerHTML=`${card.image_url?`<img src="${sellerEsc(card.image_url)}" alt="" loading="lazy">`:''}<span><strong>${sellerEsc(card.name)}</strong><small>${sellerEsc(card.set)}</small><small>${sellerEsc(card.language_code)}</small></span>`;
     b.onclick=()=>chooseCatalog(card);el('guidedCatalogResults').appendChild(b);
    }
   }catch(e){if(request===searchRequest&&dialog.open)el('guidedCatalogStatus').textContent=e.message+' Edit your search to retry, or enter details manually.';}
  },300);
 };
 return {dialog,open,edit,fresh,search,exit};
}
