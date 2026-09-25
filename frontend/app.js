// Catalog-only framing; original inspection photos remain untouched.
const catalogFraming={"c45": "--crop-width:129.6551%;--crop-height:124.5549%;--crop-left:-15.0977%;--crop-top:-9.4555%", "c40": "--crop-width:131.9298%;--crop-height:126.6526%;--crop-left:-9.0936%;--crop-top:-23.1221%", "c44": "--crop-width:122.9428%;--crop-height:117.9608%;--crop-left:-6.2207%;--crop-top:-11.5608%", "c117": "--crop-width:118.1152%;--crop-height:113.5094%;--crop-left:-2.9057%;--crop-top:-8.3510%", "c97": "--crop-width:108.2014%;--crop-height:103.9033%;--crop-left:0.0000%;--crop-top:-2.8445%", "c137": "--crop-width:128.4511%;--crop-height:123.5364%;--crop-left:-8.8474%;--crop-top:-23.5364%"};
function budgetMatches(c){return true;}
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => n > 0 ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(n) : 'Ask for price';
const cardMap = new Map(CARDS.map(c => [c.id,c]));
const STORAGE_KEY = 'pokemonhooper.binder.v2';
let storageAvailable = true;
function restore(){try {const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return raw && typeof raw==='object' ? raw : {};}catch{return {};}}
const stored = restore();
const validIds = (ids, available=false) => [...new Set(Array.isArray(ids)?ids:[])].filter(id => cardMap.has(id) && (!available || !cardMap.get(id).sold));
let lot=validIds(stored.lot,true), favorites=validIds(stored.favorites);
let recent=validIds(stored.recent).slice(0,8);
let note=typeof stored.note==='string'?stored.note:'';
let favoritesView=false;
const lotPriceChanges=new Map();
let quick='', showAvailableOnly=true, displayed=[], activeCard=null, activePhoto=0, toastTimer;
const modalStack=[];
const topDialog=()=>modalStack.filter(d=>d.open).at(-1);
const historyDialogs=new Set([$('cardDialog'),$('lotDialog')]);
function closeDialogNow(dialog){
 const index=modalStack.lastIndexOf(dialog);
 if(index>=0)modalStack.slice(index+1).reverse().forEach(child=>{if(child.open)child.close();});
 if(dialog.open)dialog.close();
}
const dialogHistory=createDialogHistory(window,closeDialogNow);
function closeDialog(dialog,after){if(historyDialogs.has(dialog))dialogHistory.requested(dialog,after);else{closeDialogNow(dialog);if(after)after();}}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({lot,favorites,note,recent}));storageAvailable=true;}catch{storageAvailable=false;}}
function toast(message,undo){
 const host=topDialog()||document.body;host.appendChild($('toast'));
 $('toast').innerHTML=`<span>${esc(message)}</span>${undo?'<button id="undoToast" type="button">Undo</button>':''}`;
 if(undo)$('undoToast').onclick=()=>{undo();toast('Restored to your lot');};
 $('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),undo?6500:2600);
}
function rememberCard(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,8);persist();renderRecent();}
function renderRecent(){
 $('recentSection').hidden=!recent.length;$('recentCount').textContent=recent.length?String(recent.length):'';
 $('recentCards').innerHTML=recent.map(id=>{const c=cardMap.get(id);return `<button class="recent-card" data-action="open" data-id="${id}"><img ${browseImageAttributes(c.thumb)} alt="" loading="lazy"><span class="recent-name">${esc(buyerCardTitle(c))}</span><span class="condition ${conditionClass(c.condition)}">${esc(c.condition)}</span><span class="recent-price">${c.sold?'Sold':money(c.price)}</span></button>`;}).join('');
}
function refreshFavorite(){if(activeCard&&$('detailFavorite')){const saved=favorites.includes(activeCard.id);$('detailFavorite').textContent=saved?'♥ Saved to favorites':'♡ Save for later';$('detailFavorite').setAttribute('aria-pressed',String(saved));}}
function conditionClass(condition){const base=condition.startsWith('Near Mint')?'nm':condition.startsWith('Lightly')?'lp':'mp';return base+(condition.endsWith('+')?' plus':condition.endsWith('-')?' minus':'');}
function cardNumber(c){const parts=c.set.split('·').map(x=>x.trim());return parts.find(x=>/^[A-Z]{0,5}\d+[A-Z]?(?:\s*\/\s*\d+)?$/i.test(x))||((c.set.match(/\b[A-Z]{0,5}\d+[A-Z]?\s*\/\s*\d+\b/i)||[])[0])||'';}
function finish(c){return financeType(c,parseCardName(c.name).holoLabels)||'';}
function searchable(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function matches(c,query){
 const hay=searchable(`${c.name} ${c.set} ${c.condition} ${c.id}`);
 return searchable(query).trim().split(/\s+/).filter(Boolean).every(word=>{
  if(hay.includes(word))return true;
  if(word.length<4 || /\d/.test(word))return false;
  const distance=word.length<=5?1:2;
  return hay.split(/[\s·,()—-]+/).some(token=>Math.abs(token.length-word.length)<=distance&&levenshtein(word,token)<=distance);
 });
}
function filtersActive(){return $('searchInput').value || $('setFilter').value!=='all' || selectedConditions.length || $('budgetFilter').value!=='all' || quick;}
function resetFilters(){ clearTimeout(searchTimer);selectedConditions=[];$('searchInput').value='';['setFilter','budgetFilter'].forEach(id=>$(id).value='all');quick='';renderGrid(); }

function buyerCardTitle(card){
 return parseCardName(card.name).displayName.replace(/\s*\(Copy #\d+\)\s*$/i,'').trim();
}
function buyerCopyLabel(card){
 const copies=CARDS.filter(other=>!!other.sold===!!card.sold&&samePrinting(card,other))
  .sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
 return copies.length>1?'Copy '+(copies.findIndex(other=>other.id===card.id)+1):'';
}
function cardCopyNum(card){
 return Number(buyerCopyLabel(card).replace('Copy ',''))||0;
}
function buyerCopyBadge(card){
 const label=buyerCopyLabel(card);
 return label?'<span class="small copy-label" style="display:block;margin-top:4px">'+esc(label)+'</span>':'';
}
function buyerCardLabel(card){
 return [buyerCardTitle(card),buyerCopyLabel(card)].filter(Boolean).join(' · ');
}
function groupPrintingCopies(sorted){
 const groups=[];
 for(const card of sorted){
  const group=groups.find(group=>samePrinting(group[0],card));
  if(group)group.push(card);else groups.push([card]);
 }
 return groups.flatMap(group=>group.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1))));
}

// Default catalog order: featured Gengar, then sets by total value.
function catalogSetKey(card){
 return baseSetName(card.set).replace(/^EX\s+/i,'').replace(/^Expedition Base Set$/i,'Expedition').trim();
}
function reverseOrStamped(card){
 return finish(card)==='Reverse Holo'||/\bstamp(?:ed)?\b/i.test(card.name+' '+card.set);
}
function organizeCatalog(cards,pool){
 const totals=new Map();
 for(const card of pool){const key=catalogSetKey(card);totals.set(key,(totals.get(key)||0)+(Number(card.price)||0));}
 const bySetValue=(a,b)=>(totals.get(catalogSetKey(b))||0)-(totals.get(catalogSetKey(a))||0)
  ||catalogSetKey(a).localeCompare(catalogSetKey(b))
  ||Number(b.price)-Number(a.price)||cardIdentityKey(a).localeCompare(cardIdentityKey(b))
  ||Number(a.id.slice(1))-Number(b.id.slice(1));
 const featured=cards.filter(c=>!c.sold&&/^Gengar(?:\s|\(|$)/i.test(c.name)&&catalogSetKey(c)==='Expedition'&&finish(c)==='Holo')
  .sort((a,b)=>Number(b.price)-Number(a.price)||Number(a.id.slice(1))-Number(b.id.slice(1)))[0];
 const remaining=cards.filter(c=>c!==featured);
 return [...(featured?[featured]:[]),
  ...groupPrintingCopies(remaining.sort(bySetValue))];
}
function filteredCards(){
 let list=CARDS.filter(c=> (favoritesView?favorites.includes(c.id):(showAvailableOnly?!c.sold:!!c.sold)) && matches(c,$('searchInput').value) && ($('setFilter').value==='all'||baseSetName(c.set)===$('setFilter').value) && (!selectedConditions.length||selectedConditions.includes(c.condition)) && budgetMatches(c) && (!quick || (quick==='saved'?favorites.includes(c.id):quick==='swirl'?cardHasSwirl(c):quick==='holo'?finish(c)==='Holo':quick==='non-holo'?finish(c)==='Non-Holo':finish(c)==='Reverse Holo')));
 const sort=$('sortSelect').value;
 if(sort==='group-set')return organizeCatalog(list,CARDS.filter(c=>favoritesView?favorites.includes(c.id):(showAvailableOnly?!c.sold:!!c.sold)));
 return groupPrintingCopies(list.sort((a,b)=>Number(!!a.sold)-Number(!!b.sold)||(sort==='price-asc'?a.price-b.price:sort==='price-desc'?b.price-a.price:sort==='newest'?Number(b.id.slice(1))-Number(a.id.slice(1)):sort==='name'?a.name.localeCompare(b.name):baseSetName(a.set).localeCompare(baseSetName(b.set))||cardIdentityKey(a).localeCompare(cardIdentityKey(b))||cardCopyNum(a)-cardCopyNum(b))));
}
function renderGrid(){
 const focused=document.activeElement;
 const focusId=focused?.dataset?.id, focusAction=focused?.dataset?.action;
 displayed=filteredCards();updateConditionButton();
 for(const [id,on] of [['availableTab',!favoritesView&&showAvailableOnly],['favoritesTab',favoritesView],['soldTab',!favoritesView&&!showAvailableOnly]]){$(id).setAttribute('aria-pressed',String(on));$(id).classList.toggle('active',on);}$('favoritesTabCount').textContent=favorites.length;
 
 $('archiveNote').hidden=favoritesView||showAvailableOnly;$('surpriseBtn').hidden=!showAvailableOnly;
 const refineCount=['setFilter','budgetFilter'].filter(id=>$(id).value!=='all').length+Number(selectedConditions.length>0)+Number($('sortSelect').value!=='group-set');
 $('refineCount').textContent=refineCount?String(refineCount):'';
 $('availableToggle').classList.toggle('active',showAvailableOnly);$('availableToggle').setAttribute('aria-pressed',String(showAvailableOnly));
 document.querySelectorAll('[data-quick]').forEach(b=>{b.classList.toggle('active',quick===b.dataset.quick);b.setAttribute('aria-pressed',String(quick===b.dataset.quick));});
 $('resultCount').textContent=`${displayed.length} ${displayed.length===1?'card':'cards'}${favoritesView?' in favorites':showAvailableOnly?' available':' in the sold archive'}`;
 $('resetBtn').hidden=!filtersActive();$('surpriseBtn').disabled=!displayed.some(c=>!c.sold);
 $('activeFilters').innerHTML=['setFilter','budgetFilter'].filter(id=>$(id).value!=='all').map(id=>`<button data-clear="${id}" aria-label="Remove ${esc($(id).selectedOptions[0].textContent)} filter">${esc($(id).selectedOptions[0].textContent)} ×</button>`).join('');
 if(selectedConditions.length)$('activeFilters').innerHTML+=`<button data-clear-conditions>Condition: ${esc(conditionSummary())} ×</button>`;
 if(!displayed.length){$('binderGrid').innerHTML=`<div class="empty"><h2>${favoritesView?'No matching favorites here.':'No cards in this pocket.'}</h2><p>${favoritesView?'Tap a heart in Available or Sold to save cards here. Your search and filters also apply here.':'Try another name, a higher budget, or a different condition.'}</p><button class="primary" data-action="clear-filters">${favoritesView?'Clear filters':showAvailableOnly?'Browse all available cards':'Browse the full sold archive'}</button></div>`;return;}
 $('binderGrid').innerHTML=displayed.map((c,index)=>{
 const parsed=parseCardName(c.name), inLot=lot.includes(c.id), saved=favorites.includes(c.id);const copyCount=CARDS.filter(x=>!x.sold&&samePrinting(c,x)).length;
 return `<article class="pocket${inLot?' in-lot':''}${c.sold?' sold':''}" data-card="${c.id}" data-condition="${conditionClass(c.condition).split(' ')[0]}">
 <button class="favorite" data-action="favorite" data-id="${c.id}" aria-label="${saved?'Unsave':'Save'} ${esc(buyerCardLabel(c))}" aria-pressed="${saved}">${saved?'♥':'♡'}</button>
 <button class="photo-open" data-action="open" data-id="${c.id}" aria-label="Inspect ${esc(buyerCardLabel(c))} photos"><span class="pocket-image-frame ${cardFrameStyle(c)||reviewedCatalogFrameStyle(c)||catalogFraming[c.id]?'is-framed':''}" style="${cardFrameStyle(c)||reviewedCatalogFrameStyle(c)||catalogFraming[c.id]||''}"><img ${browseImageAttributes(c.thumb)} alt="${esc(buyerCardLabel(c))}" width="260" height="347" loading="${index<4?'eager':'lazy'}" decoding="async"></span><span class="photo-count">${c.photos.length} photo${c.photos.length===1?'':'s'} · Inspect</span></button>
 <div class="pocket-body"><div class="card-labels"><span class="condition ${conditionClass(c.condition)}">${esc(c.condition)}</span>${c.sold?'<span class="sold-label">Sold</span>':''}${cardHasSwirl(c)?'<span class="special">✦ Swirl</span>':''}</div>
 <button class="title-button" data-action="open" data-id="${c.id}">${esc(buyerCardTitle(c))}</button>${buyerCopyBadge(c)}
 <div class="set-name">${esc(baseSetName(c.set))}<br><span>${esc([cardNumber(c),finish(c)].filter(Boolean).join(' · '))}</span></div>
 ${copyCount>1?`<button class="compare-pocket" data-compare="${c.id}">Compare ${copyCount} copies</button>`:''}<div class="card-bottom"><span class="price">${c.sold?'<small>Last asking price</small>':''}${money(c.price)}</span><button class="add-button ${inLot?'added':''}" data-action="lot" data-id="${c.id}" aria-label="${inLot?'Review':'Add'} ${esc(buyerCardLabel(c))} ${inLot?'in':'to'} lot" aria-pressed="${inLot}" ${c.sold?'disabled':''}>${c.sold?'Sold':inLot?'✓ In lot':'+ Add to lot'}</button></div></div></article>`;
 }).join('');
 if(!topDialog() && focusId && focusAction)document.querySelector(`[data-action="${focusAction}"][data-id="${focusId}"]`)?.focus({preventScroll:true});
}
function total(){return lot.reduce((sum,id)=>sum+cardMap.get(id).price,0);}
function refreshLot(){
 $('lotCount').textContent=lot.length;$('lotDock').hidden=!lot.length;
 $('dockThumbs').innerHTML=lot.slice(-3).map(id=>`<img ${browseImageAttributes(cardMap.get(id).thumb,120)} alt="">`).join('');
 $('dockTotal').textContent=money(total());$('dockCount').textContent=`${lot.length} card${lot.length===1?'':'s'} in your lot`;
 if($('detailReview')){$('detailReview').disabled=!lot.length;$('detailReview').textContent=`Lot (${lot.length}) →`;}
 if(activeCard && $('detailAdd')){const selected=lot.includes(activeCard.id);$('detailAdd').textContent=activeCard.sold?'Sold':selected?'✓ In your lot · Review':'+ Add to your lot';$('detailAdd').setAttribute('aria-pressed',String(selected));}
}
function toggleLot(id){
 const c=cardMap.get(id);if(!c||c.sold)return;const oldIndex=lot.indexOf(id),was=oldIndex>=0;
 lot=was?lot.filter(x=>x!==id):[...lot,id];persist();renderGrid();refreshLot();if($('lotDialog').open)renderLot();
 const undo=was?()=>{if(!lot.includes(id)&&!c.sold){lot.splice(Math.min(oldIndex,lot.length),0,id);persist();renderGrid();refreshLot();if($('lotDialog').open)renderLot();}}:undefined;
 toast(`${was?'Removed':'Added'} ${parseCardName(c.name).displayName}${storageAvailable?'':' · Storage unavailable; keep this tab open'}`,undo);
}
function toggleFavorite(id){if(!cardMap.has(id))return;const was=favorites.includes(id);favorites=was?favorites.filter(x=>x!==id):[...favorites,id];persist();renderGrid();refreshFavorite();toast(was?'Removed from favorites':storageAvailable?'Saved to favorites':'Saved for this visit; browser storage unavailable');}
const dialogReturns=new WeakMap();
function openDialog(dialog,scrollY=window.scrollY){
 if(dialog.open)return;
 const opener=document.activeElement;
 dialogReturns.set(dialog,{opener,id:opener?.dataset?.id,action:opener?.dataset?.action,scrollY});
 dialog.showModal();
 modalStack.push(dialog);
 if(historyDialogs.has(dialog))dialogHistory.opened(dialog);
}
function restoreDialogPosition(dialog){
 const state=dialogReturns.get(dialog);if(!state)return;
 const stackIndex=modalStack.lastIndexOf(dialog);if(stackIndex>=0)modalStack.splice(stackIndex,1);
 let target=state.opener;
 if(!target?.isConnected&&state.id&&state.action){target=Array.from(document.querySelectorAll('[data-id][data-action]')).find(b=>b.dataset.id===state.id&&b.dataset.action===state.action);}
 const parent=target?.closest?.('dialog');
 if(target?.isConnected&&!target.closest('[hidden]')&&(!topDialog()||parent===topDialog())&&(!parent||parent.open))target.focus({preventScroll:true});
 if(!document.querySelector('dialog[open]'))window.scrollTo({top:state.scrollY,behavior:'instant'});
 dialogReturns.delete(dialog);
}
function dialogHeader(title){return `<div class="dialog-head"><h2>${title}</h2><button class="close" data-close aria-label="Close dialog">×</button></div>`;}
function openCard(id){
 const c=cardMap.get(id);if(!c)return;const browseScroll=window.scrollY;activeCard=c;activePhoto=0;rememberCard(id);
 const copies=CARDS.filter(x=>x.id!==id&&!x.sold&&samePrinting(c,x));
 document.body.appendChild($('toast'));
 $('cardDialog').innerHTML=dialogHeader('Inspect your next keeper')+`<div class="detail-layout"><div class="gallery"><div class="photo-reel" id="photoReel" aria-label="Card photos. Swipe horizontally to browse.">${c.photos.map((p,i)=>`<button class="photo-slide" data-enlarge="${i}" aria-label="Enlarge photo ${i+1} of ${esc(buyerCardLabel(c))}"><img src="${esc(p)}" alt="${esc(buyerCardLabel(c))} — photo ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async"><span class="enlarge-label">⊕ Inspect photo</span></button>`).join('')}</div><div class="gallery-controls"><button id="prevPhoto" aria-label="Previous photo" ${c.photos.length<2?'disabled':''}>←</button><span id="photoCounter" role="status">Photo 1 of ${c.photos.length}</span><button id="nextPhoto" aria-label="Next photo" ${c.photos.length<2?'disabled':''}>→</button></div><div class="photo-thumbs" aria-label="Choose a photo">${c.photos.map((p,i)=>`<button data-photo="${i}" aria-pressed="${i===0}" aria-label="View photo ${i+1}"><img ${browseImageAttributes(p,120)} alt="" loading="lazy"><span>${i+1}</span></button>`).join('')}</div><p class="gallery-tip">Swipe for every angle. Tap a photo to inspect.</p>${c.photos.length===1?'<p>One photo listed. Ask for additional angles before buying.</p>':''}</div><section class="detail-info"><p class="eyebrow">${c.sold?'SOLD':'AVAILABLE'} · LISTING ${esc(c.id.toUpperCase())}</p><h2 id="cardTitle">${esc(buyerCardTitle(c))}</h2>${buyerCopyBadge(c)}<div class="set-name">${esc(c.set)}${finish(c)?`<br>${esc(finish(c))}`:''}</div><div class="condition-note"><span class="condition ${conditionClass(c.condition)}">${esc(c.condition)}</span><p>Seller's estimate for this exact copy. Photos are the best place to check.</p></div><details class="card-notes" open><summary>About this copy</summary><p class="detail-description">${esc(buyerDescription(c.description))}</p></details><div class="detail-actions">${c.sold?'<button id="soldBrowse" class="primary">Browse available cards</button>':`<button id="askPhotos" class="quiet">Ask about condition / more photos</button>`}<div class="save-share"><button id="detailFavorite" class="quiet" aria-pressed="${favorites.includes(c.id)}">${favorites.includes(c.id)?'♥ Saved to favorites':'♡ Save for later'}</button><button id="shareCard" class="text-button">Copy card link</button></div><button id="detailReferences" class="seller-reminder">Meet your seller · References &amp; buying details ↗</button></div><p class="small">Ships within 2 business days via USPS Priority. Confirm shipping cost and payment in DMs.</p>${copies.length?`<div class="copy-options"><h3>Compare available copies</h3><button class="primary" data-compare="${c.id}">Compare ${copies.length+Number(!c.sold)} available copies</button>${copies.map(x=>`<button data-copy="${x.id}"><span class="condition ${conditionClass(x.condition)}">${esc(x.condition)}</span> ${money(x.price)} · ${esc(x.id.toUpperCase())}</button>`).join('')}</div>`:''}</section></div><div class="detail-buybar"><div><span class="small">${c.sold?'Last asking price':'Listed price · USD'}</span><strong class="price">${money(c.price)}</strong></div><button id="detailAdd" class="primary" aria-pressed="${lot.includes(c.id)}" ${c.sold?'disabled':''}>${c.sold?'Sold':lot.includes(c.id)?'✓ In your lot · Review':'+ Add to your lot'}</button><button id="detailReview" class="quiet" ${!lot.length?'disabled':''}>Lot (${lot.length}) →</button></div>`;
 openDialog($('cardDialog'),browseScroll);
 $('cardDialog').querySelector('.detail-layout').scrollTop=0;
 $('prevPhoto').onclick=()=>setPhoto(activePhoto-1);$('nextPhoto').onclick=()=>setPhoto(activePhoto+1);
 $('detailAdd').onclick=()=>selectForLot(id);$('detailReview').onclick=openLot;
 if($('soldBrowse'))$('soldBrowse').onclick=()=>closeDialog($('cardDialog'),()=>{favoritesView=false;showAvailableOnly=true;resetFilters();});
 if($('askPhotos'))$('askPhotos').onclick=()=>showInquiry(c);
 $('shareCard').onclick=()=>shareSelection('card',id);$('detailFavorite').onclick=()=>toggleFavorite(id);$('detailReferences').onclick=showAbout;
 const reel=$('photoReel');let scrollFrame=0,startX=0,startY=0,suppressClick=0;
 reel.querySelectorAll('.photo-slide').forEach(button=>{
  const photo=button.querySelector('img'),label=button.querySelector('.enlarge-label');
  const failed=()=>{button.dataset.failed='true';label.textContent='Photo unavailable · Tap to retry';label.setAttribute('role','status');button.setAttribute('aria-label','Photo unavailable. Retry loading photo.');};
  photo.addEventListener('error',failed);
  photo.addEventListener('load',()=>{delete button.dataset.failed;label.textContent='⊕ Inspect photo';button.setAttribute('aria-label','Enlarge photo '+(Number(button.dataset.enlarge)+1));});
  if(photo.complete&&!photo.naturalWidth)failed();
 });
 reel.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>{const width=reel.clientWidth;if(width)updatePhotoIndex(Math.round(reel.scrollLeft/width));});},{passive:true});
 reel.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;});
 reel.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)suppressClick=Date.now()+500;});
 reel.addEventListener('pointercancel',()=>{suppressClick=Date.now()+500;});
 reel.querySelectorAll('[data-enlarge]').forEach(button=>button.onclick=()=>{if(Date.now()<suppressClick)return;if(button.dataset.failed){const photo=button.querySelector('img');photo.src=c.photos[Number(button.dataset.enlarge)];return;}updatePhotoIndex(Number(button.dataset.enlarge));openZoom();});
}
function updatePhotoIndex(index){
 if(!activeCard)return;activePhoto=Math.max(0,Math.min(activeCard.photos.length-1,index));
 $('photoCounter').textContent=`Photo ${activePhoto+1} of ${activeCard.photos.length}`;
 document.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.photo)===activePhoto)));
}
function setPhoto(index){
 if(!activeCard)return;updatePhotoIndex((index+activeCard.photos.length)%activeCard.photos.length);
 const reel=$('photoReel');if(reel)reel.scrollTo({left:activePhoto*reel.clientWidth,behavior:$('zoomDialog').open||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
let zoom=1,panX=0,panY=0;
function clampZoom(value){return Math.max(1,Math.min(5,value));}
function paintZoom(){
 const viewport=$('zoomViewport'),img=$('zoomImage');
 const vw=viewport.clientWidth,vh=viewport.clientHeight;
 const ratio=img.naturalWidth&&img.naturalHeight?Math.min(vw/img.naturalWidth,vh/img.naturalHeight):1;
 const iw=(img.naturalWidth||vw)*ratio,ih=(img.naturalHeight||vh)*ratio;
 panX=Math.max(-Math.max(0,(iw*zoom-vw)/2),Math.min(Math.max(0,(iw*zoom-vw)/2),panX));
 panY=Math.max(-Math.max(0,(ih*zoom-vh)/2),Math.min(Math.max(0,(ih*zoom-vh)/2),panY));
 img.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
 viewport.classList.toggle('is-zoomed',zoom>1);$('zoomScale').textContent=`${Math.round(zoom*100)}%`;
 $('zoomOut').disabled=zoom<=1;$('zoomIn').disabled=zoom>=5;
}
function changeZoom(value,x=0,y=0){const next=clampZoom(value),factor=next/zoom;panX=x-(x-panX)*factor;panY=y-(y-panY)*factor;zoom=next;paintZoom();}
function resetZoom(){zoom=1;panX=0;panY=0;paintZoom();}
function loadZoomPhoto(){
 if(comparisonZoom){$('zoomImage').src=comparisonZoom.src;$('zoomImage').alt=comparisonZoom.name;$('zoomLabel').textContent=comparisonZoom.name;$('zoomPrev').disabled=$('zoomNext').disabled=true;resetZoom();return;}
 if(!activeCard)return;const img=$('zoomImage');img.src=activeCard.photos[activePhoto];img.alt=`${activeCard.name} — photo ${activePhoto+1}`;
 $('zoomLabel').textContent=`${parseCardName(activeCard.name).displayName} · ${activePhoto+1}/${activeCard.photos.length}`;
 $('zoomPrev').disabled=$('zoomNext').disabled=activeCard.photos.length<2;resetZoom();
}
function openZoom(){comparisonZoom=null;if(!activeCard)return;openDialog($('zoomDialog'));loadZoomPhoto();}
function setupZoom(){
 const view=$('zoomViewport'),points=new Map();let lastMid=null,lastDistance=0,tapStart=null,lastTap=null,hadPinch=false;
 const local=(x,y)=>{const r=view.getBoundingClientRect();return{x:x-r.left-r.width/2,y:y-r.top-r.height/2};};
 const pinch=()=>{const p=[...points.values()],a=p[0],b=p[1];return{mid:local((a.x+b.x)/2,(a.y+b.y)/2),distance:Math.hypot(a.x-b.x,a.y-b.y)};};
 view.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;view.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===1){tapStart={x:e.clientX,y:e.clientY,time:Date.now(),moved:false};hadPinch=false;}if(points.size===2){hadPinch=true;const p=pinch();lastMid=p.mid;lastDistance=p.distance;}});
 view.addEventListener('pointermove',e=>{
  if(!points.has(e.pointerId))return;const prev=points.get(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(tapStart&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>8)tapStart.moved=true;
  if(points.size===2){const p=pinch();if(lastDistance>0){changeZoom(zoom*p.distance/lastDistance,lastMid.x,lastMid.y);panX+=p.mid.x-lastMid.x;panY+=p.mid.y-lastMid.y;paintZoom();}lastMid=p.mid;lastDistance=p.distance;}
  else if(points.size===1&&zoom>1){panX+=e.clientX-prev.x;panY+=e.clientY-prev.y;paintZoom();}
 });
 const end=e=>{if(!points.has(e.pointerId))return;points.delete(e.pointerId);if(e.type==='pointerup'&&!hadPinch&&tapStart&&!tapStart.moved&&Date.now()-tapStart.time<300){if(lastTap&&Date.now()-lastTap.time<320&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){const p=local(e.clientX,e.clientY);changeZoom(zoom>1?1:2.5,p.x,p.y);lastTap=null;}else lastTap={x:e.clientX,y:e.clientY,time:Date.now()};}if(points.size<2){lastDistance=0;lastMid=null;}};
 view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);
 view.addEventListener('wheel',e=>{e.preventDefault();const p=local(e.clientX,e.clientY);changeZoom(zoom*Math.exp(-e.deltaY*.002),p.x,p.y);},{passive:false});
 view.addEventListener('keydown',e=>{if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')changeZoom(zoom+.5);if(e.key==='-')changeZoom(zoom-.5);if(e.key==='0')resetZoom();if(e.key==='ArrowLeft')panX+=45;if(e.key==='ArrowRight')panX-=45;if(e.key==='ArrowUp')panY+=45;if(e.key==='ArrowDown')panY-=45;paintZoom();});
 $('zoomImage').onload=paintZoom;$('zoomClose').onclick=()=>closeDialog($('zoomDialog'));$('zoomScale').onclick=resetZoom;$('zoomIn').onclick=()=>changeZoom(zoom+.5);$('zoomOut').onclick=()=>changeZoom(zoom-.5);
 $('zoomPrev').onclick=()=>{setPhoto(activePhoto-1);loadZoomPhoto();};$('zoomNext').onclick=()=>{setPhoto(activePhoto+1);loadZoomPhoto();};
 $('zoomDialog').addEventListener('close',()=>{points.clear();lastTap=null;tapStart=null;comparisonZoom=null;});window.addEventListener('resize',()=>{if($('zoomDialog').open)paintZoom();});
}
function buildMessage(ids=lot){
 const cards=ids.map(id=>cardMap.get(id)).filter(Boolean);
 const subtotal=cards.reduce((sum,c)=>sum+c.price,0);
 const lines=cards.map(c=>`• [${c.id.toUpperCase()}] ${buyerCardLabel(c)} | ${c.set} | ${c.condition} | ${money(c.price)}`);
 return `Hi! I'm interested in these cards from The Binder:\n\n${lines.join('\n')}\n\nListed subtotal: ${money(subtotal)}${note.trim()?'\n\nNote: '+note.trim():''}\n\nPlease confirm availability, shipping cost and the final total. Thanks!`;
}
function renderLot(){
 const previousScroll=$('lotDialog').querySelector('.lot-body')?.scrollTop||0;
 document.body.appendChild($('toast'));
 const d=$('lotDialog');d.innerHTML=dialogHeader('<span id="lotTitle">Your lot</span>');
 if(!lot.length){d.innerHTML+='<div class="lot-body empty"><h2>A good lot starts with one card.</h2><p>Add cards from the binder. Your picks will appear here.</p><button class="primary" data-close>Keep browsing</button></div>';return;}
 d.innerHTML+=`<div class="lot-body"><p class="small">${storageAvailable?'Your lot and favorites stay saved when you return in this browser.':'Browser storage unavailable. Keep this tab open or copy your message.'} Cards are not reserved until confirmed.</p><div>${lot.map(id=>{const c=cardMap.get(id);return `<div class="lot-row"><img ${browseImageAttributes(c.thumb)} alt=""><button class="lot-card" data-lot-card="${id}"><strong>${esc(buyerCardLabel(c))}</strong><span>${esc(baseSetName(c.set))} · ${esc(cardNumber(c))}</span><span>${esc(c.condition)} · ${id.toUpperCase()}</span></button><span class="lot-row-price">${money(c.price)}</span><button class="remove" data-remove="${id}" aria-label="Remove ${esc(buyerCardLabel(c))} from lot">×</button></div>`;}).join('')}</div><div class="lot-summary"><span>Listed subtotal</span><span>${money(total())}</span></div><div class="lot-form"><label>Questions or photo requests? (optional)<textarea id="noteInput" maxlength="1000" placeholder="Extra photos, condition questions, shipping…">${esc(note)}</textarea></label><p class="small">We’ll confirm availability, shipping, and your final total in DMs.</p></div><details class="message-preview"><summary>Preview your message</summary><textarea id="lotMessage" aria-label="Your lot message" readonly></textarea></details><div class="lot-buttons"><button id="copyMessage" class="primary">1. Copy lot message</button><button id="openInstagram" class="quiet">2. Open Instagram ↗</button></div><p class="lot-status" id="lotStatus" role="status">Copy your message. Open Instagram, tap Message on @pokemonhooper’s profile, then paste and send.</p><div class="lot-buttons"><button class="text-button" id="shareLot">Copy lot link</button><button class="text-button" id="clearLot">Clear lot</button><button class="text-button" data-close>Keep browsing</button></div></div>`;
 const footer=document.createElement('div');footer.className='lot-footer';footer.append($('copyMessage').parentElement,$('lotStatus'));d.appendChild(footer);
 const changes=lot.filter(id=>lotPriceChanges.has(id));
 if(changes.length){const notice=document.createElement('p');notice.className='lot-price-notice';notice.setAttribute('role','alert');notice.textContent='Price changed — please review before copying: '+changes.map(id=>{const change=lotPriceChanges.get(id);return buyerCardLabel(cardMap.get(id))+': '+money(change.before)+' → '+money(change.after);}).join('; ');d.querySelector('.lot-summary').before(notice);}
 d.querySelector('.lot-body').scrollTop=previousScroll;
 $('lotMessage').value=buildMessage();
 $('noteInput').oninput=()=>{note=$('noteInput').value;persist();$('lotMessage').value=buildMessage();$('lotStatus').textContent='Message updated. Copy it again before sending.';};
 $('copyMessage').onclick=async()=>{const message=buildMessage(),ok=await copyText(message);if(message!==buildMessage()){$('lotStatus').textContent='Message updated. Copy it again before sending.';return;}$('lotStatus').textContent=ok?'Copied! Open Instagram → tap Message → paste and send. Your request has not been sent yet.':'Copy was blocked. Select and copy the message in the preview above.';if(!ok){$('lotMessage').closest('details').open=true;$('lotMessage').focus();$('lotMessage').select();}};
 $('openInstagram').onclick=()=>window.open('https://instagram.com/pokemonhooper','_blank','noopener');
 $('shareLot').onclick=()=>shareSelection('lot',lot.join(','));
 $('clearLot').onclick=()=>{if(!window.confirm('Remove all cards from your lot?'))return;lot=[];note='';persist();renderGrid();refreshLot();renderLot();toast('Lot cleared');};
}
function openLot(){renderLot();openDialog($('lotDialog'));}
async function copyText(text){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch{}
 const box=document.createElement('textarea');box.value=text;box.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
 const previousFocus=document.activeElement;
 (topDialog()||document.body).appendChild(box);box.focus();box.select();let ok=false;try{ok=document.execCommand('copy');}catch{}box.remove();previousFocus?.focus({preventScroll:true});return ok;
}
async function shareSelection(key,value){
 if(!/^https?:$/.test(location.protocol)){toast('Share links work after the site is hosted. For now, copy the card or lot message.');return;}
 const url=new URL(location.href);url.hash=new URLSearchParams({[key]:value}).toString();
 if(await copyText(url.href)){toast(key==='lot'?'Lot link copied · recipients review before adding':'Card link copied');return;}
 document.body.appendChild($('toast'));
 $('infoDialog').innerHTML=dialogHeader('<span id="infoTitle">Copy this link</span>')+`<div class="info-body"><p>Your browser blocked automatic copying. Select and copy the link below.</p><textarea aria-label="Share link" readonly>${esc(url.href)}</textarea></div>`;openDialog($('infoDialog'));
}
function showAbout(){
 document.body.appendChild($('toast'));
 $('infoDialog').innerHTML=dialogHeader('<span id="infoTitle">Buying from PokémonHooper</span>')+`<div class="info-body"><h3>Your next pickup, in three steps</h3><ol class="buy-steps"><li><strong>Find your cards.</strong><span>Swipe through the original photos, zoom into the details, and ask for another angle if you need one.</span></li><li><strong>Build your lot.</strong><span>Add your picks. Save favorites if you want to think about them. Add any questions or photo requests to your lot.</span></li><li><strong>Let’s make a deal.</strong><span>Copy your message, open @pokemonhooper on Instagram, tap Message, then paste and send. We’ll confirm the cards and final total there.</span></li></ol><h3>Shipping &amp; payment</h3><p>The seller covers the packing slip and ships within 2 business days via USPS Priority. Confirm shipping cost, the final total and payment details in DMs. Preferred payment options: Zelle, Venmo or PayPal.</p><p>Adding cards to a lot does not reserve them. Availability and prices are subject to change.</p><h3>Check buyer feedback</h3><p>See current reviews and past transactions on the seller's profiles.</p><div class="review-links"><a href="https://ebay.io/m/OLaYJ3" target="_blank" rel="noopener">eBay ↗</a><a href="https://www.whatnot.com/s/9KcMav5T" target="_blank" rel="noopener">Whatnot ↗</a><a href="https://www.instagram.com/pokemonhooper" target="_blank" rel="noopener">Instagram ↗</a><a href="https://www.facebook.com/marketplace/profile/100020652287786/?ref=permalink&mibextid=6ojiHh" target="_blank" rel="noopener">Facebook Marketplace ↗</a></div></div>`;openDialog($('infoDialog'));
}
function showInquiry(c){
 const message=`Hi! Could I get a closer condition check for [${c.id.toUpperCase()}] ${buyerCardLabel(c)} (${c.set}) — ${c.condition}, listed at ${money(c.price)}? I'd love clear front/back photos and angled shots of the corners, edges and holo surface, plus any flaws to be aware of. Thanks!`;
 document.body.appendChild($('toast'));
 $('infoDialog').innerHTML=dialogHeader('<span id="infoTitle">Ask for a closer look</span>')+`<div class="info-body"><p>Copy this request. Open Instagram, tap Message on @pokemonhooper’s profile, then paste and send.</p><textarea id="inquiryText" rows="7" aria-label="Condition inquiry" readonly>${esc(message)}</textarea><div class="lot-buttons"><button id="copyInquiry" class="primary">Copy request</button><button id="inquiryInstagram">Open Instagram ↗</button></div><p id="inquiryStatus" role="status"></p></div>`;openDialog($('infoDialog'));
 $('copyInquiry').onclick=async()=>{$('inquiryStatus').textContent=await copyText(message)?'Copied. Open Instagram → tap Message → paste and send.':'Select and copy the text above; automatic copying was blocked.';};$('inquiryInstagram').onclick=()=>window.open('https://instagram.com/pokemonhooper','_blank','noopener');
}
function readSharedLink(){
 const params=new URLSearchParams(location.hash.slice(1));
 if(params.has('card')){const c=cardMap.get(params.get('card'));if(c)openCard(c.id);else toast('That card link is no longer in this catalog.');return;}
 if(params.has('lot')){
  const requested=[...new Set(params.get('lot').split(','))].slice(0,500), ids=validIds(requested,true), skipped=requested.length-ids.length;
  document.body.appendChild($('toast'));
 $('infoDialog').innerHTML=dialogHeader('<span id="infoTitle">A lot worth a look</span>')+`<div class="info-body"><p>This shared lot has ${ids.length} available card${ids.length===1?'':'s'}.</p>${skipped?`<p>${skipped} sold or unknown listing${skipped===1?' was':'s were'} left out.</p>`:''}${ids.map(id=>{const c=cardMap.get(id);return `<p><strong>${esc(buyerCardLabel(c))}</strong><br>${esc(c.condition)} · ${money(c.price)} · ${id.toUpperCase()}</p>`;}).join('')}<button id="importLot" class="primary" ${!ids.length?'disabled':''}>Add these cards to my lot</button><p class="small">Your existing picks will be kept. Prices reflect this catalog's current listings.</p></div>`;openDialog($('infoDialog'));
  $('importLot').onclick=()=>{lot=[...new Set([...lot,...ids])];persist();renderGrid();refreshLot();closeDialog($('infoDialog'));openLot();};
 }
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-close')){closeDialog(b.closest('dialog'));return;}
 if(b.dataset.action==='open')openCard(b.dataset.id);
 if(b.dataset.action==='lot')selectForLot(b.dataset.id);
 if(b.dataset.action==='favorite')toggleFavorite(b.dataset.id);
 if(b.dataset.action==='reset'){favoritesView=false;showAvailableOnly=true;resetFilters();}
 if(b.dataset.action==='clear-filters')resetFilters();
 if(b.dataset.clear){$(b.dataset.clear).value='all';renderGrid();}
 if(b.dataset.photo!==undefined)setPhoto(Number(b.dataset.photo));
 if(b.dataset.copy)openCard(b.dataset.copy);
 if(b.dataset.remove){toggleLot(b.dataset.remove);$('lotDialog').querySelector('[data-remove], [data-close]')?.focus();}
 if(b.dataset.lotCard){if($('compareDialog').open)closeDialog($('compareDialog'));closeDialog($('lotDialog'),()=>openCard(b.dataset.lotCard));}
});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){e.target.alt='Photo unavailable — ask the seller for this angle';e.target.classList.add('load-error');}},true);
document.querySelectorAll('dialog').forEach(d=>{
 d.addEventListener('close',()=>{dialogHistory.closed(d);restoreDialogPosition(d);});
 d.addEventListener('cancel',e=>{if(historyDialogs.has(d)){e.preventDefault();closeDialog(d);}});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});
});
document.addEventListener('keydown',e=>{if(!$('cardDialog').open||$('infoDialog').open||$('zoomDialog').open||$('lotDialog').open||$('compareDialog').open||$('conditionPickerDialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();setPhoto(activePhoto-1);}if(e.key==='ArrowRight'){e.preventDefault();setPhoto(activePhoto+1);}});
setupZoom();
$('refineToggle').onclick=()=>{const open=$('refineToggle').getAttribute('aria-expanded')!=='true';$('refineToggle').setAttribute('aria-expanded',String(open));$('advancedFilters').classList.toggle('expanded',open);};
$('availableCount').textContent=CARDS.filter(c=>!c.sold).length;
[...new Set(CARDS.map(c=>baseSetName(c.set)))].sort().forEach(set=>{const option=document.createElement('option');option.value=set;option.textContent=set;$('setFilter').appendChild(option);});
let searchTimer;$('searchInput').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderGrid,120);};['setFilter','budgetFilter','sortSelect'].forEach(id=>$(id).onchange=renderGrid);
$('availableTabCount').textContent=CARDS.filter(c=>!c.sold).length;$('soldTabCount').textContent=CARDS.filter(c=>c.sold).length;
$('availableTab').onclick=()=>{favoritesView=false;showAvailableOnly=true;renderGrid();};$('soldTab').onclick=()=>{favoritesView=false;showAvailableOnly=false;renderGrid();};$('favoritesTab').onclick=()=>{favoritesView=true;renderGrid();};
document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{quick=quick===b.dataset.quick?'':b.dataset.quick;renderGrid();});
$('clearRecent').onclick=()=>{recent=[];persist();renderRecent();$('resultCount').setAttribute('tabindex','-1');$('resultCount').focus({preventScroll:true});toast('Recent history cleared');};
$('resetBtn').onclick=resetFilters;$('aboutBtn').onclick=showAbout;$('headerLot').onclick=openLot;$('reviewLot').onclick=openLot;
$('surpriseBtn').onclick=()=>{const available=displayed.filter(c=>!c.sold);if(available.length)openCard(available[Math.floor(Math.random()*available.length)].id);};
window.addEventListener('hashchange',readSharedLink);
window.addEventListener('resize',()=>{const reel=$('photoReel');if(reel&&$('cardDialog').open)reel.scrollTo({left:activePhoto*reel.clientWidth,behavior:'instant'});});
persist();renderGrid();renderRecent();refreshLot();readSharedLink();

setupBinderTools();
