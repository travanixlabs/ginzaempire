/*
 * Cloudflare Worker — GitHub API Proxy
 *
 * Secrets required (set via Cloudflare dashboard or `wrangler secret put`):
 *   GITHUB_TOKEN — GitHub personal access token (contents read/write scope)
 */

const ALLOWED_ORIGINS = [
  'https://sydneyginza.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
];

let _reqOrigin = ALLOWED_ORIGINS[0];

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}
const REPO = 'sydneyginza/sydneyginza.github.io';
const DATA_REPO = REPO;
const GH_API = 'https://api.github.com';

/* ── Helpers ── */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': _reqOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
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
    'User-Agent': 'sydneyginza-worker',
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

/* ── Sitemap Generation ── */

async function generateSitemap(env) {
  const { content: girlsData } = await ghGet(env, 'data/girls.json');
  const today = fmtDate(getAEDTDate());
  const base = 'https://sydneyginza.github.io';
  const pages = [
    { loc: '/',           freq: 'daily',   pri: '1.0' },
    { loc: '/roster',     freq: 'daily',   pri: '0.9' },
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

async function handleProxy(request, env, pathname) {
  const ghUrl = `${GH_API}${pathname}`;
  const headers = {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: request.headers.get('Accept') || 'application/vnd.github.v3+json',
    'User-Agent': 'sydneyginza-worker',
  };
  if (request.method === 'PUT' || request.method === 'POST' || request.method === 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const ghResp = await fetch(ghUrl, init);
  const respHeaders = { ...corsHeaders(), 'Content-Type': ghResp.headers.get('Content-Type') || 'application/json' };
  return new Response(ghResp.body, { status: ghResp.status, headers: respHeaders });
}

/* ── Enquiry Submission ── */

const ENQUIRY_PATH = 'data/enquiries.json';
const ENQUIRY_RATE = new Map();
const ENQUIRY_MAX_PER_HOUR = 5;

async function handleSubmitEnquiry(request, env) {
  if (request.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  const xrw = request.headers.get('X-Requested-With');
  if (xrw !== 'XMLHttpRequest') return jsonResp({ error: 'forbidden' }, 403);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  if (!ENQUIRY_RATE.has(ip)) ENQUIRY_RATE.set(ip, []);
  const timestamps = ENQUIRY_RATE.get(ip).filter(t => now - t < 3600000);
  if (timestamps.length >= ENQUIRY_MAX_PER_HOUR) {
    return jsonResp({ error: 'Too many enquiries. Please try again later.' }, 429);
  }
  timestamps.push(now);
  ENQUIRY_RATE.set(ip, timestamps);
  if (ENQUIRY_RATE.size > 5000) { ENQUIRY_RATE.delete(ENQUIRY_RATE.keys().next().value); }

  let data;
  try { data = await request.json(); } catch { return jsonResp({ error: 'invalid body' }, 400); }

  if (!data.girlName || !data.customerName) {
    return jsonResp({ error: 'missing required fields' }, 400);
  }
  if (!data.phone && !data.email) {
    return jsonResp({ error: 'phone or email required' }, 400);
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
    return jsonResp({ success: true });
  } catch (e) {
    console.error('Enquiry error:', e);
    return jsonResp({ error: 'internal error' }, 500);
  }
}

/* ── Main Export ── */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Resolve origin for all requests (including preflight)
    const origin = getAllowedOrigin(request);
    const rawOrigin = request.headers.get('Origin');
    _reqOrigin = origin || ALLOWED_ORIGINS[0];

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!origin && rawOrigin) return new Response('Forbidden', { status: 403 });
      return new Response(null, { headers: corsHeaders() });
    }

    // Origin check — only allow requests from the site (skip for scheduled triggers)
    if (rawOrigin && !origin) {
      return jsonResp({ error: 'forbidden origin' }, 403);
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
          ...corsHeaders(),
        },
      });
    }

    // Update view history
    if (url.pathname === '/update-view-history' && request.method === 'POST') {
      try {
        const xrw = request.headers.get('X-Requested-With');
        if (xrw !== 'XMLHttpRequest') return jsonResp({ error: 'forbidden' }, 403);
        const { username, history } = await request.json();
        if (!username || !Array.isArray(history)) return jsonResp({ error: 'invalid' }, 400);
        const authResult = await ghGet(env, 'data/auth.json');
        const users = authResult.content;
        const user = users.find(u => u.user === username);
        if (!user) return jsonResp({ error: 'user not found' }, 404);
        user.viewHistory = history.slice(0, 10).map(h => ({ name: h.name, ts: h.ts }));
        await ghPut(env, 'data/auth.json', users, authResult.sha, 'Update view history');
        return jsonResp({ success: true });
      } catch (e) { return jsonResp({ error: e.message }, 500); }
    }

    // Enquiry submission
    if (url.pathname === '/submit-enquiry' && request.method === 'POST') {
      return handleSubmitEnquiry(request, env);
    }

    // Sitemap regeneration (admin trigger)
    if (url.pathname === '/generate-sitemap' && request.method === 'POST') {
      try {
        const ok = await commitSitemap(env);
        return jsonResp({ success: ok });
      } catch (e) {
        return jsonResp({ error: e.message }, 500);
      }
    }

    // GitHub API proxy (/repos/...)
    if (url.pathname.startsWith('/repos/')) {
      return handleProxy(request, env, url.pathname);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      commitSitemap(env).catch(e => console.error('Sitemap error:', e))
    );
  },
};
