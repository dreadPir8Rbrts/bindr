/* Photo preparation only: no cropping, sharpening, smoothing or generated pixels. */
(function(root){
 'use strict';
 const MAX_BYTES=3*1024*1024,MAX_ORIGINAL_BYTES=30*1024*1024,MAX_EDGE=3072;
 function fitPhoto(width,height,maxEdge=MAX_EDGE){if(!(width>0&&height>0))throw Error('This photo has no readable dimensions.');const scale=Math.min(1,maxEdge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
 async function photoKind(file){const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';if(ascii(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(ascii(8,64)))return 'image/heic';throw Error('Choose a JPEG, PNG, WebP or HEIC photo. Videos and RAW files are not supported.');}
 async function encodePhoto(source,width,height,makeCanvas){
  let size=fitPhoto(width,height);
  const canvas=makeCanvas(size.width,size.height);
  try{
   for(let attempt=0;attempt<4;attempt++){
    canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Not enough memory to prepare this photo. Try a smaller original.');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(source,0,0,size.width,size.height);
    for(const quality of [0.94,0.9,0.86,0.82]){
     const blob=canvas.convertToBlob?await canvas.convertToBlob({type:'image/jpeg',quality}):await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare this photo. Try a smaller original.')),'image/jpeg',quality));
     if(blob.size>0&&blob.size<=MAX_BYTES)return {blob,width:size.width,height:size.height,quality};
    }
    size=fitPhoto(size.width,size.height,Math.floor(Math.max(size.width,size.height)*0.85));
   }
   throw Error('This photo is still too large. Try a smaller version or a close-up of the card.');
  }finally{canvas.width=1;canvas.height=1;}
 }
 root.BinderPhotoPreparation={MAX_BYTES,MAX_ORIGINAL_BYTES,MAX_EDGE,fitPhoto,photoKind,encodePhoto};
})(globalThis);

