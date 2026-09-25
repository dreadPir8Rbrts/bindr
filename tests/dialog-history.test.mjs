import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function harness(deferBack=false){
 const listeners={},states=[{page:true}];let index=0,pendingBack=false;
 const pop=()=>{if(!index)return;win.history.state=states[--index];listeners.popstate({state:win.history.state});};
 const win={location:{href:'https://binder.test/#card=c1'},history:{state:states[0],pushState(state){states.splice(++index);states[index]=state;this.state=state;},replaceState(state){states[index]=state;this.state=state;},back(){if(deferBack)pendingBack=true;else pop();},forward(){if(index===states.length-1)return;this.state=states[++index];listeners.popstate({state:this.state});}},addEventListener(type,fn){listeners[type]=fn;}};
 const closed=[];const context={globalThis:{}};vm.createContext(context);vm.runInContext(readFileSync('dialog-history.js','utf8'),context);
 const controller=context.globalThis.createDialogHistory(win,dialog=>{dialog.open=false;closed.push(dialog.name);controller.closed(dialog);});
 const dialog=name=>({name,open:true});
 return{win,states,closed,controller,dialog,index:()=>index,flush(){if(pendingBack){pendingBack=false;pop();}}};
}

test('Back closes a direct-link card without changing its URL or base state',()=>{const h=harness(),card=h.dialog('card');h.controller.opened(card);assert.equal(h.index(),1);h.win.history.back();assert.deepEqual(h.closed,['card']);assert.equal(h.index(),0);assert.equal(h.win.location.href,'https://binder.test/#card=c1');assert.deepEqual(h.win.history.state,{page:true});});
test('visible close consumes its card history entry and runs restoration callback',()=>{const h=harness(),card=h.dialog('card');let restored=false;h.controller.opened(card);h.controller.requested(card,()=>restored=true);assert.deepEqual(h.closed,['card']);assert.equal(restored,true);assert.equal(h.index(),0);});
test('lot opened over a card closes one layer at a time without trapping navigation',()=>{const h=harness(),card=h.dialog('card'),lot=h.dialog('lot');h.controller.opened(card);h.controller.opened(lot);h.win.history.back();assert.deepEqual(h.closed,['lot']);assert.equal(card.open,true);h.win.history.back();assert.deepEqual(h.closed,['lot','card']);assert.equal(h.index(),0);h.win.history.back();assert.deepEqual(h.closed,['lot','card']);});
test('nested dialogs add no history entries and remain independently controlled',()=>{const h=harness(),card=h.dialog('card'),nested=h.dialog('zoom');h.controller.opened(card);h.controller.requested(card);assert.deepEqual(h.closed,['card']);assert.equal(h.index(),0);assert.equal(nested.open,true);});
test('forwarding to a consumed dialog marker is scrubbed instead of reopening or trapping',()=>{const h=harness(),card=h.dialog('card');h.controller.opened(card);h.controller.requested(card);h.win.history.forward();assert.equal(h.win.history.state.binderDialog,undefined);assert.deepEqual(h.closed,['card']);});
test('repeated close requests consume only one history entry',()=>{const h=harness(true),card=h.dialog('card');h.controller.opened(card);let callbacks=0;h.controller.requested(card,()=>callbacks++);h.controller.requested(card,()=>callbacks++);assert.equal(h.index(),1);h.flush();assert.equal(h.index(),0);assert.equal(callbacks,1);assert.deepEqual(h.closed,['card']);});
