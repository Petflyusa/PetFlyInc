const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../public/js/i18n');

test('uses a saved supported language before browser preferences', () => {
  assert.equal(i18n.resolveLanguage('zh', ['es-MX'], 'en'), 'zh');
  assert.equal(i18n.resolveLanguage('es', ['zh-TW'], 'en'), 'es');
});

test('ignores invalid saved languages before checking browser preferences', () => {
  assert.equal(i18n.resolveLanguage('fr', ['es-MX'], 'en'), 'es');
  assert.equal(i18n.resolveLanguage('zh-CN', ['es-MX'], 'en'), 'es');
});

test('maps Spanish and Chinese browser language prefixes', () => {
  assert.equal(i18n.resolveLanguage(null, ['es-MX'], 'en'), 'es');
  assert.equal(i18n.resolveLanguage(null, ['zh-TW'], 'en'), 'zh');
});

test('falls back to English for unsupported browser languages and missing keys', () => {
  assert.equal(i18n.resolveLanguage(null, ['fr-CA'], 'en'), 'en');
  assert.equal(i18n.translate('es', 'nav.services'), 'Servicios');
  assert.equal(i18n.translate('zh', 'missing.key'), 'missing.key');
});
