# Pet Fly Inc — Node.js Website

International pet transportation landing page + admin panel. IATA & USDA certified.

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in DB_* values in .env
mysql -u root -p < schema.sql   # set up the database
npm start
```

Visit `http://localhost:3000`

- **Landing pages:** `/`, `/service`, `/quote`, `/contact`, `/regulations`
- **Admin panel:** `/admin` (login: `admin` / `petfly2026` — change this immediately)
- **Client relocation portal:** `/portal/login`

## Project Structure

```
PetFlyInc-node/
├── server.js           Express app entry point
├── package.json
├── schema.sql          MySQL database schema + seed data
├── .env.example        Environment variables template
├── vercel.json         Vercel deployment config
├── public/
│   ├── css/
│   │   ├── style.css   Landing page stylesheet
│   │   └── admin.css   Admin panel stylesheet
│   ├── admin/
│   │   └── app.js      Admin SPA JavaScript
│   └── uploads/        User-uploaded files
├── admin/
│   └── app.js          Admin SPA (public serve)
├── views/
│   ├── index.ejs
│   ├── service.ejs
│   ├── quote.ejs
│   ├── contact.ejs
│   ├── regulations.ejs
│   ├── admin.ejs       Admin panel shell
│   ├── admin-login.ejs
│   └── partials/
│       ├── header.ejs
│       └── footer.ejs
```

## Database

Requires MySQL 5.7+ (or MariaDB 10.3+). Run `schema.sql` to create all tables and seed default content.

Tables:
- `admins` — admin login accounts
- `quote_requests` — quote form submissions
- `contact_messages` — contact form submissions
- `countries` — country import regulations
- `airlines` — airline pet transport policies
- `landing_content` — key/value JSON for landing page sections
- `client_accounts` and `client_contracts` — client login accounts and their assigned relocations
- `relocation_updates`, `relocation_events`, `relocation_documents`, and `boarding_updates` — portal content managed by admins

## Admin Panel

Manage landing page content, view/manage quote requests and contact messages, add/edit country and airline regulations — all from a single-page admin SPA at `/admin`.

Issued and signed contracts also have a **Manage Portal** action. Use it to create or reset a client password, add progress updates, schedule events, publish document records, and add YouTube boarding videos. An account can be linked to multiple active contracts, so a client signs in once to see all assigned relocations. The client must replace an admin-issued temporary password on first sign-in.

Set `SITE_URL=https://petflyinc.com` in production so access emails point to the public site. Uploaded files are stored in `~/petflyinc-uploads` by default in production, outside the Git-synced deployment folder. You may set `UPLOAD_DIR` to another writable directory outside the deployment folder. If an older configuration points `UPLOAD_DIR` inside the deployment, the application automatically switches to the persistent default and copies any surviving legacy files there on startup. The portal serves those files at `/uploads/...`; Git deployments therefore cannot delete client photos or documents. Boarding videos use YouTube embeds and do not consume Hostinger video storage.

## Visitor Languages

Client-facing pages support English, Spanish, and Simplified Chinese. The first visit follows the browser language (`es-*` and `zh-*` are recognized); the header language menu saves a browser-only override under `petfly_language`. The internal admin area and saved client or administrator records retain their original language.

## Deployment (Vercel)

```bash
npm install
vercel
```

Set environment variables in Vercel dashboard:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `SESSION_SECRET`
- `NODE_ENV=production`

## Deployment (Hostinger VPS)

```bash
# SSH into your VPS
cd ~/petflyinc
git pull
npm install --production
mysql -u root -p < schema.sql
pm2 restart server   # or: node server.js
```

The portal migration runs automatically when `server.js` starts. Restart the Node process after deployment so it creates the portal tables before using the portal.

Recommended: use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name petflyinc
pm2 save
pm2 startup
```

## CRM Integration

The CRM lives in `/crm` on the Hostinger server (deployed separately from `crm-recovered` repo). The CRM is accessible at `https://petflyinc.com/CRM`.
