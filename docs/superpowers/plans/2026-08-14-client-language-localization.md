# Client Language Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide automatic English, Spanish, and Simplified Chinese localization with a persistent visitor override across every client-facing page.

**Architecture:** A dependency-free browser module in `public/js/i18n.js` owns language normalization, preference storage, translation lookup, DOM application, and the language selector. EJS templates retain English as their source text and add stable `data-i18n` identifiers, while dynamic page scripts call the module for text generated after page load. The admin application is excluded.

**Tech Stack:** Express/EJS, browser JavaScript, `localStorage`, Node's built-in test runner, existing CSS.

---

## File Structure

- Create: `public/js/i18n.js` - Shared dictionaries and browser localization API.
- Create: `test/i18n.test.js` - Unit tests for normalization, detection, translation fallback, and public-page integration markers.
- Modify: `views/partials/header.ejs` - Load the shared module, expose the language selector, and mark shared navigation text.
- Modify: `views/partials/footer.ejs` - Mark fixed footer labels and navigation links.
- Modify: `views/index.ejs`, `views/service.ejs`, `views/quote.ejs`, `views/contact.ejs`, `views/regulations.ejs` - Mark public fixed text and add keys for dynamic form messages.
- Modify: `views/contract.ejs`, `views/portal-login.ejs`, `views/portal-password.ejs`, `views/portal-dashboard.ejs` - Mark client contract and portal UI, and replace dynamically rendered English messages with `PetFlyI18n.t()`.
- Modify: `public/css/style-v2.css` - Style the desktop and mobile language controls without changing navigation layout.

### Task 1: Define and test the localization module

**Files:**
- Create: `test/i18n.test.js`
- Create: `public/js/i18n.js`

- [ ] **Step 1: Write the failing tests for language resolution and lookup**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../public/js/i18n');

test('uses a saved supported language before browser preferences', () => {
  assert.equal(i18n.resolveLanguage('zh-CN', ['es-MX'], 'en'), 'en');
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
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test test/i18n.test.js`

Expected: FAIL with `Cannot find module '../public/js/i18n'`.

- [ ] **Step 3: Implement the CommonJS/browser-compatible module**

Create `public/js/i18n.js` as a UMD module that exports and assigns `window.PetFlyI18n` the following API:

```js
function normalizeLanguage(value) {
  var prefix = String(value || '').toLowerCase().split('-')[0];
  return prefix === 'es' || prefix === 'zh' || prefix === 'en' ? prefix : null;
}

function resolveLanguage(stored, browserLanguages, fallback) {
  return normalizeLanguage(stored) ||
    (browserLanguages || []).map(normalizeLanguage).find(Boolean) ||
    normalizeLanguage(fallback) || 'en';
}

function translate(language, key, replacements) {
  var value = (dictionaries[normalizeLanguage(language) || 'en'] || dictionaries.en)[key] || dictionaries.en[key] || key;
  return String(value).replace(/\{(\w+)\}/g, function (_, name) {
    return replacements && replacements[name] != null ? replacements[name] : '{' + name + '}';
  });
}
```

Include complete `en`, `es`, and `zh` dictionaries for every key added in Tasks 2-4. At minimum, provide `nav.home`, `nav.services`, `nav.contract`, `nav.quote`, `nav.regulations`, `nav.contact`, `nav.clientLogin`, `language.english`, `language.spanish`, and `language.chinese` with these values:

```js
var dictionaries = {
  en: { 'nav.home':'Home', 'nav.services':'Services', 'nav.contract':'Contract', 'nav.quote':'Quote', 'nav.regulations':'Regulations', 'nav.contact':'Contact', 'nav.clientLogin':'Client Login', 'language.english':'English', 'language.spanish':'Spanish', 'language.chinese':'Chinese' },
  es: { 'nav.home':'Inicio', 'nav.services':'Servicios', 'nav.contract':'Contrato', 'nav.quote':'Cotizacion', 'nav.regulations':'Regulaciones', 'nav.contact':'Contacto', 'nav.clientLogin':'Acceso de cliente', 'language.english':'Ingles', 'language.spanish':'Espanol', 'language.chinese':'Chino' },
  zh: { 'nav.home':'首页', 'nav.services':'服务', 'nav.contract':'合同', 'nav.quote':'报价', 'nav.regulations':'法规', 'nav.contact':'联系我们', 'nav.clientLogin':'客户登录', 'language.english':'英语', 'language.spanish':'西班牙语', 'language.chinese':'中文' }
};
```

Expose `setLanguage(language)`, `getLanguage()`, `translate(language, key, replacements)`, and `apply(root)`. `setLanguage` must save `petfly_language`, update `<html lang>` to `en`, `es`, or `zh-CN`, then run `apply(document)`. `apply` must replace text content for `[data-i18n]`, placeholders for `[data-i18n-placeholder]`, and ARIA labels for `[data-i18n-aria-label]`.

- [ ] **Step 4: Run the module tests to verify they pass**

Run: `node --test test/i18n.test.js`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the localization foundation**

```bash
git add public/js/i18n.js test/i18n.test.js
git commit -m "feat: add client localization module"
```

### Task 2: Add the global language selector and fixed shared navigation text

**Files:**
- Modify: `views/partials/header.ejs:1-90`
- Modify: `views/partials/footer.ejs:1-50`
- Modify: `public/css/style-v2.css`
- Modify: `test/i18n.test.js`

- [ ] **Step 1: Add failing public-header integration tests**

Append the following test:

```js
test('loads the localization module and provides a persistent language selector in the public header', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');

  assert.match(header, /<script src="\/js\/i18n\.js" defer><\/script>/);
  assert.match(header, /id="languageSelect"/);
  assert.match(header, /data-i18n="nav\.services"/);
  assert.match(header, /data-i18n="nav\.clientLogin"/);
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `node --test test/i18n.test.js`

Expected: FAIL because the public header does not load the localization module or contain `languageSelect`.

- [ ] **Step 3: Implement the header, footer, and responsive selector**

In `views/partials/header.ejs`, use English source text with `data-i18n` keys, add the script in `<head>`, and add this control after the desktop navigation:

```html
<label class="language-control" for="languageSelect">
  <span class="sr-only" data-i18n="language.label">Language</span>
  <i class="fas fa-globe" aria-hidden="true"></i>
  <select id="languageSelect" aria-label="Language" data-i18n-aria-label="language.label">
    <option value="en" data-i18n="language.english">English</option>
    <option value="es" data-i18n="language.spanish">Spanish</option>
    <option value="zh" data-i18n="language.chinese">Chinese</option>
  </select>
</label>
```

Initialize it after the navigation markup:

```html
<script>
  window.addEventListener('DOMContentLoaded', function () {
    var selector = document.getElementById('languageSelect');
    var language = PetFlyI18n.getLanguage();
    selector.value = language;
    PetFlyI18n.apply(document);
    selector.addEventListener('change', function () { PetFlyI18n.setLanguage(selector.value); });
  });
</script>
```

Add matching `data-i18n` keys to desktop and mobile navigation as well as the footer's fixed company/navigation labels. Add `.language-control` styles to keep it compact beside the menu, and position it safely in mobile navigation with a full-width select.

- [ ] **Step 4: Re-run tests to verify the shared UI integration**

Run: `node --test test/i18n.test.js`

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit the shared selector**

```bash
git add views/partials/header.ejs views/partials/footer.ejs public/css/style-v2.css test/i18n.test.js
git commit -m "feat: add public language selector"
```

### Task 3: Localize public pages and public form behavior

**Files:**
- Modify: `views/index.ejs`
- Modify: `views/service.ejs`
- Modify: `views/quote.ejs`
- Modify: `views/contact.ejs`
- Modify: `views/regulations.ejs`
- Modify: `public/js/i18n.js`
- Modify: `test/i18n.test.js`

- [ ] **Step 1: Add a failing test for public template coverage**

```js
test('marks all public pages for localization without including the admin application', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const pages = ['index.ejs', 'service.ejs', 'quote.ejs', 'contact.ejs', 'regulations.ejs'];

  pages.forEach(function (name) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'views', name), 'utf8');
    assert.match(source, /data-i18n=/, name + ' must contain translatable public copy');
  });
  const admin = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin.ejs'), 'utf8');
  assert.doesNotMatch(admin, /\/js\/i18n\.js/);
});
```

- [ ] **Step 2: Run the coverage test to verify it fails**

Run: `node --test test/i18n.test.js`

Expected: FAIL because the public templates do not yet use `data-i18n`.

- [ ] **Step 3: Mark every fixed visitor-facing string and translate public JavaScript messages**

For every static heading, paragraph, label, button, placeholder, option label, and validation message in the listed public pages, retain English source copy and add the appropriate `data-i18n`, `data-i18n-placeholder`, or `data-i18n-aria-label` attribute. Use grouped keys such as `quote.pet.name`, `quote.error.required`, `contact.submit`, `regulations.country`, and `home.services`.

For JavaScript-created messages, replace literals such as `Please fill out all required fields.` with `PetFlyI18n.t('quote.error.required')`. Do not attach translation attributes to values from `content`, form inputs, query results, or database records.

Add every new key to all three dictionaries. Preserve the original English term as the `en` value, a professional Spanish translation as the `es` value, and a professional Simplified Chinese translation as the `zh` value.

- [ ] **Step 4: Run public template and module tests**

Run: `node --test test/i18n.test.js`

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit the public-page localization**

```bash
git add public/js/i18n.js views/index.ejs views/service.ejs views/quote.ejs views/contact.ejs views/regulations.ejs test/i18n.test.js
git commit -m "feat: localize public site pages"
```

### Task 4: Localize contract and client portal UI without translating stored records

**Files:**
- Modify: `views/contract.ejs`
- Modify: `views/portal-login.ejs`
- Modify: `views/portal-password.ejs`
- Modify: `views/portal-dashboard.ejs`
- Modify: `public/js/i18n.js`
- Modify: `test/i18n.test.js`

- [ ] **Step 1: Add failing tests for client workflow localization boundaries**

```js
test('localizes client contract and portal interface while preserving saved values', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const contract = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');
  const portal = fs.readFileSync(path.join(__dirname, '..', 'views', 'portal-dashboard.ejs'), 'utf8');

  assert.match(contract, /data-i18n="contract\.lookup\.open"/);
  assert.match(contract, /PetFlyI18n\.t\('contract\.error\.notFound'/);
  assert.match(portal, /PetFlyI18n\.t\('portal\.progress'/);
  assert.match(portal, /appendText\(intro, 'h2', text\(detail\.contract_data/);
});
```

- [ ] **Step 2: Run client workflow tests to verify they fail**

Run: `node --test test/i18n.test.js`

Expected: FAIL because contract and portal scripts use English literals and do not call `PetFlyI18n.t()`.

- [ ] **Step 3: Implement client-page keys and dynamic translation calls**

Mark static UI in the contract and portal templates. Translate JavaScript-generated interface text through `PetFlyI18n.t()`, including status labels, document labels, empty states, errors, upload/view actions, and lookup/signing actions.

Keep these values passed through `text()` or rendered with EJS unchanged: client email, contract number, pet name, route, dates, customer input, admin notes, document labels, file names, legal terms, and status notes. Keep the contract terms section in English and do not add `data-i18n` attributes to it.

Add `data-i18n` keys to the portal login and password pages. They already include the shared header, so no additional bootstrap code is required.

- [ ] **Step 4: Run client workflow localization tests**

Run: `node --test test/i18n.test.js`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit client workflow localization**

```bash
git add public/js/i18n.js views/contract.ejs views/portal-login.ejs views/portal-password.ejs views/portal-dashboard.ejs test/i18n.test.js
git commit -m "feat: localize client contract and portal"
```

### Task 5: Verify browser behavior and full regression suite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document behavior for translators and operations**

Append this implementation note to `README.md`:

```markdown
## Visitor Languages

Client-facing pages support English, Spanish, and Simplified Chinese. The first visit follows the browser language (`es-*` and `zh-*` are recognized); the language menu saves a browser-only override under `petfly_language`. The admin interface and saved client or administrator records remain in English or their originally entered language.
```

- [ ] **Step 2: Run unit and full application tests**

Run: `node --test test/i18n.test.js && npm test && node --check server.js && git diff --check`

Expected: all tests pass, JavaScript syntax is valid, and `git diff --check` has no output.

- [ ] **Step 3: Run browser verification**

Run the local server using the existing project command and verify these cases in a browser:

1. Clear `localStorage.petfly_language`, set browser language preference to `es-MX`, refresh `/`, and confirm Spanish navigation and page labels.
2. Select Chinese from the language menu, refresh, navigate to `/quote`, `/contract`, and `/portal/login`, and confirm the choice persists.
3. Set a browser language preference of `fr-CA`, clear the saved preference, and confirm English remains visible.
4. Open `/admin` and confirm admin labels remain English.
5. Open a client portal relocation and confirm saved pet name, contract number, and client-visible admin note are not altered by the selector.

- [ ] **Step 4: Commit final documentation and verification result**

```bash
git add README.md
git commit -m "docs: describe visitor language selection"
```

## Plan Self-Review

- Scope coverage: Tasks 1-2 implement detection, preference persistence, document language metadata, and the selector. Task 3 covers all public pages. Task 4 covers client contract and portal workflows while explicitly protecting saved data and contract terms. Task 5 verifies behavior and documents it.
- Placeholder scan: no incomplete work markers or deferred implementation steps are included.
- Type consistency: all tasks use `PetFlyI18n`, `resolveLanguage`, `translate`, `getLanguage`, `setLanguage`, and `apply` consistently.
