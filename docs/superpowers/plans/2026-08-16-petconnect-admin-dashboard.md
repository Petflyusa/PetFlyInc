# PetConnect Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Admin/PetConnect a summary dashboard and dedicated, searchable workspaces for members, pets, alerts, and organizations, including complete addresses, organization CSV import, and selected invitations.

**Architecture:** Keep the existing Admin single-page application, but replace its single PetConnect section with five Admin sections selected from an expandable sidebar group. Add one additive migration for member street addresses and partner invitation state, protected summary/filter/import/invite APIs in `server.js`, and client-side render functions in `admin/app.js`.

**Tech Stack:** Node.js, Express 4, EJS, MySQL via `mysql2`, Multer memory storage, Nodemailer, vanilla JavaScript, Node test runner.

---

## File Structure

- `migrations/006_petconnect_admin.sql`: additive schema changes for `members.address_line` and organization invitation timestamps.
- `lib/petconnect-database.js`: runs migration `006_petconnect_admin.sql` at startup.
- `server.js`: protected summary, filtered data, CSV preview/import, invitation APIs, and address geocoding updates.
- `views/admin.ejs`: PetConnect expandable navigation and five dedicated Admin sections.
- `admin/app.js`: section loading, filter controls, tables, CSV preview, selection, and invitation actions.
- `views/register.ejs`: complete member-address input.
- `test/petconnect.test.js`: source-contract tests for dashboard and API behavior.

### Task 1: Add schema and test contract for complete locations and invitations

**Files:**
- Create: `migrations/006_petconnect_admin.sql`
- Modify: `lib/petconnect-database.js:5`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Write the failing migration test**

```js
test('PetConnect admin migration supports full member addresses and organization invitations', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '006_petconnect_admin.sql'), 'utf8');
  const database = fs.readFileSync(path.join(__dirname, '..', 'lib', 'petconnect-database.js'), 'utf8');
  assert.match(migration, /ALTER TABLE members ADD COLUMN address_line VARCHAR\(255\) NULL/i);
  assert.match(migration, /ALTER TABLE rescue_partners ADD COLUMN invitation_sent_at TIMESTAMP NULL/i);
  assert.match(migration, /ALTER TABLE rescue_partners ADD COLUMN invitation_expires_at TIMESTAMP NULL/i);
  assert.match(database, /006_petconnect_admin\.sql/);
});
```

- [ ] **Step 2: Run `node --test test/petconnect.test.js` and confirm this test fails because migration 006 is absent**

- [ ] **Step 3: Add the additive migration and run it from startup**

```sql
ALTER TABLE members ADD COLUMN address_line VARCHAR(255) NULL;
ALTER TABLE rescue_partners ADD COLUMN invitation_sent_at TIMESTAMP NULL;
ALTER TABLE rescue_partners ADD COLUMN invitation_expires_at TIMESTAMP NULL;
ALTER TABLE rescue_partners ADD INDEX idx_partners_invitation (invitation_sent_at, invitation_expires_at);
```

Update the migration list to:

```js
for (const migration of ['003_petconnect.sql', '004_petconnect_alerts.sql', '005_petconnect_locations.sql', '006_petconnect_admin.sql']) {
```

- [ ] **Step 4: Run `node --test test/petconnect.test.js` and confirm the migration test passes**

- [ ] **Step 5: Commit schema support**

Run: `git add migrations/006_petconnect_admin.sql lib/petconnect-database.js test/petconnect.test.js && git commit -m "feat: add PetConnect admin address and invitation schema"`

### Task 2: Add protected summary, filters, and full-address persistence

**Files:**
- Modify: `server.js:343-405`, `server.js:711-786`
- Modify: `views/register.ejs:4-24`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Write failing API source-contract tests**

```js
test('PetConnect admin provides dashboard summaries and filtered dedicated data APIs', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.get\('\/api\/admin\/petconnect\/summary'/);
  assert.match(server, /req\.query\.verified/);
  assert.match(server, /req\.query\.missing/);
  assert.match(server, /req\.query\.alert_type/);
  assert.match(server, /req\.query\.partner_type_id/);
  assert.match(server, /address_line/);
  assert.match(server, /geocodeAddress\(\[addressLine, city, state, postalCode, country\]\)/);
});
```

- [ ] **Step 2: Run `node --test test/petconnect.test.js` and confirm the API test fails**

- [ ] **Step 3: Implement a summary endpoint**

```js
app.get('/api/admin/petconnect/summary', requireAdmin, async (req, res) => {
  const [members, pets, alerts, partners] = await Promise.all([
    query('SELECT COUNT(*) total, SUM(is_verified=TRUE) verified FROM members'),
    query('SELECT COUNT(*) total, SUM(is_missing=TRUE) missing FROM registered_pets'),
    query("SELECT COUNT(*) total, SUM(status='active') active FROM missing_alerts"),
    query('SELECT COUNT(*) total, SUM(is_active=TRUE) active FROM rescue_partners')
  ]);
  res.json({ members: members[0], pets: pets[0], alerts: alerts[0], partners: partners[0] });
});
```

- [ ] **Step 4: Implement query-parameter filters for each existing list endpoint**

Build a `conditions` array and matching `params` for each endpoint. Apply the following exact clauses only when a validated query value is supplied:

```js
// members: verified=verified|pending, country=US|CA, alerts=on|off
conditions.push('m.is_verified=?'); params.push(req.query.verified === 'verified');
// pets: species=Dog|Cat|Bird|Other, missing=yes|no
conditions.push('p.is_missing=?'); params.push(req.query.missing === 'yes');
// alerts: type=lost|found, status=active|found|closed, country=US|CA
conditions.push('a.status=?'); params.push(req.query.status);
// partners: type=<positive partner type id>, active=yes|no, verified=yes|no, country=US|CA
conditions.push('rp.is_active=?'); params.push(req.query.active === 'yes');
```

Keep parameterized `LIKE` search for the documented fields and return the same response keys: `members`, `pets`, `alerts`, and `partners`.

- [ ] **Step 5: Add the street-address field to member registration and Admin update paths**

```js
const addressLine = String(req.body.address_line || '').trim() || null;
const coordinates = await geocodeAddress([addressLine, city, state, postalCode, country]);
await query('INSERT INTO members (..., address_line, latitude, longitude, ...) VALUES (..., ?, ?, ?, ...)', [..., addressLine, coordinates && coordinates.latitude || null, coordinates && coordinates.longitude || null, ...]);
```

Add `address_line` to the member SELECT and Admin `PUT`, re-geocode on location change, and add this required visual field to `views/register.ejs` before city. Add `address_line` and `postal_code` to the organization Admin create and edit payloads and update them with recalculated partner coordinates.

- [ ] **Step 6: Run `node --test test/petconnect.test.js` and confirm the API test passes**

- [ ] **Step 7: Commit filtered data and full-address support**

Run: `git add server.js views/register.ejs test/petconnect.test.js && git commit -m "feat: filter PetConnect admin records by workspace"`

### Task 3: Add CSV review/import and selected organization invitations

**Files:**
- Modify: `server.js:768-786`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Write failing source-contract tests**

```js
test('PetConnect admins can preview CSV organizations and invite selected records', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/csv-preview'/);
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/csv-import'/);
  assert.match(server, /app\.post\('\/api\/admin\/petconnect\/partners\/invite'/);
  assert.match(server, /crypto\.randomBytes\(32\)\.toString\('hex'\)/);
  assert.match(server, /invitation_expires_at=DATE_ADD\(NOW\(\), INTERVAL 14 DAY\)/);
  assert.match(server, /sendEmail\(partner\.email/);
});
```

- [ ] **Step 2: Run `node --test test/petconnect.test.js` and confirm it fails**

- [ ] **Step 3: Add a CSV parser and preview endpoint using Multer memory storage**

```js
const partnerCsvUpload = multerModule({ storage: multerModule.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
function parsePartnerCsv(csv) {
  const rows = csv.trim().split(/\r?\n/).map(line => line.split(',').map(value => value.trim()));
  const headers = rows.shift().map(header => header.toLowerCase().replace(/\s+/g, '_'));
  return rows.filter(row => row.some(Boolean)).map((row, index) => Object.fromEntries(headers.map((header, column) => [header, row[column] || ''])));
}
```

`POST /api/admin/petconnect/partners/csv-preview` must require a `.csv` file, validate the documented columns, map organization types by label or slug, mark duplicate emails in the uploaded file and database, and return `{ rows: [{ row, data, errors }] }` without writing records.

- [ ] **Step 4: Add import endpoint that accepts reviewed valid rows only**

For every server-revalidated selected row: validate organization, contact, email, city, country, and resolved partner type; geocode full address; insert a partner with `is_active=FALSE`, `is_verified=FALSE`, `verify_token=NULL`, and no invitation timestamps. Return inserted, skipped, and error row numbers. Never call `sendEmail` in this endpoint.

- [ ] **Step 5: Add the selected invitation endpoint**

```js
app.post('/api/admin/petconnect/partners/invite', requireAdmin, async (req, res) => {
  const ids = [...new Set((req.body.partner_ids || []).map(Number).filter(Number.isInteger))];
  const partners = ids.length ? await query('SELECT id, company_name, email FROM rescue_partners WHERE id IN (' + ids.map(() => '?').join(',') + ') AND is_active=FALSE', ids) : [];
  let invited = 0;
  for (const partner of partners) {
    const token = crypto.randomBytes(32).toString('hex');
    await query('UPDATE rescue_partners SET verify_token=?, invitation_sent_at=NOW(), invitation_expires_at=DATE_ADD(NOW(), INTERVAL 14 DAY) WHERE id=?', [token, partner.id]);
    await sendEmail(partner.email, 'Join PetConnect', `<p>${escapeHtml(partner.company_name)}, <a href="${getSiteUrl()}/partner/claim/${token}">set your PetConnect password</a>.</p>`);
    invited += 1;
  }
  res.json({ invited });
});
```

Update partner claim validation to reject expired invitations and, on a successful claim, set `is_verified=TRUE`, `is_active=TRUE`, clear `verify_token`, and preserve invitation history.

- [ ] **Step 6: Run `node --test test/petconnect.test.js` and confirm CSV/invitation tests pass**

- [ ] **Step 7: Commit import and invitation APIs**

Run: `git add server.js test/petconnect.test.js && git commit -m "feat: import and invite PetConnect organizations"`

### Task 4: Build dedicated Admin/PetConnect workspaces

**Files:**
- Modify: `views/admin.ejs:25-55`, `views/admin.ejs:136-143`
- Modify: `admin/app.js:11`, `admin/app.js:45-58`, `admin/app.js:416-442`
- Modify: `public/css/admin.css`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Write the failing Admin UI test**

```js
test('Admin PetConnect uses dashboard and dedicated searchable workspaces', () => {
  const admin = fs.readFileSync(path.join(__dirname, '..', 'views', 'admin.ejs'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
  ['petconnect-overview', 'petconnect-members', 'petconnect-pets', 'petconnect-alerts', 'petconnect-partners'].forEach(section => assert.match(admin, new RegExp('section-' + section)));
  assert.match(admin, /PetConnect Overview/);
  assert.match(app, /loadPetConnectOverview/);
  assert.match(app, /loadPetConnectMembers/);
  assert.match(app, /loadPetConnectPartners/);
  assert.match(app, /previewPartnerCsv/);
  assert.match(app, /inviteSelectedPartners/);
});
```

- [ ] **Step 2: Run `node --test test/petconnect.test.js` and confirm it fails**

- [ ] **Step 3: Replace the single sidebar button with an expandable PetConnect group**

Create buttons with `data-section` values `petconnect-overview`, `petconnect-members`, `petconnect-pets`, `petconnect-alerts`, and `petconnect-partners`. The group trigger toggles its child navigation visibility; each child calls `showSection` for one dedicated section.

- [ ] **Step 4: Create the five Admin section render targets**

The overview has four clickable cards with ids `pcSummaryMembers`, `pcSummaryPets`, `pcSummaryAlerts`, and `pcSummaryPartners`. Each dedicated section includes a text search, the filters defined in the design, an Apply button, and an empty/table container. The Organizations section includes CSV template download, file picker, review container, bulk-selection checkboxes, `Import valid rows`, and `Invite selected` buttons.

- [ ] **Step 5: Implement workspace loaders and rendering in `admin/app.js`**

```js
async function loadPetConnectMembers() {
  const query = new URLSearchParams({ search: value('pcMemberSearch'), verified: value('pcMemberVerified'), country: value('pcMemberCountry'), alerts: value('pcMemberAlerts') });
  const response = await fetch('/api/admin/petconnect/members?' + query, creds);
  const data = await response.json();
  state.petconnect.members = data.members || [];
  renderPetConnectMembers();
}
```

Use this pattern for pets, alerts, and partners. Update `showSection` to call the exact matching loader. After member edits, alert mutations, partner changes, imports, and invites, reload the active workspace rather than all four lists.

For CSV preview, send `FormData` with the selected file to the preview endpoint, render row errors and valid-row checkboxes, then submit selected serialized rows to the import endpoint. `inviteSelectedPartners` collects checked existing partner ids and posts `{ partner_ids: ids }` to the invite endpoint.

- [ ] **Step 6: Add focused CSS for the submenu, summary cards, workspace filter bars, CSV review rows, and mobile wrap behavior**

Use a compact sidebar submenu, four-column summary grid that collapses to two then one column, and horizontally scrollable table wrapper on narrow screens. Reuse the existing Admin color variables and six-pixel corner radius.

- [ ] **Step 7: Run `node --test test/petconnect.test.js` and confirm the Admin UI test passes**

- [ ] **Step 8: Commit the Admin interface**

Run: `git add views/admin.ejs admin/app.js public/css/admin.css test/petconnect.test.js && git commit -m "feat: organize PetConnect admin workspaces"`

### Task 5: Validate the complete workflow

**Files:**
- Verify: `server.js`, `views/admin.ejs`, `admin/app.js`, `views/register.ejs`, `migrations/006_petconnect_admin.sql`, `test/petconnect.test.js`

- [ ] **Step 1: Run complete checks**

Run: `node --check server.js && node --check admin/app.js && git diff --check && npm test`

Expected: each command exits with status 0.

- [ ] **Step 2: Start the application and sign in at `http://localhost:3000/admin`**

- [ ] **Step 3: Verify each PetConnect submenu view, a filter interaction, responsive mobile sidebar behavior, and CSV preview with an invalid-row fixture**

- [ ] **Step 4: Verify one selected organization invitation against a controlled test organization; confirm the invite state is updated without exposing the claim token in Admin UI**

- [ ] **Step 5: Commit and push the finished work**

Run: `git push origin HEAD:main`
