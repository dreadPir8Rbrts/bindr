'use strict';
// The server's seller-only session endpoint is the authority; browser mode is just presentation.
(()=>{
 const el=id=>document.getElementById(id),key='bindr-admin-mode';
 let authorized=false,adminMode=false,checking=null,identity='',draftRequest=0,returnFocus=null;
 const dialog=el('storefrontEditor'),frame=el('storefrontEditorFrame');
 function remember(value){try{value?sessionStorage.setItem(key,JSON.stringify({identity,mode:value})):sessionStorage.removeItem(key);}catch{}}
 function remembered(){try{const saved=JSON.parse(sessionStorage.getItem(key));return saved?.identity===identity&&saved.mode==='admin';}catch{return false;}}
 async function api(resource){const token=await sellerAuth.accessToken();if(!token)throw Error('Sign in as the seller to manage this binder.');const r=await fetch('/api/v1/'+resource,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok){if(r.status===401||r.status===403)revoke();throw Error(r.status===403?'This account does not have seller access.':r.status===401?'Sign in again to continue.':'Could not load seller data. Try again.');}return r.json();}
 function editButtons(){
  document.querySelectorAll('#binderGrid [data-card]').forEach(card=>{
   let button=card.querySelector('[data-admin-edit]');
   if(!authorized||!adminMode){button?.remove();return;}
   if(!button){button=document.createElement('button');button.type='button';button.dataset.adminEdit=card.dataset.card;button.className='storefront-edit';button.textContent='Edit listing';card.appendChild(button);}
  });
 }
 function render(){
  el('storefrontMode').hidden=!authorized;el('storefrontAdminTools').hidden=!authorized||!adminMode;
  el('storefrontLoginLink').hidden=authorized;el('storefrontSignOut').hidden=!authorized;
  el('buyerMode').setAttribute('aria-pressed',String(!adminMode));el('adminMode').setAttribute('aria-pressed',String(adminMode));
  if(!authorized||!adminMode){el('storefrontDrafts').hidden=true;el('storefrontDraftCards').replaceChildren();draftRequest++;}
  editButtons();
 }
 function revoke(){authorized=false;adminMode=false;identity='';remember(null);render();}
 async function check(){
  if(checking)return checking;
  checking=(async()=>{try{const session=await api('session');if(session.authenticated!==true)throw Error('Seller access required.');identity=session.email;const wasAuthorized=authorized;authorized=true;if(!wasAuthorized)adminMode=remembered();render();return true;}catch{revoke();return false;}})().finally(()=>checking=null);
  return checking;
 }
 async function drafts(){
  const request=++draftRequest;el('storefrontAdminStatus').textContent='Loading drafts…';
  try{const data=await api('listings');if(request!==draftRequest||!authorized||!adminMode)return;
   const cards=data.cards.filter(c=>c.status==='draft');el('storefrontDraftCards').replaceChildren();
   for(const c of cards){const button=document.createElement('button');button.type='button';button.dataset.adminResume=c.id;button.textContent=(c.name||'Untitled card')+' · '+c.photos.length+' photos · Resume';el('storefrontDraftCards').appendChild(button);}
   el('storefrontDrafts').hidden=false;el('storefrontAdminStatus').textContent=cards.length?'Private drafts are saved online.':'No private drafts yet. Create a new listing to start.';
  }catch(e){if(request===draftRequest)el('storefrontAdminStatus').textContent=e.message;}
 }
 async function mode(manage){if(dialog.open)return;if(manage&&!await check())return;adminMode=manage;remember(manage?'admin':'buyer');render();if(manage)await drafts();}
 async function openEditor(action,id){
  if(dialog.open||!adminMode||!await check())return;
  returnFocus=document.activeElement;frame.src='seller.html?'+new URLSearchParams({embed:'storefront',action,...(id?{id}:{})});dialog.showModal();
 }
 function askClose(){frame.contentWindow?.postMessage({type:'bindr-editor-request-close'},location.origin);}
 async function finished(viewId){
  dialog.close();frame.src='about:blank';returnFocus?.focus({preventScroll:true});
  if(typeof refreshLiveBinder==='function'&&typeof cardMap!=='undefined')await refreshLiveBinder();
  if(await check()&&adminMode)await drafts();
  if(viewId&&typeof openCard==='function'&&cardMap.has(viewId))openCard(viewId);
 }
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||!dialog.open)return;if(e.data?.type==='bindr-editor-closed')finished();if(e.data?.type==='bindr-editor-view'&&/^c\d+$/.test(e.data.id))finished(e.data.id);});
 dialog.addEventListener('click',e=>{if(e.target===dialog){e.stopImmediatePropagation();askClose();}},true);
 dialog.addEventListener('cancel',e=>{e.preventDefault();askClose();});el('storefrontEditorClose').onclick=askClose;
 el('buyerMode').onclick=()=>mode(false);el('adminMode').onclick=()=>mode(true);
 el('storefrontNew').onclick=()=>openEditor('new');el('storefrontShowDrafts').onclick=drafts;
 el('storefrontDraftCards').onclick=e=>{const b=e.target.closest('[data-admin-resume]');if(b)openEditor('resume',b.dataset.adminResume);};
 el('binderGrid').addEventListener('click',e=>{const b=e.target.closest('[data-admin-edit]');if(b)openEditor('edit',b.dataset.adminEdit);});
 new MutationObserver(editButtons).observe(el('binderGrid'),{childList:true,subtree:true});
 el('storefrontLoginLink').onclick=()=>{el('storefrontLoginStatus').textContent='';el('storefrontLogin').showModal();};
 el('storefrontLoginClose').onclick=()=>el('storefrontLogin').close();
 el('storefrontLoginForm').onsubmit=async e=>{
  e.preventDefault();el('storefrontLoginSubmit').disabled=true;
  try{await sellerAuth.signIn(el('storefrontEmail').value.trim(),el('storefrontPassword').value);el('storefrontPassword').value='';remember(null);if(!await check())throw Error('This account could not be verified as the seller. Check your connection and seller access.');el('storefrontLogin').close();adminMode=false;render();}
  catch(e){el('storefrontLoginStatus').textContent=e.message;}finally{el('storefrontLoginSubmit').disabled=false;}
 };
 el('storefrontSignOut').onclick=async()=>{try{await sellerAuth.signOut();revoke();}catch(e){el('storefrontAdminStatus').textContent=e.message;}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!dialog.open)check();});
 window.addEventListener('storage',()=>{if(!dialog.open)check();});
 check().then(ok=>{if(ok&&adminMode)drafts();});
})();
