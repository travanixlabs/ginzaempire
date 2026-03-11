const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestContext } = require('./helpers/load-source');

function setupWithTime(hour, minute, calEntry) {
  const { ctx, run } = createTestContext(['i18n.js', 'core.js']);
  // Override getAEDTDate inside the vm context
  run(`getAEDTDate = () => new Date(2025, 0, 15, ${hour}, ${minute}, 0)`);
  const today = run(`fmtDate(getAEDTDate())`);
  // Set calData inside the vm context
  run(`calData = { TestGirl: { '${today}': ${JSON.stringify(calEntry)} } }`);
  return { ctx, run };
}

describe('isAvailableNow', () => {
  it('returns true when within shift hours', () => {
    const { run } = setupWithTime(14, 0, { start: '10:00', end: '18:00' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), true);
  });

  it('returns false when before shift', () => {
    const { run } = setupWithTime(8, 0, { start: '10:00', end: '18:00' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), false);
  });

  it('returns false when after shift', () => {
    const { run } = setupWithTime(19, 0, { start: '10:00', end: '18:00' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), false);
  });

  it('handles overnight shifts', () => {
    const { run } = setupWithTime(23, 30, { start: '22:00', end: '02:00' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), true);
  });

  it('handles overnight shift - early morning', () => {
    const { run } = setupWithTime(1, 0, { start: '22:00', end: '02:00' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), true);
  });

  it('returns false for unknown girl', () => {
    const { run } = setupWithTime(14, 0, { start: '10:00', end: '18:00' });
    assert.strictEqual(run(`isAvailableNow('UnknownGirl')`), false);
  });

  it('returns false when no calendar entry', () => {
    const { run } = setupWithTime(14, 0, { start: '', end: '' });
    assert.strictEqual(run(`isAvailableNow('TestGirl')`), false);
  });
});

describe('getAvailCountdown', () => {
  it('returns ends countdown when available', () => {
    const { run } = setupWithTime(14, 0, { start: '10:00', end: '18:00' });
    const result = run(`getAvailCountdown('TestGirl')`);
    assert.ok(result);
    assert.strictEqual(result.type, 'ends');
    assert.strictEqual(result.str, '4h 0m');
  });

  it('returns starts countdown when upcoming', () => {
    const { run } = setupWithTime(9, 0, { start: '10:00', end: '18:00' });
    const result = run(`getAvailCountdown('TestGirl')`);
    assert.ok(result);
    assert.strictEqual(result.type, 'starts');
    assert.strictEqual(result.str, '1h 0m');
  });

  it('returns null when no entry', () => {
    const { run } = setupWithTime(14, 0, { start: '', end: '' });
    const result = run(`getAvailCountdown('TestGirl')`);
    assert.strictEqual(result, null);
  });
});
