'use strict';
let liveRevision=null,liveRefreshing=false;
async function fetchLiveInventory(){const response=await fetch('/.netlify/functions/binder-api?resource=inventory',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Inventory unavailable');return response.json();}
function liveStatus(text){document.getElementById('liveStatus').textContent=text;}
async function refreshLiveBinder(){
 if(liveRefreshing||document.hidden)return;liveRefreshing=true;
 try{const data=await fetchLiveInventory();if(data.revision!==liveRevision){
  const oldCard=activeCard&&JSON.stringify(activeCard),oldLot=lot.length;
  for(const id of lot){const previous=cardMap.get(id),updated=data.cards.find(card=>card.id===id);if(previous&&updated&&!updated.sold&&previous.price!==updated.price)lotPriceChanges.set(id,{before:lotPriceChanges.get(id)?.before??previous.price,after:updated.price});}
  if(data.appearance)applyBinderAppearance(data.appearance);CARDS.splice(0,CARDS.length,...data.cards);cardMap.clear();CARDS.forEach(c=>cardMap.set(c.id,c));lot=validIds(lot,true);favorites=validIds(favorites);recent=validIds(recent);persist();
  if(activeCard&&oldCard!==JSON.stringify(cardMap.get(activeCard.id))){if($('zoomDialog').open)closeDialog($('zoomDialog'));if($('cardDialog').open)closeDialog($('cardDialog'));activeCard=null;toast('A listing changed. Reopen it to see the latest details.');}
  if($('compareDialog').open){const current=cardMap.get(comparisonId);if(!current||current.sold){closeDialog($('compareDialog'));toast('This copy is no longer available.');}else{comparisonIds=CARDS.filter(x=>!x.sold&&samePrinting(current,x)).map(x=>x.id);renderComparison();}}
  const selectedSet=$('setFilter').value;$('setFilter').innerHTML='<option value="all">All sets</option>'+[...new Set(CARDS.map(c=>baseSetName(c.set)))].sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('setFilter').value=[...CARDS.map(c=>baseSetName(c.set)),'all'].includes(selectedSet)?selectedSet:'all';
  $('availableCount').textContent=$('availableTabCount').textContent=CARDS.filter(c=>!c.sold).length;$('soldTabCount').textContent=CARDS.filter(c=>c.sold).length;
  renderGrid();renderRecent();refreshLot();if($('lotDialog').open)renderLot();if(oldLot>lot.length)toast('A card in your lot is no longer available and was removed.');liveRevision=data.revision;
 }liveStatus('');}catch{liveStatus('Live availability could not refresh. Please confirm availability with the seller.');}finally{liveRefreshing=false;}
}
(async()=>{try{const data=await fetchLiveInventory();if(data.appearance)applyBinderAppearance(data.appearance);CARDS.splice(0,CARDS.length,...data.cards);liveRevision=data.revision;const script=document.createElement('script');script.src='app.js';script.onload=()=>{const budget=document.createElement('script');budget.src='budget-picker.js';document.body.appendChild(budget);liveStatus('');setInterval(refreshLiveBinder,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLiveBinder();});};script.onerror=()=>liveStatus('The binder could not load. Refresh to try again.');document.body.appendChild(script);}catch{document.getElementById('liveStatus').innerHTML='Live inventory is unavailable. <button onclick="location.reload()">Try again</button>';document.getElementById('binderGrid').innerHTML='<div class="empty"><h2>We couldn’t load the binder.</h2><p>Please try again shortly. The seller may still be finishing setup.</p></div>';}})();
