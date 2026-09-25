const SET_ALIASES = {
  "EX Delta Species": "Delta Species",
  "EX Emerald": "Emerald",
  "EX Holon Phantoms": "Holon Phantoms",
  "EX Ruby & Sapphire": "Ruby & Sapphire",
  "EX Unseen Forces": "Unseen Forces",
  "EX Crystal Guardians": "Crystal Guardians",
  "EX FireRed & LeafGreen": "FireRed & LeafGreen",
  "EX Legend Maker": "Legend Maker",
  "EX Team Rocket Returns": "Team Rocket Returns",
  "HeartGold SoulSilver": "HeartGold SoulSilver Promo",
  "HeartGold SoulSilver Promo (HGSS20)": "HeartGold SoulSilver Promo"
};

function baseSetName(setString){
  const base = setString.split(' \u00b7 ')[0].trim();
  return SET_ALIASES[base] || base;
}

const HOLO_TOKEN_RE = /^(non[ -]?holo|reverse\s+holo|holo|swirl(\s+holo)?|half\s+swirl(\s+holo)?|triple\s+swirl(\s+holo)?|double\s+swirl(\s+holo)?|full\s+holo\s+bleed)(\s+promo)?$/i;

// Swirl variants (half/triple/double swirl, "swirl holo", etc.) all collapse down
// to the single word "Swirl" — the swirl indicator lives in the name row, not here.
function normalizeHoloLabel(tok){
  const lower = tok.replace(/\s+/g,' ').trim().toLowerCase();
  if(/swirl/.test(lower)) return 'Swirl';
  if(lower === 'full holo bleed') return 'Holo';
  if(/^non[ -]?holo$/.test(lower)) return 'Non-Holo';
  if(lower === 'reverse holo') return 'Reverse Holo';
  if(lower === 'holo') return 'Holo';
  return tok;
}

function parseCardName(raw){
  let name = raw;
  let copyNum = null;
  const holoLabels = [];
  const extras = [];

  const suffixMatch = name.match(/\s*(?:[\u2014-]\s*)?Copy\s*#?\s*(\d+)\s*$/i);
  if(suffixMatch){
    copyNum = suffixMatch[1];
    name = name.slice(0, suffixMatch.index);
  }

  name = name.replace(/\(([^)]+)\)/g, (m, inner) => {
    inner.split(',').map(s => s.trim()).filter(Boolean).forEach(tok => {
      const copyM = tok.match(/^Copy\s*#(\d+)$/i);
      if(copyM){ copyNum = copyM[1]; return; }
      if(HOLO_TOKEN_RE.test(tok)){
        holoLabels.push(normalizeHoloLabel(tok.replace(/\s+promo$/i,'')));
        if(/\s+promo$/i.test(tok)) extras.push('Promo');
        return;
      }
      extras.push(tok);
    });
    return '';
  });

  name = name.replace(/\s{2,}/g, ' ').trim();
  if(extras.length) name += ` (${extras.join(', ')})`;
  if(copyNum) name += ` (Copy #${copyNum})`;

  const seen = new Set();
  const dedupedLabels = holoLabels.filter(l => (seen.has(l) ? false : (seen.add(l), true)));

  return { displayName: name, holoLabels: dedupedLabels, copyNum: copyNum ? parseInt(copyNum, 10) : null };
}

// The grey line under the name shows just "Set Name" or "Set Name · Holo" / "Set Name · Reverse Holo" —
// pulled from whichever of the name or the raw set string mentions the finish.
function financeType(card, holoLabels){
  const hay = (holoLabels.join(' ') + ' ' + card.set).toLowerCase();
  if(/\bnon[ -]?holo\b/.test(hay)) return 'Non-Holo';
  if(/reverse\s*holo/.test(hay)) return 'Reverse Holo';
  if(/\bholo\b/.test(hay)) return 'Holo';
  return null;
}

function setLineHtml(card, holoLabels){
  const finish = financeType(card, holoLabels);
  const base = baseSetName(card.set);
  return finish ? `${base} · ${finish}` : base;
}

// A card "has swirl" if the swirl foil pattern is mentioned anywhere on it, not just the name.
function cardHasSwirl(card){
  return /swirl/i.test(card.name) || /swirl/i.test(card.set) || /swirl/i.test(card.description);
}

// Wrap every mention of "swirl" in fun rainbow-gradient text for the description.
function highlightSwirl(text){
  return text.replace(/swirl/gi, m => `<span class="swirl-word">${m}</span>`);
}

function cardIdentityKey(card){
  const { displayName } = parseCardName(card.name);
  return displayName.replace(/\s*\(Copy #\d+\)$/, '').trim();
}

function cardCopyNum(card){
  return parseCardName(card.name).copyNum || 0;
}

function levenshtein(a, b){
  const m = a.length, n = b.length;
  if(m === 0) return n;
  if(n === 0) return m;
  let prev = Array.from({length: n + 1}, (_, i) => i);
  for(let i = 1; i <= m; i++){
    const row = [i];
    for(let j = 1; j <= n; j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      row[j] = Math.min(row[j-1] + 1, prev[j] + 1, prev[j-1] + cost);
    }
    prev = row;
  }
  return prev[n];
}


// Buyer wording for both bundled and live listing descriptions.
function buyerDescription(value){
 return String(value||'').replace(/\b(in (?:the|a) )([^.!?]*?)\s+finish\b/gi, '$1$2').replace(/\bfinish\b/gi,'').replace(/ +([,.;:!?])/g,'$1').replace(/ {2,}/g,' ').trim();
}



// Small cached browsing images; the original remains available in the inspector.
function browsePhoto(source,width=480){
 if(!source||!/^(?:\.?\/)?images\/|^\/\.netlify\/functions\/binder-api\?resource=photo&/.test(source))return source;
 const path=source.startsWith('/')?source:'/'+source.replace(/^\.\//,'');
 return '/.netlify/images?'+new URLSearchParams({url:path,w:String(width),q:'78',fit:'contain'});
}
function browseImageAttributes(source,width=480){
 const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return 'src="'+safe(browsePhoto(source,width))+'" data-original="'+safe(source)+'"';
}
if(typeof document!=='undefined')document.addEventListener('error',event=>{
 const img=event.target;
 if(img.tagName==='IMG'&&img.dataset.original&&!img.dataset.originalFallback){
  img.dataset.originalFallback='true';img.src=img.dataset.original;event.stopImmediatePropagation();
 }
},true);
