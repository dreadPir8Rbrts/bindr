'use strict';
function renderGuidedDrafts(){
 const shelf=sellerEl('serverDraftShelf');if(!shelf)return;
 const drafts=inventory.filter(c=>c.status==='draft');shelf.hidden=!drafts.length;
 sellerEl('serverDraftCards').innerHTML=drafts.map(c=>`<div class="guided-draft-card"><button type="button" data-resume="${sellerEsc(c.id)}">${c.photos[0]?`<img src="${sellerEsc(c.thumb||c.photos[0])}" alt="">`:''}<span>${sellerEsc(c.name||'Untitled card')}<small>${c.photos.length} photos · Continue draft</small></span></button><button type="button" data-discard="${sellerEsc(c.id)}" aria-label="Delete draft ${sellerEsc(c.name||'Untitled card')}">Delete draft</button></div>`).join('');
}
(()=>{
 const el=sellerEl;
 function applyInventory(data){inventory=structuredClone(data.cards);onlineRevision=data.revision;originalInventory.clear();inventory.forEach(c=>originalInventory.set(c.id,JSON.stringify(c)));sellerList();}
 const editor=createGuidedSeller({api:sellerAPI,onSaved:applyInventory});
 el('newListing').onclick=()=>{if(!onlineBusy)editor.fresh();};
 el('serverDraftCards').onclick=async e=>{
  const b=e.target.closest('button');if(!b||onlineBusy)return;
  if(b.dataset.resume){editor.open(inventory.find(c=>c.id===b.dataset.resume));return;}
  const c=inventory.find(c=>c.id===b.dataset.discard);if(!c||!confirm('Delete this private draft and its photos?'))return;
  setOnlineBusy(true);b.disabled=true;
  try{applyInventory(await sellerAPI('listings/'+encodeURIComponent(c.id)+'?version='+c.version,{method:'DELETE'}));sellerMessage('Draft deleted.');}
  catch(e){sellerMessage(e.message+' Reload inventory before retrying deletion.');}
  finally{setOnlineBusy(false);b.disabled=false;}
 };
 renderGuidedDrafts();
})();
