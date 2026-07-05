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

## Admin Panel

Manage landing page content, view/manage quote requests and contact messages, add/edit country and airline regulations — all from a single-page admin SPA at `/admin`.

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

Recommended: use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name petflyinc
pm2 save
pm2 startup
```

## CRM Integration

The CRM lives in `/crm` on the Hostinger server (deployed separately from `crm-recovered` repo). The CRM is accessible at `https://petflyinc.com/CRM`.
