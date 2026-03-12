/* === CORE UTILITIES & API === */

const PROXY = 'https://github-proxy.sydneyginza-api-2.workers.dev';
const REPO = 'travanixlabs/ginzaempire';
const DATA_REPO = REPO;
const SITE_REPO = REPO;
const BASE_PATH = location.hostname === 'travanixlabs.github.io' ? '/ginzaempire' : '';
const DATA_API = `${PROXY}/repos/${DATA_REPO}/contents`;
const SITE_API = `${PROXY}/repos/${SITE_REPO}/contents`;

const DP = 'data/girls.json', AP = 'data/auth.json', KP = 'data/calendar.json', RHP = 'data/roster_history.json', VP = 'data/vacation.json', ALP = 'data/logs_admin', BKLP = 'data/logs_bookings';
var loggedIn = false, dataSha = null, calSha = null, calData = {}, loggedInUser = null, loggedInRole = null, loggedInEmail = null, loggedInMobile = null, authSha = null, MAX_PHOTOS = 10, profileReturnPage = 'homePage';
function isAdmin(){ return loggedIn && (loggedInRole === 'admin' || loggedInRole === 'owner') }
var rosterHistory = {}, rosterHistorySha = null;
var vacationData = {}, vacationSha = null;
var girls = [];
var GT = true;

/* === Mobile Lite Detection === */
const IS_MOBILE_LITE = (function(){
  const narrow = window.innerWidth <= 768;
  const touchPrimary = matchMedia('(pointer: coarse)').matches;
  const mobileUA = /Android|iPhone|iPod|webOS|BlackBerry|Opera Mini/i.test(navigator.userAgent);
  return (narrow && touchPrimary) || (narrow && mobileUA);
})();
if (IS_MOBILE_LITE) document.body.classList.add('mobile-lite');

/* === Screen Reader Announcer === */
function announce(msg){const el=document.getElementById('a11yAnnouncer');if(el){el.textContent='';requestAnimationFrame(()=>el.textContent=msg)}}

/* === Adaptive Polling === */
const POLL_FAST = 30000;      // 30s for roster/profile when visible
const POLL_NORMAL = 60000;    // 60s for other pages when visible
const POLL_SLOW = 300000;     // 5min when tab hidden
const POLL_COUNTDOWN = 10000; // 10s countdown-only tick (no API)
let _pollInterval = null;
let _countdownTickInterval = null;
let _isTabVisible = !document.hidden;
let _lastCalFetch = 0;
let _lastCalFetchDisplay = '';
let _calRefreshing = false;

async function refreshCalendar() {
  if (_isOffline || _calRefreshing) return false;
  _calRefreshing = true;
  try {
    const prevSha = calSha;
    const freshCal = await loadCalData();
    _lastCalFetch = Date.now();
    _lastCalFetchDisplay = new Date().toLocaleTimeString('en-AU', {
      timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit'
    });
    if (calSha && calSha !== prevSha) {
      calData = normalizeCalData(freshCal);
      updateCalCache();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Calendar refresh failed:', e);
    return false;
  } finally {
    _calRefreshing = false;
  }
}

document.addEventListener('visibilitychange', () => {
  _isTabVisible = !document.hidden;
  if (_isTabVisible) {
    const elapsed = Date.now() - _lastCalFetch;
    if (elapsed > POLL_FAST) refreshCalendar().then(changed => { if (changed) renderActivePage() });
    startAdaptivePolling();
  } else {
    startAdaptivePolling();
  }
});

function proxyHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

/* === Utility functions (unchanged) === */
function showToast(m, t = 'success') { const e = document.getElementById('toast'); e.textContent = m; e.className = 'toast ' + t + ' show'; clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 3000) }
function getAEDTDate() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })) }
/* Logical date: the "day" starts at 4am, so before 4am we're still on the previous calendar day */
function getLogicalAEDTDate() { const n = getAEDTDate(); if (n.getHours() < 4) { const d = new Date(n); d.setDate(d.getDate() - 1); return d; } return n; }
function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function getWeekDates() { const t = getLogicalAEDTDate(), a = []; for (let i = 0; i < 7; i++) { const d = new Date(t); d.setDate(t.getDate() + i); a.push(fmtDate(d)) } return a }
function dispDate(ds) { const d = new Date(ds + 'T00:00:00'); const tFn=typeof t==='function'?t:k=>['date.sun','date.mon','date.tue','date.wed','date.thu','date.fri','date.sat','date.jan','date.feb','date.mar','date.apr','date.may','date.jun','date.jul','date.aug','date.sep','date.oct','date.nov','date.dec'].indexOf(k)<0?k:['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][['date.sun','date.mon','date.tue','date.wed','date.thu','date.fri','date.sat','date.jan','date.feb','date.mar','date.apr','date.may','date.jun','date.jul','date.aug','date.sep','date.oct','date.nov','date.dec'].indexOf(k)]; const days=['date.sun','date.mon','date.tue','date.wed','date.thu','date.fri','date.sat']; const months=['date.jan','date.feb','date.mar','date.apr','date.may','date.jun','date.jul','date.aug','date.sep','date.oct','date.nov','date.dec']; return { date: d.getDate() + ' ' + tFn(months[d.getMonth()]), day: tFn(days[d.getDay()]) } }
function dec(c) { return JSON.parse(decodeURIComponent(escape(atob(c.replace(/\n/g, ''))))) }
function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o, null, 2)))) }
function fmtTime12(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; const hr = h === 0 ? 12 : h > 12 ? h - 12 : h; return hr + ':' + String(m).padStart(2, '0') + ' ' + ap }
function getCalEntry(name, date) { if (calData[name] && calData[name][date]) { const v = calData[name][date]; return typeof v === 'object' ? v : { start: '', end: '' }; } return null }

/* Check if a girl is available RIGHT NOW based on current AEDT time vs today's scheduled hours */
function isAvailableNow(name) {
  const now = getAEDTDate();
  const today = fmtDate(now);
  if (_isOnVacation(name, today)) return false;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  /* Check today's entry */
  const entry = getCalEntry(name, today);
  if (entry && entry.start && entry.end) {
    const [sh, sm] = entry.start.split(':').map(Number);
    const [eh, em] = entry.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) {
      /* Overnight shift starting today */
      if (nowMins >= startMins || nowMins < endMins) return true;
    } else {
      if (nowMins >= startMins && nowMins < endMins) return true;
    }
  }

  /* Also check yesterday's entry for overnight shifts that extend into today */
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yEntry = getCalEntry(name, fmtDate(yesterday));
  if (yEntry && yEntry.start && yEntry.end) {
    const [ysh, ysm] = yEntry.start.split(':').map(Number);
    const [yeh, yem] = yEntry.end.split(':').map(Number);
    const yStartMins = ysh * 60 + ysm;
    const yEndMins = yeh * 60 + yem;
    /* Overnight shift from yesterday: endMins < startMins, and we're before the end time */
    if (yEndMins <= yStartMins && nowMins < yEndMins) return true;
  }

  return false;
}

/* Time until a girl's shift starts or ends (for countdown display) */
function getAvailCountdown(name) {
  const now=getAEDTDate();
  const nowMins=now.getHours()*60+now.getMinutes();
  const fmt=m=>{const h=Math.floor(m/60),mm=m%60;return h>0?`${h}h ${mm}m`:`${mm}m`};

  if(isAvailableNow(name)){
    /* Find the active entry (today's or yesterday's overnight) */
    let endMins=null;
    const entry=getCalEntry(name,fmtDate(now));
    if(entry&&entry.start&&entry.end){
      const [sh,sm]=entry.start.split(':').map(Number);
      const [eh,em]=entry.end.split(':').map(Number);
      const sMins=sh*60+sm,eMins=eh*60+em;
      if(eMins<=sMins){if(nowMins>=sMins||nowMins<eMins)endMins=eMins;}
      else{if(nowMins>=sMins&&nowMins<eMins)endMins=eMins;}
    }
    if(endMins===null){
      /* Must be yesterday's overnight shift */
      const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
      const ye=getCalEntry(name,fmtDate(yesterday));
      if(ye&&ye.start&&ye.end){const[yeh,yem]=ye.end.split(':').map(Number);endMins=yeh*60+yem;}
    }
    if(endMins!==null){let rem=endMins-nowMins;if(rem<=0)rem+=1440;return{type:'ends',str:fmt(rem)}}
    return null;
  }

  const entry=getCalEntry(name,fmtDate(now));
  if(!entry||!entry.start||!entry.end)return null;
  const [sh,sm]=entry.start.split(':').map(Number);
  const startMins=sh*60+sm;
  const rem=startMins-nowMins;
  if(rem>0&&rem<=720)return{type:'starts',str:fmt(rem)};
  return null;
}

/* Count how many girls are available right now */
function getAvailableNowCount() {
  return girls.filter(g => g.name && isAvailableNow(g.name)).length;
}

/* Check if a girl has a shift scheduled today (regardless of current time) */
function isAvailableToday(name) {
  const entry = getCalEntry(name, fmtDate(getLogicalAEDTDate()));
  return !!(entry && entry.start && entry.end);
}

/* Count how many girls are scheduled today */
function getAvailableTodayCount() {
  return girls.filter(g => g.name && isAvailableToday(g.name)).length;
}

function genFn() { return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg' }

/* === Local Cache (stale-while-revalidate) === */
const CACHE_KEY_GIRLS = 'ginza_cache_girls';
const CACHE_KEY_CAL = 'ginza_cache_cal';
const CACHE_KEY_GIRLS_SHA = 'ginza_cache_girls_sha';
const CACHE_KEY_CAL_SHA = 'ginza_cache_cal_sha';
const CACHE_KEY_CAL_TS = 'ginza_cache_cal_ts';
const CAL_CACHE_TTL = 10 * 60 * 1000; // 10 min — availability can change hourly

function cacheGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch (e) { return null; }
}

function cacheSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { /* quota exceeded or unavailable — silently ignore */ }
}

function cacheClear() {
  try { [CACHE_KEY_GIRLS, CACHE_KEY_CAL, CACHE_KEY_GIRLS_SHA, CACHE_KEY_CAL_SHA, CACHE_KEY_CAL_TS].forEach(k => localStorage.removeItem(k)); }
  catch (e) {}
}

function getCachedGirls() { return cacheGet(CACHE_KEY_GIRLS); }
function getCachedCal() { return cacheGet(CACHE_KEY_CAL); }
function getCachedGirlsSha() { try { return localStorage.getItem(CACHE_KEY_GIRLS_SHA) || null; } catch(e) { return null; } }
function getCachedCalSha() { try { return localStorage.getItem(CACHE_KEY_CAL_SHA) || null; } catch(e) { return null; } }

function updateGirlsCache() {
  cacheSet(CACHE_KEY_GIRLS, girls);
  if (dataSha) try { localStorage.setItem(CACHE_KEY_GIRLS_SHA, dataSha); } catch(e) {}
}

function updateCalCache() {
  cacheSet(CACHE_KEY_CAL, calData);
  if (calSha) try { localStorage.setItem(CACHE_KEY_CAL_SHA, calSha); } catch(e) {}
  try { localStorage.setItem(CACHE_KEY_CAL_TS, Date.now().toString()); } catch(e) {}
}

function isCalCacheStale() {
  try { const ts = localStorage.getItem(CACHE_KEY_CAL_TS); return !ts || (Date.now() - parseInt(ts)) > CAL_CACHE_TTL; }
  catch(e) { return true; }
}

/* === Favorites (per-user in auth.json) === */

function getFavorites() {
  if (!loggedIn || !loggedInUser) return [];
  const entry = CRED.find(c => c.user === loggedInUser);
  return entry && Array.isArray(entry.favorites) ? entry.favorites : [];
}

function saveFavorites(favs) {
  if (!loggedIn || !loggedInUser) return;
  const entry = CRED.find(c => c.user === loggedInUser);
  if (entry) { entry.favorites = favs; saveAuth(); }
}

function isFavorite(name) {
  return getFavorites().includes(name);
}

function toggleFavorite(name) {
  const favs = getFavorites();
  const idx = favs.indexOf(name);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(name);
  saveFavorites(favs);
  return idx < 0;
}

function getFavCount() {
  const favs = getFavorites();
  return girls.filter(g => g.name && favs.includes(g.name)).length;
}

/* === User Preferences (stored in auth.json per user) === */
function getUserPref(key, defaultVal = null) {
  if (!loggedIn || !loggedInUser) return defaultVal;
  const entry = CRED.find(c => c.user === loggedInUser);
  return entry && entry.prefs && key in entry.prefs ? entry.prefs[key] : defaultVal;
}

function setUserPref(key, value) {
  if (!loggedIn || !loggedInUser) return;
  const entry = CRED.find(c => c.user === loggedInUser);
  if (!entry) return;
  if (!entry.prefs) entry.prefs = {};
  entry.prefs[key] = value;
  saveAuth();
}

/* === Recently Viewed === */
const RV_KEY = 'ginza_recently_viewed';
const RV_MAX = 10;

function _rvEntry() {
  if (!loggedIn || !loggedInUser) return null;
  return CRED.find(c => c.user === loggedInUser) || null;
}

function getRecentlyViewed() {
  const entry = _rvEntry();
  if (entry) return Array.isArray(entry.viewHistory) ? entry.viewHistory : [];
  try { const v = localStorage.getItem(RV_KEY); return v ? JSON.parse(v) : []; }
  catch (e) { return []; }
}

function addRecentlyViewed(name) {
  if (!name) return;
  const entry = _rvEntry();
  if (entry) {
    let rv = Array.isArray(entry.viewHistory) ? entry.viewHistory.slice() : [];
    rv = rv.filter(r => r.name !== name);
    rv.unshift({ name, ts: Date.now() });
    if (rv.length > RV_MAX) rv = rv.slice(0, RV_MAX);
    entry.viewHistory = rv;
    syncViewHistory();
  } else {
    let rv = getRecentlyViewed();
    rv = rv.filter(r => r.name !== name);
    rv.unshift({ name, ts: Date.now() });
    if (rv.length > RV_MAX) rv = rv.slice(0, RV_MAX);
    try { localStorage.setItem(RV_KEY, JSON.stringify(rv)); } catch (e) {}
  }
}

function clearRecentlyViewed() {
  const entry = _rvEntry();
  if (entry) { entry.viewHistory = []; syncViewHistory(); }
  try { localStorage.removeItem(RV_KEY); } catch (e) {}
}

function getViewedDaysAgo(name) {
  const rv = getRecentlyViewed();
  const entry = rv.find(r => r.name === name);
  if (!entry || !entry.ts) return null;
  const diff = Date.now() - entry.ts;
  return Math.floor(diff / 86400000);
}

function viewedBadgeHtml(name) {
  if (!loggedIn) return '';
  const days = getViewedDaysAgo(name);
  if (days === null) return '';
  let label;
  if (days === 0) label = t('viewed.today');
  else if (days === 1) label = t('viewed.yesterday');
  else if (days <= 14) label = t('viewed.daysAgo').replace('{n}', days);
  else return '';
  return `<div class="card-viewed-badge"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> ${label}</div>`;
}

let _viewHistorySyncTimer = null;
function syncViewHistory() {
  if (!loggedIn || !loggedInUser) return;
  clearTimeout(_viewHistorySyncTimer);
  _viewHistorySyncTimer = setTimeout(() => { saveAuth(); }, 5000);
}

/* === API Functions (with retry) === */

async function fetchWithRetry(url, opts = {}, { retries = 3, baseDelay = 600 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, opts);
      // Don't retry client errors (4xx) except 429 (rate limit)
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) return r;
      // Retryable server error or rate limit
      lastErr = new Error(`HTTP ${r.status}`);
      if (attempt < retries) {
        const retryAfter = r.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, delay));
      }
    } catch (e) {
      // Network error — retryable
      lastErr = e;
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

async function loadAuth() {
  try {
    const r = await fetchWithRetry(`${DATA_API}/${AP}`, { headers: proxyHeaders() });
    if (r.ok) { const d = await r.json(); authSha = d.sha; return dec(d.content); }
    if (r.status === 404) {
      const d = [{ user: 'admin', pass: 'admin123' }];
      await fetchWithRetry(`${DATA_API}/${AP}`, {
        method: 'PUT',
        headers: proxyHeaders(),
        body: JSON.stringify({ message: 'Create auth', content: enc(d) })
      });
      return d;
    }
  } catch (e) { console.error('loadAuth error:', e); }
  return [];
}

async function saveAuth(retryOnConflict = true) {
  try {
    const body = { message: 'Update auth', content: enc(CRED) };
    if (authSha) body.sha = authSha;
    const r = await fetchWithRetry(`${DATA_API}/${AP}`, {
      method: 'PUT',
      headers: proxyHeaders(),
      body: JSON.stringify(body)
    }, { retries: 2 });
    const rd = await r.json();
    if (!r.ok) {
      if (r.status === 409 && retryOnConflict) {
        const fresh = await fetchWithRetry(`${DATA_API}/${AP}`, { headers: proxyHeaders() });
        if (fresh.ok) { authSha = (await fresh.json()).sha; return saveAuth(false); }
      }
      throw new Error(rd.message || r.status);
    }
    authSha = rd.content.sha;
    return true;
  } catch (e) { showToast('Save failed: ' + e.message, 'error'); return false; }
}

async function loadData() {
  try {
    const r = await fetchWithRetry(`${DATA_API}/${DP}`, { headers: proxyHeaders() });
    if (r.ok) { const d = await r.json(); dataSha = d.sha; return dec(d.content); }
    if (r.status === 404) { dataSha = null; return []; }
  } catch (e) { console.error('loadData error:', e); }
  return null;
}

async function saveData(retryOnConflict = true) {
  try {
    const body = { message: 'Update girls', content: enc(girls) };
    if (dataSha) body.sha = dataSha;
    const r = await fetchWithRetry(`${DATA_API}/${DP}`, {
      method: 'PUT',
      headers: proxyHeaders(),
      body: JSON.stringify(body)
    }, { retries: 2 });
    const rd = await r.json();
    if (!r.ok) {
      // SHA conflict — refetch and retry once
      if (r.status === 409 && retryOnConflict) {
        console.warn('Save conflict — refetching SHA and retrying');
        const fresh = await fetchWithRetry(`${DATA_API}/${DP}`, { headers: proxyHeaders() });
        if (fresh.ok) { dataSha = (await fresh.json()).sha; return saveData(false); }
      }
      throw new Error(rd.message || r.status);
    }
    dataSha = rd.content.sha;
    updateGirlsCache();
    return true;
  } catch (e) { showToast('Save failed: ' + e.message, 'error'); return false; }
}

async function loadCalData() {
  try {
    const r = await fetchWithRetry(`${DATA_API}/${KP}`, { headers: proxyHeaders() });
    if (r.ok) { const d = await r.json(); calSha = d.sha; return dec(d.content); }
    if (r.status === 404) { calSha = null; return {}; }
  } catch (e) { console.error('loadCalData error:', e); }
  return {};
}

async function saveCalData(retryOnConflict = true) {
  try {
    const vd = getWeekDates(); const _yd=new Date(getAEDTDate());_yd.setDate(_yd.getDate()-1);const yesterday=fmtDate(_yd);if(!vd.includes(yesterday))vd.unshift(yesterday); const cl = {};
    for (const n in calData) { if(n==='_published'){cl._published=Array.isArray(calData._published)?calData._published.filter(d=>d>=yesterday):[];continue} if(n==='_bookings'){cl._bookings=Array.isArray(calData._bookings)?calData._bookings.filter(b=>vd.includes(b.date)).map(b=>({...b})):[];continue} cl[n] = {}; for (const dt of vd) { if (calData[n] && calData[n][dt]) cl[n][dt] = calData[n][dt] } }
    calData = cl;
    const body = { message: 'Update calendar', content: enc(calData) };
    if (calSha) body.sha = calSha;
    const r = await fetchWithRetry(`${DATA_API}/${KP}`, {
      method: 'PUT',
      headers: proxyHeaders(),
      body: JSON.stringify(body)
    }, { retries: 2 });
    if (!r.ok) {
      if (r.status === 409 && retryOnConflict) {
        console.warn('Calendar save conflict — refetching SHA and retrying');
        const fresh = await fetchWithRetry(`${DATA_API}/${KP}`, { headers: proxyHeaders() });
        if (fresh.ok) { calSha = (await fresh.json()).sha; return saveCalData(false); }
      }
      throw new Error(r.status);
    }
    calSha = (await r.json()).content.sha;
    updateCalCache();
    /* Update roster history for past/today entries */
    const todayStr=fmtDate(getAEDTDate());let histChanged=false;
    for(const n in calData){for(const dt of Object.keys(calData[n]||{})){const ce=calData[n][dt];if(dt<=todayStr&&ce&&ce.start&&ce.end){if(!rosterHistory[n]||dt>rosterHistory[n]){rosterHistory[n]=dt;histChanged=true}}}}
    if(histChanged)saveRosterHistory();
    return true;
  } catch (e) { showToast('Calendar save failed', 'error'); return false; }
}

/* === Roster History === */
async function loadRosterHistory(){
  try{
    const r=await fetchWithRetry(`${DATA_API}/${RHP}`,{headers:proxyHeaders()});
    if(r.ok){const d=await r.json();rosterHistorySha=d.sha;rosterHistory=dec(d.content)||{};return}
    if(r.status===404){rosterHistorySha=null;rosterHistory={}}
  }catch(_){}
}
async function saveRosterHistory(){
  try{
    const body={message:'Update roster history',content:enc(rosterHistory)};
    if(rosterHistorySha)body.sha=rosterHistorySha;
    const r=await fetchWithRetry(`${DATA_API}/${RHP}`,{method:'PUT',headers:proxyHeaders(),body:JSON.stringify(body)});
    if(r.ok)rosterHistorySha=(await r.json()).content.sha;
  }catch(_){}
}
function getLastRostered(name){return rosterHistory[name]||null}

/* === Vacation Data === */
async function loadVacationData(){
  try{
    const r=await fetchWithRetry(`${DATA_API}/${VP}`,{headers:proxyHeaders()});
    if(r.ok){const d=await r.json();vacationSha=d.sha;vacationData=dec(d.content)||{};return}
    if(r.status===404){vacationSha=null;vacationData={}}
  }catch(_){}
}
async function saveVacationData(){
  try{
    const body={message:'Update vacation',content:enc(vacationData)};
    if(vacationSha)body.sha=vacationSha;
    const r=await fetchWithRetry(`${DATA_API}/${VP}`,{method:'PUT',headers:proxyHeaders(),body:JSON.stringify(body)});
    if(r.ok)vacationSha=(await r.json()).content.sha;
  }catch(_){}
}

async function uploadToGithub(b64, name, fn) {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `Images/${safe}/${fn}`;
  const pure = b64.split(',')[1];
  let sha;
  try {
    const c = await fetchWithRetry(`${SITE_API}/${path}`, { headers: proxyHeaders() });
    if (c.ok) sha = (await c.json()).sha;
  } catch (e) {}
  const body = { message: `Upload ${path}`, content: pure };
  if (sha) body.sha = sha;
  const r = await fetchWithRetry(`${SITE_API}/${path}`, {
    method: 'PUT',
    headers: proxyHeaders(),
    body: JSON.stringify(body)
  }, { retries: 2 });
  if (!r.ok) throw new Error(r.status);
  return `https://raw.githubusercontent.com/${SITE_REPO}/main/${path}`;
}

async function uploadReviewPhoto(b64) {
  const fn = 'rv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg';
  const path = `Images/_reviews/${fn}`;
  const pure = b64.split(',')[1];
  const body = { message: 'Upload review photo', content: pure };
  const r = await fetchWithRetry(`${SITE_API}/${path}`, {
    method: 'PUT',
    headers: proxyHeaders(),
    body: JSON.stringify(body)
  }, { retries: 2 });
  if (!r.ok) throw new Error(r.status);
  return `https://raw.githubusercontent.com/${SITE_REPO}/main/${path}`;
}

async function deleteFromGithub(url) {
  try {
    const m = url.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/[^/]+\/(.+?)(\?|$)/);
    if (!m) return;
    const repo = m[1];
    const filePath = decodeURIComponent(m[2]);
    const api = `${PROXY}/repos/${repo}/contents/${filePath}`;
    const c = await fetchWithRetry(api, { headers: proxyHeaders() });
    if (!c.ok) return;
    await fetchWithRetry(api, {
      method: 'DELETE',
      headers: proxyHeaders(),
      body: JSON.stringify({ message: 'Delete', sha: (await c.json()).sha })
    }, { retries: 2 });
  } catch (e) { console.error('deleteFromGithub error:', e); }
}

/* === Debounced Calendar Save === */
let _calSaveTimer = null;
let _calSaving = false;
let _calSaveQueued = false;
let _calSavingCells = new Set();

function _markCellSaving(td) {
  if (td) { td.classList.add('cal-saving'); _calSavingCells.add(td); }
}

function _clearSavingCells() {
  _calSavingCells.forEach(td => td.classList.remove('cal-saving'));
  _calSavingCells.clear();
}

async function _execCalSave() {
  if (_calSaving) { _calSaveQueued = true; return; }
  _calSaving = true;
  try {
    await saveCalData();
    renderRoster(); renderGrid(); renderHome();
  } finally {
    _calSaving = false;
    _clearSavingCells();
    if (_calSaveQueued) {
      _calSaveQueued = false;
      _execCalSave();
    }
  }
}

function queueCalSave(td, delay) {
  _markCellSaving(td);
  clearTimeout(_calSaveTimer);
  _calSaveTimer = setTimeout(() => _execCalSave(), delay != null ? delay : 800);
}

function flushCalSave() {
  clearTimeout(_calSaveTimer);
  if (_calSavingCells.size > 0 || _calSaveQueued) { _execCalSave(); }
}

/* === Error Boundaries === */
function safeRender(name, fn) {
  try { fn(); }
  catch (e) { console.error(`[${name}] render error:`, e); showToast(`${name} render failed`, 'error'); }
}

function safeCardRender(g, idx, fn) {
  try { return fn(g, idx); }
  catch (e) { console.warn(`[Card] skipped index ${idx} (${g&&g.name||'unnamed'}):`, e); return null; }
}

/* === Error State UI === */
function showErrorState(containerId, message, retryFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="error-state">
    <div class="error-state-icon">!</div>
    <div class="error-state-msg">${message}</div>
    <button class="error-state-retry">${typeof t === 'function' ? t('ui.retry') : 'Retry'}</button>
  </div>`;
  const btn = el.querySelector('.error-state-retry');
  if (btn && retryFn) {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = typeof t === 'function' ? t('ui.retrying') : 'Retrying...';
      try { await retryFn(); }
      catch (e) { btn.disabled = false; btn.textContent = typeof t === 'function' ? t('ui.retry') : 'Retry'; }
    };
  }
}

/* === Offline Detection === */
let _isOffline = !navigator.onLine;

function initOfflineDetection() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  function update() {
    _isOffline = !navigator.onLine;
    banner.classList.toggle('visible', _isOffline);
    if (!_isOffline) showToast(typeof t === 'function' ? t('ui.backOnline') : 'Back online', 'success');
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  if (_isOffline) banner.classList.add('visible');
}

/* === Lazy Loading === */
const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.onload = () => { img.classList.add('lazy-loaded'); img.classList.remove('blur-up'); };
        img.onerror = () => { img.classList.add('lazy-loaded'); img.classList.remove('blur-up'); };
        delete img.dataset.src;
      }
      lazyObserver.unobserve(img);
    }
  });
}, { rootMargin: IS_MOBILE_LITE ? '100px 0px' : '200px 0px', threshold: 0.01 });

function observeLazy(container) {
  if (!container) return;
  container.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));
}

/* Lazy-load iframes (Google Maps etc.) — only connect when scrolled into view */
const iframeLazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const iframe = entry.target;
      if (iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        delete iframe.dataset.src;
      }
      iframeLazyObserver.unobserve(iframe);
    }
  });
}, { rootMargin: '300px 0px', threshold: 0 });

document.querySelectorAll('iframe[data-src]').forEach(f => iframeLazyObserver.observe(f));

function lazyThumb(src, cls, alt, color) {
  const bg=color?' style="background:'+color+'"':'';
  return `<img class="${cls || 'card-thumb'} blur-up" data-src="${src}" alt="${(alt||'').replace(/"/g,'&quot;')}"${bg}>`;
}

function lazyCalAvatar(src, alt) {
  return `<img data-src="${src}" alt="${(alt||'').replace(/"/g,'&quot;')}">`;
}

/* === Card Entrance Animations === */
const entranceObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const card = entry.target;
      const delay = parseInt(card.style.getPropertyValue('--card-index') || 0) * 60;
      card.classList.add('card-enter');
      setTimeout(() => { card.classList.remove('card-enter'); card.classList.add('card-entered'); }, delay + 500);
      entranceObserver.unobserve(card);
    }
  });
}, { rootMargin: '50px 0px', threshold: 0.05 });

function observeEntrance(container) {
  if (!container) return;
  container.querySelectorAll('.girl-card').forEach((card, i) => {
    card.style.setProperty('--card-index', IS_MOBILE_LITE ? 0 : Math.min(i, 8));
    entranceObserver.observe(card);
  });
}

const calEntranceObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const row = entry.target;
      const delay = parseInt(row.style.getPropertyValue('--row-index') || 0) * 50;
      row.classList.add('cal-row-enter');
      setTimeout(() => { row.classList.remove('cal-row-enter'); row.classList.add('cal-row-entered'); }, delay + 400);
      calEntranceObserver.unobserve(row);
    }
  });
}, { rootMargin: '30px 0px', threshold: 0.05 });

function observeCalEntrance(table) {
  if (!table) return;
  table.querySelectorAll('tbody tr').forEach((row, i) => {
    row.style.setProperty('--row-index', Math.min(i, 10));
    calEntranceObserver.observe(row);
  });
}

/* === URL Router (pushState / popstate) === */
/* Handle SPA redirect from 404.html — must run before anything reads location */
(function(){const sp=new URLSearchParams(window.location.search).get('_sp');if(sp)history.replaceState(null,'',BASE_PATH+sp)})();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const Router = (function() {
  const B = BASE_PATH; // '/ginzaempire'
  const PAGE_ROUTES = {
    homePage:       B + '/',
    rosterPage:     B + '/roster',
    listPage:       B + '/girls',
    favoritesPage:  B + '/favorites',
    valuePage:      B + '/rates',
    employmentPage: B + '/employment',
    calendarPage:   B + '/calendar',
    analyticsPage:  B + '/analytics',
    profileDbPage:  B + '/profile-database',
    bookingsPage:   B + '/bookings',
    vacationPage:   B + '/vacation',
    myProfilePage:  B + '/my-profile'
  };
  const PATH_TO_PAGE = {};
  for (const id in PAGE_ROUTES) {
    const rel = PAGE_ROUTES[id].slice(B.length) || '/';
    PATH_TO_PAGE[rel] = id;
  }

  function nameToSlug(name) {
    return encodeURIComponent((name || '').trim().replace(/\s+/g, '-'));
  }
  function slugToName(slug) {
    return decodeURIComponent(slug || '').replace(/-/g, ' ');
  }
  function findGirlByName(name) {
    const lower = name.toLowerCase();
    return girls.findIndex(g => g.name && g.name.trim().toLowerCase() === lower);
  }
  function pathForPage(pageId) {
    return PAGE_ROUTES[pageId] || '/';
  }
  function pathForProfile(idx) {
    const g = girls[idx];
    if (!g || !g.name) return B + '/girls';
    return B + '/girls/' + nameToSlug(g.name);
  }

  let _suppressPush = false;

  function push(path, title) {
    if (_suppressPush) return;
    const t = title || 'Ginza Empire';
    document.title = t;
    const qs = window.location.search;
    const fullPath = path + qs;
    if (window.location.pathname !== path) {
      history.pushState({ path: path }, t, fullPath);
    }
  }

  function replace(path, title) {
    if (_suppressPush) return;
    const t = title || 'Ginza Empire';
    document.title = t;
    history.replaceState({ path: path }, t, path);
  }

  /* Parse current URL and navigate to the right view */
  function resolve() {
    if(typeof queryToFilters==='function')queryToFilters();
    const rawPath = window.location.pathname;
    const path = rawPath.startsWith(B) ? rawPath.slice(B.length) || '/' : rawPath;

    /* Profile deep link: /girls/Some-Name */
    const profileMatch = path.match(/^\/girls\/(.+)$/);
    if (profileMatch) {
      const name = slugToName(profileMatch[1]);
      const idx = findGirlByName(name);
      if (idx >= 0) {
        _suppressPush = true;
        profileReturnPage = 'listPage';
        showProfile(idx);
        _suppressPush = false;
        return true;
      }
      /* Name not found — fall back to girls list */
      _suppressPush = true;
      showPage('listPage');
      _suppressPush = false;
      replace(B + '/girls', 'Ginza – Girls');
      return true;
    }

    /* Roster view deep link: /roster/card or /roster/weekly */
    const rosterMatch = path.match(/^\/roster\/(card|weekly)$/);
    if (rosterMatch) {
      const view = rosterMatch[1];
      rosterViewMode = view === 'weekly' ? 'weekly' : 'grid';
      _suppressPush = true;
      showPage('rosterPage');
      _suppressPush = false;
      return true;
    }

    /* My Profile deep link: /my-profile (own) */
    if (path === '/my-profile') {
      if (!loggedIn) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      _suppressPush = true;
      if (typeof _mpViewUser !== 'undefined') _mpViewUser = loggedInUser;
      showPage('myProfilePage');
      _suppressPush = false;
      return true;
    }

    /* Admin viewing user profile: /profile-database/{username} */
    const pdbUserMatch = path.match(/^\/profile-database\/(.+)$/);
    if (pdbUserMatch) {
      if (!loggedIn || !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      _suppressPush = true;
      if (typeof _mpViewUser !== 'undefined') _mpViewUser = decodeURIComponent(pdbUserMatch[1]);
      showPage('myProfilePage');
      _suppressPush = false;
      return true;
    }

    /* Standard pages */
    const pageId = PATH_TO_PAGE[path];
    if (pageId) {
      if (pageId === 'myProfilePage' && !loggedIn) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'favoritesPage' && !loggedIn) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'calendarPage' && !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'analyticsPage' && !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'profileDbPage' && !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'bookingsPage' && !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'vacationPage' && !isAdmin()) {
        _suppressPush = true;
        showPage('homePage');
        _suppressPush = false;
        replace(B + '/', 'Ginza Empire');
        return true;
      }
      if (pageId === 'rosterPage') {
        rosterViewMode = 'grid';
        _suppressPush = true;
        showPage('rosterPage');
        _suppressPush = false;
        replace(B + '/roster/card', 'Ginza Empire – Roster');
        return true;
      }
      _suppressPush = true;
      showPage(pageId);
      _suppressPush = false;
      return true;
    }

    /* Unknown path — home */
    if (path !== '/') {
      _suppressPush = true;
      showPage('homePage');
      _suppressPush = false;
      replace(B + '/', 'Ginza Empire');
    }
    return true;
  }

  window.addEventListener('popstate', function() { resolve(); });

  return { PAGE_ROUTES, push, replace, resolve, pathForPage, pathForProfile, nameToSlug, slugToName, findGirlByName, BASE: B };
})();

/* === Booking Price Calculation === */
function calcBookingPrice(girlName,startMin,endMin){
  const g=girls.find(x=>x.name===girlName);
  if(!g)return null;
  /* Build sorted tiers: [{mins, price}] from longest to shortest */
  const tiers=[];
  if(g.val3){const p=parseFloat(g.val3);if(!isNaN(p))tiers.push({mins:60,price:p})}
  if(g.val2){const p=parseFloat(g.val2);if(!isNaN(p))tiers.push({mins:45,price:p})}
  if(g.val1){const p=parseFloat(g.val1);if(!isNaN(p))tiers.push({mins:30,price:p})}
  if(!tiers.length)return null;
  /* Greedy: use largest tier first, then fill remainder */
  let remaining=endMin-startMin;
  if(remaining<=0)return null;
  let total=0;
  while(remaining>0){
    const tier=tiers.find(t=>t.mins<=remaining);
    if(tier){total+=tier.price;remaining-=tier.mins}
    else{/* Remaining is less than smallest tier — charge smallest tier */total+=tiers[tiers.length-1].price;break}
  }
  return String(total);
}

/* === Booking Log === */
async function saveBookingLog(entry){
  const _d=new Date(new Date().toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
  const dateStr=_d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
  const path=`${BKLP}/${dateStr}.json`;
  let existing=[],sha=null;
  try{const r=await fetch(`${DATA_API}/${path}`,{headers:proxyHeaders()});console.log('[BKLog] GET status:',r.status);if(r.ok){const d=await r.json();sha=d.sha;console.log('[BKLog] sha:',sha);try{const parsed=dec(d.content);if(Array.isArray(parsed))existing=parsed;}catch(de){console.warn('[BKLog] dec failed:',de.message);}}}catch(ge){console.error('[BKLog] GET error:',ge);}
  if(existing.length>=1000)existing=existing.slice(existing.length-999);
  existing.push({ts:new Date().toISOString(),...entry});
  const body={message:'Log booking',content:enc(existing)};
  if(sha)body.sha=sha;
  try{const pr=await fetch(`${DATA_API}/${path}`,{method:'PUT',headers:proxyHeaders(),body:JSON.stringify(body)});console.log('[BKLog] PUT status:',pr.status);if(!pr.ok){const t=await pr.text();console.error('[BKLog] PUT error body:',t);}}catch(pe){console.error('[BKLog] PUT error:',pe);}
}

/* === Activity Log === */
async function logAdminAction(action,target,meta={}){
  if(!loggedInUser)return;
  const _d=new Date(new Date().toLocaleString('en-US',{timeZone:'Australia/Sydney'}));
  const dateStr=_d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
  const path=`${ALP}/${dateStr}.json`;
  let existing=[],sha=null;
  try{const r=await fetch(`${DATA_API}/${path}`,{headers:proxyHeaders()});if(r.ok){const d=await r.json();sha=d.sha;try{const parsed=dec(d.content);if(Array.isArray(parsed))existing=parsed;}catch(_){}}}catch(_){}
  if(existing.length>=1000)existing=existing.slice(existing.length-999);
  existing.push({ts:new Date().toISOString(),admin:loggedInUser,action,target,...meta});
  const body={message:`Log ${action}`,content:enc(existing)};
  if(sha)body.sha=sha;
  try{await fetch(`${DATA_API}/${path}`,{method:'PUT',headers:proxyHeaders(),body:JSON.stringify(body)})}catch(_){}
}

/* === Privacy Banner (moved from inline for CSP compliance) === */
(function(){try{const K='ginza_privacy_seen';if(localStorage.getItem(K))return;const b=document.getElementById('privacyBanner');if(!b)return;b.style.display='flex';const dismiss=()=>{b.style.display='none';try{localStorage.setItem(K,'1')}catch(e){}};document.getElementById('privacyDismissBtn').onclick=dismiss;}catch(e){}})();

/* === Service Worker Registration === */
if('serviceWorker' in navigator)navigator.serviceWorker.register(BASE_PATH+'/sw.js');

/* === Error Boundary: timeout for skeleton loaders === */
setTimeout(function(){
  document.querySelectorAll('.skeleton-fade').forEach(function(s){
    if(s.offsetParent!==null){
      s.innerHTML='<div class="error-state"><svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style="opacity:.3;margin-bottom:12px"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg><p>Unable to load. Please refresh.</p></div>';
    }
  });
}, 15000);

/* === Lazy-load Admin Module === */
var _adminModulePromise=null;
function loadAdminModule(){
  if(window._adminLoaded)return Promise.resolve();
  if(_adminModulePromise)return _adminModulePromise;
  _adminModulePromise=new Promise(function(resolve,reject){
    var s=document.createElement('script');s.src=BASE_PATH+'/js/admin.js';
    s.onload=resolve;
    s.onerror=function(){_adminModulePromise=null;reject(new Error('Failed to load admin module'))};
    document.head.appendChild(s);
  });
  return _adminModulePromise;
}

/* === Breadcrumb JSON-LD Helper === */
function updateBreadcrumb(items){
  var el=document.getElementById('breadcrumbLd');if(!el)return;
  if(!items||!items.length){el.textContent='';return}
  var list=items.map(function(item,i){return {"@type":"ListItem","position":i+1,"name":item.name,"item":item.url}});
  el.textContent=JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":list});
}

