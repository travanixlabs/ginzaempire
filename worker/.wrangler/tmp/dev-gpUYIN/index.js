var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-vWBo6y/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// index.js
var ALLOWED_ORIGINS = [
  "https://ginzaempire.com",
  "https://www.ginzaempire.com",
  "http://ginzaempire.com",
  "http://www.ginzaempire.com",
  "https://travanixlabs.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501"
];
var REPO = "travanixlabs/ginzaempire";
var DATA_REPO = REPO;
var GH_API = "https://api.github.com";
function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}
__name(getAllowedOrigin, "getAllowedOrigin");
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "300"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResp(obj, status = 200, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(jsonResp, "jsonResp");
function decContent(base64) {
  const raw = atob(base64.replace(/\n/g, ""));
  return JSON.parse(decodeURIComponent(escape(raw)));
}
__name(decContent, "decContent");
function encContent(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
}
__name(encContent, "encContent");
function getAEDTDate() {
  return new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
}
__name(getAEDTDate, "getAEDTDate");
function fmtDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
__name(fmtDate, "fmtDate");
function nameToSlug(name) {
  return encodeURIComponent((name || "").trim().replace(/\s+/g, "-"));
}
__name(nameToSlug, "nameToSlug");
function ghHeaders(env) {
  return {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "travanixlabs-worker",
    "Content-Type": "application/json"
  };
}
__name(ghHeaders, "ghHeaders");
async function ghGet(env, path) {
  const r = await fetch(`${GH_API}/repos/${DATA_REPO}/contents/${path}`, {
    headers: ghHeaders(env)
  });
  if (!r.ok) throw new Error(`GitHub GET ${r.status} ${path}`);
  const d = await r.json();
  return { content: decContent(d.content), sha: d.sha };
}
__name(ghGet, "ghGet");
async function ghPut(env, path, content, sha, message) {
  const body = { message, content: encContent(content) };
  if (sha) body.sha = sha;
  const r = await fetch(`${GH_API}/repos/${DATA_REPO}/contents/${path}`, {
    method: "PUT",
    headers: ghHeaders(env),
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status} ${path}`);
  return r.json();
}
__name(ghPut, "ghPut");
var ROSTER_URL = "https://479ginza.com.au/Roster";
var CALENDAR_PATH = "data/calendar.json";
var MONTH_MAP = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};
function parseTime12to24(timeStr) {
  const m = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([ap]m)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const pm = m[3].toLowerCase() === "pm";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}
__name(parseTime12to24, "parseTime12to24");
function resolveDate(day, monthName) {
  const now = getAEDTDate();
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (month === void 0) return null;
  let year = now.getFullYear();
  if (month < now.getMonth() - 2) year++;
  const d = new Date(year, month, day);
  return fmtDate(d);
}
__name(resolveDate, "resolveDate");
async function scrapeRoster() {
  const resp = await fetch(ROSTER_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GinzaBot/1.0)" }
  });
  if (!resp.ok) throw new Error(`Roster fetch failed: ${resp.status}`);
  const html = await resp.text();
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").replace(/&[a-z]+;/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const dayHeaderRe = /Happy\s+\w+\s+(\d+)\w*\s+of\s+(\w+)/i;
  const entryRe = /(\w[\w .]*?)\s+(\d{1,2}(?::\d{2})?[ap]m)-(\d{1,2}(?::\d{2})?[ap]m)/i;
  const result = {};
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
      const rawName = entryMatch[1].trim();
      const nameParts = rawName.split(/\s+/);
      const name = nameParts[nameParts.length - 1].replace(/\./g, "");
      if (name.toLowerCase() === "open") continue;
      const start = parseTime12to24(entryMatch[2]);
      const end = parseTime12to24(entryMatch[3]);
      if (!start || !end) continue;
      if (!result[currentDate]) result[currentDate] = [];
      result[currentDate].push({ name, start, end });
    }
  }
  return result;
}
__name(scrapeRoster, "scrapeRoster");
async function syncRosterToCalendar(env) {
  const scraped = await scrapeRoster();
  if (Object.keys(scraped).length === 0) {
    console.log("Roster scrape: no data found");
    return false;
  }
  const { content: calendar, sha } = await ghGet(env, CALENDAR_PATH);
  const { content: girls } = await ghGet(env, "data/girls.json");
  const validNames = new Set(girls.map((g) => g.name));
  let changed = false;
  for (const [dateStr, entries] of Object.entries(scraped)) {
    for (const { name, start, end } of entries) {
      if (!validNames.has(name)) continue;
      if (!calendar[name]) calendar[name] = {};
      const existing = calendar[name][dateStr];
      if (!existing || existing.start !== start || existing.end !== end) {
        calendar[name][dateStr] = { start, end };
        changed = true;
      }
    }
  }
  if (!Array.isArray(calendar._published)) calendar._published = [];
  for (const dateStr of Object.keys(scraped)) {
    if (!calendar._published.includes(dateStr)) {
      calendar._published.push(dateStr);
      changed = true;
    }
  }
  calendar._published.sort();
  if (!changed) {
    console.log("Roster sync: no changes needed");
    return true;
  }
  await ghPut(env, CALENDAR_PATH, calendar, sha, "Auto-sync roster from 479ginza.com.au");
  console.log("Roster sync: calendar.json updated");
  return true;
}
__name(syncRosterToCalendar, "syncRosterToCalendar");
var GIRLS_URL = "https://479ginza.com.au/Girls";
var GIRLS_PATH = "data/girls.json";
var COUNTRY_PREFIX = {
  J: "Japanese",
  K: "Korean",
  T: "Thai",
  C: "Chinese",
  V: "Vietnamese",
  M: "Malaysian",
  S: "Singaporean"
};
var LANG_FROM_COUNTRY = {
  Japanese: "Japanese, Limited English",
  Korean: "Korean, Limited English",
  Thai: "Thai, Limited English",
  Chinese: "Mandarin, Limited English",
  Vietnamese: "Vietnamese, Limited English",
  Malaysian: "English",
  Singaporean: "English"
};
var LABEL_PATTERNS = [
  ["Double Lesbian", /\blesbian\s*double\b/i],
  ["Shower Together", /\bshower\s*together\b/i],
  ["Pussy Slide", /\bpussy\s*slide\b/i],
  ["DFK", /\bDFK\b/],
  ["BBBJ", /\bBBBJ\b/],
  ["DATY", /\bDATY\b/],
  ["69", /\b69\b/],
  ["CIM", /\bCIM\b/],
  ["COB", /\bCOB\b/],
  ["COF", /\bCOF\b/],
  ["Rimming", /\brimming\b/i],
  ["Anal", /\ban[- ]?al\b/i],
  ["Double", /\bdouble\b/i],
  ["Swallow", /\bswallow\b/i],
  ["Filming", /\bfilming\b/i],
  ["GFE", /\bGFE\b/],
  ["PSE", /\bPSE\b/],
  ["Massage", /\bmassage\b/i],
  ["Toys", /\btoys?\b/i],
  ["Costume", /\bcostume\b/i]
];
function extractLabels(desc) {
  if (!desc) return [];
  return LABEL_PATTERNS.filter(([, re]) => re.test(desc)).map(([label]) => label);
}
__name(extractLabels, "extractLabels");
function parseGirlTitle(raw) {
  let special = "";
  let clean = raw;
  const parens = [];
  clean = clean.replace(/\(([^)]+)\)/g, (_, inner) => {
    parens.push(inner.trim());
    return "";
  }).trim();
  if (parens.length) special = parens.join(", ");
  clean = clean.replace(/([a-zA-Z])(\d+\s*(?:MINS?|HRS?|HOURS?))/gi, "$1 $2");
  const minRe = /\b(\d+\s*(?:MINS?|MINUTES?|HRS?|HOURS?)\s*(?:MINIMUM|MIN)?)\b/gi;
  let minM;
  while ((minM = minRe.exec(clean)) !== null) {
    special = special ? special + ", " + minM[1].trim() : minM[1].trim();
  }
  clean = clean.replace(minRe, "").trim();
  const restrictRe = /\b(No\s+\w+|Asian\s+only|Japanese\s+only)\b/gi;
  let rm;
  while ((rm = restrictRe.exec(clean)) !== null) {
    special = special ? special + ", " + rm[1].trim() : rm[1].trim();
  }
  clean = clean.replace(restrictRe, "").trim();
  clean = clean.replace(/^(New\s+)+/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let country = [];
  for (const w of words.slice(0, -1)) {
    if (COUNTRY_PREFIX[w]) {
      country = [COUNTRY_PREFIX[w]];
    }
  }
  if (!country.length && words.length > 1) {
    const prefix = words.slice(0, -1).join(" ").toLowerCase();
    if (prefix.includes("japan")) country = ["Japanese"];
    else if (prefix.includes("korea")) country = ["Korean"];
    else if (prefix.includes("thai")) country = ["Thai"];
    else if (prefix.includes("chin")) country = ["Chinese"];
    else if (prefix.includes("vietnam")) country = ["Vietnamese"];
    else if (prefix.includes("brazil")) country = ["Brazilian"];
    else if (prefix.includes("malay")) country = ["Malaysian"];
  }
  let name = (words[words.length - 1] || "").replace(/\./g, "");
  return { name, country, special };
}
__name(parseGirlTitle, "parseGirlTitle");
async function scrapeGirlsListing() {
  const resp = await fetch(GIRLS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GinzaBot/1.0)" }
  });
  if (!resp.ok) throw new Error(`Girls listing fetch failed: ${resp.status}`);
  const html = await resp.text();
  const cards = [];
  const cardRe = /<a\s+href="\/Girls\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const id = m[1];
    const cardHtml = m[2];
    const h3 = cardHtml.match(/<h3>(.*?)<\/h3>/);
    if (!h3) continue;
    const rawTitle = h3[1].replace(/<[^>]*>/g, "").trim();
    const parsed = parseGirlTitle(rawTitle);
    if (!parsed.name) continue;
    const age = (cardHtml.match(/Age:(\d+)/) || [])[1] || "";
    const body = (cardHtml.match(/Body Size:(\d+)/) || [])[1] || "";
    const cup = (cardHtml.match(/Cup Size:([\w\-]+)/) || [])[1] || "";
    const height = (cardHtml.match(/Height:(\d+)/) || [])[1] || "";
    cards.push({ id, ...parsed, age, body, cup, height });
  }
  return cards;
}
__name(scrapeGirlsListing, "scrapeGirlsListing");
async function scrapeGirlProfile(id) {
  const resp = await fetch(`${GIRLS_URL}/${id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GinzaBot/1.0)" }
  });
  if (!resp.ok) throw new Error(`Profile fetch ${resp.status} for /Girls/${id}`);
  const html = await resp.text();
  const bk = html.match(/Booking:?\s*<\/(?:label|dt)>\s*<dd>\s*([\d,.\/ ]+)/i) || html.match(/Booking:<\/label>\s*([\d,.\/ ]+)/i) || html.match(/Booking:\s*([\d,.\/ ]+)/i);
  let val1 = "", val2 = "", val3 = "";
  if (bk) {
    const p = bk[1].trim().split(/[,.\/ ]+/);
    val1 = p[0] || "";
    val2 = p[1] || "";
    val3 = p[2] || "";
  }
  const htMatch = html.match(/Height:?\s*<\/(?:label|dt)>\s*<dd>\s*(1[3-9]\d|20\d)/i) || html.match(/Height:<\/label>\s*(1[3-9]\d|20\d)/i);
  const profileHeight = htMatch ? htMatch[1] : "";
  const typeMatch = html.match(/Type:<\/label>\s*([^<]+)/i);
  const profileType = typeMatch ? typeMatch[1].replace(/&nbsp;/g, " ").trim() : "";
  const langMatch = html.match(/Language:<\/label>\s*([^<]+)/i);
  const profileLang = langMatch ? langMatch[1].replace(/&nbsp;/g, " ").trim() : "";
  const expMatch = html.match(/Speciality:<\/label>\s*([^<]+)/i) || html.match(/Experience:<\/label>\s*([^<]+)/i);
  const profileExp = expMatch ? expMatch[1].replace(/&nbsp;/g, " ").trim() : "";
  const imgRe = /<a[^>]+href="(\/data\/upload\/[^"]+\.\w+)"[^>]*>/gi;
  const images = [];
  let im;
  while ((im = imgRe.exec(html)) !== null) {
    const src = im[1];
    if (/s\.\w+$/i.test(src)) continue;
    if (/\.(jpe?g|png|webp)$/i.test(src)) {
      images.push("https://479ginza.com.au" + src);
    }
  }
  let desc = "";
  const descPatterns = [
    /<div class="(?:about|description|text|info-text|detail)"[^>]*>([\s\S]*?)<\/div>/i,
    /<div class="row"><label>(?:Description|About|Info):<\/label>\s*([\s\S]*?)<\/div>/i
  ];
  for (const re of descPatterns) {
    const dm = html.match(re);
    if (dm) {
      desc = dm[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (desc) break;
    }
  }
  if (!desc) {
    const textBlocks = html.match(/<(?:p|div)[^>]*>([^<]{80,})<\/(?:p|div)>/gi);
    if (textBlocks && textBlocks.length) {
      const longest = textBlocks.sort((a, b) => b.length - a.length)[0];
      desc = longest.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  return { val1, val2, val3, images, desc, profileHeight, profileType, profileLang, profileExp };
}
__name(scrapeGirlProfile, "scrapeGirlProfile");
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 32768) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)));
  }
  return btoa(chunks.join(""));
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
async function uploadImage(env, imageUrl, repoPath) {
  const resp = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GinzaBot/1.0)" }
  });
  if (!resp.ok) throw new Error(`Image fetch ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  let sha = null;
  try {
    const r2 = await fetch(`${GH_API}/repos/${REPO}/contents/${repoPath}`, { headers: ghHeaders(env) });
    if (r2.ok) sha = (await r2.json()).sha;
  } catch {
  }
  const body = { message: `Add ${repoPath}`, content: base64 };
  if (sha) body.sha = sha;
  const r = await fetch(`${GH_API}/repos/${REPO}/contents/${repoPath}`, {
    method: "PUT",
    headers: ghHeaders(env),
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Image upload ${r.status} for ${repoPath}`);
  return `https://raw.githubusercontent.com/${REPO}/main/${repoPath}`;
}
__name(uploadImage, "uploadImage");
async function syncNewGirls(env) {
  const { content: existing, sha } = await ghGet(env, GIRLS_PATH);
  const knownNames = new Set(existing.map((g) => g.name));
  const knownUrls = new Set(existing.map((g) => g.oldUrl).filter(Boolean));
  const cards = await scrapeGirlsListing();
  const newCards = cards.filter((c) => {
    const url = `https://479ginza.com.au/Girls/${c.id}`;
    return !knownNames.has(c.name) && !knownUrls.has(url);
  });
  if (newCards.length === 0) {
    console.log("Girls sync: no new profiles");
    return { added: 0, names: [] };
  }
  console.log(`Girls sync: ${newCards.length} new profile(s) found`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const todayStr = now.split("T")[0];
  const addedNames = [];
  for (const card of newCards) {
    try {
      await new Promise((r) => setTimeout(r, 1e3));
      const profile = await scrapeGirlProfile(card.id);
      const photos = [];
      for (let i = 0; i < profile.images.length; i++) {
        try {
          const ext = (profile.images[i].match(/\.(jpe?g|png|webp)$/i) || [])[1] || "jpeg";
          const path = `Images/${card.name}/${card.name}_${i + 1}.${ext}`;
          const ghUrl = await uploadImage(env, profile.images[i], path);
          photos.push(ghUrl);
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.error(`Image error ${card.name} #${i + 1}: ${e.message}`);
        }
      }
      const entry = {
        name: card.name,
        country: card.country.length ? card.country : void 0,
        age: card.age || void 0,
        body: card.body || void 0,
        height: card.height || profile.profileHeight || void 0,
        cup: card.cup || void 0,
        val1: profile.val1 || void 0,
        val2: profile.val2 || void 0,
        val3: profile.val3 || void 0
      };
      if (card.special) entry.special = card.special;
      entry.exp = profile.profileExp || "Inexperienced";
      entry.startDate = todayStr;
      entry.lang = profile.profileLang || (card.country.length ? LANG_FROM_COUNTRY[card.country[0]] || "" : "");
      entry.oldUrl = `https://479ginza.com.au/Girls/${card.id}`;
      entry.type = profile.profileType || "";
      entry.desc = profile.desc || "";
      entry.photos = photos;
      entry.labels = extractLabels(profile.desc);
      entry.lastModified = now;
      for (const k of Object.keys(entry)) {
        if (entry[k] === void 0) delete entry[k];
      }
      existing.push(entry);
      addedNames.push(card.name);
      console.log(`Girls sync: added ${card.name} (${photos.length} photos)`);
    } catch (e) {
      console.error(`Failed to process ${card.name}: ${e.message}`);
    }
  }
  if (addedNames.length > 0) {
    await ghPut(
      env,
      GIRLS_PATH,
      existing,
      sha,
      `Auto-sync new girls: ${addedNames.join(", ")}`
    );
    console.log(`Girls sync: girls.json updated with ${addedNames.length} new profile(s)`);
  }
  return { added: addedNames.length, names: addedNames };
}
__name(syncNewGirls, "syncNewGirls");
async function generateSitemap(env) {
  const { content: girlsData } = await ghGet(env, "data/girls.json");
  const today = fmtDate(getAEDTDate());
  const base = "https://ginzaempire.com";
  const pages = [
    { loc: "/", freq: "daily", pri: "1.0" },
    { loc: "/roster/card", freq: "daily", pri: "0.9" },
    { loc: "/roster/weekly", freq: "daily", pri: "0.8" },
    { loc: "/girls", freq: "daily", pri: "0.9" },
    { loc: "/rates", freq: "weekly", pri: "0.7" },
    { loc: "/employment", freq: "monthly", pri: "0.5" }
  ];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const p of pages) {
    xml += `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.pri}</priority>
  </url>
`;
  }
  for (const g of girlsData) {
    if (!g.name || g.hidden) continue;
    const slug = nameToSlug(g.name);
    const lastmod = g.lastModified ? g.lastModified.split("T")[0] : today;
    xml += `  <url>
    <loc>${base}/girls/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }
  xml += "</urlset>\n";
  return xml;
}
__name(generateSitemap, "generateSitemap");
async function commitSitemap(env) {
  const xml = await generateSitemap(env);
  const SITE_REPO = REPO;
  const path = "sitemap.xml";
  let sha = null;
  try {
    const r2 = await fetch(`${GH_API}/repos/${SITE_REPO}/contents/${path}`, { headers: ghHeaders(env) });
    if (r2.ok) {
      const d = await r2.json();
      sha = d.sha;
    }
  } catch {
  }
  const body = { message: "Update sitemap.xml", content: btoa(unescape(encodeURIComponent(xml))) };
  if (sha) body.sha = sha;
  const r = await fetch(`${GH_API}/repos/${SITE_REPO}/contents/${path}`, {
    method: "PUT",
    headers: ghHeaders(env),
    body: JSON.stringify(body)
  });
  return r.ok;
}
__name(commitSitemap, "commitSitemap");
var RATE_LIMIT_WINDOW = 6e4;
var RATE_LIMIT_MAX_READ = 120;
var RATE_LIMIT_MAX_WRITE = 30;
var rateBuckets = /* @__PURE__ */ new Map();
function isRateLimited(ip, isWrite) {
  const now = Date.now();
  if (!rateBuckets.has(ip)) {
    rateBuckets.set(ip, { reads: [], writes: [] });
  }
  const bucket = rateBuckets.get(ip);
  bucket.reads = bucket.reads.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  bucket.writes = bucket.writes.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
  if (isWrite) {
    if (bucket.writes.length >= RATE_LIMIT_MAX_WRITE) return true;
    bucket.writes.push(now);
  } else {
    if (bucket.reads.length >= RATE_LIMIT_MAX_READ) return true;
    bucket.reads.push(now);
  }
  if (rateBuckets.size > 5e3) {
    const oldest = rateBuckets.keys().next().value;
    rateBuckets.delete(oldest);
  }
  return false;
}
__name(isRateLimited, "isRateLimited");
async function handleProxy(request, env, pathname, origin) {
  const ghUrl = `${GH_API}${pathname}`;
  const headers = {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: request.headers.get("Accept") || "application/vnd.github.v3+json",
    "User-Agent": "travanixlabs-worker"
  };
  if (request.method === "PUT" || request.method === "POST" || request.method === "DELETE") {
    headers["Content-Type"] = "application/json";
  }
  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }
  const ghResp = await fetch(ghUrl, init);
  const respHeaders = { ...corsHeaders(origin), "Content-Type": ghResp.headers.get("Content-Type") || "application/json" };
  return new Response(ghResp.body, { status: ghResp.status, headers: respHeaders });
}
__name(handleProxy, "handleProxy");
var ENQUIRY_PATH = "data/enquiries.json";
var ENQUIRY_RATE = /* @__PURE__ */ new Map();
var ENQUIRY_MAX_PER_HOUR = 5;
async function handleSubmitEnquiry(request, env, origin) {
  if (request.method !== "POST") return jsonResp({ error: "method not allowed" }, 405, origin);
  const xrw = request.headers.get("X-Requested-With");
  if (xrw !== "XMLHttpRequest") return jsonResp({ error: "forbidden" }, 403, origin);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  if (!ENQUIRY_RATE.has(ip)) ENQUIRY_RATE.set(ip, []);
  const timestamps = ENQUIRY_RATE.get(ip).filter((t) => now - t < 36e5);
  if (timestamps.length >= ENQUIRY_MAX_PER_HOUR) {
    return jsonResp({ error: "Too many enquiries. Please try again later." }, 429, origin);
  }
  timestamps.push(now);
  ENQUIRY_RATE.set(ip, timestamps);
  if (ENQUIRY_RATE.size > 5e3) {
    ENQUIRY_RATE.delete(ENQUIRY_RATE.keys().next().value);
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResp({ error: "invalid body" }, 400, origin);
  }
  if (!data.girlName || !data.customerName) {
    return jsonResp({ error: "missing required fields" }, 400, origin);
  }
  if (!data.phone && !data.email) {
    return jsonResp({ error: "phone or email required" }, 400, origin);
  }
  try {
    let existing = [], sha = null;
    try {
      const r = await ghGet(env, ENQUIRY_PATH);
      existing = r.content;
      sha = r.sha;
    } catch {
    }
    if (existing.length >= 200) existing = existing.slice(existing.length - 199);
    existing.push({
      girlName: data.girlName,
      customerName: data.customerName,
      phone: data.phone || "",
      email: data.email || "",
      date: data.date || "",
      time: data.time || "",
      duration: data.duration || 45,
      message: data.message || "",
      lang: data.lang || "en",
      ts: data.ts || (/* @__PURE__ */ new Date()).toISOString(),
      username: data.username || null,
      status: "new"
    });
    await ghPut(env, ENQUIRY_PATH, existing, sha, "New enquiry");
    return jsonResp({ success: true }, 200, origin);
  } catch (e) {
    console.error("Enquiry error:", e);
    return jsonResp({ error: "internal error" }, 500, origin);
  }
}
__name(handleSubmitEnquiry, "handleSubmitEnquiry");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = getAllowedOrigin(request);
    const rawOrigin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (!origin && rawOrigin) return new Response("Forbidden", { status: 403 });
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (rawOrigin && !origin) {
      return jsonResp({ error: "forbidden origin" }, 403, origin);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const isWrite = request.method !== "GET" && request.method !== "HEAD";
    if (isRateLimited(ip, isWrite)) {
      const retryAfter = Math.ceil(RATE_LIMIT_WINDOW / 1e3);
      return new Response(JSON.stringify({ error: "rate limited" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          ...corsHeaders(origin)
        }
      });
    }
    if (url.pathname === "/update-view-history" && request.method === "POST") {
      try {
        const xrw = request.headers.get("X-Requested-With");
        if (xrw !== "XMLHttpRequest") return jsonResp({ error: "forbidden" }, 403, origin);
        const { username, history } = await request.json();
        if (!username || !Array.isArray(history)) return jsonResp({ error: "invalid" }, 400, origin);
        const authResult = await ghGet(env, "data/auth.json");
        const users = authResult.content;
        const user = users.find((u) => u.user === username);
        if (!user) return jsonResp({ error: "user not found" }, 404, origin);
        user.viewHistory = history.slice(0, 10).map((h) => ({ name: h.name, ts: h.ts }));
        await ghPut(env, "data/auth.json", users, authResult.sha, "Update view history");
        return jsonResp({ success: true }, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }
    if (url.pathname === "/submit-enquiry" && request.method === "POST") {
      return handleSubmitEnquiry(request, env, origin);
    }
    if (url.pathname === "/generate-sitemap" && request.method === "POST") {
      try {
        const ok = await commitSitemap(env);
        return jsonResp({ success: ok }, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }
    if (url.pathname === "/sync-girls" && request.method === "POST") {
      try {
        const result = await syncNewGirls(env);
        return jsonResp(result, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }
    if (url.pathname === "/sync-roster" && request.method === "POST") {
      try {
        const ok = await syncRosterToCalendar(env);
        return jsonResp({ success: ok }, 200, origin);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, origin);
      }
    }
    if (url.pathname.startsWith("/repos/")) {
      return handleProxy(request, env, url.pathname, origin);
    }
    return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
  },
  async scheduled(event, env, ctx) {
    const hour = new Date(event.scheduledTime).getUTCHours();
    if (hour === 9) {
      ctx.waitUntil(
        syncNewGirls(env).catch((e) => console.error("Girls sync error:", e))
      );
    }
    if (hour === 10) {
      ctx.waitUntil(
        syncRosterToCalendar(env).catch((e) => console.error("Roster sync error:", e))
      );
    }
    if (hour === 21) {
      ctx.waitUntil(
        commitSitemap(env).catch((e) => console.error("Sitemap error:", e))
      );
    }
  }
};

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-scheduled.ts
var scheduled = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  const url = new URL(request.url);
  if (url.pathname === "/__scheduled") {
    const cron = url.searchParams.get("cron") ?? "";
    await middlewareCtx.dispatch("scheduled", { cron });
    return new Response("Ran scheduled event");
  }
  const resp = await middlewareCtx.next(request, env);
  if (request.headers.get("referer")?.endsWith("/__scheduled") && url.pathname === "/favicon.ico" && resp.status === 500) {
    return new Response(null, { status: 404 });
  }
  return resp;
}, "scheduled");
var middleware_scheduled_default = scheduled;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-vWBo6y/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_scheduled_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-vWBo6y/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
