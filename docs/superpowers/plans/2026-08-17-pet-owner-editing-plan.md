# PetConnect Pet Owner Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PetConnect owners to edit every stored detail of their own pets and add a direct owner sign-in entry to the public PetConnect page.

**Architecture:** Add a server-rendered edit page and a member-scoped multipart POST handler alongside the existing pet registration and deletion routes. The handler reuses current field validation, updates a single primary photo safely, and returns owners to their dashboard. The PetConnect registry hero gets a direct link to the existing member login route.

**Tech Stack:** Node.js, Express, EJS, Multer, MySQL, Node test runner.

---

### Task 1: Specify owner editing behavior

**Files:**
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('PetConnect owners can edit their own pet details and use the public sign-in entry', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'views', 'petconnect-dashboard.ejs'), 'utf8');
  const editor = fs.readFileSync(path.join(__dirname, '..', 'views', 'petconnect-pet-edit.ejs'), 'utf8');
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');
  assert.match(server, /app\.get\('\/dashboard\/pets\/:id\/edit'/);
  assert.match(server, /app\.post\('\/api\/petconnect\/pets\/:id'/);
  assert.match(server, /WHERE id=\? AND member_id=\?/);
  assert.match(dashboard, /\/dashboard\/pets\/<%= pet\.id %>\/edit/);
  assert.match(editor, /name="remove_photo"/);
  assert.match(registry, /href="\/login"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/petconnect.test.js`

Expected: FAIL because the edit route, editor view, and public sign-in link do not exist.

### Task 2: Add secure pet editor and update action

**Files:**
- Modify: `server.js`
- Create: `views/petconnect-pet-edit.ejs`

- [ ] **Step 1: Add the member-scoped editor route**

```js
app.get('/dashboard/pets/:id/edit', requireMember, async (req, res) => {
  const pets = await query('SELECT id, pet_name, microchip_number, species, breed, color, gender, birth_date, photo_filename, notes FROM registered_pets WHERE id=? AND member_id=?', [req.params.id, req.session.memberId]);
  if (!pets.length) return res.redirect('/dashboard?pet_error=' + encodeURIComponent('Pet not found.'));
  res.render('petconnect-pet-edit', { footer: await getFooter(), pet: pets[0], error: null });
});
```

- [ ] **Step 2: Add multipart member-scoped update action**

```js
app.post('/api/petconnect/pets/:id', requireMember, petUpload.single('photo'), async (req, res) => {
  // Validate pet fields, load the pet with id and member_id, preserve or replace its photo,
  // update only the signed-in owner's record, then remove any replaced file after success.
});
```

- [ ] **Step 3: Add prefilled editor view**

```ejs
<form method="post" action="/api/petconnect/pets/<%= pet.id %>" enctype="multipart/form-data" class="auth-form">
  <input name="pet_name" value="<%= pet.pet_name %>" required>
  <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif">
  <label class="checkbox-label"><input type="checkbox" name="remove_photo"> Remove current photo</label>
</form>
```

- [ ] **Step 4: Run focused test to verify it passes**

Run: `node --test test/petconnect.test.js`

Expected: PASS.

### Task 3: Expose the owner workflow

**Files:**
- Modify: `views/petconnect-dashboard.ejs`
- Modify: `views/registry.ejs`

- [ ] **Step 1: Add the card editor link**

```ejs
<a class="btn-outline-public" href="/dashboard/pets/<%= pet.id %>/edit">Edit</a>
```

- [ ] **Step 2: Add the public owner sign-in link**

```ejs
<a class="btn-outline-public" href="/login">Pet owner sign in</a>
```

- [ ] **Step 3: Run the full verification suite**

Run: `npm test && node --check server.js && git diff --check`

Expected: all tests pass, syntax check passes, and no whitespace errors are reported.

### Task 4: Publish

**Files:**
- Modify: `server.js`
- Modify: `views/petconnect-dashboard.ejs`
- Create: `views/petconnect-pet-edit.ejs`
- Modify: `views/registry.ejs`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Commit the feature**

```bash
git add server.js views/petconnect-dashboard.ejs views/petconnect-pet-edit.ejs views/registry.ejs test/petconnect.test.js docs/superpowers/plans/2026-08-17-pet-owner-editing-plan.md
git commit -m "add PetConnect pet owner editing"
```

- [ ] **Step 2: Push deployment branch**

```bash
git push origin HEAD:main
```
