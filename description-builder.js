'use strict';
function buildSellerDescription({name,set,condition,tags=[],notes=''}) {
 const clean=s=>String(s||'').trim();
 name=clean(name);set=clean(set);condition=clean(condition);notes=clean(notes);
 if(!name||!set||!condition)throw Error('Enter the card name, set and condition first.');
 const details={'swirl':'Features a holo swirl.','holo-scratches':'Holo scratching is present.','surface-scratches':'Surface scratching is present.','edge-whitening':'Edge whitening is present.','corner-wear':'Corner wear is present.','crease':'A crease is present.'};
 return [`${name} from ${set}.`,`Listed as ${condition}.`,...[...new Set(tags)].filter(t=>details[t]).map(t=>details[t]),notes,'See the listing photos for this copy’s condition. Ask if you’d like a closer look at a specific area.'].filter(Boolean).join(' ');
}
if(typeof document!=='undefined')(()=>{
 const el=id=>document.getElementById(id);
 const reset=()=>{el('descriptionBuilder').open=false;el('descriptionNotes').value='';el('descriptionDraft').value='';el('descriptionPreview').hidden=true;el('descriptionDraftStatus').textContent='';document.querySelectorAll('[name="descriptionTag"]').forEach(x=>x.checked=false);};
 const oldLoad=loadSellerCard;loadSellerCard=function(id){oldLoad(id);reset();};
 el('draftDescription').onclick=()=>{try{const draft=buildSellerDescription({name:el('sellerName').value,set:el('sellerSet').value,condition:el('sellerCondition').value,tags:[...document.querySelectorAll('[name="descriptionTag"]:checked')].map(x=>x.value),notes:el('descriptionNotes').value});el('descriptionDraft').value=draft;el('descriptionPreview').hidden=false;el('descriptionDraftStatus').textContent='Review the wording. Your listing description has not changed.';el('descriptionDraft').focus();}catch(e){el('descriptionDraftStatus').textContent=e.message;}};
 el('useDescription').onclick=()=>{const draft=el('descriptionDraft').value.trim(),field=el('sellerDescription');if(!draft){el('descriptionDraftStatus').textContent='Add some text to the draft first.';return;}if(field.value.trim()&&field.value!==draft&&!confirm('Replace the existing description with this draft?'))return;field.value=draft;field.dispatchEvent(new Event('input',{bubbles:true}));dirty=true;el('descriptionPreview').hidden=true;el('descriptionDraftStatus').textContent='Description added. Review it above, then save the listing to publish.';field.focus();};
 el('dismissDescription').onclick=()=>{el('descriptionPreview').hidden=true;el('descriptionDraft').value='';el('descriptionDraftStatus').textContent='Draft discarded. Your description is unchanged.';};
 el('sellerForm').addEventListener('input',e=>{if(['sellerName','sellerSet','sellerCondition','descriptionNotes'].includes(e.target.id)||e.target.name==='descriptionTag'){if(!el('descriptionPreview').hidden){el('descriptionPreview').hidden=true;el('descriptionDraftStatus').textContent='Details changed. Draft again to use the latest information.';}}});
})();

