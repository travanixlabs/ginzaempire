/* === ANALYTICS — GITHUB VISITOR LOGS === */

/*
 * GitHub Visitor Logs: append-only daily JSON files in data/logs/.
 * Each visitor session logs: initial visit info + every page view + every profile view.
 * Captures: anonymous UUID, user-agent, language, timezone, page path, timestamp.
 */

/* ══════════════════════════════════════════════════
   GITHUB VISITOR LOGS (append-only daily JSON files)
   ══════════════════════════════════════════════════ */

const VisitorLog=(function(){

const UUID_KEY='ginza_visitor_uuid';
const OPTOUT_KEY='ginza_analytics_optout';
const LOG_DIR='data/logs';
const LOG_MAX=500; /* max entries per day file; oldest trimmed on overflow */

/* ── In-memory queue of entries to flush to GitHub ── */
let _queue=[];
let _flushTimer=null;
let _flushing=false;
let _flushPromise=null;
const DEBOUNCE_MS=2000; /* flush 2s after last enqueue — batches rapid navigations */

/* Generate or retrieve persistent anonymous UUID */
function getUUID(){
  try{
    let id=localStorage.getItem(UUID_KEY);
    if(!id){
      id='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).substr(2,8);
      localStorage.setItem(UUID_KEY,id);
    }
    return id;
  }catch(e){
    return 'v_anon_'+Math.random().toString(36).substr(2,8);
  }
}

/* Opt-out: user can stop all tracking and clear stored identifiers */
function isOptedOut(){try{return localStorage.getItem(OPTOUT_KEY)==='1'}catch(e){return false}}
function optOut(){try{localStorage.setItem(OPTOUT_KEY,'1');localStorage.removeItem(UUID_KEY);localStorage.removeItem('ginza_log_pending');_queue=[]}catch(e){}}
function optIn(){try{localStorage.removeItem(OPTOUT_KEY)}catch(e){}}

/* Parse UA once for the session */
function _parseUA(){
  const ua=navigator.userAgent||'';
  let device='Desktop',browser='Unknown',os='Unknown';
  if(/Windows/i.test(ua))os='Windows';
  else if(/Macintosh|Mac OS/i.test(ua))os='macOS';
  else if(/Android/i.test(ua)){os='Android';device='Mobile'}
  else if(/iPhone/i.test(ua)){os='iOS';device='Mobile'}
  else if(/iPad/i.test(ua)){os='iOS';device='Tablet'}
  else if(/Linux/i.test(ua))os='Linux';
  else if(/CrOS/i.test(ua))os='ChromeOS';
  if(/Edg\//i.test(ua))browser='Edge';
  else if(/OPR\//i.test(ua)||/Opera/i.test(ua))browser='Opera';
  else if(/SamsungBrowser/i.test(ua))browser='Samsung';
  else if(/Chrome/i.test(ua))browser='Chrome';
  else if(/Safari/i.test(ua)&&!/Chrome/i.test(ua))browser='Safari';
  else if(/Firefox/i.test(ua))browser='Firefox';
  return{ua,browser,os,device};
}

const _uaInfo=_parseUA();
const _sessionUUID=getUUID();

/* ── Create log entries ── */

/* Session entry — logged once on page load */
function _makeSessionEntry(){
  return{
    type:'session',
    uuid:_sessionUUID,
    timestamp:new Date().toISOString(),
    userAgent:_uaInfo.ua,
    browser:_uaInfo.browser,
    os:_uaInfo.os,
    device:_uaInfo.device,
    language:navigator.language||navigator.userLanguage||'unknown',
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'unknown',
    tzOffset:new Date().getTimezoneOffset(),
    page:window.location.pathname+window.location.search,
    referrer:document.referrer||'direct',
    screen:window.screen?window.screen.width+'x'+window.screen.height:'unknown',
    viewport:window.innerWidth+'x'+window.innerHeight,
    siteLang:(function(){try{return localStorage.getItem('ginza_lang')||'en'}catch(e){return'en'}})()
  };
}

/* Page view entry — logged on every page navigation */
function _makePageViewEntry(pageId){
  return{
    type:'pageView',
    uuid:_sessionUUID,
    timestamp:new Date().toISOString(),
    page:pageId
  };
}

/* Profile view entry — logged on every profile open */
function _makeProfileViewEntry(profileName){
  return{
    type:'profileView',
    uuid:_sessionUUID,
    timestamp:new Date().toISOString(),
    profile:profileName
  };
}

/* Filter use entry — logged when filters change (debounced) */
function _makeFilterUseEntry(activeFilters){
  return{type:'filterUse',uuid:_sessionUUID,timestamp:new Date().toISOString(),active:activeFilters};
}

/* Phone tap entry — logged when FAB phone link is tapped */
function _makePhoneTapEntry(number){
  return{type:'phoneTap',uuid:_sessionUUID,timestamp:new Date().toISOString(),number:number};
}

/* ── Queue management ── */

function enqueue(entry){
  _queue.push(entry);
  /* Debounce: reset timer on each enqueue, flush after DEBOUNCE_MS of quiet */
  clearTimeout(_flushTimer);
  _flushTimer=setTimeout(()=>flush(),DEBOUNCE_MS);
}

/* Track a page view (called from hooks) */
function trackPageView(pageId){
  if(!pageId||isOptedOut())return;
  enqueue(_makePageViewEntry(pageId));
}

/* Track a profile view (called from hooks) */
function trackProfileView(profileName){
  if(!profileName||isOptedOut())return;
  enqueue(_makeProfileViewEntry(profileName));
}

/* Track filter usage (debounced 3s to avoid noise) */
let _filterTimer=null;
function trackFilterUse(activeFilters){
  if(isOptedOut()||!activeFilters||!activeFilters.length)return;
  clearTimeout(_filterTimer);
  _filterTimer=setTimeout(()=>enqueue(_makeFilterUseEntry(activeFilters)),3000);
}

/* Track phone tap (FAB call button) */
function trackPhoneTap(number){
  if(isOptedOut())return;
  enqueue(_makePhoneTapEntry(number||'unknown'));
}

/* Get today's log filename in AEDT */
function _logFileName(){
  const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
  const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return `${LOG_DIR}/${ds}.json`;
}

/* Flush queued entries to GitHub */
async function flush(){
  if(_queue.length===0)return;
  /* If already flushing, wait for it then retry */
  if(_flushing){
    if(_flushPromise)await _flushPromise;
    if(_queue.length>0)return flush();
    return;
  }
  _flushing=true;

  /* Grab current queue and reset */
  const entries=[..._queue];
  _queue=[];

  const filePath=_logFileName();

  _flushPromise=(async()=>{
  try{
    /* Read existing log file */
    let existing=[];
    let sha=null;

    const getR=await fetchWithRetry(`${DATA_API}/${filePath}`,{headers:proxyHeaders()},{retries:1,baseDelay:500});
    if(getR.ok){
      const data=await getR.json();
      sha=data.sha;
      try{existing=JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g,'')))));}
      catch(e){existing=[];}
    }

    /* Cap file size — trim oldest entries if needed */
    if(existing.length+entries.length>LOG_MAX){
      existing=existing.slice(existing.length+entries.length-LOG_MAX);
    }
    /* Append all queued entries */
    existing.push(...entries);

    /* Write back */
    const body={
      message:'Log '+entries.length+' entries',
      content:btoa(unescape(encodeURIComponent(JSON.stringify(existing,null,2))))
    };
    if(sha)body.sha=sha;

    const putR=await fetchWithRetry(`${DATA_API}/${filePath}`,{
      method:'PUT',
      headers:proxyHeaders(),
      body:JSON.stringify(body)
    },{retries:1,baseDelay:500});

    if(!putR.ok){
      /* Put entries back in queue for next attempt */
      _queue.unshift(...entries);
      console.warn('Visitor log write failed:',putR.status);
    }

  }catch(e){
    /* Put entries back in queue for next attempt */
    _queue.unshift(...entries);
    console.warn('Visitor log flush failed:',e.message);
  }finally{
    _flushing=false;
    _flushPromise=null;
  }
  })();
  return _flushPromise;
}

/* Flush on page unload (best-effort) */
function _flushOnUnload(){
  if(_queue.length===0)return;
  const entries=[..._queue];
  _queue=[];
  /* Use sendBeacon for reliable delivery on unload */
  try{
    const filePath=_logFileName();
    /* sendBeacon can't do read-then-write, so we store pending entries
       in localStorage and flush them on next visit */
    const PENDING_KEY='ginza_log_pending';
    let pending=[];
    try{const raw=localStorage.getItem(PENDING_KEY);if(raw)pending=JSON.parse(raw);}catch(e){}
    pending.push(...entries);
    localStorage.setItem(PENDING_KEY,JSON.stringify(pending));
  }catch(e){/* silent */}
}

/* Flush any pending entries from a previous session that didn't complete */
async function _flushPending(){
  const PENDING_KEY='ginza_log_pending';
  try{
    const raw=localStorage.getItem(PENDING_KEY);
    if(!raw)return;
    const pending=JSON.parse(raw);
    if(!pending.length)return;
    localStorage.removeItem(PENDING_KEY);
    _queue.unshift(...pending);
    await flush();
  }catch(e){/* silent */}
}

/* Load log files for a date range from GitHub */
async function loadLogs(startDate,endDate){
  const logs=[];
  try{
    const r=await fetchWithRetry(`${DATA_API}/${LOG_DIR}`,{headers:proxyHeaders()},{retries:1,baseDelay:500});
    if(!r.ok)return logs;
    const files=await r.json();
    if(!Array.isArray(files))return logs;

    const filesToFetch=files.filter(f=>{
      const m=f.name.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
      if(!m)return false;
      const dt=m[1];
      return dt>=startDate&&dt<=endDate;
    });

    const batches=[];
    for(let i=0;i<filesToFetch.length;i+=10){
      batches.push(filesToFetch.slice(i,i+10));
    }

    for(const batch of batches){
      const results=await Promise.all(batch.map(async f=>{
        try{
          const fr=await fetchWithRetry(`${DATA_API}/${LOG_DIR}/${f.name}`,{headers:proxyHeaders()},{retries:1,baseDelay:300});
          if(!fr.ok)return[];
          const data=await fr.json();
          return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g,'')))));
        }catch(e){return[]}
      }));
      results.forEach(entries=>logs.push(...entries));
    }
  }catch(e){
    console.warn('Failed to load visitor logs:',e.message);
  }
  return logs;
}

/* ══════════════════════════════════════
   AGGREGATION
   ══════════════════════════════════════ */

function aggregateLogs(entries){
  const uuids=new Set();
  const browsers={};
  const browsersUniques={}; /* browser -> Set of uuids */
  const oses={};
  const osesUniques={};
  const devices={};
  const devicesUniques={};
  const languages={};
  const languagesUniques={};
  const siteLanguages={};
  const siteLanguagesUniques={};
  const timezones={};
  const timezonesUniques={};
  const referrers={};
  const referrersUniques={};
  const screens={};
  const hourly={};
  const daily={};
  const dailyUniques={};

  /* Page views: total count + unique UUIDs per page */
  const pageViewsTotal={};
  const pageViewsUniques={}; /* page -> Set of uuids */

  /* Profile views: total count + unique UUIDs per profile */
  const profileViewsTotal={};
  const profileViewsUniques={}; /* profile -> Set of uuids */

  /* Filter usage */
  const filterDimensions={};
  const filterDimensionsUniques={};
  let totalFilterUses=0;

  /* Phone taps */
  const phoneTapsByNumber={};
  const phoneTapUuids=new Set();
  let totalPhoneTaps=0;

  let totalHits=0;
  let totalPageViews=0;
  let totalProfileViews=0;

  for(let h=0;h<24;h++)hourly[String(h).padStart(2,'0')]=0;

  entries.forEach(e=>{
    const uuid=e.uuid||'unknown';

    /* ── Session entries (initial visit) ── */
    if(e.type==='session'||!e.type){
      totalHits++;
      uuids.add(uuid);

      const br=e.browser||_parseUABrowser(e.userAgent);
      browsers[br]=(browsers[br]||0)+1;
      if(!browsersUniques[br])browsersUniques[br]=new Set();
      browsersUniques[br].add(uuid);

      const os=e.os||_parseUAOS(e.userAgent);
      oses[os]=(oses[os]||0)+1;
      if(!osesUniques[os])osesUniques[os]=new Set();
      osesUniques[os].add(uuid);

      const dev=e.device||'Unknown';
      devices[dev]=(devices[dev]||0)+1;
      if(!devicesUniques[dev])devicesUniques[dev]=new Set();
      devicesUniques[dev].add(uuid);

      const lang=(e.language||'unknown').split('-')[0];
      languages[lang]=(languages[lang]||0)+1;
      if(!languagesUniques[lang])languagesUniques[lang]=new Set();
      languagesUniques[lang].add(uuid);

      if(e.siteLang){
        const sl=e.siteLang;
        siteLanguages[sl]=(siteLanguages[sl]||0)+1;
        if(!siteLanguagesUniques[sl])siteLanguagesUniques[sl]=new Set();
        siteLanguagesUniques[sl].add(uuid);
      }

      const tz=e.timezone||'unknown';
      timezones[tz]=(timezones[tz]||0)+1;
      if(!timezonesUniques[tz])timezonesUniques[tz]=new Set();
      timezonesUniques[tz].add(uuid);

      let ref='direct';
      if(e.referrer&&e.referrer!=='direct'){
        try{ref=new URL(e.referrer).hostname}catch(_){ref=e.referrer}
      }
      referrers[ref]=(referrers[ref]||0)+1;
      if(!referrersUniques[ref])referrersUniques[ref]=new Set();
      referrersUniques[ref].add(uuid);

      if(e.screen&&e.screen!=='unknown'){
        screens[e.screen]=(screens[e.screen]||0)+1;
      }

      /* Also count the initial page as a page view */
      if(e.page){
        const pg=e.page;
        pageViewsTotal[pg]=(pageViewsTotal[pg]||0)+1;
        if(!pageViewsUniques[pg])pageViewsUniques[pg]=new Set();
        pageViewsUniques[pg].add(uuid);
        totalPageViews++;
      }
    }

    /* ── Page view entries ── */
    if(e.type==='pageView'){
      const pg=e.page||'unknown';
      pageViewsTotal[pg]=(pageViewsTotal[pg]||0)+1;
      if(!pageViewsUniques[pg])pageViewsUniques[pg]=new Set();
      pageViewsUniques[pg].add(uuid);
      totalPageViews++;
      /* Also count this UUID as a visitor if not already seen */
      uuids.add(uuid);
    }

    /* ── Profile view entries ── */
    if(e.type==='profileView'){
      const pf=e.profile||'unknown';
      profileViewsTotal[pf]=(profileViewsTotal[pf]||0)+1;
      if(!profileViewsUniques[pf])profileViewsUniques[pf]=new Set();
      profileViewsUniques[pf].add(uuid);
      totalProfileViews++;
      uuids.add(uuid);
    }

    /* ── Filter use entries ── */
    if(e.type==='filterUse'){
      totalFilterUses++;
      (e.active||[]).forEach(dim=>{
        filterDimensions[dim]=(filterDimensions[dim]||0)+1;
        if(!filterDimensionsUniques[dim])filterDimensionsUniques[dim]=new Set();
        filterDimensionsUniques[dim].add(uuid);
      });
      uuids.add(uuid);
    }

    /* ── Phone tap entries ── */
    if(e.type==='phoneTap'){
      totalPhoneTaps++;
      phoneTapUuids.add(uuid);
      const num=e.number||'unknown';
      phoneTapsByNumber[num]=(phoneTapsByNumber[num]||0)+1;
      uuids.add(uuid);
    }

    /* Hourly (use AEDT) — for all entry types */
    if(e.timestamp){
      try{
        const dt=new Date(e.timestamp);
        const aedtStr=dt.toLocaleString('en-US',{timeZone:'Australia/Sydney',hour:'2-digit',hour12:false});
        const hr=String(parseInt(aedtStr)).padStart(2,'0');
        hourly[hr]=(hourly[hr]||0)+1;
      }catch(_){}
    }

    /* Daily — for all entry types */
    if(e.timestamp){
      try{
        const dt=new Date(e.timestamp);
        const aedtDate=new Date(dt.toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
        const ds=aedtDate.getFullYear()+'-'+String(aedtDate.getMonth()+1).padStart(2,'0')+'-'+String(aedtDate.getDate()).padStart(2,'0');
        daily[ds]=(daily[ds]||0)+1;
        if(!dailyUniques[ds])dailyUniques[ds]=new Set();
        dailyUniques[ds].add(uuid);
      }catch(_){}
    }
  });

  /* Convert Sets to counts */
  const dailyUniqueCounts={};
  for(const d in dailyUniques)dailyUniqueCounts[d]=dailyUniques[d].size;

  const pageViewsUniqueCounts={};
  for(const p in pageViewsUniques)pageViewsUniqueCounts[p]=pageViewsUniques[p].size;

  const profileViewsUniqueCounts={};
  for(const p in profileViewsUniques)profileViewsUniqueCounts[p]=profileViewsUniques[p].size;

  const browsersUniqueCounts={};
  for(const k in browsersUniques)browsersUniqueCounts[k]=browsersUniques[k].size;
  const osesUniqueCounts={};
  for(const k in osesUniques)osesUniqueCounts[k]=osesUniques[k].size;
  const devicesUniqueCounts={};
  for(const k in devicesUniques)devicesUniqueCounts[k]=devicesUniques[k].size;
  const languagesUniqueCounts={};
  for(const k in languagesUniques)languagesUniqueCounts[k]=languagesUniques[k].size;
  const siteLanguagesUniqueCounts={};
  for(const k in siteLanguagesUniques)siteLanguagesUniqueCounts[k]=siteLanguagesUniques[k].size;
  const timezonesUniqueCounts={};
  for(const k in timezonesUniques)timezonesUniqueCounts[k]=timezonesUniques[k].size;
  const referrersUniqueCounts={};
  for(const k in referrersUniques)referrersUniqueCounts[k]=referrersUniques[k].size;

  const filterDimensionsUniqueCounts={};
  for(const k in filterDimensionsUniques)filterDimensionsUniqueCounts[k]=filterDimensionsUniques[k].size;

  return{
    totalHits,
    totalPageViews,
    totalProfileViews,
    totalPhoneTaps,
    phoneTapUnique:phoneTapUuids.size,
    phoneTapsByNumber,
    totalFilterUses,
    filterDimensions,
    filterDimensionsUniqueCounts,
    uniqueVisitors:uuids.size,
    browsers,oses,devices,languages,siteLanguages,timezones,referrers,screens,
    browsersUniqueCounts,osesUniqueCounts,devicesUniqueCounts,
    languagesUniqueCounts,siteLanguagesUniqueCounts,timezonesUniqueCounts,referrersUniqueCounts,
    hourly,daily,dailyUniqueCounts,
    pageViewsTotal,pageViewsUniqueCounts,
    profileViewsTotal,profileViewsUniqueCounts
  };
}

/* Fallback UA parsers for older log entries without parsed fields */
function _parseUABrowser(ua){
  if(!ua)return 'Unknown';
  if(/Edg\//i.test(ua))return 'Edge';
  if(/OPR\//i.test(ua))return 'Opera';
  if(/SamsungBrowser/i.test(ua))return 'Samsung';
  if(/Chrome/i.test(ua))return 'Chrome';
  if(/Safari/i.test(ua)&&!/Chrome/i.test(ua))return 'Safari';
  if(/Firefox/i.test(ua))return 'Firefox';
  return 'Other';
}
function _parseUAOS(ua){
  if(!ua)return 'Unknown';
  if(/Windows/i.test(ua))return 'Windows';
  if(/Macintosh/i.test(ua))return 'macOS';
  if(/Android/i.test(ua))return 'Android';
  if(/iPhone|iPad/i.test(ua))return 'iOS';
  if(/Linux/i.test(ua))return 'Linux';
  return 'Other';
}

/* ── Init: queue session entry on load (skip if opted out) ── */
if(!isOptedOut()){
enqueue(_makeSessionEntry());
/* Flush pending entries from previous session, then flush current queue */
_flushPending().then(()=>flush());
}

/* On page unload, stash remaining queue to localStorage for next visit */
window.addEventListener('beforeunload',()=>{
  if(_queue.length===0)return;
  _flushOnUnload();
});

/* Also try a synchronous flush attempt on visibilitychange (mobile browsers) */
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&_queue.length>0){
    _flushOnUnload();
  }
});

return{trackPageView,trackProfileView,trackFilterUse,trackPhoneTap,flush,loadLogs,aggregateLogs,getUUID,isOptedOut,optOut,optIn};
})();


/* ══════════════════════════════════════
   ANALYTICS DASHBOARD (admin-only)
   ══════════════════════════════════════ */

let analyticsPeriod=7;
let cachedVisitorData=null;
let cachedVisitorPeriod=null;

function renderAnalytics(){
const container=document.getElementById('analyticsContent');
if(!container)return;
renderVisitorAnalytics(container);
renderAdminLog();
}

function _todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}


/* ══════════════════════════════════════
   VISITOR LOGS
   ══════════════════════════════════════ */

async function renderVisitorAnalytics(container){
/* ── Period selector ── */
const periods=[{d:1,l:t('ui.today')},{d:7,l:'7'+t('an.days')},{d:14,l:'14'+t('an.days')},{d:30,l:'30'+t('an.days')},{d:90,l:'90'+t('an.days')}];
let periodHtml='<div class="an-period">';
periods.forEach(p=>{periodHtml+=`<button class="an-period-btn${analyticsPeriod===p.d?' active':''}" data-days="${p.d}">${p.l}</button>`});
periodHtml+='</div>';

/* Show loading state first */
container.innerHTML=periodHtml+'<div class="an-loading"><div class="an-loading-spinner"></div><div class="an-loading-text">'+t('an.loading')+'</div></div>';
container.querySelectorAll('.an-period-btn').forEach(btn=>{
btn.onclick=()=>{analyticsPeriod=parseInt(btn.dataset.days);cachedVisitorData=null;renderAnalytics()}
});

/* Fetch logs */
const endDate=_todayStr();
const startD=new Date(new Date().toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
startD.setDate(startD.getDate()-analyticsPeriod);
const startDate=startD.getFullYear()+'-'+String(startD.getMonth()+1).padStart(2,'0')+'-'+String(startD.getDate()).padStart(2,'0');

let entries;
if(cachedVisitorData&&cachedVisitorPeriod===analyticsPeriod){
  entries=cachedVisitorData;
}else{
  entries=await VisitorLog.loadLogs(startDate,endDate);
  cachedVisitorData=entries;
  cachedVisitorPeriod=analyticsPeriod;
}

const v=VisitorLog.aggregateLogs(entries);

/* ── Day-of-week × Hour heatmap data ── */
const byDOWHour=Array.from({length:7},()=>Array(24).fill(0));
entries.forEach(e=>{if(!e.timestamp)return;try{const dt=new Date(e.timestamp);const aedtHr=parseInt(dt.toLocaleString('en-US',{timeZone:'Australia/Sydney',hour:'2-digit',hour12:false}));const aedtDateStr=dt.toLocaleString('en-US',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'});const[mm,dd,yyyy]=aedtDateStr.split('/');const dow=new Date(yyyy+'-'+mm+'-'+dd+'T00:00:00').getDay();if(aedtHr>=0&&aedtHr<24&&dow>=0&&dow<7)byDOWHour[dow][aedtHr]++}catch(_){}});

/* ── Summary cards ── */
const activeDays=Object.keys(v.daily).length;
const avgDaily=activeDays>0?Math.round(v.totalHits/activeDays):0;
const avgUniqueDaily=activeDays>0?Math.round(v.uniqueVisitors/activeDays):0;
const summaryHtml=`<div class="an-summary">
<div class="an-card"><div class="an-card-val">${v.uniqueVisitors}</div><div class="an-card-label">${t('an.uniqueVisitors')}</div></div>
<div class="an-card"><div class="an-card-val">${v.totalHits}</div><div class="an-card-label">${t('an.sessions')}</div></div>
<div class="an-card"><div class="an-card-val">${v.totalPageViews}</div><div class="an-card-label">${t('an.totalPageViews')}</div></div>
<div class="an-card"><div class="an-card-val">${v.totalProfileViews}</div><div class="an-card-label">${t('an.totalProfileViews')}</div></div>
<div class="an-card"><div class="an-card-val">${v.totalPhoneTaps}</div><div class="an-card-label">${t('an.phoneTaps')}</div></div>
<div class="an-card"><div class="an-card-val">${v.totalFilterUses}</div><div class="an-card-label">${t('an.filterUses')}</div></div>
</div>`;

/* ── Top 5 Profiles ── */
const top5PF=Object.entries(v.profileViewsTotal).sort((a,b)=>b[1]-a[1]).slice(0,5);
const rankLabels=['#1','#2','#3','#4','#5'];
let top5Html=`<div class="an-section"><div class="an-section-title">${t('an.topProfiles')} <span class="an-hint">${t('an.topHint')}</span></div><div class="an-top5">`;
for(let ri=0;ri<5;ri++){
  const rankClass='an-rank-'+(ri+1);
  if(ri<top5PF.length){
    const[name,total]=top5PF[ri];
    const unique=v.profileViewsUniqueCounts[name]||0;
    const girl=typeof girls!=='undefined'?girls.find(g=>g&&g.name===name):null;
    const thumb=girl&&girl.photos&&girl.photos.length?`<img class="an-top5-photo" src="${girl.photos[0]}" alt="${name.replace(/"/g,'&quot;')}">`:'<div class="an-top5-photo-empty"></div>';
    const liveNow=girl&&typeof isAvailableNow==='function'&&isAvailableNow(girl.name);
    const availDot=liveNow?'<span class="avail-now-dot" title="Available now" style="display:inline-block;margin-left:4px"></span>':'';
    top5Html+=`<div class="an-top5-card"><div class="an-top5-rank ${rankClass}">${rankLabels[ri]}</div>${thumb}<div class="an-top5-name">${name}${availDot}</div><span class="an-top5-total">${total}</span><div class="an-top5-unique">${t('an.uniqueCount').replace('{n}',unique)}</div></div>`;
  }else{
    top5Html+=`<div class="an-top5-card"><div class="an-top5-rank ${rankClass}">${rankLabels[ri]}</div><div class="an-top5-photo-empty"></div><div class="an-top5-empty">—</div></div>`;
  }
}
top5Html+='</div></div>';

/* ── Conversion (phone taps) ── */
const convRate=v.uniqueVisitors>0?(v.phoneTapUnique/v.uniqueVisitors*100).toFixed(1):'0.0';
const sortedTaps=Object.entries(v.phoneTapsByNumber).sort((a,b)=>b[1]-a[1]);
const maxTap=sortedTaps.length?sortedTaps[0][1]:1;
let convHtml=`<div class="an-section"><div class="an-section-title">${t('an.conversion')} <span class="an-hint">${t('an.conversionHint')}</span></div>`;
convHtml+=`<div class="an-summary" style="margin-bottom:16px"><div class="an-card"><div class="an-card-val">${v.totalPhoneTaps}</div><div class="an-card-label">${t('an.phoneTaps')}</div></div><div class="an-card"><div class="an-card-val">${v.phoneTapUnique}</div><div class="an-card-label">${t('an.uniqueTappers')}</div></div><div class="an-card"><div class="an-card-val">${convRate}%</div><div class="an-card-label">${t('an.convRate')}</div></div></div>`;
if(sortedTaps.length){
convHtml+='<div class="an-bars">';
sortedTaps.forEach(([num,count])=>{const pct=count/maxTap*100;convHtml+=`<div class="an-bar-row"><div class="an-bar-label">${num}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-conv" style="width:${pct}%"></div></div><div class="an-bar-val">${count}</div></div>`});
convHtml+='</div>';
}else{convHtml+='<div class="an-empty">'+t('an.noTaps')+'</div>'}
convHtml+='</div>';

/* ── Daily Visitors Trend (hits + uniques) ── */
const sortedDays=Object.entries(v.daily).sort((a,b)=>a[0].localeCompare(b[0]));
const maxDayVal=Math.max(...sortedDays.map(d=>d[1]),1);
let trendHtml=`<div class="an-section"><div class="an-section-title">${t('an.dailyVisitors')} <span class="an-hint">${t('an.dailyHint')}</span></div><div class="an-trend an-trend-dual">`;
sortedDays.forEach(([date,count])=>{
  const uniques=v.dailyUniqueCounts[date]||0;
  const pctH=count/maxDayVal*100;
  const pctU=uniques/maxDayVal*100;
  const dd=date.slice(5);
  trendHtml+=`<div class="an-trend-bar" title="${date}: ${count} hits, ${uniques} uniques">
    <div class="an-trend-fill" style="height:${Math.max(pctH,2)}%"></div>
    <div class="an-trend-fill an-trend-unique" style="height:${Math.max(pctU,2)}%"></div>
    <div class="an-trend-label">${dd}</div>
  </div>`;
});
if(!sortedDays.length)trendHtml+='<div class="an-empty">'+t('an.noLogs')+'</div>';
trendHtml+='</div>';
if(sortedDays.length)trendHtml+=`<div class="an-legend"><span class="an-legend-dot an-legend-hits"></span> ${t('an.legendHits')} <span class="an-legend-dot an-legend-uniques"></span> ${t('an.legendUniques')}</div>`;
trendHtml+='</div>';

/* ── Peak Hours Heatmap (day-of-week × hour) ── */
const _dowLabels=[t('date.sun'),t('date.mon'),t('date.tue'),t('date.wed'),t('date.thu'),t('date.fri'),t('date.sat')];
const _h12=h=>h===0?'12a':h<12?h+'a':h===12?'12p':(h-12)+'p';
const _hmMax=Math.max(...byDOWHour.flat(),1);
let hoursHtml=`<div class="an-section"><div class="an-section-title">${t('an.peakHours')} <span class="an-hint">${t('an.peakHint')}</span></div><div class="an-heatmap-wrap"><div class="an-heatmap-inner">`;
hoursHtml+='<div class="an-heatmap-dow"></div>';
for(let h=0;h<24;h++)hoursHtml+=`<div class="an-heatmap-hr">${h%3===0?_h12(h):''}</div>`;
for(let dow=0;dow<7;dow++){
  hoursHtml+=`<div class="an-heatmap-dow">${_dowLabels[dow]}</div>`;
  for(let h=0;h<24;h++){const val=byDOWHour[dow][h];const op=val===0?0.05:Math.max(0.12,val/_hmMax);hoursHtml+=`<div class="an-heatmap-cell" style="opacity:${op.toFixed(2)}" title="${_dowLabels[dow]} ${_h12(h)}: ${t('an.visitCount').replace('{n}',val)}"></div>`}
}
hoursHtml+='</div></div></div>';

/* ── Page Views (unique + total) ── */
const sortedPV=Object.entries(v.pageViewsTotal).sort((a,b)=>b[1]-a[1]).slice(0,15);
const maxPV=sortedPV.length?sortedPV[0][1]:1;
let pvHtml=`<div class="an-section"><div class="an-section-title">${t('an.pageViews')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedPV.forEach(([page,total])=>{
  const unique=v.pageViewsUniqueCounts[page]||0;
  const pct=total/maxPV*100;
  const label=page==='/'?'Home':page.replace(/^\//,'').replace(/\//g,' › ');
  pvHtml+=`<div class="an-bar-row"><div class="an-bar-label" title="${page}">${label}</div><div class="an-bar-track"><div class="an-bar-fill" style="width:${pct}%"></div></div><div class="an-bar-val">${total} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedPV.length)pvHtml+='<div class="an-empty">'+t('an.noPV')+'</div>';
pvHtml+='</div></div>';

/* ── Profile Traffic — all profiles sorted by views ── */
const namedGirls=typeof girls!=='undefined'?girls.filter(g=>g&&g.name&&String(g.name).trim()):[];
const allPFData=namedGirls.map(g=>({name:g.name,total:v.profileViewsTotal[g.name]||0,unique:v.profileViewsUniqueCounts[g.name]||0,girl:g})).sort((a,b)=>b.total-a.total);
const maxPF=allPFData.length&&allPFData[0].total>0?allPFData[0].total:1;
let pfHtml=`<div class="an-section"><div class="an-section-title">${t('an.mostProfiles')} <span class="an-hint">${t('an.pfHint')}</span></div><div class="an-bars">`;
allPFData.forEach(({name,total,unique,girl},i)=>{
  const pct=total>0?total/maxPF*100:0;
  const medal=i===0&&total>0?'🥇':i===1&&total>0?'🥈':i===2&&total>0?'🥉':'';
  const thumb=girl.photos&&girl.photos.length?`<img class="an-profile-thumb" src="${girl.photos[0]}" alt="${name.replace(/"/g,'&quot;')}">`:'<div class="an-profile-thumb an-profile-thumb-empty"></div>';
  const liveNow=typeof isAvailableNow==='function'&&isAvailableNow(name);
  const availDot=liveNow?'<span class="avail-now-dot" title="Available now"></span>':'';
  const dimStyle=total===0?'opacity:0.4':'';
  pfHtml+=`<div class="an-bar-row" style="${dimStyle}"><div class="an-bar-label an-bar-label-profile">${thumb}<span>${medal} ${name}</span>${availDot}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-profile" style="width:${pct}%"></div></div><div class="an-bar-val">${total} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!allPFData.length)pfHtml+='<div class="an-empty">'+t('an.noPF')+'</div>';
pfHtml+='</div></div>';

/* ── Browsers ── */
const sortedBrowsers=Object.entries(v.browsers).sort((a,b)=>b[1]-a[1]);
const maxBr=sortedBrowsers.length?sortedBrowsers[0][1]:1;
let browsersHtml=`<div class="an-section"><div class="an-section-title">${t('an.browsers')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedBrowsers.forEach(([name,count])=>{
  const unique=v.browsersUniqueCounts[name]||0;
  const pct=count/maxBr*100;
  browsersHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-visitor" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedBrowsers.length)browsersHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
browsersHtml+='</div></div>';

/* ── Operating Systems ── */
const sortedOS=Object.entries(v.oses).sort((a,b)=>b[1]-a[1]);
const maxOS=sortedOS.length?sortedOS[0][1]:1;
let osHtml=`<div class="an-section"><div class="an-section-title">${t('an.os')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedOS.forEach(([name,count])=>{
  const unique=v.osesUniqueCounts[name]||0;
  const pct=count/maxOS*100;
  osHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-os" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedOS.length)osHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
osHtml+='</div></div>';

/* ── Devices ── */
const sortedDev=Object.entries(v.devices).sort((a,b)=>b[1]-a[1]);
const maxDev=sortedDev.length?sortedDev[0][1]:1;
let devHtml=`<div class="an-section"><div class="an-section-title">${t('an.devices')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedDev.forEach(([name,count])=>{
  const unique=v.devicesUniqueCounts[name]||0;
  const pct=count/maxDev*100;
  devHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-device" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedDev.length)devHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
devHtml+='</div></div>';

/* ── Languages ── */
const sortedLangs=Object.entries(v.languages).sort((a,b)=>b[1]-a[1]).slice(0,10);
const maxLang=sortedLangs.length?sortedLangs[0][1]:1;
let langHtml=`<div class="an-section"><div class="an-section-title">${t('an.languages')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedLangs.forEach(([name,count])=>{
  const unique=v.languagesUniqueCounts[name]||0;
  const pct=count/maxLang*100;
  langHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-lang" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedLangs.length)langHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
langHtml+='</div></div>';

/* ── Website Language ── */
const sortedSiteLangs=Object.entries(v.siteLanguages).sort((a,b)=>b[1]-a[1]);
const maxSL=sortedSiteLangs.length?sortedSiteLangs[0][1]:1;
let siteLangHtml=`<div class="an-section"><div class="an-section-title">${t('an.siteLanguages')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedSiteLangs.forEach(([name,count])=>{
  const unique=v.siteLanguagesUniqueCounts[name]||0;
  const pct=count/maxSL*100;
  siteLangHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-lang" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedSiteLangs.length)siteLangHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
siteLangHtml+='</div></div>';

/* ── Timezones ── */
const sortedTZ=Object.entries(v.timezones).sort((a,b)=>b[1]-a[1]).slice(0,10);
const maxTZ=sortedTZ.length?sortedTZ[0][1]:1;
let tzHtml=`<div class="an-section"><div class="an-section-title">${t('an.timezones')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedTZ.forEach(([name,count])=>{
  const unique=v.timezonesUniqueCounts[name]||0;
  const pct=count/maxTZ*100;
  const shortName=name.replace('Australia/','AU/').replace('America/','US/').replace('Europe/','EU/').replace('Asia/','AS/');
  tzHtml+=`<div class="an-bar-row"><div class="an-bar-label" title="${name}">${shortName}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-tz" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedTZ.length)tzHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
tzHtml+='</div></div>';

/* ── Referrers ── */
const sortedRefs=Object.entries(v.referrers).sort((a,b)=>b[1]-a[1]).slice(0,10);
const maxRef=sortedRefs.length?sortedRefs[0][1]:1;
let refsHtml=`<div class="an-section"><div class="an-section-title">${t('an.referrers')} <span class="an-hint">${t('an.pvHint')}</span></div><div class="an-bars">`;
sortedRefs.forEach(([name,count])=>{
  const unique=v.referrersUniqueCounts[name]||0;
  const pct=count/maxRef*100;
  refsHtml+=`<div class="an-bar-row"><div class="an-bar-label">${name}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-ref" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedRefs.length)refsHtml+='<div class="an-empty">'+t('an.noData')+'</div>';
refsHtml+='</div></div>';

/* ── Filter Usage Patterns ── */
const _filterLabels={country:'Country',age:'Age',body:'Body',height:'Height',cup:'Cup',rate30:'30min Rate',rate45:'45min Rate',rate60:'60min Rate',experience:'Experience',labels:'Labels'};
const sortedFilters=Object.entries(v.filterDimensions).sort((a,b)=>b[1]-a[1]);
const maxFD=sortedFilters.length?sortedFilters[0][1]:1;
let filterHtml=`<div class="an-section"><div class="an-section-title">${t('an.filterPatterns')} <span class="an-hint">${t('an.filterHint')}</span></div><div class="an-bars">`;
sortedFilters.forEach(([dim,count])=>{
  const unique=v.filterDimensionsUniqueCounts[dim]||0;
  const pct=count/maxFD*100;
  const label=_filterLabels[dim]||dim;
  filterHtml+=`<div class="an-bar-row"><div class="an-bar-label">${label}</div><div class="an-bar-track"><div class="an-bar-fill an-bar-filter" style="width:${pct}%"></div></div><div class="an-bar-val">${count} <span class="an-bar-unique">/ ${unique}</span></div></div>`;
});
if(!sortedFilters.length)filterHtml+='<div class="an-empty">'+t('an.noFilters')+'</div>';
filterHtml+='</div></div>';

/* ── Recent Unique Visitors Table (one row per UUID per day) ── */
const allSessions=entries.filter(e=>e.type==='session'||!e.type);
const seenUUIDDay=new Set();
const uniqueDayVisitors=[];
/* Walk from newest to oldest so we keep the most recent appearance */
for(let i=allSessions.length-1;i>=0;i--){
  const e=allSessions[i];
  let dayKey='';
  try{
    const dt=new Date(e.timestamp);
    const aedtDate=new Date(dt.toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
    dayKey=aedtDate.getFullYear()+'-'+String(aedtDate.getMonth()+1).padStart(2,'0')+'-'+String(aedtDate.getDate()).padStart(2,'0');
  }catch(_){dayKey='unknown'}
  const key=(e.uuid||'anon')+'|'+dayKey;
  if(!seenUUIDDay.has(key)){
    seenUUIDDay.add(key);
    uniqueDayVisitors.push({...e,_day:dayKey});
  }
  if(uniqueDayVisitors.length>=20)break;
}
let tableHtml=`<div class="an-section"><div class="an-section-title">${t('an.recentVisitors')} <span class="an-hint">${t('an.recentHint')}</span></div>`;
if(uniqueDayVisitors.length){
  tableHtml+=`<div class="an-table-wrap"><table class="an-table"><thead><tr><th>${t('an.tableDate')}</th><th>UUID</th><th>${t('an.tableBrowser')}</th><th>${t('an.tableOS')}</th><th>${t('an.tableDevice')}</th><th>${t('an.tableLang')}</th><th>${t('an.tableSiteLang')}</th><th>${t('an.tableTZ')}</th></tr></thead><tbody>`;
  uniqueDayVisitors.forEach(e=>{
    const _mths=[t('date.jan'),t('date.feb'),t('date.mar'),t('date.apr'),t('date.may'),t('date.jun'),t('date.jul'),t('date.aug'),t('date.sep'),t('date.oct'),t('date.nov'),t('date.dec')];
    const dateStr=e._day!=='unknown'?(function(d){const dt=new Date(d+'T00:00:00');return dt.getDate()+' '+_mths[dt.getMonth()]})(e._day):'—';
    const uuid=(e.uuid||'—').slice(0,12);
    const br=e.browser||'—';
    const os=e.os||'—';
    const dev=e.device||'—';
    const lang=(e.language||'—').split('-')[0];
    const sl=e.siteLang||'—';
    const tz=(e.timezone||'—').replace('Australia/','AU/').replace('America/','US/');
    tableHtml+=`<tr><td>${dateStr}</td><td class="an-mono">${uuid}</td><td>${br}</td><td>${os}</td><td>${dev}</td><td>${lang}</td><td>${sl}</td><td title="${e.timezone||''}">${tz}</td></tr>`;
  });
  tableHtml+='</tbody></table></div>';
}else{
  tableHtml+='<div class="an-empty">'+t('an.noLogs')+'</div>';
}
tableHtml+='</div>';

/* ── Actions ── */
const actionsHtml=`<div class="an-actions">
<button class="an-action-btn" id="anExportVisitors">${t('an.export')}</button>
<button class="an-action-btn" id="anRefreshVisitors">${t('an.refresh')}</button>
</div>`;

container.innerHTML=periodHtml+summaryHtml+top5Html+convHtml+trendHtml+hoursHtml
  +'<div class="an-two-col">'+pvHtml+pfHtml+'</div>'
  +'<div class="an-two-col">'+browsersHtml+osHtml+'</div>'
  +'<div class="an-two-col">'+devHtml+langHtml+'</div>'
  +'<div class="an-two-col">'+siteLangHtml+tzHtml+'</div>'
  +'<div class="an-two-col">'+refsHtml+filterHtml+'</div>'
  +tableHtml+actionsHtml;

/* Bind period buttons */
container.querySelectorAll('.an-period-btn').forEach(btn=>{
  btn.onclick=()=>{analyticsPeriod=parseInt(btn.dataset.days);cachedVisitorData=null;renderAnalytics()}
});

/* Bind action buttons */
document.getElementById('anExportVisitors').onclick=()=>{
  const blob=new Blob([JSON.stringify(entries,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='ginza-visitors-'+_todayStr()+'.json';a.click();URL.revokeObjectURL(url);
  showToast(t('an.exported'));
};
document.getElementById('anRefreshVisitors').onclick=()=>{
  cachedVisitorData=null;renderAnalytics();
};
}



/* ══════════════════════════════════════
   ACTIVITY LOG DISPLAY
   ══════════════════════════════════════ */

async function renderAdminLog(){
  if(!isAdmin())return;
  const container=document.getElementById('adminLogContent');
  if(!container)return;
  container.innerHTML='<div class="an-section"><div class="an-section-title">Activity Log <span class="an-hint">Last 50 admin actions</span></div><div class="an-loading"><div class="an-loading-spinner"></div><div class="an-loading-text">Loading…</div></div></div>';
  try{
    const r=await fetch(`${DATA_API}/${ALP}`,{headers:proxyHeaders()});
    if(!r.ok){container.innerHTML='<div class="an-section"><div class="an-section-title">Activity Log</div><div class="an-empty">No activity recorded yet</div></div>';return}
    const d=await r.json();
    const entries=dec(d.content);
    const recent=[...entries].reverse().slice(0,50);
    const ACTION_LABELS={profile_add:'Added profile',profile_edit:'Edited profile',profile_delete:'Deleted profile',user_role_change:'Changed role',user_delete:'Deleted user',csv_import:'CSV import'};
    let html='<div class="an-section"><div class="an-section-title">Activity Log <span class="an-hint">Last 50 admin actions</span></div>';
    if(!recent.length){html+='<div class="an-empty">No activity recorded yet</div></div>';container.innerHTML=html;return}
    html+='<table class="pdb-table"><thead><tr><th>Time (AEDT)</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead><tbody>';
    recent.forEach(e=>{
      let timeStr='';try{timeStr=new Date(e.ts).toLocaleString('en-AU',{timeZone:'Australia/Sydney',dateStyle:'short',timeStyle:'short'})}catch(_){timeStr=e.ts||''}
      const action=ACTION_LABELS[e.action]||e.action||'';
      let target=e.target||'';if(e.newRole)target+=` → ${e.newRole}`;
      html+=`<tr><td style="white-space:nowrap;font-size:12px">${timeStr}</td><td><b>${(e.admin||'').toUpperCase()}</b></td><td>${action}</td><td>${target}</td></tr>`;
    });
    html+='</tbody></table></div>';
    container.innerHTML=html;
  }catch(err){container.innerHTML='<div class="an-section"><div class="an-empty">Could not load activity log</div></div>'}
}

/* ══════════════════════════════════════
   HOOK INTO EXISTING CODE
   ══════════════════════════════════════ */

/* Patch showPage to track page views via visitor log */
(function(){
const _origShowPage=showPage;
window.showPage=function(id){
_origShowPage(id);
const label=id.replace('Page','');
VisitorLog.trackPageView(label);
if(id==='analyticsPage')renderAnalytics();
};
})();

/* Patch showProfile to track profile views via visitor log */
(function(){
const _origShowProfile=showProfile;
window.showProfile=function(idx){
_origShowProfile(idx);
const g=girls[idx];
if(g&&g.name){
  VisitorLog.trackProfileView(g.name);
}
};
})();


/* ── Nav link (injected after login/logout) ── */
(function(){
const _origRenderDropdown=renderDropdown;
window.renderDropdown=function(){
_origRenderDropdown();
const navLink=document.getElementById('navAnalytics');
const dbLink=document.getElementById('navProfileDb');
if(isAdmin()){
if(navLink)navLink.style.display='';
if(dbLink)dbLink.style.display='';
}else{
if(navLink)navLink.style.display='none';
if(dbLink)dbLink.style.display='none';
if(document.getElementById('analyticsPage').classList.contains('active')||document.getElementById('profileDbPage').classList.contains('active')){
showPage('homePage');
}
}
};
})();

/* ── Profile Database ── */
let _pdbSearch='',_pdbRoleFilter='';
function renderProfileDb(){
if(!isAdmin())return;
const container=document.getElementById('profileDbContent');
if(!container)return;
/* Filters bar */
let html='<div class="pdb-filters"><input class="pdb-search" id="pdbSearch" type="text" placeholder="'+t('pdb.searchPlaceholder')+'" value="'+(_pdbSearch||'').replace(/"/g,'&quot;')+'">';
html+='<select class="pdb-role-filter" id="pdbRoleFilter"><option value=""'+ (_pdbRoleFilter===''?' selected':'')+'>'+t('pdb.allRoles')+'</option><option value="admin"'+(_pdbRoleFilter==='admin'?' selected':'')+'>Admin</option><option value="member"'+(_pdbRoleFilter==='member'?' selected':'')+'>Member</option></select></div>';
/* Filter CRED */
const q=_pdbSearch.toLowerCase();
const filtered=CRED.map((c,i)=>({c,i})).filter(({c})=>{
if(c.role==='owner')return false;
if(_pdbRoleFilter&&c.role!==_pdbRoleFilter)return false;
if(q){const u=(c.user||'').toLowerCase(),e=(c.email||'').toLowerCase(),m=(c.mobile||'').toLowerCase();if(!u.includes(q)&&!e.includes(q)&&!m.includes(q))return false}
return true});
/* Table */
html+='<table class="pdb-table"><thead><tr><th>'+t('pdb.username')+'</th><th>'+t('field.email')+'</th><th>'+t('field.mobile')+'</th><th>'+t('pdb.role')+'</th><th>'+t('pdb.status')+'</th><th></th></tr></thead><tbody>';
if(!filtered.length){html+='<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:24px">'+t('pdb.noResults')+'</td></tr>'}
filtered.forEach(({c,i})=>{
const isSelf=c.user===loggedInUser;const st=c.status||'approved';
const isApproved=st==='approved';
html+='<tr><td class="pdb-user">'+((c.user||'').toUpperCase())+'</td><td>'+(c.email||'—')+'</td><td>'+(c.mobile||'—')+'</td><td><select class="pdb-role-select" data-cred-idx="'+i+'"><option value="admin"'+(c.role==='admin'?' selected':'')+'>Admin</option><option value="member"'+(c.role==='member'?' selected':'')+'>Member</option></select></td><td><label class="pdb-status-check'+(isApproved?' pdb-status-approved':'')+'"><input type="checkbox" class="pdb-status-cb" data-cred-idx="'+i+'"'+(isApproved?' checked disabled':'')+'/><span class="pdb-status-label">'+(isApproved?t('pdb.statusApproved'):t('pdb.statusPending'))+'</span></label></td><td>'+(isSelf?'':'<button class="pdb-delete-btn" data-cred-idx="'+i+'" title="'+t('pdb.deleteUser')+'">&#x2715;</button>')+'</td></tr>'});
html+='</tbody></table>';
container.innerHTML=html;
/* Bind search */
const searchEl=document.getElementById('pdbSearch');
searchEl.oninput=()=>{_pdbSearch=searchEl.value;renderProfileDb()};
searchEl.focus();searchEl.setSelectionRange(searchEl.value.length,searchEl.value.length);
/* Bind role filter */
document.getElementById('pdbRoleFilter').onchange=function(){_pdbRoleFilter=this.value;renderProfileDb()};
/* Bind role selects */
container.querySelectorAll('.pdb-role-select').forEach(sel=>{
sel.onchange=async function(){
const idx=parseInt(this.dataset.credIdx);const newRole=this.value;
if(CRED[idx].user===loggedInUser&&newRole!=='admin'){this.value='admin';showToast(t('pdb.cannotDemoteSelf'));return}
CRED[idx].role=newRole;
if(await saveAuth()){logAdminAction('user_role_change',CRED[idx].user,{newRole});showToast(t('pdb.roleUpdated'))}else{showToast(t('pdb.saveFailed'))}}});
/* Bind status checkboxes */
container.querySelectorAll('.pdb-status-cb').forEach(cb=>{
cb.onchange=async function(){
const idx=parseInt(this.dataset.credIdx);
if(!this.checked)return;
CRED[idx].status=undefined;
if(await saveAuth()){logAdminAction('user_status_change',CRED[idx].user,{newStatus:'approved'});showToast(t('pdb.statusUpdated'));renderProfileDb()}else{showToast(t('pdb.saveFailed'))}}});
/* Bind delete buttons */
container.querySelectorAll('.pdb-delete-btn').forEach(btn=>{
btn.onclick=async function(){
const idx=parseInt(this.dataset.credIdx);const name=(CRED[idx].user||'').toUpperCase();
if(!confirm(t('pdb.confirmDelete').replace('{user}',name)))return;
CRED.splice(idx,1);
if(await saveAuth()){logAdminAction('user_delete',name);showToast(t('pdb.userDeleted'));renderProfileDb()}else{showToast(t('pdb.saveFailed'))}}})}

/* ── Track FAB phone taps ── */
document.querySelectorAll('.fab-item.fab-call').forEach(link=>{
link.addEventListener('click',()=>{
  const num=(link.getAttribute('href')||'').replace('tel:+61','0').replace(/\D/g,'');
  VisitorLog.trackPhoneTap(num);
});
});

/* ── Track filter usage (patch onFiltersChanged) ── */
(function(){
const _origOnFiltersChanged=onFiltersChanged;
window.onFiltersChanged=function(){
  _origOnFiltersChanged();
  const active=[];
  if(sharedFilters.country&&sharedFilters.country.length)active.push('country');
  if(sharedFilters.ageMin!=null||sharedFilters.ageMax!=null)active.push('age');
  if(sharedFilters.bodyMin!=null||sharedFilters.bodyMax!=null)active.push('body');
  if(sharedFilters.heightMin!=null||sharedFilters.heightMax!=null)active.push('height');
  if(sharedFilters.cupSize)active.push('cup');
  if(sharedFilters.val1Min!=null||sharedFilters.val1Max!=null)active.push('rate30');
  if(sharedFilters.val2Min!=null||sharedFilters.val2Max!=null)active.push('rate45');
  if(sharedFilters.val3Min!=null||sharedFilters.val3Max!=null)active.push('rate60');
  if(sharedFilters.experience)active.push('experience');
  if(sharedFilters.labels&&sharedFilters.labels.length)active.push('labels');
  if(active.length)VisitorLog.trackFilterUse(active);
};
})();
