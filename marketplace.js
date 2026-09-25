'use strict';
// Seed links come from successful upload reports and the owner's active-listing screenshots.
const EBAY_SEED_LINKS = {"c222": ["267788402617"], "c224": ["267788402618"], "c230": ["267788402629"], "c169": ["267788402626"], "c211": ["267788402622"], "c213": ["267788402612"], "c229": ["267788402631"], "c45": ["267788402623"], "c40": ["267788402632"], "c219": ["267788402624"], "c237": ["267788402634"], "c206": ["267788402614"], "c221": ["267788402619"], "c258": ["267788402615"], "c226": ["267788402613"], "c227": ["267788402630"], "c234": ["267788402616"], "c216": ["267788402639"], "c246": ["267788402653"], "c218": ["267788402638"], "c235": ["267788402633"], "c265": ["267788402637"], "c44": ["267788402640"], "c263": ["267788402620"], "c203": ["267788402651"], "c225": ["267788402628"], "c247": ["267788402636"], "c262": ["267788402647"], "c209": ["267788402644"], "c217": ["267788402621"], "c269": ["267788402642"], "c223": ["267788402645"], "c242": ["267788402648"], "c115": ["267788402669"], "c241": ["267788402652"], "c236": ["267788402650"], "c253": ["267788402662"], "c266": ["267788402649"], "c268": ["267788402635"], "c210": ["267788402661"], "c261": ["267788402670"], "c116": ["267788402643"], "c220": ["267788402667"], "c152": ["267788402627"], "c143": ["267788402668"], "c196": ["267788402654"], "c139": ["267788402656"], "c208": ["267788402641"], "c215": ["267788402655"], "c124": ["267788402678"], "c157": ["267788402675"], "c212": ["267788402664"], "c231": ["267788402681"], "c244": ["267788402665"], "c245": ["267788402683"], "c80": ["267788402672"], "c137": ["267788402663"], "c259": ["267788402674"], "c98": ["267788402722"], "c204": ["267788402677"], "c205": ["267788402658"], "c255": ["267788402646"], "c164": ["267788402688"], "c243": ["267788402689"], "c97": ["267788402657"], "c136": ["267788402686"], "c195": ["267788402684"], "c88": ["267788402690"], "c89": ["267788402691"], "c228": ["267788402694"], "c252": ["267788402700"], "c161": ["267788402702"], "c197": ["267788402666"], "c84": ["267788402697"], "c130": ["267788402660"], "c254": ["267788402696"], "c96": ["267788402676"], "c160": ["267788402698"], "c166": ["267788402705"], "c232": ["267788402659"], "c144": ["267788402695"], "c159": ["267788402671"], "c125": ["267788402708"], "c260": ["267788402704"], "c126": ["267788402693"], "c233": ["267788402703"], "c20": ["267788402673"], "c53": ["267788402687"], "c207": ["267788402685"], "c73": ["267788402679"], "c250": ["267788402701"], "c270": ["267788402706"], "c163": ["267788402707"], "c146": ["267788402682"], "c256": ["267788402710"], "c257": ["267788402709"], "c251": ["267788402692"], "c267": ["267788365781", "267781933121"], "c264": ["267788365783"], "c240": ["267788365788"], "c202": ["267788365785"], "c120": ["267788365782"], "c121": ["267788365789"], "c248": ["267788365784"], "c249": ["267788365786"], "c238": ["267788386297"], "c239": ["267788386296"], "c214": ["267788391169"], "c147": ["267788391168"], "c8": ["267709181936"], "c117": ["267709198793"]};
function ebayLinks(card){return card.ebayListings||((EBAY_SEED_LINKS[card.id]||[]).map(itemId=>({itemId,status:'active',checkedAt:'2026-09-17T20:00:00.000Z'})));}
function parseMarketplaceCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('This CSV has an unfinished quoted field. Download it again.');
 row.push(cell);if(row.some(Boolean))rows.push(row);
 const key=s=>s.replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
 const at=rows.findIndex(r=>r.some(v=>['itemid','itemnumber'].includes(key(v))));
 if(at<0)throw Error('Use an eBay CSV containing ItemID or Item number.');
 const headers=rows[at].map(key);return rows.slice(at+1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()])));
}
function planMarketplaceImport(text,kind,cards){
 const records=parseMarketplaceCSV(text),plans=new Map();let skipped=0;
 for(const row of records){
  const itemId=row.itemid||row.itemnumber,sku=row.customlabel||row.customlabelsku||row.sku;
  if(!/^\d{9,15}$/.test(itemId)){skipped++;continue;}
  if(kind==='results'&&(row.errorcode||!['success','warning'].includes((row.status||'').toLowerCase()))){skipped++;continue;}
  if(kind==='sold'&&(!(row.saledate||row.paidondate||row.paidon)||Number(row.quantity)<1||/cancel|refund|unpaid/i.test([row.orderstatus,row.paymentstatus,row.status].join(' ')))){skipped++;continue;}
  const linked=cards.filter(c=>ebayLinks(c).some(x=>x.itemId===itemId));
  const bySKU=/^BINDR-c\d+$/.test(sku||'')?cards.find(c=>c.id===sku.slice(6)):null;
  if(linked.length>1||(bySKU&&linked.length&&linked[0].id!==bySKU.id))throw Error('Conflicting matches for eBay item '+itemId+'. Check its SKU before importing.');
  const card=bySKU||linked[0];if(!card){skipped++;continue;}
  const entry=plans.get(card.id)||{card,links:structuredClone(ebayLinks(card)),sold:card.sold};
  const status=kind==='sold'?'sold':'active';
  const prior=entry.links.find(x=>x.itemId===itemId);
  // Historical upload results must not reactivate a listing already confirmed ended or sold.
  if(kind==='results'&&prior&&['sold','ended'].includes(prior.status)){skipped++;continue;}
  const link={itemId,status,checkedAt:new Date().toISOString()};
  if(prior)Object.assign(prior,link);else entry.links.push(link);
  if(kind==='sold')entry.sold=true;
  plans.set(card.id,entry);
 }
 return {plans:[...plans.values()],skipped};
}
let marketplacePlan=null,marketplacePlanRevision=null;
function renderMarketplace(){
 const host=sellerEl('marketplaceCards');if(!host)return;
 const linked=inventory.filter(c=>ebayLinks(c).length),attention=linked.filter(c=>c.sold&&ebayLinks(c).some(x=>x.status==='active')||ebayLinks(c).filter(x=>x.status==='active').length>1);
 sellerEl('marketplaceSummary').textContent=`eBay tracking · ${attention.length} to check`;
 sellerEl('marketplaceCounts').textContent=`${linked.length} cards linked. Status is based on your reports and confirmations, not a live eBay connection.`;
 const query=sellerEl('marketplaceSearch').value.trim().toLowerCase();
 const filtered=linked.filter(c=>[c.name,c.id,...ebayLinks(c).map(x=>x.itemId)].join(' ').toLowerCase().includes(query));
 const shown=(query?filtered:[...attention,...filtered.filter(c=>!attention.includes(c))]);
 host.innerHTML=shown.map(c=>`<article class="marketplace-card"><strong>${sellerEsc(c.name)} · ${sellerEsc(c.id.toUpperCase())}</strong><p>${c.sold?'Sold on your site':'Available on your site'}${c.sold&&ebayLinks(c).some(x=>x.status==='active')?' — check and end remaining eBay listings':''}${ebayLinks(c).filter(x=>x.status==='active').length>1?' · Multiple eBay listings: check for duplicates':''}</p>${ebayLinks(c).map(x=>`<div><a href="https://www.ebay.com/itm/${x.itemId}" target="_blank" rel="noopener">Open eBay ${x.itemId} ↗</a><span>${sellerEsc(x.status)} · recorded ${new Date(x.checkedAt).toLocaleDateString()}</span>${x.status==='active'?`<button data-ebay-ended="${x.itemId}" data-card-id="${c.id}">I ended this on eBay</button><button data-ebay-sold="${x.itemId}" data-card-id="${c.id}">Sold on eBay</button>`:''}</div>`).join('')}</article>`).join('')||'<p>No matching linked cards.</p>';
}
async function confirmMarketplaceStatus(id,itemId,status){
 if(onlineBusy)return;
 if(!confirm(status==='sold'?'Confirm this exact card sold on eBay? It will move to your site’s sold archive.':'Confirm you already ended this listing on eBay? This records your confirmation; it does not end the listing for you.'))return;
 const c=inventory.find(c=>c.id===id);if(!c)return;
 setOnlineBusy(true);
 try{await publishCard({...c,sold:status==='sold'?true:!!c.sold,ebayListings:ebayLinks(c).map(x=>x.itemId===itemId?{...x,status,checkedAt:new Date().toISOString()}:x)});sellerMessage('Saved. Other linked eBay listings still need checking.');}catch(e){sellerMessage(e.message);}finally{setOnlineBusy(false);renderMarketplace();}
}
function setupMarketplace(){
 const panel=document.createElement('details');panel.className='marketplace-panel';
 panel.innerHTML='<summary id="marketplaceSummary">eBay tracking</summary><p id="marketplaceCounts"></p><p>Mark a card sold on your site, then check its eBay link and end it there. Import sold-order reports to update the site after eBay sales. No automatic eBay sync is connected.</p><label>Report type<select id="marketplaceKind"><option value="results">Listing upload results</option><option value="sold">Sold orders</option></select></label><label>Choose eBay CSV<input id="marketplaceFile" type="file" accept=".csv,text/csv"></label><p class="small">Sold reports need Item number, Quantity, and Sale date or Paid on date. Only exact listing-ID or BINDR-SKU matches are used. Buyer details are not saved.</p><div id="marketplacePreview" role="status"></div><button id="marketplaceApply" hidden>Apply reviewed updates</button><label>Find a linked card<input type="search" id="marketplaceSearch" placeholder="Card, listing ID, or eBay number"></label><div id="marketplaceCards"></div>';
 sellerEl('sellerGrid').closest('section').before(panel);
 sellerEl('marketplaceSearch').oninput=renderMarketplace;
 sellerEl('marketplaceKind').onchange=()=>{marketplacePlan=null;sellerEl('marketplaceApply').hidden=true;sellerEl('marketplaceFile').value='';sellerEl('marketplacePreview').textContent='';};
 sellerEl('marketplaceFile').onchange=async e=>{
  marketplacePlan=null;sellerEl('marketplaceApply').hidden=true;
  try{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('Use a report smaller than 10 MB.');
   const text=await file.text();marketplacePlan=planMarketplaceImport(text,sellerEl('marketplaceKind').value,inventory);marketplacePlanRevision=onlineRevision;
   sellerEl('marketplacePreview').textContent=`Review: ${marketplacePlan.plans.length} card updates, ${marketplacePlan.skipped} rows skipped. `+marketplacePlan.plans.map(p=>`${p.card.id.toUpperCase()} ${p.card.name}${p.sold?' (sold)':''}`).join('; ');
   sellerEl('marketplaceApply').hidden=!marketplacePlan.plans.length;
  }catch(e){sellerEl('marketplacePreview').textContent=e.message;}
 };
 sellerEl('marketplaceApply').onclick=async()=>{
  if(onlineBusy||!marketplacePlan)return;
  if(marketplacePlanRevision!==onlineRevision){marketplacePlan=null;sellerEl('marketplaceApply').hidden=true;sellerEl('marketplacePreview').textContent='Inventory changed after the preview. Choose the report again to review current matches.';return;}
  const button=sellerEl('marketplaceApply'),plans=marketplacePlan.plans;button.disabled=true;setOnlineBusy(true);let completed=0;
  try{for(const plan of plans){await publishCard({...plan.card,sold:!!plan.sold,ebayListings:plan.links});completed++;}sellerEl('marketplacePreview').textContent=`Saved ${completed} card updates to your live inventory.`;marketplacePlan=null;button.hidden=true;}
  catch(e){marketplacePlan=null;button.hidden=true;sellerEl('marketplacePreview').textContent=`Saved ${completed} updates. ${e.message} Reload inventory and import the report again to review remaining updates.`;}
  finally{button.disabled=false;setOnlineBusy(false);renderMarketplace();}
 };
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.ebayEnded)confirmMarketplaceStatus(b.dataset.cardId,b.dataset.ebayEnded,'ended');if(b?.dataset.ebaySold)confirmMarketplaceStatus(b.dataset.cardId,b.dataset.ebaySold,'sold');});
 renderMarketplace();
}
if(typeof document!=='undefined')setupMarketplace();
