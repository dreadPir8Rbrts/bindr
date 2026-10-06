import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({structuredClone});vm.runInContext(readFileSync('frontend/guided-draft.js','utf8'),ctx);
const Draft=ctx.GuidedDraft;
const card=()=>({id:'c99',name:'Pikachu',set:'Base',price:5,condition:'Near Mint',description:'',photos:['front.jpg'],photoRoles:['front'],thumb:'front.jpg',status:'draft'});
function server(){let remote=null,fail=false;const writes=[];return {writes,get remote(){return remote;},set remote(v){remote=v;},loseResponse(){fail=true;},api:async(resource,options)=>{if(!options)return {cards:remote?[remote]:[]};const c=JSON.parse(options.body).card;if(c.version!==remote?.version)throw Error('Version conflict');remote={...c,name:c.name.trim(),thumb:'thumbnail.jpg',version:(remote?.version||0)+1};writes.push(c);if(fail){fail=false;throw Error('Connection lost');}return {cards:[remote]};}};}
test('serializes edits made during an in-flight autosave using the returned version',async()=>{
 const s=server();let release;const gate=new Promise(r=>release=r);let first=true;
 const d=new Draft(card(),async(...args)=>{if(first){first=false;await gate;}return s.api(...args);});
 const saved=d.save();d.card.price=9;assert.equal(d.save(),saved);release();await saved;
 assert.equal(s.writes.length,2);assert.equal(s.writes[1].version,1);assert.equal(s.remote.price,9);assert.equal(d.dirty,false);
});
test('lost create response reconciles normalized server data without another write',async()=>{
 const s=server(),d=new Draft({...card(),name:' Pikachu '},s.api);s.loseResponse();await assert.rejects(d.save());await d.save();assert.equal(s.writes.length,1);assert.equal(d.card.version,1);assert.equal(d.dirty,false);
});
test('conflicting remote edits are preserved',async()=>{
 const s=server(),d=new Draft(card(),s.api);await d.save();s.remote={...s.remote,price:25,version:2};d.card.price=10;await assert.rejects(d.save());await assert.rejects(d.save(),/another device/);assert.equal(s.remote.price,25);assert.equal(d.card.price,10);
});
test('publishes with front only and retries a lost publication response safely',async()=>{
 const s=server(),d=new Draft(card(),s.api);await d.save();s.loseResponse();await assert.rejects(d.publish());assert.equal(s.remote.status,'available');await d.publish();assert.equal(s.writes.length,2);assert.equal(d.dirty,false);assert.equal(d.card.status,'available');assert.deepEqual(s.remote.photoRoles,['front']);
});
test('failed request that never committed retries with the existing version',async()=>{
 const s=server();let offline=true;const d=new Draft(card(),(...args)=>{if(args[1]&&offline){offline=false;throw Error('Offline');}return s.api(...args);});await assert.rejects(d.save());await d.save();assert.equal(s.writes.length,1);
});
