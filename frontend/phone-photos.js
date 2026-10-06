'use strict';
// One queue belongs to the open listing. Successful uploads are never retried.
let sellerUploadQueue=[],sellerUploading=false,uploadSerial=0;
function renderUploadQueue(){
 const done=sellerUploadQueue.filter(x=>x.state==='done').length,failed=sellerUploadQueue.filter(x=>x.state==='failed').length;
 sellerEl('uploadSummary').textContent=sellerUploadQueue.length?`${done} of ${sellerUploadQueue.length} photos added${failed?` · ${failed} need attention`:''}${sellerUploading?' · Keep this page open.':done?' · Save the listing to publish.':''}`:'';
 sellerEl('uploadQueue').innerHTML=sellerUploadQueue.map(x=>`<li class="upload-item ${x.state}"><div class="upload-item-copy"><strong>${sellerEsc(x.name)}</strong><span>${sellerEsc(x.message)}</span>${x.state==='uploading'?`<progress max="100" value="${x.percent}" aria-label="Uploading ${sellerEsc(x.name)}"></progress>`:''}</div>${x.state==='done'?'<span class="upload-done" aria-label="Added">✓</span>':x.state==='failed'?`<div class="upload-item-actions"><button type="button" data-retry-upload="${x.id}" ${sellerUploading?'disabled':''}>Retry</button><button type="button" data-remove-upload="${x.id}" ${sellerUploading?'disabled':''}>Remove</button></div>`:''}</li>`).join('');
 sellerEl('retryUploads').hidden=!failed;sellerEl('retryUploads').disabled=sellerUploading;
 sellerEl('clearUploadResults').hidden=!done;sellerEl('clearUploadResults').disabled=sellerUploading;
}
function resetSellerUploads(){sellerUploadQueue=[];sellerEl('sellerUpload').value='';sellerEl('sellerCamera').value='';sellerEl('uploadSelectionNote').textContent='';renderUploadQueue();}
function confirmPartialUploadSave(){const failed=sellerUploadQueue.filter(x=>x.state==='failed').length;return !failed||confirm(`${failed} photo${failed===1?' has':'s have'} not uploaded. Save this listing with only the successfully added photos?`);}
async function processSellerUploads(){
 if(sellerUploading||onlineBusy)return;
 if(!sellerSignedIn){sellerMessage('Sign in again, then retry your photos.');return;}
 sellerUploading=true;setOnlineBusy(true);sellerEl('sellerDraftCount').textContent='Uploading photos…';
 try{
  for(const item of sellerUploadQueue){
   if(item.state!=='queued')continue;
   try{
    if(!sellerSignedIn)throw Error('Sign in again, then retry this photo.');
    if(workingPhotos.length>=20)throw Error('This listing already has 20 photos. Remove a listing photo before retrying.');
    item.state='preparing';item.message='Preparing photo…';renderUploadQueue();
    const prepared=item.prepared||await prepareSellerPhoto(item.file,stage=>{item.message=stage;renderUploadQueue();});item.prepared=prepared;
    item.state='uploading';item.message='Uploading…';item.percent=0;renderUploadQueue();
    const data=await uploadSellerPhoto(prepared.blob,percent=>{item.percent=percent;item.message=percent>=99?'Confirming upload…':`Uploading ${percent}%`;renderUploadQueue();});
    if(typeof data.url!=='string')throw Error('Upload was not confirmed. Retry this photo.');
    workingPhotos.push(data.url);workingRoles.push('');try{const frame=await suggestPhotoFrame(prepared.blob);if(frame)workingFrames[data.url]=frame;}catch{}dirty=true;
    item.state='done';item.message=`Added · ${prepared.width} × ${prepared.height}${prepared.original?' · Original file':' · Prepared for upload'}`;item.message+=workingFrames[data.url]?' · Frame suggested; check edges':' · Use Frame photo to adjust';item.file=null;item.prepared=null;renderUploadQueue();if(typeof saveSellerDraft==='function')await saveSellerDraft();
   }catch(e){item.state='failed';item.message=e.message||'Could not upload. Try this photo again.';renderUploadQueue();}
  }
 }finally{if(typeof saveSellerDraft==='function')await saveSellerDraft();sellerUploading=false;renderSellerPhotos();setOnlineBusy(false);renderUploadQueue();sellerMessage('Photo batch finished. Review the photos below and save the listing when ready.');}
}
async function queueSellerPhotos(files){
 if(onlineBusy||sellerUploading)return;
 const remaining=Math.max(0,20-workingPhotos.length-sellerUploadQueue.filter(x=>x.state!=='done').length),chosen=[...files].slice(0,remaining);
 for(const file of chosen)sellerUploadQueue.push({id:++uploadSerial,file,name:file.name||'Camera photo',state:'queued',message:'Waiting…'});
 sellerEl('uploadSelectionNote').textContent=files.length>remaining?`${chosen.length} selected for upload. ${files.length-chosen.length} extra selections were not added because this listing has a 20-photo limit. Remove unwanted photos to make room.`:'';
 if(chosen.length){dirty=true;renderUploadQueue();if(typeof saveSellerDraft==='function')await saveSellerDraft();processSellerUploads();}
}
sellerEl('sellerUpload').onchange=e=>{const files=[...e.target.files];e.target.value='';queueSellerPhotos(files);};
sellerEl('sellerCamera').onchange=e=>{const files=[...e.target.files];e.target.value='';queueSellerPhotos(files);};
sellerEl('retryUploads').onclick=()=>{if(onlineBusy)return;sellerUploadQueue.forEach(x=>{if(x.state==='failed'){x.state='queued';x.message='Waiting to retry…';}});processSellerUploads();};
sellerEl('clearUploadResults').onclick=()=>{if(onlineBusy)return;sellerUploadQueue=sellerUploadQueue.filter(x=>x.state!=='done');renderUploadQueue();};
sellerEl('uploadQueue').onclick=e=>{if(onlineBusy)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.retryUpload){const item=sellerUploadQueue.find(x=>x.id===Number(b.dataset.retryUpload));if(item&&item.state==='failed'){item.state='queued';processSellerUploads();}}if(b.dataset.removeUpload){sellerUploadQueue=sellerUploadQueue.filter(x=>x.id!==Number(b.dataset.removeUpload));renderUploadQueue();}};
const loadCardBeforeUploads=loadSellerCard;
loadSellerCard=function(id){loadCardBeforeUploads(id);resetSellerUploads();};
sellerEl('sellerTools').addEventListener('click',e=>{if(e.target.closest('button'))sellerEl('sellerTools').open=false;});
