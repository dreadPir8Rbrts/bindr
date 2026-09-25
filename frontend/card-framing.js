'use strict';
function detectCard(ctx,w,h){
 const data=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),candidates=[];
 for(let i=0;i<mask.length;i++){const r=data[i*4],g=data[i*4+1],b=data[i*4+2];mask[i]=(r>105&&g>90&&b<Math.min(r,g)*.76&&Math.abs(r-g)<100)||(b>75&&b>r*1.22&&b>g*1.08)?1:0;}
 for(let i=0;i<mask.length;i++){if(!mask[i]||seen[i])continue;const queue=[i];seen[i]=1;let n=0,l=w,t=h,r=0,b=0;for(let k=0;k<queue.length;k++){const j=queue[k],x=j%w,y=Math.floor(j/w);n++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(const v of [x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(v>=0&&mask[v]&&!seen[v]){seen[v]=1;queue.push(v);}}
 const bw=r-l,bh=b-t,area=bw*bh,ratio=bw/bh;if(area>w*h*.16&&area<w*h*.95&&ratio>.48&&ratio<.95&&n/area>.025)candidates.push({x:l,y:t,w:bw,h:bh,area});}
 candidates.sort((a,b)=>b.area-a.area);if(!candidates.length||(candidates[1]&&candidates[1].area>candidates[0].area*.65))return null;return candidates[0];
}

function paddedCardFrame(box,width,height,margin=.08){
 let w=box.w*(1+margin*2),h=box.h*(1+margin*2);
 if(w/h<.72)w=h*.72;else h=w/.72;
 const scale=Math.min(1,width/w,height/h);w*=scale;h*=scale;
 return {x:Math.max(0,Math.min(width-w,box.x+box.w/2-w/2))/width,y:Math.max(0,Math.min(height-h,box.y+box.h/2-h/2))/height,w:w/width,h:h/height};
}
function frameStyle(f){return f&&f.w>0&&f.h>0?`--crop-width:${100/f.w}%;--crop-height:${100/f.h}%;--crop-left:${-100*f.x/f.w}%;--crop-top:${-100*f.y/f.h}%`:'';}
function cardFrameStyle(card){return frameStyle(card.photoFrames?.[card.photos?.[0]]);}
async function suggestPhotoFrame(blob){
 const decoded=await readPhotoImage(blob);
 try{const canvas=document.createElement('canvas'),scale=Math.min(1,480/decoded.width,640/decoded.height);canvas.width=Math.round(decoded.width*scale);canvas.height=Math.round(decoded.height*scale);const ctx=canvas.getContext('2d');ctx.drawImage(decoded.source,0,0,canvas.width,canvas.height);const box=detectCard(ctx,canvas.width,canvas.height);return box?paddedCardFrame(box,canvas.width,canvas.height):null;}finally{decoded.close();}
}
