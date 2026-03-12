/*
 * Cloudflare Worker — GitHub API Proxy
 *
 * Secrets required (set via Cloudflare dashboard or `wrangler secret put`):
 *   GITHUB_TOKEN — GitHub personal access token (contents read/write scope)
 */

const ALLOWED_ORIGINS = [
  'https://ginzaempire.com',
  'https://www.ginzaempire.com',
  'https://travanixlabs.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
];

const REPO = 'travanixlabs/ginzaempire';
const DATA_REPO = REPO;
const GH_API = 'https://api.github.com';

/* ── Helpers ── */

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '300',
  };
}

function jsonResp(obj, status = 200, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function decContent(base64) {
  const raw = atob(base64.replace(/\n/g, ''));
  return JSON.parse(decodeURIComponent(escape(raw)));
}

function encContent(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
}

function getAEDTDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
}

function fmtDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function nameToSlug(name) {
  return encodeURIComponent((name || '').trim().replace(/\s+/g, '-'));
}

/* ── GitHub API ── */

function ghHeaders(env) {
  return {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'travanixlabs-worker',
    'Content-Type': 'application/json',
  };
}

async function ghGet(env, path) {
  const r = await fetch(`${GH_API}/repos/${DATA_REPO}/contents/${path}`, {
    headers: ghHeaders(env),
  });
  if (!r.ok) throw new Error(`GitHub GET ${r.status} ${path}`);
  const d = await r.json();
  return { content: decContent(d.content), sha: d.sha };
}

async function ghPut(env, path, content, sha, message) {
  const body = { message, content: encContent(content) };
  if (sha) body.sha = sha;
  const r = await fetch(`${GH_API}/repos/${DATA_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: ghHeaders(env),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status} ${path}`);
  return r.json();
}

/* ── Roster Scraper ── */

const ROSTER_URL = 'https://479ginza.com.au/Roster';
const CALENDAR_PATH = 'data/calendar.json';

const MONTH_MAP = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseTime12to24(timeStr) {
  const m = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const pm = m[3].toLowerCase() === 'pm';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

function resolveDate(day, monthName) {
  const now = getAEDTDate();
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (month === undefined) return null;
  let year = now.getFullYear();
  // If the month is far in the past, it's probably next year
  if (month < now.getMonth() - 2) year++;
  const d = new Date(year, month, day);
  return fmtDate(d);
}

async function scrapeRoster() {
  const resp = await fetch(ROSTER_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GinzaBot/1.0)' },
  });
  if (!resp.ok) throw new Error(`Roster fetch failed: ${resp.status}`);
  const html = await resp.text();

  // Strip HTML tags, decode entities
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/g, '');

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Parse day headers: "Happy Thursday 12th of March"
  const dayHeaderRe = /Happy\s+\w+\s+(\d+)\w*\s+of\s+(\w+)/i;
  // Parse girl entries: "... Name 10:30am-7pm ..."
  const entryRe = /(\w[\w .]*?)\s+(\d{1,2}(?::\d{2})?[ap]m)-(\d{1,2}(?::\d{2})?[ap]m)/i;

  const result = {}; // { dateStr: [ { name, start, end } ] }
  let currentDate = null;

  for (const line of lines) {
    const dayMatch = line.match(dayHeaderRe);
    if (dayMatch) {
      currentDate = resolveDate(parseInt(dayMatch[1], 10), dayMatch[2]);
      continue;
    }
    if (!currentDate) continue;

    const entryMatch = line.match(entryRe);
    if (entryMatch) {
      // Extract just the last word as the name (handles prefixes like "New New J")
      const rawName = entryMatch[1].trim();
      // The name is the last word in the prefix, e.g. "New New J Sonata" → "Sonata"
      const nameParts = rawName.split(/\s+/);
      const name = nameParts[nameParts.length - 1].replace(/\./g, ''); // "I.U" → "IU"
      if (name.toLowerCase() === 'open') continue; // skip "OPEN 10:20am-4am"

      const start = parseTime12to24(entryMatch[2]);
      const end = parseTime12to24(entryMatch[3]);
      if (!start || !end) continue;

      if (!result[currentDate]) result[currentDate] = [];
      result[currentDate].push({ name, start, end });
    }
  }

  return result;
}

async function syncRosterToCalendar(env) {
  const scraped = await scrapeRoster();
  if (Object.keys(scraped).length === 0) {
    console.log('Roster scrape: no data found');
    return false;
  }

  // Load existing calendar
  const { content: calendar, sha } = await ghGet(env, CALENDAR_PATH);

  // Load girls.json to get valid names
  const { content: girls } = await ghGet(env, 'data/girls.json');
  const validNames = new Set(girls.map(g => g.name));

  let changed = false;

  for (const [dateStr, entries] of Object.entries(scraped)) {
    for (const { name, start, end } of entries) {
      // Only update if name exists in girls.json
      if (!validNames.has(name)) continue;

      if (!calendar[name]) calendar[name] = {};

      const existing = calendar[name][dateStr];
      if (!existing || existing.start !== start || existing.end !== end) {
        calendar[name][dateStr] = { start, end };
        changed = true;
      }
    }
  }

  // Auto-publish scraped dates
  if (!Array.isArray(calendar._published)) calendar._published = [];
  for (const dateStr of Object.keys(scraped)) {
    if (!calendar._published.includes(dateStr)) {
      calendar._published.push(dateStr);
      changed = true;
    }
  }
  calendar._published.sort();

  if (!changed) {
    console.log('Roster sync: no changes needed');
    return true;
  }

  await ghPut(env, CALENDAR_PATH, calendar, sha, 'Auto-sync roster from 479ginza.com.au');
  console.log('Roster sync: calendar.json updated');
  return true;
}

/* ── Sitemap Generation ── */

async function generateSitemap(env) {
  const { content: girlsData } = await ghGet(env, 'data/girls.json');
  const today = fmtDate(getAEDTDate());
  const base = 'https://travanixlabs.github.io/ginzaempire';
  const pages = [
    { loc: '/',           freq: 'daily',   pri: '1.0' },
    { loc: '/roster/card',   freq: 'daily',   pri: '0.9' },
    { loc: '/roster/weekly', freq: 'daily',   pri: '0.8' },
    { loc: '/girls',      freq: 'daily',   pri: '0.9' },
    { loc: '/rates',      freq: 'weekly',  pri: '0.7' },
    { loc: '/employment', freq: 'monthly', pri: '0.5' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const p of pages) {
    xml += `  <url>\n    <loc>${base}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.pri}</priority>\n  </url>\n`;
  }
  for (const g of girlsData) {
    if (!g.name || g.hidden) continue;
    const slug = nameToSlug(g.name);
    const lastmod = g.lastModified ? g.lastModified.split('T')[0] : today;
    xml += `  <url>\n    <loc>${base}/girls/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  xml += '</urlset>\n';
  return xml;
}

async function commitSitemap(env) {
  const xml = await generateSitemap(env);
  const SITE_REPO = REPO;
  const path = 'sitemap.xml';
  // Fetch current sha
  let sha = null;
  try {
    const r = await fetch(`${GH_API}/repos/${SITE_REPO}/contents/${path}`, { headers: ghHeaders(env) });
    if (r.ok) { const d = await r.json(); sha = d.sha; }
  } catch {}
  const body = { message: 'Update sitemap.xml', content: btoa(unescape(encodeURIComponent(xml))) };
  if (sha) body.sha = sha;
  const r = await fetch(`${GH_API}/repos/${SITE_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: ghHeaders(env),
    body: JSON.stringify(body),
  });
  return r.ok;
}

/* ── Rate Limiting (sliding window, per-isolate) ── */

const RATE_LIMIT_WINDOW = 60_000;         // 1 minute window
const RATE_LIMIT_MAX_READ = 120;          // GET requests per window per IP
const RATE_LIMIT_MAX_WRITE = 30;          // PUT/POST/DELETE per window per IP
const rateBuckets = new Map();            // ip → { reads: [{ts}], writes: [{ts}] }

function isRateLimited(ip, isWrite) {
  const now = Date.now();
  if (!rateBuckets.has(ip)) {
    rateBuckets.set(ip, { reads: [], writes: [] });
  }
  const bucket = rateBuckets.get(ip);
  // Prune expired entries
  bucket.reads = bucket.reads.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  bucket.writes = bucket.writes.filter(ts => now - ts < RATE_LIMIT_WINDOW);

  if (isWrite) {
    if (bucket.writes.length >= RATE_LIMIT_MAX_WRITE) return true;
    bucket.writes.push(now);
  } else {
    if (bucket.reads.length >= RATE_LIMIT_MAX_READ) return true;
    bucket.reads.push(now);
  }

  // Evict old IPs to prevent memory buildup (keep max 5000)
  if (rateBuckets.size > 5000) {
    const oldest = rateBuckets.keys().next().value;
    rateBuckets.delete(oldest);
  }

  return false;
}

/* ── GitHub API Proxy (existing logic) ── */

async function handleProxy(request, env, pathname, origin) {
  const ghUrl = `${GH_API}${pathname}`;
  const headers = {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: request.headers.get('Accept') || 'application/vnd.github.v3+json',
    'User-Agent': 'travanixlabs-worker',
  };
  if (request.method === 'PUT' || request.method === 'POST' || request.method === 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const ghResp = await fetch(ghUrl, init);
  const respHeaders = { ...corsHeaders(origin), 'Content-Type': ghResp.headers.get('Content-Type') || 'application/json' };
  return new Response(ghResp.body, { status: ghResp.status, headers: respHeaders });
}

/* ── Enquiry Submission ── */

const ENQUIRY_PATH = 'data/enquiries.json';
const ENQUIRY_RATE = new Map();
const ENQUIRY_MAX_PER_HOUR = 5;

async function handleSubmitEnquiry(request, env, origin) {
  if (request.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405, origin);

  const xrw = request.headers.get('X-Requested-With');
  if (xrw !== 'XMLHttpRequest') return jsonResp({ error: 'forbidden' }, 403, origin);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  if (!ENQUIRY_RATE.has(ip)) ENQUIRY_RATE.set(ip, []);
  const timestamps = ENQUIRY_RATE.get(ip).filter(t => now - t < 3600000);
  if (timestamps.length >= ENQUIRY_MAX_PER_HOUR) {
    return jsonResp({ error: 'Too many enquiries. Please try again later.' }, 429, origin);
  }
  timestamps.push(now);
  ENQUIRY_RATE.set(ip, timestamps);
  if (ENQUIRY_RATE.size > 5000) { ENQUIRY_RATE.delete(ENQUIRY_RATE.keys().next().value); }

  let data;
  try { data = await request.json(); } catch { return jsonResp({ error: 'invalid body' }, 400, origin); }

  if (!data.girlName || !data.customerName) {
    return jsonResp({ error: 'missing required fields' }, 400, origin);
  }
  if (!data.phone && !data.email) {
    return jsonResp({ error: 'phone or email required' }, 400, origin);
  }

  try {
    let existing = [], sha = null;
    try {
      const r = await ghGet(env, ENQUIRY_PATH);
      existing = r.content;
      sha = r.sha;
    } catch { /* file doesn't exist yet */ }

    if (existing.length >= 200) existing = existing.slice(existing.length - 199);
    existing.push({
      girlName: data.girlName,
      customerName: data.customerName,
      phone: data.phone || '',
      email: data.email || '',
      date: data.date || '',
      time: data.time || '',
      duration: data.duration || 45,
      message: data.message || '',
      lang: data.lang || 'en',
      ts: data.ts || new Date().toISOString(),
      username: data.username || null,
      status: 'new',
    });

    await ghPut(env, ENQUIRY_PATH, existing, sha, 'New enquiry');
    return jsonResp({ success: true }, 200, origin);
  } catch (e) {
    console.error('Enquiry error:', e);
    return jsonResp({ error: 'internal error' }, 500, origin);
  }
}

/* ── Main Export ── */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Resolve origin for all requests
    const origin = getAllowedOrigin(request);
    const rawOrigin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!origin && rawOrigin) return new Response('Forbidden', { status: 403 });
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Origin check — only allow requests from the site (skip for scheduled triggers)
    if (rawOrigin && !origin) {
      return jsonResp({ error: 'forbidden origin' }, 403, origin);
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const isWrite = request.method !== 'GET' && request.method !== 'HEAD';
    if (isRateLimited(ip, isWrite)) {
      const retryAfter = Math.ceil(RATE_LIMIT_WINDOW / 1000);
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          ...corsHeaders(origin),
        },
      });
    }

    // Update view history
    if (url.pathname === '/update-view-history' && request.method === 'POST') {
      try {
        const xrw = request.headers.get('X-Requested-With');
        if (xrw !== 'XMLHttpRequest') return jsonResp({ error: 'forbidden' }, 403, origin);
        const { username, history } = await request.json();
        if (!username || !Array.isArray(history)) return jsonResp({ error: 'invalid' }, 400, origin);
        const authResult = await ghGet(env, 'data/auth.json');
        const users = authResult.content;
        const user = users.find(u => u.user === username);
        if (!user) return jsonResp({ error: 'user not found' }, 404, origin);
        user.viewHistory = history.slice(0, 10).map(h => ({ name: h.name, ts: h.ts }));
        await ghPut(env, 'data/auth.json', users, authResult.sha, 'Update view history');
        return jsonResp({ success: true }, 200, origin);
      } catch (e) { return jsonResp({ error: e.message }, 500, origin); }
    }

    // Enquiry submission
    if (url.pathname === '/submit-enquiry' && request.method === 'POST') {
      return handleSubmitEnquiry(request, env, origin);
    }

    // Sitemap regeneration (admin trigger)
    if (url.pathname === '/generate-sitemap' && request.method === 'POST') {
      try {
        const ok = await commitSitemap(env);
        return jsonResp({ success: ok }, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }

    // Roster sync (admin trigger)
    if (url.pathname === '/sync-roster' && request.method === 'POST') {
      try {
        const ok = await syncRosterToCalendar(env);
        return jsonResp({ success: ok }, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }

    // GitHub API proxy (/repos/...)
    if (url.pathname.startsWith('/repos/')) {
      return handleProxy(request, env, url.pathname, origin);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
  },

  async scheduled(event, env, ctx) {
    const hour = new Date(event.scheduledTime).getUTCHours();

    // 10:00 UTC = 8pm AEST (or 9pm AEDT) — roster sync
    if (hour === 10) {
      ctx.waitUntil(
        syncRosterToCalendar(env).catch(e => console.error('Roster sync error:', e))
      );
    }

    // 21:00 UTC = 8am AEDT — sitemap update
    if (hour === 21) {
      ctx.waitUntil(
        commitSitemap(env).catch(e => console.error('Sitemap error:', e))
      );
    }
  },
};
