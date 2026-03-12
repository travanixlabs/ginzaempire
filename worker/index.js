/*
 * Cloudflare Worker — GitHub API Proxy
 *
 * Secrets required (set via Cloudflare dashboard or `wrangler secret put`):
 *   GITHUB_TOKEN — GitHub personal access token (contents read/write scope)
 */

const ALLOWED_ORIGINS = [
  'https://ginzaempire.com',
  'https://www.ginzaempire.com',
  'http://ginzaempire.com',
  'http://www.ginzaempire.com',
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

/* ── Girls Sync (auto-detect new profiles from 479ginza.com.au) ── */

const GIRLS_URL = 'https://479ginza.com.au/Girls';
const GIRLS_PATH = 'data/girls.json';

const COUNTRY_PREFIX = {
  J: 'Japanese', K: 'Korean', T: 'Thai', C: 'Chinese',
  V: 'Vietnamese', M: 'Malaysian', S: 'Singaporean',
};

const LANG_FROM_COUNTRY = {
  Japanese: 'Japanese, Limited English',
  Korean: 'Korean, Limited English',
  Thai: 'Thai, Limited English',
  Chinese: 'Mandarin, Limited English',
  Vietnamese: 'Vietnamese, Limited English',
  Malaysian: 'English',
  Singaporean: 'English',
};

const LABEL_PATTERNS = [
  ['Double Lesbian', /\blesbian\s*double\b/i],
  ['Shower Together', /\bshower\s*together\b/i],
  ['Pussy Slide', /\bpussy\s*slide\b/i],
  ['DFK', /\bDFK\b/],
  ['BBBJ', /\bBBBJ\b/],
  ['DATY', /\bDATY\b/],
  ['69', /\b69\b/],
  ['CIM', /\bCIM\b/],
  ['COB', /\bCOB\b/],
  ['COF', /\bCOF\b/],
  ['Rimming', /\brimming\b/i],
  ['Anal', /\ban[- ]?al\b/i],
  ['Double', /\bdouble\b/i],
  ['Swallow', /\bswallow\b/i],
  ['Filming', /\bfilming\b/i],
  ['GFE', /\bGFE\b/],
  ['PSE', /\bPSE\b/],
  ['Massage', /\bmassage\b/i],
  ['Toys', /\btoys?\b/i],
  ['Costume', /\bcostume\b/i],
];

function extractLabels(desc) {
  if (!desc) return [];
  return LABEL_PATTERNS.filter(([, re]) => re.test(desc)).map(([label]) => label);
}

/**
 * Parse titles like "New J Amu(No Indian)" into { name, country, special }
 *
 * Examples:
 *   "New J Amu(No Indian)"              → { name:"Amu", country:["Japanese"], special:"No Indian" }
 *   "K IU(1HR MINIMUM)"                 → { name:"IU", country:["Korean"],   special:"1HR MINIMUM" }
 *   "New Brazil mix J Jenny(45mins min)" → { name:"Jenny", country:["Japanese"], special:"45mins min" }
 *   "J Umi"                              → { name:"Umi", country:["Japanese"], special:"" }
 */
function parseGirlTitle(raw) {
  let special = '';
  let clean = raw;

  // 1. Extract ALL parenthetical restrictions: "(No Indian)", "(1hr minimum)", etc.
  const parens = [];
  clean = clean.replace(/\(([^)]+)\)/g, (_, inner) => { parens.push(inner.trim()); return ''; }).trim();
  if (parens.length) special = parens.join(', ');

  // 2. Separate restriction text stuck to the name: "Jenny45MINS MINIMUM" → "Jenny 45MINS MINIMUM"
  clean = clean.replace(/([a-zA-Z])(\d+\s*(?:MINS?|HRS?|HOURS?))/gi, '$1 $2');

  // 3. Extract non-parenthesized restrictions: "45MINS MINIMUM", "1HR MINIMUM", etc.
  const minRe = /\b(\d+\s*(?:MINS?|MINUTES?|HRS?|HOURS?)\s*(?:MINIMUM|MIN)?)\b/gi;
  let minM;
  while ((minM = minRe.exec(clean)) !== null) {
    special = special ? special + ', ' + minM[1].trim() : minM[1].trim();
  }
  clean = clean.replace(minRe, '').trim();

  // Restriction phrases without parens: "No Indian", "Asian only"
  const restrictRe = /\b(No\s+\w+|Asian\s+only|Japanese\s+only)\b/gi;
  let rm;
  while ((rm = restrictRe.exec(clean)) !== null) {
    special = special ? special + ', ' + rm[1].trim() : rm[1].trim();
  }
  clean = clean.replace(restrictRe, '').trim();

  // 4. Strip "New" prefix(es)
  clean = clean.replace(/^(New\s+)+/i, '').trim();

  // 5. Split into words — name is the last word, earlier words are prefixes
  const words = clean.split(/\s+/).filter(Boolean);
  let country = [];

  // Check for single-letter country codes in prefix words
  for (const w of words.slice(0, -1)) {
    if (COUNTRY_PREFIX[w]) {
      country = [COUNTRY_PREFIX[w]];
    }
  }

  // If no country code found, check for country keywords in prefix
  if (!country.length && words.length > 1) {
    const prefix = words.slice(0, -1).join(' ').toLowerCase();
    if (prefix.includes('japan')) country = ['Japanese'];
    else if (prefix.includes('korea')) country = ['Korean'];
    else if (prefix.includes('thai')) country = ['Thai'];
    else if (prefix.includes('chin')) country = ['Chinese'];
    else if (prefix.includes('vietnam')) country = ['Vietnamese'];
    else if (prefix.includes('brazil')) country = ['Brazilian'];
    else if (prefix.includes('malay')) country = ['Malaysian'];
  }

  // Name is the last word, clean up dots (e.g. "I.U" → "IU")
  let name = (words[words.length - 1] || '').replace(/\./g, '');

  return { name, country, special };
}

/**
 * Scrape the /Girls listing page → array of card objects
 */
async function scrapeGirlsListing() {
  const resp = await fetch(GIRLS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GinzaBot/1.0)' },
  });
  if (!resp.ok) throw new Error(`Girls listing fetch failed: ${resp.status}`);
  const html = await resp.text();

  const cards = [];
  // Each card: <a href="/Girls/5569" ...> ... <h3>New J Amu(No Indian)</h3> ... </a>
  const cardRe = /<a\s+href="\/Girls\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const id = m[1];
    const cardHtml = m[2];

    const h3 = cardHtml.match(/<h3>(.*?)<\/h3>/);
    if (!h3) continue;
    const rawTitle = h3[1].replace(/<[^>]*>/g, '').trim();
    const parsed = parseGirlTitle(rawTitle);
    if (!parsed.name) continue;

    const age    = (cardHtml.match(/Age:(\d+)/)        || [])[1] || '';
    const body   = (cardHtml.match(/Body Size:(\d+)/)   || [])[1] || '';
    const cup    = (cardHtml.match(/Cup Size:([\w\-]+)/) || [])[1] || '';
    const height = (cardHtml.match(/Height:(\d+)/)       || [])[1] || '';

    cards.push({ id, ...parsed, age, body, cup, height });
  }
  return cards;
}

/**
 * Scrape an individual profile page for booking prices, images, description
 */
async function scrapeGirlProfile(id) {
  const resp = await fetch(`${GIRLS_URL}/${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GinzaBot/1.0)' },
  });
  if (!resp.ok) throw new Error(`Profile fetch ${resp.status} for /Girls/${id}`);
  const html = await resp.text();

  // Booking: "170,230,270" or "180.250.290" — may use <dd>, <label>, or plain text
  const bk = html.match(/Booking:?\s*<\/(?:label|dt)>\s*<dd>\s*([\d,.\/ ]+)/i)
          || html.match(/Booking:<\/label>\s*([\d,.\/ ]+)/i)
          || html.match(/Booking:\s*([\d,.\/ ]+)/i);
  let val1 = '', val2 = '', val3 = '';
  if (bk) {
    const p = bk[1].trim().split(/[,.\/ ]+/);
    val1 = p[0] || ''; val2 = p[1] || ''; val3 = p[2] || '';
  }

  // Height from profile page <dd> tag
  const htMatch = html.match(/Height:?\s*<\/(?:label|dt)>\s*<dd>\s*(1[3-9]\d|20\d)/i)
               || html.match(/Height:<\/label>\s*(1[3-9]\d|20\d)/i);
  const profileHeight = htMatch ? htMatch[1] : '';

  // Type: <label>Type:</label>Natural busty, very friendly
  const typeMatch = html.match(/Type:<\/label>\s*([^<]+)/i);
  const profileType = typeMatch ? typeMatch[1].replace(/&nbsp;/g, ' ').trim() : '';

  // Language: <label>Language:</label>Japanese, Limited English
  const langMatch = html.match(/Language:<\/label>\s*([^<]+)/i);
  const profileLang = langMatch ? langMatch[1].replace(/&nbsp;/g, ' ').trim() : '';

  // Speciality (maps to exp): <label>Speciality:</label>Inexperienced
  const expMatch = html.match(/Speciality:<\/label>\s*([^<]+)/i)
                || html.match(/Experience:<\/label>\s*([^<]+)/i);
  const profileExp = expMatch ? expMatch[1].replace(/&nbsp;/g, ' ').trim() : '';

  // Full-size images: <a href="/data/upload/...jpeg"> (skip thumbnails ending in 's.jpeg')
  const imgRe = /<a[^>]+href="(\/data\/upload\/[^"]+\.\w+)"[^>]*>/gi;
  const images = [];
  let im;
  while ((im = imgRe.exec(html)) !== null) {
    const src = im[1];
    if (/s\.\w+$/i.test(src)) continue; // skip thumbnail variants
    if (/\.(jpe?g|png|webp)$/i.test(src)) {
      images.push('https://479ginza.com.au' + src);
    }
  }

  // Description: try several common container patterns
  let desc = '';
  const descPatterns = [
    /<div class="(?:about|description|text|info-text|detail)"[^>]*>([\s\S]*?)<\/div>/i,
    /<div class="row"><label>(?:Description|About|Info):<\/label>\s*([\s\S]*?)<\/div>/i,
  ];
  for (const re of descPatterns) {
    const dm = html.match(re);
    if (dm) {
      desc = dm[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (desc) break;
    }
  }

  // Fallback: grab any long text block that looks like a description
  if (!desc) {
    const textBlocks = html.match(/<(?:p|div)[^>]*>([^<]{80,})<\/(?:p|div)>/gi);
    if (textBlocks && textBlocks.length) {
      const longest = textBlocks.sort((a, b) => b.length - a.length)[0];
      desc = longest.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return { val1, val2, val3, images, desc, profileHeight, profileType, profileLang, profileExp };
}

/**
 * Convert ArrayBuffer to base64 (chunk-safe for large images)
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 32768) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)));
  }
  return btoa(chunks.join(''));
}

/**
 * Download an image from a URL and upload it to GitHub repo
 */
async function uploadImage(env, imageUrl, repoPath) {
  const resp = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GinzaBot/1.0)' },
  });
  if (!resp.ok) throw new Error(`Image fetch ${resp.status}`);

  const buffer = await resp.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  // Check if file already exists (to get sha for update)
  let sha = null;
  try {
    const r = await fetch(`${GH_API}/repos/${REPO}/contents/${repoPath}`, { headers: ghHeaders(env) });
    if (r.ok) sha = (await r.json()).sha;
  } catch {}

  const body = { message: `Add ${repoPath}`, content: base64 };
  if (sha) body.sha = sha;

  const r = await fetch(`${GH_API}/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: ghHeaders(env),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Image upload ${r.status} for ${repoPath}`);

  return `https://raw.githubusercontent.com/${REPO}/main/${repoPath}`;
}

/**
 * Main sync: detect new girls, scrape profiles, upload images, update girls.json
 */
async function syncNewGirls(env) {
  const { content: existing, sha } = await ghGet(env, GIRLS_PATH);
  const knownNames = new Set(existing.map(g => g.name));
  const knownUrls = new Set(existing.map(g => g.oldUrl).filter(Boolean));

  const cards = await scrapeGirlsListing();
  const newCards = cards.filter(c => {
    const url = `https://479ginza.com.au/Girls/${c.id}`;
    return !knownNames.has(c.name) && !knownUrls.has(url);
  });

  if (newCards.length === 0) {
    console.log('Girls sync: no new profiles');
    return { added: 0, names: [] };
  }

  console.log(`Girls sync: ${newCards.length} new profile(s) found`);
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const addedNames = [];

  for (const card of newCards) {
    try {
      await new Promise(r => setTimeout(r, 1000)); // polite delay
      const profile = await scrapeGirlProfile(card.id);

      // Download & upload images, renaming to Name_1.jpeg, Name_2.jpeg, ...
      const photos = [];
      for (let i = 0; i < profile.images.length; i++) {
        try {
          const ext = (profile.images[i].match(/\.(jpe?g|png|webp)$/i) || [])[1] || 'jpeg';
          const path = `Images/${card.name}/${card.name}_${i + 1}.${ext}`;
          const ghUrl = await uploadImage(env, profile.images[i], path);
          photos.push(ghUrl);
          await new Promise(r => setTimeout(r, 500)); // delay between uploads
        } catch (e) {
          console.error(`Image error ${card.name} #${i + 1}: ${e.message}`);
        }
      }

      // Build the entry matching the girls.json schema
      const entry = {
        name: card.name,
        country: card.country.length ? card.country : undefined,
        age: card.age || undefined,
        body: card.body || undefined,
        height: card.height || profile.profileHeight || undefined,
        cup: card.cup || undefined,
        val1: profile.val1 || undefined,
        val2: profile.val2 || undefined,
        val3: profile.val3 || undefined,
      };
      if (card.special) entry.special = card.special;
      entry.exp = profile.profileExp || 'Inexperienced';
      entry.startDate = todayStr;
      entry.lang = profile.profileLang || (card.country.length ? LANG_FROM_COUNTRY[card.country[0]] || '' : '');
      entry.oldUrl = `https://479ginza.com.au/Girls/${card.id}`;
      entry.type = profile.profileType || '';
      entry.desc = profile.desc || '';
      entry.photos = photos;
      entry.labels = extractLabels(profile.desc);
      entry.lastModified = now;

      // Clean undefined values but keep empty arrays/strings for required fields
      for (const k of Object.keys(entry)) {
        if (entry[k] === undefined) delete entry[k];
      }

      existing.push(entry);
      addedNames.push(card.name);
      console.log(`Girls sync: added ${card.name} (${photos.length} photos)`);
    } catch (e) {
      console.error(`Failed to process ${card.name}: ${e.message}`);
    }
  }

  if (addedNames.length > 0) {
    await ghPut(env, GIRLS_PATH, existing, sha,
      `Auto-sync new girls: ${addedNames.join(', ')}`);
    console.log(`Girls sync: girls.json updated with ${addedNames.length} new profile(s)`);
  }

  return { added: addedNames.length, names: addedNames };
}

/* ── Sitemap Generation ── */

async function generateSitemap(env) {
  const { content: girlsData } = await ghGet(env, 'data/girls.json');
  const today = fmtDate(getAEDTDate());
  const base = 'https://ginzaempire.com';
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

    // Girls sync (admin trigger)
    if (url.pathname === '/sync-girls' && request.method === 'POST') {
      try {
        const result = await syncNewGirls(env);
        return jsonResp(result, 200, origin);
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

    // 9:00 UTC = 7pm AEST — girls sync (new profiles)
    if (hour === 9) {
      ctx.waitUntil(
        syncNewGirls(env).catch(e => console.error('Girls sync error:', e))
      );
    }

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
