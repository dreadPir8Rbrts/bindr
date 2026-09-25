// Included after app.js so the existing filtering, dialog and focus behavior is retained.
function budgetMatches(card){
 const value=$('budgetFilter').value;if(value==='all')return true;
 const [min,max]=value.split(':').map(Number);return card.price>=min&&(max===0||card.price<=max);
}
const budgetDialog=document.createElement('dialog');budgetDialog.id='budgetDialog';budgetDialog.className='budget-dialog';budgetDialog.setAttribute('aria-labelledby','budgetTitle');document.body.appendChild(budgetDialog);
budgetDialog.addEventListener('close',()=>restoreDialogPosition(budgetDialog));
budgetDialog.addEventListener('click',e=>{if(e.target===budgetDialog){const r=budgetDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(budgetDialog);}});
const budgetButton=document.createElement('button');budgetButton.id='budgetPicker';budgetButton.type='button';budgetButton.setAttribute('aria-haspopup','dialog');budgetButton.textContent='Any price';
$('budgetFilter').hidden=true;$('budgetFilter').after(budgetButton);
function refreshBudgetButton(){budgetButton.textContent=$('budgetFilter').selectedOptions[0].textContent;}
new MutationObserver(refreshBudgetButton).observe($('activeFilters'),{childList:true});
budgetButton.onclick=()=>{
 const ceiling=Math.max(1500,Math.ceil(Math.max(...CARDS.filter(c=>!c.sold).map(c=>c.price),0)/250)*250);
 let [low,high]=$('budgetFilter').value==='all'?[0,0]:$('budgetFilter').value.split(':').map(Number);
 budgetDialog.innerHTML=dialogHeader('<span id="budgetTitle">Choose your budget</span>')+`<div class="budget-body"><div class="budget-inputs"><label>Minimum<div><span>$</span><input id="budgetMin" type="number" min="0" step="1" inputmode="numeric" value="${low||''}" placeholder="Min"></div></label><span>to</span><label>Maximum<div><span>$</span><input id="budgetMax" type="number" min="0" step="1" inputmode="numeric" value="${high||''}" placeholder="Max"></div></label></div><p id="budgetError" role="alert"></p><p class="budget-chart-label">Available inventory</p><div class="budget-chart" aria-hidden="true"></div><div class="budget-sliders"><div class="budget-track"><i id="budgetSelected"></i></div><input type="range" id="budgetLowSlider" min="0" max="${ceiling}" step="5" aria-label="Minimum budget"><input type="range" id="budgetHighSlider" min="0" max="${ceiling}" step="5" aria-label="Maximum budget"></div><div class="budget-range-labels"><span id="budgetLowLabel"></span><span id="budgetHighLabel"></span></div><p class="small">The right edge means no upper limit. You can also type an exact amount.</p><div class="budget-actions"><button id="budgetReset" class="quiet">Any price</button><button id="budgetApply" class="primary">Show cards</button></div></div>`;
 const bins=Array(24).fill(0);CARDS.filter(c=>!c.sold&&c.price>0).forEach(c=>bins[Math.min(23,Math.floor(c.price/ceiling*24))]++);
 const tallest=Math.max(...bins,1);budgetDialog.querySelector('.budget-chart').innerHTML=bins.map((n,i)=>`<span data-bin="${i}" style="height:${n?Math.max(4,n/tallest*100):2}%"></span>`).join('');
 const price=v=>'$'+v.toLocaleString('en-US');
 function paint(){
  const valid=Number.isFinite(low)&&Number.isFinite(high)&&low>=0&&high>=0&&(!high||high>=low);
  $('budgetError').textContent=valid?'':'Maximum must be at least the minimum.';$('budgetApply').disabled=!valid;
  const left=Math.min(low,ceiling)/ceiling*100,right=high?Math.min(high,ceiling)/ceiling*100:100;
  $('budgetLowSlider').value=Math.min(low,ceiling);$('budgetHighSlider').value=high?Math.min(high,ceiling):ceiling;
  $('budgetLowSlider').setAttribute('aria-valuetext',price(low));$('budgetHighSlider').setAttribute('aria-valuetext',high?price(high):'No upper limit');
  $('budgetLowSlider').style.zIndex=left>=95?'5':'3';
  $('budgetSelected').style.left=left+'%';$('budgetSelected').style.width=Math.max(0,right-left)+'%';
  $('budgetLowLabel').textContent=price(low);$('budgetHighLabel').textContent=high?price(high):price(ceiling)+'+';
  budgetDialog.querySelectorAll('[data-bin]').forEach(bar=>{const midpoint=(Number(bar.dataset.bin)+.5)*ceiling/24;bar.classList.toggle('selected',midpoint>=low&&(!high||midpoint<=high));});
  const current=$('budgetFilter').value;const opt=document.createElement('option');opt.value=low+':'+high;$('budgetFilter').appendChild(opt);$('budgetFilter').value=opt.value;
  const count=valid?filteredCards().length:0;opt.remove();$('budgetFilter').value=current;
  $('budgetApply').textContent=`Show ${count} card${count===1?'':'s'}`;
 }
 $('budgetMin').oninput=()=>{low=Number($('budgetMin').value);paint();};$('budgetMax').oninput=()=>{high=Number($('budgetMax').value);paint();};
 $('budgetLowSlider').oninput=e=>{low=Math.min(Number(e.target.value),high||ceiling);$('budgetMin').value=low;paint();};
 $('budgetHighSlider').oninput=e=>{const v=Math.max(Number(e.target.value),Math.min(low,ceiling));high=v===ceiling?0:v;if(low>ceiling)low=ceiling;$('budgetMin').value=low;$('budgetMax').value=high||'';paint();};
 $('budgetReset').onclick=()=>{low=high=0;$('budgetMin').value='';$('budgetMax').value='';paint();};
 $('budgetApply').onclick=()=>{
  const select=$('budgetFilter');select.innerHTML='<option value="all">Any price</option>';
  if(low||high){const opt=document.createElement('option');opt.value=low+':'+high;opt.textContent=high?(low?price(low)+' – '+price(high):'Up to '+price(high)):price(low)+'+';select.appendChild(opt);select.value=opt.value;}
  refreshBudgetButton();renderGrid();closeDialog(budgetDialog);
 };
 paint();openDialog(budgetDialog);
};
