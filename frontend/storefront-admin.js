'use strict';
// The server's seller-only session endpoint is the authority; browser mode is just presentation.
(()=>{
 const el=id=>document.getElementById(id),key='bindr-admin-mode';
 let authorized=false,adminMode=false,checking=null,identity='',draftRequest=0,returnFocus=null,nextDestination=null,currentAction=null,viewAfterClose=null,draftsVisible=false;
 const dialog=el('storefrontEditor'),frame=el('storefrontEditorFrame');
 const editor=createGuidedSeller({api});
 const editing=()=>dialog.open||editor.dialog.open;
 editor.dialog.addEventListener('close',()=>{const id=viewAfterClose;viewAfterClose=null;finished(id);});
 editor.dialog.classList.add('storefront-guided');
 el('guidedView').onclick=e=>{e.preventDefault();viewAfterClose=new URL(e.currentTarget.href).hash.slice(6);editor.dialog.close();};
 // A backdrop click must go through Save & exit, not the buyer dialog's generic closer.
 editor.dialog.addEventListener('click',e=>{if(e.target===editor.dialog){e.stopImmediatePropagation();editor.exit();}},true);
 function signInAgain(){el('storefrontLoginStatus').textContent='Sign in again, then retry. Your edits are still open.';if(!el('storefrontLogin').open)el('storefrontLogin').showModal();}

 function remember(value){try{value?sessionStorage.setItem(key,JSON.stringify({identity,mode:value})):sessionStorage.removeItem(key);}catch{}}
 function remembered(){try{const saved=JSON.parse(sessionStorage.getItem(key));return saved?.identity===identity&&saved.mode==='admin';}catch{return false;}}
 async function api(resource,options={}){
  const token=await sellerAuth.accessToken();if(!token){revoke();signInAgain();throw Error('Sign in as the seller to continue.');}
  const r=await fetch('/api/v1/'+resource,{cache:'no-store',signal:AbortSignal.timeout(20000),...options,headers:{...options.headers,Authorization:'Bearer '+token}});
  if(!r.ok){if(r.status===401||r.status===403)revoke();if(r.status===401)signInAgain();const data=await r.json().catch(()=>({}));throw Error(typeof data.detail==='string'?data.detail:'Could not save or load seller data. Try again.');}return r.json();
 }
 function editButtons(){
  document.querySelectorAll('#binderGrid [data-card]').forEach(card=>{
   let button=card.querySelector('[data-admin-edit]');
   if(!authorized||!adminMode){button?.remove();return;}
   if(!button){button=document.createElement('button');button.type='button';button.dataset.adminEdit=card.dataset.card;button.className='storefront-edit';button.textContent='Edit listing';card.appendChild(button);}
  });
 }
 function render(){
  if(!authorized||!adminMode)draftsVisible=false;
  el('storefrontDrafts').hidden=!draftsVisible;el('catalog').hidden=draftsVisible;el('storefrontFooter').hidden=draftsVisible;
  if(!editing())el('adminMobileNav').querySelectorAll('[data-admin-nav]').forEach(b=>{if(draftsVisible&&b.dataset.adminNav==='drafts')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  el('adminMobileNav').hidden=!authorized||!adminMode;document.body.classList.toggle('mobile-admin-active',authorized&&adminMode);
  el('storefrontMode').hidden=!authorized;el('storefrontAdminTools').hidden=!authorized||!adminMode;
  el('storefrontLoginLink').hidden=authorized;el('storefrontSignOut').hidden=!authorized;
  el('buyerMode').setAttribute('aria-pressed',String(!adminMode));el('adminMode').setAttribute('aria-pressed',String(adminMode));
  if(!authorized||!adminMode){el('storefrontDrafts').hidden=true;el('storefrontDraftCards').replaceChildren();draftRequest++;}
  editButtons();
 }
 function revoke(){authorized=false;adminMode=false;identity='';remember(null);render();}
 async function check(){
  if(checking)return checking;
  checking=(async()=>{try{if(!await sellerAuth.accessToken())throw Error('Signed out');const session=await api('session');if(session.authenticated!==true)throw Error('Seller access required.');identity=session.email;const wasAuthorized=authorized;authorized=true;if(!wasAuthorized)adminMode=remembered();render();return true;}catch{revoke();return false;}})().finally(()=>checking=null);
  return checking;
 }
 async function drafts(){
  const request=++draftRequest;el('storefrontDraftStatus').textContent='Loading drafts…';el('storefrontDraftCards').replaceChildren();
  try{const data=await api('listings');if(request!==draftRequest||!authorized||!adminMode||!draftsVisible)return;
   const cards=data.cards.filter(c=>c.status==='draft');el('storefrontDraftCards').replaceChildren();
   for(const c of cards){const button=document.createElement('button');button.type='button';button.dataset.adminResume=c.id;button.textContent=(c.name||'Untitled card')+' · '+c.photos.length+' photos · Resume';el('storefrontDraftCards').appendChild(button);}
   el('storefrontDraftStatus').textContent=cards.length?'Private drafts are saved online.':'No private drafts yet. Create a new listing to start.';
  }catch(e){if(request===draftRequest)el('storefrontDraftStatus').textContent=e.message+' Use Refresh drafts to retry.';}
 }
 function binderView(){draftsVisible=false;draftRequest++;render();el('storefrontDraftCards').replaceChildren();window.scrollTo(0,0);}
 async function showDrafts(){if(!authorized||!adminMode||editing())return;draftsVisible=true;render();window.scrollTo(0,0);el('storefrontDraftTitle').focus({preventScroll:true});await drafts();}
 async function mode(manage){if(editing())return;if(manage&&!await check())return;adminMode=manage;remember(manage?'admin':'buyer');render();}
 async function openEditor(action,id){
  if(editing()||!adminMode||!authorized)return;
  currentAction=action;returnFocus=document.activeElement;
  el('adminMobileNav').querySelectorAll('[data-admin-nav]').forEach(b=>{if(b.dataset.adminNav===action)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(action==='edit'){
   dialog.appendChild(el('adminMobileNav'));frame.src='seller.html?'+new URLSearchParams({embed:'storefront',action,id});dialog.showModal();return;
  }
  try{
   if(action==='resume'){const data=await api('listings');const card=data.cards.find(c=>c.id===id&&c.status==='draft');if(!card)throw Error('This draft no longer exists. Refresh drafts.');editor.open(card);}
   else{editor.fresh();if(action==='scan')editor.dialog.dispatchEvent(new Event('scan-entry'));}
   editor.dialog.appendChild(el('adminMobileNav'));
  }catch(e){el(draftsVisible?'storefrontDraftStatus':'storefrontAdminStatus').textContent=e.message;}
 }
 function askClose(){if(editor.dialog.open)editor.exit();else frame.contentWindow?.postMessage({type:'bindr-editor-request-close'},location.origin);}

 async function finished(viewId){
  const destination=nextDestination;nextDestination=null;currentAction=null;dialog.close();document.body.appendChild(el('adminMobileNav'));el('adminMobileNav').querySelectorAll('[aria-current]').forEach(b=>b.removeAttribute('aria-current'));frame.src='about:blank';returnFocus?.focus({preventScroll:true});
  if(typeof refreshLiveBinder==='function'&&typeof cardMap!=='undefined')await refreshLiveBinder();
  render();if(authorized&&adminMode&&draftsVisible&&destination!=='drafts')await drafts();
  if(destination==='drafts'){await showDrafts();return;}if(destination){await openEditor(destination);return;}
  if(viewId&&typeof openCard==='function'&&cardMap.has(viewId)){binderView();openCard(viewId);}
 }
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||!dialog.open)return;if(e.data?.type==='bindr-editor-closed')finished();if(e.data?.type==='bindr-editor-view'&&/^c\d+$/.test(e.data.id))finished(e.data.id);});
 dialog.addEventListener('click',e=>{if(e.target===dialog){e.stopImmediatePropagation();askClose();}},true);
 dialog.addEventListener('cancel',e=>{e.preventDefault();askClose();});el('storefrontEditorClose').onclick=askClose;
 el('buyerMode').onclick=()=>mode(false);el('adminMode').onclick=()=>mode(true);
 el('storefrontScan').onclick=()=>openEditor('scan');
 el('adminMobileNav').onclick=e=>{const b=e.target.closest('[data-admin-nav]');if(!b)return;e.preventDefault();const action=b.dataset.adminNav;if(editing()){if(action===currentAction)return;nextDestination=action;askClose();}else if(action==='drafts')showDrafts();else openEditor(action);};
 el('storefrontNew').onclick=()=>openEditor('new');el('storefrontShowDrafts').onclick=showDrafts;el('storefrontDraftBack').onclick=binderView;el('storefrontDraftRefresh').onclick=drafts;
 el('storefrontDraftCards').onclick=e=>{const b=e.target.closest('[data-admin-resume]');if(b)openEditor('resume',b.dataset.adminResume);};
 el('binderGrid').addEventListener('click',e=>{const b=e.target.closest('[data-admin-edit]');if(b)openEditor('edit',b.dataset.adminEdit);});
 new MutationObserver(editButtons).observe(el('binderGrid'),{childList:true,subtree:true});
 el('storefrontLoginLink').onclick=()=>{el('storefrontLoginStatus').textContent='';el('storefrontLogin').showModal();};
 el('storefrontLoginClose').onclick=()=>el('storefrontLogin').close();
 el('storefrontLoginForm').onsubmit=async e=>{
  e.preventDefault();el('storefrontLoginSubmit').disabled=true;
  try{await sellerAuth.signIn(el('storefrontEmail').value.trim(),el('storefrontPassword').value);el('storefrontPassword').value='';remember(null);if(!await check())throw Error('This account could not be verified as the seller. Check your connection and seller access.');el('storefrontLogin').close();adminMode=editor.dialog.open;render();}
  catch(e){el('storefrontLoginStatus').textContent=e.message;}finally{el('storefrontLoginSubmit').disabled=false;}
 };
 el('storefrontSignOut').onclick=async()=>{try{await sellerAuth.signOut();revoke();}catch(e){el('storefrontAdminStatus').textContent=e.message;}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!editing())check();});
 window.addEventListener('storage',()=>{if(!editing())check();});
 check();
})();
