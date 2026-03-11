#!/usr/bin/env node
/**
 * Build script — bundles & minifies CSS + JS for production.
 * Run: npm run build
 *
 * Produces:
 *   js/app.min.js       (i18n + core + ui + grids + forms)
 *   js/analytics.min.js  (standalone, deferred)
 *   styles.min.css
 *
 * After building, auto-injects SRI integrity hashes into index.html.
 */
const esbuild = require('esbuild');
const fs = require('fs');
const crypto = require('crypto');

/* Bundle A: concatenated in dependency order */
const BUNDLE_A = [
  'js/i18n.js',
  'js/core.js',
  'js/ui.js',
  'js/grids.js',
  'js/forms.js',
];

/* Bundle B: standalone deferred script */
const BUNDLE_B = 'js/analytics.js';

/* Bundle C: admin module (lazy-loaded) */
const BUNDLE_C = 'js/admin.js';

function sriHash(file) {
  // Normalize to LF so the hash matches what GitHub Pages serves
  const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return 'sha384-' + crypto.createHash('sha384').update(content).digest('base64');
}

async function build() {
  const t0 = Date.now();
  let totalBefore = 0;
  let totalAfter = 0;

  /* --- Bundle A: concatenate sources, then minify --- */
  const CSS_SWAP = "document.querySelector('link[href*=\"styles.min\"]').media='all';";
  const bundleASrc = CSS_SWAP + '\n' + BUNDLE_A.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const bundleA = await esbuild.transform(bundleASrc, { minify: true, target: 'es2020', charset: 'utf8' });
  fs.writeFileSync('js/app.min.js', bundleA.code, 'utf8');
  const aSrcLen = BUNDLE_A.reduce((s, f) => s + fs.statSync(f).size, 0);
  totalBefore += aSrcLen;
  totalAfter += bundleA.code.length;
  console.log(`  app.min.js      ${aSrcLen} → ${bundleA.code.length} bytes`);

  /* --- Bundle B: analytics standalone --- */
  const bSrc = fs.readFileSync(BUNDLE_B, 'utf8');
  const bundleB = await esbuild.transform(bSrc, { minify: true, target: 'es2020', charset: 'utf8' });
  fs.writeFileSync('js/analytics.min.js', bundleB.code, 'utf8');
  totalBefore += bSrc.length;
  totalAfter += bundleB.code.length;
  console.log(`  analytics.min.js  ${bSrc.length} → ${bundleB.code.length} bytes`);

  /* --- Bundle C: admin module (lazy-loaded) --- */
  const cSrc = fs.readFileSync(BUNDLE_C, 'utf8');
  const bundleC = await esbuild.transform(cSrc, { minify: true, target: 'es2020', charset: 'utf8' });
  fs.writeFileSync('js/admin.min.js', bundleC.code, 'utf8');
  totalBefore += cSrc.length;
  totalAfter += bundleC.code.length;
  console.log(`  admin.min.js    ${cSrc.length} → ${bundleC.code.length} bytes`);

  /* --- CSS --- */
  const css = fs.readFileSync('styles.css', 'utf8');
  const cssResult = await esbuild.transform(css, { minify: true, loader: 'css' });
  fs.writeFileSync('styles.min.css', cssResult.code);
  totalBefore += css.length;
  totalAfter += cssResult.code.length;
  console.log(`  styles.min.css   ${css.length} → ${cssResult.code.length} bytes`);

  const pct = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`\n  Total: ${totalBefore} → ${totalAfter} bytes  (${pct}% reduction)`);

  /* --- Compute SRI hashes --- */
  const hashes = {
    'styles.min.css':      sriHash('styles.min.css'),
    'js/app.min.js':       sriHash('js/app.min.js'),
    'js/analytics.min.js': sriHash('js/analytics.min.js'),
  };
  console.log('\n  SRI hashes:');
  for (const [f, h] of Object.entries(hashes)) console.log(`    ${f}: ${h}`);

  /* --- Auto-inject SRI hashes into index.html --- */
  let html = fs.readFileSync('index.html', 'utf8');
  for (const [file, hash] of Object.entries(hashes)) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match integrity attribute on tags referencing this file
    const re = new RegExp(`((?:href|src)="/(?:${escaped})"[^>]*?)integrity="sha384-[^"]*"`, 'g');
    html = html.replace(re, `$1integrity="${hash}"`);
  }
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('  ✓ index.html SRI hashes updated');

  console.log(`\n  Done in ${Date.now() - t0}ms`);
}

build().catch(e => { console.error(e); process.exit(1); });
