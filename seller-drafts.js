'use strict';
// Private, device-local drafts. No credentials are stored here.
const draftFields=['sellerName','sellerSet','sellerPrice','sellerCondition','sellerAvailability','sellerDescription','descriptionNotes','descriptionDraft'];
let draftDatabase,activeDraftKey=null,draftBase=null,draftTimer,draftWrite=Promise.resolve(),draftList=[],draftAutoDescription=false;
function openDraftDatabase(){
 if(!draftDatabase)draftDatabase=new Promise((resolve,reject)=>{const r=indexedDB.open('pokemonhooper.seller.drafts.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other seller tabs and try again.'));});
 return draftDatabase;
}
async function draftOperation(mode,action){const db=await openDraftDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode),request=action(tx.objectStore('drafts'));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Draft save interrupted'));});}
function draftStatus(text){sellerEl('localDraftStatus').textContent=text;}
function draftSnapshot(){
 if(!editing||!activeDraftKey)return null;
 return {key:activeDraftKey,updated:Date.now(),card:structuredClone(editing),base:draftBase,autoDescription:draftAutoDescription,fields:Object.fromEntries(draftFields.map(id=>[id,sellerEl(id).value])),photoFrames:structuredClone(workingFrames),photos:[...workingPhotos],roles:[...workingRoles],tags:[...document.querySelectorAll('[name="descriptionTag"]:checked')].map(x=>x.value),queue:sellerUploadQueue.filter(x=>x.state!=='done').map(x=>({id:x.id,name:x.name,file:x.file,prepared:x.prepared||null,state:'failed',message:'Upload interrupted. Tap Retry to continue.'}))};
}
function saveSellerDraft(){
 clearTimeout(draftTimer);const snapshot=draftSnapshot();if(!snapshot)return Promise.resolve(true);
 draftStatus('Saving draft on this device…');
 const task=draftWrite.then(()=>draftOperation('readwrite',s=>s.put(snapshot)));draftWrite=task.catch(()=>{});
 return task.then(()=>{if(activeDraftKey===snapshot.key)draftStatus('Draft saved on this device · Not published');return true;},()=>{draftStatus('Draft could not save on this device. Keep this page open or publish when ready.');return false;});
}
function scheduleSellerDraft(){if(!sellerSignedIn||!editing||!sellerEl('sellerEditor').open)return;draftStatus('Unsaved draft changes…');clearTimeout(draftTimer);draftTimer=setTimeout(saveSellerDraft,250);}
async function removeLocalDraft(key){clearTimeout(draftTimer);await draftWrite;await draftOperation('readwrite',s=>s.delete(key));}
async function completeSellerDraft(){const key=activeDraftKey;activeDraftKey=null;clearTimeout(draftTimer);if(key)try{await removeLocalDraft(key);}catch{sellerMessage('Listing saved. A local draft could not be cleared; discard it from Drafts.');}await renderDraftShelf();}
async function renderDraftShelf(){
 if(!sellerSignedIn)return;
 try{draftList=await draftOperation('readonly',s=>s.getAll());draftList.sort((a,b)=>b.updated-a.updated);sellerEl('draftShelf').hidden=!draftList.length;sellerEl('draftShelfCount').textContent=draftList.length;
 sellerEl('draftShelfCards').innerHTML=draftList.map(d=>`<article class="local-draft"><div>${d.photos[0]?`<img src="${sellerEsc(d.photos[0])}" alt="" loading="lazy">`:'<span class="draft-placeholder" aria-hidden="true">▧</span>'}<strong>${sellerEsc(d.fields.sellerName||'Untitled card')}</strong><span>${d.photos.length} uploaded · ${d.queue.length} waiting</span></div><button type="button" data-resume-draft="${sellerEsc(d.key)}">Continue</button><button type="button" class="text-button" data-discard-draft="${sellerEsc(d.key)}">Discard</button></article>`).join('');
 }catch{sellerEl('sellerStatus').textContent='Device draft storage is unavailable. Keep the editor open until you publish.';}
}
function nextSellerId(){return 'c'+(Math.max(0,...inventory.map(c=>Number(c.id.slice(1))||0))+1);}
async function resumeSellerDraft(key){
 if(onlineBusy||!sellerSignedIn)return;const d=await draftOperation('readonly',s=>s.get(key));if(!d)return;
 let card;if(d.base!==null){card=inventory.find(c=>c.id===d.card.id);if(!card){sellerMessage('This listing was removed from live inventory. Its draft is kept; discard it when no longer needed.');return;}}
 else{card={...d.card,id:nextSellerId(),name:'',photos:[],photoRoles:[],thumb:''};inventory.push(card);}
 openSellerEditor(card.id);activeDraftKey=d.key;draftBase=d.base;draftAutoDescription=!!d.autoDescription;
 for(const id of draftFields)sellerEl(id).value=d.fields[id]||'';
 workingPhotos=[...d.photos];workingFrames=structuredClone(d.photoFrames||{});workingRoles=[...d.roles];sellerUploadQueue=d.queue.map(x=>({...x,state:'failed',message:'Ready to retry. Photos are saved on this device.'}));uploadSerial=Math.max(uploadSerial,...sellerUploadQueue.map(x=>x.id));
 document.querySelectorAll('[name="descriptionTag"]').forEach(x=>x.checked=d.tags.includes(x.value));renderSellerPhotos();renderUploadQueue();dirty=true;draftStatus('Draft restored · Review before publishing');
 sellerEl('editingTitle').textContent=d.base===null?'New card draft':'Continue listing draft';
 if(d.base!==null&&JSON.stringify(card)!==d.base)sellerMessage('The live listing changed since this draft. Review both before saving; you will be asked before replacing it.');
}
function validateSellerDraft(){if(draftBase===null||!editing)return true;const live=inventory.find(c=>c.id===editing.id);if(!live){sellerMessage('This listing is no longer in inventory. Reload before continuing.');return false;}return JSON.stringify(live)===draftBase||confirm('The live listing changed since this draft. Publish the details and photos shown in this editor over the current listing?');}
const loadBeforeDrafts=loadSellerCard;
loadSellerCard=function(id){loadBeforeDrafts(id);draftBase=originalInventory.get(id)||null;activeDraftKey=draftBase===null?crypto.randomUUID():'listing:'+id;draftAutoDescription=!editing.description;draftStatus('Draft saves on this device as you work');sellerEl('editingTitle').textContent=draftBase===null?'Add a card to your binder':'Edit this copy';sellerEl('sellerSaveLabel').textContent=draftBase===null?'Publish to binder':'Save changes to binder';sellerEl('cardLookup').value='';sellerEl('cardLookupResults').innerHTML='';};
closeSellerEditor=async function(){
 if(onlineBusy)return false;
 if(dirty&&!await saveSellerDraft()){if(!confirm('Draft saving failed. Close and lose changes not saved on this device?'))return false;}
 if(editing&&!originalInventory.has(editing.id))inventory=inventory.filter(c=>c.id!==editing.id);
 dirty=false;activeDraftKey=null;clearTimeout(draftTimer);sellerEl('sellerEditor').close();sellerList();await renderDraftShelf();return true;
};
sellerEl('closeSellerEditor').onclick=()=>closeSellerEditor();
sellerEl('saveDraftClose').onclick=()=>closeSellerEditor();
sellerEl('draftShelfCards').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.dataset.resumeDraft)await resumeSellerDraft(b.dataset.resumeDraft);if(b.dataset.discardDraft&&confirm('Discard this device draft and its pending photos? Your live listing will not change.')){await removeLocalDraft(b.dataset.discardDraft);await renderDraftShelf();}}catch{sellerMessage('Could not open or discard this draft. Try again.');}};
function updateAutomaticDescription(e){
 if(e?.target.id==='sellerDescription'){draftAutoDescription=false;return;}
 if(!draftAutoDescription||!['sellerName','sellerSet','sellerCondition'].includes(e?.target.id))return;
 try{sellerEl('sellerDescription').value=`${sellerEl('sellerName').value.trim()} from ${sellerEl('sellerSet').value.trim()}. Listed as ${sellerEl('sellerCondition').value}. Photos show the exact copy available.`;if(!sellerEl('sellerName').value.trim()||!sellerEl('sellerSet').value.trim())sellerEl('sellerDescription').value='';}catch{}
}
sellerEl('sellerForm').addEventListener('input',e=>{updateAutomaticDescription(e);scheduleSellerDraft();});
sellerEl('sellerForm').addEventListener('change',scheduleSellerDraft);
sellerEl('sellerForm').addEventListener('click',e=>{if(e.target.closest('[data-up],[data-delete],[data-remove-upload],#useDescription,#dismissDescription,#draftDescription'))scheduleSellerDraft();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty&&activeDraftKey)saveSellerDraft();});
sellerEl('newListing').onclick=()=>{if(onlineBusy)return;const id=nextSellerId();inventory.push({id,name:'',set:'',price:0,condition:'Near Mint',sold:false,description:'',photos:[],thumb:''});openSellerEditor(id);dirty=true;saveSellerDraft();sellerEl('sellerUpload').focus();};
sellerEl('cardLookup').oninput=()=>{const q=sellerEl('cardLookup').value.trim().toLowerCase();const seen=new Set(),cards=inventory.filter(c=>{const k=c.name+'|'+c.set;if(!c.name||seen.has(k)||!q||!`${c.name} ${c.set}`.toLowerCase().includes(q))return false;seen.add(k);return true;}).slice(0,6);sellerEl('cardLookupResults').innerHTML=cards.map(c=>`<button type="button" data-reuse-card="${sellerEsc(c.id)}"><strong>${sellerEsc(c.name)}</strong><span>${sellerEsc(c.set)}</span></button>`).join('')||(q?'<p class="small">No match in your inventory. Enter the details below.</p>':'');};
sellerEl('cardLookupResults').onclick=e=>{const b=e.target.closest('[data-reuse-card]');if(!b)return;const c=inventory.find(x=>x.id===b.dataset.reuseCard);sellerEl('sellerName').value=c.name.replace(/\s*(?:—\s*)?\(?Copy\s*#?\d+\)?/ig,'').trim();sellerEl('sellerSet').value=c.set;sellerEl('sellerName').dispatchEvent(new Event('input',{bubbles:true}));sellerEl('cardLookupResults').innerHTML='';sellerMessage('Name and set filled. Choose this copy’s condition and price.');};
if(sellerSignedIn)renderDraftShelf();
