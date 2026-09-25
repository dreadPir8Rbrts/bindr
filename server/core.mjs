import { createHash, createHmac, timingSafeEqual, randomUUID, randomBytes, scryptSync } from 'node:crypto';
const cookieName='binder_session';
const digest=s=>createHash('sha256').update(String(s)).digest();
export const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function sessionToken(password,now=Date.now()){const payload=Buffer.from(JSON.stringify({exp:now+8*3600000,nonce:randomUUID()})).toString('base64url');return payload+'.'+createHmac('sha256',password).update(payload).digest('base64url');}
export function authorized(req,password,now=Date.now()){try{if(!password||password.length<16)return false;const token=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token)return false;const [p,s,...extra]=token.split('.');if(extra.length||!p||!s)return false;const expected=createHmac('sha256',password).update(p).digest('base64url');return timingSafeEqual(digest(s),digest(expected))&&JSON.parse(Buffer.from(p,'base64url').toString()).exp>now;}catch{return false;}}
const cookie=(value,age)=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const roles=['','front','back','detail'];
const conditions=['Near Mint+','Near Mint','Near Mint-','Lightly Played+','Lightly Played','Lightly Played-','Moderately Played'];
export function normalizeCardMetadata(card){
 if(card.id==='c44'&&/^Magikarp\b/.test(card.name)&&card.set.includes('Deoxys')&&card.set.includes('65/107'))return {...card,set:card.set.replace('65/107','64/107'),number:'64/107'};
 return card;
}
export function cleanFrames(frames,photos){
 if(!frames||typeof frames!=='object'||Array.isArray(frames))throw Error('Invalid photo framing.');
 const result={};
 for(const [url,f] of Object.entries(frames)){
  if(!photos.includes(url))continue;
  if(!f||!['x','y','w','h'].every(k=>Number.isFinite(f[k]))||f.x<0||f.y<0||f.w<.05||f.h<.05||f.x+f.w>1.00001||f.y+f.h>1.00001)throw Error('Keep the frame inside the photo.');
  result[url]={x:f.x,y:f.y,w:f.w,h:f.h};
 }return result;
}
export function cleanAppearance(a){
 if(!a||!['olive','charcoal','oxblood','navy','mint','lavender','cream','retro'].includes(a.color)||!['modern','classic','soft'].includes(a.style)||typeof a.rings!=='boolean')throw Error('Choose a valid binder style.');
 return {color:a.color,style:a.style,rings:a.rings};
}
export function cleanCard(c){
 if(!c||!/^c\d+$/.test(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>300||typeof c.set!=='string'||!c.set.trim()||c.set.length>400||!conditions.includes(c.condition)||typeof c.sold!=='boolean'||!Number.isFinite(c.price)||c.price<=0||c.price>100000000)throw Error('Check the card name, set, condition, availability and price.');
 const path=p=>typeof p==='string'&&(/^(?:\.\/)?images\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(p)&&!p.includes('..')||/^\/\.netlify\/functions\/binder-api\?resource=photo&id=[a-f0-9-]{36}$/.test(p));
 if(!Array.isArray(c.photos)||!c.photos.length||c.photos.length>20||!c.photos.every(path)||!path(c.thumb))throw Error('Use 1–20 uploaded photos.');
 if(c.description!==undefined&&(typeof c.description!=='string'||c.description.length>20000))throw Error('Description is too long.');
 const photoRoles=c.photoRoles||c.photos.map(()=>'');if(!Array.isArray(photoRoles)||photoRoles.length!==c.photos.length||!photoRoles.every(r=>roles.includes(r))||['front','back'].some(r=>photoRoles.filter(x=>x===r).length>1))throw Error('Label at most one front and one back photo.');
 let ebayListings;
 if(c.ebayListings!==undefined){
  if(!Array.isArray(c.ebayListings)||c.ebayListings.length>20)throw Error('Use at most 20 eBay links per card.');
  ebayListings=c.ebayListings.map(x=>{
   if(!x||!/^\d{9,15}$/.test(x.itemId)||!['active','ended','sold','unknown'].includes(x.status)||typeof x.checkedAt!=='string'||!Number.isFinite(Date.parse(x.checkedAt)))throw Error('Check the eBay listing number, status and date.');
   return {itemId:x.itemId,status:x.status,checkedAt:new Date(x.checkedAt).toISOString()};
  });
  if(new Set(ebayListings.map(x=>x.itemId)).size!==ebayListings.length)throw Error('This eBay listing is linked twice.');
 }
 return {id:c.id,name:c.name.trim(),set:c.set.trim(),price:c.price,condition:c.condition,sold:c.sold,description:c.description||'',photos:c.photos,photoRoles,thumb:c.thumb,rare:!!c.rare,...(typeof c.number==='string'?{number:c.number}:{} ),...(ebayListings?{ebayListings}:{}),...(c.photoFrames!==undefined?{photoFrames:cleanFrames(c.photoFrames,c.photos)}:{})};
}
async function limitedBody(req,max){if(Number(req.headers.get('content-length'))>max)throw Error('Upload is too large.');const data=await req.arrayBuffer();if(data.byteLength>max)throw Error('Upload is too large.');return data;}
export function createHandler({getStore,seed,bootstrap=null,password=()=>process.env.BINDER_SETUP_KEY||process.env.BINDER_ADMIN_PASSWORD,scan=null}){
 const seedRevision=createHash('sha256').update(JSON.stringify(seed)).digest('hex');
 return async (req,context={})=>{try{
  const url=new URL(req.url),resource=url.searchParams.get('resource')||'inventory',ownerKey=password();
  if(!['GET','POST','PUT','DELETE'].includes(req.method))return json({error:'Method not allowed'},405);
  if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return json({error:'Request origin not allowed'},403);
  const accounts=getStore({name:'binder-owner',consistency:'strong'});
  const owner=await accounts.getWithMetadata('profile',{type:'json'});
  const profile=owner?.data,pw=profile?.sessionKey||(bootstrap ? bootstrap.rateKey : ownerKey);
  if(resource==='session'){
   if(req.method==='GET')return json({authenticated:!!profile&&authorized(req,pw),setupRequired:bootstrap?false:!profile,ownerKeyConfigured:!bootstrap&&!!ownerKey&&ownerKey.length>=16});
   if(!bootstrap&&!profile&&(!ownerKey||ownerKey.length<16))return json({error:'Add a one-time BINDER_SETUP_KEY in Netlify to verify ownership. Follow the steps on this page, then return here to create your password.'},503);
   if(req.method==='DELETE')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   const attempts=getStore({name:'binder-login-attempts',consistency:'strong'}),key=createHmac('sha256',pw).update(context.ip||'unknown').digest('hex');
   let accepted=false;
   for(let i=0;i<4;i++){const old=await attempts.getWithMetadata(key,{type:'json'}),now=Date.now(),v=old&&old.data.until>now?old.data:{count:0,until:now+900000};if(v.count>=10)return json({error:'Too many login attempts. Try again in 15 minutes.'},429);const result=await attempts.setJSON(key,{count:v.count+1,until:v.until},old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(result.modified){accepted=true;break;}}
   if(!accepted)return json({error:'Please retry shortly.'},429);
   let body;try{body=JSON.parse(Buffer.from(await limitedBody(req,4096)).toString());}catch{return json({error:'Invalid login request'},400);}
   if(bootstrap){
    if(body.action==='setup')return json({error:'Registration is closed.'},403);
    const validEmail=typeof body.email==='string'&&body.email.trim().toLowerCase()===bootstrap.email;
    const loginProfile=profile||bootstrap;
    if(typeof body.password!=='string'||body.password.length>256)return json({error:'Incorrect email or password.'},401);
    const matches=timingSafeEqual(scryptSync(body.password,loginProfile.salt,64),Buffer.from(loginProfile.passwordHash,'hex'));
    if(!validEmail||!matches)return json({error:'Incorrect email or password.'},401);
    if(!profile){
     if(body.action!=='activate')return json({changeRequired:true});
     if(typeof body.newPassword!=='string'||body.newPassword.length<16||body.newPassword.length>256||body.newPassword===body.password)return json({error:'Choose a different password between 16 and 256 characters.'},400);
     const salt=randomBytes(16).toString('hex'),sessionKey=randomBytes(32).toString('hex');
     const saved=await accounts.setJSON('profile',{email:bootstrap.email,salt,passwordHash:scryptSync(body.newPassword,salt,64).toString('hex'),sessionKey},{onlyIfNew:true});
     if(!saved.modified)return json({error:'Account already activated. Sign in with your chosen password.'},409);
     return json({authenticated:true},200,{'Set-Cookie':cookie(sessionToken(sessionKey),8*3600)});
    }
    return json({authenticated:true},200,{'Set-Cookie':cookie(sessionToken(pw),8*3600)});
   }
   if(body.action==='setup'){
    if(profile)return json({error:'Your seller account is already set up. Sign in instead.'},409);
    if(typeof body.ownerKey!=='string'||!timingSafeEqual(digest(body.ownerKey),digest(ownerKey)))return json({error:'The owner key does not match the value in Netlify.'},401);
    if(typeof body.password!=='string'||body.password.length<16||body.password.length>256)return json({error:'Choose a password between 16 and 256 characters.'},400);
    const salt=randomBytes(16).toString('hex'),sessionKey=randomBytes(32).toString('hex');
    const saved=await accounts.setJSON('profile',{salt,passwordHash:scryptSync(body.password,salt,64).toString('hex'),sessionKey},{onlyIfNew:true});
    if(!saved.modified)return json({error:'Setup was completed in another window. Sign in instead.'},409);
    return json({authenticated:true,setupRequired:false},200,{'Set-Cookie':cookie(sessionToken(sessionKey),8*3600)});
   }
   if(typeof body.password!=='string'||body.password.length>256)return json({error:'Incorrect password'},401);
   const matches=profile?timingSafeEqual(scryptSync(body.password,profile.salt,64),Buffer.from(profile.passwordHash,'hex')):timingSafeEqual(digest(body.password),digest(pw));
   if(!matches)return json({error:'Incorrect password'},401);
   return json({authenticated:true},200,{'Set-Cookie':cookie(sessionToken(pw),8*3600)});
  }
  const appearanceStore=getStore({name:'binder-appearance',consistency:'strong'});
  const appearanceRecord=await appearanceStore.getWithMetadata('current',{type:'json'});
  const appearance=appearanceRecord?.data||{color:'navy',style:'modern',rings:false,revision:'default'};
  if(resource==='appearance'){
   if(req.method==='GET')return json(appearance);
   if(req.method!=='PUT')return json({error:'Method not allowed'},405);
   if((bootstrap&&!profile)||!authorized(req,pw))return json({error:'Sign in to customize your binder.'},401);
   try{const body=JSON.parse(Buffer.from(await limitedBody(req,4096)).toString());
    if(body.revision!==appearance.revision)return json({error:'Appearance changed in another window. Reload before saving.'},409);
    const next={...cleanAppearance(body),revision:randomUUID()};
    const saved=await appearanceStore.setJSON('current',next,appearanceRecord?{onlyIfMatch:appearanceRecord.etag}:{onlyIfNew:true});
    return saved.modified?json(next):json({error:'Appearance changed. Reload and try again.'},409);
   }catch(e){return json({error:e.message},400);}
  }
  const store=getStore({name:'binder-inventory',consistency:'strong'});
  if(resource==='inventory'){
   const stored=await store.getWithMetadata('current',{type:'json'}),raw=stored?.data||{cards:seed,revision:seedRevision};
   const current={...raw,cards:raw.cards.map(normalizeCardMetadata)};
   if(req.method==='GET')return json({...current,appearance});
   if(req.method==='DELETE'){
    if((bootstrap&&!profile)||!authorized(req,pw))return json({error:'Sign in to delete listings.'},401);
    let body;try{body=JSON.parse(Buffer.from(await limitedBody(req,4096)).toString());}catch{return json({error:'Invalid delete request'},400);}
    if(!body||typeof body.id!=='string'||!/^c\d+$/.test(body.id))return json({error:'Choose a valid listing.'},400);
    if(body.revision!==current.revision)return json({error:'Inventory changed in another window. Reload before deleting.'},409);
    if(!current.cards.some(c=>c.id===body.id))return json({error:'This listing no longer exists. Reload inventory.'},404);
    const next={cards:current.cards.filter(c=>c.id!==body.id),revision:randomUUID(),updatedAt:new Date().toISOString()};
    const saved=await store.setJSON('current',next,stored?{onlyIfMatch:stored.etag}:{onlyIfNew:true});
    if(!saved.modified)return json({error:'Inventory changed while deleting. Reload and try again.'},409);
    return json(next);
   }
   if(req.method!=='PUT')return json({error:'Method not allowed'},405);
   if((bootstrap&&!profile)||!authorized(req,pw))return json({error:'Sign in to save changes.'},401);
   let body,card;try{body=JSON.parse(Buffer.from(await limitedBody(req,200000)).toString());card=cleanCard(body.card);}catch(e){return json({error:e.message},400);}
   if(body.revision!==current.revision)return json({error:'Inventory changed in another window. Reload the seller binder before saving again.'},409);
   const previous=current.cards.find(c=>c.id===card.id);
   if(body.card.photoFrames===undefined&&previous?.photoFrames)card.photoFrames=cleanFrames(previous.photoFrames,card.photos);
   if(body.card.ebayListings===undefined&&previous?.ebayListings)card.ebayListings=previous.ebayListings;
   if(card.ebayListings?.some(link=>current.cards.some(c=>c.id!==card.id&&c.ebayListings?.some(other=>other.itemId===link.itemId))))return json({error:'That eBay listing is already linked to another card.'},400);
   const cards=[...current.cards],index=cards.findIndex(c=>c.id===card.id);if(index<0){if(cards.length>=5000)return json({error:'Inventory limit reached'},400);cards.push(card);}else cards[index]=card;
   const next={cards,revision:randomUUID(),updatedAt:new Date().toISOString()};
   const result=await store.setJSON('current',next,stored?{onlyIfMatch:stored.etag}:{onlyIfNew:true});
   if(!result.modified)return json({error:'Inventory changed while saving. Reload and try again.'},409);
   return json(next);
  }
  if(resource==='scan'){
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   if((bootstrap&&!profile)||!authorized(req,pw))return json({error:'Sign in to scan cards.'},401);
   if(!scan)return json({error:'Card scanning is not available on this server.'},503);
   if(req.headers.get('content-type')!=='image/jpeg')return json({error:'Send the scan photo as a JPEG.'},400);
   let data;try{data=await limitedBody(req,4*1024*1024);}catch(e){return json({error:e.message+' Scan photos must be under 4 MB.'},413);}
   const b=Buffer.from(data);if(!(b[0]===255&&b[1]===216&&b[2]===255))return json({error:'The file does not match its image format.'},400);
   // Scan failures are reported as scan errors, not as the storage outage the outer catch describes.
   try{return json(await scan(b));}catch(e){console.error('card scan failed:',e);return json({error:e.status?e.message:'Card scanning is unavailable right now. Try again, or fill in the details yourself.'},e.status||502);}
  }
  if(resource==='photo'){
   const photos=getStore({name:'binder-photos',consistency:'strong'});
   if(req.method==='GET'){const id=url.searchParams.get('id');if(!/^[a-f0-9-]{36}$/.test(id||''))return json({error:'Photo not found'},404);const entry=await photos.getWithMetadata(id,{type:'arrayBuffer'});if(!entry)return json({error:'Photo not found'},404);return new Response(entry.data,{headers:{'Content-Type':entry.metadata.type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}
   if(req.method!=='POST')return json({error:'Method not allowed'},405);
   if((bootstrap&&!profile)||!authorized(req,pw))return json({error:'Sign in to upload photos.'},401);
   const type=req.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(type))return json({error:'Use JPEG, PNG or WebP.'},400);
   let data;try{data=await limitedBody(req,3*1024*1024);}catch(e){return json({error:e.message+' Choose a photo under 3 MB.'},413);}
   const b=Buffer.from(data),valid=type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:type==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
   if(!valid)return json({error:'The file does not match its image format.'},400);
   const id=randomUUID();await photos.set(id,data,{metadata:{type}});return json({url:`/.netlify/functions/binder-api?resource=photo&id=${id}`});
  }
  return json({error:'Not found'},404);
 }catch{return json({error:'Online storage is unavailable. Your change was not confirmed; retry or reload to check its status.'},503);}};
}
