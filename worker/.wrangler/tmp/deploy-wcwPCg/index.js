var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var ALLOWED_ORIGINS = [
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
async function generateSitemap(env) {
  const { content: girlsData } = await ghGet(env, "data/girls.json");
  const today = fmtDate(getAEDTDate());
  const base = "https://travanixlabs.github.io/ginzaempire";
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
    if (url.pathname.startsWith("/repos/")) {
      return handleProxy(request, env, url.pathname, origin);
    }
    return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      commitSitemap(env).catch((e) => console.error("Sitemap error:", e))
    );
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
