/* === FORMS STUBS, UTILITIES & INIT === */

/* Admin form/delete stubs — real implementations loaded via admin.js */
function openForm(idx){loadAdminModule().then(function(){openForm(idx)}).catch(function(){showToast('Failed to load admin module','error')})}
function openDelete(idx){loadAdminModule().then(function(){openDelete(idx)}).catch(function(){showToast('Failed to load admin module','error')})}

function sanitize(s){return(s||'').replace(/<[^>]+>/g,'').trim()}

/* Init */
function removeSkeletons(){const ids=['homeSkeleton','rosterSkeleton','girlsSkeleton','calSkeleton','rosterFilterSkeleton','girlsFilterSkeleton','favoritesSkeleton','valueTableSkeleton'];ids.forEach(id=>{const el=document.getElementById(id);if(el){el.classList.add('fade-out');setTimeout(()=>el.remove(),400)}})}

/* === Enquiry Form === */
let _eqDuration=45;
let _eqGirlName='';
let _eqLastSubmit=0;
const EQ_THROTTLE=30000;

function openEnquiryForm(girlName,girlIdx){
  if(loggedIn){openBookingEnquiry(girlIdx);return}
  _eqGirlName=girlName;
  const overlay=document.getElementById('enquiryOverlay');
  document.getElementById('enquiryGirlName').textContent=girlName;
  const _cf=document.getElementById('eqContactFields');
  if(loggedIn&&loggedInUser){document.getElementById('eqName').value=loggedInUser;document.getElementById('eqEmail').value=loggedInEmail||'';document.getElementById('eqPhone').value=loggedInMobile||'';if(_cf)_cf.style.display='none'}
  else{document.getElementById('eqName').value='';document.getElementById('eqEmail').value='';document.getElementById('eqPhone').value='';if(_cf)_cf.style.display=''}
  const today=fmtDate(getAEDTDate());
  document.getElementById('eqDate').value='';document.getElementById('eqTime').value='';
  document.getElementById('eqMessage').value='';document.getElementById('eqError').textContent='';document.getElementById('eqWebsite').value='';
  _eqDuration=60;document.querySelectorAll('.enquiry-dur-btn').forEach(btn=>{btn.classList.toggle('active',parseInt(btn.dataset.dur)===_eqDuration)});
  document.getElementById('eqDate').min=today;
  overlay.classList.add('open');applyLang()
}

document.getElementById('eqDurationOptions').onclick=e=>{const btn=e.target.closest('.enquiry-dur-btn');if(!btn)return;_eqDuration=parseInt(btn.dataset.dur);document.querySelectorAll('.enquiry-dur-btn').forEach(b=>{b.classList.toggle('active',parseInt(b.dataset.dur)===_eqDuration)})};
document.getElementById('enquiryClose').onclick=()=>document.getElementById('enquiryOverlay').classList.remove('open');
document.getElementById('enquiryCancel').onclick=()=>document.getElementById('enquiryOverlay').classList.remove('open');
document.getElementById('enquiryOverlay').onclick=e=>{if(e.target===document.getElementById('enquiryOverlay'))e.target.classList.remove('open')};

document.getElementById('enquirySubmit').onclick=async()=>{
  const errEl=document.getElementById('eqError');errEl.textContent='';
  if(document.getElementById('eqWebsite').value)return;
  if(Date.now()-_eqLastSubmit<EQ_THROTTLE){errEl.textContent=t('enquiry.throttle');return}
  const name=sanitize(document.getElementById('eqName').value);
  const phone=document.getElementById('eqPhone').value.trim();
  const email=document.getElementById('eqEmail').value.trim();
  const date=document.getElementById('eqDate').value;
  const time=document.getElementById('eqTime').value;
  const message=sanitize(document.getElementById('eqMessage').value);
  if(!loggedIn&&!name){document.getElementById('eqName').focus();errEl.textContent=t('enquiry.nameRequired');return}
  if(!loggedIn&&!phone&&!email){errEl.textContent=t('enquiry.contactRequired');return}
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errEl.textContent=t('enquiry.emailInvalid');return}
  if(!date){document.getElementById('eqDate').focus();errEl.textContent=t('enquiry.dateRequired');return}
  if(!time){document.getElementById('eqTime').focus();errEl.textContent=t('enquiry.timeRequired');return}
  const submitBtn=document.getElementById('enquirySubmit');submitBtn.textContent=t('enquiry.sending');submitBtn.style.pointerEvents='none';
  try{
    const payload={girlName:_eqGirlName,customerName:name,phone,email,date,time,duration:_eqDuration,message,lang:siteLanguage,ts:new Date().toISOString(),username:loggedInUser||null};
    const r=await fetchWithRetry(PROXY+'/submit-enquiry',{method:'POST',headers:proxyHeaders(),body:JSON.stringify(payload)},{retries:1});
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Server error')}
    _eqLastSubmit=Date.now();document.getElementById('enquiryOverlay').classList.remove('open');showToast(t('enquiry.success'))
  }catch(e){errEl.textContent=t('enquiry.failed')}
  finally{submitBtn.textContent=t('enquiry.submit');submitBtn.style.pointerEvents='auto'}
};

/* === Booking Enquiry (Timeline Selection Popup) === */
let _bkEnqIdx=-1;
let _bkEnqSel=null;   /* {date,startMin,endMin} - set after start+duration chosen */
let _bkEnqStart=null; /* {date,startMin} - set after clicking a start slot */
let _bkEnqSubmitting=false;

function hasActiveFutureBooking(){
  if(!Array.isArray(calData._bookings))return false;
  const today=new Date().toISOString().slice(0,10);
  const now=nowAbsMin();
  return calData._bookings.some(b=>
    b.user===loggedInUser&&
    (b.status==='pending'||b.status==='approved')&&
    (b.date>today||(b.date===today&&b.endMin>now))
  );
}
function openBookingEnquiry(girlIdx){
  if(hasActiveFutureBooking()){showToast('You already have an active booking. Check your profile for status.','error');return}
  _bkEnqIdx=girlIdx;
  _bkEnqSel=null;
  _bkEnqStart=null;
  renderBkEnqGrid();
  showBkEnqScreen(1);
  document.getElementById('bookingEnquiryOverlay').classList.add('open');
}

function closeBkEnq(){
  _bkEnqIdx=-1;_bkEnqSel=null;_bkEnqStart=null;
  document.getElementById('bookingEnquiryOverlay').classList.remove('open');
}

function showBkEnqScreen(n){
  document.getElementById('bkEnqS1').style.display=n===1?'':'none';
  document.getElementById('bkEnqS2').style.display=n===2?'':'none';
  if(n===2)renderBkEnqReview();
}

function renderBkEnqGrid(){
  const g=girls[_bkEnqIdx];if(!g)return;
  /* Set girl header */
  const av=g.photos&&g.photos.length?`<img src="${g.photos[0]}" class="bk-enq-avatar-img" loading="lazy">`:`<span class="cal-letter">${g.name.charAt(0)}</span>`;
  document.getElementById('bkEnqAvatar').innerHTML=av;
  document.getElementById('bkEnqGName').textContent=g.name;
  /* Get published dates where girl has a schedule */
  const dates=getWeekDates().filter(ds=>{const e=getCalEntry(g.name,ds);return e&&e.start&&e.end&&isDatePublished(ds)});
  const slots=getBookingTimeSlots();
  /* Group slots by hour */
  const hourGroups=[];
  slots.forEach(a=>{const hKey=Math.floor(a/60);const last=hourGroups[hourGroups.length-1];if(last&&last.hKey===hKey){last.slots.push(a)}else{hourGroups.push({hKey,slots:[a]})}});
  const hourEndSlots=new Set(hourGroups.map(g=>g.slots[g.slots.length-1]));
  /* Build table */
  let html='<table class="bk-enq-table"><thead><tr><th class="bk-enq-date-col"></th>';
  hourGroups.forEach(({hKey,slots:hs})=>{const h=hKey%24;const label=h===0?'12am':h<12?h+'am':h===12?'12pm':(h-12)+'pm';html+=`<th class="bk-enq-hour-hdr" colspan="${hs.length}">${label}</th>`});
  html+='</tr></thead><tbody>';
  const todayStr=dates[0];
  dates.forEach(ds=>{
    const f=dispDate(ds);
    const labelTxt=ds===todayStr?'TODAY':f.day.toUpperCase()+' '+f.date.toUpperCase();
    const e=getCalEntry(g.name,ds);
    html+=`<tr><td class="bk-enq-date-col">${labelTxt}</td>`;
    slots.forEach(a=>{
      const inShift=e&&slotInRange(a,e.start,e.end);
      const past=inShift&&isSlotPastCutoff(ds,a);
      const booked=inShift&&!past&&isSlotBooked(g.name,ds,a);
      const inSel=_bkEnqSel&&ds===_bkEnqSel.date&&a>=_bkEnqSel.startMin&&a<_bkEnqSel.endMin;
      const isStart=!_bkEnqSel&&_bkEnqStart&&ds===_bkEnqStart.date&&a===_bkEnqStart.startMin;
      const sel=inSel||isStart;
      const end=hourEndSlots.has(a)?' bk-enq-he':'';
      let cls='bk-enq-slot';
      if(!inShift||past)cls+=' bk-enq-out';
      else if(sel)cls+=' bk-enq-sel';
      else if(booked)cls+=' bk-enq-booked';
      else cls+=' bk-enq-avail';
      html+=`<td class="${cls}${end}" data-date="${ds}" data-slot="${a}"></td>`;
    });
    html+='</tr>';
  });
  html+='</tbody></table>';
  if(!dates.length)html='<div class="empty-msg">No published dates with schedule.</div>';
  const wrap=document.getElementById('bkEnqGrid');
  wrap.innerHTML=html;
  document.querySelectorAll('.bk-enq-dur-btn').forEach(b=>{b.disabled=true;b.classList.remove('active')});
  updateBkEnqReviewBtn();
  if(dates.length)bindBkEnqClick(wrap);
}

function nowAbsMin(){
  const now=new Date(),h=now.getHours(),m=now.getMinutes();
  return h<10?(h+24)*60+m:h*60+m;
}

function isSlotPastCutoff(dateStr,slotAbsMin){
  const today=new Date().toISOString().slice(0,10);
  if(dateStr!==today)return false;
  return slotAbsMin<nowAbsMin()+60;
}

function getShiftEndMin(girlName,date){
  const e=getCalEntry(girlName,date);
  if(!e||!e.end||!e.start)return null;
  const[eh,em]=e.end.split(':').map(Number);
  const[sh,sm]=e.start.split(':').map(Number);
  let endAbsMin=eh*60+em;
  if(endAbsMin<=sh*60+sm)endAbsMin+=24*60;
  return endAbsMin;
}

function updateDurationButtons(){
  const g=girls[_bkEnqIdx];
  document.querySelectorAll('.bk-enq-dur-btn').forEach(b=>b.classList.remove('active'));
  if(!_bkEnqStart||!g){
    document.querySelectorAll('.bk-enq-dur-btn').forEach(b=>{b.disabled=true});
    return;
  }
  const{date,startMin}=_bkEnqStart;
  const shiftEnd=getShiftEndMin(g.name,date);
  document.querySelectorAll('.bk-enq-dur-btn').forEach(btn=>{
    const dur=parseInt(btn.dataset.dur);
    const endMin=startMin+dur;
    const fitsShift=shiftEnd===null||endMin<=shiftEnd;
    let hasConflict=false;
    for(let s=startMin+15;s<endMin;s+=15){if(isSlotBooked(g.name,date,s)){hasConflict=true;break}}
    btn.disabled=!fitsShift||hasConflict;
    if(_bkEnqSel&&_bkEnqSel.date===date&&_bkEnqSel.startMin===startMin&&_bkEnqSel.endMin===endMin)btn.classList.add('active');
  });
}

function bindBkEnqClick(wrap){
  wrap.addEventListener('click',e=>{
    const el=e.target;
    if(!el.dataset||!el.dataset.slot)return;
    if(!el.classList.contains('bk-enq-avail')&&!el.classList.contains('bk-enq-sel'))return;
    _bkEnqStart={date:el.dataset.date,startMin:parseInt(el.dataset.slot)};
    _bkEnqSel=null;
    renderBkEnqCells(wrap);
    updateDurationButtons();
    updateBkEnqReviewBtn();
  });
}

function renderBkEnqCells(wrap){
  const g=girls[_bkEnqIdx];if(!g)return;
  wrap.querySelectorAll('[data-slot]').forEach(td=>{
    const a=parseInt(td.dataset.slot),ds=td.dataset.date;
    const e=getCalEntry(g.name,ds);
    const inShift=e&&slotInRange(a,e.start,e.end);
    const past=inShift&&isSlotPastCutoff(ds,a);
    const booked=inShift&&!past&&isSlotBooked(g.name,ds,a);
    const inSel=_bkEnqSel&&ds===_bkEnqSel.date&&a>=_bkEnqSel.startMin&&a<_bkEnqSel.endMin;
    const isStart=!_bkEnqSel&&_bkEnqStart&&ds===_bkEnqStart.date&&a===_bkEnqStart.startMin;
    td.classList.remove('bk-enq-avail','bk-enq-booked','bk-enq-sel','bk-enq-out');
    if(!inShift||past)td.classList.add('bk-enq-out');
    else if(inSel||isStart)td.classList.add('bk-enq-sel');
    else if(booked)td.classList.add('bk-enq-booked');
    else td.classList.add('bk-enq-avail');
  });
}

function updateBkEnqReviewBtn(){
  const btn=document.getElementById('bkEnqReview');
  if(btn)btn.disabled=!_bkEnqSel;
}

function renderBkEnqReview(){
  const g=girls[_bkEnqIdx];if(!g||!_bkEnqSel)return;
  const av=g.photos&&g.photos.length?`<img src="${g.photos[0]}" class="bk-enq-rev-photo" loading="lazy">`:`<div class="bk-enq-rev-photo bk-enq-rev-letter">${g.name.charAt(0)}</div>`;
  document.getElementById('bkEnqProfilePane').innerHTML=`<div class="bk-enq-rev-profile">${av}<div class="bk-enq-rev-name">${g.name}</div></div>`;
  const{date,startMin,endMin}=_bkEnqSel;
  const f=dispDate(date);
  const dur=endMin-startMin;
  const durStr=dur>=60?(dur/60)+'hr'+(dur>60?'s':''):dur+' min';
  document.getElementById('bkEnqDetailsPane').innerHTML=
    `<div class="bk-enq-details">
      <div class="bk-enq-rev-row"><span class="bk-enq-rev-label">Date</span><span>${f.day} ${f.date}</span></div>
      <div class="bk-enq-rev-row"><span class="bk-enq-rev-label">Time</span><span>${fmtSlotTime(startMin)} – ${fmtSlotTime(endMin)}</span></div>
      <div class="bk-enq-rev-row"><span class="bk-enq-rev-label">Duration</span><span>${durStr}</span></div>
    </div>`;
}

async function submitBookingRequest(){
  if(_bkEnqSubmitting||!_bkEnqSel)return;
  if(hasActiveFutureBooking()){showToast('You already have an active booking.','error');closeBkEnq();return}
  _bkEnqSubmitting=true;
  const btn=document.getElementById('bkEnqSubmit');
  btn.textContent='Sending...';btn.style.pointerEvents='none';
  if(!Array.isArray(calData._bookings))calData._bookings=[];
  const booking={
    id:Date.now().toString(36)+Math.random().toString(36).slice(2),
    girlName:girls[_bkEnqIdx].name,
    date:_bkEnqSel.date,
    startMin:_bkEnqSel.startMin,
    endMin:_bkEnqSel.endMin,
    user:loggedInUser,
    status:'pending',
    ts:new Date().toISOString()
  };
  calData._bookings.push(booking);
  const saved=await saveCalData();
  if(saved){
    saveBookingLog({type:'booking_created',bookingId:booking.id,user:booking.user,girlName:booking.girlName,date:booking.date,startMin:booking.startMin,endMin:booking.endMin,status:'pending'});
    closeBkEnq();
    showToast('Booking request sent');
    if(typeof renderBookingsGrid==='function')renderBookingsGrid();
  }else{
    calData._bookings.pop();
    showToast('Failed to save booking','error');
  }
  btn.textContent='Request Booking';btn.style.pointerEvents='auto';
  _bkEnqSubmitting=false;
}

document.getElementById('bkEnqCancel1').onclick=closeBkEnq;
document.getElementById('bkEnqCancel2').onclick=closeBkEnq;
document.getElementById('bkEnqReview').onclick=()=>{if(!_bkEnqSel)return;showBkEnqScreen(2)};
document.getElementById('bkEnqBack').onclick=()=>showBkEnqScreen(1);
document.getElementById('bkEnqSubmit').onclick=submitBookingRequest;
document.getElementById('bookingEnquiryOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('bookingEnquiryOverlay'))closeBkEnq()});
document.querySelectorAll('.bk-enq-dur-btn').forEach(btn=>{
  btn.onclick=()=>{
    if(!_bkEnqStart||btn.disabled)return;
    const dur=parseInt(btn.dataset.dur);
    _bkEnqSel={date:_bkEnqStart.date,startMin:_bkEnqStart.startMin,endMin:_bkEnqStart.startMin+dur};
    document.querySelectorAll('.bk-enq-dur-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderBkEnqCells(document.getElementById('bkEnqGrid'));
    updateBkEnqReviewBtn();
  };
});

function normalizeCalData(cal){if(!cal)return{};for(const n in cal){if(n==='_published'||n==='_bookings')continue;for(const dt in cal[n])if(cal[n][dt]===true)cal[n][dt]={start:'',end:''}}return cal}

function fullRender(){rosterDateFilter=fmtDate(getAEDTDate());renderFilters();renderGrid();renderRoster();renderHome();updateFavBadge()}

/* === Adaptive Polling Engine === */
function getActivePageId(){const ap=document.querySelector('.page.active');return ap?ap.id:null}

function getPollInterval(){
  if(!_isTabVisible)return POLL_SLOW;
  if(IS_MOBILE_LITE){
    const page=getActivePageId();
    if(page==='rosterPage'||page==='profilePage')return POLL_NORMAL;
    return POLL_SLOW;
  }
  const page=getActivePageId();
  if(page==='rosterPage'||page==='profilePage')return POLL_FAST;
  return POLL_NORMAL;
}

function renderActivePage(){
  try{
    const id=getActivePageId();if(!id)return;
    if(id==='rosterPage')renderRoster();
    else if(id==='listPage')renderGrid();
    else if(id==='favoritesPage')renderFavoritesGrid();
    else if(id==='homePage')renderHome();
    else if(id==='profilePage'&&currentProfileIdx>=0)showProfile(currentProfileIdx);
  }catch(e){/* silent */}
}

async function pollTick(){
  const changed=await refreshCalendar();
  if(changed){
    renderActivePage();
    const indicator=document.getElementById('rosterLastUpdated');
    if(indicator){indicator.classList.remove('updated-pulse');void indicator.offsetWidth;indicator.classList.add('updated-pulse')}
  }else{
    renderActivePage();
  }
  updateLastUpdatedDisplay();
}

function startAdaptivePolling(){
  if(_pollInterval)clearInterval(_pollInterval);
  const interval=getPollInterval();
  _pollInterval=setInterval(pollTick,interval);
}

function startCountdownTick(){
  if(_countdownTickInterval)clearInterval(_countdownTickInterval);
  _countdownTickInterval=setInterval(()=>{
    const el=document.getElementById('profCountdown');if(el){
      const g=girls[currentProfileIdx];if(g&&g.name){
        const c=getAvailCountdown(g.name);
        if(c){el.textContent=t(c.type==='ends'?'avail.endsIn':'avail.startsIn').replace('{t}',c.str)}
        else{el.textContent=''}
      }
    }
    /* Update available-now widget countdowns on homepage */
    if(document.getElementById('homePage')&&document.getElementById('homePage').classList.contains('active')){
      document.querySelectorAll('.anw-countdown').forEach(cd=>{const card=cd.closest('.avail-now-card');if(!card)return;const idx=parseInt(card.dataset.idx);const g=girls[idx];if(!g)return;const c=getAvailCountdown(g.name);cd.textContent=c&&c.type==='until_end'?c.display:''})
    }
  },POLL_COUNTDOWN);
}

function updateLastUpdatedDisplay(){
  const el=document.getElementById('rosterLastUpdatedTime');
  if(el&&_lastCalFetchDisplay)el.textContent=_lastCalFetchDisplay;
}

startAdaptivePolling();

/* After data loads, resolve the current URL to show the right page */
function fullRenderAndRoute(){
if(typeof queryToFilters==='function')queryToFilters();
fullRender();
/* If URL is not root, resolve it (e.g. /girls/Akemi, /roster, etc.) */
if(window.location.pathname!=='/'){
Router.resolve();
}else{
/* On home — just set the initial history state */
history.replaceState({path:'/'},'Ginza Empire','/');
}
}

async function initApp(){
try{
await loadConfig();
if(typeof initOfflineDetection==='function')initOfflineDetection();

/* Phase 1: Instant render from cache */
const cachedGirls=getCachedGirls();
const cachedCal=getCachedCal();
let renderedFromCache=false;
let _calWasStale=false;

if(cachedGirls&&cachedGirls.length){
girls=cachedGirls;
/* Skip stale cal: show empty availability rather than mislead returning visitors */
const calFresh=!isCalCacheStale();
calData=(calFresh&&cachedCal)?normalizeCalData(cachedCal):{};
_calWasStale=!calFresh;
/* Render immediately from cache but defer routing until auth is loaded */
if(typeof queryToFilters==='function')queryToFilters();
fullRender();
if(window.location.pathname==='/')history.replaceState({path:'/'},'Ginza Empire','/');
removeSkeletons();
renderedFromCache=true;
}

/* Phase 2: Fetch fresh data in background */
const[authData,freshData,freshCal]=await Promise.all([loadAuth(),loadData(),loadCalData(),loadRosterHistory(),loadVacationData()]);

if(authData&&authData.length)CRED=authData;else{CRED=[];showToast('Could not load auth','error')}

/* Restore session from localStorage now that CRED is loaded */
if(typeof tryRestoreSession==='function')tryRestoreSession();

/* Compare and update girls if changed */
let girlsChanged=false;
if(freshData!==null){
const cachedSha=getCachedGirlsSha();
if(!renderedFromCache||cachedSha!==dataSha){
girls=freshData;
girlsChanged=true;
updateGirlsCache();
}
}else if(!renderedFromCache){
/* No cache AND network failed — show error state with retry */
const msg=typeof t==='function'?t('ui.loadFailed'):'Unable to load data. Please check your connection and try again.';
showErrorState('rosterGrid',msg,initApp);
showErrorState('girlsGrid',msg,initApp);
showErrorState('homeImages',msg,initApp);
removeSkeletons();
return;
}

/* Compare and update calendar if changed */
let calChanged=false;
if(freshCal){
const cachedCalSha=getCachedCalSha();
const normalizedCal=normalizeCalData(freshCal);
/* Also force update if phase 1 used empty calData due to stale cache */
if(!renderedFromCache||cachedCalSha!==calSha||_calWasStale){
calData=normalizedCal;
calChanged=true;
updateCalCache();
}
}

/* Phase 3: Re-render only if data actually changed */
if(!renderedFromCache){
fullRenderAndRoute();
removeSkeletons();
}else if(girlsChanged||calChanged){
fullRender();
if(document.getElementById('profilePage').classList.contains('active'))showProfile(currentProfileIdx);
}

/* Resolve URL route now that auth is loaded (deferred from Phase 1 cache render) */
if(renderedFromCache&&window.location.pathname!=='/')Router.resolve();

/* Apply saved language preference */
if(typeof applyLang==='function'){try{applyLang()}catch(e){}}

}catch(e){
console.error('Init error:',e);
removeSkeletons();
const msg=typeof t==='function'?t('ui.loadFailed'):'Unable to load data. Please check your connection and try again.';
showErrorState('rosterGrid',msg,initApp);
showErrorState('girlsGrid',msg,initApp);
showErrorState('homeImages',msg,initApp);
}
}
initApp();