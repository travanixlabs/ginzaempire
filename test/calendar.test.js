const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestContext } = require('./helpers/load-source');

// Use JSON roundtrip to compare cross-realm objects
function eq(actual, expected) {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
}

describe('normalizeCalData', () => {
  it('converts boolean true to empty start/end object', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    const result = run(`JSON.parse(JSON.stringify(normalizeCalData({ Alice: { '2025-01-15': true } })))`);
    assert.deepStrictEqual(result.Alice['2025-01-15'], { start: '', end: '' });
  });

  it('preserves existing objects', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    const result = run(`JSON.parse(JSON.stringify(normalizeCalData({ Alice: { '2025-01-15': { start: '10:00', end: '18:00' } } })))`);
    assert.deepStrictEqual(result.Alice['2025-01-15'], { start: '10:00', end: '18:00' });
  });

  it('handles null/undefined input', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    const r1 = run(`JSON.parse(JSON.stringify(normalizeCalData(null)))`);
    const r2 = run(`JSON.parse(JSON.stringify(normalizeCalData(undefined)))`);
    assert.deepStrictEqual(r1, {});
    assert.deepStrictEqual(r2, {});
  });

  it('handles multiple girls and dates', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    const result = run(`JSON.parse(JSON.stringify(normalizeCalData({
      Alice: { '2025-01-15': true, '2025-01-16': { start: '11:00', end: '19:00' } },
      Bob: { '2025-01-15': true }
    })))`);
    assert.deepStrictEqual(result.Alice['2025-01-15'], { start: '', end: '' });
    assert.deepStrictEqual(result.Alice['2025-01-16'], { start: '11:00', end: '19:00' });
    assert.deepStrictEqual(result.Bob['2025-01-15'], { start: '', end: '' });
  });
});
