'use strict';
// Photos go straight to S3 with presigned POSTs: the API issues the ticket, then confirms
// the upload before the photo can be used in a listing. Each photo gets a 480px thumbnail
// for the buyer's binder grid.
function postToStorage(target,blob,onProgress){return new Promise((resolve,reject)=>{
 const form=new FormData();for(const [name,value] of Object.entries(target.fields))form.append(name,value);form.append('file',blob);
 const xhr=new XMLHttpRequest();xhr.open('POST',target.url);xhr.timeout=90000;
 xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.min(99,Math.round(e.loaded/e.total*100)));};
 xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error(xhr.status===400||xhr.status===403?'Photo storage refused this file. Retry this photo.':'Upload connection lost. Retry this photo.'));
 xhr.onerror=()=>reject(Error('Upload connection lost. Retry this photo.'));xhr.ontimeout=()=>reject(Error('Upload timed out. Check your connection and retry this photo.'));xhr.send(form);
});}
async function makeThumbnail(blob){const img=await readPhotoImage(blob);try{const size=BinderPhotoPreparation.fitPhoto(img.width,img.height,480),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(img.source,0,0,size.width,size.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare the photo preview.')),'image/jpeg',0.8));}finally{img.close();}}
async function uploadSellerPhoto(blob,onProgress,api=sellerAPI){
 const thumb=await makeThumbnail(blob),json={'Content-Type':'application/json'};
 const ticket=await api('photos/uploads',{method:'POST',headers:json,body:JSON.stringify({contentType:blob.type,bytes:blob.size,thumbBytes:thumb.size})});
 await postToStorage(ticket.thumbUpload,thumb,()=>{});await postToStorage(ticket.upload,blob,onProgress);onProgress(99);
 return api('photos/confirm',{method:'POST',headers:json,body:JSON.stringify({key:ticket.key})});
}
function readPhotoImage(blob){return new Promise((resolve,reject)=>{
 const url=URL.createObjectURL(blob),img=new Image();let finished=false;
 const timer=setTimeout(()=>finish(false),25000);
 function finish(ok){if(finished)return;finished=true;clearTimeout(timer);URL.revokeObjectURL(url);if(ok)resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,close(){img.src='';}});else{img.src='';reject(Error('Photo could not be read.'));}}
 img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=url;
});}
function convertHeicPhoto(file){return new Promise((resolve,reject)=>{
 let worker;const timer=setTimeout(()=>end(Error('HEIC conversion took too long. Try a smaller photo or export a JPEG.')),90000);
 function end(error,result){clearTimeout(timer);worker?.terminate();error?reject(error):resolve(result);}
 try{worker=new Worker('heic-photo-worker.js');worker.onmessage=e=>e.data.error?end(Error(e.data.error)):end(null,e.data.result);worker.onerror=()=>end(Error('HEIC conversion is unavailable on this device. Choose the photo from Photos again, or export a JPEG.'));worker.postMessage({file});}catch{end(Error('HEIC conversion is unavailable on this device. Try a JPEG.'));}
});}
async function prepareSellerPhoto(file,onStage=()=>{}){
 const rules=BinderPhotoPreparation;
 if(!file.size)throw Error('This file is empty. Choose the photo again.');
 if(file.size>rules.MAX_ORIGINAL_BYTES)throw Error('Choose an original under 30 MB. Export a smaller copy from Photos.');
 const kind=await rules.photoKind(file);onStage(kind==='image/heic'?'Preparing HEIC…':'Preparing photo…');
 let decoded;
 try{decoded=await readPhotoImage(file);}catch(e){if(kind!=='image/heic')throw Error('This photo could not be read. Try another copy from Photos.');onStage('Converting HEIC…');return convertHeicPhoto(file);}
 try{
  // Keep small supported originals intact; larger photos are fitted without cropping.
  if(kind!=='image/heic'&&file.size<=rules.MAX_BYTES&&Math.max(decoded.width,decoded.height)<=4096)return {blob:file.slice(0,file.size,kind),width:decoded.width,height:decoded.height,original:true};
  onStage(kind==='image/heic'?'Converting HEIC…':'Resizing photo…');
  return await rules.encodePhoto(decoded.source,decoded.width,decoded.height,(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
 }finally{decoded.close();}
}
async function scanJpeg(blob){const img=await readPhotoImage(blob);try{const size=BinderPhotoPreparation.fitPhoto(img.width,img.height,800),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(img.source,0,0,size.width,size.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare this photo for scanning.')),'image/jpeg',0.7));}finally{img.close();}}
