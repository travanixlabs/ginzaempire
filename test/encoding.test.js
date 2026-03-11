const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestContext } = require('./helpers/load-source');

describe('enc/dec roundtrip', () => {
  it('encodes and decodes a simple object', () => {
    const { run } = createTestContext(['i18n.js', 'core.js']);
    const encoded = run(`enc({ name: 'Test', age: 25, labels: ['a', 'b'] })`);
    assert.strictEqual(typeof encoded, 'string');
    const decoded = run(`dec('${encoded}')`);
    assert.deepStrictEqual(decoded, { name: 'Test', age: 25, labels: ['a', 'b'] });
  });

  it('handles unicode characters', () => {
    const { run } = createTestContext(['i18n.js', 'core.js']);
    run(`var _testObj = { name: '桜花', desc: 'café' }`);
    const encoded = run(`enc(_testObj)`);
    const decoded = run(`dec('${encoded}')`);
    assert.deepStrictEqual(decoded, { name: '桜花', desc: 'café' });
  });

  it('handles empty object', () => {
    const { run } = createTestContext(['i18n.js', 'core.js']);
    const encoded = run(`enc({})`);
    const decoded = run(`dec('${encoded}')`);
    assert.deepStrictEqual(decoded, {});
  });

  it('handles nested objects', () => {
    const { run } = createTestContext(['i18n.js', 'core.js']);
    const encoded = run(`enc({ a: { b: { c: [1, 2, 3] } } })`);
    const decoded = run(`dec('${encoded}')`);
    assert.deepStrictEqual(decoded, { a: { b: { c: [1, 2, 3] } } });
  });
});

describe('sanitize', () => {
  it('strips HTML tags', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    assert.strictEqual(run(`sanitize('<b>Hello</b>')`), 'Hello');
  });

  it('trims whitespace', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    assert.strictEqual(run(`sanitize('  hello  ')`), 'hello');
  });

  it('handles empty/null input', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    assert.strictEqual(run(`sanitize('')`), '');
    assert.strictEqual(run(`sanitize(null)`), '');
    assert.strictEqual(run(`sanitize(undefined)`), '');
  });
});
