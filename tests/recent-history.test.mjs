import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('clearing history focuses non-editable results instead of opening search',()=>{
 const nodes=new Map(),messages=[];
 let focused=null,saved=null,rendered=false;
 const context={recent:['c1'],persist(){saved=[...context.recent];},renderRecent(){rendered=true;},toast(message){messages.push(message);},$(id){
  if(!nodes.has(id))nodes.set(id,{setAttribute(name,value){this[name]=value;},focus(options){focused={id,options};}});
  return nodes.get(id);
 }};
 vm.createContext(context);
 const handler=readFileSync('app.js','utf8').split('\n').find(line=>line.startsWith("$('clearRecent').onclick="));
 vm.runInContext(handler,context);
 nodes.get('clearRecent').onclick();
 assert.equal(context.recent.length,0);
 assert.deepEqual(saved,[]);
 assert.equal(rendered,true);
 assert.equal(focused.id,'resultCount');
 assert.equal(focused.options.preventScroll,true);
 assert.equal(nodes.get('resultCount').tabindex,'-1');
 assert.equal(nodes.has('searchInput'),false);
 assert.deepEqual(messages,['Recent history cleared']);
});
