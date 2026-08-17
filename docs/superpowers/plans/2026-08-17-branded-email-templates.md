# Branded Email Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create fixed, branded Pet Fly transactional email templates, public-logo delivery, Admin preview/test controls, and customer spam-folder guidance.

**Architecture:** A pure `lib/email-templates.js` module owns a shared, inline-styled email layout and every event renderer. `server.js` supplies data and sends `{ subject, html, text, attachments, category }` through Nodemailer. The Admin Email Center previews only fake sample data and can send a selected template to a supplied test address.

**Tech Stack:** Node.js, Express, Nodemailer, EJS, vanilla JavaScript, Node built-in test runner.

---

## Files

- Create `lib/email-templates.js` for shared layout, HTML escaping, plain-text output, and all event renderers.
- Create `public/images/petfly-email-logo.png` from the supplied `AROUNDLOGO.png` source.
- Create `test/email-templates.test.js` for pure renderer behavior.
- Modify `server.js` for structured email delivery, route migration, and protected Admin preview/test APIs.
- Modify `views/admin.ejs`, `admin/app.js`, and `public/css/admin.css` for the Email Center.
- Modify `views/quote.ejs`, `views/contact.ejs`, `views/register.ejs`, and `public/css/style-v2.css` for delivery notices.
- Modify `test/petconnect.test.js`, `test/quote.test.js`, and `test/contracts.test.js` for integration coverage.

### Task 1: Shared renderer

**Files:** Create `test/email-templates.test.js`; create `lib/email-templates.js`.

- [ ] Write a failing test that calls `quoteConfirmation({ name: 'Ava <Smith>', siteUrl: 'https://petflyinc.com' })` and asserts the returned message has a subject, public logo URL, escaped name, spam-folder text, and plain-text fallback.
- [ ] Run `node --test test/email-templates.test.js`; expect failure because the module does not exist.
- [ ] Implement `escapeHtml`, `deliveryNotice`, and `layout`. Layout returns `{ html, text }` and uses email-safe tables and inline cream (`#f7f5f0`), charcoal (`#1a1a1a`), and terracotta (`#c4622d`) styling. It includes a header, text-and-image brand lockup, optional CTA plus literal URL fallback, support footer, and optional delivery notice.
- [ ] Implement `quoteConfirmation` and `memberVerification` with exact return shape `{ subject, html, text }`. User values are escaped in HTML and raw only in plain text. Action URLs are output in both HTML and plain text.
- [ ] Run `node --test test/email-templates.test.js`; expect PASS.
- [ ] Commit using message `feat: add branded email template renderer`.

### Task 2: Complete template catalog and add public logo

**Files:** Modify `lib/email-templates.js` and `test/email-templates.test.js`; create `public/images/petfly-email-logo.png`.

- [ ] Add a failing test that asserts all catalog entries have subject, branded HTML, and text: contact confirmation; member verification; contract signed; finder message; lost/found alert; partner verification; partner invitation; portal access; internal quote notification; internal contact notification; SMTP test.
- [ ] Run `node --test test/email-templates.test.js`; expect missing-renderer failures.
- [ ] Implement all catalog renderers. Use spam guidance on externally sent confirmation/action emails, not internal emails. Include a focused CTA for verification, claim, invitation, portal, and alert messages. Contract signed shows a contract number and PDF attachment notice. Finder message preserves private owner contact details. Internal templates show readable detail rows.
- [ ] Copy `/Users/jz/Documents/PET FLY USA/GLOBALPET CANADA/LOGO FILE/AROUNDLOGO.png` to `public/images/petfly-email-logo.png`.
- [ ] Run `node --test test/email-templates.test.js && test -s public/images/petfly-email-logo.png`; expect exit code 0.
- [ ] Commit using message `feat: add Pet Fly transactional email catalog`.

### Task 3: Migrate all send paths to the centralized templates

**Files:** Modify `server.js` at SMTP setup and every current email call site; modify `test/petconnect.test.js`, `test/quote.test.js`, and `test/contracts.test.js`.

- [ ] Add failing source assertions that `server.js` imports `./lib/email-templates`, invokes `quoteConfirmation`, `memberVerification`, `contractSigned`, and `portalAccess`, and sends a `text` field.
- [ ] Run `node --test test/petconnect.test.js test/quote.test.js test/contracts.test.js`; expect failure.
- [ ] Replace positional `sendEmail(to, subject, html, attachments)` with `sendEmail({ to, subject, html, text, attachments = [], category })`, returning `{ sent, error, category }`. Add `sendTemplate(to, message, options)` as the route adapter.
- [ ] Import the catalog, pass `siteUrl: getSiteUrl()` to every renderer, and migrate quote, contact, verification/resend, finder messages, alerts, partner verification/claim/invite, signed contract, portal access/reset, internal alerts, and SMTP test. Preserve existing database writes, secure-token generation, recipients, PDF attachments, and privacy rules.
- [ ] Run `npm test`; expect PASS.
- [ ] Commit using message `feat: use branded templates for transactional email`.

### Task 4: Protected Admin Email Center APIs

**Files:** Modify `server.js` near `/api/admin/email-health`; modify `test/petconnect.test.js`.

- [ ] Add failing assertions for `GET /api/admin/email-templates`, `GET /api/admin/email-templates/:id/preview`, and `POST /api/admin/email-templates/:id/test`, each protected by `requireAdmin`.
- [ ] Run `node --test test/petconnect.test.js`; expect failure.
- [ ] Add a fixed server-side catalog that maps every template ID to label, category, and renderer using fake sample data. Preview returns `{ success, subject, html, text }`. Test endpoint validates recipient email, sends only selected fake sample content, and returns a 503 with the SMTP error when delivery fails. Return 404 with `Unknown email template.` for invalid IDs.
- [ ] Do not include live client data, live tokens, real passwords, or contract attachments in catalog preview/test data.
- [ ] Run `node --test test/petconnect.test.js`; expect PASS.
- [ ] Commit using message `feat: add admin email template preview APIs`.

### Task 5: Admin Email Center interface

**Files:** Modify `views/admin.ejs`, `admin/app.js`, `public/css/admin.css`, and `test/petconnect.test.js`.

- [ ] Add failing source assertions for Email Center sidebar navigation, `section-email-center`, `loadEmailTemplates`, `previewEmailTemplate`, and `sendEmailTemplateTest`.
- [ ] Run `node --test test/petconnect.test.js`; expect failure.
- [ ] Add an Email Center navigation button and section with SMTP health, template list, subject line, sandboxed iframe preview, plain-text fallback, recipient input, and send-test command.
- [ ] Update `showSection` so opening Email Center fetches `/api/admin/email-templates`. Template selection fetches preview data, sets `iframe.srcdoc` to the HTML, displays text fallback, and records selected ID. The iframe must use `sandbox=""`. Sending posts to the selected template endpoint and uses existing Admin toast feedback.
- [ ] Add responsive CSS with a two-column arrangement at desktop width and a single-column layout below 900px. Reuse existing Admin controls and preserve mobile navigation.
- [ ] Run `node --test test/petconnect.test.js && npm start`; expect tests PASS and the local server to start. In a browser, sign in, open Email Center, preview a template, inspect HTML/text, and send a test only to an administrator-controlled inbox.
- [ ] Commit using message `feat: add admin email center preview and testing`.

### Task 6: Tell customers to check spam/junk folders

**Files:** Modify `views/quote.ejs`, `views/contact.ejs`, `views/register.ejs`, `public/css/style-v2.css`, `test/quote.test.js`, and `test/petconnect.test.js`.

- [ ] Add failing source assertions that each client success state includes `spam or junk folder` and `info@petflyinc.com`.
- [ ] Run `node --test test/quote.test.js test/petconnect.test.js`; expect failure.
- [ ] Add this text only after a successful submission: `We sent a confirmation email to your email address. Please check your inbox and spam or junk folder. Add info@petflyinc.com to your contacts to receive future updates.` Mark it `role="status"`.
- [ ] Add `.email-delivery-note` using existing warm-gray/cream surfaces, a terracotta left border, charcoal text, and responsive spacing.
- [ ] Run `node --test test/quote.test.js test/petconnect.test.js`; expect PASS.
- [ ] Commit using message `feat: add email delivery guidance to customer forms`.

### Task 7: Complete verification

**Files:** Modify only files identified by verification failures.

- [ ] Run `npm test`; expect all tests PASS.
- [ ] Run a Node renderer smoke test using `https://petflyinc.com` and assert the output includes `https://petflyinc.com/images/petfly-email-logo.png`, includes a verification link in text, and contains no `localhost` string.
- [ ] Run `test -s public/images/petfly-email-logo.png && git diff --check && git status --short`; expect no whitespace errors and only intended files.
- [ ] Send one real Admin test email to an administrator-controlled inbox, confirming logo, subject, CTA fallback link, spam guidance, mobile readability, and no local URL.
- [ ] Commit any verification-only correction with message `test: verify branded email delivery flows`; do not create an empty commit.
