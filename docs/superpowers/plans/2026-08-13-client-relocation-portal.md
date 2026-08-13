# Client Relocation Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an email-and-password client portal where each client views every active contract, relocation progress, events, documents, and YouTube boarding updates managed by Pet Fly administrators.

**Architecture:** Keep contract data in `contracts.contract_data`; add normalized client-account, contract-link, status-update, event, document, and boarding-update tables. Server routes enforce portal account ownership. The existing admin SPA manages portal content through contract-specific modals, while new EJS portal pages render client-facing progress and records.

**Tech Stack:** Node.js, Express, MySQL 8, express-session, bcryptjs, Multer, EJS, vanilla JavaScript, Font Awesome.

---

### Task 1: Create Portal Schema And Data Helpers

**Files:**
- Create: `migrations/002_create_client_portal.sql`
- Create: `lib/portal.js`
- Modify: `lib/contract-database.js`
- Modify: `test/contracts-migration.test.js`
- Create: `test/portal.test.js`

- [ ] **Step 1: Write failing tests for portal defaults, status ordering, document expiry, and YouTube normalization**

```js
const { relocationSteps, documentCategories, documentExpiryStatus, normalizeYouTubeUrl } = require('../lib/portal');

test('uses the approved relocation status order', () => {
  assert.deepEqual(relocationSteps, ['Consulting', 'Contract Signed', 'Pick-Up', 'Exam/Vaccination', 'Documentation', 'On Route', 'In-Transfer', 'Home Delivery']);
});

test('classifies expired and soon-expiring documents', () => {
  assert.equal(documentExpiryStatus('2026-08-12', '2026-08-13'), 'expired');
  assert.equal(documentExpiryStatus('2026-09-01', '2026-08-13'), 'expiring');
  assert.equal(documentExpiryStatus('2026-12-01', '2026-08-13'), 'valid');
});

test('normalizes supported YouTube URLs', () => {
  assert.equal(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(normalizeYouTubeUrl('https://example.com/video'), null);
});
```

- [ ] **Step 2: Run the portal test to verify it fails**

Run: `node --test test/portal.test.js`

Expected: FAIL because `lib/portal.js` does not exist.

- [ ] **Step 3: Add the portal tables and helpers**

Create `migrations/002_create_client_portal.sql` with these tables and relationships:

```sql
CREATE TABLE IF NOT EXISTS client_accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS client_contracts (
  client_account_id INT UNSIGNED NOT NULL,
  contract_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (client_account_id, contract_id),
  FOREIGN KEY (client_account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS relocation_updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  status_step VARCHAR(64) NOT NULL,
  client_note TEXT NULL,
  internal_note TEXT NULL,
  occurred_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_relocation_updates_contract_date (contract_id, occurred_at)
);
CREATE TABLE IF NOT EXISTS relocation_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  location VARCHAR(255) NULL,
  starts_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_relocation_events_contract_date (contract_id, starts_at)
);
CREATE TABLE IF NOT EXISTS relocation_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  category VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  file_url VARCHAR(512) NULL,
  issued_on DATE NULL,
  expires_on DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_relocation_documents_contract_expiry (contract_id, expires_on)
);
CREATE TABLE IF NOT EXISTS boarding_updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  youtube_id VARCHAR(32) NOT NULL,
  client_note TEXT NULL,
  published_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_boarding_updates_contract_date (contract_id, published_at)
);
```

Create `lib/portal.js` exporting the fixed status array, document category array, `documentExpiryStatus(expiresOn, today)`, `normalizeYouTubeUrl(url)`, and `isActiveRelocation(statusStep)`.

Update `ensureContractSchema` to run `001_create_contracts.sql` followed by `002_create_client_portal.sql`, splitting only this new multi-statement migration into statements before executing them.

- [ ] **Step 4: Run schema and helper tests**

Run: `node --test test/contracts-migration.test.js test/portal.test.js`

Expected: PASS.

- [ ] **Step 5: Commit schema foundation**

```bash
git add migrations/002_create_client_portal.sql lib/portal.js lib/contract-database.js test/contracts-migration.test.js test/portal.test.js
git commit -m "feat: add client portal schema"
```

### Task 2: Add Client Account Authentication And Portal Data API

**Files:**
- Modify: `server.js`
- Modify: `views/partials/header.ejs`
- Create: `views/portal-login.ejs`
- Create: `views/portal-password.ejs`
- Create: `test/portal-auth.test.js`

- [ ] **Step 1: Write failing API and rendering tests**

```js
test('exposes a portal login route and requires an initial password change', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.post\('\/portal\/login'/);
  assert.match(server, /must_change_password/);
  assert.match(server, /requirePortalAccount/);
});

test('points the public client login link to the portal', () => {
  const header = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.ejs'), 'utf8');
  assert.match(header, /href="\/portal\/login"/);
});
```

- [ ] **Step 2: Run the authentication test to verify it fails**

Run: `node --test test/portal-auth.test.js`

Expected: FAIL because portal login routes do not exist.

- [ ] **Step 3: Implement account session middleware and portal routes**

Add `requirePortalAccount` to `server.js`; it redirects browser requests to `/portal/login` and sends `401` JSON for `/api/portal/*` requests when the session has no `clientAccountId`.

Implement:

```js
app.get('/portal/login', ...);
app.post('/portal/login', ...); // bcrypt.compare, session.clientAccountId, enforce must_change_password
app.post('/portal/logout', ...);
app.get('/portal/change-password', requirePortalAccount, ...);
app.post('/portal/change-password', requirePortalAccount, ...); // bcrypt.hash and clear must_change_password
app.get('/api/portal/relocations', requirePortalAccount, ...);
app.get('/api/portal/relocations/:contractId', requirePortalAccount, ...);
```

The data route joins `client_contracts` to `contracts`, rejects contracts not assigned to the logged-in account, and returns only `client_note` from updates, never `internal_note`.

Change both desktop and mobile Client Login links from `/CRM` to `/portal/login`.

- [ ] **Step 4: Run authentication tests**

Run: `node --test test/portal-auth.test.js`

Expected: PASS.

- [ ] **Step 5: Commit portal access**

```bash
git add server.js views/partials/header.ejs views/portal-login.ejs views/portal-password.ejs test/portal-auth.test.js
git commit -m "feat: add client portal login"
```

### Task 3: Build The Client Dashboard

**Files:**
- Create: `views/portal-dashboard.ejs`
- Modify: `server.js`
- Create: `test/portal-dashboard.test.js`

- [ ] **Step 1: Write failing dashboard rendering tests**

```js
test('renders every relocation status and document category in the portal dashboard', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'views', 'portal-dashboard.ejs'), 'utf8');
  assert.match(dashboard, /Consulting/);
  assert.match(dashboard, /Home Delivery/);
  assert.match(dashboard, /Rabies Vaccination/);
  assert.match(dashboard, /Client Identifications/);
  assert.match(dashboard, /youtube-nocookie\.com/);
});
```

- [ ] **Step 2: Run dashboard test to verify it fails**

Run: `node --test test/portal-dashboard.test.js`

Expected: FAIL because the dashboard template does not exist.

- [ ] **Step 3: Implement the dashboard page**

Add `GET /portal` with `requirePortalAccount` and render `portal-dashboard.ejs`.

In `portal-dashboard.ejs`, use a dense operational layout:

- A pet/contract switcher showing pet name, route, and current status.
- A horizontal stepper with completion/current/upcoming states for all eight approved statuses.
- A timeline with timestamped client notes.
- An upcoming-events list sorted by `starts_at`; use date chips rather than a dependency-heavy calendar library.
- A document table with category, issue date, expiry date, downloadable file link, and expired/expiring/valid status.
- Boarding cards with `https://www.youtube-nocookie.com/embed/<youtube_id>` if an update exists.
- Existing pet photo thumbnails.

Use one small inline script that loads `/api/portal/relocations` and `/api/portal/relocations/:contractId`, then renders selected relocation data safely through escaped text nodes.

- [ ] **Step 4: Run template and dashboard tests**

Run: `node --test test/portal-dashboard.test.js && node -e "require('ejs').renderFile('views/portal-dashboard.ejs', {}, e => { if (e) throw e; })"`

Expected: PASS.

- [ ] **Step 5: Commit dashboard**

```bash
git add server.js views/portal-dashboard.ejs test/portal-dashboard.test.js
git commit -m "feat: add relocation dashboard"
```

### Task 4: Add Admin Account And Relocation Management APIs

**Files:**
- Modify: `server.js`
- Modify: `test/portal.test.js`
- Create: `test/portal-admin.test.js`

- [ ] **Step 1: Write failing tests for protected admin management endpoints**

```js
test('provides protected admin APIs for portal accounts and relocation records', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/portal-account', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/relocation-updates', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/documents', requireAdmin/);
  assert.match(server, /app\.post\('\/api\/admin\/contracts\/:id\/boarding-updates', requireAdmin/);
});
```

- [ ] **Step 2: Run the admin API test to verify it fails**

Run: `node --test test/portal-admin.test.js`

Expected: FAIL because the endpoints do not exist.

- [ ] **Step 3: Implement account and relocation management endpoints**

Implement these `requireAdmin` routes:

```text
GET    /api/admin/contracts/:id/portal
POST   /api/admin/contracts/:id/portal-account
POST   /api/admin/contracts/:id/portal-password-reset
POST   /api/admin/contracts/:id/relocation-updates
DELETE /api/admin/relocation-updates/:updateId
POST   /api/admin/contracts/:id/events
PUT    /api/admin/events/:eventId
DELETE /api/admin/events/:eventId
POST   /api/admin/contracts/:id/documents
DELETE /api/admin/documents/:documentId
POST   /api/admin/contracts/:id/boarding-updates
PUT    /api/admin/boarding-updates/:updateId
DELETE /api/admin/boarding-updates/:updateId
```

`portal-account` finds or creates the normalized email account, hashes the supplied initial password, sets `must_change_password=TRUE`, links the contract id idempotently, and emails portal access using `SITE_URL` with `/portal/login`.

The document endpoint uses a dedicated Multer instance allowing PDF/JPG/PNG/WebP only and returns `/uploads/` URLs. Validate every category against `documentCategories`; validate every status against `relocationSteps`; normalize every YouTube link with `normalizeYouTubeUrl` before insertion.

- [ ] **Step 4: Run admin API tests**

Run: `node --test test/portal.test.js test/portal-admin.test.js`

Expected: PASS.

- [ ] **Step 5: Commit admin API layer**

```bash
git add server.js test/portal.test.js test/portal-admin.test.js
git commit -m "feat: add relocation admin APIs"
```

### Task 5: Add Admin Portal Management UI

**Files:**
- Modify: `admin/app.js`
- Modify: `views/admin.ejs`
- Modify: `test/contracts.test.js`

- [ ] **Step 1: Write failing admin UI tests**

```js
test('includes relocation portal management in the admin contract editor', () => {
  const admin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  assert.match(admin, /Relocation Portal/);
  assert.match(admin, /savePortalAccount/);
  assert.match(admin, /addRelocationUpdate/);
  assert.match(admin, /addRelocationDocument/);
  assert.match(admin, /addBoardingUpdate/);
});
```

- [ ] **Step 2: Run the admin UI test to verify it fails**

Run: `node --test test/contracts.test.js`

Expected: FAIL because contract editor has no portal controls.

- [ ] **Step 3: Implement a contract-linked portal modal**

Add a `Manage Portal` action to each saved contract row. Its modal loads `GET /api/admin/contracts/:id/portal` and provides:

- Client account email plus initial-password/reset-password controls.
- Status selection, client-visible note, internal note, occurred date/time, and timeline history.
- Event title/type/date/time/location/description controls and editable event list.
- Document category/label/issue/expiry/file upload controls and document list.
- YouTube URL/title/date/client note controls and boarding update list.

Do not place all portal fields inside the existing contract save payload. Each portal action calls its dedicated API endpoint and rerenders the portal modal after a successful response.

- [ ] **Step 4: Run full UI-oriented tests**

Run: `node --test test/contracts.test.js test/portal-admin.test.js && node --check admin/app.js`

Expected: PASS.

- [ ] **Step 5: Commit admin controls**

```bash
git add admin/app.js views/admin.ejs test/contracts.test.js
git commit -m "feat: manage relocation portal from admin"
```

### Task 6: End-To-End Verification And Deployment Readiness

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Test: `test/portal-auth.test.js`
- Test: `test/portal-dashboard.test.js`

- [ ] **Step 1: Document production configuration**

Add `SITE_URL=https://petflyinc.com` guidance to `.env.example` and README. Document that `/uploads/` must be persistent on the Hostinger deployment and that YouTube video embeds use no Hostinger video storage.

- [ ] **Step 2: Run all unit and migration checks**

Run: `npm test && node --check server.js && node --check admin/app.js && git diff --check`

Expected: all tests pass; no JavaScript syntax errors; no whitespace errors.

- [ ] **Step 3: Run local authenticated smoke test**

Run these actions against `http://localhost:3000` using a non-production test client account:

```text
1. Admin creates a client account for a test contract.
2. Client signs in and is forced to choose a password.
3. Client sees only that account's contracts.
4. Admin creates a status update, event, document, and YouTube update.
5. Client dashboard renders the new records and does not expose internal notes.
```

Expected: client session cannot access another account's contract ID; document expiry badges and YouTube embed render; admin updates appear after refresh.

- [ ] **Step 4: Commit deployment documentation**

```bash
git add README.md .env.example
git commit -m "docs: configure client portal deployment"
```

