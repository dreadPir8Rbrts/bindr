'use strict';
(function(root){
 root.createDialogHistory=function(win,closeDialog){
  const key='binderDialog',entries=[],closing=new WeakSet();let serial=0;
  const token=state=>state&&state[key];
  function opened(dialog){
   const id=`${Date.now()}-${++serial}`;
   entries.push({dialog,id,after:null,pending:false});
   win.history.pushState({...win.history.state,[key]:id},'',win.location.href);
  }
  function finish(entry){
   closing.add(entry.dialog);closeDialog(entry.dialog);closing.delete(entry.dialog);
   const after=entry.after;entry.after=null;if(after)after();
  }
  function requested(dialog,after){
   const index=entries.findLastIndex(entry=>entry.dialog===dialog);
   if(index<0){closeDialog(dialog);if(after)after();return;}
   if(entries[index].pending)return;
   entries[index].after=after||null;
   if(index===entries.length-1&&token(win.history.state)===entries[index].id){entries[index].pending=true;win.history.back();}
   else finish(entries.splice(index,1)[0]);
  }
  function closed(dialog){
   if(closing.has(dialog))return;
   const index=entries.findLastIndex(entry=>entry.dialog===dialog);if(index<0)return;
   const [entry]=entries.splice(index,1);
   if(token(win.history.state)===entry.id)win.history.back();
  }
  function popped(event){
   const target=token(event.state),keep=entries.findIndex(entry=>entry.id===target);
   entries.splice(keep+1).reverse().forEach(finish);
   if(target&&keep<0){const state={...(event.state||{})};delete state[key];win.history.replaceState(state,'',win.location.href);}
  }
  win.addEventListener('popstate',popped);
  return{opened,requested,closed};
 };
})(globalThis);

