'use strict';
// Serial, versioned writes. A lost response is reconciled before retrying it.
class GuidedDraft {
 constructor(card,api,onSaved=()=>{}){this.card=structuredClone(card);this.api=api;this.onSaved=onSaved;this.saved=card.version?this.signature(card):null;this.pending=null;this.running=null;}
 signature(card){return JSON.stringify(['name','set','price','condition','description','photos','photoRoles','catalogCardId','status','sold','photoFrames'].map(k=>['name','set','description'].includes(k)?(card[k]||'').trim():k==='sold'?!!card[k]:k==='photoFrames'?Object.entries(card[k]||{}).sort(([a],[b])=>a.localeCompare(b)):card[k]??null));}
 get dirty(){return !!this.pending||this.signature(this.card)!==this.saved;}
 async reconcile(){
  const data=await this.api('listings'),remote=data.cards.find(c=>c.id===this.card.id),attempt=this.pending;
  if(remote&&this.signature(remote)===this.signature(attempt)){this.card.version=remote.version;this.saved=this.signature(attempt);this.pending=null;this.onSaved(data);return;}
  if(remote?.version!==attempt.version)throw Error('This draft changed on another device. Your edits are still here. Close this tab only after copying them, then reload to resume the latest draft.');
  this.pending=null;
 }
 save(){if(this.running)return this.running;this.running=this.flush().finally(()=>{this.running=null;});return this.running;}
 async flush(){
  if(this.pending)await this.reconcile();
  while(this.dirty){
   const card=structuredClone(this.card);this.pending=card;
   const data=await this.api('listings/'+encodeURIComponent(card.id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({card})});
   const remote=data.cards.find(c=>c.id===card.id);if(!remote)throw Error('The server did not confirm this draft. Retry saving.');
   this.card.version=remote.version;this.saved=this.signature(card);this.pending=null;this.onSaved(data);
  }
 }
 async publish(){await this.save();this.card.status='available';this.card.sold=false;await this.save();}
}
globalThis.GuidedDraft=GuidedDraft;
