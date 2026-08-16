# PetConnect Microchip Contact Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the public search a registered pet's microchip and privately relay a finder message to the owner's account email.

**Architecture:** Add public lookup and contact-relay endpoints to the existing Express application. The lookup query selects only pet fields for the view; a separate server-only query obtains the owner's email to send a message. The existing PetConnect registry page hosts the search form, permitted pet result, and finder form.

**Tech Stack:** Node.js, Express 4, EJS, MySQL with `mysql2`, Nodemailer, Node's built-in test runner.

---

### Task 1: Specify the public lookup contract

**Files:**
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Add a failing test for routes and private owner data**

```js
test('PetConnect provides a public microchip lookup with owner-private results', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');
  assert.match(server, /req\.query\.microchip/);
  assert.match(server, /app\.post\('\/registry\/microchip-contact'/);
  assert.match(server, /sendEmail\(pet\.owner_email/);
  assert.match(registry, /name="microchip"/);
  assert.match(registry, /name="finder_name"/);
  assert.match(registry, /name="message"/);
  assert.doesNotMatch(registry, /owner_email/);
  assert.doesNotMatch(registry, /owner_phone/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because no contact endpoint exists**

Run: `node --test test/petconnect.test.js`

- [ ] **Step 3: Commit the red test**

Run: `git add test/petconnect.test.js && git commit -m "test: specify PetConnect microchip contact relay"`

### Task 2: Implement lookup and relay behavior

**Files:**
- Modify: `server.js:343-365`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Add request-validation helpers before the PetConnect routes**

```js
const microchipPattern = /^\d{9,15}$/;
const publicPetConnectAttempts = new Map();
function normalizedMicrochip(value) { return String(value || '').replace(/[\s-]/g, ''); }
function allowPublicPetConnectRequest(req, action, limit) {
  const key = `${action}:${req.ip}`;
  const cutoff = Date.now() - 3600000;
  const attempts = (publicPetConnectAttempts.get(key) || []).filter(time => time > cutoff);
  if (attempts.length >= limit) return false;
  attempts.push(Date.now());
  publicPetConnectAttempts.set(key, attempts);
  return true;
}
function validFinderEmail(value) { return /^\S+@\S+\.\S+$/.test(String(value || '').trim()); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
```

- [ ] **Step 2: Extend `GET /registry` with a verified-public-pet lookup**

```js
const microchip = normalizedMicrochip(req.query.microchip);
const microchipSearched = Boolean(req.query.microchip);
let microchipPet = null;
if (microchipPattern.test(microchip) && allowPublicPetConnectRequest(req, 'lookup', 20)) {
  const pets = await query(`SELECT p.id, p.pet_name, p.microchip_number, p.species, p.breed, p.color, p.gender, p.birth_date, p.photo_filename
    FROM registered_pets p JOIN members m ON m.id=p.member_id
    WHERE p.microchip_number=? AND m.is_verified=TRUE LIMIT 1`, [microchip]);
  microchipPet = pets[0] || null;
}
```

Pass `microchip`, `microchipSearched`, `microchipPet`, and a validated `contact` query value into the existing registry render call.

- [ ] **Step 3: Add the owner-email relay endpoint after `GET /registry`**

```js
app.post('/registry/microchip-contact', async (req, res) => {
  const microchip = normalizedMicrochip(req.body.microchip);
  const finderName = String(req.body.finder_name || '').trim();
  const finderEmail = String(req.body.finder_email || '').trim();
  const finderPhone = String(req.body.finder_phone || '').trim();
  const message = String(req.body.message || '').trim();
  const redirect = state => res.redirect('/registry?microchip=' + encodeURIComponent(microchip) + '&contact=' + state);
  if (!allowPublicPetConnectRequest(req, 'contact', 5) || !microchipPattern.test(microchip) || !finderName || !validFinderEmail(finderEmail) || !message || message.length > 3000) return redirect('invalid');
  try {
    const pets = await query(`SELECT p.pet_name, m.email AS owner_email FROM registered_pets p JOIN members m ON m.id=p.member_id WHERE p.microchip_number=? AND m.is_verified=TRUE LIMIT 1`, [microchip]);
    const pet = pets[0];
    if (pet) {
      const html = `<p>Someone has sent a PetConnect message about <strong>${escapeHtml(pet.pet_name)}</strong>.</p><p><strong>Finder:</strong> ${escapeHtml(finderName)}<br><strong>Email:</strong> ${escapeHtml(finderEmail)}<br><strong>Phone:</strong> ${escapeHtml(finderPhone || 'Not provided')}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;
      await sendEmail(pet.owner_email, `PetConnect message about ${pet.pet_name}`, html);
    }
  } catch (err) { console.error('[PetConnect microchip contact]', err); }
  return redirect('sent');
});
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `node --test test/petconnect.test.js`

- [ ] **Step 5: Commit the behavior**

Run: `git add server.js test/petconnect.test.js && git commit -m "feat: add private PetConnect microchip contact relay"`

### Task 3: Render the public search and contact form

**Files:**
- Modify: `views/registry.ejs:2-4`
- Modify: `public/css/style-v2.css:848-930`
- Modify: `test/petconnect.test.js`

- [ ] **Step 1: Add a failing registry-view test**

```js
test('PetConnect registry displays matching pet details and a private relay form', () => {
  const registry = fs.readFileSync(path.join(__dirname, '..', 'views', 'registry.ejs'), 'utf8');
  assert.match(registry, /Found a pet\?/);
  assert.match(registry, /action="\/registry\/microchip-contact"/);
  assert.match(registry, /microchipPet\.photo_filename/);
  assert.match(registry, /contact === 'sent'/);
  assert.doesNotMatch(registry, /owner_email/);
});
```

- [ ] **Step 2: Run `node --test test/petconnect.test.js` and confirm the view test fails**

- [ ] **Step 3: Insert a PetConnect lookup section before the live-network section**

```ejs
<section class="section microchip-lookup-section"><div class="container">
  <div class="section-header-public"><div><span class="section-label">PetConnect</span><h2>Found a pet?</h2><p>Search a microchip to contact a registered owner privately.</p></div></div>
  <form class="petconnect-filters" method="get" action="/registry"><input name="microchip" value="<%= microchip || '' %>" inputmode="numeric" pattern="[0-9 -]{9,20}" placeholder="Microchip number" required><button class="btn-primary" type="submit">Search microchip</button></form>
  <% if (microchipSearched && !microchipPet) { %><div class="empty-state-public"><p>No public PetConnect record was found for that microchip number.</p></div><% } %>
  <% if (microchipPet) { %><article class="microchip-result"><% if (microchipPet.photo_filename) { %><img src="<%= microchipPet.photo_filename %>" alt="<%= microchipPet.pet_name %>"><% } %><div><h3><%= microchipPet.pet_name %></h3><p><%= [microchipPet.species, microchipPet.breed, microchipPet.color, microchipPet.gender].filter(Boolean).join(' · ') %></p><p>Microchip: <%= microchipPet.microchip_number %></p></div></article><% if (contact === 'sent') { %><p class="auth-success">Your message has been sent to the registered owner.</p><% } %><% if (contact === 'invalid') { %><p class="auth-error">Enter your name, a valid email address, and a message.</p><% } %><form class="auth-form microchip-contact-form" method="post" action="/registry/microchip-contact"><input type="hidden" name="microchip" value="<%= microchipPet.microchip_number %>"><label>Your name<input name="finder_name" required></label><label>Your email<input type="email" name="finder_email" required></label><label>Your phone <span>(optional)</span><input name="finder_phone"></label><label>Message<textarea name="message" rows="5" maxlength="3000" required></textarea></label><button class="btn-primary" type="submit">Send private message</button></form><% } %>
</div></section>
```

- [ ] **Step 4: Add responsive CSS for `.microchip-result` and `.microchip-contact-form`**

```css
.microchip-result { display:grid; grid-template-columns:180px 1fr; gap:1.25rem; margin-top:1.25rem; padding:1rem; border:1px solid var(--border); background:#fff; }
.microchip-result img { width:180px; height:140px; object-fit:cover; }
.microchip-contact-form { max-width:680px; margin-top:1rem; }
@media (max-width:600px) { .microchip-result { grid-template-columns:1fr; } .microchip-result img { width:100%; height:220px; } }
```

- [ ] **Step 5: Run `node --test test/petconnect.test.js` and confirm all tests pass**

- [ ] **Step 6: Commit the interface**

Run: `git add views/registry.ejs public/css/style-v2.css test/petconnect.test.js && git commit -m "feat: add PetConnect microchip search interface"`

### Task 4: Validate and publish

**Files:**
- Verify: `server.js`, `views/registry.ejs`, `public/css/style-v2.css`, `test/petconnect.test.js`

- [ ] **Step 1: Run static and complete test checks**

Run: `node --check server.js && git diff --check && npm test`

Expected: every command exits with status 0.

- [ ] **Step 2: Start the app with `npm start` and visit `http://localhost:3000/registry`**

- [ ] **Step 3: Search a registered test microchip and verify that pet details and the form render without owner contact details**

- [ ] **Step 4: Submit invalid form data and confirm that the error state renders; submit valid data and confirm generic success text appears**

- [ ] **Step 5: Commit and push the completed feature**

Run: `git push origin HEAD:main`
