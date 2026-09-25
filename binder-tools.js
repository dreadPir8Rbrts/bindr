const CONDITION_OPTIONS=['Near Mint+','Near Mint','Near Mint-','Lightly Played+','Lightly Played','Lightly Played-','Moderately Played'];
const CONDITION_SHORT=['NM+','NM','NM−','LP+','LP','LP−','MP'];
let selectedConditions=[],draftConditions=[],comparisonIds=[],comparisonId=null,comparisonView='photo:0',comparisonZoom=null;
function samePrinting(a,b){return baseSetName(a.set)===baseSetName(b.set)&&cardIdentityKey(a)===cardIdentityKey(b)&&cardNumber(a)===cardNumber(b)&&finish(a)===finish(b);}
function conditionSummary(){return selectedConditions.map(c=>CONDITION_SHORT[CONDITION_OPTIONS.indexOf(c)]).join(', ');}
function updateConditionButton(){const b=$('conditionPicker');b.textContent=selectedConditions.length?conditionSummary():'Any condition';b.classList.toggle('active',!!selectedConditions.length);}
function openConditionPicker(){
 document.body.appendChild($('toast'));
 draftConditions=[...selectedConditions];
 $('conditionPickerDialog').innerHTML=dialogHeader('<span id="conditionPickerTitle">Choose your conditions</span>')+`<div class="info-body"><p>Pick any combination. None selected shows all conditions.</p><div class="condition-choice-grid">${CONDITION_OPTIONS.map((c,i)=>`<button class="condition ${conditionClass(c)}" data-condition-choice="${i}" aria-pressed="${draftConditions.includes(c)}">${CONDITION_SHORT[i]}<span>${c.replace(/[+-]$/,'')}</span></button>`).join('')}</div><div class="lot-buttons"><button id="clearConditions" class="quiet">Any condition</button><button id="applyConditions" class="primary"></button></div></div>`;
 const count=()=>{const saved=selectedConditions;selectedConditions=draftConditions;const n=filteredCards().length;selectedConditions=saved;$('applyConditions').textContent=`Show ${n} card${n===1?'':'s'}`;};
 $('conditionPickerDialog').querySelectorAll('[data-condition-choice]').forEach(b=>b.onclick=()=>{const c=CONDITION_OPTIONS[Number(b.dataset.conditionChoice)];draftConditions=draftConditions.includes(c)?draftConditions.filter(x=>x!==c):CONDITION_OPTIONS.filter(x=>x===c||draftConditions.includes(x));b.setAttribute('aria-pressed',String(draftConditions.includes(c)));count();});
 $('clearConditions').onclick=()=>{draftConditions=[];$('conditionPickerDialog').querySelectorAll('[data-condition-choice]').forEach(b=>b.setAttribute('aria-pressed','false'));count();};
 $('applyConditions').onclick=()=>{selectedConditions=[...draftConditions];renderGrid();closeDialog($('conditionPickerDialog'));};count();openDialog($('conditionPickerDialog'));
}
function selectForLot(id){if(lot.includes(id)){openLot();return;}toggleLot(id);document.querySelector(`[data-card="${id}"]`)?.classList.add('just-selected');}
function comparisonPhoto(c){if(comparisonView.startsWith('photo:'))return Number(comparisonView.slice(6))<c.photos.length?Number(comparisonView.slice(6)):-1;return (c.photoRoles||[]).indexOf(comparisonView);}
function openComparison(id){const c=cardMap.get(id);if(!c)return;comparisonIds=CARDS.filter(x=>!x.sold&&samePrinting(c,x)).map(x=>x.id);if(!comparisonIds.length)return;comparisonId=comparisonIds.includes(id)?id:comparisonIds[0];const photoIndex=activeCard?.id===id?activePhoto:0;comparisonView=c.photoRoles?.[photoIndex]||`photo:${photoIndex}`;renderComparison();openDialog($('compareDialog'));}
function renderComparison(){
 const previousScroll=$('compareDialog').querySelector('.compare-body')?.scrollTop||0;
 const comparisonToast=$('toast');document.body.appendChild(comparisonToast);
 const c=cardMap.get(comparisonId),index=comparisonPhoto(c),inLot=lot.includes(c.id),otherPicks=comparisonIds.filter(id=>id!==c.id&&lot.includes(id));
 const max=Math.max(...comparisonIds.map(id=>cardMap.get(id).photos.length));
 $('compareDialog').innerHTML=dialogHeader('<span id="compareTitle">Choose your copy</span>')+`<div class="compare-body"><h3>${esc(cardIdentityKey(c))}</h3><p class="compare-context small">${esc(baseSetName(c.set))} · ${esc(cardNumber(c))}<br>Choose a copy. Keep the same photo view as you switch.</p><div class="compare-copy-tabs" aria-label="Available copies">${comparisonIds.map((id,i)=>{const x=cardMap.get(id);return `<button data-compare-id="${id}" aria-pressed="${id===c.id}"><img class="compare-tab-photo" ${browseImageAttributes(x.thumb||x.photos[0],120)} alt="" loading="lazy">Copy ${cardCopyNum(x)||i+1}<span class="condition ${conditionClass(x.condition)}">${esc(x.condition)}</span><span>${money(x.price)}${lot.includes(id)?' · In lot':''}</span></button>`;}).join('')}</div><div class="compare-views" aria-label="Photo view">${[...['front','back','detail'].filter(role=>comparisonIds.some(id=>(cardMap.get(id).photoRoles||[]).includes(role))),...Array.from({length:max},(_,i)=>`photo:${i}`)].map(v=>`<button data-compare-view="${v}" aria-pressed="${comparisonView===v}">${v.startsWith('photo:')?'Photo '+(Number(v.slice(6))+1):v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div><p class="small">${comparisonView.startsWith('photo:')?'Photo numbers are upload order; angles may differ between copies.':'Only photos labeled by the seller appear in this view.'}</p><div class="compare-photo">${index>=0?`<button id="inspectComparison" aria-label="Enlarge this copy’s photo"><img src="${esc(c.photos[index])}" alt="${esc(c.name)} · ${esc(comparisonView)}"><span>Tap to inspect</span></button>`:`<p>This angle hasn’t been labeled for this copy.<br>Try a numbered photo or ask for another angle.</p>`}</div><div class="compare-caption"><span class="condition ${conditionClass(c.condition)}">${esc(c.condition)}</span><strong class="price">${money(c.price)}</strong><span>${esc(c.id.toUpperCase())}</span></div><details><summary>About this copy</summary><p>${esc(buyerDescription(c.description))}</p></details><button id="compareAsk" class="text-button">Ask about condition / more photos</button></div><div class="compare-footer"><button id="compareAdd" class="primary">${inLot?'In your lot ✓ · Review':'+ Add this copy to lot'}</button>${otherPicks.length?`<label>Replace a selected copy<select id="swapFrom">${otherPicks.map(id=>`<option value="${id}">${esc(id.toUpperCase())} · ${esc(cardMap.get(id).condition)} · ${money(cardMap.get(id).price)}</option>`).join('')}</select></label><button id="compareSwap" class="quiet" ${inLot?'disabled':''}>Swap for this copy</button>`:''}</div>`;
 $('compareDialog').appendChild(comparisonToast);
 $('compareDialog').querySelector('.compare-body').scrollTop=previousScroll;
 $('compareDialog').querySelectorAll('[data-compare-id]').forEach(b=>b.onclick=()=>{const pos=$('compareDialog').querySelector('.compare-body').scrollTop;comparisonId=b.dataset.compareId;renderComparison();$('compareDialog').querySelector('.compare-body').scrollTop=pos;});
 $('compareDialog').querySelectorAll('[data-compare-view]').forEach(b=>b.onclick=()=>{comparisonView=b.dataset.compareView;renderComparison();});
 if($('inspectComparison'))$('inspectComparison').onclick=()=>{comparisonZoom={src:c.photos[index],name:c.name};openDialog($('zoomDialog'));loadZoomPhoto();};
 $('compareAsk').onclick=()=>showInquiry(c);
 $('compareAdd').onclick=()=>{if(inLot)openLot();else{selectForLot(c.id);renderComparison();}};
 if($('compareSwap'))$('compareSwap').onclick=()=>swapCopy($('swapFrom').value,c.id);
}
function swapCopy(from,to){
 const a=cardMap.get(from),b=cardMap.get(to);if(!a||!b||b.sold||!samePrinting(a,b)||!lot.includes(from)||lot.includes(to))return;
 lot=lot.map(id=>id===from?to:id);persist();renderGrid();refreshLot();renderComparison();
 toast('Copy swapped. Your other picks are unchanged.',()=>{if(lot.includes(to)&&!lot.includes(from)&&!a.sold){lot=lot.map(id=>id===to?from:id);persist();renderGrid();refreshLot();if($('compareDialog').open)renderComparison();}});
}
function setupBinderTools(){
 $('conditionPicker').onclick=openConditionPicker;
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.compare)openComparison(b.dataset.compare);if(b?.hasAttribute('data-clear-conditions')){selectedConditions=[];renderGrid();}});
}

