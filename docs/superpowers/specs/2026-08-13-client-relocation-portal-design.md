# Client Relocation Portal Design

## Purpose

Provide one secure client account per email address. A client uses that account to view every active pet relocation assigned to the account, while Pet Fly administrators manage account access, relocation progress, documents, events, and boarding updates.

## Client Access

- An administrator creates or reuses a client account from a contract using the client email address and an admin-issued initial password.
- A client signs in with email and password at `/portal/login`.
- The initial password is temporary. The first successful sign-in requires the client to choose a new password before the dashboard can load.
- An administrator can reset an account password. Passwords are stored only as bcrypt hashes.
- One account can own multiple contracts. The client dashboard shows active contracts, with completed contracts retained as history.

## Client Dashboard

The dashboard has a compact relocation switcher for every active pet/contract and displays the selected relocation:

- A status progress bar in this fixed order: Consulting, Contract Signed, Pick-Up, Exam/Vaccination, Documentation, On Route, In-Transfer, Home Delivery.
- A timeline of completed and upcoming status updates. Each entry has a status, client-visible description, and timestamp.
- An upcoming-events calendar/list for pickup, appointments, document deadlines, flights, transfers, and home delivery. Each event has date/time, title, optional description, and location.
- A document tracker with Rabies Vaccination, Other Vaccination, Exam Reports, Other Reports, Travel Documents, Other Documents, and Client Identifications. Documents expose issue date, expiration date, status, and a downloadable file when supplied. Expiring and expired documents are visually identified.
- A boarding-updates feed. Administrators add a YouTube link, title, date, and client-visible note. The portal embeds the validated YouTube video; no video files are stored on Hostinger.
- Existing contract pet photos remain visible alongside relocation information.

## Admin Workflow

The existing Contract editor receives a Relocation Portal section:

- Link or create the email-based client account and issue/reset its initial password.
- Change the current relocation step and add client-visible or internal-only timeline notes.
- Create, edit, and remove future events.
- Upload documents, assign a document category, and set issue and expiration dates.
- Add, edit, and remove YouTube boarding updates.

Admin edits remain possible after client signing. Client access is read-only for status, timeline, documents, events, and boarding updates.

## Data Model

New normalized tables:

- `client_accounts`: email, password hash, password-change requirement, timestamps.
- `client_contracts`: account-to-contract relationship, allowing one account to own several contracts.
- `relocation_updates`: contract, ordered status step, client-visible description, internal note, occurred timestamp.
- `relocation_events`: contract, title, date/time, location, description, event type.
- `relocation_documents`: contract, category, label, file URL, issue date, expiry date, and timestamps.
- `boarding_updates`: contract, title, YouTube video ID, client-visible note, published timestamp.

Document files use the existing `/uploads/` storage. YouTube URLs are normalized to IDs and embedded from YouTube's no-cookie domain. The server validates account ownership for every portal record request.

## Notifications

After an admin creates a client account or resets its password, the system sends the client a portal-access email. Status updates, newly published documents, boarding videos, and events trigger client email notifications. A daily server-side job is out of scope for this phase; expiry warnings are visible in the portal, while proactive email reminders can be added as a scheduled deployment task afterward.

## Error Handling And Testing

- Invalid login and unauthorized contract access return generic errors without revealing account ownership.
- Invalid document uploads and non-YouTube boarding links are rejected before persistence.
- Missing uploads render as unavailable files without breaking the dashboard.
- Tests cover password-first-login enforcement, account-to-contract ownership, status ordering, document-expiry classification, YouTube URL normalization, and client-facing access controls.
