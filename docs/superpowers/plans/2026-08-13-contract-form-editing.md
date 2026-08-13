# Contract Form Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the admin and client contract forms with structured selects, dates, metric measurements, calculated pricing, and an admin-only quotation.

**Architecture:** Add pure helpers for contract defaults and monetary calculations in `lib/contracts.js`. The legacy admin SPA and public EJS page consume the same field metadata concepts independently, while the server normalizes calculated values before persisting the JSON snapshot.

**Tech Stack:** Node.js, Express, EJS, browser JavaScript, Node test runner.

---

### Task 1: Contract Data Helpers

**Files:**
- Modify: `lib/contracts.js`
- Modify: `test/contracts.test.js`

- [ ] **Step 1: Write the failing tests**

```js
const { blankContractData, calculateQuotationTotal, calculateBalance } = require('../lib/contracts');

test('uses the supplied date as the contract effective date', () => {
  assert.equal(blankContractData('2026-08-13').agreement.effective_date, '2026-08-13');
});

test('calculates quotation total and remaining balance from numeric input', () => {
  assert.equal(calculateQuotationTotal({ cargo_charge: '100', vaccination: '25.50', documentation: '' }), '125.50');
  assert.equal(calculateBalance('125.50', '50'), '75.50');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/contracts.test.js`

Expected: failure because the helper exports do not exist.

- [ ] **Step 3: Implement the helpers**

```js
const quotationAmountFields = ['cargo_charge', 'vaccination', 'documentation', 'customs_service', 'quarantine', 'other_service'];

function calculateQuotationTotal(quotation = {}) {
  const total = quotationAmountFields.reduce((sum, key) => sum + (Number.parseFloat(quotation[key]) || 0), 0);
  return total.toFixed(2);
}

function calculateBalance(totalCost, depositAmount) {
  return Math.max(0, (Number.parseFloat(totalCost) || 0) - (Number.parseFloat(depositAmount) || 0)).toFixed(2);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test test/contracts.test.js`

Expected: all contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/contracts.js test/contracts.test.js
git commit -m "feat: add contract pricing helpers"
```

### Task 2: Normalize Saved Contract Values

**Files:**
- Modify: `server.js`
- Modify: `test/contracts.test.js`

- [ ] **Step 1: Write the failing test for normalized quotation values**

```js
test('normalizes total and balance before contract persistence', () => {
  const data = normalizeContractData({ quotation: { cargo_charge: '80', vaccination: '20' }, payment: { deposit_amount: '25' } });
  assert.equal(data.quotation.total_cost, '100.00');
  assert.equal(data.payment.balance_amount, '75.00');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/contracts.test.js`

Expected: failure because `normalizeContractData` is unavailable.

- [ ] **Step 3: Implement normalization and use it in create, update, and issue routes**

```js
function normalizeContractData(data = {}) {
  const contract = { ...blankContractData(), ...data, quotation: { ...blankContractData().quotation, ...(data.quotation || {}) }, payment: { ...blankContractData().payment, ...(data.payment || {}) } };
  contract.quotation.total_cost = calculateQuotationTotal(contract.quotation);
  contract.payment.balance_amount = calculateBalance(contract.quotation.total_cost, contract.payment.deposit_amount);
  return contract;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test test/contracts.test.js`

Expected: all contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add server.js test/contracts.test.js
git commit -m "feat: normalize contract quotation totals"
```

### Task 3: Update the Admin Contract Editor

**Files:**
- Modify: `admin/app.js`
- Modify: `test/contracts.test.js`

- [ ] **Step 1: Write source-level regression tests**

```js
const adminScript = fs.readFileSync(path.join(__dirname, '..', 'admin', 'app.js'), 'utf8');
assert.match(adminScript, /Feline.*Canine.*Reptile.*Birds.*Other/);
assert.match(adminScript, /Female Spayed.*Male Neutered.*Female Intact.*Male Intact/);
assert.match(adminScript, /WeChat RMB.*Alipay RMB.*Bank Transfer RMB.*Zelle.*Wire/);
assert.match(adminScript, /calculateAdminContractTotals/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/contracts.test.js`

Expected: failure because the new controls and calculation function are absent.

- [ ] **Step 3: Render native dates, selects, metric fields, grouped travel rows, and full-width quotation rows**

Use field metadata with `type: 'date'`, `type: 'select'`, `type: 'number'`, and `readOnly` flags. Use `oninput="calculateAdminContractTotals()"` on service amounts and deposit, and write read-only `total_cost` and `balance_amount` inputs.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test test/contracts.test.js`

Expected: admin control tests pass.

- [ ] **Step 5: Commit**

```bash
git add admin/app.js test/contracts.test.js
git commit -m "feat: improve admin contract editor"
```

### Task 4: Restrict and Update the Client Contract Editor

**Files:**
- Modify: `views/contract.ejs`
- Modify: `test/contracts.test.js`

- [ ] **Step 1: Write source-level regression tests**

```js
const clientTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'contract.ejs'), 'utf8');
assert.match(clientTemplate, /clientReadOnly/);
assert.match(clientTemplate, /Shipping Method/);
assert.match(clientTemplate, /data-group="quotation"/);
assert.match(clientTemplate, /weight_kg/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test test/contracts.test.js`

Expected: failure because client quotation locking is absent.

- [ ] **Step 3: Render matching field types and client read-only policy**

The client renderer sets `readonly` or `disabled` for every quotation field and calculated/payment field. `collectContract()` skips those fields so client submission cannot alter them. Render travel rows as departure then arrival grids.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test test/contracts.test.js`

Expected: client restriction tests pass.

- [ ] **Step 5: Commit**

```bash
git add views/contract.ejs test/contracts.test.js
git commit -m "feat: protect client contract quotation"
```

### Task 5: Full Verification

**Files:**
- Verify: `test/*.test.js`
- Verify: `admin/app.js`
- Verify: `views/contract.ejs`

- [ ] **Step 1: Run the complete test suite**

Run: `npm test && node --check server.js && git diff --check`

Expected: all tests pass, syntax check succeeds, and no whitespace errors.

- [ ] **Step 2: Run the app and inspect both flows**

Run: `npm start`

Expected: server logs `[Contract database] Schema ready`.

Validate: `/admin` -> Contracts -> New Contract -> enter 100 and 25 in quotation -> total shows 125.00 -> enter 50 deposit -> balance shows 75.00 -> Save & Issue; `/contract` -> contract number -> quotation cannot be edited while client fields can.

- [ ] **Step 3: Commit verification-ready work**

```bash
git add admin/app.js lib/contracts.js server.js test/contracts.test.js views/contract.ejs
git commit -m "feat: refine contract forms and calculations"
```
