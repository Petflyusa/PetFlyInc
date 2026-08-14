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

test('exposes the browser API and applies the chosen language when storage fails', () => {
  const modulePath = require.resolve('../public/js/i18n');
  const originalWindow = global.window;
  let storedLanguage;
  const text = createElement('nav.services');
  const placeholder = createElement('nav.services');
  const ariaLabel = createElement('nav.services');
  const fakeDocument = {
    documentElement: { lang: 'en' },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return [text];
      if (selector === '[data-i18n-placeholder]') return [placeholder];
      if (selector === '[data-i18n-aria-label]') return [ariaLabel];
      return [];
    }
  };

  global.window = {
    document: fakeDocument,
    navigator: { languages: ['en-US'] },
    localStorage: {
      getItem() { return null; },
      setItem(key, value) {
        assert.equal(key, 'petfly_language');
        storedLanguage = value;
        throw new Error('storage unavailable');
      }
    }
  };
  delete require.cache[modulePath];

  try {
    const browserI18n = require('../public/js/i18n');

    assert.equal(global.window.PetFlyI18n, browserI18n);
    assert.equal(browserI18n.setLanguage('zh'), 'zh');
    assert.equal(storedLanguage, 'zh');
    assert.equal(fakeDocument.documentElement.lang, 'zh-CN');
    assert.equal(text.textContent, '服务');
    assert.equal(placeholder.placeholder, '服务');
    assert.equal(ariaLabel.getAttribute('aria-label'), '服务');
  } finally {
    delete require.cache[modulePath];
    global.window = originalWindow;
  }
});

test('loads the localization module and provides a persistent language selector in the public header', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');

  assert.match(header, /<script src="\/js\/i18n\.js" defer><\/script>/);
  assert.match(header, /id="languageSelect"/);
  assert.match(header, /data-i18n="nav\.services"/);
  assert.match(header, /data-i18n="nav\.clientLogin"/);
});

function createElement(key) {
  const attributes = {
    'data-i18n': key,
    'data-i18n-placeholder': key,
    'data-i18n-aria-label': key
  };

  return {
    getAttribute(name) { return attributes[name]; },
    setAttribute(name, value) { attributes[name] = value; }
  };
}
