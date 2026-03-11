const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createTestContext } = require('./helpers/load-source');

const testGirlsCode = `[
  { name: 'Alice', country: ['Japan'], age: '22', body: '48', height: '160', exp: 'Experienced', labels: ['GFE'] },
  { name: 'Betty', country: ['Korea'], age: '25', body: '52', height: '165', exp: 'Inexperienced', labels: ['PSE'] },
  { name: 'Cathy', country: ['Japan', 'Korea'], age: '28', body: '55', height: '170', exp: 'Experienced', labels: ['GFE', 'PSE'] },
]`;

describe('applySharedFilters', () => {
  it('returns all girls with no filters', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 3);
  });

  it('filters by name search', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run(`sharedFilters.nameSearch = 'alice'`);
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Alice');
  });

  it('filters by country', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run(`sharedFilters.country = ['Japan']`);
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 2); // Alice and Cathy
  });

  it('filters by age range', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run('sharedFilters.ageMin = 24; sharedFilters.ageMax = 26');
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Betty');
  });

  it('filters by experience', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run(`sharedFilters.experience = 'Experienced'`);
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 2); // Alice and Cathy
  });

  it('filters by labels', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run(`sharedFilters.labels = ['GFE', 'PSE']`);
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Cathy');
  });

  it('combines multiple filters', () => {
    const { run } = createTestContext(['i18n.js', 'core.js', 'ui.js', 'grids.js', 'forms.js']);
    run('clearAllFilters()');
    run(`sharedFilters.country = ['Japan']; sharedFilters.experience = 'Experienced'`);
    const result = run(`applySharedFilters(${testGirlsCode})`);
    assert.strictEqual(result.length, 2); // Alice and Cathy
  });
});
