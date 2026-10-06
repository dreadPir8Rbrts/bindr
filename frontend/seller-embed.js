'use strict';
// Run the existing seller editors in an isolated same-origin document.
(()=>{
 const params=new URLSearchParams(location.search);
 if(params.get('embed')!=='storefront'||window.parent===window)return;
 document.body.classList.add('seller-embedded');
 const send=(type,extra={})=>parent.postMessage({type,...extra},location.origin);
 let started=false;
 const start=()=>{
  if(started||!sellerSignedIn||sellerEl('onlineSellerMain').hidden)return;
  started=true;
  const action=params.get('action'),id=params.get('id');
  if(action==='new'||action==='scan'){sellerEl('newListing').click();if(action==='scan')sellerEl('guidedEditor').dispatchEvent(new Event('scan-entry'));}
  else if(action==='resume'){
   const button=Array.from(document.querySelectorAll('[data-resume]')).find(b=>b.dataset.resume===id);
   if(button)button.click();else send('bindr-editor-closed');
  }else if(action==='edit'&&inventory.some(c=>c.id===id&&c.status!=='draft'))openSellerEditor(id);
  else send('bindr-editor-closed');
 };
 new MutationObserver(start).observe(sellerEl('onlineSellerMain'),{attributes:true,attributeFilter:['hidden']});start();
 for(const id of ['sellerEditor','guidedEditor'])sellerEl(id).addEventListener('close',()=>send('bindr-editor-closed'));
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='bindr-editor-request-close')return;
  if(sellerEl('reauthDialog').open)return; // Keep unsaved edits alive while signing in again.
  if(sellerEl('guidedEditor').open)sellerEl('guidedEditor').dispatchEvent(new Event('cancel',{cancelable:true}));
  else if(sellerEl('sellerEditor').open)closeSellerEditor();
  else send('bindr-editor-closed');
 });
 sellerEl('guidedView').onclick=e=>{e.preventDefault();const id=new URL(e.currentTarget.href).hash.slice(6);send('bindr-editor-view',{id});};
})();
