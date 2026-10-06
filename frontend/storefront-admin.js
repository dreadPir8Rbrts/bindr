'use strict';
// The server's seller-only session endpoint is the authority; browser mode is just presentation.
(()=>{
 const el=id=>document.getElementById(id),key='bindr-admin-mode';
 let authorized=false,adminMode=false,checking=null,identity='',draftRequest=0,returnFocus=null,nextDestination=null,currentAction=null,viewAfterClose=null,draftsVisible=false;
 const editor=createGuidedSeller({api});
 const editing=()=>editor.dialog.open;
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
   for(const c of cards)el('storefrontDraftCards').appendChild(draftRow(c));
   el('storefrontDraftStatus').textContent=cards.length?'Private drafts are saved online. Swipe left or use Draft actions to delete.':'No private drafts yet. Create a new listing to start.';
  }catch(e){if(request===draftRequest)el('storefrontDraftStatus').textContent=e.message+' Use Refresh drafts to retry.';}
 }
 function draftRow(card){
  const row=document.createElement('div');row.className='draft-swipe-row';
  const remove=document.createElement('button');remove.type='button';remove.className='draft-delete';remove.textContent='Delete';remove.hidden=true;remove.id='delete-draft-'+card.id;
  remove.setAttribute('aria-label','Delete '+(card.name||'Untitled card'));
  const front=document.createElement('div');front.className='draft-swipe-front';
  const resume=document.createElement('button');resume.type='button';resume.dataset.adminResume=card.id;resume.textContent=(card.name||'Untitled card')+' · '+card.photos.length+' photos · Resume';
  const actions=document.createElement('button');actions.type='button';actions.className='draft-actions';actions.textContent='⋯';actions.setAttribute('aria-label','Draft actions for '+(card.name||'Untitled card'));actions.setAttribute('aria-controls',remove.id);
  let opened=false,gesture=null,suppressUntil=0,deleting=false;
  function reveal(value){opened=value;front.style.transform=value?'translateX(-96px)':'';remove.hidden=!value;actions.setAttribute('aria-expanded',String(value));row.classList.toggle('is-open',value);}
  reveal(false);
  actions.onclick=()=>reveal(!opened);
  front.onpointerdown=e=>{if(deleting||!e.isPrimary||e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:opened?-96:0,dragging:false};};
  front.onpointermove=e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(!gesture.dragging){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}if(Math.abs(dx)<10)return;gesture.dragging=true;front.setPointerCapture(e.pointerId);row.classList.add('is-dragging');remove.hidden=false;}
   gesture.offset=Math.max(-96,Math.min(0,gesture.start+dx));front.style.transform=`translateX(${gesture.offset}px)`;
  };
  function finish(e){if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;row.classList.remove('is-dragging');if(g.dragging){suppressUntil=Date.now()+400;reveal(e.type==='pointercancel'?opened:g.offset<-40);if(front.hasPointerCapture(e.pointerId))front.releasePointerCapture(e.pointerId);}}
  front.onpointerup=finish;front.onpointercancel=finish;
  front.addEventListener('click',e=>{if(e.detail>0&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  row.onkeydown=e=>{if(e.key==='Escape'){reveal(false);actions.focus();}};
  remove.onclick=async()=>{
   if(deleting||!authorized||!adminMode)return;
   if(!confirm('Delete this draft? This cannot be undone.'))return;
   deleting=true;resume.disabled=actions.disabled=remove.disabled=true;remove.textContent='Deleting…';
   try{await api('listings/'+encodeURIComponent(card.id)+'?version='+encodeURIComponent(card.version),{method:'DELETE'});
    if(authorized&&adminMode&&draftsVisible&&row.isConnected){
     const focusTarget=(row.nextElementSibling||row.previousElementSibling)?.querySelector('[data-admin-resume]')||el('storefrontDraftRefresh');
     row.remove();el('storefrontDraftStatus').textContent=el('storefrontDraftCards').children.length?'Draft deleted.':'No private drafts yet. Create a new listing to start.';
     focusTarget.focus({preventScroll:true});
    }
   }catch(e){if(row.isConnected)el('storefrontDraftStatus').textContent=e.message+' Refresh drafts before retrying if it changed elsewhere.';}
   finally{deleting=false;resume.disabled=actions.disabled=remove.disabled=false;remove.textContent='Delete';}
  };
  front.append(resume,actions);row.append(remove,front);return row;
 }
 function binderView(){draftsVisible=false;draftRequest++;render();el('storefrontDraftCards').replaceChildren();window.scrollTo(0,0);}
 async function showDrafts(){if(!authorized||!adminMode||editing())return;draftsVisible=true;render();window.scrollTo(0,0);el('storefrontDraftTitle').focus({preventScroll:true});await drafts();}
 async function mode(manage){if(editing())return;if(manage&&!await check())return;adminMode=manage;remember(manage?'admin':'buyer');render();}
 async function openEditor(action,id){
  if(editing()||!adminMode||!authorized)return;
  currentAction=action;returnFocus=document.activeElement;
  el('adminMobileNav').querySelectorAll('[data-admin-nav]').forEach(b=>{if(b.dataset.adminNav===action)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  try{
   if(action==='edit'){const data=await api('listings');const card=data.cards.find(c=>c.id===id&&c.status!=='draft');if(!card)throw Error('This listing no longer exists. Refresh the binder.');editor.edit(card);}
   else if(action==='resume'){const data=await api('listings');const card=data.cards.find(c=>c.id===id&&c.status==='draft');if(!card)throw Error('This draft no longer exists. Refresh drafts.');editor.open(card);}
   else if(action==='new'){editor.search();}
   else{editor.fresh();if(action==='scan')editor.dialog.dispatchEvent(new Event('scan-entry'));}
   editor.dialog.appendChild(el('adminMobileNav'));
  }catch(e){el(draftsVisible?'storefrontDraftStatus':'storefrontAdminStatus').textContent=e.message;}
 }
 function askClose(){editor.exit();}

 async function finished(viewId){
  const destination=nextDestination;nextDestination=null;currentAction=null;document.body.appendChild(el('adminMobileNav'));el('adminMobileNav').querySelectorAll('[aria-current]').forEach(b=>b.removeAttribute('aria-current'));returnFocus?.focus({preventScroll:true});
  if(typeof refreshLiveBinder==='function'&&typeof cardMap!=='undefined')await refreshLiveBinder();
  render();if(authorized&&adminMode&&draftsVisible&&destination!=='drafts')await drafts();
  if(destination==='drafts'){await showDrafts();return;}if(destination){await openEditor(destination);return;}
  if(viewId&&typeof openCard==='function'&&cardMap.has(viewId)){binderView();openCard(viewId);}
 }
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
