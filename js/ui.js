/* === UI: Nav, Auth, Particles, Home, Lightbox, Profile === */
let currentProfileIdx=0;
let rosterDateFilter=null;var calPending={};
let gridSort='name',gridSortDir='asc';
try{const _ss=localStorage.getItem('ginza_sort');if(_ss){const _sp=JSON.parse(_ss);if(_sp.s)gridSort=_sp.s;if(_sp.d)gridSortDir=_sp.d}}catch(e){}
function _persistSort(){try{localStorage.setItem('ginza_sort',JSON.stringify({s:gridSort,d:gridSortDir}))}catch(e){}}
let ngIdx=0,ngList=[];
let _savedScrollY=0;
let _countdownInterval=null;

/* ── Compare Feature State ── */
let compareSelected=[];
const COMPARE_MAX=5;
function isCompareSelected(name){return compareSelected.includes(name)}
function toggleCompare(name){if(!loggedIn){showToast('Please log in to use compare','info');return false}const idx=compareSelected.indexOf(name);if(idx>=0){compareSelected.splice(idx,1)}else{if(compareSelected.length>=COMPARE_MAX){showToast('Maximum '+COMPARE_MAX+' girls for comparison','error');return false}compareSelected.push(name)}updateCompareBar();updateCompareButtons();return true}
function clearCompare(){compareSelected=[];updateCompareBar();updateCompareButtons()}
function updateCompareBar(){const bar=document.getElementById('compareBar');if(!bar)return;const count=compareSelected.length;const prev=parseInt(bar.dataset.prevCount||'0');bar.dataset.prevCount=count;document.getElementById('compareBarCount').textContent=count;bar.classList.toggle('visible',count>0);if(count>prev&&count>0){bar.classList.remove('compare-pulse');void bar.offsetWidth;bar.classList.add('compare-pulse');setTimeout(()=>bar.classList.remove('compare-pulse'),600)}const openBtn=document.getElementById('compareOpen');if(openBtn){openBtn.disabled=count<2;openBtn.style.opacity=count<2?'.4':'1';openBtn.style.pointerEvents=count<2?'none':'auto'}}
function updateCompareButtons(){const cnt=compareSelected.length;document.querySelectorAll('.card-compare').forEach(btn=>{const name=btn.dataset.compareName;const sel=compareSelected.includes(name);btn.classList.toggle('active',sel);btn.title=sel?'Remove from compare':'Add to compare';const badge=btn.querySelector('.compare-badge');if(badge){badge.textContent=cnt+'/'+COMPARE_MAX;badge.style.display=sel&&cnt>0?'':'none'}})}

/* ── Shared Filter State (resets on refresh) ── */
let sharedFilters={nameSearch:'',country:[],ageMin:null,ageMax:null,bodyMin:null,bodyMax:null,heightMin:null,heightMax:null,cupSize:null,val1Min:null,val1Max:null,val2Min:null,val2Max:null,val3Min:null,val3Max:null,experience:null,ratingMin:null,labels:[]};

function applySharedFilters(list){
let f=list;
if(sharedFilters.nameSearch){const q=sharedFilters.nameSearch.toLowerCase();f=f.filter(g=>g.name&&g.name.toLowerCase().includes(q))}
if(sharedFilters.country.length)f=f.filter(g=>{const gc=g.country;if(Array.isArray(gc))return sharedFilters.country.every(c=>gc.includes(c));return sharedFilters.country.length===1&&sharedFilters.country.includes(gc)});
if(sharedFilters.ageMin!=null)f=f.filter(g=>{const v=parseFloat(g.age);return !isNaN(v)&&v>=sharedFilters.ageMin});
if(sharedFilters.ageMax!=null)f=f.filter(g=>{const v=parseFloat(g.age);return !isNaN(v)&&v<=sharedFilters.ageMax});
if(sharedFilters.bodyMin!=null)f=f.filter(g=>{const v=parseFloat(g.body);return !isNaN(v)&&v>=sharedFilters.bodyMin});
if(sharedFilters.bodyMax!=null)f=f.filter(g=>{const v=parseFloat(g.body);return !isNaN(v)&&v<=sharedFilters.bodyMax});
if(sharedFilters.heightMin!=null)f=f.filter(g=>{const v=parseFloat(g.height);return !isNaN(v)&&v>=sharedFilters.heightMin});
if(sharedFilters.heightMax!=null)f=f.filter(g=>{const v=parseFloat(g.height);return !isNaN(v)&&v<=sharedFilters.heightMax});
if(sharedFilters.cupSize)f=f.filter(g=>g.cup&&g.cup.toUpperCase().includes(sharedFilters.cupSize.toUpperCase()));
if(sharedFilters.val1Min!=null)f=f.filter(g=>{const v=parseFloat(g.val1);return !isNaN(v)&&v>=sharedFilters.val1Min});
if(sharedFilters.val1Max!=null)f=f.filter(g=>{const v=parseFloat(g.val1);return !isNaN(v)&&v<=sharedFilters.val1Max});
if(sharedFilters.val2Min!=null)f=f.filter(g=>{const v=parseFloat(g.val2);return !isNaN(v)&&v>=sharedFilters.val2Min});
if(sharedFilters.val2Max!=null)f=f.filter(g=>{const v=parseFloat(g.val2);return !isNaN(v)&&v<=sharedFilters.val2Max});
if(sharedFilters.val3Min!=null)f=f.filter(g=>{const v=parseFloat(g.val3);return !isNaN(v)&&v>=sharedFilters.val3Min});
if(sharedFilters.val3Max!=null)f=f.filter(g=>{const v=parseFloat(g.val3);return !isNaN(v)&&v<=sharedFilters.val3Max});
if(sharedFilters.labels.length)f=f.filter(g=>g.labels&&sharedFilters.labels.every(l=>g.labels.includes(l)));
if(sharedFilters.experience)f=f.filter(g=>g.exp===sharedFilters.experience);
if(sharedFilters.ratingMin!=null)f=f.filter(g=>{const rvs=g.reviews||[];if(!rvs.length)return false;const avg=rvs.reduce((s,r)=>s+r.rating,0)/rvs.length;return avg>=sharedFilters.ratingMin});
return f}

function hasActiveFilters(){return !!(sharedFilters.nameSearch||sharedFilters.country.length||sharedFilters.ageMin!=null||sharedFilters.ageMax!=null||sharedFilters.bodyMin!=null||sharedFilters.bodyMax!=null||sharedFilters.heightMin!=null||sharedFilters.heightMax!=null||sharedFilters.cupSize||sharedFilters.val1Min!=null||sharedFilters.val1Max!=null||sharedFilters.val2Min!=null||sharedFilters.val2Max!=null||sharedFilters.val3Min!=null||sharedFilters.val3Max!=null||sharedFilters.experience||sharedFilters.ratingMin!=null||sharedFilters.labels.length)}
function countActiveFilters(){let n=0;if(sharedFilters.nameSearch)n++;if(sharedFilters.country.length)n++;if(sharedFilters.ageMin!=null||sharedFilters.ageMax!=null)n++;if(sharedFilters.bodyMin!=null||sharedFilters.bodyMax!=null)n++;if(sharedFilters.heightMin!=null||sharedFilters.heightMax!=null)n++;if(sharedFilters.cupSize)n++;if(sharedFilters.val1Min!=null||sharedFilters.val1Max!=null||sharedFilters.val2Min!=null||sharedFilters.val2Max!=null||sharedFilters.val3Min!=null||sharedFilters.val3Max!=null)n++;if(sharedFilters.experience)n++;if(sharedFilters.ratingMin!=null)n++;if(sharedFilters.labels.length)n++;return n}

function clearAllFilters(){sharedFilters={nameSearch:'',country:[],ageMin:null,ageMax:null,bodyMin:null,bodyMax:null,heightMin:null,heightMax:null,cupSize:null,val1Min:null,val1Max:null,val2Min:null,val2Max:null,val3Min:null,val3Max:null,experience:null,ratingMin:null,labels:[]}}

function filtersToQuery(){const p=new URLSearchParams();if(sharedFilters.nameSearch)p.set('search',sharedFilters.nameSearch);if(sharedFilters.country.length)p.set('country',sharedFilters.country.join(','));if(sharedFilters.ageMin!=null)p.set('ageMin',sharedFilters.ageMin);if(sharedFilters.ageMax!=null)p.set('ageMax',sharedFilters.ageMax);if(sharedFilters.bodyMin!=null)p.set('bodyMin',sharedFilters.bodyMin);if(sharedFilters.bodyMax!=null)p.set('bodyMax',sharedFilters.bodyMax);if(sharedFilters.heightMin!=null)p.set('heightMin',sharedFilters.heightMin);if(sharedFilters.heightMax!=null)p.set('heightMax',sharedFilters.heightMax);if(sharedFilters.cupSize)p.set('cup',sharedFilters.cupSize);if(sharedFilters.val1Min!=null)p.set('v1Min',sharedFilters.val1Min);if(sharedFilters.val1Max!=null)p.set('v1Max',sharedFilters.val1Max);if(sharedFilters.val2Min!=null)p.set('v2Min',sharedFilters.val2Min);if(sharedFilters.val2Max!=null)p.set('v2Max',sharedFilters.val2Max);if(sharedFilters.val3Min!=null)p.set('v3Min',sharedFilters.val3Min);if(sharedFilters.val3Max!=null)p.set('v3Max',sharedFilters.val3Max);if(sharedFilters.experience)p.set('exp',sharedFilters.experience);if(sharedFilters.labels.length)p.set('labels',sharedFilters.labels.join(','));if(sharedFilters.ratingMin!=null)p.set('rating',sharedFilters.ratingMin);if(gridSort!=='name')p.set('sort',gridSort);if(gridSortDir!=='asc')p.set('sortDir',gridSortDir);return p}

function queryToFilters(){const p=new URLSearchParams(window.location.search);if(p.has('search'))sharedFilters.nameSearch=p.get('search');if(p.has('country'))sharedFilters.country=p.get('country').split(',').filter(Boolean);if(p.has('ageMin')){const v=parseFloat(p.get('ageMin'));if(!isNaN(v))sharedFilters.ageMin=v}if(p.has('ageMax')){const v=parseFloat(p.get('ageMax'));if(!isNaN(v))sharedFilters.ageMax=v}if(p.has('bodyMin')){const v=parseFloat(p.get('bodyMin'));if(!isNaN(v))sharedFilters.bodyMin=v}if(p.has('bodyMax')){const v=parseFloat(p.get('bodyMax'));if(!isNaN(v))sharedFilters.bodyMax=v}if(p.has('heightMin')){const v=parseFloat(p.get('heightMin'));if(!isNaN(v))sharedFilters.heightMin=v}if(p.has('heightMax')){const v=parseFloat(p.get('heightMax'));if(!isNaN(v))sharedFilters.heightMax=v}if(p.has('cup'))sharedFilters.cupSize=p.get('cup');if(p.has('v1Min')){const v=parseFloat(p.get('v1Min'));if(!isNaN(v))sharedFilters.val1Min=v}if(p.has('v1Max')){const v=parseFloat(p.get('v1Max'));if(!isNaN(v))sharedFilters.val1Max=v}if(p.has('v2Min')){const v=parseFloat(p.get('v2Min'));if(!isNaN(v))sharedFilters.val2Min=v}if(p.has('v2Max')){const v=parseFloat(p.get('v2Max'));if(!isNaN(v))sharedFilters.val2Max=v}if(p.has('v3Min')){const v=parseFloat(p.get('v3Min'));if(!isNaN(v))sharedFilters.val3Min=v}if(p.has('v3Max')){const v=parseFloat(p.get('v3Max'));if(!isNaN(v))sharedFilters.val3Max=v}if(p.has('exp'))sharedFilters.experience=p.get('exp');if(p.has('labels'))sharedFilters.labels=p.get('labels').split(',').filter(Boolean);if(p.has('rating')){const v=parseFloat(p.get('rating'));if(!isNaN(v))sharedFilters.ratingMin=v}if(p.has('sort')){const VALID=['name','newest','age','body','height','cup','lastSeen'];const s=p.get('sort');if(VALID.includes(s))gridSort=s}if(p.has('sortDir')){const d=p.get('sortDir');if(d==='asc'||d==='desc')gridSortDir=d}}

function pushFiltersToURL(){const q=filtersToQuery();const qs=q.toString();const newUrl=window.location.pathname+(qs?'?'+qs:'');history.replaceState({path:window.location.pathname},document.title,newUrl)}

function getDataRange(field,prefix){
const namedOnly=girls.filter(g=>g.name&&String(g.name).trim().length>0);
const nums=namedOnly.map(g=>parseFloat(g[field])).filter(n=>!isNaN(n)&&n>0);
if(!nums.length)return{min:'Min',max:'Max',rawMin:null,rawMax:null};
const p=prefix||'';
return{min:p+Math.min(...nums),max:p+Math.max(...nums),rawMin:Math.min(...nums),rawMax:Math.max(...nums)}}

function makeRangeSection(title,minKey,maxKey,dataField,prefix){
const sec=document.createElement('div');sec.className='fp-section';
const r=getDataRange(dataField,prefix);
const minVal=sharedFilters[minKey]!=null?sharedFilters[minKey]:(r.rawMin!=null?r.rawMin:'');
const maxVal=sharedFilters[maxKey]!=null?sharedFilters[maxKey]:(r.rawMax!=null?r.rawMax:'');
const minAttr=r.rawMin!=null?` min="${r.rawMin}"`:'';
const maxAttr=r.rawMax!=null?` max="${r.rawMax}"`:'';
sec.innerHTML=`<div class="fp-title">${title}</div><div class="fp-range"><div class="fp-range-row"><input class="fp-range-input" type="number" placeholder="${r.min}" data-fkey="${minKey}" data-default="${r.rawMin!=null?r.rawMin:''}"${minAttr}${maxAttr} value="${minVal}"><span class="fp-range-sep">${t('fp.rangeSep')}</span><input class="fp-range-input" type="number" placeholder="${r.max}" data-fkey="${maxKey}" data-default="${r.rawMax!=null?r.rawMax:''}"${minAttr}${maxAttr} value="${maxVal}"></div></div>`;
return sec}

function renderFilterPane(containerId){
const pane=document.getElementById(containerId);if(!pane)return;
pane.innerHTML='';
const namedGirls=girls.filter(g=>g.name&&String(g.name).trim().length>0);
const countries=[...new Set(namedGirls.flatMap(g=>Array.isArray(g.country)?g.country:[g.country]).filter(Boolean))].sort();
const cups=[...new Set(namedGirls.map(g=>g.cup).filter(Boolean))].sort();
const exps=[...new Set(namedGirls.map(g=>g.exp).filter(Boolean))].sort();
const labels=[...new Set(namedGirls.flatMap(g=>g.labels||[]).filter(Boolean))].sort();

/* Sort section at top of filter pane */
{const sec=document.createElement('div');sec.className='fp-section';
const sorts=[{key:'name',label:t('sort.name')},{key:'newest',label:t('sort.dateAdded')},{key:'age',label:t('sort.age')},{key:'body',label:t('sort.size')},{key:'height',label:t('sort.height')},{key:'cup',label:t('sort.cup')},{key:'lastSeen',label:t('sort.lastSeen')}];
const dirLabel=gridSortDir==='asc'?'ASC ↑':'DESC ↓';
sec.innerHTML=`<div class="fp-sort-header"><div class="fp-title">${t('sort.sortBy')}</div><button class="fp-sort-dir-btn">${dirLabel}</button></div><div class="fp-options fp-sort-options"></div>`;
pane.appendChild(sec);
sec.querySelector('.fp-sort-dir-btn').onclick=()=>{gridSortDir=gridSortDir==='asc'?'desc':'asc';_persistSort();onFiltersChanged()};
const wrap=sec.querySelector('.fp-sort-options');
sorts.forEach(s=>{const btn=document.createElement('button');btn.className='fp-option'+(gridSort===s.key?' active':'');
btn.innerHTML=`<span class="fp-check">${gridSort===s.key?'✓':''}</span>${s.label}`;
btn.onclick=()=>{if(gridSort===s.key){gridSortDir=gridSortDir==='asc'?'desc':'asc'}else{gridSort=s.key;gridSortDir=(s.key==='newest'||s.key==='lastSeen')?'desc':'asc'}_persistSort();onFiltersChanged()};
wrap.appendChild(btn)});
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}))}

/* Profiles search */
if(namedGirls.length){
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.search')}</div><input class="fp-range-input" type="text" data-role="name-search" placeholder="${t('ui.search')}" style="text-align:left;padding:6px 10px;width:100%">`;
pane.appendChild(sec);
const searchInp=sec.querySelector('[data-role="name-search"]');
searchInp.value=sharedFilters.nameSearch||'';
let debounce;
searchInp.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>{sharedFilters.nameSearch=searchInp.value.trim();onFiltersChanged()},300)});
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}))}

/* Rating */
{pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.rating')}</div><div class="fp-rating-options"></div>`;
pane.appendChild(sec);
const wrap=sec.querySelector('.fp-rating-options');
for(let star=5;star>=1;star--){
const btn=document.createElement('button');btn.className='fp-option fp-rating-opt'+(sharedFilters.ratingMin===star?' active':'');
const cnt=namedGirls.filter(g=>{const rvs=g.reviews||[];if(!rvs.length)return false;const avg=rvs.reduce((s,r)=>s+r.rating,0)/rvs.length;return avg>=star}).length;
btn.innerHTML=`<span class="fp-check">${sharedFilters.ratingMin===star?'✓':''}</span><span class="fp-rating-stars">${renderStarsStatic(star)}</span><span class="fp-rating-label">& up</span><span class="fp-count">${cnt}</span>`;
btn.onclick=()=>{sharedFilters.ratingMin=sharedFilters.ratingMin===star?null:star;onFiltersChanged()};
wrap.appendChild(btn)}}

/* Country */
if(countries.length){
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.country')}</div><div class="fp-options"></div>`;
pane.appendChild(sec);
const wrap=sec.querySelector('.fp-options');
countries.forEach(c=>{
const btn=document.createElement('button');btn.className='fp-option'+(sharedFilters.country.includes(c)?' active':'');
const cnt=namedGirls.filter(g=>{const gc=g.country;return Array.isArray(gc)?gc.includes(c):gc===c}).length;
btn.innerHTML=`<span class="fp-check">${sharedFilters.country.includes(c)?'✓':''}</span>${c}<span class="fp-count">${cnt}</span>`;
btn.onclick=()=>{if(sharedFilters.country.includes(c))sharedFilters.country=sharedFilters.country.filter(x=>x!==c);else sharedFilters.country.push(c);onFiltersChanged()};
wrap.appendChild(btn)})}

/* Age */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.age'),'ageMin','ageMax','age'));

/* Body Size */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.bodySize'),'bodyMin','bodyMax','body'));

/* Height */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.height'),'heightMin','heightMax','height'));

/* Cup Size */
if(cups.length){
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.cupSize')}</div><div class="fp-options"></div>`;
pane.appendChild(sec);
const wrap=sec.querySelector('.fp-options');
cups.forEach(c=>{
const btn=document.createElement('button');btn.className='fp-option'+(sharedFilters.cupSize===c?' active':'');
const cnt=namedGirls.filter(g=>g.cup===c).length;
btn.innerHTML=`<span class="fp-check">${sharedFilters.cupSize===c?'✓':''}</span>${c}<span class="fp-count">${cnt}</span>`;
btn.onclick=()=>{sharedFilters.cupSize=sharedFilters.cupSize===c?null:c;onFiltersChanged()};
wrap.appendChild(btn)})}

/* Rates 30 mins */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.rates30'),'val1Min','val1Max','val1','$'));

/* Rates 45 mins */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.rates45'),'val2Min','val2Max','val2','$'));

/* Rates 60 mins */
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
pane.appendChild(makeRangeSection(t('fp.rates60'),'val3Min','val3Max','val3','$'));

/* Experience */
if(exps.length){
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.experience')}</div><div class="fp-options"></div>`;
pane.appendChild(sec);
const wrap=sec.querySelector('.fp-options');
exps.forEach(e=>{
const btn=document.createElement('button');btn.className='fp-option'+(sharedFilters.experience===e?' active':'');
const cnt=namedGirls.filter(g=>g.exp===e).length;
const eLabel=e==='Experienced'?t('exp.experienced'):e==='Inexperienced'?t('exp.inexperienced'):e;
btn.innerHTML=`<span class="fp-check">${sharedFilters.experience===e?'✓':''}</span>${eLabel}<span class="fp-count">${cnt}</span>`;
btn.onclick=()=>{sharedFilters.experience=sharedFilters.experience===e?null:e;onFiltersChanged()};
wrap.appendChild(btn)})}

/* Labels */
if(labels.length){
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
const sec=document.createElement('div');sec.className='fp-section';
sec.innerHTML=`<div class="fp-title">${t('fp.labels')}</div><div class="fp-options"></div>`;
pane.appendChild(sec);
const wrap=sec.querySelector('.fp-options');
labels.forEach(l=>{
const isActive=sharedFilters.labels.includes(l);
const btn=document.createElement('button');btn.className='fp-option'+(isActive?' active':'');
const cnt=namedGirls.filter(g=>g.labels&&g.labels.includes(l)).length;
btn.innerHTML=`<span class="fp-check">${isActive?'✓':''}</span>${l}<span class="fp-count">${cnt}</span>`;
btn.onclick=()=>{if(isActive)sharedFilters.labels=sharedFilters.labels.filter(x=>x!==l);else sharedFilters.labels.push(l);onFiltersChanged()};
wrap.appendChild(btn)})}

/* Clear */
if(hasActiveFilters()){
pane.appendChild(Object.assign(document.createElement('div'),{className:'fp-divider'}));
const clr=document.createElement('button');clr.className='fp-clear';clr.textContent=t('fp.clearAll');
clr.onclick=()=>{clearAllFilters();onFiltersChanged()};
pane.appendChild(clr)}

/* Bind range inputs */
pane.querySelectorAll('.fp-range-input').forEach(inp=>{
let debounce;
function clampAndApply(){const key=inp.dataset.fkey;let val=inp.value.trim();if(val===''){sharedFilters[key]=null}else{let num=parseFloat(val);if(isNaN(num)){sharedFilters[key]=null;return}const lo=inp.hasAttribute('min')?parseFloat(inp.min):null;const hi=inp.hasAttribute('max')?parseFloat(inp.max):null;if(lo!=null&&num<lo){num=lo;inp.value=num}if(hi!=null&&num>hi){num=hi;inp.value=num}const def=inp.dataset.default;sharedFilters[key]=(def!==''&&num===parseFloat(def))?null:num}onFiltersChanged()}
inp.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(clampAndApply,400)});
inp.addEventListener('blur',clampAndApply)})}
function renderActiveFilterChips(){
const bar=document.getElementById('activeFilterChips');if(!bar)return;
const chips=[];
if(sharedFilters.nameSearch)chips.push({label:'🔍 '+sharedFilters.nameSearch,rm:()=>{sharedFilters.nameSearch='';onFiltersChanged()}});
sharedFilters.country.forEach(c=>chips.push({label:c,rm:()=>{sharedFilters.country=sharedFilters.country.filter(x=>x!==c);onFiltersChanged()}}));
if(sharedFilters.ageMin!=null||sharedFilters.ageMax!=null)chips.push({label:'Age '+(sharedFilters.ageMin??'')+'–'+(sharedFilters.ageMax??''),rm:()=>{sharedFilters.ageMin=null;sharedFilters.ageMax=null;onFiltersChanged()}});
if(sharedFilters.bodyMin!=null||sharedFilters.bodyMax!=null)chips.push({label:'Body '+(sharedFilters.bodyMin??'')+'–'+(sharedFilters.bodyMax??''),rm:()=>{sharedFilters.bodyMin=null;sharedFilters.bodyMax=null;onFiltersChanged()}});
if(sharedFilters.heightMin!=null||sharedFilters.heightMax!=null)chips.push({label:'Height '+(sharedFilters.heightMin??'')+'–'+(sharedFilters.heightMax??''),rm:()=>{sharedFilters.heightMin=null;sharedFilters.heightMax=null;onFiltersChanged()}});
if(sharedFilters.cupSize)chips.push({label:'Cup '+sharedFilters.cupSize,rm:()=>{sharedFilters.cupSize=null;onFiltersChanged()}});
if(sharedFilters.val1Min!=null||sharedFilters.val1Max!=null)chips.push({label:'30min '+(sharedFilters.val1Min??'')+'–'+(sharedFilters.val1Max??''),rm:()=>{sharedFilters.val1Min=null;sharedFilters.val1Max=null;onFiltersChanged()}});
if(sharedFilters.val2Min!=null||sharedFilters.val2Max!=null)chips.push({label:'45min '+(sharedFilters.val2Min??'')+'–'+(sharedFilters.val2Max??''),rm:()=>{sharedFilters.val2Min=null;sharedFilters.val2Max=null;onFiltersChanged()}});
if(sharedFilters.val3Min!=null||sharedFilters.val3Max!=null)chips.push({label:'60min '+(sharedFilters.val3Min??'')+'–'+(sharedFilters.val3Max??''),rm:()=>{sharedFilters.val3Min=null;sharedFilters.val3Max=null;onFiltersChanged()}});
if(sharedFilters.experience)chips.push({label:sharedFilters.experience,rm:()=>{sharedFilters.experience=null;onFiltersChanged()}});
if(sharedFilters.ratingMin!=null)chips.push({label:'★ '+sharedFilters.ratingMin+'+ stars',rm:()=>{sharedFilters.ratingMin=null;onFiltersChanged()}});
sharedFilters.labels.forEach(l=>chips.push({label:l,rm:()=>{sharedFilters.labels=sharedFilters.labels.filter(x=>x!==l);onFiltersChanged()}}));
bar.innerHTML='';
if(!chips.length){bar.style.display='none';return}
bar.style.display='flex';
chips.forEach(c=>{const ch=document.createElement('button');ch.className='active-filter-chip';ch.innerHTML=c.label+' <span class="chip-x">×</span>';ch.onclick=c.rm;bar.appendChild(ch)});
const clr=document.createElement('button');clr.className='active-filter-chip chip-clear-all';clr.textContent=t('fp.clearAll');clr.onclick=()=>{clearAllFilters();onFiltersChanged()};bar.appendChild(clr);
}
function _captureGridPositions(gridEl){
  if(!gridEl)return{};
  const map={};
  gridEl.querySelectorAll('.girl-card').forEach(c=>{
    const name=c.querySelector('.card-name');
    if(name&&name.textContent){const r=c.getBoundingClientRect();map[name.textContent.trim()]={left:r.left,top:r.top,width:r.width,height:r.height,el:c}}
  });return map}
function _animateFlip(gridEl,oldPos){
  if(!gridEl||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  gridEl.querySelectorAll('.girl-card').forEach(c=>{
    const name=c.querySelector('.card-name');
    if(!name)return;
    const key=name.textContent.trim();const prev=oldPos[key];
    const cur=c.getBoundingClientRect();
    if(prev){
      const dx=prev.left-cur.left;const dy=prev.top-cur.top;
      if(Math.abs(dx)>1||Math.abs(dy)>1){
        c.style.transform='translate('+dx+'px,'+dy+'px)';c.style.transition='none';
        requestAnimationFrame(()=>{c.classList.add('flip-move');c.style.transform='';c.style.transition='';
          const onEnd=()=>{c.classList.remove('flip-move');c.removeEventListener('transitionend',onEnd)};
          c.addEventListener('transitionend',onEnd)});
      }
    }else{c.classList.add('flip-enter');
      const onEnd=()=>{c.classList.remove('flip-enter');c.removeEventListener('animationend',onEnd)};
      c.addEventListener('animationend',onEnd)}
    delete oldPos[key]});
}
function onFiltersChanged(){
const hadFocus=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.role==='name-search';
const cursorPos=hadFocus?document.activeElement.selectionStart:0;
const focusPane=hadFocus?document.activeElement.closest('.filter-pane'):null;
const focusPaneId=focusPane?focusPane.id:null;
const _oldGrid=_captureGridPositions(document.getElementById('girlsGrid'));
const _oldRoster=_captureGridPositions(document.getElementById('rosterGrid'));
renderFilterPane('sharedFilterPane');
renderFilters();renderGrid();renderRoster();
_animateFlip(document.getElementById('girlsGrid'),_oldGrid);
_animateFlip(document.getElementById('rosterGrid'),_oldRoster);
updateFilterToggle();pushFiltersToURL();
if(document.getElementById('calendarPage').classList.contains('active'))renderCalendar();
if(document.getElementById('favoritesPage').classList.contains('active'))renderFavoritesGrid();
if(document.getElementById('bookingsPage').classList.contains('active'))renderBookingsGrid();
if(document.getElementById('vacationPage').classList.contains('active'))renderVacationTable();
if(document.getElementById('profilePage').classList.contains('active')){const fi=getNamedGirlIndices();if(fi.length){if(!fi.includes(currentProfileIdx))showProfile(fi[0]);else{renderProfileNav(currentProfileIdx)}}else{document.getElementById('profileContent').innerHTML='<button class="back-btn" id="backBtn"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Back</button><div class="empty-msg">No profiles match the current filters</div>';document.getElementById('backBtn').onclick=()=>{if(window.history.length>1){window.history.back()}else{showPage(profileReturnPage)}}}}
if(focusPaneId){const restored=document.getElementById(focusPaneId);if(restored){const inp=restored.querySelector('[data-role="name-search"]');if(inp){inp.focus();inp.setSelectionRange(cursorPos,cursorPos)}}};renderActiveFilterChips()}
const allPages=['homePage','rosterPage','listPage','favoritesPage','valuePage','employmentPage','calendarPage','analyticsPage','profileDbPage','bookingsPage','vacationPage','profilePage'].map(id=>document.getElementById(id));

function showPage(id){
resetOgMeta();if(document.getElementById('calendarPage').classList.contains('active')&&id!=='calendarPage'){flushCalSave();let s=false;for(const n in calPending)for(const dt in calPending[n])if(calPending[n][dt]&&calData[n]&&calData[n][dt]){delete calData[n][dt];s=true}if(s){saveCalData();renderRoster();renderGrid()}calPending={}}
const prev=document.querySelector('.page.active');const next=document.getElementById(id);const _ec=['page-enter','slide-enter-right','slide-enter-left'];next.classList.remove(..._ec);if(prev&&prev!==next){const fromProfile=prev.id==='profilePage';const exitCls=fromProfile?'slide-exit-right':'page-exit';const enterCls=fromProfile?'slide-enter-left':'page-enter';prev.classList.remove('active',..._ec);prev.classList.add(exitCls);const onDone=()=>{prev.classList.remove(exitCls);prev.removeEventListener('animationend',onDone)};prev.addEventListener('animationend',onDone);setTimeout(()=>{prev.classList.remove(exitCls)},400);void next.offsetWidth;next.classList.add(enterCls)}else{allPages.forEach(p=>p.classList.remove('active',..._ec));next.classList.add('page-enter')}next.classList.add('active');
closeFilterPanel();
_kbFocusedCardIdx=-1;document.querySelectorAll('.girl-card.kb-focused').forEach(c=>c.classList.remove('kb-focused'));
/* URL routing & dynamic title */
const titleMap={homePage:'Ginza Empire',rosterPage:'Ginza Empire – Roster',listPage:'Ginza Empire – Girls',favoritesPage:'Ginza Empire – Favorites',valuePage:'Ginza Empire – Rates',employmentPage:'Ginza Empire – Employment',calendarPage:'Ginza Empire – Calendar',analyticsPage:'Ginza Empire – Analytics',profileDbPage:'Ginza Empire – Profile Database',bookingsPage:'Ginza Empire – Bookings',vacationPage:'Ginza Empire – Vacation'};
const pageTitle=titleMap[id]||'Ginza Empire';
document.title=pageTitle;
announce(pageTitle.replace('Ginza Empire – ','').replace('Ginza Empire','Home'));
Router.push(Router.pathForPage(id),pageTitle);
/* Shared filter pane is active for all pages */
_activeFilterPaneId='sharedFilterPane';
document.querySelectorAll('.nav-dropdown a').forEach(a=>a.classList.remove('active'));
if(id==='homePage'){document.getElementById('navHome').classList.add('active');renderHome()}
if(id==='rosterPage'){document.getElementById('navRoster').classList.add('active');renderRoster()}
if(id==='listPage'){document.getElementById('navGirls').classList.add('active');renderGrid()}
if(id==='favoritesPage'){document.getElementById('navFavorites').classList.add('active');renderFavoritesGrid()}
if(id==='valuePage'){document.getElementById('navValue').classList.add('active');renderValueTable()}
if(id==='employmentPage'){document.getElementById('navEmployment').classList.add('active')}
if(id==='calendarPage'){document.getElementById('navCalendar').classList.add('active');calPending={};renderCalendar()}
if(id==='analyticsPage'){document.getElementById('navAnalytics').classList.add('active');if(typeof renderAnalytics==='function')renderAnalytics()}
if(id==='profileDbPage'){document.getElementById('navProfileDb').classList.add('active');if(typeof renderProfileDb==='function')renderProfileDb()}
if(id==='bookingsPage'){document.getElementById('navBookings').classList.add('active');renderBookingsFilters();renderBookingsGrid()}
if(id==='vacationPage'){document.getElementById('navVacation').classList.add('active');renderVacationTable()}
renderFilterPane('sharedFilterPane');
updateFilterToggle();
pushFiltersToURL();
window.scrollTo(0,0);requestAnimationFrame(()=>window.scrollTo(0,0))}

document.getElementById('navHome').onclick=e=>{e.preventDefault();showPage('homePage')};
document.getElementById('navRoster').onclick=e=>{e.preventDefault();showPage('rosterPage')};
document.getElementById('navGirls').onclick=e=>{e.preventDefault();showPage('listPage')};
document.getElementById('navFavorites').onclick=e=>{e.preventDefault();showPage('favoritesPage')};
document.getElementById('navValue').onclick=e=>{e.preventDefault();showPage('valuePage')};
document.getElementById('navEmployment').onclick=e=>{e.preventDefault();showPage('employmentPage')};
document.getElementById('navCalendar').onclick=e=>{e.preventDefault();showPage('calendarPage')};
document.getElementById('navAnalytics').onclick=e=>{e.preventDefault();showPage('analyticsPage')};
document.getElementById('navProfileDb').onclick=e=>{e.preventDefault();showPage('profileDbPage')};
document.getElementById('navBookings').onclick=e=>{e.preventDefault();showPage('bookingsPage')};
document.getElementById('navVacation').onclick=e=>{e.preventDefault();showPage('vacationPage')};

/* Nav Dropdown Menu Toggle */
const navMenuBtn=document.getElementById('navMenuBtn');
const navDropdown=document.getElementById('navDropdown');
navMenuBtn.onclick=()=>{const o=navMenuBtn.classList.toggle('open');navDropdown.classList.toggle('open');navMenuBtn.setAttribute('aria-expanded',String(o))};
function closeNavMenu(){navMenuBtn.classList.remove('open');navDropdown.classList.remove('open');navMenuBtn.setAttribute('aria-expanded','false')}
navDropdown.querySelectorAll('a').forEach(a=>{const orig=a.onclick;a.addEventListener('click',()=>closeNavMenu())});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-menu-wrap'))closeNavMenu()});

/* Admin calendar stubs — real implementations loaded via admin.js */
function findExistingTimes(){return null}
function closeCopyTimeModal(){}
function showCopyTimePrompt(n,d,s,e){return loadAdminModule().then(function(){return showCopyTimePrompt(n,d,s,e)})}
function openCopyDayModal(){loadAdminModule().then(function(){openCopyDayModal()})}
function openBulkTimeModal(name){loadAdminModule().then(function(){openBulkTimeModal(name)})}

/* Home Page */
function getNewGirls(){const now=getAEDTDate();const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-28);return girls.filter(g=>{if(!isAdmin()&&g.hidden)return false;if(!g.startDate)return false;const sd=new Date(g.startDate+'T00:00:00');return sd>=cutoff&&sd<=now})}

function renderAvailNowWidget(){
const container=document.getElementById('homeAvailNow');if(!container)return;
const avail=girls.filter(g=>!g.hidden&&isAvailableNow(g.name));
if(!avail.length){container.style.display='none';container.innerHTML='';return}
container.style.display='';
const countLabel=avail.length===1?t('home.girlSingular'):t('home.girlPlural').replace('{n}',avail.length);
let html=`<div class="avail-now-header"><span class="avail-now-dot"></span><h2 class="logo" style="margin:0">${countLabel} Available Now</h2></div><div class="avail-now-wrap"><button class="anw-arrow anw-arrow-left" aria-label="Scroll left"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><div class="avail-now-strip">`;
avail.forEach(g=>{const ri=girls.indexOf(g);const photo=g.photos&&g.photos.length?g.photos[0]:'';const cd=getAvailCountdown(g.name);const cdText=cd&&cd.type==='until_end'?cd.display:'';
html+=`<div class="avail-now-card" data-idx="${ri}"><div class="anw-photo">${photo?`<img src="${photo}" alt="${g.name}">`:'<div class="anw-placeholder"></div>'}</div><div class="anw-name">${g.name}</div>${cdText?`<div class="anw-countdown">${cdText}</div>`:''}</div>`});
html+='</div><button class="anw-arrow anw-arrow-right" aria-label="Scroll right"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg></button></div>';container.innerHTML=html;
let _anwDidDrag=false;
let _anwHoverTimer;
container.querySelectorAll('.avail-now-card').forEach(c=>{const idx=parseInt(c.dataset.idx);const _g=!isNaN(idx)?girls[idx]:null;c.onclick=()=>{if(_anwDidDrag)return;if(!isNaN(idx)){profileReturnPage='homePage';showProfile(idx)}};
c.addEventListener('mouseenter',()=>{if(!_g)return;clearTimeout(_anwHoverTimer);_anwHoverTimer=setTimeout(()=>{const prev=document.getElementById('cardHoverPreview');if(!prev)return;const ts=fmtDate(getAEDTDate());const _vacCd=_vacCountdownLabel(_g.name,ts);const _vacBdg=_isVacReturnDay(_g.name,ts)?'<span class="vac-comeback">'+t('badge.comeBack')+'</span>':(_vacCd?`<span class="vac-lastdays">${_vacCd}</span>`:'');const _newBdg=_isNewGirl(_g)?'<span class="new-badge">'+t('badge.new')+'</span>':'';const _liveNow=_g.name&&isAvailableNow(_g.name);const _entry=getCalEntry(_g.name,ts);const _timeStr=_entry&&_entry.start&&_entry.end?fmtTime12(_entry.start)+' - '+fmtTime12(_entry.end):'';const _availHtml=_liveNow&&_timeStr?t('avail.now')+' ('+_timeStr+')':(_timeStr?_timeStr:'');const _availCls=_liveNow?'chp-avail chp-avail-live':'chp-avail';prev.innerHTML=`<div class="chp-name">${_g.name||''}${_vacBdg}${_newBdg}</div><div class="chp-country">${Array.isArray(_g.country)?_g.country.join(', '):(_g.country||'')}</div>${_g.special?'<div class="chp-special">'+_g.special+'</div>':''}${cardRatingHtml(_g)?'<div class="chp-rating">'+cardRatingHtml(_g)+'</div>':''}${_availHtml?'<div class="'+_availCls+'">'+_availHtml+'</div>':''}<div class="chp-stats"><div class="chp-row"><span>${t('field.age')}</span><span>${_g.age||'\u2014'}</span></div><div class="chp-row"><span>${t('field.body')}</span><span>${_g.body||'\u2014'}</span></div><div class="chp-row"><span>${t('field.height')}</span><span>${_g.height?_g.height+' cm':'\u2014'}</span></div><div class="chp-row"><span>${t('field.cup')}</span><span>${_g.cup||'\u2014'}</span></div><div class="chp-divider"></div><div class="chp-row"><span>${t('field.rates30')}</span><span>${_g.val1||'\u2014'}</span></div><div class="chp-row"><span>${t('field.rates45')}</span><span>${_g.val2||'\u2014'}</span></div><div class="chp-row"><span>${t('field.rates60')}</span><span>${_g.val3||'\u2014'}</span></div><div class="chp-row"><span>${t('field.experience')}</span><span>${_g.exp||'\u2014'}</span></div></div>`;prev.classList.add('visible')},180)});
c.addEventListener('mouseleave',()=>{clearTimeout(_anwHoverTimer);document.getElementById('cardHoverPreview')?.classList.remove('visible')});
c.addEventListener('mousemove',e=>{const prev=document.getElementById('cardHoverPreview');if(!prev||!prev.classList.contains('visible'))return;const vw=window.innerWidth,vh=window.innerHeight,pw=prev.offsetWidth||220,ph=prev.offsetHeight||280;let x=e.clientX+16,y=e.clientY+16;if(x+pw>vw-8)x=e.clientX-pw-12;if(y+ph>vh-8)y=e.clientY-ph-12;prev.style.left=x+'px';prev.style.top=y+'px'})});
const strip=container.querySelector('.avail-now-strip');const arwL=container.querySelector('.anw-arrow-left');const arwR=container.querySelector('.anw-arrow-right');
function _updateAnwArrows(){if(!strip)return;arwL.classList.toggle('hidden',strip.scrollLeft<=0);arwR.classList.toggle('hidden',strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2)}
arwL.onclick=()=>{strip.scrollBy({left:-320,behavior:'smooth'})};arwR.onclick=()=>{strip.scrollBy({left:320,behavior:'smooth'})};strip.addEventListener('scroll',_updateAnwArrows);
/* Mouse drag to scroll */
let _anwMdX=0,_anwMdSL=0,_anwMdActive=false;
strip.addEventListener('mousedown',e=>{_anwMdActive=true;_anwDidDrag=false;_anwMdX=e.pageX;_anwMdSL=strip.scrollLeft;strip.style.cursor='grabbing';strip.style.scrollSnapType='none';e.preventDefault()});
document.addEventListener('mousemove',e=>{if(!_anwMdActive)return;if(Math.abs(e.pageX-_anwMdX)>5)_anwDidDrag=true;strip.scrollLeft=_anwMdSL-(e.pageX-_anwMdX)});
document.addEventListener('mouseup',()=>{if(!_anwMdActive)return;_anwMdActive=false;strip.style.cursor='';strip.style.scrollSnapType='';setTimeout(()=>{_anwDidDrag=false},0)});
strip.style.cursor='grab';_updateAnwArrows()}

function renderHome(){safeRender('Home',()=>{
const c=document.getElementById('homeImages');c.innerHTML='';
const baseUrl='https://raw.githubusercontent.com/sydneyginza/sydneyginza.github.io/main/Images/Homepage/Homepage_';
for(let i=1;i<=4;i++){const card=document.createElement('div');card.className='home-img-card reveal';card.style.cursor='default';card.style.setProperty('--reveal-delay',(i*0.1)+'s');card.innerHTML=`<img src="${baseUrl}${i}.jpg" alt="Ginza venue photo ${i}">`;c.appendChild(card)}
document.getElementById('homeAnnounce').innerHTML=getSeasonalBanner()+'<p></p>';
ngList=getNewGirls();ngIdx=0;renderNewGirls();renderAvailNowWidget();
/* Scroll reveals for below-fold home sections */
const _sr=[document.querySelector('#homePage .home-mid'),document.getElementById('homeWelcomeEn'),document.querySelector('[data-i18n="home.location"]'),document.getElementById('homeLocation'),document.getElementById('homeMap'),document.querySelector('[data-i18n="home.hours"]'),document.getElementById('homeHours')].filter(Boolean);_sr.forEach(el=>{el.classList.add('scroll-reveal');el.classList.remove('revealed')});if(window._homeRevealObs)window._homeRevealObs.disconnect();window._homeRevealObs=new IntersectionObserver((entries,obs)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');obs.unobserve(e.target)}})},{threshold:0.12,rootMargin:'0px 0px -60px 0px'});_sr.forEach(el=>window._homeRevealObs.observe(el));observeReveals(document.getElementById('homePage'))})}

function renderRecentlyViewed(containerId='homeRecentlyViewed',returnPage='homePage'){
const container=document.getElementById(containerId);if(!container)return;
const rv=getRecentlyViewed();
const valid=rv.map(r=>{const gi=girls.findIndex(g=>g.name===r.name);return gi>=0?{g:girls[gi],idx:gi}:null}).filter(v=>v&&(isAdmin()||!v.g.hidden));
if(!valid.length){container.style.display='none';container.innerHTML='';return}
container.style.display='';
const clearId='rvClearBtn_'+containerId;
let html=`<div class="rv-header"><div class="avail-now-title rv-title">${t('rv.title')}</div><button class="rv-clear-btn" id="${clearId}">${t('rv.clear')}</button></div><div class="avail-now-wrap"><button class="anw-arrow anw-arrow-left" aria-label="Scroll left"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><div class="avail-now-strip">`;
valid.forEach(({g,idx})=>{const liveNow=g.name&&isAvailableNow(g.name);const photo=g.photos&&g.photos.length?g.photos[0]:'';
html+=`<div class="avail-now-card" data-rv-idx="${idx}"><div class="anw-photo">${photo?`<img src="${photo}" alt="${(g.name||'').replace(/"/g,'&quot;')}">`:'<div class="anw-placeholder"></div>'}</div><div class="anw-name">${g.name}</div>${liveNow?'<span class="avail-now-dot rv-dot"></span>':''}</div>`});
html+='</div><button class="anw-arrow anw-arrow-right" aria-label="Scroll right"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg></button></div>';container.innerHTML=html;
let _rvDidDrag=false;
container.querySelectorAll('.avail-now-card').forEach(card=>{card.onclick=()=>{if(_rvDidDrag)return;_savedScrollY=window.scrollY;sessionStorage.setItem('ginza_scroll',window.scrollY);profileReturnPage=returnPage;showProfile(parseInt(card.dataset.rvIdx))}});
const strip=container.querySelector('.avail-now-strip');const arwL=container.querySelector('.anw-arrow-left');const arwR=container.querySelector('.anw-arrow-right');
function _updateRvArrows(){if(!strip)return;arwL.classList.toggle('hidden',strip.scrollLeft<=0);arwR.classList.toggle('hidden',strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2)}
arwL.onclick=()=>{strip.scrollBy({left:-320,behavior:'smooth'})};arwR.onclick=()=>{strip.scrollBy({left:320,behavior:'smooth'})};strip.addEventListener('scroll',_updateRvArrows);
/* Mouse drag to scroll */
let _rvMdX=0,_rvMdSL=0,_rvMdActive=false;
strip.addEventListener('mousedown',e=>{_rvMdActive=true;_rvDidDrag=false;_rvMdX=e.pageX;_rvMdSL=strip.scrollLeft;strip.style.cursor='grabbing';strip.style.scrollSnapType='none';e.preventDefault()});
document.addEventListener('mousemove',e=>{if(!_rvMdActive)return;if(Math.abs(e.pageX-_rvMdX)>5)_rvDidDrag=true;strip.scrollLeft=_rvMdSL-(e.pageX-_rvMdX)});
document.addEventListener('mouseup',()=>{if(!_rvMdActive)return;_rvMdActive=false;strip.style.cursor='';strip.style.scrollSnapType='';setTimeout(()=>{_rvDidDrag=false},0)});
strip.style.cursor='grab';_updateRvArrows();
const clearBtn=document.getElementById(clearId);if(clearBtn)clearBtn.onclick=()=>{clearRecentlyViewed();renderRecentlyViewed(containerId,returnPage)}}

function renderNewGirls(){
const container=document.getElementById('homeNewGirls');if(!container)return;
if(!ngList.length){container.style.display='none';container.innerHTML='';return}
container.style.display='';
let html=`<h2 class="logo" style="margin-bottom:16px">${t('home.newGirls')}</h2><div class="avail-now-wrap"><button class="anw-arrow anw-arrow-left" aria-label="Scroll left"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button><div class="avail-now-strip">`;
ngList.forEach(g=>{const ri=girls.indexOf(g);const liveNow=g.name&&isAvailableNow(g.name);const photo=g.photos&&g.photos.length?g.photos[0]:'';
html+=`<div class="avail-now-card" data-ng-idx="${ri}"><div class="anw-photo">${photo?`<img src="${photo}" alt="${(g.name||'').replace(/"/g,'&quot;')}">`:'<div class="anw-placeholder"></div>'}</div><div class="anw-name">${g.name}</div>${liveNow?'<span class="avail-now-dot rv-dot"></span>':''}</div>`});
html+='</div><button class="anw-arrow anw-arrow-right" aria-label="Scroll right"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg></button></div>';
container.innerHTML=html;
let _ngDidDrag=false;
let _ngHoverTimer;
container.querySelectorAll('.avail-now-card').forEach(card=>{const idx=parseInt(card.dataset.ngIdx);const _g=!isNaN(idx)?girls[idx]:null;card.onclick=()=>{if(_ngDidDrag)return;_savedScrollY=window.scrollY;sessionStorage.setItem('ginza_scroll',window.scrollY);profileReturnPage='homePage';showProfile(idx)};
card.addEventListener('mouseenter',()=>{if(!_g)return;clearTimeout(_ngHoverTimer);_ngHoverTimer=setTimeout(()=>{const prev=document.getElementById('cardHoverPreview');if(!prev)return;const ts=fmtDate(getAEDTDate());const _vacCd=_vacCountdownLabel(_g.name,ts);const _vacBdg=_isVacReturnDay(_g.name,ts)?'<span class="vac-comeback">'+t('badge.comeBack')+'</span>':(_vacCd?`<span class="vac-lastdays">${_vacCd}</span>`:'');const _newBdg=_isNewGirl(_g)?'<span class="new-badge">'+t('badge.new')+'</span>':'';const _liveNow=_g.name&&isAvailableNow(_g.name);const _entry=getCalEntry(_g.name,ts);const _timeStr=_entry&&_entry.start&&_entry.end?fmtTime12(_entry.start)+' - '+fmtTime12(_entry.end):'';const _availHtml=_liveNow&&_timeStr?t('avail.now')+' ('+_timeStr+')':(_timeStr?_timeStr:'');const _availCls=_liveNow?'chp-avail chp-avail-live':'chp-avail';prev.innerHTML=`<div class="chp-name">${_g.name||''}${_vacBdg}${_newBdg}</div><div class="chp-country">${Array.isArray(_g.country)?_g.country.join(', '):(_g.country||'')}</div>${_g.special?'<div class="chp-special">'+_g.special+'</div>':''}${cardRatingHtml(_g)?'<div class="chp-rating">'+cardRatingHtml(_g)+'</div>':''}${_availHtml?'<div class="'+_availCls+'">'+_availHtml+'</div>':''}<div class="chp-stats"><div class="chp-row"><span>${t('field.age')}</span><span>${_g.age||'\u2014'}</span></div><div class="chp-row"><span>${t('field.body')}</span><span>${_g.body||'\u2014'}</span></div><div class="chp-row"><span>${t('field.height')}</span><span>${_g.height?_g.height+' cm':'\u2014'}</span></div><div class="chp-row"><span>${t('field.cup')}</span><span>${_g.cup||'\u2014'}</span></div><div class="chp-divider"></div><div class="chp-row"><span>${t('field.rates30')}</span><span>${_g.val1||'\u2014'}</span></div><div class="chp-row"><span>${t('field.rates45')}</span><span>${_g.val2||'\u2014'}</span></div><div class="chp-row"><span>${t('field.rates60')}</span><span>${_g.val3||'\u2014'}</span></div><div class="chp-row"><span>${t('field.experience')}</span><span>${_g.exp||'\u2014'}</span></div></div>`;prev.classList.add('visible')},180)});
card.addEventListener('mouseleave',()=>{clearTimeout(_ngHoverTimer);document.getElementById('cardHoverPreview')?.classList.remove('visible')});
card.addEventListener('mousemove',e=>{const prev=document.getElementById('cardHoverPreview');if(!prev||!prev.classList.contains('visible'))return;const vw=window.innerWidth,vh=window.innerHeight,pw=prev.offsetWidth||220,ph=prev.offsetHeight||280;let x=e.clientX+16,y=e.clientY+16;if(x+pw>vw-8)x=e.clientX-pw-12;if(y+ph>vh-8)y=e.clientY-ph-12;prev.style.left=x+'px';prev.style.top=y+'px'})});
const strip=container.querySelector('.avail-now-strip');const arwL=container.querySelector('.anw-arrow-left');const arwR=container.querySelector('.anw-arrow-right');
function _updateNgArrows(){if(!strip)return;arwL.classList.toggle('hidden',strip.scrollLeft<=0);arwR.classList.toggle('hidden',strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2)}
arwL.onclick=()=>{strip.scrollBy({left:-320,behavior:'smooth'})};arwR.onclick=()=>{strip.scrollBy({left:320,behavior:'smooth'})};strip.addEventListener('scroll',_updateNgArrows);
let _ngMdX=0,_ngMdSL=0,_ngMdActive=false;
strip.addEventListener('mousedown',e=>{_ngMdActive=true;_ngDidDrag=false;_ngMdX=e.pageX;_ngMdSL=strip.scrollLeft;strip.style.cursor='grabbing';strip.style.scrollSnapType='none';e.preventDefault()});
document.addEventListener('mousemove',e=>{if(!_ngMdActive)return;if(Math.abs(e.pageX-_ngMdX)>5)_ngDidDrag=true;strip.scrollLeft=_ngMdSL-(e.pageX-_ngMdX)});
document.addEventListener('mouseup',()=>{if(!_ngMdActive)return;_ngMdActive=false;strip.style.cursor='';strip.style.scrollSnapType='';setTimeout(()=>{_ngDidDrag=false},0)});
strip.style.cursor='grab';_updateNgArrows()}

/* Home Search Bar */
(function(){const inp=document.getElementById('homeSearchInput'),btn=document.getElementById('homeSearchBtn');if(!inp||!btn)return;function doHomeSearch(){const q=inp.value.trim();if(!q)return;sharedFilters.nameSearch=q;showPage('listPage');inp.value=''}inp.addEventListener('keydown',e=>{if(e.key==='Enter')doHomeSearch()});btn.onclick=doHomeSearch})();

/* Lightbox */
let lbPhotos=[],lbIdx=0,lbName='';
const lightbox=document.getElementById('lightbox'),lbImg=document.getElementById('lbImg'),lbStrip=document.getElementById('lbStrip'),lbCounter=document.getElementById('lbCounter');

function lbUpdateCounter(){lbCounter.innerHTML=`<span>${lbIdx+1}</span> / ${lbPhotos.length}`}

function lbUpdateStrip(){lbStrip.querySelectorAll('.lb-strip-thumb').forEach((t,i)=>{t.classList.toggle('active',i===lbIdx)});
const active=lbStrip.querySelector('.lb-strip-thumb.active');if(active)active.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'})}

function lbRenderStrip(){lbStrip.innerHTML='';
lbPhotos.forEach((src,i)=>{const t=document.createElement('div');t.className='lb-strip-thumb'+(i===lbIdx?' active':'');t.innerHTML=`<img src="${src}" alt="${(lbName||'Photo '+(i+1)).replace(/"/g,'&quot;')}">`;t.onclick=()=>lbGoTo(i);lbStrip.appendChild(t)})}

function lbGoTo(i){if(i===lbIdx)return;lbImg.classList.add('lb-fade');setTimeout(()=>{lbIdx=i;lbImg.src=lbPhotos[lbIdx];lbImg.alt=lbName||'';lbImg.onload=()=>{lbImg.classList.remove('lb-fade')};lbUpdateCounter();lbUpdateStrip()},150)}

function closeLightbox(){lightbox.classList.remove('open');document.body.style.overflow=''}

document.getElementById('lbClose').onclick=closeLightbox;
lightbox.onclick=e=>{if(e.target===lightbox||e.target.classList.contains('lightbox-main'))closeLightbox()};
document.getElementById('lbPrev').onclick=e=>{e.stopPropagation();lbGoTo((lbIdx-1+lbPhotos.length)%lbPhotos.length)};
document.getElementById('lbNext').onclick=e=>{e.stopPropagation();lbGoTo((lbIdx+1)%lbPhotos.length)};

function openLightbox(p,i,name){lbPhotos=p;lbIdx=i;lbName=name||'';lbImg.src=p[i];lbImg.alt=lbName||'';lbImg.classList.remove('lb-fade');lbUpdateCounter();lbRenderStrip();lightbox.classList.add('open');document.body.style.overflow='hidden'}

/* Keyboard nav for lightbox */
document.addEventListener('keydown',e=>{if(!lightbox.classList.contains('open'))return;if(e.key==='Escape')closeLightbox();if(e.key==='ArrowLeft')lbGoTo((lbIdx-1+lbPhotos.length)%lbPhotos.length);if(e.key==='ArrowRight')lbGoTo((lbIdx+1)%lbPhotos.length)});

/* Touch swipe for lightbox */
(function(){let sx=0,sy=0;const el=document.getElementById('lightbox');
el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
el.addEventListener('touchend',e=>{if(!el.classList.contains('open'))return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){if(dx<0)lbGoTo((lbIdx+1)%lbPhotos.length);else lbGoTo((lbIdx-1+lbPhotos.length)%lbPhotos.length)}},{passive:true})})();

/* ── Compare Modal ── */
function _compareBarHtml(val,min,max,rank){
  if(isNaN(val)||min===null||max===null)return '';
  const pct=max===min?50:((val-min)/(max-min))*100;
  const cls=rank==='lo'?'compare-bar-lo':rank==='hi'?'compare-bar-hi':'compare-bar-mid';
  return `<div class="compare-bar-track"><div class="compare-bar-fill ${cls}" style="width:${pct}%"></div></div>`;
}
function openCompareModal(){
if(!loggedIn){showToast('Please log in to use compare','info');return}
if(compareSelected.length<2)return;
const overlay=document.getElementById('compareOverlay'),grid=document.getElementById('compareGrid');
if(!overlay||!grid)return;
const sel=compareSelected.map(name=>girls.find(g=>g.name===name)).filter(Boolean);
if(sel.length<2)return;
const stats=[
{label:t('fp.country'),fn:g=>Array.isArray(g.country)?g.country.join(', '):(g.country||'\u2014')},
{label:t('field.age'),fn:g=>g.age||'\u2014',raw:g=>parseFloat(g.age)},
{label:t('fp.height'),fn:g=>g.height?(g.height+' cm'):'\u2014',raw:g=>parseFloat(g.height)},
{label:t('field.body'),fn:g=>g.body||'\u2014',raw:g=>parseFloat(g.body)},
{label:t('fp.cupSize'),fn:g=>g.cup||'\u2014',alpha:g=>g.cup?g.cup.trim().charAt(0).toUpperCase():null},
{label:t('field.rates30'),fn:g=>g.val1?('$'+g.val1):'\u2014',raw:g=>parseFloat(g.val1)},
{label:t('field.rates45'),fn:g=>g.val2?('$'+g.val2):'\u2014',raw:g=>parseFloat(g.val2)},
{label:t('field.rates60'),fn:g=>g.val3?('$'+g.val3):'\u2014',raw:g=>parseFloat(g.val3)},
{label:t('field.experience'),fn:g=>g.exp||'\u2014',fixedColor:g=>g.exp==='Experienced'?'#00c864':g.exp==='Inexperienced'?'#ff4d4d':null}
];
/* Desktop table */
let html='<table class="compare-stat-table compare-desktop"><thead><tr><th></th>';
sel.forEach(g=>{const photo=g.photos&&g.photos.length?`<img src="${g.photos[0]}" class="compare-col-photo" alt="${g.name.replace(/"/g,'&quot;')}">`:'<div class="compare-col-photo-placeholder"></div>';html+=`<th style="text-align:center;padding-bottom:16px;vertical-align:bottom">${photo}<div class="compare-col-name">${g.name}</div></th>`});
html+='</tr></thead><tbody>';
stats.forEach(s=>{html+='<tr>';html+=`<td>${s.label}</td>`;if(s.raw){const vals=sel.map(g=>s.raw(g));const valid=vals.filter(v=>!isNaN(v));const hi=valid.length?Math.max(...valid):null;const lo=valid.length?Math.min(...valid):null;sel.forEach((g,i)=>{const v=vals[i];const rank=!isNaN(v)&&hi!==null&&lo!==null&&hi!==lo?(v===lo?'lo':v===hi?'hi':'mid'):null;const clr=rank==='lo'?'color:#00c864;font-weight:600':rank==='hi'?'color:#ff4d4d;font-weight:600':'';html+=`<td><span${clr?` style="${clr}"`:''} >${s.fn(g)}</span>${_compareBarHtml(v,lo,hi,rank)}</td>`})}else if(s.alpha){const vals=sel.map(g=>s.alpha(g));const valid=[...new Set(vals.filter(Boolean))].sort();const hi=valid.length?valid[valid.length-1]:null;const lo=valid.length?valid[0]:null;sel.forEach((g,i)=>{const v=vals[i];let style='';if(v&&hi&&lo&&hi!==lo){if(v===hi)style=' style="color:#ff4d4d;font-weight:600"';else if(v===lo)style=' style="color:#00c864;font-weight:600"'}html+=`<td${style}>${s.fn(g)}</td>`})}else if(s.fixedColor){sel.forEach(g=>{const c=s.fixedColor(g);html+=`<td${c?` style="color:${c};font-weight:600"`:''}>${s.fn(g)}</td>`})}else{sel.forEach(g=>{html+=`<td>${s.fn(g)}</td>`})}html+='</tr>'});
html+='</tbody></table>';
/* Mobile cards */
html+='<div class="compare-mobile-cards">';
sel.forEach(g=>{const photo=g.photos&&g.photos.length?`<img src="${g.photos[0]}" alt="${g.name.replace(/"/g,'&quot;')}">`:'';
html+=`<div class="compare-mobile-card"><div class="cmc-header">${photo}<div class="cmc-name">${g.name}</div></div><div class="cmc-stats">`;
stats.forEach(s=>{html+=`<div class="cmc-row"><span class="cmc-label">${s.label}</span><span class="cmc-value">${s.fn(g)}</span></div>`});
html+=`</div></div>`});
html+='</div>';
/* Labels comparison */
const allLabels=new Set();sel.forEach(g=>{if(g.labels)g.labels.forEach(l=>allLabels.add(l))});
if(allLabels.size){const shared=[...allLabels].filter(l=>sel.every(g=>g.labels&&g.labels.includes(l))).sort();const unique=[...allLabels].filter(l=>!sel.every(g=>g.labels&&g.labels.includes(l))).sort();
html+=`<div class="compare-labels-section">`;
if(shared.length)html+=`<div class="compare-labels-group"><div class="compare-labels-title">${t('compare.sharedLabels')}</div><div class="compare-labels-list">${shared.map(l=>`<span class="compare-label shared">${l}</span>`).join('')}</div></div>`;
if(unique.length)html+=`<div class="compare-labels-group"><div class="compare-labels-title">${t('compare.uniqueLabels')}</div><div class="compare-labels-list">${unique.map(l=>`<span class="compare-label unique">${l}</span>`).join('')}</div></div>`;
html+=`</div>`}
/* Availability timeline */
const today=fmtDate(getAEDTDate());const entries=sel.map(g=>({name:g.name,entry:getCalEntry(g.name,today)}));const hasAnySchedule=entries.some(e=>e.entry&&e.entry.start&&e.entry.end);
if(hasAnySchedule){
const nowDate=getAEDTDate();const nowHr=nowDate.getHours()+nowDate.getMinutes()/60;
const tlStart=10,tlEnd=26;/* 10am to 2am next day (26h) */
html+=`<div class="compare-timeline"><div class="compare-tl-title">${t('compare.todaySchedule')}</div><div class="compare-tl-hours">`;
for(let h=tlStart;h<=tlEnd;h+=2)html+=`<span class="compare-tl-hour">${h>24?(h-24):h>12?h-12:h===0?12:h}${h>=12&&h<24?'p':'a'}</span>`;
html+=`</div>`;
entries.forEach(e=>{const ent=e.entry;html+=`<div class="compare-tl-row"><span class="compare-tl-name">${e.name}</span><div class="compare-tl-track">`;
if(ent&&ent.start&&ent.end){const[sh,sm]=ent.start.split(':').map(Number);const[eh,em]=ent.end.split(':').map(Number);let s=sh+sm/60,en=eh+em/60;if(en<s)en+=24;
const left=Math.max(0,(s-tlStart)/(tlEnd-tlStart)*100);const width=Math.min(100-left,(en-Math.max(s,tlStart))/(tlEnd-tlStart)*100);
html+=`<div class="compare-tl-bar" style="left:${left}%;width:${width}%"></div>`}
/* Now marker */
let nowPos=(nowHr<tlStart?nowHr+24:nowHr);const nowPct=(nowPos-tlStart)/(tlEnd-tlStart)*100;
if(nowPct>=0&&nowPct<=100)html+=`<div class="compare-tl-now" style="left:${nowPct}%"></div>`;
html+=`</div></div>`});
html+=`</div>`}
grid.innerHTML=html;
overlay.classList.add('open');document.body.style.overflow='hidden'}
function closeCompareModal(){const overlay=document.getElementById('compareOverlay');if(overlay)overlay.classList.remove('open');document.body.style.overflow=''}
(function(){const cl=document.getElementById('compareClear'),op=document.getElementById('compareOpen'),cs=document.getElementById('compareClose'),dn=document.getElementById('compareDone'),ov=document.getElementById('compareOverlay');
if(cl)cl.onclick=clearCompare;if(op)op.onclick=openCompareModal;if(cs)cs.onclick=closeCompareModal;if(dn)dn.onclick=closeCompareModal;
if(ov)ov.onclick=e=>{if(e.target===ov)closeCompareModal()};
document.addEventListener('keydown',e=>{if(ov&&ov.classList.contains('open')&&e.key==='Escape')closeCompareModal()})})();

/* Profile Nav Rail */
function getNamedGirlIndices(){const named=girls.map((g,i)=>({g,i})).filter(x=>x.g.name&&String(x.g.name).trim().length>0&&(isAdmin()||!x.g.hidden));const filtered=applySharedFilters(named.map(x=>x.g));const result=named.filter(x=>filtered.includes(x.g));const sorted=applySortOrder(result.map(x=>x.g));return sorted.map(g=>result.find(x=>x.g===g).i)}
/* Navigate via nav rail — replaceState to avoid history bloat */
function showProfileReplace(idx){const origPush=Router.push;Router.push=Router.replace;try{showProfile(idx)}finally{Router.push=origPush}}
function renderProfileNav(idx){const rail=document.getElementById('profileNavRail');rail.innerHTML='';
const namedIndices=getNamedGirlIndices();const total=namedIndices.length;if(total===0)return;
const posInList=namedIndices.indexOf(idx);const safePos=posInList>=0?posInList:0;
const prevIdx=namedIndices[safePos<=0?total-1:safePos-1];
const nextIdx=namedIndices[safePos>=total-1?0:safePos+1];
[prevIdx,nextIdx].forEach(pi=>{const pg=girls[pi];if(!pg||!pg.photos||!pg.photos.length)return;const src=pg.photos[0];if(!src||src.startsWith('data:'))return;const eid='pfetch-'+pi;if(!document.getElementById(eid)){const lk=document.createElement('link');lk.rel='prefetch';lk.as='image';lk.href=src;lk.id=eid;document.head.appendChild(lk)}});
const arwL=document.createElement('button');arwL.className='pnav-arrow pnav-arrow-left';arwL.innerHTML='<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';rail.appendChild(arwL);
const strip=document.createElement('div');strip.className='pnav-strip';
let _pnavDidDrag=false;
for(let di=0;di<total;di++){const realIdx=namedIndices[di];const g=girls[realIdx];const card=document.createElement('div');card.className='pnav-card'+(realIdx===idx?' active':'')+(g.hidden?' pnav-card-hidden':'');const photo=g.photos&&g.photos.length?g.photos[0]:'';card.innerHTML=`<div class="pnav-card-photo">${photo?`<img src="${photo}" alt="${(g.name||'').replace(/"/g,'&quot;')}">`:`<div class="pnav-card-placeholder">${(g.name||'?').charAt(0)}</div>`}</div><div class="pnav-card-name">${g.name||'?'}</div>`;card.onclick=()=>{if(!_pnavDidDrag)showProfileReplace(realIdx)};strip.appendChild(card)}
rail.appendChild(strip);
const arwR=document.createElement('button');arwR.className='pnav-arrow pnav-arrow-right';arwR.innerHTML='<svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';rail.appendChild(arwR);
function _updatePnavArrows(){arwL.classList.toggle('hidden',strip.scrollLeft<=0);arwR.classList.toggle('hidden',strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2)}
arwL.onclick=()=>{strip.scrollBy({left:-320,behavior:'smooth'})};arwR.onclick=()=>{strip.scrollBy({left:320,behavior:'smooth'})};strip.addEventListener('scroll',_updatePnavArrows);
/* Mouse drag to scroll */
let _mdX=0,_mdSL=0,_mdActive=false;
strip.addEventListener('mousedown',e=>{_mdActive=true;_pnavDidDrag=false;_mdX=e.pageX;_mdSL=strip.scrollLeft;strip.style.cursor='grabbing';strip.style.scrollSnapType='none';e.preventDefault()});
document.addEventListener('mousemove',e=>{if(!_mdActive)return;if(Math.abs(e.pageX-_mdX)>5)_pnavDidDrag=true;strip.scrollLeft=_mdSL-(e.pageX-_mdX)});
document.addEventListener('mouseup',()=>{if(!_mdActive)return;_mdActive=false;strip.style.cursor='';strip.style.scrollSnapType='';setTimeout(()=>{_pnavDidDrag=false},0)});
strip.style.cursor='grab';
const activeCard=strip.querySelector('.pnav-card.active');if(activeCard)setTimeout(()=>{activeCard.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});_updatePnavArrows()},50);else _updatePnavArrows()}

/* OG / Twitter Meta Tag helpers */
function updateOgMeta(g,idx){
const set=(prop,val,attr)=>{attr=attr||'property';let el=document.querySelector('meta['+attr+'="'+prop+'"]');if(!el){el=document.createElement('meta');el.setAttribute(attr,prop);document.head.appendChild(el)}el.setAttribute('content',val)};
const url='https://sydneyginza.github.io'+Router.pathForProfile(idx);
const img=g.photos&&g.photos.length?g.photos[0]:'https://raw.githubusercontent.com/sydneyginza/sydneyginza.github.io/main/Images/Homepage/Homepage_1.jpg';
const country=Array.isArray(g.country)?g.country.join('/'):(g.country||'');
const parts=[country,g.age?'Age '+g.age:'',g.body?'Body '+g.body:'',g.height?g.height+' cm':'',g.cup?g.cup+' cup':'',g.val3?'From '+g.val3+'/hr':'',g.exp||''].filter(Boolean);
const desc=parts.length?parts.join(' \u00b7 ')+' \u2013 Ginza Empire, Sydney':'View profile at Ginza Empire, Sydney.';
const title=(g.name||'Profile')+' \u2013 Ginza Empire';
set('og:title',title);set('og:description',desc);set('og:url',url);set('og:image',img);
set('twitter:title',title,'name');set('twitter:description',desc,'name');set('twitter:image',img,'name');
set('description',desc,'name');
let canon=document.querySelector('link[rel="canonical"]');if(!canon){canon=document.createElement('link');canon.rel='canonical';document.head.appendChild(canon)}canon.href=url}
function updateProfileJsonLd(g,idx){
let el=document.getElementById('profileLd');if(!el){el=document.createElement('script');el.type='application/ld+json';el.id='profileLd';document.head.appendChild(el)}
const url='https://sydneyginza.github.io'+Router.pathForProfile(idx);
const img=g.photos&&g.photos.length?g.photos[0]:'';
const country=Array.isArray(g.country)?g.country[0]:(g.country||'');
const person={"@type":"Person","name":g.name||'','worksFor':{"@id":"https://sydneyginza.github.io/#empire"}};
if(img)person.image=g.photos.length>1?g.photos:img;
if(country)person.nationality=country;
if(g.desc)person.description=g.desc.replace(/<[^>]*>/g,'').substring(0,300);
/* Offers from rates */
const offers=[];
if(g.val1)offers.push({"@type":"Offer","name":"30 min session","price":String(g.val1).replace(/[^0-9.]/g,''),"priceCurrency":"AUD"});
if(g.val2)offers.push({"@type":"Offer","name":"45 min session","price":String(g.val2).replace(/[^0-9.]/g,''),"priceCurrency":"AUD"});
if(g.val3)offers.push({"@type":"Offer","name":"60 min session","price":String(g.val3).replace(/[^0-9.]/g,''),"priceCurrency":"AUD"});
if(offers.length)person.makesOffer=offers;
/* Aggregate reviews */
const rvs=g.reviews||[];
const ld={"@context":"https://schema.org","@type":"ProfilePage","url":url,"mainEntity":person};
if(rvs.length){const avg=rvs.reduce((s,r)=>s+r.rating,0)/rvs.length;ld.mainEntity.aggregateRating={"@type":"AggregateRating","ratingValue":avg.toFixed(1),"bestRating":"5","ratingCount":rvs.length}}
el.textContent=JSON.stringify(ld);
/* Update breadcrumb */
if(typeof updateBreadcrumb==='function')updateBreadcrumb([{name:'Home',url:'https://sydneyginza.github.io/'},{name:'Girls',url:'https://sydneyginza.github.io/girls'},{name:g.name||'Profile',url:url}])}
function resetOgMeta(){
const set=(prop,val,attr)=>{attr=attr||'property';const el=document.querySelector('meta['+attr+'="'+prop+'"]');if(el)el.setAttribute('content',val)};
const t='Ginza Empire \u2013 Sydney\'s Premier Asian Bordello';
const d='Sydney\'s premier Asian bordello in Surry Hills. Browse our roster of stunning girls, check live availability, and view rates. Open daily 10:30am\u20131am at 310 Cleveland St.';
const i='https://raw.githubusercontent.com/sydneyginza/sydneyginza.github.io/main/Images/Homepage/Homepage_1.jpg';
set('og:title',t);set('og:description',d);set('og:url','https://sydneyginza.github.io');set('og:image',i);
set('twitter:title',t,'name');set('twitter:description',d,'name');set('twitter:image',i,'name');
set('description',d,'name');
const canon=document.querySelector('link[rel="canonical"]');if(canon)canon.href='https://sydneyginza.github.io';
const pld=document.getElementById('profileLd');if(pld)pld.remove();
if(typeof updateBreadcrumb==='function')updateBreadcrumb(null)}

/* Profile Page */
function renderAlsoAvailable(idx){
const g=girls[idx];if(!g)return;
const ts=fmtDate(getAEDTDate());
const alsoList=girls.filter(o=>{if(!o.name||o.name===g.name)return false;if(!isAdmin()&&o.hidden)return false;const e=getCalEntry(o.name,ts);return e&&e.start&&e.end}).slice(0,8);
if(!alsoList.length)return;
const sec=document.createElement('div');sec.className='profile-also';
const title=document.createElement('div');title.className='profile-desc-title';title.textContent=t('ui.alsoAvail');sec.appendChild(title);
const strip=document.createElement('div');strip.className='also-avail-strip';
alsoList.forEach(o=>{const ri=girls.indexOf(o);const liveNow=isAvailableNow(o.name);const card=document.createElement('div');card.className='also-avail-card';const thumb=o.photos&&o.photos.length?`<img src="${o.photos[0]}" alt="${o.name.replace(/"/g,'&quot;')}">`:'<div class="silhouette"></div>';card.innerHTML=`${thumb}<div class="also-avail-name">${o.name}</div>${liveNow?'<span class="avail-now-dot"></span>':''}`;card.onclick=()=>showProfile(ri);strip.appendChild(card)});
sec.appendChild(strip);
document.getElementById('profileContent').appendChild(sec)}

/* Similar Girls */
function _avgRate(g){const vals=[parseFloat(g.val1),parseFloat(g.val2),parseFloat(g.val3)].filter(v=>!isNaN(v)&&v>0);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0}
function computeSimilarity(a,b){
let score=0;
const ac=Array.isArray(a.country)?a.country:[a.country];
const bc=Array.isArray(b.country)?b.country:[b.country];
if(ac.some(c=>c&&bc.includes(c)))score+=1;
const aa=parseFloat(a.age),ba=parseFloat(b.age);
if(!isNaN(aa)&&!isNaN(ba)&&Math.abs(aa-ba)<=3)score+=1;
const ab=parseFloat(a.body),bb=parseFloat(b.body);
if(!isNaN(ab)&&!isNaN(bb)&&Math.abs(ab-bb)<=2)score+=1;
if(a.cup&&b.cup&&a.cup.trim().charAt(0).toUpperCase()===b.cup.trim().charAt(0).toUpperCase())score+=1;
const aAvg=_avgRate(a),bAvg=_avgRate(b);
if(aAvg>0&&bAvg>0&&Math.abs(aAvg-bAvg)/Math.max(aAvg,bAvg)<=0.2)score+=1;
const ah=parseFloat(a.height),bh=parseFloat(b.height);
if(!isNaN(ah)&&!isNaN(bh)&&Math.abs(ah-bh)<=5)score+=1;
if(a.exp&&b.exp&&a.exp===b.exp)score+=1;
const al=Array.isArray(a.labels)?a.labels:[];const bl=Array.isArray(b.labels)?b.labels:[];
if(al.length&&bl.length){const shared=al.filter(l=>bl.includes(l)).length;const union=new Set([...al,...bl]).size;if(shared/union>=0.8)score+=1}
return score/8}

function renderSimilarGirls(idx){
const g=girls[idx];if(!g||!g.name)return;
const ts=fmtDate(getAEDTDate());
const alsoNames=new Set();
girls.filter(o=>{if(!o.name||o.name===g.name)return false;if(!isAdmin()&&o.hidden)return false;const e=getCalEntry(o.name,ts);return e&&e.start&&e.end}).slice(0,8).forEach(o=>alsoNames.add(o.name));
const candidates=girls.map((o,i)=>({g:o,idx:i})).filter(x=>x.g.name&&x.g.name!==g.name&&!alsoNames.has(x.g.name)&&(isAdmin()||!x.g.hidden)).map(x=>({...x,score:computeSimilarity(g,x.g)})).filter(x=>x.score>=0.4).sort((a,b)=>b.score-a.score).slice(0,6);
if(!candidates.length)return;
const sec=document.createElement('div');sec.className='profile-also';
const title=document.createElement('div');title.className='profile-desc-title';title.textContent=t('sim.title');sec.appendChild(title);
const strip=document.createElement('div');strip.className='also-avail-strip';
candidates.forEach(c=>{const o=c.g;const liveNow=isAvailableNow(o.name);const card=document.createElement('div');card.className='also-avail-card';const thumb=o.photos&&o.photos.length?`<img src="${o.photos[0]}" alt="${o.name.replace(/"/g,'&quot;')}">`:'<div class="silhouette"></div>';card.innerHTML=`${thumb}<div class="also-avail-name">${o.name}</div>${liveNow?'<span class="avail-now-dot"></span>':''}`;card.onclick=()=>showProfile(c.idx);strip.appendChild(card)});
sec.appendChild(strip);document.getElementById('profileContent').appendChild(sec)}


function updateFavBadge(){const b=document.getElementById('navFavBadge');const c=getFavCount();if(b)b.textContent=c>0?c:''}

function favHeartSvg(filled){return filled?'<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>'}

/* ── Reviews ── */
const starSvgFull='<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
const starSvgEmpty='<svg viewBox="0 0 24 24" width="16" height="16"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>';
const verifiedSvg='<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>';
const helpfulThumbSvg='<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';
let _reviewSort='newest';

function renderStarsStatic(rating){let h='';for(let i=1;i<=5;i++)h+='<span class="review-star'+(i<=rating?' filled':'')+'">'+( i<=rating?starSvgFull:starSvgEmpty)+'</span>';return h}

function renderReviews(idx){
const container=document.getElementById('profileReviews');if(!container)return;
const g=girls[idx];if(!g)return;
const reviews=g.reviews||[];
const avg=reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0;
const hasReviewed=loggedIn&&reviews.some(r=>r.user===loggedInUser);
let html='<div class="profile-reviews"><div class="profile-desc-title" style="margin-top:32px">'+t('review.title');
if(reviews.length)html+=' <span class="review-count">('+reviews.length+')</span>';
html+='</div>';
/* Write / Sign-in prompt */
if(loggedIn&&!hasReviewed){html+='<button class="review-write-btn" id="rvWriteBtn">'+t('review.write')+'</button>'}
else if(!loggedIn){html+='<div class="review-signin">'+t('review.signin').replace('{link}','<a href="#" id="rvSignInLink">'+t('ui.signIn')+'</a>')+'</div>'}
html+='<div id="rvFormArea"></div>';
/* Sort bar */
if(reviews.length>1){html+='<div class="review-sort-bar"><button class="review-sort-btn'+(_reviewSort==='newest'?' active':'')+'" data-sort="newest">'+t('review.sortNewest')+'</button><button class="review-sort-btn'+(_reviewSort==='helpful'?' active':'')+'" data-sort="helpful">'+t('review.sortHelpful')+'</button></div>'}
/* Review list */
if(!reviews.length){html+='<div class="review-empty">'+t('review.noReviews')+'</div>'}
const sorted=reviews.slice().sort((a,b)=>{
  if(_reviewSort==='helpful'){const ha=(a.helpful||[]).length,hb=(b.helpful||[]).length;if(hb!==ha)return hb-ha;return new Date(b.ts)-new Date(a.ts)}
  return new Date(b.ts)-new Date(a.ts)});
sorted.forEach(r=>{
const isOwn=loggedIn&&r.user===loggedInUser;
const canEdit=isOwn||isAdmin();
const d=new Date(r.ts);const dateStr=d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
html+='<div class="review-card"><div class="review-header"><span class="review-user">'+r.user.toUpperCase()+'</span>';
if(r.verified)html+='<span class="review-verified-badge" title="'+t('review.verifiedTip')+'">'+verifiedSvg+' '+t('review.verified')+'</span>';
html+='<span class="review-stars">'+renderStarsStatic(r.rating)+'</span><span class="review-date">'+dateStr+'</span></div>';
if(r.text)html+='<div class="review-text">'+r.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';
/* Review photos */
if(r.photos&&r.photos.length){html+='<div class="review-photos">';r.photos.forEach(src=>{html+='<div class="review-photo"><img src="'+src+'" loading="lazy" alt="Review photo"></div>'});html+='</div>'}
/* Helpful voting */
const helpfulCount=(r.helpful||[]).length;
const hasVoted=loggedIn&&(r.helpful||[]).includes(loggedInUser);
html+='<div class="review-helpful">';
if(loggedIn&&!isOwn){html+='<button class="review-helpful-btn'+(hasVoted?' voted':'')+'" data-rv-user="'+r.user+'">'+helpfulThumbSvg+(hasVoted?t('review.helpfulVoted'):t('review.helpful'))+'</button>'}
if(helpfulCount>0){html+='<span class="review-helpful-count">'+helpfulCount+' '+(helpfulCount===1?t('review.helpfulOne'):t('review.helpfulMany'))+'</span>'}
html+='</div>';
/* Edit/delete/verify actions */
if(canEdit){html+='<div class="review-actions">';
if(isOwn||isAdmin())html+='<button class="review-action-btn review-edit-btn" data-rv-user="'+r.user+'">'+t('review.edit')+'</button>';
if(isAdmin()&&!r.verified)html+='<button class="review-action-btn review-verify-btn" data-rv-user="'+r.user+'">'+t('review.verify')+'</button>';
html+='<button class="review-action-btn review-delete-btn" data-rv-user="'+r.user+'">'+t('review.delete')+'</button></div>'}
html+='</div>'});
html+='</div>';
container.innerHTML=html;
/* Bind events */
const writeBtn=document.getElementById('rvWriteBtn');
if(writeBtn)writeBtn.onclick=()=>openReviewForm(idx,null);
const signInLink=document.getElementById('rvSignInLink');
if(signInLink)signInLink.onclick=e=>{e.preventDefault();showAuthSignIn()};
container.querySelectorAll('.review-sort-btn').forEach(btn=>{btn.onclick=()=>{_reviewSort=btn.dataset.sort;renderReviews(idx)}});
container.querySelectorAll('.review-edit-btn').forEach(btn=>{btn.onclick=()=>{const rv=(g.reviews||[]).find(r=>r.user===btn.dataset.rvUser);if(rv)openReviewForm(idx,rv)}});
container.querySelectorAll('.review-verify-btn').forEach(btn=>{btn.onclick=async()=>{const rv=(g.reviews||[]).find(r=>r.user===btn.dataset.rvUser);if(rv){rv.verified=true;if(await saveData()){showToast(t('review.verifiedDone'));renderReviews(idx)}}}});
container.querySelectorAll('.review-helpful-btn').forEach(btn=>{btn.onclick=async()=>{const rv=(g.reviews||[]).find(r=>r.user===btn.dataset.rvUser);if(!rv)return;if(!rv.helpful)rv.helpful=[];const hi=rv.helpful.indexOf(loggedInUser);if(hi>=0)rv.helpful.splice(hi,1);else rv.helpful.push(loggedInUser);if(!rv.helpful.length)delete rv.helpful;if(await saveData())renderReviews(idx)}});
container.querySelectorAll('.review-delete-btn').forEach(btn=>{btn.onclick=async()=>{if(!confirm(t('review.confirmDelete')))return;const u=btn.dataset.rvUser;g.reviews=(g.reviews||[]).filter(r=>r.user!==u);if(await saveData()){showToast(t('review.deleted'));renderReviews(idx)}}});
container.querySelectorAll('.review-photo').forEach(ph=>{ph.onclick=()=>{const src=ph.querySelector('img').src;if(src){const lb=document.getElementById('galMain');const lbImg=document.getElementById('lbImg');if(lb&&lbImg){lbImg.src=src}}}})}

function openReviewForm(idx,existing){
const area=document.getElementById('rvFormArea');if(!area)return;
const rating=existing?existing.rating:0;
const text=existing?existing.text:'';
let rvFormPhotos=existing&&existing.photos?[...existing.photos]:[];
let rvNewPhotos=[];
let html='<div class="review-form"><div class="review-stars-input" id="rvStarPicker">';
for(let i=1;i<=5;i++)html+='<span class="review-star-pick'+(i<=rating?' active':'')+'" data-val="'+i+'">'+starSvgFull+'</span>';
html+='</div><textarea class="review-textarea" id="rvText" placeholder="'+t('review.placeholder')+'" rows="3">'+text.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</textarea>';
/* Photo upload area */
html+='<div class="review-photos-area"><div class="review-photos-grid" id="rvPhotoGrid"></div>';
html+='<button type="button" class="review-photo-add-btn" id="rvPhotoAdd">'+t('review.addPhoto')+'</button></div>';
html+='<div class="review-form-actions"><button class="btn btn-primary review-submit-btn" id="rvSubmitBtn">'+(existing?t('review.edit'):t('review.write'))+'</button><button class="btn review-cancel-btn" id="rvCancelBtn">'+t('ui.cancel')+'</button></div>';
html+='<div class="review-form-error" id="rvError"></div></div>';
area.innerHTML=html;
let picked=rating;
function renderRvPhotos(){const grid=document.getElementById('rvPhotoGrid');if(!grid)return;grid.innerHTML='';
rvFormPhotos.forEach((src,i)=>{const wrap=document.createElement('div');wrap.className='rv-photo-thumb';wrap.innerHTML='<img src="'+src+'"><button class="rv-photo-remove">&times;</button>';wrap.querySelector('.rv-photo-remove').onclick=()=>{rvFormPhotos.splice(i,1);rvNewPhotos=rvNewPhotos.filter(p=>p!==src);renderRvPhotos()};grid.appendChild(wrap)});
const addBtn=document.getElementById('rvPhotoAdd');if(addBtn)addBtn.style.display=rvFormPhotos.length>=3?'none':''}
renderRvPhotos();
document.getElementById('rvPhotoAdd').onclick=()=>{
  const remaining=3-rvFormPhotos.length;if(remaining<=0)return;
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.multiple=true;
  inp.onchange=e=>{Array.from(e.target.files).slice(0,remaining).forEach(f=>{const reader=new FileReader();reader.onload=ev=>{
    const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');const maxW=1200;let w=img.width,h=img.height;if(w>maxW){h=h*maxW/w;w=maxW}canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);const resized=canvas.toDataURL('image/jpeg',0.85);rvFormPhotos.push(resized);rvNewPhotos.push(resized);renderRvPhotos()};img.src=ev.target.result};reader.readAsDataURL(f)})};inp.click()};
document.getElementById('rvStarPicker').querySelectorAll('.review-star-pick').forEach(s=>{
s.onmouseenter=()=>{const v=parseInt(s.dataset.val);document.getElementById('rvStarPicker').querySelectorAll('.review-star-pick').forEach((ss,i)=>ss.classList.toggle('hover',i<v))};
s.onmouseleave=()=>{document.getElementById('rvStarPicker').querySelectorAll('.review-star-pick').forEach(ss=>ss.classList.remove('hover'))};
s.onclick=()=>{picked=parseInt(s.dataset.val);document.getElementById('rvStarPicker').querySelectorAll('.review-star-pick').forEach((ss,i)=>ss.classList.toggle('active',i<picked))}});
document.getElementById('rvCancelBtn').onclick=()=>{area.innerHTML='';if(!existing){const wb=document.getElementById('rvWriteBtn');if(wb)wb.style.display=''}};
document.getElementById('rvSubmitBtn').onclick=async()=>{
if(!picked){document.getElementById('rvError').textContent=t('review.ratingRequired');return}
const g=girls[idx];if(!g.reviews)g.reviews=[];
const txt=document.getElementById('rvText').value.trim();
const submitBtn=document.getElementById('rvSubmitBtn');submitBtn.textContent=t('ui.saving');submitBtn.disabled=true;
try{
/* Upload new photos */
const uploadedUrls=[];
for(const b64 of rvNewPhotos){try{const url=await uploadReviewPhoto(b64);uploadedUrls.push(url)}catch(e){console.error('Review photo upload failed:',e)}}
const finalPhotos=rvFormPhotos.filter(p=>!p.startsWith('data:')).concat(uploadedUrls);
if(existing){const rv=g.reviews.find(r=>r.user===existing.user);if(rv){rv.rating=picked;rv.text=txt;rv.ts=new Date().toISOString();rv.photos=finalPhotos.length?finalPhotos:undefined}}
else{const newRv={user:loggedInUser,rating:picked,text:txt,ts:new Date().toISOString()};if(finalPhotos.length)newRv.photos=finalPhotos;g.reviews.push(newRv)}
if(await saveData()){showToast(existing?t('review.updated'):t('review.submitted'));renderReviews(idx)}
}finally{submitBtn.textContent=existing?t('review.edit'):t('review.write');submitBtn.disabled=false}};
const wb=document.getElementById('rvWriteBtn');if(wb)wb.style.display='none'}

function showProfile(idx){safeRender('Profile',()=>{
const g=girls[idx];if(!g)return;if(g.hidden&&!isAdmin()){showPage('homePage');return}currentProfileIdx=idx;if(!g.photos)g.photos=[];if(g.name)addRecentlyViewed(g.name);
if(_countdownInterval){clearInterval(_countdownInterval);_countdownInterval=null}
updateOgMeta(g,idx);updateProfileJsonLd(g,idx);
/* URL routing & dynamic title */
const profTitle=g.name?'Ginza Empire – '+g.name:'Ginza Empire – Profile';
document.title=profTitle;
Router.push(Router.pathForProfile(idx),profTitle);
const admin=isAdmin()?`<div class="profile-actions"><button class="btn btn-primary" id="profEdit">${t('ui.edit')}</button><button class="btn btn-danger" id="profDelete">${t('ui.delete')}</button></div>`:'';
const now=getAEDTDate();const ts=fmtDate(now);const _profVac=g.name&&_isOnVacation(g.name,ts);const entry=_profVac?null:getCalEntry(g.name,ts);
const liveNow=!_profVac&&g.name&&isAvailableNow(g.name);
const _todayShiftEnded=entry&&entry.start&&entry.end&&!liveNow&&(()=>{const nm=now.getHours()*60+now.getMinutes();const[eh,em]=entry.end.split(':').map(Number);const[sh,sm]=entry.start.split(':').map(Number);return eh*60+em>sh*60+sm&&nm>=eh*60+em})();
let availHtml='';if(liveNow)availHtml='<span class="dim">|</span><span class="profile-avail-live"><span class="avail-now-dot"></span>'+t('avail.now')+' ('+fmtTime12(entry.start)+' - '+fmtTime12(entry.end)+')</span>';
else if(entry&&entry.start&&entry.end&&!_todayShiftEnded)availHtml='<span class="dim">|</span><span style="color:#ffcc44;font-weight:600">'+t('avail.laterToday')+' ('+fmtTime12(entry.start)+' - '+fmtTime12(entry.end)+')</span>';
else{const wdates=getWeekDates();const upcoming=wdates.find(dt=>dt>ts&&!_isOnVacation(g.name,dt)&&(getCalEntry(g.name,dt)||{}).start);if(upcoming){if(!isDatePublished(upcoming)){availHtml='<span class="dim">|</span><span class="profile-avail-coming">'+t('avail.comingSoon')+'</span>'}else{const dn=dispDate(upcoming).day;const upEnt=getCalEntry(g.name,upcoming);const timeStr=upEnt&&upEnt.start&&upEnt.end?' ('+fmtTime12(upEnt.start)+' - '+fmtTime12(upEnt.end)+')':'';const _fmtD=m=>{const d=Math.floor(m/1440),h=Math.floor((m%1440)/60),mm=m%60;return d>0?`${d}d ${h}h`:h>0?`${h}h ${mm}m`:`${mm}m`};const daysUntil=Math.round((new Date(upcoming+' 00:00')-new Date(ts+' 00:00'))/86400000);const nowMins=now.getHours()*60+now.getMinutes();const[ush,usm]=(upEnt&&upEnt.start||'00:00').split(':').map(Number);const totalMins=daysUntil*1440+ush*60+usm-nowMins;const comingCd=totalMins>0?' · '+t('avail.startsIn').replace('{t}',_fmtD(totalMins)):'';availHtml='<span class="dim">|</span><span class="profile-avail-coming">'+t('avail.coming')+' '+dn+timeStr+comingCd+'</span>'}}else{const lr=getLastRostered(g.name);if(lr){const diff=Math.round((new Date(ts+' 00:00')-new Date(lr+' 00:00'))/86400000);const rel=diff===0?'today':diff===1?'yesterday':diff+' days ago';availHtml='<span class="dim">|</span><span class="profile-avail-last">'+t('avail.lastSeen')+' '+rel+'</span>'}}}
const _cd=!_profVac&&g.name?getAvailCountdown(g.name):null;
if(_cd){const _cdKey=_cd.type==='ends'?'avail.endsIn':'avail.startsIn';availHtml+='<span class="dim"> · </span><span id="profCountdown">'+t(_cdKey).replace('{t}',_cd.str)+'</span>'}
const rvs=g.reviews||[];const rvAvg=rvs.length?rvs.reduce((s,r)=>s+r.rating,0)/rvs.length:0;
const ratingHtml=rvs.length?'<span class="dim">|</span><span class="profile-rating-summary">'+renderStarsStatic(Math.round(rvAvg))+'<span class="profile-rating-num">'+rvAvg.toFixed(1)+' / 5</span><span class="profile-rating-count">('+rvs.length+')</span></span>':'';
const stats=[{l:t('field.age'),v:g.age},{l:t('field.body'),v:g.body},{l:t('field.height'),v:g.height+' cm'},{l:t('field.cup'),v:g.cup},{l:t('field.rates30'),v:g.val1||'\u2014'},{l:t('field.rates45'),v:g.val2||'\u2014'},{l:t('field.rates60'),v:g.val3||'\u2014'},{l:t('field.experience'),v:g.exp||'\u2014'}];
const mainImg=g.photos.length?`<img src="${g.photos[0]}" alt="${(g.name||'').replace(/"/g,'&quot;')}">`:'<div class="silhouette"></div>';
const hasMultiple=g.photos.length>1;
const arrows=hasMultiple?`<button class="gallery-main-arrow prev" id="galPrev"><svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg></button><button class="gallery-main-arrow next" id="galNext"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></button>`:'';
const counter=g.photos.length?`<div class="gallery-counter" id="galCounter"><span>1</span> / ${g.photos.length}</div>`:'';
const zoomHint=g.photos.length?`<div class="gallery-zoom-hint">Click to expand</div>`:'';
const isFav=g.name&&isFavorite(g.name);
const favBtn=g.name&&loggedIn?`<button class="profile-fav-btn${isFav?' active':''}" id="profFavBtn">${favHeartSvg(isFav)}${isFav?t('ui.favorited'):t('ui.addFav')}</button>`:'';
const shareBtn=g.name?`<button class="profile-share-btn" id="profShareBtn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>${t('ui.share')}</button>`:'';
const _onVac=g.name&&_isOnVacation(g.name,ts);
const bookBtn=g.name&&!_onVac?(loggedIn?`<button class="profile-book-btn" id="profBookBtn"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/></svg>${t('enquiry.bookBtn')}</button>`:`<div class="review-signin">${t('enquiry.signin').replace('{link}','<a href="#" id="profBookSignIn">'+t('ui.signIn')+'</a>')}</div>`):'';
const _backLabel={listPage:t('page.girls'),rosterPage:t('page.roster'),homePage:t('nav.home'),favoritesPage:t('page.favorites')}[profileReturnPage]||t('ui.back');
document.getElementById('profileContent').innerHTML=`<button class="back-btn" id="backBtn"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>${_backLabel}</button>
<div class="profile-nav-rail" id="profileNavRail"></div>
<div class="profile-layout"><div class="profile-image-area"><div class="gallery-main" id="galMain">${mainImg}${arrows}${counter}${zoomHint}</div><div class="gallery-thumbs" id="galThumbs"></div></div>
<div class="profile-details"><div class="profile-name">${g.name}${(()=>{if(_isVacReturnDay(g.name,ts))return'<span class="vac-comeback">'+t('badge.comeBack')+'</span>';const _vcd=_vacCountdownLabel(g.name,ts);return _vcd?`<span class="vac-lastdays">${_vcd}</span>`:'';})()}${_isNewGirl(g)?'<span class="new-badge">'+t('badge.new')+'</span>':''}</div><div class="profile-meta"><span>${Array.isArray(g.country)?g.country.join(', '):g.country}</span>${g.special?'<span class="profile-special">'+g.special+'</span>':''}${availHtml}${ratingHtml}</div><div class="profile-action-row">${favBtn}${shareBtn}${bookBtn}</div><div class="profile-divider" style="margin-top:24px"></div>
<div class="profile-stats">${stats.map(s=>`<div class="profile-stat"><div class="p-label">${s.l}</div><div class="p-val">${s.v}</div></div>`).join('')}</div>
<div class="profile-desc-title">${t('field.special')}</div><div class="profile-desc" id="profSpecialText" style="margin-bottom:24px">${g.special||'\u2014'}</div>
<div class="profile-desc-title">${t('field.language')}</div><div class="profile-desc" id="profLangText" style="margin-bottom:24px">${g.lang||'\u2014'}</div>
<div class="profile-desc-title">${t('field.type')}</div><div class="profile-desc" id="profTypeText" style="margin-bottom:24px">${g.type||'\u2014'}</div>
<div class="profile-desc-title">${t('field.description')}</div><div class="profile-desc" id="profDescText">${g.desc||''}</div>
${(()=>{const lbls=g.labels||[];return lbls.length?`<div class="profile-desc-title" style="margin-top:24px">${t('field.labels')}</div><div class="profile-labels">${lbls.slice().sort().map(l=>`<span class="profile-label">${l}</span>`).join('')}</div>`:''})()}${admin}<div id="profileReviews"></div></div></div>`;
document.getElementById('backBtn').onclick=()=>{showPage(profileReturnPage)};
if(_cd){startCountdownTick()}
if(isAdmin()){document.getElementById('profEdit').onclick=()=>openForm(idx);document.getElementById('profDelete').onclick=()=>openDelete(idx)}
const profFav=document.getElementById('profFavBtn');
if(profFav){profFav.onclick=()=>{const nowFav=toggleFavorite(g.name);profFav.classList.toggle('active',nowFav);profFav.innerHTML=favHeartSvg(nowFav)+(nowFav?t('ui.favorited'):t('ui.addFav'));updateFavBadge()}}
const profShare=document.getElementById('profShareBtn');
if(profShare){profShare.onclick=async()=>{const url=window.location.origin+Router.pathForProfile(idx);if(navigator.share){try{await navigator.share({title:g.name+' - Ginza',text:g.name+' at Ginza Sydney',url})}catch(e){}}else{try{await navigator.clipboard.writeText(url);showToast(t('ui.linkCopied'))}catch(e){const tmp=document.createElement('input');tmp.value=url;document.body.appendChild(tmp);tmp.select();document.execCommand('copy');document.body.removeChild(tmp);showToast(t('ui.linkCopied'))}}}}
const profBook=document.getElementById('profBookBtn');
if(profBook){profBook.onclick=()=>openEnquiryForm(g.name,idx)}
const profBookSignIn=document.getElementById('profBookSignIn');
if(profBookSignIn){profBookSignIn.onclick=e=>{e.preventDefault();showAuthSignIn()}}
renderGallery(idx);renderReviews(idx);renderSimilarGirls(idx);renderProfileNav(idx);closeFilterPanel();_activeFilterPaneId='sharedFilterPane';renderFilterPane('sharedFilterPane');const _prevPg=document.querySelector('.page.active');const _profPg=document.getElementById('profilePage');const _pec=['page-enter','slide-enter-right','slide-enter-left'];_profPg.classList.remove(..._pec);if(_prevPg&&_prevPg!==_profPg){_prevPg.classList.remove('active',..._pec);_prevPg.classList.add('slide-exit-left');const _onEx=()=>{_prevPg.classList.remove('slide-exit-left');_prevPg.removeEventListener('animationend',_onEx)};_prevPg.addEventListener('animationend',_onEx);setTimeout(()=>_prevPg.classList.remove('slide-exit-left'),400);void _profPg.offsetWidth;_profPg.classList.add('active','slide-enter-right')}else{allPages.forEach(p=>p.classList.remove('active',..._pec));void _profPg.offsetWidth;_profPg.classList.add('active','page-enter')}document.querySelectorAll('.nav-dropdown a').forEach(a=>a.classList.remove('active'));updateFilterToggle();window.scrollTo(0,0);requestAnimationFrame(()=>window.scrollTo(0,0));setTimeout(()=>window.scrollTo(0,0),300)})}

/* Profile Gallery */
let galIdx=0,_galAutoPlay=null;
function _clearGalAuto(){clearInterval(_galAutoPlay);_galAutoPlay=null}
function galGoTo(idx,photos){
const main=document.getElementById('galMain');if(!main)return;
const img=main.querySelector('img');if(!img)return;
img.classList.add('gallery-fade-out');
setTimeout(()=>{galIdx=idx;img.src=photos[idx];img.onload=()=>img.classList.remove('gallery-fade-out');
const counter=document.getElementById('galCounter');if(counter)counter.innerHTML=`<span>${idx+1}</span> / ${photos.length}`;
const thumbs=document.getElementById('galThumbs');if(thumbs){thumbs.querySelectorAll('.gallery-thumb').forEach((t,i)=>t.classList.toggle('active',i===idx));const active=thumbs.querySelector('.gallery-thumb.active');if(active){const tl=active.offsetLeft,tw=active.offsetWidth,sw=thumbs.offsetWidth,sl=thumbs.scrollLeft;if(tl<sl||tl+tw>sl+sw)thumbs.scrollLeft=tl-sw/2+tw/2}}},180)}

function renderGallery(idx){
const g=girls[idx];if(!g||!g.photos)return;
_clearGalAuto();galIdx=0;
const main=document.getElementById('galMain');
let _galSwipe=false;
/* Touch swipe for photo gallery on mobile */
if(main&&g.photos.length>1){
let sx=0,sy=0;
main.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;_galSwipe=false},{passive:true});
main.addEventListener('touchmove',e=>{if(Math.abs(e.touches[0].clientX-sx)>8)_galSwipe=true},{passive:true});
main.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){if(dx<0)galGoTo((galIdx+1)%g.photos.length,g.photos);else galGoTo((galIdx-1+g.photos.length)%g.photos.length,g.photos)}},{passive:true})}
/* Main image click opens lightbox */
if(main&&g.photos.length){main.onclick=e=>{if(e.target.closest('.gallery-main-arrow'))return;if(_galSwipe){_galSwipe=false;return}openLightbox(g.photos,galIdx,g.name)}}
/* Prev/next arrows on main image */
const prevBtn=document.getElementById('galPrev'),nextBtn=document.getElementById('galNext');
if(prevBtn)prevBtn.onclick=e=>{e.stopPropagation();_clearGalAuto();galGoTo((galIdx-1+g.photos.length)%g.photos.length,g.photos)};
if(nextBtn)nextBtn.onclick=e=>{e.stopPropagation();_clearGalAuto();galGoTo((galIdx+1)%g.photos.length,g.photos)};
/* Auto-rotate every 3s while profile page is active */
if(g.photos.length>1){_galAutoPlay=setInterval(()=>{if(!document.getElementById('profilePage')?.classList.contains('active')){_clearGalAuto();return}galGoTo((galIdx+1)%g.photos.length,g.photos)},3000)}
/* Thumbnails */
const c=document.getElementById('galThumbs');if(!c)return;c.innerHTML='';
g.photos.forEach((src,i)=>{const t=document.createElement('div');t.className='gallery-thumb'+(i===0?' active':'');t.innerHTML=`<img src="${src}" alt="${(g.name||'').replace(/"/g,'&quot;')}">`;
t.onclick=()=>{_clearGalAuto();galGoTo(i,g.photos)};
if(isAdmin()){const rm=document.createElement('button');rm.className='gallery-thumb-remove';rm.innerHTML='&#x2715;';rm.onclick=async e=>{e.stopPropagation();if(src.includes('githubusercontent.com'))await deleteFromGithub(src);g.photos.splice(i,1);await saveData();showProfile(idx);renderGrid();renderRoster();renderHome();showToast('Photo removed')};t.appendChild(rm)}
c.appendChild(t)})}

/* My Profile Modal */
function openMyProfile(){
const overlay=document.getElementById('myProfileOverlay');
const entry=CRED.find(c=>c.user===loggedInUser);if(!entry)return;
const roleBadge=loggedInRole==='owner'?'<span class="mp-role-badge owner">OWNER</span>':loggedInRole==='admin'?'<span class="mp-role-badge admin">ADMIN</span>':'<span class="mp-role-badge member">MEMBER</span>';
document.getElementById('mpUserDisplay').innerHTML=`<div class="mp-username">${loggedInUser.toUpperCase()}</div>${roleBadge}`;
document.getElementById('mpEmail').value=entry.email||'';
document.getElementById('mpMobile').value=entry.mobile||'';
document.getElementById('mpNewPass').value='';
document.getElementById('mpConfirmPass').value='';
document.getElementById('mpError').textContent='';
const bkSec=document.getElementById('mpBookingSection');
const _mpNow=new Date(),_mpH=_mpNow.getHours(),_mpM=_mpNow.getMinutes(),_mpNowMin=_mpH<10?(_mpH+24)*60+_mpM:_mpH*60+_mpM,_mpToday=_mpNow.toISOString().slice(0,10);
const myBk=(Array.isArray(calData._bookings)&&calData._bookings.filter(b=>b.user===loggedInUser&&(b.status==='pending'||b.status==='approved')&&(b.date>_mpToday||(b.date===_mpToday&&b.endMin>_mpNowMin))).sort((a,b)=>a.date!==b.date?a.date.localeCompare(b.date):a.startMin-b.startMin)[0])||null;
if(myBk&&bkSec){
  const f=dispDate(myBk.date);
  const dur=myBk.endMin-myBk.startMin;
  const durStr=dur>=60?(dur/60)+'hr'+(dur>60?'s':''):dur+' min';
  document.getElementById('mpBookingCard').innerHTML=
    '<div class="mp-bk-row"><span class="mp-bk-label">Girl</span><a class="mp-bk-girl-link" href="#">'+myBk.girlName+'</a></div>'+
    '<div class="mp-bk-row"><span class="mp-bk-label">Date</span><span>'+f.day+' '+f.date+'</span></div>'+
    '<div class="mp-bk-row"><span class="mp-bk-label">Time</span><span>'+fmtSlotTime(myBk.startMin)+' – '+fmtSlotTime(myBk.endMin)+'</span></div>'+
    '<div class="mp-bk-row"><span class="mp-bk-label">Duration</span><span>'+durStr+'</span></div>'+
    '<div class="mp-bk-row"><span class="mp-bk-label">Status</span><span class="mp-bk-status">'+(myBk.status==='approved'?'Approved':'Pending Review')+'</span></div>';
  const _gl=document.getElementById('mpBookingCard').querySelector('.mp-bk-girl-link');
  if(_gl){_gl.onclick=e=>{e.preventDefault();const _gi=girls.findIndex(f=>f.name&&f.name.trim().toLowerCase()===myBk.girlName.trim().toLowerCase());if(_gi!==-1){document.getElementById('myProfileOverlay').classList.remove('open');showProfile(_gi)}}}
  bkSec.style.display='';
}else if(bkSec){bkSec.style.display='none'}
overlay.classList.add('open')}

document.getElementById('myProfileClose').onclick=()=>document.getElementById('myProfileOverlay').classList.remove('open');
document.getElementById('myProfileCancel').onclick=()=>document.getElementById('myProfileOverlay').classList.remove('open');
document.getElementById('myProfileOverlay').onclick=e=>{if(e.target.id==='myProfileOverlay')e.target.classList.remove('open')};

document.getElementById('myProfileSave').onclick=async()=>{
const entry=CRED.find(c=>c.user===loggedInUser);if(!entry)return;
const newPass=document.getElementById('mpNewPass').value;
const confirmPass=document.getElementById('mpConfirmPass').value;
const errEl=document.getElementById('mpError');
const emailVal=document.getElementById('mpEmail').value.trim();
if(!emailVal){errEl.textContent=t('ui.emailRequired');return}
if(newPass&&newPass!==confirmPass){errEl.textContent=t('ui.passwordMismatch');return}
errEl.textContent='';
const saveBtn=document.getElementById('myProfileSave');saveBtn.textContent='SAVING...';saveBtn.style.pointerEvents='none';
try{
entry.email=document.getElementById('mpEmail').value.trim()||undefined;
entry.mobile=document.getElementById('mpMobile').value.trim()||undefined;
if(newPass)entry.pass=newPass;
loggedInEmail=entry.email||null;
loggedInMobile=entry.mobile||null;
if(await saveAuth()){document.getElementById('myProfileOverlay').classList.remove('open');showToast(t('ui.profileSaved'))}
}catch(e){errEl.textContent='Error: '+e.message}finally{saveBtn.textContent=t('form.save');saveBtn.style.pointerEvents='auto'}};

/* Auth / Login */
const loginIconBtn=document.getElementById('loginIconBtn'),userDropdown=document.getElementById('userDropdown');
const authOverlay=document.getElementById('authOverlay'),authContent=document.getElementById('authContent');
document.getElementById('authClose').onclick=()=>authOverlay.classList.remove('open');
authOverlay.onclick=e=>{if(e.target===authOverlay)authOverlay.classList.remove('open')};

function renderDropdown(){
if(loggedIn){loginIconBtn.classList.add('logged-in');userDropdown.innerHTML=`<div class="dropdown-header"><div class="label">Signed in as</div><div class="user">${(loggedInUser||'ADMIN').toUpperCase()}</div></div><button class="dropdown-item" id="myProfileBtn">${t('ui.myProfile')}</button><button class="dropdown-item danger" id="logoutBtn">Sign Out</button>`;
document.getElementById('myProfileBtn').onclick=()=>{userDropdown.classList.remove('open');openMyProfile()};
document.getElementById('logoutBtn').onclick=()=>{try{localStorage.removeItem('ginza_session')}catch(_){}loggedIn=false;loggedInUser=null;loggedInRole=null;loggedInEmail=null;loggedInMobile=null;loginIconBtn.classList.remove('logged-in');userDropdown.classList.remove('open');
/* Hide theme + sound buttons, stop sound, reset theme */
const _tbwL=document.getElementById('themeBtnWrap');if(_tbwL)_tbwL.style.display='none';
const _abwL=document.getElementById('ambientBtnWrap');if(_abwL)_abwL.style.display='none';
if(typeof window._ambientStop==='function')window._ambientStop();
clearCompare();closeCompareModal();
if(typeof setLanguage==='function')setLanguage('en');
applySeasonalTheme();document.getElementById('navFavorites').style.display='none';const _bnf=document.getElementById('bnFavorites');if(_bnf)_bnf.style.display='none';document.getElementById('navCalendar').style.display='none';document.getElementById('navAnalytics').style.display='none';document.getElementById('navProfileDb').style.display='none';document.getElementById('navBookings').style.display='none';document.getElementById('navVacation').style.display='none';document.querySelectorAll('.page-edit-btn').forEach(b=>b.style.display='none');if(document.getElementById('favoritesPage').classList.contains('active')||document.getElementById('calendarPage').classList.contains('active')||document.getElementById('analyticsPage').classList.contains('active')||document.getElementById('profileDbPage').classList.contains('active')||document.getElementById('bookingsPage').classList.contains('active')||document.getElementById('vacationPage').classList.contains('active'))showPage('homePage');renderDropdown();renderFilters();renderGrid();renderRoster();renderHome();document.body.classList.remove('vip-mode');_vipSparkles.forEach(s=>s.remove());_vipSparkles.length=0}}
else{loginIconBtn.classList.remove('logged-in');userDropdown.innerHTML=''}}

function showAuthSignIn(){
authContent.innerHTML=`<div class="form-title">${t('ui.signIn')}</div><div class="form-row full"><div class="form-group"><label class="form-label">Username</label><input class="form-input" id="lfUser" placeholder="Username" autocomplete="off"></div></div><div class="form-row full"><div class="form-group"><label class="form-label">Password</label><input class="form-input" id="lfPass" type="password" placeholder="Password"></div></div><div class="form-actions" style="justify-content:center"><button class="btn btn-primary" id="lfBtn" style="width:100%">${t('ui.signIn')}</button></div><div class="lf-remember"><label class="lf-remember-label"><input type="checkbox" id="lfRemember" checked> Stay logged in</label></div><div class="lf-error" id="lfError"></div><div class="lf-switch">${t('ui.noAccount')} <a href="#" id="lfSignUpLink">${t('ui.signUp')}</a></div>`;
document.getElementById('lfBtn').onclick=doLogin;
document.getElementById('lfPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
document.getElementById('lfUser').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('lfPass').focus()});
document.getElementById('lfSignUpLink').onclick=e=>{e.preventDefault();showAuthSignUp()};
authOverlay.classList.add('open')}

function showAuthSignUp(){
authContent.innerHTML=`<div class="form-title">${t('ui.signUp')}</div><div class="form-row full"><div class="form-group"><label class="form-label">Username *</label><input class="form-input" id="suUser" placeholder="Username" autocomplete="off"></div></div><div class="form-row full"><div class="form-group"><label class="form-label">${t('field.email')} *</label><input class="form-input" id="suEmail" type="email" placeholder="email@example.com"></div></div><div class="form-row full"><div class="form-group"><label class="form-label">${t('field.mobile')}</label><input class="form-input" id="suMobile" type="tel" placeholder="04XX XXX XXX"></div></div><div class="form-row full"><div class="form-group"><label class="form-label">Password *</label><input class="form-input" id="suPass" type="password" placeholder="Password"></div></div><div class="form-row full"><div class="form-group"><label class="form-label">${t('ui.confirmPassword')} *</label><input class="form-input" id="suConfirm" type="password" placeholder="Confirm"></div></div><div class="form-actions" style="justify-content:center"><button class="btn btn-primary" id="suBtn" style="width:100%">${t('ui.createAccount')}</button></div><div class="lf-error" id="suError"></div><div class="lf-switch">${t('ui.haveAccount')} <a href="#" id="suSignInLink">${t('ui.signIn')}</a></div>`;
document.getElementById('suBtn').onclick=doSignUp;
document.getElementById('suConfirm').addEventListener('keydown',e=>{if(e.key==='Enter')doSignUp()});
document.getElementById('suSignInLink').onclick=e=>{e.preventDefault();showAuthSignIn()};
authOverlay.classList.add('open')}

async function doSignUp(){
const u=document.getElementById('suUser').value.trim();
const email=document.getElementById('suEmail').value.trim();
const mobile=document.getElementById('suMobile').value.trim();
const pass=document.getElementById('suPass').value;
const confirm=document.getElementById('suConfirm').value;
const errEl=document.getElementById('suError');
if(!u){errEl.textContent=t('ui.usernameRequired');return}
if(CRED.some(c=>c.user.toLowerCase()===u.toLowerCase())){errEl.textContent=t('ui.usernameTaken');return}
if(!email){errEl.textContent=t('ui.emailRequired');return}
if(CRED.some(c=>c.email&&c.email.toLowerCase()===email.toLowerCase())){errEl.textContent=t('ui.emailTaken');return}
if(mobile&&CRED.some(c=>c.mobile&&c.mobile===mobile)){errEl.textContent=t('ui.mobileTaken');return}
if(!pass){errEl.textContent=t('ui.passwordRequired');return}
if(pass!==confirm){errEl.textContent=t('ui.passwordMismatch');return}
errEl.textContent='';
const btn=document.getElementById('suBtn');btn.textContent='CREATING...';btn.style.pointerEvents='none';
try{
const entry={user:u,pass,role:'member',email,mobile:mobile||undefined,status:'pending'};
CRED.push(entry);
if(await saveAuth()){
authOverlay.classList.remove('open');
showToast(t('ui.signupPending'),null,6000)}
else{CRED.pop()}
}catch(e){CRED.pop();errEl.textContent='Error: '+e.message}
finally{btn.textContent=t('ui.createAccount');btn.style.pointerEvents='auto'}}

const _vipSparkles=[];
function _applyLogin(match,_isRestore=false){loggedIn=true;loggedInUser=match.user;loggedInRole=match.role||'member';
/* Show theme + sound buttons */
const _tbw=document.getElementById('themeBtnWrap');if(_tbw)_tbw.style.display='';
const _abw=document.getElementById('ambientBtnWrap');if(_abw)_abw.style.display='';
/* Restore user language preference */
const _savedLang=match.prefs&&match.prefs.lang;
if(_savedLang&&typeof setLanguage==='function')setLanguage(_savedLang);
/* Restore user theme preference */
const _savedTheme=match.prefs&&match.prefs.theme;
if(_savedTheme)applyColorTheme(_savedTheme);else applySeasonalTheme();
/* Restore selected sound preset */
const _ambSound=match.prefs&&match.prefs.ambSound;
if(_ambSound&&typeof window._ambientSetSound==='function')window._ambientSetSound(_ambSound);
/* Sound: auto-play on fresh login; on restore wait for first user gesture */
const _soundOff=match.prefs&&match.prefs.soundOff;
if(!_soundOff){if(!_isRestore){setTimeout(()=>{if(typeof window._ambientToggle==='function')window._ambientToggle(true)},400)}else if(typeof window._ambientStartOnGesture==='function')window._ambientStartOnGesture()}loggedInEmail=match.email||null;loggedInMobile=match.mobile||null;document.getElementById('navFavorites').style.display='';const _bnfShow=document.getElementById('bnFavorites');if(_bnfShow)_bnfShow.style.display='';if(isAdmin()){document.getElementById('navCalendar').style.display='';document.getElementById('navAnalytics').style.display='';document.getElementById('navBookings').style.display='';document.getElementById('navVacation').style.display='';document.getElementById('navProfileDb').style.display='';document.querySelectorAll('.page-edit-btn').forEach(b=>b.style.display='');loadAdminModule()}renderDropdown();renderFilters();renderGrid();renderRoster();renderHome();updateFavBadge();if(document.getElementById('profilePage').classList.contains('active'))showProfile(currentProfileIdx);try{const lv=localStorage.getItem('ginza_recently_viewed');if(lv){const local=JSON.parse(lv);if(Array.isArray(local)&&local.length){const remote=Array.isArray(match.viewHistory)?match.viewHistory:[];const merged=new Map();remote.forEach(h=>{if(h.name)merged.set(h.name,h)});local.forEach(h=>{if(h.name&&(!merged.has(h.name)||merged.get(h.name).ts<h.ts))merged.set(h.name,h)});match.viewHistory=[...merged.values()].sort((a,b)=>b.ts-a.ts).slice(0,10);syncViewHistory()}localStorage.removeItem('ginza_recently_viewed')}}catch(e){}
/* VIP mode */
document.body.classList.add('vip-mode');
if(!IS_MOBILE_LITE&&!_vipSparkles.length){const _spDrifts=['floatDrift1','floatDrift2','floatDrift3','floatDrift4'];for(let i=0;i<8;i++){const s=document.createElement('div');s.className='vip-sparkle particle';const sz=3+Math.random()*2;s.style.width=s.style.height=sz+'px';s.style.left=Math.random()*100+'%';s.style.background='#ffffff';s.style.setProperty('--p-peak','0.8');s.style.animationName=_spDrifts[Math.floor(Math.random()*_spDrifts.length)];s.style.animationDuration=(8+Math.random()*12)+'s';s.style.animationDelay=Math.random()*15+'s';particlesEl.appendChild(s);_vipSparkles.push(s)}}}
/* ── Welcome Back Popup ── */
/* Respond to pings from other tabs so they know we're already open */
const _welBc=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('ginza_wel'):null;
if(_welBc)_welBc.onmessage=e=>{if(e.data==='ping')_welBc.postMessage('pong')};

function _isStillAvailToday(name){
  if(isAvailableNow(name))return true;
  const now=getAEDTDate();const entry=getCalEntry(name,fmtDate(now));
  if(!entry||!entry.start||!entry.end)return false;
  const nowMins=now.getHours()*60+now.getMinutes();
  const [sh,sm]=entry.start.split(':').map(Number);
  return nowMins<sh*60+sm;
}
function _welCardStrip(list){
  const arwSvgL='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
  const arwSvgR='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';
  let h=`<div class="avail-now-wrap"><button class="anw-arrow anw-arrow-left" aria-label="Scroll left">${arwSvgL}</button><div class="avail-now-strip">`;
  list.forEach(({g,idx})=>{
    const photo=g.photos&&g.photos.length?g.photos[0]:'';
    const live=isAvailableNow(g.name);
    const entry=getCalEntry(g.name,fmtDate(getAEDTDate()));
    const time=entry?fmtTime12(entry.start)+' - '+fmtTime12(entry.end):'';
    h+=`<div class="avail-now-card wel-card" data-idx="${idx}"><div class="anw-photo">${photo?`<img src="${photo}" alt="${g.name}">`:'<div class="anw-placeholder"></div>'}</div><div class="anw-name">${g.name}</div>${time?`<div class="anw-time">${live?'<span class="avail-now-dot wel-dot"></span> ':''}<span>${time}</span></div>`:''}</div>`;
  });
  h+='</div><button class="anw-arrow anw-arrow-right" aria-label="Scroll right">'+arwSvgR+'</button></div>';
  return h;
}
function _welBindStrip(container){
  container.querySelectorAll('.wel-card').forEach(c=>{c.onclick=()=>{const i=parseInt(c.dataset.idx);if(!isNaN(i)){_closeWelcome();profileReturnPage='homePage';showProfile(i)}}});
  container.querySelectorAll('.avail-now-wrap').forEach(wrap=>{
    const strip=wrap.querySelector('.avail-now-strip');if(!strip)return;
    const arwL=wrap.querySelector('.anw-arrow-left'),arwR=wrap.querySelector('.anw-arrow-right');
    function upd(){arwL.classList.toggle('hidden',strip.scrollLeft<=0);arwR.classList.toggle('hidden',strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2)}
    arwL.onclick=()=>{strip.scrollBy({left:-320,behavior:'smooth'})};arwR.onclick=()=>{strip.scrollBy({left:320,behavior:'smooth'})};strip.addEventListener('scroll',upd);
    let mdX=0,mdSL=0,mdActive=false,didDrag=false;
    strip.addEventListener('mousedown',e=>{mdActive=true;didDrag=false;mdX=e.pageX;mdSL=strip.scrollLeft;strip.style.cursor='grabbing';e.preventDefault()});
    document.addEventListener('mousemove',e=>{if(!mdActive)return;if(Math.abs(e.pageX-mdX)>5)didDrag=true;strip.scrollLeft=mdSL-(e.pageX-mdX)});
    document.addEventListener('mouseup',()=>{if(!mdActive)return;mdActive=false;strip.style.cursor='';setTimeout(()=>{didDrag=false},0)});
    strip.style.cursor='grab';upd();
  });
}
function showWelcomePopup(){
  const overlay=document.getElementById('welcomeOverlay');if(!overlay)return;
  const greeting=t('welcome.back').replace('{0}',loggedInUser.toUpperCase());
  let html=`<div class="welcome-greeting">${greeting}</div>`;
  /* Section 1: Favourites available today (not finished) */
  const favNames=getFavorites();
  const favAvail=favNames.map(n=>{const i=girls.findIndex(g=>g.name===n);return i>=0?{g:girls[i],idx:i}:null}).filter(Boolean).filter(x=>(isAdmin()||!x.g.hidden)&&_isStillAvailToday(x.g.name));
  if(favAvail.length){
    html+=`<div class="welcome-subtitle">${t('welcome.favTitle')}</div>`+_welCardStrip(favAvail);
  }
  /* Section 2: Recently viewed available today (not finished), exclude already in favs */
  const rv=getRecentlyViewed();
  const rvAvail=rv.map(r=>{const i=girls.findIndex(g=>g.name===r.name);return i>=0?{g:girls[i],idx:i}:null}).filter(Boolean).filter(x=>(isAdmin()||!x.g.hidden)&&_isStillAvailToday(x.g.name)&&!favNames.includes(x.g.name));
  if(rvAvail.length){
    html+=`<div class="welcome-subtitle">${t('welcome.rvTitle')}</div>`+_welCardStrip(rvAvail);
  }
  /* Empty state if nothing to show */
  if(!favAvail.length&&!rvAvail.length){
    html+=`<div class="welcome-empty"><div class="welcome-empty-text">${t('welcome.noAvail')}</div><button class="empty-state-cta welcome-browse-btn">${t('welcome.browse')}</button></div>`;
  }
  document.getElementById('welcomeContent').innerHTML=html;
  overlay.classList.add('open');
  _welBindStrip(overlay);
  const browseBtn=overlay.querySelector('.welcome-browse-btn');
  if(browseBtn)browseBtn.onclick=()=>{_closeWelcome();showPage('listPage')};
  document.getElementById('welcomeClose').onclick=_closeWelcome;
  overlay.addEventListener('click',e=>{if(e.target===overlay)_closeWelcome()});
}
function _closeWelcome(){const o=document.getElementById('welcomeOverlay');if(o)o.classList.remove('open')}

/* Check if another tab is already open; if not, show welcome popup */
function _welcomeIfOnlyTab(){
  if(typeof BroadcastChannel==='undefined'){showWelcomePopup();return}
  const bc=new BroadcastChannel('ginza_wel');
  let replied=false;
  bc.onmessage=()=>{replied=true};
  bc.postMessage('ping');
  setTimeout(()=>{bc.close();if(!replied)showWelcomePopup()},150);
}

function tryRestoreSession(){try{const s=localStorage.getItem('ginza_session');if(!s)return;const{user,pass}=JSON.parse(s);const match=CRED.find(c=>c.user===user&&c.pass===pass);if(match){if(match.status==='pending'){localStorage.removeItem('ginza_session');return}_applyLogin(match,true);_welcomeIfOnlyTab()}}catch(e){try{localStorage.removeItem('ginza_session')}catch(_){}}}
function doLogin(){const u=document.getElementById('lfUser').value.trim(),p=document.getElementById('lfPass').value;const match=CRED.find(c=>c.user===u&&c.pass===p);
if(match){if(match.status==='pending'){document.getElementById('lfError').textContent=t('ui.pendingApproval');document.getElementById('lfPass').value='';return}const remember=document.getElementById('lfRemember');if(remember&&remember.checked){try{localStorage.setItem('ginza_session',JSON.stringify({user:match.user,pass:match.pass}))}catch(e){}}authOverlay.classList.remove('open');_applyLogin(match);showWelcomePopup()}
else{document.getElementById('lfError').textContent='Invalid credentials.';document.getElementById('lfPass').value=''}}
loginIconBtn.onclick=e=>{e.stopPropagation();if(loggedIn){const o=userDropdown.classList.toggle('open');loginIconBtn.setAttribute('aria-expanded',String(o))}else{showAuthSignIn()}};
document.addEventListener('click',e=>{if(!e.target.closest('#userDropdown')&&!e.target.closest('#loginIconBtn')){userDropdown.classList.remove('open');loginIconBtn.setAttribute('aria-expanded','false')}});
renderDropdown();


/* ── Particle System: Bokeh Orbs + Fine Particles ── */
const particlesEl=document.getElementById('particles');

if(!IS_MOBILE_LITE){
/* Layer 1: Bokeh Orbs */
const ORB_COLORS=['#b44aff','#c9952c','#ff6f00','#f5e6a3'];
const ORB_DRIFTS=['orbDrift1','orbDrift2','orbDrift3'];
const _orbCount=8+Math.floor(Math.random()*5);
for(let i=0;i<_orbCount;i++){
  const o=document.createElement('div');
  o.className='bokeh-orb';
  const sz=50+Math.random()*150;
  o.style.width=o.style.height=sz+'px';
  o.style.left=Math.random()*100+'%';
  o.style.top=Math.random()*100+'%';
  o.style.background=ORB_COLORS[Math.floor(Math.random()*ORB_COLORS.length)];
  o.style.opacity=(0.03+Math.random()*0.05).toFixed(3);
  o.style.filter='blur('+(30+Math.random()*30)+'px)';
  o.style.animationName=ORB_DRIFTS[Math.floor(Math.random()*ORB_DRIFTS.length)];
  o.style.animationDuration=(30+Math.random()*30)+'s';
  o.style.animationDelay=Math.random()*20+'s';
  particlesEl.appendChild(o);
}

/* Layer 2: Fine Particles (3 depth layers) */
const P_COLORS=['#b44aff','#c9952c','#ffffff'];
const P_DRIFTS=['floatDrift1','floatDrift2','floatDrift3','floatDrift4'];
const DEPTHS=[
  {cls:'depth-far',  sMin:1,sMax:1.5,peak:0.3,r:0.35},
  {cls:'depth-mid',  sMin:1.5,sMax:2.5,peak:0.5,r:0.40},
  {cls:'depth-near', sMin:2.5,sMax:4,  peak:0.7,r:0.25}
];
const _pCount=35+Math.floor(Math.random()*6);
for(let i=0;i<_pCount;i++){
  const p=document.createElement('div');
  const ratio=i/_pCount;
  const d=ratio<DEPTHS[0].r?DEPTHS[0]:ratio<DEPTHS[0].r+DEPTHS[1].r?DEPTHS[1]:DEPTHS[2];
  p.className='particle '+d.cls;
  const sz=d.sMin+Math.random()*(d.sMax-d.sMin);
  p.style.width=p.style.height=sz+'px';
  p.style.left=Math.random()*100+'%';
  p.style.background=P_COLORS[Math.floor(Math.random()*P_COLORS.length)];
  p.style.setProperty('--p-peak',String(d.peak));
  p.style.animationName=P_DRIFTS[Math.floor(Math.random()*P_DRIFTS.length)];
  p.style.animationDuration=(8+Math.random()*12)+'s';
  p.style.animationDelay=Math.random()*15+'s';
  particlesEl.appendChild(p);
}

/* ── Scroll Parallax + Nav Glassmorphism ── */
let _scrollTicking=false;
const _navEl=document.querySelector('nav');
window.addEventListener('scroll',()=>{
  if(_scrollTicking)return;
  _scrollTicking=true;
  requestAnimationFrame(()=>{
    const sy=scrollY;
    particlesEl.style.transform='translateY('+sy*0.05+'px)';
    if(_navEl){
      const t=Math.min(sy/300,1);
      const bg=0.85+t*0.12;
      const bl=20+t*16;
      const bw=t*1;
      _navEl.style.background='rgba(10,10,15,'+bg.toFixed(2)+')';
      _navEl.style.backdropFilter='blur('+bl.toFixed(1)+'px)';
      _navEl.style.webkitBackdropFilter='blur('+bl.toFixed(1)+'px)';
      _navEl.style.borderBottom=bw>0.05?bw.toFixed(2)+'px solid rgba(255,255,255,'+((t*0.06).toFixed(3))+')':'none';
    }
    _scrollTicking=false;
  });
},{passive:true});

/* ── Cursor-Reactive Orbs ── */
{
  let _mouseX=innerWidth/2,_mouseY=innerHeight/2,_mouseTicking=false;
  const _orbs=particlesEl.querySelectorAll('.bokeh-orb');
  window.addEventListener('mousemove',e=>{
    _mouseX=e.clientX;_mouseY=e.clientY;
    if(_mouseTicking)return;
    _mouseTicking=true;
    requestAnimationFrame(()=>{
      _orbs.forEach((orb,i)=>{
        const rect=orb.getBoundingClientRect();
        const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
        const dx=_mouseX-cx,dy=_mouseY-cy;
        const dist=Math.sqrt(dx*dx+dy*dy);
        const maxDist=400;
        if(dist<maxDist){
          const strength=(1-dist/maxDist)*(15+i%3*5);
          const ox=-dx/dist*strength,oy=-dy/dist*strength;
          orb.style.translate=ox.toFixed(1)+'px '+oy.toFixed(1)+'px';
        }else{
          orb.style.translate='0px 0px';
        }
      });
      _mouseTicking=false;
    });
  },{passive:true});
}
} /* end !IS_MOBILE_LITE */

/* ── Section Reveals ── */
const _revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('revealed');
      _revealObserver.unobserve(entry.target);
    }
  });
},{rootMargin:'50px 0px',threshold:0.1});
function observeReveals(container){
  if(!container)container=document;
  container.querySelectorAll('.reveal:not(.revealed)').forEach(el=>_revealObserver.observe(el));
}

/* ── Custom Cursor ── */
if(!IS_MOBILE_LITE&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  const _curDot=document.getElementById('cursorDot');
  const _curRing=document.getElementById('cursorRing');
  if(_curDot&&_curRing){
    document.body.classList.add('custom-cursor');
    let _curX=0,_curY=0,_ringX=0,_ringY=0,_curRAF=false;
    function _curLoop(){
      _ringX+=(_curX-_ringX)*0.15;
      _ringY+=(_curY-_ringY)*0.15;
      _curRing.style.left=_ringX+'px';
      _curRing.style.top=_ringY+'px';
      if(Math.abs(_curX-_ringX)>0.1||Math.abs(_curY-_ringY)>0.1){
        requestAnimationFrame(_curLoop);
      }else{
        _curRing.style.left=_curX+'px';
        _curRing.style.top=_curY+'px';
        _curRAF=false;
      }
    }
    window.addEventListener('mousemove',e=>{
      _curX=e.clientX;_curY=e.clientY;
      _curDot.style.left=_curX+'px';
      _curDot.style.top=_curY+'px';
      if(!_curRAF){_curRAF=true;requestAnimationFrame(_curLoop)}
    },{passive:true});
    document.addEventListener('mouseover',e=>{
      if(e.target.closest('a,button,.girl-card,.nav-menu-btn,.login-icon-btn,.theme-option,.lang-option')){_curDot.classList.add('hover');_curRing.classList.add('hover')}
    });
    document.addEventListener('mouseout',e=>{
      if(e.target.closest('a,button,.girl-card,.nav-menu-btn,.login-icon-btn,.theme-option,.lang-option')){_curDot.classList.remove('hover');_curRing.classList.remove('hover')}
    });
    document.addEventListener('mouseleave',()=>{_curDot.classList.add('hidden');_curRing.classList.add('hidden')});
    document.addEventListener('mouseenter',()=>{_curDot.classList.remove('hidden');_curRing.classList.remove('hidden')});
  }
}

/* ── Ambient Sound Toggle ── */
(function(){
  const btn=document.getElementById('ambientBtn');
  const volWrap=document.getElementById('ambVolWrap');
  const volSlider=document.getElementById('ambVolSlider');
  const soundList=document.getElementById('ambSoundList');
  if(!btn)return;
  let _actx=null,_masterGain=null,_conv=null,_playing=false,_nodes=[],_schedTimer=null,_currentSound='japanese',_currentThemeSounds=null;

  /* ── Theme → Sound mapping ── */
  const _ALL_SOUNDS_LIST=[
    {id:'romantic',label:'Default'},
    {id:'samuraisake',label:'Blade & Rice Wine'},
    {id:'tiggerific',label:'Bounce & Believe'},
    {id:'alice',label:'Down the Rabbit Hole'},
    {id:'jadedragon',label:'Emerald Thunder'},
    {id:'empower',label:'Empower'},
    {id:'engage',label:'Engage'},
    {id:'perthmilks',label:'Golden Coast Hustle'},
    {id:'boyandbear',label:'Into the Wild Together'},
    {id:'midnightprotocol',label:'Midnight Protocol'},
    {id:'neonfocus',label:'Neon Focus'},
    {id:'cobblestone',label:'Old Quarter Walk'},
    {id:'warrior',label:'Stand Your Ground'},
    {id:'japanese',label:'Still Water, Moving Mind'},
    {id:'strobecity',label:'Strobe City'},
    {id:'epicbattle',label:'The Last Line'},
    {id:'whiteexpanse',label:'White Expanse'},
    {id:'wired',label:'Wired'},
    {id:'koishii',label:'Yearning'}
  ];
  function _populateSoundList(){
    if(!soundList||_currentThemeSounds)return;
    _currentThemeSounds=_ALL_SOUNDS_LIST;
    soundList.innerHTML='';
    _ALL_SOUNDS_LIST.forEach((s,i)=>{
      const b=document.createElement('button');b.className='amb-sound-opt'+(i===0?' active':'');
      b.dataset.sound=s.id;b.dataset.i18n='sound.'+s.id;b.textContent=typeof t==='function'?t('sound.'+s.id):s.label;soundList.appendChild(b);
    });
    _currentSound=_ALL_SOUNDS_LIST[0].id;
  }

  /* ── Sound presets: each factory(actx,master,conv,nodes) returns a sched fn ── */
  const _SOUNDS={
    /* ─── Default: Japanese ─── */
    japanese(actx,master,conv,nodes){
      const scale=[261.63,293.66,311.13,392,415.30];
      const pads=[[130.81,196,261.63],[146.83,220,293.66],[155.56,233.08,311.13],[196,293.66,392]];
      const CDUR=5.5,NDUR=CDUR/5;let ci=0,nt=0;
      const lpf=actx.createBiquadFilter();lpf.type='lowpass';lpf.frequency.value=1800;lpf.Q.value=0.5;
      lpf.connect(master);lpf.connect(conv);
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%pads.length,t=nt;
          pads[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-3,4,-2][ni];
            const g=actx.createGain();const v=ni===0?0.07:0.045;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.8);
            g.gain.setValueAtTime(v,t+CDUR-1.5);g.gain.linearRampToValueAtTime(0,t+CDUR+0.3);
            o.connect(g);g.connect(lpf);o.start(t);o.stop(t+CDUR+0.5);nodes.push(o);
          });
          const mel=[scale[(ci*3)%5]*2,scale[(ci*3+2)%5]*2,scale[(ci*3+4)%5]*2,scale[(ci*3+1)%5]*2,scale[(ci*3+3)%5]*2];
          mel.forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.08;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.055,mt+0.015);
            g.gain.exponentialRampToValueAtTime(0.002,mt+NDUR*0.85);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+NDUR);nodes.push(o);
          });
          if(ci%4===0){
            const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=130.81;
            const bg=actx.createGain();
            bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.01);
            bg.gain.exponentialRampToValueAtTime(0.001,t+3.5);
            bo.connect(bg);bg.connect(master);bg.connect(conv);bo.start(t);bo.stop(t+3.8);nodes.push(bo);
          }
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,2200);
      };
    },
    tiggerific(actx,master,conv,nodes){
      /* Tiggerific (Pogo) — Bb major, ~115 BPM, bouncy playful plunderphonics
         Tigger/Winnie the Pooh remix: springy bouncy rhythm, chopped vocal chops,
         playful xylophone-like melody, warm pads, irresistibly danceable */
      const BPM=115,BEAT=60/BPM,BAR=BEAT*4;
      /* Bb–Eb–F–Bb (I–IV–V–I) bright bouncy progression */
      const chords=[[233.08,293.66,349.23],[311.13,392,466.16],[349.23,440,523.25],[233.08,293.66,349.23]];
      const bass=[116.54,155.56,174.61,116.54];/* Bb2 Eb3 F3 Bb2 */
      /* playful bouncy melody — Bb major, xylophone-like leaps */
      const melody=[
        [932.33,830.61,698.46,587.33,698.46,830.61,932.33,698.46],
        [830.61,698.46,587.33,466.16,587.33,698.46,830.61,932.33],
        [698.46,830.61,932.33,1046.50,932.33,830.61,698.46,830.61],
        [587.33,698.46,830.61,698.46,587.33,466.16,587.33,698.46]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm bright pad — gentle triangle + sine layer */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-5,5,-3][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.002;
            const g=actx.createGain();const v=0.028-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.5);
            g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.15);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1300;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.25);o2.stop(t+BAR+0.25);nodes.push(o,o2);
          });
          /* xylophone-like bouncy melody — bright sine with fast decay */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*3.01;/* harmonic for bell tone */
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.035,mt+0.008);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.4);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.01,mt+0.005);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+BEAT*0.2);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+BEAT*0.3);
            nodes.push(o,o2);
          });
          /* bouncy chopped vocal textures — playful syncopated blips */
          const chops=[BEAT*0.25,BEAT*0.75,BEAT*1.25,BEAT*2,BEAT*2.5,BEAT*3.25,BEAT*3.75];
          chops.forEach((off,i)=>{
            const ct=t+off;
            const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.1,ct);
            o.frequency.exponentialRampToValueAtTime(freq*0.9,ct+0.04);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.03,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.04);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=4;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
            o.start(ct);o.stop(ct+0.08);nodes.push(o);
          });
          /* springy bouncy kick */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(95,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.05);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.1,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o);
          });
          /* playful snap on 2 & 4 */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.025),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.035,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.025);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3000;bp.Q.value=1.5;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.15);
          bg.gain.setValueAtTime(0.07,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* spring bounce accent — quick pitch-up blip every 4 bars */
          if(ci%4===2){
            const st=t+BEAT*1.5;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(466.16,st);o.frequency.exponentialRampToValueAtTime(1864.66,st+0.08);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.04,st+0.01);
            g.gain.exponentialRampToValueAtTime(0.001,st+0.15);
            o.connect(g);g.connect(master);g.connect(conv);o.start(st);o.stop(st+0.2);nodes.push(o);
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    perthmilks(actx,master,conv,nodes){
      /* Perth Milks It (Pogo) — G major, 110 BPM, sunny feel-good plunderphonics
         Brownes Dairy promo: bright upbeat city sounds, fun bouncy groove,
         sunny pads, cheerful melody, crisp rhythmic chops */
      const BPM=110,BEAT=60/BPM,BAR=BEAT*4;
      /* G–C–D–Em (I–IV–V–vi) sunny pop progression */
      const chords=[[196,246.94,293.66],[261.63,329.63,392],[293.66,369.99,440],[164.81,196,246.94]];
      const bass=[98,130.81,146.83,82.41];/* G2 C3 D3 E2 */
      /* cheerful bouncy melody — G major, bright and fun */
      const melody=[
        [783.99,698.46,659.25,587.33,659.25,783.99,880,783.99],
        [659.25,587.33,523.25,493.88,523.25,587.33,659.25,783.99],
        [880,783.99,659.25,587.33,659.25,783.99,880,987.77],
        [659.25,587.33,493.88,392,493.88,587.33,659.25,587.33]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* sunny warm pad — bright triangle + sine */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-4,5,-3][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.003;
            const g=actx.createGain();const v=0.03-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.5);
            g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.15);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.25);o2.stop(t+BAR+0.25);nodes.push(o,o2);
          });
          /* cheerful melody — bright bell-like sine */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*2.998;/* bell overtone */
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.032,mt+0.01);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.42);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.008,mt+0.005);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+BEAT*0.2);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+BEAT*0.3);
            nodes.push(o,o2);
          });
          /* city-sound vocal chops — syncopated bouncy blips */
          const chops=[0,BEAT*0.5,BEAT*1.25,BEAT*1.75,BEAT*2.5,BEAT*3,BEAT*3.5];
          chops.forEach((off,i)=>{
            const ct=t+off;
            const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.07,ct);
            o.frequency.exponentialRampToValueAtTime(freq*0.93,ct+0.04);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.028,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.04);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq*1.1;bp.Q.value=4;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
            o.start(ct);o.stop(ct+0.08);nodes.push(o);
          });
          /* crisp kick on 1 & 3 */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(100,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.055);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.1,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.22);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o);
          });
          /* bright snap on 2 & 4 */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.03),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.035,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.03);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3200;bp.Q.value=1.3;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.15);
          bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* sunny high shimmer every 2 bars */
          if(ci%2===0){
            const st=t+BEAT;
            [1567.98,1975.53,2349.32].forEach((f,i)=>{/* G6 B6 D7 bright G triad */
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-5,5,0][i];
              const g=actx.createGain();
              g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.007,st+0.6);
              g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.5);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*1.8);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },

    /* ─── Neon Tokyo ─── */
    cybershogun(actx,master,conv,nodes){
      /* Cyber Shogun — Asian trap/EDM, ~145 BPM, D minor pentatonic
         Koto/guzheng rapid-fire arpeggios + heavy 808 sub bass + trap hi-hat rolls
         Inspired by ElevenLabs "Cyber Shogun" — intense, epic, battle energy */
      /* D minor pentatonic: D F G A C */
      const koto=[
        [587.33,698.46,783.99,880,1046.5,880,783.99,698.46],
        [880,1046.5,1174.66,1046.5,880,783.99,698.46,783.99],
        [783.99,698.46,587.33,698.46,783.99,880,1046.5,1174.66],
        [1046.5,880,783.99,698.46,587.33,698.46,880,783.99]
      ];
      const bass808=[73.42,65.41,58.27,73.42];/* D2 C2 Bb1 D2 — deep 808 */
      const BPM=145,CDUR=60/BPM*4,NDUR=CDUR/8;/* ~1.66s per bar */
      let ci=0,nt=0;
      const bpf=actx.createBiquadFilter();bpf.type='bandpass';bpf.frequency.value=2500;bpf.Q.value=0.8;
      bpf.connect(master);bpf.connect(conv);
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%koto.length,t=nt;
          /* rapid koto/guzheng arpeggios — sharp pluck through bandpass */
          koto[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*2.005;/* harmonic ring */
            const g=actx.createGain();const pk=ni%2===0?0.055:0.04;
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(pk,mt+0.005);
            g.gain.exponentialRampToValueAtTime(0.002,mt+NDUR*0.7);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(pk*0.3,mt+0.005);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+NDUR*0.4);
            o.connect(g);g.connect(bpf);o.start(mt);o.stop(mt+NDUR+0.03);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+NDUR+0.03);
            nodes.push(o,o2);
          });
          /* heavy 808 sub bass — long decay sine on beats 1 and 3 */
          [0,CDUR*0.5].forEach((off,si)=>{
            const bt=t+off;
            const bf=si===0?bass808[c]:bass808[c]*0.75;
            const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bf;
            /* pitch slide down for 808 character */
            bo.frequency.setValueAtTime(bf*1.5,bt);
            bo.frequency.exponentialRampToValueAtTime(bf,bt+0.06);
            const bg=actx.createGain();
            bg.gain.setValueAtTime(0,bt);bg.gain.linearRampToValueAtTime(0.14,bt+0.01);
            bg.gain.exponentialRampToValueAtTime(0.003,bt+CDUR*0.45);
            bo.connect(bg);bg.connect(master);bo.start(bt);bo.stop(bt+CDUR*0.5);nodes.push(bo);
          });
          /* trap hi-hat roll — noise bursts, 16th notes */
          for(let h=0;h<8;h++){
            const ht=t+h*NDUR;
            const hBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.02),actx.sampleRate);
            const hd=hBuf.getChannelData(0);for(let i=0;i<hd.length;i++)hd[i]=(Math.random()*2-1);
            const hs=actx.createBufferSource();hs.buffer=hBuf;
            const hpf=actx.createBiquadFilter();hpf.type='highpass';hpf.frequency.value=8000;
            const hg=actx.createGain();const hv=h%2===0?0.025:0.015;
            hg.gain.setValueAtTime(hv,ht);hg.gain.exponentialRampToValueAtTime(0.001,ht+0.025);
            hs.connect(hpf);hpf.connect(hg);hg.connect(master);hs.start(ht);nodes.push(hs);
          }
          /* dark pad drone — minor power chord */
          [146.83,220].forEach((f,i)=>{/* D3 A3 power fifth */
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=i===0?-5:5;
            const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.02,t+0.2);
            g.gain.setValueAtTime(0.02,t+CDUR-0.3);g.gain.linearRampToValueAtTime(0,t+CDUR);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+CDUR+0.1);nodes.push(o);
          });
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1000);
      };
    },
    mazeltov(actx,master,conv,nodes){
      /* Mazel Tov (Pogo) — F# major, 120 BPM, joyful plunderphonics dance
         Fiddler on the Roof remix: klezmer-flavored melody, chopped vocals,
         bouncy danceable beat, warm folk-electronic fusion */
      const BPM=120,BEAT=60/BPM,BAR=BEAT*4;
      /* F#–B–C#–F# (I–IV–V–I) bright joyful progression */
      const chords=[[185,233.08,277.18],[246.94,311.13,369.99],[277.18,349.23,415.30],[185,233.08,277.18]];
      const bass=[92.5,123.47,138.59,92.5];/* F#2 B2 C#3 F#2 */
      /* klezmer-flavored melody — ornamental, dancing, F# major with raised 4th flavor */
      const melody=[
        [739.99,698.46,622.25,554.37,622.25,739.99,830.61,739.99],
        [622.25,554.37,466.16,554.37,622.25,739.99,622.25,554.37],
        [830.61,739.99,622.25,554.37,622.25,739.99,830.61,932.33],
        [739.99,622.25,554.37,466.16,554.37,622.25,739.99,622.25]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm bright pad — triangle + sine, joyful shimmer */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-4,6,-3][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.003;
            const g=actx.createGain();const v=0.03-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.5);
            g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2);
          });
          /* fiddle-like melody — sawtooth through LP with vibrato, ornamental */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;
            const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=6;
            const lfoG=actx.createGain();lfoG.gain.value=5;
            lfo.connect(lfoG);lfoG.connect(o.frequency);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.025,mt+0.015);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;lp.Q.value=1;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(mt);lfo.start(mt);o.stop(mt+BEAT*0.5+0.05);lfo.stop(mt+BEAT*0.5+0.05);
            nodes.push(o,lfo);
          });
          /* chopped vocal chops — syncopated bandpass blips */
          const chops=[0,BEAT*0.25,BEAT*0.75,BEAT*1.5,BEAT*2,BEAT*2.75,BEAT*3.25];
          chops.forEach((off,i)=>{
            const ct=t+off;
            const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.06,ct);
            o.frequency.exponentialRampToValueAtTime(freq*0.94,ct+0.04);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.032,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.04+Math.random()*0.02);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq*1.1;bp.Q.value=4.5;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
            o.start(ct);o.stop(ct+0.1);nodes.push(o);
          });
          /* punchy kick on 1 & 3 */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(105,dt);o.frequency.exponentialRampToValueAtTime(50,dt+0.05);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.11,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.22);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o);
          });
          /* crisp clap on 2 & 4 */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.035,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.035);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2800;bp.Q.value=1.3;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* eighth-note shaker */
          for(let i=0;i<8;i++){
            const ht=t+i*BEAT*0.5;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.02),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let j=0;j<nd.length;j++)nd[j]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,ht);ng.gain.linearRampToValueAtTime(0.015,ht+0.001);
            ng.gain.exponentialRampToValueAtTime(0.001,ht+0.02);
            const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=7000;
            nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(ht);nodes.push(nb);
          }
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.15);
          bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* joyful high shimmer accent every 2 bars */
          if(ci%2===0){
            const st=t+BEAT*0.5;
            [1479.98,1864.66,2217.46].forEach((f,i)=>{/* F#6 A#6 C#7 — bright F# triad */
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-6,6,0][i];
              const g=actx.createGain();
              g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.008,st+0.8);
              g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.5);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*1.8);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },

    /* ─── Midnight Gold ─── */
    boyandbear(actx,master,conv,nodes){
      /* Boy & Bear (Pogo) — E minor, 105 BPM, warm plunderphonics dance
         Pooh's Grand Adventure remix: warm bouncy pads, chopped vocal chops,
         comforting melody, danceable beat, high energy */
      const BPM=105,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[164.81,196,246.94],[130.81,164.81,220],[146.83,196,246.94],[164.81,196,246.94]];/* Em C/E Bm/D Em */
      const bass=[82.41,65.41,73.42,82.41];/* E2 C2 D2 E2 */
      /* warm bouncy melody — E minor pentatonic, childlike & comforting */
      const melody=[
        [493.88,440,392,329.63,392,440,493.88,392],
        [329.63,392,440,493.88,440,392,329.63,293.66],
        [440,392,329.63,293.66,329.63,392,440,493.88],
        [392,493.88,440,392,329.63,392,440,329.63]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm fuzzy pad — layered triangle + detuned sine, LP filtered */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-5,7,-3][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.002;
            const g=actx.createGain();const v=0.035-ni*0.007;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.6);
            g.gain.setValueAtTime(v,t+BAR-0.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=0.6;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2);
          });
          /* chopped vocal-like textures — short filtered blips at syncopated positions */
          const chops=[0,BEAT*0.5,BEAT,BEAT*1.75,BEAT*2.5,BEAT*3,BEAT*3.5];
          chops.forEach((off,i)=>{
            const ct=t+off;
            const freq=chords[c][i%3]*(i%2===0?4:2);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.08,ct);
            o.frequency.exponentialRampToValueAtTime(freq*0.92,ct+0.05);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.035,ct+0.006);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.05+Math.random()*0.03);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq*1.2;bp.Q.value=4;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
            o.start(ct);o.stop(ct+0.12);nodes.push(o);
          });
          /* comforting bouncy melody — music-box sine, warm */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.032,mt+0.012);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);nodes.push(o);
          });
          /* bouncy kick on 1 & 3 */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(100,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.06);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.1,dt+0.005);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o);
          });
          /* soft snappy clap on 2 & 4 */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.035),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.03,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.03);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200;bp.Q.value=1.2;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* warm sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.2);
          bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* gentle shimmer swell every 2 bars */
          if(ci%2===1){
            const st=t+0.3;
            [659.25,783.99,987.77].forEach((f,i)=>{
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-8,8,0][i];
              const g=actx.createGain();
              g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.01,st+1.0);
              g.gain.setValueAtTime(0.01,st+BAR*1.2);g.gain.linearRampToValueAtTime(0,st+BAR*2);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2+0.2);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    whoisbach(actx,master,conv,nodes){
      /* Who is Bach (Anttis) — J-jazz meets baroque, bright & dramatic
         Flute-like lead + harpsichord-style arpeggios + jazz chords + walking bass
         Tags: japanese, jazz, bright, dramatic, flute, drums */
      /* Dm7–G7–Cmaj7–Fmaj7 — jazzy ii-V-I-IV with baroque ornamentation */
      const chords=[[146.83,174.61,220,261.63],[98,123.47,146.83,196],[130.81,164.81,196,246.94],[87.31,110,130.81,174.61]];
      const bass=[73.42,98,65.41,87.31];/* D2 G2 C2 F2 */
      /* Baroque-style running 16th-note arpeggios */
      const arps=[
        [293.66,349.23,440,523.25,440,349.23,293.66,349.23],
        [196,246.94,293.66,392,293.66,246.94,196,246.94],
        [261.63,329.63,392,493.88,392,329.63,261.63,329.63],
        [174.61,220,261.63,349.23,261.63,220,174.61,220]
      ];
      /* Flute-like melody — bright, ornamented */
      const flute=[
        [659.25,698.46,659.25,587.33],[523.25,587.33,659.25,783.99],
        [698.46,659.25,587.33,523.25],[587.33,523.25,440,523.25]
      ];
      const CDUR=3.6,NDUR=CDUR/8,FNDUR=CDUR/4;let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%chords.length,t=nt;
          /* jazz chord pad — warm triangle voicings */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-3,4,-2,3][ni];
            const g=actx.createGain();const v=ni===0?0.05:0.035;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.3);
            g.gain.setValueAtTime(v,t+CDUR-0.5);g.gain.linearRampToValueAtTime(0,t+CDUR+0.1);
            o.connect(g);g.connect(master);g.connect(conv);o.start(t);o.stop(t+CDUR+0.2);nodes.push(o);
          });
          /* harpsichord arpeggios — sharp pluck with 3rd harmonic for metallic tone */
          arps[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*3.005;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.04,mt+0.006);
            g.gain.exponentialRampToValueAtTime(0.003,mt+NDUR*0.8);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.015,mt+0.006);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+NDUR*0.5);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+NDUR+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+NDUR+0.05);
            nodes.push(o,o2);
          });
          /* flute melody — sine with light vibrato, bright register */
          flute[c].forEach((f,ni)=>{
            const mt=t+ni*FNDUR+0.05;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5;
            const lfoG=actx.createGain();lfoG.gain.value=4;
            lfo.connect(lfoG);lfoG.connect(o.frequency);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.04,mt+0.08);
            g.gain.setValueAtTime(0.04,mt+FNDUR*0.55);g.gain.linearRampToValueAtTime(0,mt+FNDUR*0.9);
            o.connect(g);g.connect(master);g.connect(conv);
            o.start(mt);lfo.start(mt);o.stop(mt+FNDUR+0.05);lfo.stop(mt+FNDUR+0.05);
            nodes.push(o,lfo);
          });
          /* walking bass — jazz style, quarter notes */
          [0,1,2,3].forEach(beat=>{
            const bt=t+beat*FNDUR;
            const bf=beat===0?bass[c]:bass[c]*(beat===2?1.5:beat===1?1.25:1.335);
            const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bf;
            const bg=actx.createGain();
            bg.gain.setValueAtTime(0,bt);bg.gain.linearRampToValueAtTime(0.08,bt+0.02);
            bg.gain.exponentialRampToValueAtTime(0.005,bt+FNDUR*0.85);
            bo.connect(bg);bg.connect(master);bo.start(bt);bo.stop(bt+FNDUR);nodes.push(bo);
          });
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1600);
      };
    },
    alice(actx,master,conv,nodes){
      /* Alice (Pogo) — Ab major, ~100 BPM, dreamy plunderphonics
         Chopped vocal textures, stretched orchestral hits, woozy bounce,
         atmospheric gossamer pads, child-like wonder */
      const BPM=100,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[207.65,261.63,311.13],[233.08,293.66,349.23],[174.61,220,261.63],[207.65,261.63,311.13]];/* Ab Bb Fm Ab */
      const bass=[103.83,116.54,87.31,103.83];/* Ab2 Bb2 F2 Ab2 */
      /* whimsical melody — Ab major pentatonic bouncing */
      const melody=[
        [523.25,466.16,415.30,466.16,523.25,622.25,523.25,466.16],
        [622.25,523.25,466.16,415.30,466.16,523.25,622.25,698.46],
        [466.16,415.30,349.23,415.30,466.16,523.25,466.16,415.30],
        [523.25,622.25,523.25,466.16,415.30,466.16,523.25,622.25]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* dreamy atmospheric pad — detuned sine layers, long attack */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-6,5,-4][ni];
            const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f*0.998;
            const g=actx.createGain();const v=0.03-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.2);
            g.gain.setValueAtTime(v,t+BAR-1.0);g.gain.linearRampToValueAtTime(0,t+BAR+0.3);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.5);o2.stop(t+BAR+0.5);nodes.push(o,o2);
          });
          /* chopped "vocal" chops — short bandpass-filtered blips mimicking syllables */
          const chopTimes=[0,0.3,0.6,1.2,1.5,2.1,2.4,3.0];
          chopTimes.forEach((off,i)=>{
            const ct=t+off;
            const freq=chords[c][i%3]*(i%2===0?2:4);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.05,ct);
            o.frequency.exponentialRampToValueAtTime(freq*0.95,ct+0.06);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.04,ct+0.008);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.06+Math.random()*0.04);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=5;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
            o.start(ct);o.stop(ct+0.15);nodes.push(o);
          });
          /* whimsical bouncy melody — music-box-like sine */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.028,mt+0.015);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);nodes.push(o);
          });
          /* soft bouncy kick — gentle thump on 1 & 3 */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(90,dt);o.frequency.exponentialRampToValueAtTime(50,dt+0.06);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.08,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o);
          });
          /* soft clap/snap on 2 & 4 */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.025,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.035);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2500;bp.Q.value=1.5;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.3);
          bg.gain.setValueAtTime(0.07,t+BAR-0.4);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* stretched orchestral shimmer — wide detuned high sine, slow swell every 2 bars */
          if(ci%2===0){
            const st=t+0.5;
            [830.61,1046.50,1244.51].forEach((f,i)=>{
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-10,10,0][i];
              const g=actx.createGain();
              g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.012,st+1.5);
              g.gain.setValueAtTime(0.012,st+BAR*1.5);g.gain.linearRampToValueAtTime(0,st+BAR*2);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2+0.2);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },

    /* ─── Emerald Noir ─── */
    cobblestone(actx,master,conv,nodes){
      /* Cobblestone Stride — E minor, ~115 BPM walking pace
         Decoded from cobblestone-stride.mp3: Em–G–C–D progression,
         strong G/E/D chroma, pizzicato plucks + string pad + walking bass */
      /* Em(E3 G3 B3) – G(G3 B3 D4) – C(C3 E3 G3) – D(D3 F#3 A3) */
      const chords=[[164.81,196,246.94],[196,246.94,293.66],[130.81,164.81,196],[146.83,185,220]];
      const bass=[82.41,98,65.41,73.42];/* E2 G2 C2 D2 */
      /* Melody from E minor pentatonic: E G A B D */
      const melodies=[
        [659.25,587.33,493.88,392,329.63,392,493.88,587.33],
        [493.88,587.33,659.25,587.33,493.88,392,440,493.88],
        [392,329.63,293.66,329.63,392,493.88,440,392],
        [587.33,493.88,440,392,293.66,329.63,392,440]
      ];
      const BPM=115,CDUR=60/BPM*4,NDUR=CDUR/8;/* 4 beats per chord ~2.09s */
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%chords.length,t=nt;
          /* string pad — Em voicings, triangle waves with slight detune */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-4,5,-3][ni];
            const g=actx.createGain();const v=ni===0?0.055:0.04;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.6);
            g.gain.setValueAtTime(v,t+CDUR-0.7);g.gain.linearRampToValueAtTime(0,t+CDUR+0.15);
            o.connect(g);g.connect(master);g.connect(conv);o.start(t);o.stop(t+CDUR+0.25);nodes.push(o);
          });
          /* pizzicato melody — plucked strings, sharp attack, quick decay */
          melodies[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.03;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*2.003;/* 2nd harmonic shimmer */
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.05,mt+0.008);
            g.gain.exponentialRampToValueAtTime(0.002,mt+NDUR*0.8);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.014,mt+0.008);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+NDUR*0.5);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+NDUR+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+NDUR+0.05);
            nodes.push(o,o2);
          });
          /* walking bass at 115 BPM — two hits per bar (half notes) */
          [0,CDUR*0.5].forEach((off,si)=>{
            const bt=t+off;
            const bf=si===0?bass[c]:bass[(c+1)%bass.length];
            const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bf;
            const bg=actx.createGain();
            bg.gain.setValueAtTime(0,bt);bg.gain.linearRampToValueAtTime(0.1,bt+0.02);
            bg.gain.exponentialRampToValueAtTime(0.003,bt+0.45);
            bo.connect(bg);bg.connect(master);bo.start(bt);bo.stop(bt+0.55);nodes.push(bo);
          });
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1600);
      };
    },
    jadedragon(actx,master,conv,nodes){
      /* Jade Dragon's Wrath — A minor, ~103 BPM, intense dramatic Asian energy
         Decoded: strong A/D/G/E chroma, deep B1/G2 bass, G5/A5/C6 climax bursts
         Am–Dm–G–Em progression with pentatonic strikes and power drones */
      const chords=[[220,261.63,329.63],[146.83,220,293.66],[196,246.94,392],[164.81,196,329.63]];
      const bass=[55,73.42,49,41.2];/* A1 D2 ~G1 E1 — deep rumble */
      /* Melody: A minor pentatonic (A C D E G) — aggressive, angular */
      const strikes=[
        [880,783.99,659.25,523.25,440,523.25,659.25,783.99],
        [659.25,783.99,880,783.99,659.25,523.25,440,523.25],
        [783.99,659.25,523.25,440,392,440,523.25,659.25],
        [523.25,659.25,783.99,880,783.99,659.25,523.25,440]
      ];
      const BPM=103,CDUR=60/BPM*4,NDUR=CDUR/8;/* ~2.33s per bar */
      let ci=0,nt=0;
      const lpf=actx.createBiquadFilter();lpf.type='lowpass';lpf.frequency.value=1600;lpf.Q.value=1.5;
      lpf.connect(master);lpf.connect(conv);
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%chords.length,t=nt;
          /* power drone — dark layered fifths through LPF */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type=ni===0?'sawtooth':'triangle';o.frequency.value=f;
            o.detune.value=[-6,7,-5][ni];
            const g=actx.createGain();const v=ni===0?0.04:0.03;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.4);
            g.gain.setValueAtTime(v,t+CDUR-0.5);g.gain.linearRampToValueAtTime(0,t+CDUR+0.15);
            o.connect(g);g.connect(lpf);o.start(t);o.stop(t+CDUR+0.25);nodes.push(o);
          });
          /* aggressive pentatonic strikes — sharp attack */
          strikes[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*2.005;
            const g=actx.createGain();const pk=ni%4===0?0.06:0.04;
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(pk,mt+0.006);
            g.gain.exponentialRampToValueAtTime(0.002,mt+NDUR*0.7);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(pk*0.25,mt+0.006);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+NDUR*0.4);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+NDUR+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+NDUR+0.05);
            nodes.push(o,o2);
          });
          /* deep rumbling bass — sub hit on beat 1 and 3 */
          [0,CDUR*0.5].forEach((off,si)=>{
            const bt=t+off;
            const bf=si===0?bass[c]:bass[c]*1.5;
            const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bf;
            const bg=actx.createGain();
            bg.gain.setValueAtTime(0,bt);bg.gain.linearRampToValueAtTime(0.12,bt+0.015);
            bg.gain.exponentialRampToValueAtTime(0.003,bt+0.55);
            bo.connect(bg);bg.connect(master);bo.start(bt);bo.stop(bt+0.65);nodes.push(bo);
          });
          /* dramatic high burst every 4 bars — mirrors the G5/A5/C6 climax */
          if(ci%4===0){
            [783.99,880,1046.5].forEach((f,i)=>{
              const ht=t+0.1+i*0.12;
              const ho=actx.createOscillator();ho.type='sine';ho.frequency.value=f;
              const hg=actx.createGain();
              hg.gain.setValueAtTime(0,ht);hg.gain.linearRampToValueAtTime(0.035,ht+0.01);
              hg.gain.exponentialRampToValueAtTime(0.001,ht+0.8);
              ho.connect(hg);hg.connect(master);hg.connect(conv);ho.start(ht);ho.stop(ht+0.9);nodes.push(ho);
            });
          }
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1400);
      };
    },
    koishii(actx,master,conv,nodes){
      /* Koishii (Deoxys Beats) — A major, 108 BPM, lo-fi Japanese chill
         Decoded: E/A/B/D dominant chroma, heavy sub-bass ~74Hz
         Warm lo-fi pads + mellow pluck melody + lo-fi drums + vinyl crackle */
      const BPM=108,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[220,277.18,329.63],[246.94,311.13,369.99],[293.66,369.99,440],[220,277.18,329.63]];/* A D/F# Bm A */
      const bass=[110,73.42,61.74,110];/* A2 D2 B1 A2 */
      const melody=[
        [440,493.88,554.37,493.88],[554.37,493.88,440,369.99],
        [493.88,440,369.99,329.63],[440,369.99,440,554.37]
      ];/* A4 B4 C#5 B4 / C#5 B4 A4 F#4 / B4 A4 F#4 E4 / A4 F#4 A4 C#5 */
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm lo-fi pad — detuned saw through heavy LP filter */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,6,-5][ni];
            const g=actx.createGain();const v=0.025-ni*0.005;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.8);
            g.gain.setValueAtTime(v,t+BAR-0.6);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=800;lp.Q.value=0.7;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.3);nodes.push(o);
          });
          /* mellow pluck melody — sine with soft attack */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.035,mt+0.04);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.85);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2000;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(mt);o.stop(mt+BEAT+0.05);nodes.push(o);
          });
          /* lo-fi kick on 1 & 3 — sub sine with pitch drop */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(110,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.07);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.14,dt+0.005);
            g.gain.exponentialRampToValueAtTime(0.003,dt+0.35);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.4);nodes.push(o);
          });
          /* lo-fi snare on 2 & 4 — noise burst through bandpass */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,actx.sampleRate*0.1,actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.045,dt+0.003);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.08);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3000;bp.Q.value=1;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* closed hi-hat — noise through highpass, every eighth note */
          for(let i=0;i<8;i++){
            const ht=t+i*BEAT*0.5;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,actx.sampleRate*0.03,actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let j=0;j<nd.length;j++)nd[j]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();
            ng.gain.setValueAtTime(0,ht);ng.gain.linearRampToValueAtTime(0.018,ht+0.001);
            ng.gain.exponentialRampToValueAtTime(0.001,ht+0.025);
            const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=8000;
            nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(ht);nodes.push(nb);
          }
          /* sub bass — deep sine */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.2);
          bg.gain.setValueAtTime(0.1,t+BAR-0.4);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* vinyl crackle — sparse random noise pops */
          for(let i=0;i<3;i++){
            const ct=t+Math.random()*BAR;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.01),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let j=0;j<nd.length;j++)nd[j]=(Math.random()*2-1)*0.5;
            nb.buffer=nBuf;
            const ng=actx.createGain();ng.gain.setValueAtTime(0.008,ct);ng.gain.exponentialRampToValueAtTime(0.001,ct+0.008);
            nb.connect(ng);ng.connect(master);nb.start(ct);nodes.push(nb);
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },

    /* ─── Crimson Velvet ─── */
    romantic(actx,master,conv,nodes){
      const chords=[[110,164.81,220,261.63],[87.31,130.81,174.61,220],[130.81,164.81,196,261.63],[98,146.83,196,246.94]];
      const melody=[[659.25,587.33,523.25,440],[523.25,587.33,659.25,523.25],[440,523.25,659.25,587.33],[587.33,523.25,440,392]];
      const CDUR=4.4,NDUR=CDUR/4;let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%chords.length,t=nt;
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-2,3,-1,2][ni];
            const g=actx.createGain();const v=ni===0?0.09:0.055;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.55);
            g.gain.setValueAtTime(v,t+CDUR-0.65);g.gain.linearRampToValueAtTime(0,t+CDUR+0.15);
            o.connect(g);g.connect(master);g.connect(conv);o.start(t);o.stop(t+CDUR+0.25);nodes.push(o);
          });
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.05;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.038,mt+0.12);
            g.gain.setValueAtTime(0.038,mt+NDUR-0.18);g.gain.linearRampToValueAtTime(0,mt+NDUR);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+NDUR+0.05);nodes.push(o);
          });
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1800);
      };
    },
    warrior(actx,master,conv,nodes){
      /* Warrior (yoitrax) — 114 BPM, Japanese action hip-hop, powerful & energetic
         Electronic beats + epic synth brass + pentatonic riff + heavy kick/snare */
      /* E minor pentatonic: E G A B D — dark and powerful */
      const riff=[
        [659.25,587.33,493.88,392,329.63,392,493.88,587.33],
        [493.88,392,329.63,293.66,329.63,392,493.88,659.25],
        [587.33,659.25,783.99,659.25,587.33,493.88,392,493.88],
        [392,493.88,587.33,493.88,392,329.63,293.66,329.63]
      ];
      const brass=[[164.81,246.94,329.63],[196,293.66,392],[130.81,196,261.63],[146.83,220,293.66]];
      const bass=[82.41,98,65.41,73.42];/* E2 G2 C2 D2 */
      const BPM=114,CDUR=60/BPM*4,NDUR=CDUR/8;/* ~2.1s per bar */
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%riff.length,t=nt;
          /* epic synth brass stabs — sawtooth through LPF */
          brass[c].forEach((f,ni)=>{
            [0,CDUR*0.5].forEach(off=>{
              const st=t+off;
              const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=ni%2?6:-4;
              const g=actx.createGain();const v=ni===0?0.04:0.03;
              g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(v,st+0.02);
              g.gain.exponentialRampToValueAtTime(0.002,st+CDUR*0.2);
              const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;
              o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(st);o.stop(st+CDUR*0.25);nodes.push(o);
            });
          });
          /* pentatonic lead riff — sharp synth */
          riff[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.02;
            const o=actx.createOscillator();o.type='square';o.frequency.value=f;
            const g=actx.createGain();const pk=ni%4===0?0.035:0.025;
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(pk,mt+0.008);
            g.gain.setValueAtTime(pk,mt+NDUR*0.4);g.gain.linearRampToValueAtTime(0,mt+NDUR*0.8);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2000;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(mt);o.stop(mt+NDUR);nodes.push(o);
          });
          /* heavy kick on beats 1 & 3 */
          [0,CDUR*0.5].forEach(off=>{
            const kt=t+off;
            const ko=actx.createOscillator();ko.type='sine';ko.frequency.value=bass[c];
            ko.frequency.setValueAtTime(bass[c]*2,kt);
            ko.frequency.exponentialRampToValueAtTime(bass[c],kt+0.05);
            const kg=actx.createGain();
            kg.gain.setValueAtTime(0,kt);kg.gain.linearRampToValueAtTime(0.13,kt+0.01);
            kg.gain.exponentialRampToValueAtTime(0.003,kt+0.4);
            ko.connect(kg);kg.connect(master);ko.start(kt);ko.stop(kt+0.5);nodes.push(ko);
          });
          /* snare on beats 2 & 4 — noise burst */
          [CDUR*0.25,CDUR*0.75].forEach(off=>{
            const st=t+off;
            const sBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);
            const sd=sBuf.getChannelData(0);for(let i=0;i<sd.length;i++)sd[i]=(Math.random()*2-1);
            const ss=actx.createBufferSource();ss.buffer=sBuf;
            const sg=actx.createGain();
            sg.gain.setValueAtTime(0.04,st);sg.gain.exponentialRampToValueAtTime(0.001,st+0.06);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=4000;bp.Q.value=1;
            ss.connect(bp);bp.connect(sg);sg.connect(master);ss.start(st);nodes.push(ss);
          });
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,1300);
      };
    },
    epicbattle(actx,master,conv,nodes){
      /* Epic Battle — E minor, 75 BPM, slow heavy orchestral
         Decoded: E/B dominant, Em–G–Am–C progression, E5/E6/D6/B5 climax brass
         Massive string drones + brass fanfare + timpani hits + heroic melody */
      const chords=[[164.81,196,246.94,329.63],[196,246.94,293.66,392],[220,261.63,329.63,440],[130.81,196,261.63,392]];
      const bass=[82.41,98,110,65.41];/* E2 G2 A2 C2 */
      const fanfare=[
        [659.25,587.33,493.88,659.25],[493.88,587.33,659.25,783.99],
        [587.33,659.25,783.99,659.25],[783.99,659.25,587.33,493.88]
      ];
      const BPM=75,CDUR=60/BPM*4,NDUR=CDUR/4;/* ~3.2s per bar */
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.15;
        while(nt<actx.currentTime+CDUR*2){
          const c=ci%chords.length,t=nt;
          /* massive string drone — layered sawtooth through LPF */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,7,-4,5][ni];
            const g=actx.createGain();const v=[0.035,0.028,0.022,0.018][ni];
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.2);
            g.gain.setValueAtTime(v,t+CDUR-1.0);g.gain.linearRampToValueAtTime(0,t+CDUR+0.3);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;lp.Q.value=0.5;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+CDUR+0.5);nodes.push(o);
          });
          /* heroic brass fanfare — bright sawtooth melody */
          fanfare[c].forEach((f,ni)=>{
            const mt=t+ni*NDUR+0.05;
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;
            const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5;
            const lfoG=actx.createGain();lfoG.gain.value=4;
            lfo.connect(lfoG);lfoG.connect(o.frequency);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.04,mt+0.08);
            g.gain.setValueAtTime(0.04,mt+NDUR*0.55);g.gain.linearRampToValueAtTime(0,mt+NDUR*0.9);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(mt);lfo.start(mt);o.stop(mt+NDUR+0.05);lfo.stop(mt+NDUR+0.05);
            nodes.push(o,lfo);
          });
          /* deep bass pedal */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.5);
          bg.gain.setValueAtTime(0.1,t+CDUR-0.8);bg.gain.linearRampToValueAtTime(0,t+CDUR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+CDUR+0.2);nodes.push(bo);
          /* timpani hit on beat 1 — pitched sine with fast decay */
          const to=actx.createOscillator();to.type='sine';to.frequency.value=bass[c]*0.5;
          to.frequency.setValueAtTime(bass[c]*0.8,t);
          to.frequency.exponentialRampToValueAtTime(bass[c]*0.5,t+0.08);
          const tg=actx.createGain();
          tg.gain.setValueAtTime(0,t);tg.gain.linearRampToValueAtTime(0.13,t+0.008);
          tg.gain.exponentialRampToValueAtTime(0.003,t+0.6);
          to.connect(tg);tg.connect(master);to.start(t);to.stop(t+0.7);nodes.push(to);
          /* dramatic high climax every 4 bars — E6/D6/B5 cascade */
          if(ci%4===2){
            [1318.51,1174.66,987.77].forEach((f,i)=>{
              const ht=t+0.15+i*0.2;
              const ho=actx.createOscillator();ho.type='sine';ho.frequency.value=f;
              const hg=actx.createGain();
              hg.gain.setValueAtTime(0,ht);hg.gain.linearRampToValueAtTime(0.035,ht+0.04);
              hg.gain.exponentialRampToValueAtTime(0.001,ht+1.2);
              ho.connect(hg);hg.connect(master);hg.connect(conv);ho.start(ht);ho.stop(ht+1.4);nodes.push(ho);
            });
          }
          ci++;nt+=CDUR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    samuraisake(actx,master,conv,nodes){
      /* Samurai Saké Showdown — E minor, 108 BPM, video-game samurai
         Decoded: E/G/B dominant chroma, ~386Hz G4 melodic peak, bass ~65Hz
         Taiko drums + shamisen pluck + shakuhachi flute + driving rhythm */
      const BPM=108,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[164.81,196,246.94],[196,246.94,329.63],[146.83,196,220],[164.81,246.94,329.63]];/* Em G Bm/D Em */
      const bass=[82.41,98,73.42,82.41];/* E2 G2 D2 E2 */
      const melody=[
        [659.25,587.33,493.88,440],[493.88,440,392,329.63],
        [587.33,493.88,440,392],[659.25,587.33,493.88,659.25]
      ];/* E5 D5 B4 A4 / B4 A4 G4 E4 / D5 B4 A4 G4 / E5 D5 B4 E5 */
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* shamisen pluck — triangle wave with fast decay + bandpass for brightness */
          chords[c].forEach((f,ni)=>{
            for(let beat=0;beat<4;beat++){
              const bt=t+beat*BEAT+(beat%2===1?BEAT*0.5:0);
              if(beat===3&&ni>0)continue;/* sparser on beat 4 */
              const o=actx.createOscillator();o.type='triangle';o.frequency.value=f*(beat%2===0?1:2);
              const g=actx.createGain();const v=0.04-ni*0.008;
              g.gain.setValueAtTime(0,bt);g.gain.linearRampToValueAtTime(v,bt+0.005);
              g.gain.exponentialRampToValueAtTime(0.001,bt+0.18);
              const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f*2;bp.Q.value=3;
              o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);
              o.start(bt);o.stop(bt+0.25);nodes.push(o);
            }
          });
          /* shakuhachi flute — sine with breathy noise + vibrato */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5.5;
            const lfoG=actx.createGain();lfoG.gain.value=6;
            lfo.connect(lfoG);lfoG.connect(o.frequency);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.025,mt+0.12);
            g.gain.setValueAtTime(0.025,mt+BEAT*0.6);g.gain.linearRampToValueAtTime(0,mt+BEAT*0.9);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(mt);lfo.start(mt);o.stop(mt+BEAT+0.05);lfo.stop(mt+BEAT+0.05);
            nodes.push(o,lfo);
            /* breathy noise layer */
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,actx.sampleRate*0.15,actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*0.3;
            nb.buffer=nBuf;
            const ng=actx.createGain();ng.gain.setValueAtTime(0,mt);ng.gain.linearRampToValueAtTime(0.012,mt+0.03);
            ng.gain.exponentialRampToValueAtTime(0.001,mt+0.12);
            const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=3000;
            nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(mt);nodes.push(nb);
          });
          /* taiko drum — deep sine with pitch slide on beats 1 & 3 */
          [0,2].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(120,dt);o.frequency.exponentialRampToValueAtTime(55,dt+0.08);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.16,dt+0.006);
            g.gain.exponentialRampToValueAtTime(0.003,dt+0.5);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.6);nodes.push(o);
            /* body thump noise */
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,actx.sampleRate*0.08,actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;
            const ng=actx.createGain();ng.gain.setValueAtTime(0.08,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.06);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=200;
            nb.connect(ng);ng.connect(lp);lp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* lighter percussion on off-beats — woodblock-style click */
          [1,3].forEach(beat=>{
            const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='square';
            o.frequency.setValueAtTime(800,dt);o.frequency.exponentialRampToValueAtTime(400,dt+0.015);
            const g=actx.createGain();
            g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.03,dt+0.002);
            g.gain.exponentialRampToValueAtTime(0.001,dt+0.04);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=600;bp.Q.value=2;
            o.connect(g);g.connect(bp);bp.connect(master);o.start(dt);o.stop(dt+0.06);nodes.push(o);
          });
          /* bass pedal — sub sine */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();
          bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.3);
          bg.gain.setValueAtTime(0.09,t+BAR-0.5);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* dramatic kiai shout accent every 4 bars — high E5 sustained with heavy vibrato */
          if(ci%4===3){
            const kt=t+0.1;
            const ko=actx.createOscillator();ko.type='sawtooth';ko.frequency.value=659.25;
            const kl=actx.createOscillator();kl.type='sine';kl.frequency.value=7;
            const klg=actx.createGain();klg.gain.value=12;
            kl.connect(klg);klg.connect(ko.frequency);
            const kg=actx.createGain();
            kg.gain.setValueAtTime(0,kt);kg.gain.linearRampToValueAtTime(0.03,kt+0.06);
            kg.gain.setValueAtTime(0.03,kt+BEAT*1.5);kg.gain.linearRampToValueAtTime(0,kt+BEAT*2);
            const klp=actx.createBiquadFilter();klp.type='lowpass';klp.frequency.value=1600;
            ko.connect(kg);kg.connect(klp);klp.connect(master);klp.connect(conv);
            ko.start(kt);kl.start(kt);ko.stop(kt+BEAT*2.2);kl.stop(kt+BEAT*2.2);
            nodes.push(ko,kl);
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    peakrush(actx,master,conv,nodes){
      /* Peak Rush (Pogo "Upular") — F Lydian, 125 BPM, high-energy bouncy
         Pixar's UP remix: bright optimistic pads, rapid bouncy melody,
         energetic kick/clap, sparkling bell accents */
      const BPM=125,BEAT=60/BPM,BAR=BEAT*4;
      /* F Lydian: F–G–A–B–C–D–E (raised 4th) */
      const chords=[[174.61,220,261.63],[196,246.94,293.66],[220,277.18,329.63],[174.61,220,261.63]];/* F G Am F */
      const bass=[87.31,98,110,87.31];/* F2 G2 A2 F2 */
      const melody=[
        [698.46,659.25,587.33,523.25,587.33,659.25,698.46,880],
        [783.99,698.46,659.25,587.33,659.25,783.99,880,783.99],
        [659.25,587.33,523.25,493.88,523.25,587.33,659.25,783.99],
        [880,783.99,698.46,659.25,698.46,783.99,880,1046.50]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* bright optimistic pad */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-4,6,-3][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.003;
            const g=actx.createGain();const v=0.03-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.4);
            g.gain.setValueAtTime(v,t+BAR-0.3);g.gain.linearRampToValueAtTime(0,t+BAR+0.15);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.25);o2.stop(t+BAR+0.25);nodes.push(o,o2);
          });
          /* rapid bouncy melody — bright sine with bell overtone */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*3;
            const g=actx.createGain();
            g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.035,mt+0.008);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.4);
            const g2=actx.createGain();
            g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.009,mt+0.005);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+BEAT*0.2);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+BEAT*0.3);
            nodes.push(o,o2);
          });
          /* vocal chops */
          [BEAT*0.25,BEAT*1,BEAT*1.75,BEAT*2.5,BEAT*3.25].forEach((off,i)=>{
            const ct=t+off;const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.08,ct);o.frequency.exponentialRampToValueAtTime(freq*0.92,ct+0.04);
            const g=actx.createGain();g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.03,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.04);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=4;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(ct);o.stop(ct+0.1);nodes.push(o);
          });
          /* punchy kick 1&3 */
          [0,2].forEach(beat=>{const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(105,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.05);
            const g=actx.createGain();g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.11,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o);
          });
          /* clap 2&4 */
          [1,3].forEach(beat=>{const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.03),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.035,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.03);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3000;bp.Q.value=1.3;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.15);
          bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    firstlight(actx,master,conv,nodes){
      /* First Light (Pogo "Anna") — D major, 110 BPM, whimsical icy sparkle
         Frozen-inspired: crystalline bell melody, gentle icy pads,
         soft sparkle accents, light danceable groove */
      const BPM=110,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[293.66,369.99,440],[246.94,311.13,369.99],[220,277.18,329.63],[293.66,369.99,440]];/* D Bm A D */
      const bass=[146.83,123.47,110,146.83];/* D3 B2 A2 D3 */
      const melody=[
        [880,783.99,739.99,659.25,739.99,880,987.77,880],
        [739.99,659.25,587.33,523.25,587.33,659.25,739.99,880],
        [659.25,587.33,523.25,493.88,523.25,587.33,659.25,739.99],
        [987.77,880,739.99,659.25,739.99,880,987.77,1174.66]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* icy crystalline pad — detuned sine layers, ethereal */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-7,5,-4][ni];
            const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f*0.999;
            const g=actx.createGain();const v=0.028-ni*0.005;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.8);
            g.gain.setValueAtTime(v,t+BAR-0.6);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1300;lp.Q.value=0.5;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2);
          });
          /* crystalline bell melody */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.01;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*2.998;
            const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.03,mt+0.01);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.42);
            const g2=actx.createGain();g2.gain.setValueAtTime(0,mt);g2.gain.linearRampToValueAtTime(0.01,mt+0.005);
            g2.gain.exponentialRampToValueAtTime(0.001,mt+BEAT*0.18);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);
            o2.connect(g2);g2.connect(master);o2.start(mt);o2.stop(mt+BEAT*0.25);nodes.push(o,o2);
          });
          /* vocal chops — icy sparkle */
          [BEAT*0.5,BEAT*1.25,BEAT*2,BEAT*2.75,BEAT*3.5].forEach((off,i)=>{
            const ct=t+off;const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.06,ct);o.frequency.exponentialRampToValueAtTime(freq*0.94,ct+0.05);
            const g=actx.createGain();g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.025,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.05);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq*1.1;bp.Q.value=5;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(ct);o.stop(ct+0.1);nodes.push(o);
          });
          /* soft kick 1&3 */
          [0,2].forEach(beat=>{const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(90,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.06);
            const g=actx.createGain();g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.08,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.22);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o);
          });
          /* light snap 2&4 */
          [1,3].forEach(beat=>{const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.025),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.025,dt+0.002);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.025);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=3500;bp.Q.value=1.5;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.2);
          bg.gain.setValueAtTime(0.07,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* icy sparkle shimmer every 2 bars */
          if(ci%2===0){const st=t+0.4;
            [1174.66,1479.98,1760].forEach((f,i)=>{/* D6 F#6 A6 */
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-6,6,0][i];
              const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.008,st+0.5);
              g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.5);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*1.8);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    drift(actx,master,conv,nodes){
      /* Drift (Pogo "Wishery") — Bb major, 95 BPM, dreamy hip-hop-esque
         Snow White remix: warm dreamy pads, gentle hip-hop groove,
         wistful melody, soft vocal chops, laid-back feel */
      const BPM=95,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[233.08,293.66,349.23],[261.63,329.63,392],[293.66,349.23,440],[233.08,293.66,349.23]];/* Bb C Dm Bb */
      const bass=[116.54,130.81,146.83,116.54];/* Bb2 C3 D3 Bb2 */
      const melody=[
        [587.33,523.25,466.16,392,466.16,523.25,587.33,698.46],
        [523.25,466.16,392,349.23,392,466.16,523.25,587.33],
        [698.46,587.33,523.25,466.16,523.25,587.33,698.46,587.33],
        [466.16,523.25,587.33,523.25,466.16,392,466.16,523.25]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm dreamy pad — detuned layers, slow attack */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-6,5,-4][ni];
            const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*0.998;
            const g=actx.createGain();const v=0.03-ni*0.006;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.0);
            g.gain.setValueAtTime(v,t+BAR-0.8);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1000;lp.Q.value=0.6;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2);
          });
          /* wistful gentle melody — sine, soft attack */
          melody[c].forEach((f,ni)=>{
            const mt=t+ni*BEAT*0.5+0.02;
            const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
            const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.028,mt+0.03);
            g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);
            o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.05);nodes.push(o);
          });
          /* soft vocal chops — dreamy */
          [BEAT*0.3,BEAT*1.1,BEAT*1.8,BEAT*2.6,BEAT*3.3].forEach((off,i)=>{
            const ct=t+off;const freq=chords[c][i%3]*(i%2===0?3:4);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.05,ct);o.frequency.exponentialRampToValueAtTime(freq*0.95,ct+0.06);
            const g=actx.createGain();g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.022,ct+0.006);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.06);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=4.5;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(ct);o.stop(ct+0.12);nodes.push(o);
          });
          /* laid-back kick 1&3 */
          [0,2].forEach(beat=>{const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(95,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.07);
            const g=actx.createGain();g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.09,dt+0.005);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.3);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.35);nodes.push(o);
          });
          /* soft snare 2&4 */
          [1,3].forEach(beat=>{const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.05),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.028,dt+0.003);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.045);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200;bp.Q.value=1;
            nb.connect(ng);ng.connect(bp);bp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.25);
          bg.gain.setValueAtTime(0.08,t+BAR-0.4);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* dreamy high shimmer every 2 bars */
          if(ci%2===1){const st=t+0.5;
            [932.33,1174.66,1396.91].forEach((f,i)=>{/* Bb5 D6 F6 */
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-7,7,0][i];
              const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.009,st+1.2);
              g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.8);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    haven(actx,master,conv,nodes){
      /* Haven (Porter Robinson & Madeon "Shelter") — C major, 100 BPM
         Uplifting emotional electronic: bright arpeggiated synths, warm pads,
         soaring euphoric build, shimmering textures */
      const BPM=100,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[
        [261.63,329.63,392],     /* C  E  G  */
        [220,277.18,329.63],     /* A  C# E  (A major) */
        [246.94,311.13,369.99],  /* B  D# F# (B major) */
        [261.63,329.63,392]      /* C  E  G  */
      ];
      const bass=[130.81,110,123.47,130.81];/* C3 A2 B2 C3 */
      const arp=[
        [523.25,659.25,783.99,1046.5,783.99,659.25,523.25,659.25],
        [440,554.37,659.25,880,659.25,554.37,440,554.37],
        [493.88,622.25,739.99,987.77,739.99,622.25,493.88,622.25],
        [523.25,659.25,783.99,1046.5,783.99,659.25,523.25,783.99]
      ];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%chords.length,t=nt;
          /* warm evolving pad — detuned saws filtered soft */
          chords[c].forEach((f,ni)=>{
            const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,6,-5][ni];
            const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.003;
            const g=actx.createGain();const v=0.018-ni*0.003;
            g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.8);
            g.gain.setValueAtTime(v,t+BAR-0.6);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900+ci%4*80;lp.Q.value=0.7;
            o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);
            o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2);
          });
          /* bright arpeggio — signature Shelter shimmer */
          arp[c].forEach((f,ni)=>{
            const at=t+ni*BEAT*0.5;
            const o=actx.createOscillator();o.type='square';o.frequency.value=f;
            const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.022,at+0.015);
            g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.45);
            const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;lp.Q.value=1.2;
            o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5+0.05);nodes.push(o);
          });
          /* soaring lead — sine with vibrato, every other bar */
          if(ci%2===0){
            const lead=[523.25,587.33,659.25,783.99,659.25,587.33,523.25,783.99];
            lead.forEach((f,ni)=>{
              const lt=t+ni*BEAT*0.5+0.01;
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
              const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5.5;
              const lfoG=actx.createGain();lfoG.gain.value=3;
              lfo.connect(lfoG);lfoG.connect(o.frequency);
              const g=actx.createGain();g.gain.setValueAtTime(0,lt);g.gain.linearRampToValueAtTime(0.03,lt+0.04);
              g.gain.exponentialRampToValueAtTime(0.003,lt+BEAT*0.48);
              o.connect(g);g.connect(master);g.connect(conv);
              o.start(lt);lfo.start(lt);o.stop(lt+BEAT*0.5+0.05);lfo.stop(lt+BEAT*0.5+0.05);nodes.push(o,lfo);
            });
          }
          /* emotional vocal-like chops */
          [BEAT*0.25,BEAT*1.25,BEAT*2.5,BEAT*3.5].forEach((off,i)=>{
            const ct=t+off;const freq=chords[c][i%3]*(i%2===0?4:3);
            const o=actx.createOscillator();o.type='sine';o.frequency.value=freq;
            o.frequency.setValueAtTime(freq*1.08,ct);o.frequency.exponentialRampToValueAtTime(freq*0.93,ct+0.07);
            const g=actx.createGain();g.gain.setValueAtTime(0,ct);g.gain.linearRampToValueAtTime(0.02,ct+0.005);
            g.gain.exponentialRampToValueAtTime(0.001,ct+0.07);
            const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=freq;bp.Q.value=5;
            o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(ct);o.stop(ct+0.12);nodes.push(o);
          });
          /* punchy electronic kick 1&3 */
          [0,2].forEach(beat=>{const dt=t+beat*BEAT;
            const o=actx.createOscillator();o.type='sine';
            o.frequency.setValueAtTime(110,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.06);
            const g=actx.createGain();g.gain.setValueAtTime(0,dt);g.gain.linearRampToValueAtTime(0.1,dt+0.004);
            g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);
            o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o);
          });
          /* crisp clap 2&4 */
          [1,3].forEach(beat=>{const dt=t+beat*BEAT;
            const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);
            const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1);
            nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0,dt);ng.gain.linearRampToValueAtTime(0.035,dt+0.003);
            ng.gain.exponentialRampToValueAtTime(0.001,dt+0.04);
            const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;hp.Q.value=0.8;
            nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb);
          });
          /* deep sub bass */
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];
          const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.2);
          bg.gain.setValueAtTime(0.09,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);
          bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          /* euphoric high shimmer every 2 bars */
          if(ci%2===1){const st=t+0.3;
            [1046.5,1318.51,1567.98].forEach((f,i)=>{/* C6 E6 G6 */
              const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-5,5,0][i];
              const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.01,st+1.0);
              g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.8);
              o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2);nodes.push(o);
            });
          }
          ci++;nt+=BAR;
        }
        _schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    getout(actx,master,conv,nodes){
      /* Let's Get Outta Here — G major, 118 BPM, upbeat escape energy */
      const BPM=118,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[392,493.88,587.33],[329.63,415.3,493.88],[349.23,440,523.25],[392,493.88,587.33]];/* G B D | E G# B | F A C | G B D */
      const bass=[196,164.81,174.61,196];
      const arp=[[783.99,987.77,1174.66,783.99,987.77,1174.66,783.99,1174.66],[659.25,830.61,987.77,659.25,830.61,987.77,659.25,987.77],[698.46,880,1046.5,698.46,880,1046.5,698.46,1046.5],[783.99,987.77,1174.66,783.99,987.77,1174.66,987.77,783.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-7,5,-4][ni];const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f*1.002;const g=actx.createGain();const v=0.016-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.5);g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;lp.Q.value=0.6;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.2);o2.stop(t+BAR+0.2);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.01);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.4);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;lp.Q.value=1;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(100,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.06);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.03,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.04);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.15);bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    goyourway(actx,master,conv,nodes){
      /* Go Your Own Way — A major, 110 BPM, confident & driving */
      const BPM=110,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[440,554.37,659.25],[329.63,415.3,493.88],[369.99,466.16,554.37],[440,554.37,659.25]];/* A C# E | E G# B | F# A# C# | A */
      const bass=[220,164.81,185,220];
      const mel=[[880,830.61,783.99,659.25,554.37,659.25,783.99,880],[659.25,622.25,554.37,493.88,440,493.88,554.37,659.25],[739.99,698.46,659.25,554.37,493.88,554.37,659.25,739.99],[880,783.99,659.25,554.37,659.25,783.99,880,1046.5]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,6,0][ni];const g=actx.createGain();const v=0.017-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.6);g.gain.setValueAtTime(v,t+BAR-0.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=0.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.2);nodes.push(o)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.025,mt+0.02);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(105,dt);o.frequency.exponentialRampToValueAtTime(44,dt+0.06);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.028,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.04);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1900;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.085,t+0.15);bg.gain.setValueAtTime(0.085,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    feelalive(actx,master,conv,nodes){
      /* Feel Alive — B major, 120 BPM, uplifting energetic */
      const BPM=120,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[493.88,622.25,739.99],[440,554.37,659.25],[392,493.88,587.33],[493.88,622.25,739.99]];/* B D# F# | A C# E | G B D | B */
      const bass=[246.94,220,196,246.94];
      const arp=[[987.77,1244.51,1479.98,987.77,1244.51,1479.98,987.77,1479.98],[880,1108.73,1318.51,880,1108.73,1318.51,880,1318.51],[783.99,987.77,1174.66,783.99,987.77,1174.66,783.99,1174.66],[987.77,1244.51,1479.98,1244.51,987.77,1244.51,1479.98,987.77]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-7,6,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.004;const g=actx.createGain();const v=0.016-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.4);g.gain.setValueAtTime(v,t+BAR-0.3);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;lp.Q.value=0.7;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.2);o2.stop(t+BAR+0.2);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.021,at+0.01);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.38);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;lp.Q.value=1.1;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(115,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.22);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.28);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.035),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.035,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.035);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2200;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.1);bg.gain.setValueAtTime(0.09,t+BAR-0.2);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    headlights(actx,master,conv,nodes){
      /* Headlights — A minor, 115 BPM, driving illuminating */
      const BPM=115,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[440,523.25,659.25],[392,466.16,587.33],[349.23,440,523.25],[440,523.25,659.25]];/* Am | Gm | F | Am */
      const bass=[220,196,174.61,220];
      const arp=[[880,1046.5,1318.51,1046.5,880,1046.5,1318.51,1046.5],[783.99,932.33,1174.66,932.33,783.99,932.33,1174.66,932.33],[698.46,880,1046.5,880,698.46,880,1046.5,880],[880,1046.5,1318.51,1046.5,880,1318.51,1046.5,880]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,5,-4][ni];const g=actx.createGain();const v=0.016-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.4);g.gain.setValueAtTime(v,t+BAR-0.3);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1250;lp.Q.value=0.7;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.2);nodes.push(o)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.012);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.4);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;lp.Q.value=1;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?108:72,dt);o.frequency.exponentialRampToValueAtTime(44,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.1:0.04,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.088,t+0.12);bg.gain.setValueAtTime(0.088,t+BAR-0.25);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    brightside(actx,master,conv,nodes){
      /* Bright Side — C major, 120 BPM, happy cheerful pop */
      const BPM=120,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[261.63,329.63,392],[349.23,440,523.25],[392,493.88,587.33],[261.63,329.63,392]];
      const bass=[130.81,174.61,196,130.81];
      const mel=[[523.25,587.33,659.25,783.99,659.25,587.33,523.25,659.25],[698.46,659.25,587.33,523.25,587.33,659.25,698.46,783.99],[783.99,698.46,659.25,587.33,659.25,783.99,880,783.99],[523.25,659.25,783.99,659.25,523.25,587.33,659.25,523.25]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-4,3,-2][ni];const g=actx.createGain();const v=0.02-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.3);g.gain.setValueAtTime(v,t+BAR-0.3);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;lp.Q.value=0.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.2);nodes.push(o)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.028,mt+0.015);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.44);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(110,dt);o.frequency.exponentialRampToValueAtTime(48,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.22);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.28);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.035),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.03,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.035);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.1);bg.gain.setValueAtTime(0.09,t+BAR-0.2);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    loopworld(actx,master,conv,nodes){
      /* Loop World — G major, 121 BPM, hypnotic house groove */
      const BPM=121,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[392,493.88,587.33],[392,493.88,587.33],[349.23,440,523.25],[349.23,440,523.25]];
      const bass=[196,196,174.61,174.61];
      const arp=[[783.99,587.33,493.88,587.33,783.99,587.33,493.88,587.33],[783.99,659.25,587.33,659.25,783.99,659.25,587.33,659.25],[698.46,523.25,440,523.25,698.46,523.25,440,523.25],[698.46,587.33,523.25,587.33,698.46,587.33,523.25,587.33]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,5,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.003;const g=actx.createGain();const v=0.014-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.3);g.gain.setValueAtTime(v,t+BAR-0.2);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1000+Math.sin(ci*0.5)*300;lp.Q.value=2;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.2);o2.stop(t+BAR+0.2);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.018,at+0.008);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.4);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2500;lp.Q.value=1.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?105:70,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.1:0.04,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sawtooth';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.05);bg.gain.setValueAtTime(0.07,t+BAR-0.15);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=300;bo.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    neonfocus(actx,master,conv,nodes){
      /* Neon Focus — A minor, 110 BPM, 80s synthwave */
      const BPM=110,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[440,523.25,659.25],[349.23,440,523.25],[392,466.16,587.33],[440,523.25,659.25]];
      const bass=[220,174.61,196,220];
      const arp=[[880,1046.5,1318.51,1046.5,880,1046.5,1318.51,1046.5],[698.46,880,1046.5,880,698.46,880,1046.5,880],[783.99,932.33,1174.66,932.33,783.99,932.33,1174.66,932.33],[880,1046.5,1318.51,1046.5,880,1318.51,1046.5,880]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,7,-5][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.005;const g=actx.createGain();const v=0.015-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.5);g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=1;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.2);o2.stop(t+BAR+0.2);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.01);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.42);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;lp.Q.value=1.2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(100,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.06);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.04),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.03,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.04);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sawtooth';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.08);bg.gain.setValueAtTime(0.07,t+BAR-0.2);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=350;bo.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    twominutes(actx,master,conv,nodes){
      /* Two Minutes — E minor, 130 BPM, Vietnamese bounce */
      const BPM=130,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[329.63,392,493.88],[293.66,349.23,440],[261.63,329.63,392],[293.66,369.99,440]];
      const bass=[164.81,146.83,130.81,146.83];
      const arp=[[659.25,783.99,987.77,783.99,659.25,783.99,987.77,783.99],[587.33,698.46,880,698.46,587.33,698.46,880,698.46],[523.25,659.25,783.99,659.25,523.25,659.25,783.99,659.25],[587.33,739.99,880,739.99,587.33,739.99,880,739.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-7,6,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.004;const g=actx.createGain();const v=0.014-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.2);g.gain.setValueAtTime(v,t+BAR-0.15);g.gain.linearRampToValueAtTime(0,t+BAR+0.05);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;lp.Q.value=0.8;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.022,at+0.006);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.35);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;lp.Q.value=1.2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?110:75,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.1:0.05,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.18);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.22);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.06);bg.gain.setValueAtTime(0.09,t+BAR-0.12);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    timecurrent(actx,master,conv,nodes){
      /* Time Current — B major, 112 BPM, nostalgic anime piano */
      const BPM=112,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[493.88,622.25,739.99],[440,554.37,659.25],[369.99,466.16,554.37],[493.88,622.25,739.99]];
      const bass=[246.94,220,185,246.94];
      const mel=[[987.77,880,739.99,622.25,739.99,880,987.77,1174.66],[880,739.99,659.25,554.37,659.25,739.99,880,987.77],[739.99,659.25,554.37,466.16,554.37,659.25,739.99,880],[987.77,880,739.99,622.25,739.99,987.77,880,739.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-3,2,-1][ni];const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f*1.001;const g=actx.createGain();const v=0.022-ni*0.005;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.2);g.gain.setValueAtTime(v,t+BAR-1);g.gain.linearRampToValueAtTime(0,t+BAR+0.4);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=800;lp.Q.value=0.4;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.5);o2.stop(t+BAR+0.5);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.03,mt+0.01);g.gain.exponentialRampToValueAtTime(0.003,mt+BEAT*0.48);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5);nodes.push(o)});
          if(ci%2===1){const st=t+0.5;[1975.53,2489.02,2959.96].forEach((f,i)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-3,3,0][i];const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.006,st+1.5);g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.8);o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2);nodes.push(o)})}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.06,t+0.3);bg.gain.setValueAtTime(0.06,t+BAR-0.5);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    whiteexpanse(actx,master,conv,nodes){
      /* White Expanse — Db minor, 78 BPM, melancholic sparse piano */
      const BPM=78,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[277.18,349.23,415.3],[233.08,293.66,349.23],[261.63,311.13,392],[277.18,349.23,415.3]];
      const bass=[138.59,116.54,130.81,138.59];
      const mel=[[554.37,523.25,415.3,349.23,415.3,523.25,554.37,698.46],[466.16,415.3,349.23,293.66,349.23,415.3,466.16,554.37],[523.25,466.16,392,311.13,392,466.16,523.25,622.25],[554.37,523.25,415.3,349.23,415.3,554.37,523.25,415.3]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-2,2,0][ni];const g=actx.createGain();const v=0.025-ni*0.006;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.5);g.gain.setValueAtTime(v,t+BAR-1.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.5);o.connect(g);g.connect(master);g.connect(conv);o.start(t);o.stop(t+BAR+0.6);nodes.push(o)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.032,mt+0.008);g.gain.exponentialRampToValueAtTime(0.003,mt+BEAT*0.48);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5+0.1);nodes.push(o)});
          if(ci%2===0){const st=t+BEAT;[1108.73,1396.91,1661.22].forEach((f,i)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-2,2,0][i];const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.005,st+2);g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.8);o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2);nodes.push(o)})}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.05,t+0.5);bg.gain.setValueAtTime(0.05,t+BAR-0.8);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    packlaw(actx,master,conv,nodes){
      /* Pack Law — Ab major, 86 BPM half-time, Mongolian heavy */
      const BPM=86,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[415.3,523.25,622.25],[369.99,466.16,554.37],[311.13,415.3,466.16],[415.3,523.25,622.25]];
      const bass=[103.83,92.5,77.78,103.83];
      const mel=[[415.3,466.16,523.25,622.25,523.25,466.16,415.3,523.25],[369.99,415.3,466.16,554.37,466.16,415.3,369.99,466.16],[311.13,369.99,415.3,466.16,415.3,369.99,311.13,415.3],[415.3,466.16,523.25,622.25,523.25,415.3,466.16,415.3]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-10,8,-7][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*0.995;const g=actx.createGain();const v=0.02-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.6);g.gain.setValueAtTime(v,t+BAR-0.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.Q.value=1.5;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f*0.5;const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=4;const lfoG=actx.createGain();lfoG.gain.value=5;lfo.connect(lfoG);lfoG.connect(o.frequency);const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.02,mt+0.04);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.48);const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f*0.5;bp.Q.value=3;o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(mt);lfo.start(mt);o.stop(mt+BEAT*0.5);lfo.stop(mt+BEAT*0.5);nodes.push(o,lfo)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(80,dt);o.frequency.exponentialRampToValueAtTime(32,dt+0.1);const g=actx.createGain();g.gain.setValueAtTime(0.12,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.4);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.45);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sawtooth';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.2);bg.gain.setValueAtTime(0.08,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=200;bo.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    barestrings(actx,master,conv,nodes){
      /* Bare Strings — Bb minor, 132 BPM, Mongolian folk acoustic */
      const BPM=132,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[233.08,277.18,349.23],[207.65,261.63,311.13],[220,277.18,329.63],[233.08,293.66,349.23]];
      const bass=[116.54,103.83,110,116.54];
      const mel=[[466.16,554.37,698.46,554.37,466.16,415.3,466.16,554.37],[415.3,523.25,622.25,523.25,415.3,349.23,415.3,523.25],[440,554.37,659.25,554.37,440,369.99,440,554.37],[466.16,587.33,698.46,587.33,466.16,392,466.16,587.33]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{[0,BEAT,BEAT*2,BEAT*3].forEach((off,bi)=>{const st=t+off;const o=actx.createOscillator();o.type='triangle';o.frequency.value=f*(bi%2===0?1:2);o.detune.value=[-5,4,-3][ni];const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.018,st+0.01);g.gain.exponentialRampToValueAtTime(0.002,st+BEAT*0.8);o.connect(g);g.connect(master);g.connect(conv);o.start(st);o.stop(st+BEAT);nodes.push(o)})});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5;const lfoG=actx.createGain();lfoG.gain.value=4;lfo.connect(lfoG);lfoG.connect(o.frequency);const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.018,mt+0.02);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.44);const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=4;o.connect(g);g.connect(bp);bp.connect(master);bp.connect(conv);o.start(mt);lfo.start(mt);o.stop(mt+BEAT*0.5);lfo.stop(mt+BEAT*0.5);nodes.push(o,lfo)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(90,dt);o.frequency.exponentialRampToValueAtTime(38,dt+0.07);const g=actx.createGain();g.gain.setValueAtTime(0.08,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.3);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.35);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='triangle';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.15);bg.gain.setValueAtTime(0.07,t+BAR-0.25);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    steelsilk(actx,master,conv,nodes){
      /* Steel & Silk — D minor, 140 BPM, Japanese samurai EDM */
      const BPM=140,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[293.66,349.23,440],[261.63,329.63,392],[233.08,293.66,349.23],[293.66,369.99,440]];
      const bass=[146.83,130.81,116.54,146.83];
      const arp=[[587.33,698.46,880,698.46,587.33,698.46,880,698.46],[523.25,659.25,783.99,659.25,523.25,659.25,783.99,659.25],[466.16,587.33,698.46,587.33,466.16,587.33,698.46,587.33],[587.33,739.99,880,739.99,587.33,739.99,880,739.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-9,8,-6][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*0.996;const g=actx.createGain();const v=0.016-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.2);g.gain.setValueAtTime(v,t+BAR-0.15);g.gain.linearRampToValueAtTime(0,t+BAR+0.05);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=1.2;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.022,at+0.005);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.35);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;lp.Q.value=1.3;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?115:78,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.1:0.05,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.18);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.22);nodes.push(o)});
          if(ci%2===0){[1174.66,1479.98,1760].forEach((f,i)=>{const st=t+BEAT*0.5;const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.frequency.setValueAtTime(f*1.1,st);o.frequency.exponentialRampToValueAtTime(f,st+0.05);const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.015,st+0.005);g.gain.exponentialRampToValueAtTime(0.001,st+0.3);o.connect(g);g.connect(master);g.connect(conv);o.start(st);o.stop(st+0.35);nodes.push(o)})}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.06);bg.gain.setValueAtTime(0.09,t+BAR-0.12);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    gilt(actx,master,conv,nodes){
      /* Gilt — E minor, 123 BPM, 3/4 K-pop ballad */
      const BPM=123,BEAT=60/BPM,BAR=BEAT*3;
      const chords=[[329.63,392,493.88],[293.66,349.23,440],[261.63,329.63,392],[293.66,369.99,440]];
      const bass=[164.81,146.83,130.81,146.83];
      const mel=[[659.25,783.99,987.77,783.99,659.25,783.99],[587.33,698.46,880,698.46,587.33,698.46],[523.25,659.25,783.99,659.25,523.25,659.25],[587.33,739.99,880,739.99,587.33,739.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-5,4,-3][ni];const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.001;const g=actx.createGain();const v=0.02-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.8);g.gain.setValueAtTime(v,t+BAR-0.6);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=950;lp.Q.value=0.5;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=5;const lfoG=actx.createGain();lfoG.gain.value=3;lfo.connect(lfoG);lfoG.connect(o.frequency);const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.025,mt+0.025);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.46);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);lfo.start(mt);o.stop(mt+BEAT*0.5);lfo.stop(mt+BEAT*0.5);nodes.push(o,lfo)});
          const ko=actx.createOscillator();ko.type='sine';ko.frequency.setValueAtTime(95,t);ko.frequency.exponentialRampToValueAtTime(40,t+0.07);const kg=actx.createGain();kg.gain.setValueAtTime(0.08,t);kg.gain.exponentialRampToValueAtTime(0.002,t+0.3);ko.connect(kg);kg.connect(master);ko.start(t);ko.stop(t+0.35);nodes.push(ko);
          if(ci%2===1){const st=t+0.4;[1318.51,1567.98,1975.53].forEach((f,i)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=[-4,4,0][i];const g=actx.createGain();g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(0.007,st+1);g.gain.exponentialRampToValueAtTime(0.001,st+BAR*1.5);o.connect(g);g.connect(conv);g.connect(master);o.start(st);o.stop(st+BAR*2);nodes.push(o)})}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.2);bg.gain.setValueAtTime(0.07,t+BAR-0.3);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    subzero(actx,master,conv,nodes){
      /* Sub Zero — F minor, 128 BPM, heavy bass EDM */
      const BPM=128,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[349.23,415.3,523.25],[311.13,369.99,466.16],[293.66,349.23,440],[349.23,415.3,523.25]];
      const bass=[87.31,77.78,73.42,87.31];
      const arp=[[698.46,830.61,1046.5,830.61,698.46,830.61,1046.5,830.61],[622.25,739.99,932.33,739.99,622.25,739.99,932.33,739.99],[587.33,698.46,880,698.46,587.33,698.46,880,698.46],[698.46,830.61,1046.5,830.61,698.46,1046.5,830.61,698.46]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,7,-5][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.006;const g=actx.createGain();const v=0.015-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.15);g.gain.setValueAtTime(v,t+BAR-0.1);g.gain.linearRampToValueAtTime(0,t+BAR+0.05);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1600;lp.Q.value=1.5;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.005);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.35);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;lp.Q.value=1.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?120:80,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.12:0.05,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.18);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.22);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=3;const lfoG=actx.createGain();lfoG.gain.value=15;lfo.connect(lfoG);lfoG.connect(bo.frequency);const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.12,t+0.05);bg.gain.setValueAtTime(0.12,t+BAR-0.1);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);lfo.start(t);bo.stop(t+BAR+0.1);lfo.stop(t+BAR+0.1);nodes.push(bo,lfo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    empower(actx,master,conv,nodes){
      /* Empower — G major, 140 BPM, powerful uplifting motivational EDM */
      const BPM=140,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[392,493.88,587.33],[329.63,415.3,493.88],[349.23,440,523.25],[392,493.88,587.33]];
      const bass=[196,164.81,174.61,196];
      const arp=[[783.99,987.77,1174.66,987.77,783.99,987.77,1174.66,987.77],[659.25,830.61,987.77,830.61,659.25,830.61,987.77,659.25],[698.46,880,1046.5,880,698.46,880,1046.5,698.46],[783.99,987.77,1174.66,987.77,783.99,1174.66,987.77,783.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,8,-5][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.005;const g=actx.createGain();const v=0.016-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.2);g.gain.setValueAtTime(v,t+BAR-0.15);g.gain.linearRampToValueAtTime(0,t+BAR+0.05);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;lp.Q.value=0.8;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.022,at+0.005);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.32);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3800;lp.Q.value=1.2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(130,dt);o.frequency.exponentialRampToValueAtTime(45,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(0.11,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.16);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.2);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.06);bg.gain.setValueAtTime(0.1,t+BAR-0.1);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    engage(actx,master,conv,nodes){
      /* Engage — D minor, 135 BPM, dark cinematic intense EDM */
      const BPM=135,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[293.66,349.23,440],[261.63,311.13,392],[277.18,349.23,415.3],[293.66,349.23,440]];
      const bass=[146.83,130.81,138.59,146.83];
      const arp=[[587.33,698.46,880,698.46,587.33,698.46,880,587.33],[523.25,622.25,783.99,622.25,523.25,622.25,783.99,523.25],[554.37,698.46,830.61,698.46,554.37,698.46,830.61,554.37],[587.33,698.46,880,698.46,587.33,880,698.46,587.33]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-10,9,-6][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*0.994;const g=actx.createGain();const v=0.017-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.15);g.gain.setValueAtTime(v,t+BAR-0.12);g.gain.linearRampToValueAtTime(0,t+BAR+0.05);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;lp.Q.value=1.2;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.018,at+0.005);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.3);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2800;lp.Q.value=1.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;if(b%2===0){const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(125,dt);o.frequency.exponentialRampToValueAtTime(40,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(0.12,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o)}else{const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.025),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.035,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.025);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2500;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)}});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.05);bg.gain.setValueAtTime(0.1,t+BAR-0.1);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    porcelain(actx,master,conv,nodes){
      /* Porcelain — Ab major, 85 BPM, smooth groovy R&B/lo-fi, doll-like elegance */
      const BPM=85,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[415.3,523.25,622.25],[369.99,466.16,554.37],[349.23,440,523.25],[415.3,523.25,622.25]];
      const bass=[103.83,92.5,87.31,103.83];
      const mel=[[830.61,783.99,622.25,523.25,622.25,783.99,830.61,1046.5],[739.99,698.46,554.37,466.16,554.37,698.46,739.99,932.33],[698.46,659.25,523.25,440,523.25,659.25,698.46,880],[830.61,783.99,622.25,523.25,622.25,830.61,783.99,622.25]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;o.detune.value=[-3,3,-1][ni];const o2=actx.createOscillator();o2.type='sine';o2.frequency.value=f*1.001;const g=actx.createGain();const v=0.024-ni*0.005;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.2);g.gain.setValueAtTime(v,t+BAR-1);g.gain.linearRampToValueAtTime(0,t+BAR+0.4);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.Q.value=0.5;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.5);o2.stop(t+BAR+0.5);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.025,mt+0.01);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(90,dt);o.frequency.exponentialRampToValueAtTime(38,dt+0.06);const g=actx.createGain();g.gain.setValueAtTime(0.07,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.3);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.35);nodes.push(o)});
          if(ci%2===0){[1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.02),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.02,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.02);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=3000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)})}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.07,t+0.3);bg.gain.setValueAtTime(0.07,t+BAR-0.5);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2200);
      };
    },
    wired(actx,master,conv,nodes){
      /* Wired — E minor, 140 BPM, hard mechanical robotic EDM, glitchy staccato */
      const BPM=140,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[329.63,415.3,493.88],[293.66,369.99,440],[311.13,392,466.16],[329.63,415.3,493.88]];
      const bass=[82.41,73.42,77.78,82.41];
      const arp=[[659.25,830.61,987.77,659.25,830.61,987.77,659.25,987.77],[587.33,739.99,880,587.33,739.99,880,587.33,880],[622.25,783.99,932.33,622.25,783.99,932.33,622.25,932.33],[659.25,830.61,987.77,659.25,987.77,830.61,659.25,987.77]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='square';o.frequency.value=f;o.detune.value=[-12,10,-8][ni];const g=actx.createGain();const v=0.012-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.05);g.gain.setValueAtTime(v,t+BAR-0.08);g.gain.linearRampToValueAtTime(0,t+BAR+0.02);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(600,t);lp.frequency.linearRampToValueAtTime(2200,t+BAR*0.7);lp.frequency.linearRampToValueAtTime(600,t+BAR);lp.Q.value=2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.05);nodes.push(o)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.003);g.gain.setValueAtTime(0.02,at+BEAT*0.12);g.gain.linearRampToValueAtTime(0,at+BEAT*0.13);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;lp.Q.value=2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?140:95,dt);o.frequency.exponentialRampToValueAtTime(38,dt+0.03);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.13:0.06,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.12);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.15);nodes.push(o)});
          if(ci%2===0){[0.5,1.5,2.5,3.5].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.008),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.03,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.008);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=4000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)})}
          const bo=actx.createOscillator();bo.type='sawtooth';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.03);bg.gain.setValueAtTime(0.1,t+BAR-0.08);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=250;bo.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    brickdrop(actx,master,conv,nodes){
      /* Brick Drop — Bb major, 128 BPM, bouncy bass-heavy Chinese DJ track */
      const BPM=128,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[233.08,293.66,349.23],[207.65,261.63,311.13],[220,277.18,329.63],[233.08,293.66,349.23]];
      const bass=[116.54,103.83,110,116.54];
      const bounce=[[466.16,349.23,466.16,349.23,466.16,587.33,466.16,349.23],[415.3,311.13,415.3,311.13,415.3,523.25,415.3,311.13],[440,329.63,440,329.63,440,554.37,440,329.63],[466.16,349.23,466.16,349.23,466.16,587.33,349.23,466.16]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,6,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.004;const g=actx.createGain();const v=0.014-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.08);g.gain.setValueAtTime(v,t+BAR-0.1);g.gain.linearRampToValueAtTime(0,t+BAR+0.03);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=1;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          bounce[c].forEach((f,ni)=>{const bt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,bt);g.gain.linearRampToValueAtTime(0.025,bt+0.004);g.gain.exponentialRampToValueAtTime(0.002,bt+BEAT*0.28);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;lp.Q.value=1.5;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(bt);o.stop(bt+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(b%2===0?130:90,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.12:0.06,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.15);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.18);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=4;const lfoG=actx.createGain();lfoG.gain.value=8;lfo.connect(lfoG);lfoG.connect(bo.frequency);const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.12,t+0.04);bg.gain.setValueAtTime(0.12,t+BAR-0.08);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);lfo.start(t);bo.stop(t+BAR+0.1);lfo.stop(t+BAR+0.1);nodes.push(bo,lfo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    brassempire(actx,master,conv,nodes){
      /* Brass Empire — Bb major, 150 BPM, triumphant brass-like synths, bold hook */
      const BPM=150,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[233.08,293.66,349.23],[196,246.94,293.66],[207.65,261.63,311.13],[220,277.18,329.63]];
      const bass=[116.54,98,103.83,110];
      const brass=[[466.16,466.16,587.33,466.16,349.23,466.16,587.33,698.46],[392,392,493.88,392,293.66,392,493.88,587.33],[415.3,415.3,523.25,415.3,311.13,415.3,523.25,622.25],[440,440,554.37,440,329.63,440,554.37,659.25]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-6,7,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.006;const g=actx.createGain();const v=0.015-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.12);g.gain.setValueAtTime(v,t+BAR-0.1);g.gain.linearRampToValueAtTime(0,t+BAR+0.04);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1600;lp.Q.value=0.9;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          brass[c].forEach((f,ni)=>{const bt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.003;const g=actx.createGain();g.gain.setValueAtTime(0,bt);g.gain.linearRampToValueAtTime(0.03,bt+0.008);g.gain.setValueAtTime(0.03,bt+BEAT*0.18);g.gain.exponentialRampToValueAtTime(0.002,bt+BEAT*0.38);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;lp.Q.value=1.5;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(bt);o2.start(bt);o.stop(bt+BEAT*0.5);o2.stop(bt+BEAT*0.5);nodes.push(o,o2)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(140,dt);o.frequency.exponentialRampToValueAtTime(42,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(0.13,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.16);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.2);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.11,t+0.04);bg.gain.setValueAtTime(0.11,t+BAR-0.08);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    deadsignal(actx,master,conv,nodes){
      /* Dead Signal — A minor, 130 BPM, phonk, heavy 808 bass, cowbell, dark */
      const BPM=130,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66],[164.81,196,246.94]];
      const bass=[55,43.65,49,41.2];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-15,12,-9][ni];const g=actx.createGain();const v=0.012-ni*0.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.3);g.gain.setValueAtTime(v,t+BAR-0.2);g.gain.linearRampToValueAtTime(0,t+BAR+0.1);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=800;lp.Q.value=1.8;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o.stop(t+BAR+0.15);nodes.push(o)});
          [0,1,2,3,4,5,6,7].forEach(b=>{const dt=t+b*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=1200;const g=actx.createGain();g.gain.setValueAtTime(b%2===0?0.04:0.025,dt);g.gain.exponentialRampToValueAtTime(0.001,dt+0.02);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.03);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(160,dt);o.frequency.exponentialRampToValueAtTime(35,dt+0.06);const g=actx.createGain();g.gain.setValueAtTime(0.14,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.3);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.35);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.03),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.04,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.03);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=3000;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bDist=actx.createWaveShaper();const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/255-1;curve[i]=Math.tanh(x*3)}bDist.curve=curve;const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.18,t+0.03);bg.gain.exponentialRampToValueAtTime(0.04,t+BAR*0.8);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=120;bo.connect(bDist);bDist.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    luciddescent(actx,master,conv,nodes){
      /* Lucid Descent — C minor, 70 BPM, dreamy ambient, ethereal pads, lo-fi */
      const BPM=70,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[261.63,311.13,392],[207.65,261.63,311.13],[155.56,196,233.08],[233.08,277.18,349.23]];
      const bass=[65.41,51.91,77.78,58.27];
      const mel=[[523.25,0,466.16,0,392,0,311.13,0],[415.3,0,392,0,311.13,0,261.63,0],[311.13,0,349.23,0,392,0,466.16,0],[466.16,0,440,0,349.23,0,311.13,0]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f*1.002;o2.detune.value=[-4,5,-2][ni];const g=actx.createGain();const v=0.028-ni*0.006;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+2);g.gain.setValueAtTime(v,t+BAR-1.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.8);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=600;lp.Q.value=0.4;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+1);o2.stop(t+BAR+1);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{if(!f)return;const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='sine';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.02,mt+0.4);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.9);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT);nodes.push(o)});
          if(ci%2===0){const dt=t+BEAT*2;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(65,dt);o.frequency.exponentialRampToValueAtTime(30,dt+0.08);const g=actx.createGain();g.gain.setValueAtTime(0.05,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.5);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.55);nodes.push(o)}
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.06,t+0.8);bg.gain.setValueAtTime(0.06,t+BAR-1);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2500);
      };
    },
    midnightprotocol(actx,master,conv,nodes){
      /* Midnight Protocol — Eb minor, 108 BPM, dark synth-pop, descending bass, 80s darkwave */
      const BPM=108,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[311.13,369.99,466.16],[246.94,311.13,369.99],[207.65,261.63,311.13],[233.08,277.18,349.23]];
      const bass=[155.56,123.47,103.83,116.54];
      const arp=[[622.25,466.16,622.25,739.99,622.25,466.16,622.25,739.99],[493.88,369.99,493.88,622.25,493.88,369.99,493.88,622.25],[415.3,311.13,415.3,523.25,415.3,311.13,415.3,523.25],[466.16,349.23,466.16,587.33,466.16,349.23,466.16,587.33]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-10,8,-5][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*0.996;const g=actx.createGain();const v=0.016-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.6);g.gain.setValueAtTime(v,t+BAR-0.4);g.gain.linearRampToValueAtTime(0,t+BAR+0.2);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=1;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.3);o2.stop(t+BAR+0.3);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.02,at+0.005);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.35);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(1800,at);lp.frequency.exponentialRampToValueAtTime(800,at+BEAT*0.4);lp.Q.value=2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,2].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(120,dt);o.frequency.exponentialRampToValueAtTime(38,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(0.1,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.25);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.3);nodes.push(o)});
          [1,3].forEach(b=>{const dt=t+b*BEAT;const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.025),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.03,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.025);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2800;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)});
          const bo=actx.createOscillator();bo.type='sawtooth';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.09,t+0.05);bg.gain.setValueAtTime(0.09,t+BAR-0.1);bg.gain.linearRampToValueAtTime(0,t+BAR);const blp=actx.createBiquadFilter();blp.type='lowpass';blp.frequency.value=280;bo.connect(bg);bg.connect(blp);blp.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    neondevot(actx,master,conv,nodes){
      /* Neon Devotion — F# minor, 100 BPM, 80s synth-pop, lush pads, soaring melody */
      const BPM=100,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[369.99,440,554.37],[293.66,369.99,440],[220,277.18,329.63],[329.63,415.3,493.88]];
      const bass=[92.5,73.42,110,82.41];
      const mel=[[739.99,880,1046.5,880,739.99,659.25,739.99,880],[587.33,739.99,880,739.99,587.33,493.88,587.33,739.99],[440,554.37,659.25,554.37,440,369.99,440,554.37],[659.25,783.99,987.77,783.99,659.25,554.37,659.25,783.99]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-7,7,-4][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.004;const g=actx.createGain();const v=0.018-ni*0.004;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.8);g.gain.setValueAtTime(v,t+BAR-0.5);g.gain.linearRampToValueAtTime(0,t+BAR+0.3);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;lp.Q.value=0.7;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.4);o2.stop(t+BAR+0.4);nodes.push(o,o2)});
          mel[c].forEach((f,ni)=>{const mt=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='triangle';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,mt);g.gain.linearRampToValueAtTime(0.022,mt+0.02);g.gain.setValueAtTime(0.022,mt+BEAT*0.25);g.gain.exponentialRampToValueAtTime(0.002,mt+BEAT*0.45);o.connect(g);g.connect(master);g.connect(conv);o.start(mt);o.stop(mt+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;if(b%2===0){const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(110,dt);o.frequency.exponentialRampToValueAtTime(38,dt+0.05);const g=actx.createGain();g.gain.setValueAtTime(0.09,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.2);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.25);nodes.push(o)}else{const nb=actx.createBufferSource();const nBuf=actx.createBuffer(1,Math.floor(actx.sampleRate*0.02),actx.sampleRate);const nd=nBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;nb.buffer=nBuf;const ng=actx.createGain();ng.gain.setValueAtTime(0.025,dt);ng.gain.exponentialRampToValueAtTime(0.001,dt+0.02);const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2500;nb.connect(ng);ng.connect(hp);hp.connect(master);nb.start(dt);nodes.push(nb)}});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.08,t+0.15);bg.gain.setValueAtTime(0.08,t+BAR-0.2);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    },
    strobecity(actx,master,conv,nodes){
      /* Strobe City — E minor, 128 BPM, dance/EDM, uplifting, bright synths, side-chain feel */
      const BPM=128,BEAT=60/BPM,BAR=BEAT*4;
      const chords=[[329.63,392,493.88],[261.63,329.63,392],[196,246.94,293.66],[293.66,349.23,440]];
      const bass=[82.41,65.41,98,73.42];
      const arp=[[659.25,493.88,659.25,783.99,987.77,783.99,659.25,987.77],[523.25,392,523.25,659.25,783.99,659.25,523.25,783.99],[392,293.66,392,493.88,587.33,493.88,392,587.33],[587.33,440,587.33,698.46,880,698.46,587.33,880]];
      let ci=0,nt=0;
      return function _s(){
        if(!nt||nt<actx.currentTime)nt=actx.currentTime+0.1;
        while(nt<actx.currentTime+BAR*2){
          const c=ci%4,t=nt;
          chords[c].forEach((f,ni)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=[-8,9,-5][ni];const o2=actx.createOscillator();o2.type='sawtooth';o2.frequency.value=f*1.005;const g=actx.createGain();[0,1,2,3].forEach(b=>{const bt=t+b*BEAT;const v=0.015-ni*0.003;g.gain.setValueAtTime(0.001,bt);g.gain.linearRampToValueAtTime(v,bt+BEAT*0.3);g.gain.setValueAtTime(v,bt+BEAT*0.8);g.gain.linearRampToValueAtTime(0.001,bt+BEAT)});const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;lp.Q.value=0.8;o.connect(g);o2.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(t);o2.start(t);o.stop(t+BAR+0.1);o2.stop(t+BAR+0.1);nodes.push(o,o2)});
          arp[c].forEach((f,ni)=>{const at=t+ni*BEAT*0.5;const o=actx.createOscillator();o.type='square';o.frequency.value=f;const g=actx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(0.022,at+0.004);g.gain.exponentialRampToValueAtTime(0.002,at+BEAT*0.3);const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;lp.Q.value=1.2;o.connect(g);g.connect(lp);lp.connect(master);lp.connect(conv);o.start(at);o.stop(at+BEAT*0.5);nodes.push(o)});
          [0,1,2,3].forEach(b=>{const dt=t+b*BEAT;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(135,dt);o.frequency.exponentialRampToValueAtTime(40,dt+0.04);const g=actx.createGain();g.gain.setValueAtTime(0.12,dt);g.gain.exponentialRampToValueAtTime(0.002,dt+0.16);o.connect(g);g.connect(master);o.start(dt);o.stop(dt+0.2);nodes.push(o)});
          const bo=actx.createOscillator();bo.type='sine';bo.frequency.value=bass[c];const bg=actx.createGain();bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(0.1,t+0.04);bg.gain.setValueAtTime(0.1,t+BAR-0.08);bg.gain.linearRampToValueAtTime(0,t+BAR);bo.connect(bg);bg.connect(master);bo.start(t);bo.stop(t+BAR+0.1);nodes.push(bo);
          ci++;nt+=BAR;
        }_schedTimer=setTimeout(window._ambSched,2000);
      };
    }
  };
  function _buildSched(soundId){
    _nodes.forEach(n=>{try{n.stop(0)}catch(e){}});_nodes.length=0;
    window._ambSched=_SOUNDS[soundId](_actx,_masterGain,_conv,_nodes);
  }
  function _initAudio(){
    _actx=new(window.AudioContext||window.webkitAudioContext)();
    _masterGain=_actx.createGain();
    _masterGain.gain.value=parseFloat(volSlider?volSlider.value:0.3);
    _masterGain.connect(_actx.destination);
    const rLen=Math.floor(_actx.sampleRate*2.8);
    const rBuf=_actx.createBuffer(2,rLen,_actx.sampleRate);
    for(let c=0;c<2;c++){const d=rBuf.getChannelData(c);for(let i=0;i<rLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/rLen,2.2)}
    _conv=_actx.createConvolver();_conv.buffer=rBuf;
    const wet=_actx.createGain();wet.gain.value=0.32;
    _conv.connect(wet);wet.connect(_masterGain);
    _buildSched(_currentSound);
    /* Do NOT call _sched() here — called after resume() resolves in _toggle */
  }
  function _switchSound(soundId){
    _currentSound=soundId;
    clearTimeout(_schedTimer);
    if(_actx)_buildSched(soundId);
    if(_playing){_actx.resume().then(()=>{if(_playing){clearTimeout(_schedTimer);window._ambSched&&window._ambSched()}})}
    if(loggedIn)setUserPref('ambSound',soundId);
    if(soundList)soundList.querySelectorAll('.amb-sound-opt').forEach(b=>b.classList.toggle('active',b.dataset.sound===soundId));
  }
  function _toggle(silent){
    if(!_actx)_initAudio();
    if(_playing){_actx.suspend();btn.classList.remove('amb-playing');clearTimeout(_schedTimer);
      if(!silent&&loggedIn)setUserPref('soundOff',true)}
    else{_playing=true;_actx.resume().then(()=>{if(_playing){clearTimeout(_schedTimer);window._ambSched&&window._ambSched()}});
      btn.classList.add('amb-playing');
      if(!silent&&loggedIn){setUserPref('soundOff',false);setUserPref('ambSound',_currentSound)}return}
    _playing=!_playing;
  }
  window._ambientToggle=_toggle;
  window._ambientStop=()=>{
    clearTimeout(_schedTimer);
    _nodes.forEach(n=>{try{n.stop(0)}catch(e){}});_nodes.length=0;
    if(_actx)_actx.suspend();
    btn.classList.remove('amb-playing');
    _playing=false;
  };
  window._ambientSetSound=(id)=>{_currentSound=id;if(_actx)_switchSound(id);if(soundList)soundList.querySelectorAll('.amb-sound-opt').forEach(b=>b.classList.toggle('active',b.dataset.sound===id))};
  window._ambientStartOnGesture=()=>{
    if(_playing)return;
    const _start=()=>{if(!_playing&&loggedIn)_toggle(true)};
    document.addEventListener('click',_start,{once:true,capture:true});
    document.addEventListener('touchstart',_start,{once:true,capture:true});
    document.addEventListener('keydown',_start,{once:true,capture:true});
  };
  btn.onclick=e=>{if(!e.target.closest('.amb-vol-wrap'))_toggle()};
  btn.addEventListener('contextmenu',e=>{e.preventDefault();volWrap.classList.toggle('open')});
  if(soundList){soundList.addEventListener('click',e=>{const opt=e.target.closest('.amb-sound-opt');if(!opt)return;e.stopPropagation();_switchSound(opt.dataset.sound)})}
  if(volSlider){volSlider.oninput=()=>{if(_masterGain)_masterGain.gain.value=parseFloat(volSlider.value)}}
  const _bwrap=document.getElementById('ambientBtnWrap');
  document.addEventListener('click',e=>{if(_bwrap&&!_bwrap.contains(e.target)&&volWrap)volWrap.classList.remove('open')});
  /* Initialize sound list for default theme */
  _populateSoundList();
})();

/* ── Dynamic Accent Trail ── */
if(!IS_MOBILE_LITE&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  let _trailThrottle=0;
  window.addEventListener('mousemove',e=>{
    const now=Date.now();if(now-_trailThrottle<40)return;_trailThrottle=now;
    const dot=document.createElement('div');dot.className='cursor-trail';
    const size=3+Math.random()*3;
    dot.style.cssText='width:'+size+'px;height:'+size+'px;left:'+e.clientX+'px;top:'+e.clientY+'px';
    document.body.appendChild(dot);
    setTimeout(()=>dot.remove(),500);
  },{passive:true});
}

/* ── Card Hover Slideshow ── */
function addCardSlideshow(el,g){
  if(IS_MOBILE_LITE)return;
  if(!g.photos||g.photos.length<2)return;
  const imgWrap=el.querySelector('.card-img');if(!imgWrap)return;
  const photos=g.photos;const len=photos.length;
  let idx=0,timer=null;
  const dots=document.createElement('div');dots.className='card-slide-dots';
  for(let i=0;i<len;i++){const d=document.createElement('span');d.className='card-slide-dot'+(i===0?' active':'');dots.appendChild(d)}
  imgWrap.appendChild(dots);
  const thumb=imgWrap.querySelector('img.card-thumb');if(!thumb)return;
  function show(i){
    idx=i;thumb.src=photos[idx];thumb.classList.add('lazy-loaded');
    dots.querySelectorAll('.card-slide-dot').forEach((d,di)=>d.classList.toggle('active',di===idx));
  }
  el.addEventListener('mouseenter',()=>{
    if(el.classList.contains('card-flipped'))return;
    idx=0;show(0);
    timer=setInterval(()=>{show((idx+1)%len)},1500);
  });
  el.addEventListener('mouseleave',()=>{
    clearInterval(timer);timer=null;
    show(0);
  });
}

/* ── Card Flip Preview ── */
function addCardFlip(card,g){
  const flipBtn=document.createElement('button');
  flipBtn.className='card-flip-btn';flipBtn.innerHTML='&#x2139;';flipBtn.title='Quick info';
  flipBtn.onclick=e=>{e.stopPropagation();card.classList.toggle('card-flipped')};
  const imgWrap=card.querySelector('.card-img');
  if(imgWrap)imgWrap.appendChild(flipBtn);
  const back=document.createElement('div');back.className='card-back';
  const entry=getCalEntry(g.name,fmtDate(getAEDTDate()));
  const liveNow=g.name&&isAvailableNow(g.name);
  const availText=liveNow?t('avail.now'):(entry&&entry.start?fmtTime12(entry.start)+' - '+fmtTime12(entry.end):'—');
  back.innerHTML='<div class="card-back-name">'+(g.name||'')+'</div>'
    +'<div class="card-back-row"><span>'+t('field.age')+'</span><span>'+(g.age||'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+t('field.body')+'</span><span>'+(g.body||'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+t('field.height')+'</span><span>'+(g.height?g.height+' cm':'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+t('field.cup')+'</span><span>'+(g.cup||'—')+'</span></div>'
    +'<div class="card-back-divider"></div>'
    +'<div class="card-back-row"><span>'+t('field.rates30')+'</span><span>'+(g.val1||'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+t('field.rates45')+'</span><span>'+(g.val2||'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+t('field.rates60')+'</span><span>'+(g.val3||'—')+'</span></div>'
    +'<div class="card-back-divider"></div>'
    +'<div class="card-back-row"><span>'+t('field.experience')+'</span><span>'+(g.exp||'—')+'</span></div>'
    +'<div class="card-back-row"><span>'+(liveNow?'🟢':'📅')+' '+t('avail.schedule')+'</span><span>'+availText+'</span></div>'
    +'<div class="card-back-cta">'+t('ui.viewProfile')+' →</div>';
  card.appendChild(back);
}

/* ── Seasonal / Event Themes ── */
const SEASONAL_THEMES=[
  {id:'valentine',cls:'theme-valentine',match:(m,d)=>m===1&&d>=1&&d<=14,accent:'#ff4488',accent2:'#ff6fa8',icon:'\u2764\uFE0F',greetingKey:'season.valentine'},
  {id:'sakura',cls:'theme-sakura',match:(m,d)=>(m===1&&d>=15)||(m===2&&d<=15),accent:'#f4a0b5',accent2:'#d4738a',icon:'\uD83C\uDF38',greetingKey:'season.sakura'},
  {id:'christmas',cls:'theme-christmas',match:(m,d)=>m===11&&d>=1&&d<=25,accent:'#cc1111',accent2:'#00aa44',icon:'\uD83C\uDF84',greetingKey:'season.christmas'},
  {id:'newyear',cls:'theme-newyear',match:(m,d)=>(m===11&&d>=26)||(m===0&&d<=7),accent:'#ffd700',accent2:'#ff6f00',icon:'\uD83C\uDF86',greetingKey:'season.newyear'},
  {id:'lunarnewyear',cls:'theme-lunarnewyear',match:(m,d)=>m===0&&d>=8&&d<=31,accent:'#cc0000',accent2:'#ffd700',icon:'\uD83E\uDDE7',greetingKey:'season.lunarnewyear'},
  {id:'autumn',cls:'theme-autumn',match:(m,d)=>(m===2&&d>=16)||m===3||m===4,accent:'#ff8f00',accent2:'#880e4f',icon:'\uD83C\uDF42',greetingKey:'season.autumn'},
  {id:'summer',cls:'theme-summer',match:(m,d)=>m===5||m===6||m===7,accent:'#00bcd4',accent2:'#ff6f61',icon:'\uD83C\uDFD6\uFE0F',greetingKey:'season.summer'},
  {id:'halloween',cls:'theme-halloween',match:(m,d)=>m===9,accent:'#ff6f00',accent2:'#39ff14',icon:'\uD83C\uDF83',greetingKey:'season.halloween'}
];
let _activeSeason=null;
function detectSeasonalTheme(){const d=getAEDTDate();const m=d.getMonth(),day=d.getDate();return SEASONAL_THEMES.find(th=>th.match(m,day))||null}
function applySeasonalTheme(){
  /* Remove all user color themes and seasonal themes first */
  COLOR_THEMES.forEach(th=>{if(th.cls)document.body.classList.remove(th.cls)});
  SEASONAL_THEMES.forEach(th=>document.body.classList.remove(th.cls));
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent2');
  _updateThemeActive('default');
  _activeSeason=detectSeasonalTheme();
  if(!_activeSeason)return;
  document.body.classList.add(_activeSeason.cls);
  document.documentElement.style.setProperty('--accent',_activeSeason.accent);
  document.documentElement.style.setProperty('--accent2',_activeSeason.accent2);
  particlesEl.querySelectorAll('.particle').forEach(p=>{p.style.background=Math.random()>0.5?_activeSeason.accent:_activeSeason.accent2});
  particlesEl.querySelectorAll('.bokeh-orb').forEach(o=>{o.style.background=Math.random()>0.5?_activeSeason.accent:_activeSeason.accent2});
}
function getSeasonalBanner(){if(!_activeSeason)return '';return `<div class="seasonal-banner"><span class="seasonal-icon">${_activeSeason.icon}</span> ${t(_activeSeason.greetingKey)}</div>`}

/* ── Time-of-Day Adaptive ── */
function applyTimeOfDay(){
  const h=getAEDTDate().getHours();
  document.body.classList.remove('tod-dusk','tod-latenight');
  if(h>=18&&h<21)document.body.classList.add('tod-dusk');
  else if(h>=2&&h<6)document.body.classList.add('tod-latenight');
}
applyTimeOfDay();
setInterval(applyTimeOfDay,900000);

/* ── User Color Themes ── */
const COLOR_THEMES=[
  {id:'default',cls:'',accent:null,accent2:null},
  {id:'amber',cls:'theme-amber',accent:'#ff8f00',accent2:'#d4a373'},
  {id:'arctic',cls:'theme-arctic',accent:'#80deea',accent2:'#e0f7fa'},
  {id:'bronze',cls:'theme-bronze',accent:'#cd7f32',accent2:'#5d4037'},
  {id:'amber',cls:'theme-amber',accent:'#ff8f00',accent2:'#d4a373'},
  {id:'arctic',cls:'theme-arctic',accent:'#80deea',accent2:'#e0f7fa'},
  {id:'bronze',cls:'theme-bronze',accent:'#cd7f32',accent2:'#5d4037'},
  {id:'cobalt',cls:'theme-cobalt',accent:'#1e90ff',accent2:'#5bc0be'},
  {id:'crimson',cls:'theme-crimson',accent:'#e63946',accent2:'#d4a373'},
  {id:'emerald',cls:'theme-emerald',accent:'#00e676',accent2:'#c0c0c0'},
  {id:'ivory',cls:'theme-ivory',accent:'#d4af37',accent2:'#f5f0e1'},
  {id:'lavender',cls:'theme-lavender',accent:'#b388ff',accent2:'#e1bee7'},
  {id:'midnight',cls:'theme-midnight',accent:'#b44aff',accent2:'#c9952c'},
  {id:'neon',cls:'theme-neon',accent:'#00d4ff',accent2:'#ff2d7b'},
  {id:'ocean',cls:'theme-ocean',accent:'#0097a7',accent2:'#26c6da'},
  {id:'onyx',cls:'theme-onyx',accent:'#e0e0e0',accent2:'#757575'},
  {id:'phantom',cls:'theme-phantom',accent:'#78909c',accent2:'#4db6ac'},
  {id:'rosegold',cls:'theme-rosegold',accent:'#e8a0bf',accent2:'#c9956b'},
  {id:'rust',cls:'theme-rust',accent:'#bf360c',accent2:'#8d6e63'},
  {id:'sakura2',cls:'theme-sakura2',accent:'#f48fb1',accent2:'#fce4ec'},
  {id:'slate',cls:'theme-slate',accent:'#90a4ae',accent2:'#546e7a'},
  {id:'sunset',cls:'theme-sunset',accent:'#ff6d00',accent2:'#ff1744'},
  {id:'violet',cls:'theme-violet',accent:'#9c27b0',accent2:'#e040fb'}
];
const _themeBtn=document.getElementById('themeBtn');
const _themeDropdown=document.getElementById('themeDropdown');

function applyColorTheme(themeId){
  COLOR_THEMES.forEach(th=>{if(th.cls)document.body.classList.remove(th.cls)});
  SEASONAL_THEMES.forEach(th=>document.body.classList.remove(th.cls));
  if(themeId==='default'){
    if(loggedIn)setUserPref('theme',null);
    applySeasonalTheme();
    _updateThemeActive('default');
    return;
  }
  const theme=COLOR_THEMES.find(t=>t.id===themeId);
  if(!theme)return;
  document.body.classList.add(theme.cls);
  document.documentElement.style.setProperty('--accent',theme.accent);
  document.documentElement.style.setProperty('--accent2',theme.accent2);
  particlesEl.querySelectorAll('.particle').forEach(p=>{p.style.background=Math.random()>0.5?theme.accent:theme.accent2});
  particlesEl.querySelectorAll('.bokeh-orb').forEach(o=>{o.style.background=Math.random()>0.5?theme.accent:theme.accent2});
  if(loggedIn)setUserPref('theme',themeId);
  _updateThemeActive(themeId);
}
function _updateThemeActive(id){
  _themeDropdown.querySelectorAll('.theme-option').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.theme===id);
  });
}

/* Theme dropdown wiring */
_themeBtn.addEventListener('click',function(e){
  e.stopPropagation();
  const o=_themeDropdown.classList.toggle('open');
  _themeBtn.setAttribute('aria-expanded',String(o));
});
_themeDropdown.querySelectorAll('.theme-option').forEach(function(btn){
  btn.addEventListener('click',function(){
    applyColorTheme(btn.dataset.theme);
    _themeDropdown.classList.remove('open');
    _themeBtn.setAttribute('aria-expanded','false');
  });
});
document.addEventListener('click',function(e){
  if(!_themeDropdown.contains(e.target)&&e.target!==_themeBtn){
    _themeDropdown.classList.remove('open');
    _themeBtn.setAttribute('aria-expanded','false');
  }
});

/* Apply seasonal theme by default; user theme restored on login */
applySeasonalTheme();

/* Filter Panel Toggle */
let _activeFilterPaneId='sharedFilterPane';
const _filterToggle=document.getElementById('filterToggle');
const _filterBackdrop=document.getElementById('filterBackdrop');

function updateFilterToggle(){
_filterToggle.classList.add('visible');
const cnt=countActiveFilters();
_filterToggle.classList.toggle('has-filters',cnt>0);
const ftText=_filterToggle.querySelector('.ft-text');
if(ftText)ftText.textContent=cnt>0?t('ui.filtersActive').replace('{n}',cnt):t('ui.filters');
}

function openFilterPanel(){
const pane=document.getElementById('sharedFilterPane');if(!pane)return;
renderFilterPane('sharedFilterPane');
pane.classList.add('open');
_filterToggle.classList.add('open');
_filterBackdrop.classList.add('open');
_filterToggle.setAttribute('aria-expanded','true');
}

function closeFilterPanel(){
const pane=document.getElementById('sharedFilterPane');if(pane)pane.classList.remove('open');
_filterToggle.classList.remove('open');
_filterBackdrop.classList.remove('open');
_filterToggle.setAttribute('aria-expanded','false');
}

function toggleFilterPanel(){
const isOpen=_filterToggle.classList.contains('open');
if(isOpen)closeFilterPanel();else openFilterPanel();
}

_filterToggle.onclick=toggleFilterPanel;
_filterBackdrop.onclick=closeFilterPanel;

/* Back to Top */
(function(){const btn=document.getElementById('backToTop');if(!btn)return;const targetPages=['rosterPage','listPage','favoritesPage','calendarPage'];
window.addEventListener('scroll',()=>{const active=targetPages.some(id=>{const el=document.getElementById(id);return el&&el.classList.contains('active')});if(active&&window.scrollY>300)btn.classList.add('visible');else btn.classList.remove('visible')});
btn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'})})();

/* ── FAB (Floating Contact Buttons) ── */
(function(){const toggle=document.getElementById('fabToggle'),menu=document.getElementById('fabMenu');if(!toggle||!menu)return;toggle.onclick=()=>{const o=toggle.classList.toggle('open');menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(o))};document.addEventListener('click',e=>{if(!e.target.closest('.fab-container')){toggle.classList.remove('open');menu.classList.remove('open');toggle.setAttribute('aria-expanded','false')}})})();

/* ── Focus Trap for Modal Overlays ── */
document.addEventListener('keydown',function(e){
if(e.key!=='Tab')return;
var openModal=document.querySelector('.modal-overlay.open,.lightbox-overlay.open');
if(!openModal)return;
var focusable=openModal.querySelectorAll('button:not([disabled]):not([style*="display:none"]):not([style*="display: none"]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
if(!focusable.length)return;
var first=focusable[0],last=focusable[focusable.length-1];
if(e.shiftKey){if(document.activeElement===first||!openModal.contains(document.activeElement)){e.preventDefault();last.focus()}}
else{if(document.activeElement===last||!openModal.contains(document.activeElement)){e.preventDefault();first.focus()}}
});

/* ── Keyboard Shortcuts ── */
let _kbFocusedCardIdx=-1;
function _kbIsTyping(){const el=document.activeElement;if(!el)return false;const tag=el.tagName;return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||el.isContentEditable}
function _kbIsModalOpen(){return!!document.querySelector('.modal-overlay.open,.lightbox-overlay.open,.copy-time-modal.open,.copy-day-modal.open,.bulk-time-modal.open')}
function _kbGetActivePage(){return['homePage','rosterPage','listPage','favoritesPage','valuePage','employmentPage','profilePage'].find(id=>{const el=document.getElementById(id);return el&&el.classList.contains('active')})||null}
function _kbGetVisibleCards(){const page=_kbGetActivePage();const gridMap={listPage:'girlsGrid',rosterPage:'rosterGrid',favoritesPage:'favoritesGrid'};const gridId=gridMap[page];if(!gridId)return[];return Array.from(document.getElementById(gridId)?.querySelectorAll('.girl-card')||[])}
function _kbFocusCard(idx){const cards=_kbGetVisibleCards();if(!cards.length)return;_kbFocusedCardIdx=Math.max(0,Math.min(idx,cards.length-1));cards.forEach((c,i)=>c.classList.toggle('kb-focused',i===_kbFocusedCardIdx));cards[_kbFocusedCardIdx].scrollIntoView({block:'nearest',behavior:'smooth'})}
function _kbOpenHelp(){let ov=document.getElementById('kbHelpOverlay');if(!ov){ov=document.createElement('div');ov.id='kbHelpOverlay';ov.className='modal-overlay kb-help-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','kbHelpTitle');document.body.appendChild(ov)}
ov.innerHTML=`<div class="form-modal" style="max-width:480px"><button class="modal-close" id="kbHelpClose" aria-label="Close">&times;</button><div class="form-title" id="kbHelpTitle">${t('kb.title')}</div><div class="kb-help-grid"><div class="kb-row"><kbd>j</kbd> <kbd>k</kbd><span>${t('kb.navCards')}</span></div><div class="kb-row"><kbd>Enter</kbd><span>${t('kb.openProfile')}</span></div><div class="kb-row"><kbd>f</kbd><span>${t('kb.favorite')}</span></div><div class="kb-row"><kbd>c</kbd><span>${t('kb.compare')}</span></div><div class="kb-row"><kbd>/</kbd><span>${t('kb.search')}</span></div><div class="kb-row"><kbd>Esc</kbd><span>${t('kb.back')}</span></div><div class="kb-row"><kbd>?</kbd><span>${t('kb.help')}</span></div></div></div>`;
ov.classList.add('open');ov.querySelector('#kbHelpClose').onclick=()=>ov.classList.remove('open');ov.onclick=e=>{if(e.target===ov)ov.classList.remove('open')}}

document.addEventListener('keydown',function(e){
if(_kbIsTyping())return;
const helpOv=document.getElementById('kbHelpOverlay');
if(helpOv&&helpOv.classList.contains('open')){if(e.key==='Escape'||e.key==='?'){helpOv.classList.remove('open');e.preventDefault()}return}
if(_kbIsModalOpen())return;
const page=_kbGetActivePage();
switch(e.key){
case '?':e.preventDefault();_kbOpenHelp();break;
case '/':e.preventDefault();{const inp=document.querySelector('#filterBar .inline-search-input,#rosterFilterBar .inline-search-input,#homeSearchInput');if(inp)inp.focus()}break;
case 'Escape':if(page==='profilePage'){const btn=document.getElementById('backBtn');if(btn)btn.click()}break;
case 'j':if(['listPage','rosterPage','favoritesPage'].includes(page)){e.preventDefault();_kbFocusCard(_kbFocusedCardIdx+1)}break;
case 'k':if(['listPage','rosterPage','favoritesPage'].includes(page)){e.preventDefault();_kbFocusCard(_kbFocusedCardIdx-1)}break;
case 'Enter':if(_kbFocusedCardIdx>=0){const cards=_kbGetVisibleCards();if(cards[_kbFocusedCardIdx])cards[_kbFocusedCardIdx].click()}break;
case 'f':if(page==='profilePage'){const btn=document.getElementById('profFavBtn');if(btn)btn.click()}else if(_kbFocusedCardIdx>=0){const cards=_kbGetVisibleCards();const btn=cards[_kbFocusedCardIdx]?.querySelector('.card-fav');if(btn)btn.click()}break;
case 'c':if(_kbFocusedCardIdx>=0){const cards=_kbGetVisibleCards();const btn=cards[_kbFocusedCardIdx]?.querySelector('.card-compare');if(btn)btn.click()}break;
}});

