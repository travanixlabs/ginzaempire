const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestContext } = require('./helpers/load-source');

describe('fmtDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    const d = new Date(2025, 0, 5); // Jan 5, 2025
    assert.strictEqual(ctx.fmtDate(d), '2025-01-05');
  });

  it('pads single-digit month and day', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    const d = new Date(2025, 2, 9); // Mar 9
    assert.strictEqual(ctx.fmtDate(d), '2025-03-09');
  });

  it('handles December correctly', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    const d = new Date(2025, 11, 31);
    assert.strictEqual(ctx.fmtDate(d), '2025-12-31');
  });
});

describe('fmtTime12', () => {
  it('converts 24h to 12h format', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    assert.strictEqual(ctx.fmtTime12('14:30'), '2:30 PM');
    assert.strictEqual(ctx.fmtTime12('09:05'), '9:05 AM');
  });

  it('handles midnight and noon', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    assert.strictEqual(ctx.fmtTime12('00:00'), '12:00 AM');
    assert.strictEqual(ctx.fmtTime12('12:00'), '12:00 PM');
  });

  it('returns empty for falsy input', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    assert.strictEqual(ctx.fmtTime12(''), '');
    assert.strictEqual(ctx.fmtTime12(null), '');
    assert.strictEqual(ctx.fmtTime12(undefined), '');
  });
});

describe('dispDate', () => {
  it('returns day and date object', () => {
    const { ctx } = createTestContext(['i18n.js', 'core.js']);
    const result = ctx.dispDate('2025-01-06'); // Monday
    assert.ok(result.day);
    assert.ok(result.date);
    assert.strictEqual(result.day, 'Mon');
    assert.strictEqual(result.date, '6 Jan');
  });
});
