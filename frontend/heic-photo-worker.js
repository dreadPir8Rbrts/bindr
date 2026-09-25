/* Conversion is isolated so a slow or unsupported HEIC can be stopped. */
importScripts('photo-preparation.js');
onmessage=async event=>{
 let bitmap;
 try{
  const {heicTo}=await import('./vendor/heic-to-next.js');
  bitmap=await heicTo({blob:event.data.file,type:'bitmap'});
  const result=await BinderPhotoPreparation.encodePhoto(bitmap,bitmap.width,bitmap.height,(w,h)=>new OffscreenCanvas(w,h));
  postMessage({result});
 }catch{postMessage({error:'This HEIC photo could not be converted on this device. Try choosing it again from Photos, or export a JPEG.'});}
 finally{bitmap?.close();}
};
