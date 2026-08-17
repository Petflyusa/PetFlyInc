# PetConnect Organization Geocoding and List Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add durable organization geocoding, paginated searchable organization management, geographic status display, and bulk selection controls.

**Architecture:** Add an idempotent migration for geocoding state. Keep CSV writes fast with coordinates initially pending, then run a single rate-limited database-backed worker that claims pending rows and updates coordinates/status. Extend the existing admin API with pagination and geocode actions, and update the existing Organizations workspace to render metadata and bulk controls.

**Tech Stack:** Node.js/Express, MySQL, vanilla admin JavaScript, Node test runner.

---

### Task 1: Geocoding state migration and pure worker helpers

**Files:**
- Create: `migrations/007_petconnect_geocoding.sql`
- Create: `lib/partner-geocoding.js`
- Modify: `lib/petconnect-database.js`
- Test: `test/partner-geocoding.test.js`

- [ ] Write failing tests for status normalization, retry eligibility, and coordinate validation.
- [ ] Run `node --test test/partner-geocoding.test.js` and confirm the helper module is missing.
- [ ] Implement constants and pure helpers: `geocodeStatuses`, `isValidCoordinates`, `isRetryableGeocode`, and `nextGeocodeStatus`.
- [ ] Add nullable `geocode_status`, `geocode_attempts`, `geocoded_at`, and `geocode_error` columns plus an index on status to migration `007_petconnect_geocoding.sql`.
- [ ] Add `007_petconnect_geocoding.sql` to the startup migration list.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Database-backed geocoding worker

**Files:**
- Modify: `server.js`
- Test: `test/partner-geocoding.test.js`

- [ ] Write a failing source-level regression test requiring the worker to claim pending rows, call the existing rate-limited geocoder, persist located/needs-review/failed state, and avoid overlapping workers.
- [ ] Implement a bounded worker using `SELECT ... FOR UPDATE SKIP LOCKED` where supported, with a fallback query for older MySQL/MariaDB; increment attempts before calling the provider.
- [ ] Persist latitude/longitude and `located` on success, `needs_review` on empty results, and `failed` after the configured attempt limit; keep transient failures retryable below that limit.
- [ ] Start one worker loop after schema initialization and expose a guarded admin retry endpoint that resets selected failed/review rows to pending.
- [ ] Ensure CSV and manual organization writes set geocode status to `pending`, and address edits clear stale coordinates.
- [ ] Run focused tests and `node --check server.js`.

### Task 3: Paginated organization API

**Files:**
- Modify: `server.js`
- Test: `test/petconnect.test.js`

- [ ] Write failing tests for `per_page=50|100|200|all`, invalid values, `page`, total count, total pages, and search/filter preservation.
- [ ] Extend `GET /api/admin/petconnect/partners` to return `{ partners, pagination }`, using parameterized `COUNT(*)`, `LIMIT`, and `OFFSET` queries; cap `all` at a safe server maximum.
- [ ] Add `geocode_status`, `latitude`, `longitude`, `geocoded_at`, and `geocode_error` to the selected fields.
- [ ] Add `geocode_status` filtering and guarded endpoints to retry one or multiple organization IDs.
- [ ] Run focused API/source tests.

### Task 4: Organizations workspace controls and display

**Files:**
- Modify: `views/admin.ejs`
- Modify: `admin/app.js`
- Modify: `public/css/admin.css`
- Test: `test/petconnect.test.js`

- [ ] Add page-size control with `50`, `100`, `200`, and `All`, page navigation, matching-count text, geocode-status filter, and select-all-current-page checkbox.
- [ ] Update `loadPetConnectPartners` to send pagination/search/filter parameters, render latitude/longitude or a clear pending/review status, and preserve selection state safely when pages change.
- [ ] Add bulk retry-geocoding for selected organizations and keep invite selection separate from row-selection state.
- [ ] Add responsive table styles for the new controls and location column.
- [ ] Run browser-facing source tests and `npm test`.

### Task 5: Verification and deployment

**Files:**
- Modify: `README.md` if operational worker settings need documenting.

- [ ] Run `npm test`, `node --check server.js`, and `git diff --check`.
- [ ] Review migration idempotency, API authorization, SQL parameterization, and worker restart behavior.
- [ ] Commit the implementation and push `HEAD:main` for Hostinger deployment.
- [ ] Confirm the pushed commit and report that existing imported rows begin in the tracked geocoding queue.
