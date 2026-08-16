require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const compression = require('compression');
const multerModule = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { blankContractData, createContractNumber, canEditContract, mergeClientContractData, normalizeContractData } = require('./lib/contracts');
const { ensureContractSchema, sendContractDatabaseError } = require('./lib/contract-database');
const { ensureQuoteSchema } = require('./lib/quote-database');
const { ensurePetConnectSchema } = require('./lib/petconnect-database');
const { generateContractPdf } = require('./lib/contract-pdf');
const { documentCategories, documentExpiryStatus, isActiveRelocation, normalizeYouTubeUrl, relocationSteps } = require('./lib/portal');
const { defaultFooter } = require('./lib/site');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Email Transporter ───────────────────────────────────────────────────────
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_SECURE || 'true') !== 'false',
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: process.env.SMTP_USER || 'info@petflyinc.com',
    pass: process.env.SMTP_PASS || '',
  },
};
const mailTransporter = nodemailer.createTransport(smtpConfig);
let lastEmailDeliveryError = null;

async function sendEmail(to, subject, htmlContent, attachments = []) {
  if (!smtpConfig.auth.pass) {
    console.warn('[Email] SMTP_PASS not set, skipping email send to', to);
    lastEmailDeliveryError = 'SMTP password is not configured.';
    return false;
  }
  try {
    await mailTransporter.sendMail({
      from: `"Pet Fly Inc" <${smtpConfig.auth.user}>`,
      to,
      subject,
      html: htmlContent,
      attachments,
    });
    console.log('[Email] Sent to', to);
    lastEmailDeliveryError = null;
    return true;
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
    lastEmailDeliveryError = err.code || 'SMTP_SEND_FAILED';
    return false;
  }
}

async function sendPetConnectVerificationEmail(email, token) {
  const verifyUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/verify/${token}`;
  return sendEmail(email, 'Verify your PetConnect account', `<p>Welcome to PetConnect.</p><p><a href="${verifyUrl}">Verify your email address</a> to activate your account.</p>`);
}

// ── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Database Pool ─────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'petflyinc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Existing databases predate the contracts table. Apply the additive migration
// at startup so contract issuance is available immediately after a restart.
Promise.all([ensureContractSchema(pool), ensureQuoteSchema(pool), ensurePetConnectSchema(pool)]).then(() => {
  console.log('[Contract database] Schema ready');
}).catch(err => {
  console.error('[Contract database] Schema setup failed:', err.message);
});

async function getConnection() { return pool.getConnection(); }
async function query(sql, params) { const [rows] = await pool.execute(sql, params); return rows; }

// ── Session Store ──────────────────────────────────────────────────────────
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'petflyinc',
  createDatabaseTable: true,
  schema: { tableName: 'sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } }
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // The existing EJS pages and admin SPA use inline scripts and handlers.
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'", 'https://clients5.google.com'],
      scriptSrcAttr: ["'unsafe-inline'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Session
app.use(session({
  key: 'petfly_sess',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_in_production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // disable until HTTPS is configured
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// ── File Upload ─────────────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const upload = multerModule({
  storage: multerModule.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
    }
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

const contractPhotoUpload = multerModule({
  storage: multerModule.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `contract-photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

const relocationDocumentUpload = multerModule({
  storage: multerModule.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `relocation-document-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

const petUploadDir = path.join(uploadDir, 'pets');
if (!fs.existsSync(petUploadDir)) fs.mkdirSync(petUploadDir, { recursive: true });
const petUpload = multerModule({
  storage: multerModule.diskStorage({
    destination: petUploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
});

// ── Auth Middleware ─────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

function requirePortalAccount(req, res, next) {
  if (req.session && req.session.clientAccountId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Please sign in to view your relocation portal.' });
  return res.redirect('/portal/login');
}

function requireMember(req, res, next) {
  if (req.session && req.session.memberId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Please sign in to access PetConnect.' });
  return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
}

function requirePartner(req, res, next) {
  if (req.session && req.session.partnerId) return next();
  return res.redirect('/partner/claim');
}

let geocodeQueue = Promise.resolve();
let lastGeocodeAt = 0;
function geocodeAddress(parts) {
  const address = parts.filter(Boolean).join(', ');
  if (!address) return Promise.resolve(null);
  const task = geocodeQueue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastGeocodeAt = Date.now();
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, { headers: { 'User-Agent': 'PetFlyInc-PetConnect/1.0 (info@petflyinc.com)' } });
      const results = await response.json();
      if (!results[0]) return null;
      return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
    } catch (err) {
      console.warn('[PetConnect geocoding]', err.message);
      return null;
    }
  });
  geocodeQueue = task.catch(() => {});
  return task;
}

function radiusKilometers(radius, unit) { return unit === 'mi' ? Number(radius) * 1.60934 : Number(radius); }

// ── Landing Content Helpers ─────────────────────────────────────────────────
async function getLandingContent() {
  const rows = await query('SELECT section_key, content FROM landing_content');
  const content = {};
  rows.forEach(row => {
    try { content[row.section_key] = JSON.parse(row.content); }
    catch { content[row.section_key] = row.content; }
  });
  return content;
}

async function getLandingSection(key) {
  const rows = await query('SELECT content FROM landing_content WHERE section_key = ?', [key]);
  if (!rows.length) return null;
  try { return JSON.parse(rows[0].content); }
  catch { return rows[0].content; }
}

async function getFooter() {
  const ft = await getLandingSection('footer');
  return ft || defaultFooter();
}

async function setLandingSection(key, data) {
  const json = JSON.stringify(data);
  await query(
    'INSERT INTO landing_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)',
    [key, json]
  );
}

// ── View Helpers ─────────────────────────────────────────────────────────────
app.locals.currentYear = new Date().getFullYear();

// ── PUBLIC ROUTES ──────────────────────────────────────────────────────────

// Home
app.get('/', async (req, res) => {
  try {
    const content = await getLandingContent();
    res.render('index', { content });
  } catch (err) {
    console.error(err);
    res.render('index', { content: {} });
  }
});

// Service
app.get('/service', async (req, res) => {
  const footer = await getFooter();
  res.render('service', { footer });
});

// Quote
app.get('/quote', async (req, res) => {
  const footer = await getFooter();
  res.render('quote', { footer });
});

// Contact
app.get('/contact', async (req, res) => {
  const footer = await getFooter();
  res.render('contact', { footer });
});

// Regulations
app.get('/regulations', async (req, res) => {
  try {
    const countries = await query('SELECT id, country_name FROM countries ORDER BY country_name');
    const airlines = await query('SELECT id, airline_name FROM airlines ORDER BY airline_name');
    const footer = await getFooter();
    res.render('regulations', { countries, airlines, footer });
  } catch (err) {
    console.error(err);
    res.render('regulations', { countries: [], airlines: [], footer: await getFooter() });
  }
});

// Public contract access begins with a contract-number lookup.
app.get('/contract', async (req, res) => {
  let footer;
  try { footer = await getFooter(); }
  catch (err) {
    console.error('[Contract] Could not load footer content:', err.message);
    footer = defaultFooter();
  }
  res.render('contract', { footer });
});

// ── PetConnect Member Routes ─────────────────────────────────────────────
app.get('/registry', async (req, res) => {
  const country = req.query.country === 'CA' ? 'CA' : req.query.country === 'US' ? 'US' : '';
  const species = ['Dog', 'Cat', 'Bird', 'Other'].includes(req.query.species) ? req.query.species : '';
  const alertType = ['lost', 'found'].includes(req.query.type) ? req.query.type : '';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const filters = ["a.status='active'"];
  const params = [];
  if (country) { filters.push('a.last_seen_country=?'); params.push(country); }
  if (species) { filters.push('p.species=?'); params.push(species); }
  if (alertType) { filters.push('a.alert_type=?'); params.push(alertType); }
  const where = filters.join(' AND ');
  const totals = await query(`SELECT COUNT(*) AS total FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id WHERE ${where}`, params);
  const perPage = 12;
  const alerts = await query(`SELECT a.*, p.pet_name, p.species, p.breed, p.color, p.photo_filename AS pet_photo FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id WHERE ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
  res.render('registry', { footer: await getFooter(), alerts, filters: { country, species, alertType }, page, pages: Math.max(1, Math.ceil(totals[0].total / perPage)) });
});

app.get('/alert/:id', async (req, res) => {
  const alerts = await query(`SELECT a.*, p.pet_name, p.species, p.breed, p.color, p.gender, p.birth_date, p.photo_filename AS pet_photo FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id WHERE a.id=?`, [req.params.id]);
  if (!alerts.length) return res.status(404).render('404');
  res.render('alert-detail', { footer: await getFooter(), alert: alerts[0] });
});

app.get('/register', async (req, res) => {
  res.render('register', { footer: await getFooter(), error: null });
});

app.post('/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const firstName = String(req.body.first_name || '').trim();
  const lastName = String(req.body.last_name || '').trim();
  const password = String(req.body.password || '');
  const country = req.body.country === 'CA' ? 'CA' : 'US';
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).render('register', { footer: await getFooter(), error: 'Enter your name and a valid email address.' });
  if (password.length < 8 || password !== String(req.body.confirm_password || '')) return res.status(400).render('register', { footer: await getFooter(), error: 'Passwords must match and contain at least 8 characters.' });
  if (!req.body.terms) return res.status(400).render('register', { footer: await getFooter(), error: 'Please accept the PetConnect terms to continue.' });
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(password, 12);
    const city = String(req.body.city || '').trim() || null;
    const state = String(req.body.state || '').trim() || null;
    const postalCode = String(req.body.postal_code || '').trim() || null;
    const coordinates = await geocodeAddress([city, state, postalCode, country]);
    await query('INSERT INTO members (email, password_hash, first_name, last_name, phone, city, state, country, postal_code, latitude, longitude, verify_token, verify_token_expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL 48 HOUR))', [email, hash, firstName, lastName, String(req.body.phone || '').trim() || null, city, state, country, postalCode, coordinates && coordinates.latitude || null, coordinates && coordinates.longitude || null, token]);
    const sent = await sendPetConnectVerificationEmail(email, token);
    res.render('login', { footer: await getFooter(), error: sent ? 'Account created. Check your email to verify your account before signing in.' : 'Account created, but the verification email could not be delivered. Use the resend form below or contact Pet Fly Inc.' });
  } catch (err) {
    const message = err && err.code === 'ER_DUP_ENTRY' ? 'That email is already registered.' : 'Unable to create your account right now.';
    console.error('[PetConnect registration]', err);
    res.status(400).render('register', { footer: await getFooter(), error: message });
  }
});

app.get('/verify/:token', async (req, res) => {
  try {
    const result = await query('UPDATE members SET is_verified=TRUE, verify_token=NULL, verify_token_expires_at=NULL WHERE verify_token=? AND (verify_token_expires_at IS NULL OR verify_token_expires_at > NOW())', [req.params.token]);
    if (!result.affectedRows) return res.status(400).send('This verification link is invalid or has already been used.');
    res.redirect('/login?verified=1');
  } catch (err) { console.error('[PetConnect verification]', err); res.status(500).send('Unable to verify this account right now.'); }
});

app.get('/login', async (req, res) => {
  res.render('login', { footer: await getFooter(), error: req.query.verified ? 'Email verified. You can now sign in.' : null });
});

app.post('/resend-verification', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (/^\S+@\S+\.\S+$/.test(email)) {
    try {
      const members = await query('SELECT id, is_verified FROM members WHERE email=?', [email]);
      if (members[0] && !members[0].is_verified) {
        const token = crypto.randomBytes(32).toString('hex');
        await query('UPDATE members SET verify_token=?, verify_token_expires_at=DATE_ADD(NOW(), INTERVAL 48 HOUR) WHERE id=?', [token, members[0].id]);
        await sendPetConnectVerificationEmail(email, token);
      }
    } catch (err) { console.error('[PetConnect verification resend]', err); }
  }
  res.render('login', { footer: await getFooter(), error: 'If an unverified PetConnect account matches that address, a new verification link has been sent.' });
});

app.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const rows = await query('SELECT id, email, password_hash, is_verified FROM members WHERE email=?', [email]);
    const member = rows[0];
    if (!member || !await bcrypt.compare(password, member.password_hash)) return res.status(401).render('login', { footer: await getFooter(), error: 'Invalid email or password.' });
    if (!member.is_verified) return res.status(403).render('login', { footer: await getFooter(), error: 'Please verify your email before signing in.' });
    req.session.memberId = member.id;
    req.session.memberEmail = member.email;
    const next = String(req.body.next || '');
    res.redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  } catch (err) { console.error('[PetConnect login]', err); res.status(500).render('login', { footer: await getFooter(), error: 'Unable to sign in right now.' }); }
});

app.post('/logout', requireMember, (req, res) => {
  delete req.session.memberId;
  delete req.session.memberEmail;
  res.redirect('/login');
});

app.get('/dashboard', requireMember, async (req, res) => {
  try {
    const members = await query('SELECT id, first_name, last_name, email, email_alerts, email_alert_radius FROM members WHERE id=?', [req.session.memberId]);
    if (!members.length) return res.redirect('/login');
    const pets = await query('SELECT id, pet_name, microchip_number, species, breed, color, gender, birth_date, photo_filename, notes, is_missing FROM registered_pets WHERE member_id=? ORDER BY registered_at DESC', [req.session.memberId]);
    res.render('petconnect-dashboard', { footer: await getFooter(), member: members[0], pets, petError: req.query.pet_error || null });
  } catch (err) { console.error('[PetConnect dashboard]', err); res.status(500).send('Unable to load your PetConnect dashboard right now.'); }
});

app.post('/dashboard/preferences', requireMember, async (req, res) => {
  const radius = Math.max(1, Math.min(1000, Number(req.body.email_alert_radius) || 100));
  await query('UPDATE members SET email_alerts=?, email_alert_radius=? WHERE id=?', [req.body.email_alerts ? true : false, radius, req.session.memberId]);
  res.redirect('/dashboard');
});

app.post('/api/petconnect/pets', requireMember, (req, res, next) => {
  petUpload.single('photos')(req, res, err => {
    if (err) return res.redirect('/dashboard?pet_error=' + encodeURIComponent(err.code === 'LIMIT_FILE_SIZE' ? 'Pet photos must be 2 MB or smaller.' : 'Use a JPG, PNG, WebP, or GIF pet photo.'));
    next();
  });
}, async (req, res) => {
  const petName = String(req.body.pet_name || '').trim();
  const species = String(req.body.species || 'Dog');
  const gender = String(req.body.gender || 'Unknown');
  const microchip = String(req.body.microchip_number || '').replace(/[ -]/g, '');
  if (!petName || !['Dog', 'Cat', 'Bird', 'Other'].includes(species) || !['Male', 'Female', 'Unknown'].includes(gender)) return res.redirect('/dashboard?pet_error=Enter a valid pet name, species, and gender.');
  if (microchip && !/^\d{9,15}$/.test(microchip)) return res.redirect('/dashboard?pet_error=Microchip numbers must contain 9 to 15 digits.');
  try {
    const photoFilename = req.file ? `/uploads/pets/${req.file.filename}` : null;
    await query('INSERT INTO registered_pets (member_id, microchip_number, pet_name, species, breed, color, gender, birth_date, photo_filename, notes) VALUES (?,?,?,?,?,?,?,?,?,?)', [req.session.memberId, microchip || null, petName, species, String(req.body.breed || '').trim() || null, String(req.body.color || '').trim() || null, gender, req.body.birth_date || null, photoFilename, String(req.body.notes || '').trim() || null]);
    res.redirect('/dashboard');
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('[PetConnect pet registration]', err);
    res.redirect('/dashboard?pet_error=' + encodeURIComponent(err.code === 'ER_DUP_ENTRY' ? 'That microchip number is already registered.' : 'Unable to save this pet right now.'));
  }
});

app.post('/api/petconnect/pets/:id/delete', requireMember, async (req, res) => {
  try {
    const pets = await query('SELECT photo_filename FROM registered_pets WHERE id=? AND member_id=?', [req.params.id, req.session.memberId]);
    if (pets[0] && pets[0].photo_filename) fs.unlink(path.join(__dirname, 'public', pets[0].photo_filename), () => {});
    await query('DELETE FROM registered_pets WHERE id=? AND member_id=?', [req.params.id, req.session.memberId]);
    res.redirect('/dashboard');
  } catch (err) { console.error('[PetConnect pet deletion]', err); res.redirect('/dashboard?pet_error=Unable to delete this pet right now.'); }
});

async function petConnectFooter() { return getFooter(); }

async function notificationRecipients(alert, excludeMemberId) {
  const radiusKm = radiusKilometers(alert.search_radius, alert.radius_unit);
  const hasCoordinates = Number.isFinite(Number(alert.last_seen_latitude)) && Number.isFinite(Number(alert.last_seen_longitude));
  const memberSql = hasCoordinates
    ? `SELECT id, email, first_name FROM members WHERE is_verified=TRUE AND email_alerts=TRUE AND country=? AND id<>? AND latitude IS NOT NULL AND longitude IS NOT NULL
       AND (6371 * ACOS(LEAST(1.0, COS(RADIANS(?))*COS(RADIANS(latitude))*COS(RADIANS(longitude)-RADIANS(?))+SIN(RADIANS(?))*SIN(RADIANS(latitude))))) <= ?`
    : 'SELECT id, email, first_name FROM members WHERE is_verified=TRUE AND email_alerts=TRUE AND country=? AND id<>?';
  const partnerSql = hasCoordinates
    ? `SELECT id, email, company_name FROM rescue_partners WHERE is_active=TRUE AND is_verified=TRUE AND country=? AND latitude IS NOT NULL AND longitude IS NOT NULL
       AND (6371 * ACOS(LEAST(1.0, COS(RADIANS(?))*COS(RADIANS(latitude))*COS(RADIANS(longitude)-RADIANS(?))+SIN(RADIANS(?))*SIN(RADIANS(latitude))))) <= ?`
    : 'SELECT id, email, company_name FROM rescue_partners WHERE is_active=TRUE AND is_verified=TRUE AND country=?';
  const geoParams = [alert.last_seen_country, excludeMemberId, alert.last_seen_latitude, alert.last_seen_longitude, alert.last_seen_latitude, radiusKm];
  const partnerGeoParams = [alert.last_seen_country, alert.last_seen_latitude, alert.last_seen_longitude, alert.last_seen_latitude, radiusKm];
  const [members, partners] = await Promise.all([
    query(memberSql, hasCoordinates ? geoParams : [alert.last_seen_country, excludeMemberId]),
    query(partnerSql, hasCoordinates ? partnerGeoParams : [alert.last_seen_country])
  ]);
  return { members, partners };
}

async function sendAlertNotifications(alert, pet) {
  const recipients = await notificationRecipients(alert, alert.member_id);
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const detailUrl = `${siteUrl}/alert/${alert.id}`;
  const label = alert.alert_type === 'found' ? 'FOUND PET' : 'LOST PET';
  const subject = `[${label}] ${pet.pet_name} - ${pet.species}, ${alert.last_seen_city || 'Unknown location'}${alert.last_seen_state ? `, ${alert.last_seen_state}` : ''}`;
  const html = `<h2>${label}: ${pet.pet_name}</h2><p><strong>Last seen:</strong> ${alert.last_seen_location || [alert.last_seen_city, alert.last_seen_state].filter(Boolean).join(', ') || 'Location not provided'}</p><p><strong>Date:</strong> ${alert.last_seen_date || 'Not provided'}</p><p>${alert.description || ''}</p><p><a href="${detailUrl}">View full alert details</a></p>`;
  const entries = recipients.members.map(member => ({ type: 'member', id: member.id, email: member.email })).concat(recipients.partners.map(partner => ({ type: 'partner', id: partner.id, email: partner.email })));
  for (let index = 0; index < entries.length; index += 30) {
    const batch = entries.slice(index, index + 30);
    await Promise.all(batch.map(async recipient => {
      const existing = await query(`SELECT id FROM alert_notifications WHERE alert_id=? AND ${recipient.type === 'member' ? 'recipient_member_id' : 'recipient_partner_id'}=? AND notified_at > NOW() - INTERVAL 7 DAY`, [alert.id, recipient.id]);
      if (existing.length) return;
      const sent = await sendEmail(recipient.email, subject, html);
      if (sent) await query(`INSERT INTO alert_notifications (alert_id, ${recipient.type === 'member' ? 'recipient_member_id' : 'recipient_partner_id'}) VALUES (?,?)`, [alert.id, recipient.id]);
    }));
    if (index + 30 < entries.length) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  await query('UPDATE missing_alerts SET email_sent_at=NOW() WHERE id=?', [alert.id]);
}

app.get('/dashboard/missing/new', requireMember, async (req, res) => {
  const pets = await query('SELECT id, pet_name, species FROM registered_pets WHERE member_id=? ORDER BY pet_name', [req.session.memberId]);
  res.render('missing-alert', { footer: await petConnectFooter(), pets, error: null, today: new Date().toISOString().slice(0, 10) });
});

app.post('/dashboard/missing/new', requireMember, (req, res, next) => {
  petUpload.single('photo')(req, res, err => {
    if (err) return res.status(400).send('Use a JPG, PNG, WebP, or GIF photo no larger than 2 MB.');
    next();
  });
}, async (req, res) => {
  const petId = Number(req.body.pet_id);
  const alertType = req.body.alert_type === 'found' ? 'found' : 'lost';
  const country = req.body.last_seen_country === 'CA' ? 'CA' : 'US';
  const radius = Number(req.body.search_radius);
  const unit = req.body.radius_unit === 'km' ? 'km' : 'mi';
  const pets = await query('SELECT id, pet_name, species FROM registered_pets WHERE id=? AND member_id=?', [petId, req.session.memberId]);
  if (!pets.length || ![50, 100, 150, 200].includes(radius)) return res.status(400).send('Select one of your pets and a valid search radius.');
  try {
    const location = String(req.body.last_seen_location || '').trim();
    const city = String(req.body.last_seen_city || '').trim();
    const state = String(req.body.last_seen_state || '').trim();
    const coordinates = await geocodeAddress([location, city, state, country]);
    const [result] = await pool.execute(`INSERT INTO missing_alerts (pet_id, member_id, alert_type, last_seen_location, last_seen_city, last_seen_state, last_seen_country, last_seen_latitude, last_seen_longitude, last_seen_date, search_radius, radius_unit, contact_info, reward, description, photo_filename) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [petId, req.session.memberId, alertType, location || null, city || null, state || null, country, coordinates && coordinates.latitude || null, coordinates && coordinates.longitude || null, req.body.last_seen_date || null, radius, unit, String(req.body.contact_info || '').trim() || null, String(req.body.reward || '').trim() || null, String(req.body.description || '').trim() || null, req.file ? `/uploads/pets/${req.file.filename}` : null]);
    if (alertType === 'lost') await query('UPDATE registered_pets SET is_missing=TRUE WHERE id=?', [petId]);
    const alert = { id: result.insertId, member_id: req.session.memberId, alert_type: alertType, last_seen_location: location, last_seen_city: city, last_seen_state: state, last_seen_country: country, last_seen_latitude: coordinates && coordinates.latitude, last_seen_longitude: coordinates && coordinates.longitude, last_seen_date: req.body.last_seen_date, search_radius: radius, radius_unit: unit, description: String(req.body.description || '').trim() };
    sendAlertNotifications(alert, pets[0]).catch(err => console.error('[PetConnect alert delivery]', err));
    res.redirect('/dashboard/alerts');
  } catch (err) { console.error('[PetConnect alert]', err); res.status(500).send('Unable to create this alert right now.'); }
});

app.get('/dashboard/alerts', requireMember, async (req, res) => {
  const alerts = await query(`SELECT a.*, p.pet_name, p.species FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id WHERE a.member_id=? ORDER BY a.created_at DESC`, [req.session.memberId]);
  res.render('member-alerts', { footer: await petConnectFooter(), alerts });
});

app.post('/dashboard/alerts/:id/found', requireMember, async (req, res) => {
  const alerts = await query('SELECT id, pet_id FROM missing_alerts WHERE id=? AND member_id=? AND status=\'active\'', [req.params.id, req.session.memberId]);
  if (!alerts.length) return res.redirect('/dashboard/alerts');
  await query('UPDATE missing_alerts SET status=\'found\', resolved_at=NOW() WHERE id=?', [alerts[0].id]);
  await query('UPDATE registered_pets SET is_missing=FALSE WHERE id=?', [alerts[0].pet_id]);
  res.redirect('/dashboard/alerts');
});

app.get('/partners', async (req, res) => {
  const type = String(req.query.type || '');
  const country = req.query.country === 'CA' ? 'CA' : req.query.country === 'US' ? 'US' : '';
  const partners = await query(`SELECT rp.*, pt.slug AS type_slug, pt.label AS type_label FROM rescue_partners rp JOIN partner_types pt ON pt.id=rp.partner_type_id WHERE rp.is_active=TRUE ${type ? 'AND pt.slug=?' : ''} ${country ? 'AND rp.country=?' : ''} ORDER BY rp.company_name`, [type, country].filter(Boolean));
  const types = await query('SELECT slug, label FROM partner_types ORDER BY label');
  res.render('partners', { footer: await petConnectFooter(), partners, types, selectedType: type, selectedCountry: country });
});

app.get('/partner/register', async (req, res) => res.render('partner-register', { footer: await petConnectFooter(), types: await query('SELECT id, label FROM partner_types ORDER BY label'), error: null }));

app.post('/partner/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const types = await query('SELECT id FROM partner_types WHERE id=?', [req.body.partner_type_id]);
  if (!types.length || !email || !req.body.company_name || !req.body.contact_name || !req.body.city) return res.status(400).render('partner-register', { footer: await petConnectFooter(), types: await query('SELECT id, label FROM partner_types ORDER BY label'), error: 'Complete all required fields.' });
  try {
    const country = req.body.country === 'CA' ? 'CA' : 'US';
    const coordinates = await geocodeAddress([req.body.address_line, req.body.city, req.body.state, req.body.postal_code, country]);
    const token = crypto.randomBytes(32).toString('hex');
    await query('INSERT INTO rescue_partners (partner_type_id, company_name, contact_name, email, phone, address_line, city, state, postal_code, country, latitude, longitude, website, verify_token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [req.body.partner_type_id, String(req.body.company_name).trim(), String(req.body.contact_name).trim(), email, String(req.body.phone || '').trim() || null, String(req.body.address_line || '').trim() || null, String(req.body.city).trim(), String(req.body.state || '').trim() || null, String(req.body.postal_code || '').trim() || null, country, coordinates && coordinates.latitude || null, coordinates && coordinates.longitude || null, String(req.body.website || '').trim() || null, token]);
    await sendEmail(email, 'Verify your PetConnect rescue partner profile', `<p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/partner/claim/${token}">Verify and claim your partner account</a></p>`);
    res.redirect('/partners');
  } catch (err) { console.error('[PetConnect partner registration]', err); res.status(400).render('partner-register', { footer: await petConnectFooter(), types: await query('SELECT id, label FROM partner_types ORDER BY label'), error: err.code === 'ER_DUP_ENTRY' ? 'That email is already registered.' : 'Unable to register your organization right now.' }); }
});

app.get('/partner/claim', async (req, res) => res.render('partner-claim', { footer: await petConnectFooter(), error: null, sent: false }));
app.get('/partner/login', async (req, res) => res.render('partner-login', { footer: await petConnectFooter(), error: null }));
app.post('/partner/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const partners = await query('SELECT id, password_hash, is_verified, is_active FROM rescue_partners WHERE email=?', [email]);
  const partner = partners[0];
  if (!partner || !partner.password_hash || !await bcrypt.compare(password, partner.password_hash)) return res.status(401).render('partner-login', { footer: await petConnectFooter(), error: 'Invalid email or password.' });
  if (!partner.is_verified || !partner.is_active) return res.status(403).render('partner-login', { footer: await petConnectFooter(), error: 'This partner account is not currently active.' });
  req.session.partnerId = partner.id;
  res.redirect('/partner/dashboard');
});
app.post('/partner/claim', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const partners = await query('SELECT verify_token FROM rescue_partners WHERE email=?', [email]);
  if (partners[0] && partners[0].verify_token) await sendEmail(email, 'Claim your PetConnect partner account', `<p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/partner/claim/${partners[0].verify_token}">Set your password</a></p>`);
  res.render('partner-claim', { footer: await petConnectFooter(), error: null, sent: true });
});
app.get('/partner/claim/:token', async (req, res) => res.render('partner-claim-token', { footer: await petConnectFooter(), token: req.params.token, error: null }));
app.post('/partner/claim/:token', async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8 || password !== String(req.body.confirm_password || '')) return res.status(400).render('partner-claim-token', { footer: await petConnectFooter(), token: req.params.token, error: 'Passwords must match and contain at least 8 characters.' });
  const partners = await query('SELECT id FROM rescue_partners WHERE verify_token=?', [req.params.token]);
  if (!partners.length) return res.status(400).render('partner-claim-token', { footer: await petConnectFooter(), token: req.params.token, error: 'This claim link is invalid or expired.' });
  await query('UPDATE rescue_partners SET password_hash=?, is_verified=TRUE, verify_token=NULL WHERE id=?', [await bcrypt.hash(password, 12), partners[0].id]);
  req.session.partnerId = partners[0].id;
  res.redirect('/partner/dashboard');
});
app.get('/partner/dashboard', requirePartner, async (req, res) => {
  const partners = await query('SELECT rp.*, pt.label AS type_label FROM rescue_partners rp JOIN partner_types pt ON pt.id=rp.partner_type_id WHERE rp.id=?', [req.session.partnerId]);
  const alerts = await query(`SELECT DISTINCT a.*, p.pet_name, p.species FROM alert_notifications n JOIN missing_alerts a ON a.id=n.alert_id JOIN registered_pets p ON p.id=a.pet_id WHERE n.recipient_partner_id=? ORDER BY n.notified_at DESC`, [req.session.partnerId]);
  res.render('partner-dashboard', { footer: await petConnectFooter(), partner: partners[0], alerts });
});

app.get('/api/globe/data', async (req, res) => {
  const scope = String(req.query.scope || 'all');
  const [alerts, members, partners] = await Promise.all([
    scope === 'members' || scope === 'partners' ? [] : query(`SELECT a.id, a.last_seen_latitude AS lat, a.last_seen_longitude AS lng, a.alert_type AS type, a.status, p.pet_name AS petName, p.species, a.last_seen_city AS city, a.last_seen_state AS state, a.created_at AS createdAt FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id WHERE a.status IN ('active','found') AND a.last_seen_latitude IS NOT NULL AND a.last_seen_longitude IS NOT NULL ORDER BY a.created_at DESC LIMIT 500`),
    scope === 'alerts' || scope === 'partners' ? [] : query('SELECT id, latitude AS lat, longitude AS lng, city, state FROM members WHERE is_verified=TRUE AND latitude IS NOT NULL AND longitude IS NOT NULL LIMIT 1000'),
    scope === 'alerts' || scope === 'members' ? [] : query(`SELECT rp.id, rp.latitude AS lat, rp.longitude AS lng, rp.company_name AS name, rp.city, rp.state, pt.slug AS type FROM rescue_partners rp JOIN partner_types pt ON pt.id=rp.partner_type_id WHERE rp.is_active=TRUE AND rp.latitude IS NOT NULL AND rp.longitude IS NOT NULL LIMIT 1000`)
  ]);
  res.json({ alerts, members, partners });
});

// ── Admin API: PetConnect ──────────────────────────────────────────────────
app.get('/api/admin/petconnect/members', requireAdmin, async (req, res) => {
  const term = `%${String(req.query.search || '').trim()}%`;
  const members = await query(`SELECT id, email, first_name, last_name, phone, city, state, country, is_verified, email_alerts, email_alert_radius, created_at FROM members WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ? ORDER BY created_at DESC LIMIT 200`, [term, term, term]);
  res.json({ members });
});

app.patch('/api/admin/petconnect/members/:id', requireAdmin, async (req, res) => {
  await query('UPDATE members SET email_alerts=?, email_alert_radius=? WHERE id=?', [req.body.email_alerts ? true : false, Math.max(1, Math.min(1000, Number(req.body.email_alert_radius) || 100)), req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/petconnect/pets', requireAdmin, async (req, res) => {
  const term = `%${String(req.query.search || '').trim()}%`;
  const pets = await query(`SELECT p.*, m.email AS member_email, CONCAT(m.first_name, ' ', m.last_name) AS member_name FROM registered_pets p JOIN members m ON m.id=p.member_id WHERE p.pet_name LIKE ? OR p.microchip_number LIKE ? OR m.email LIKE ? ORDER BY p.registered_at DESC LIMIT 200`, [term, term, term]);
  res.json({ pets });
});

app.get('/api/admin/petconnect/alerts', requireAdmin, async (req, res) => {
  const alerts = await query(`SELECT a.*, p.pet_name, p.species, m.email AS member_email FROM missing_alerts a JOIN registered_pets p ON p.id=a.pet_id JOIN members m ON m.id=a.member_id ORDER BY a.created_at DESC LIMIT 300`);
  res.json({ alerts });
});

app.patch('/api/admin/petconnect/alerts/:id', requireAdmin, async (req, res) => {
  const status = ['active', 'found', 'closed'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Invalid alert status.' });
  const alerts = await query('SELECT pet_id FROM missing_alerts WHERE id=?', [req.params.id]);
  if (!alerts.length) return res.status(404).json({ error: 'Alert not found.' });
  await query('UPDATE missing_alerts SET status=?, resolved_at=CASE WHEN ?="active" THEN NULL ELSE NOW() END WHERE id=?', [status, status, req.params.id]);
  await query('UPDATE registered_pets SET is_missing=? WHERE id=?', [status === 'active', alerts[0].pet_id]);
  res.json({ success: true });
});

app.delete('/api/admin/petconnect/alerts/:id', requireAdmin, async (req, res) => {
  await query('DELETE FROM missing_alerts WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/petconnect/partner-types', requireAdmin, async (req, res) => res.json({ types: await query('SELECT id, slug, label FROM partner_types ORDER BY label') }));
app.get('/api/admin/petconnect/partners', requireAdmin, async (req, res) => {
  const partners = await query(`SELECT rp.*, pt.label AS type_label FROM rescue_partners rp JOIN partner_types pt ON pt.id=rp.partner_type_id ORDER BY rp.created_at DESC`);
  res.json({ partners });
});
app.post('/api/admin/petconnect/partners', requireAdmin, async (req, res) => {
  const body = req.body || {};
  if (!body.partner_type_id || !body.company_name || !body.contact_name || !/^\S+@\S+\.\S+$/.test(String(body.email || '')) || !body.city) return res.status(400).json({ error: 'Type, organization, contact, email, and city are required.' });
  const country = body.country === 'CA' ? 'CA' : 'US';
  const coords = await geocodeAddress([body.address_line, body.city, body.state, body.postal_code, country]);
  const [result] = await pool.execute('INSERT INTO rescue_partners (partner_type_id, company_name, contact_name, email, phone, address_line, city, state, postal_code, country, latitude, longitude, website, is_active, is_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [body.partner_type_id, String(body.company_name).trim(), String(body.contact_name).trim(), String(body.email).trim().toLowerCase(), String(body.phone || '').trim() || null, String(body.address_line || '').trim() || null, String(body.city).trim(), String(body.state || '').trim() || null, String(body.postal_code || '').trim() || null, country, coords && coords.latitude || null, coords && coords.longitude || null, String(body.website || '').trim() || null, body.is_active !== false, true]);
  res.status(201).json({ success: true, id: result.insertId });
});
app.patch('/api/admin/petconnect/partners/:id', requireAdmin, async (req, res) => {
  const body = req.body || {};
  await query('UPDATE rescue_partners SET company_name=?, contact_name=?, email=?, phone=?, city=?, state=?, country=?, website=?, partner_type_id=?, is_active=? WHERE id=?', [String(body.company_name || '').trim(), String(body.contact_name || '').trim(), String(body.email || '').trim().toLowerCase(), String(body.phone || '').trim() || null, String(body.city || '').trim(), String(body.state || '').trim() || null, body.country === 'CA' ? 'CA' : 'US', String(body.website || '').trim() || null, body.partner_type_id, body.is_active ? true : false, req.params.id]);
  res.json({ success: true });
});
app.delete('/api/admin/petconnect/partners/:id', requireAdmin, async (req, res) => { await query('DELETE FROM rescue_partners WHERE id=?', [req.params.id]); res.json({ success: true }); });

app.get('/portal/login', (req, res) => {
  if (req.session && req.session.clientAccountId) return res.redirect(req.session.clientMustChangePassword ? '/portal/change-password' : '/portal');
  res.render('portal-login', { error: null });
});

app.post('/portal/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).render('portal-login', { error: 'Email and password are required.' });
  try {
    const rows = await query('SELECT id, email, password_hash, must_change_password FROM client_accounts WHERE email=?', [email]);
    const account = rows[0];
    if (!account || !await bcrypt.compare(password, account.password_hash)) return res.status(401).render('portal-login', { error: 'Invalid email or password.' });
    req.session.clientAccountId = account.id;
    req.session.clientAccountEmail = account.email;
    req.session.clientMustChangePassword = Boolean(account.must_change_password);
    return res.redirect(account.must_change_password ? '/portal/change-password' : '/portal');
  } catch (err) {
    console.error('[Portal login]', err);
    return res.status(500).render('portal-login', { error: 'Unable to sign in right now.' });
  }
});

app.post('/portal/logout', requirePortalAccount, (req, res) => {
  delete req.session.clientAccountId;
  delete req.session.clientAccountEmail;
  delete req.session.clientMustChangePassword;
  res.redirect('/portal/login');
});

app.get('/portal/change-password', requirePortalAccount, (req, res) => res.render('portal-password', { error: null }));

app.post('/portal/change-password', requirePortalAccount, async (req, res) => {
  const password = String(req.body.password || '');
  const confirmation = String(req.body.confirm_password || '');
  if (password.length < 8) return res.status(400).render('portal-password', { error: 'Use at least 8 characters for your password.' });
  if (password !== confirmation) return res.status(400).render('portal-password', { error: 'The passwords do not match.' });
  try {
    await query('UPDATE client_accounts SET password_hash=?, must_change_password=FALSE WHERE id=?', [await bcrypt.hash(password, 12), req.session.clientAccountId]);
    req.session.clientMustChangePassword = false;
    res.redirect('/portal');
  } catch (err) {
    console.error('[Portal password]', err);
    res.status(500).render('portal-password', { error: 'Unable to change your password right now.' });
  }
});

app.get('/portal', requirePortalAccount, async (req, res) => {
  try {
    const footer = await getFooter();
    res.render('portal-dashboard', { footer, clientEmail: req.session.clientAccountEmail || '' });
  } catch (err) {
    console.error('[Portal dashboard]', err);
    res.status(500).send('Unable to load the relocation portal right now.');
  }
});

app.get('/api/portal/relocations', requirePortalAccount, async (req, res) => {
  try {
    const contracts = await query(`SELECT c.id, c.contract_number, c.contract_data FROM client_contracts cc JOIN contracts c ON c.id=cc.contract_id
      WHERE cc.client_account_id=? AND c.status <> 'draft' ORDER BY c.created_at DESC`, [req.session.clientAccountId]);
    const relocations = await Promise.all(contracts.map(async contract => {
      const data = typeof contract.contract_data === 'string' ? JSON.parse(contract.contract_data) : contract.contract_data;
      const updates = await query('SELECT status_step, occurred_at FROM relocation_updates WHERE contract_id=? ORDER BY occurred_at DESC, id DESC LIMIT 1', [contract.id]);
      const currentStatus = updates[0] ? updates[0].status_step : (contract.status === 'signed' ? 'Contract Signed' : 'Consulting');
      return { id: contract.id, contract_number: contract.contract_number, pet_name: data.animal && data.animal.name || 'Pet', route: [data.travel && data.travel.departure_city, data.travel && data.travel.arrival_city].filter(Boolean).join(' to '), current_status: currentStatus, active: isActiveRelocation(currentStatus) };
    }));
    res.json({ relocations });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.get('/api/portal/relocations/:contractId', requirePortalAccount, async (req, res) => {
  try {
    const contracts = await query(`SELECT c.id, c.contract_number, c.contract_data, c.status FROM client_contracts cc JOIN contracts c ON c.id=cc.contract_id
      WHERE cc.client_account_id=? AND c.id=?`, [req.session.clientAccountId, req.params.contractId]);
    if (!contracts.length) return res.status(404).json({ error: 'Relocation not found.' });
    const contract = contracts[0];
    const data = typeof contract.contract_data === 'string' ? JSON.parse(contract.contract_data) : contract.contract_data;
    const [updates, events, documents, boarding] = await Promise.all([
      query('SELECT id, status_step, client_note, occurred_at FROM relocation_updates WHERE contract_id=? ORDER BY occurred_at DESC, id DESC', [contract.id]),
      query('SELECT id, event_type, title, description, location, starts_at FROM relocation_events WHERE contract_id=? ORDER BY starts_at ASC', [contract.id]),
      query('SELECT id, category, label, file_url, issued_on, expires_on FROM relocation_documents WHERE contract_id=? ORDER BY expires_on ASC, id DESC', [contract.id]),
      query('SELECT id, title, youtube_id, client_note, published_at FROM boarding_updates WHERE contract_id=? ORDER BY published_at DESC', [contract.id])
    ]);
    const currentStatus = updates[0] ? updates[0].status_step : (contract.status === 'signed' ? 'Contract Signed' : 'Consulting');
    res.json({ relocation: { id: contract.id, contract_number: contract.contract_number, contract_data: data, current_status: currentStatus, relocation_steps: relocationSteps, updates, events, documents: documents.map(document => ({ ...document, expiry_status: documentExpiryStatus(document.expires_on) })), boarding } });
  } catch (err) { sendContractDatabaseError(res, err); }
});

// ── PUBLIC API ────────────────────────────────────────────────────────────

// Countries list (for regulations page)
app.get('/api/countries', async (req, res) => {
  try {
    const countries = await query('SELECT id, country_name FROM countries ORDER BY country_name');
    res.json({ countries });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Airlines list
app.get('/api/airlines', async (req, res) => {
  try {
    const airlines = await query('SELECT id, airline_name FROM airlines ORDER BY airline_name');
    res.json({ airlines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Country regulations detail
app.get('/api/regulations/country/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM countries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Country not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Airline regulations detail
app.get('/api/regulations/airline/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM airlines WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Airline not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Public Contract API ───────────────────────────────────────────────────
app.get('/api/contracts/:contractNumber', async (req, res) => {
  try {
    const rows = await query('SELECT id, contract_number, status, contract_data, client_signature, client_signed_name, signed_at FROM contracts WHERE contract_number = ?', [req.params.contractNumber.trim().toUpperCase()]);
    if (!rows.length || rows[0].status === 'draft') return res.status(404).json({ error: 'Contract not found or not issued.' });
    const contract = rows[0];
    contract.contract_data = typeof contract.contract_data === 'string' ? JSON.parse(contract.contract_data) : contract.contract_data;
    res.json({ contract });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.get('/api/contracts/:contractNumber/pdf', async (req, res) => {
  const contractNumber = req.params.contractNumber.trim().toUpperCase();
  try {
    const rows = await query('SELECT contract_number, status, contract_data, client_signed_name, signed_at FROM contracts WHERE contract_number = ?', [contractNumber]);
    if (!rows.length || rows[0].status === 'draft') return res.status(404).json({ error: 'Contract not found or not issued.' });
    const contract = rows[0];
    const contractData = typeof contract.contract_data === 'string' ? JSON.parse(contract.contract_data) : contract.contract_data;
    const pdf = generateContractPdf({ contractNumber, contractData, signedName: contract.client_signed_name || '', signedAt: contract.signed_at || new Date() });
    res.type('application/pdf').attachment(`Pet-Fly-Contract-${contractNumber}.pdf`).send(pdf);
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/contracts/:contractNumber/sign', async (req, res) => {
  const contractNumber = req.params.contractNumber.trim().toUpperCase();
  const { contract_data, signature, signed_name, accepted_terms } = req.body;
  if (!accepted_terms || !signature || !signed_name) return res.status(400).json({ error: 'Your full name, signature, and acceptance are required.' });
  try {
    const rows = await query('SELECT id, status, contract_data FROM contracts WHERE contract_number = ?', [contractNumber]);
    if (!rows.length || rows[0].status === 'draft') return res.status(404).json({ error: 'Contract not found or not issued.' });
    if (!canEditContract(rows[0].status)) return res.status(409).json({ error: 'This contract has already been signed and cannot be changed.' });
    const signedContractData = mergeClientContractData(typeof rows[0].contract_data === 'string' ? JSON.parse(rows[0].contract_data) : rows[0].contract_data, contract_data || {});
    const result = await query(
      `UPDATE contracts SET contract_data=?, client_signature=?, client_signed_name=?, status='signed', signed_at=NOW() WHERE id=? AND status='issued'`,
      [JSON.stringify(signedContractData), signature, signed_name.trim(), rows[0].id]
    );
    if (!result.affectedRows) return res.status(409).json({ error: 'This contract has already been signed and cannot be changed.' });
    const clientEmail = String(signedContractData.client && signedContractData.client.email || '').trim();
    let emailSent = false;
    if (clientEmail) {
      const pdf = generateContractPdf({ contractNumber, contractData: signedContractData, signedName: signed_name.trim(), signedAt: new Date() });
      const contractEmail = `<p>Thank you for signing your Pet Fly Inc contract.</p><p><strong>Contract number:</strong> ${contractNumber}</p><p>Your signed contract is attached as a PDF for your records.</p>`;
      try {
        emailSent = await sendEmail(clientEmail, `Your signed Pet Fly contract ${contractNumber}`, contractEmail, [{
          filename: `Pet-Fly-Contract-${contractNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf'
        }]);
      } catch (emailError) {
        console.error('[Contract email]', emailError);
      }
    }
    res.json({ success: true, email_sent: emailSent });
  } catch (err) { sendContractDatabaseError(res, err); }
});

// ── Quote Submission ───────────────────────────────────────────────────────
app.post('/api/quote', async (req, res) => {
  const {
    pet_type, pet_name, breed, pet_color, pet_gender, pet_dob, microchip, pet_weight,
    origin_country, origin_city, dest_country, dest_city,
    travel_date, transport_type, contact_name, email, phone, notes,
    pickup_delivery, pickup_address, delivery_address,
    fax_only, email_addr  // honeypot
  } = req.body;

  // Honeypot check
  if (fax_only || email_addr) return res.json({ success: true }); // fake success to bots

  if (!contact_name || !email) return res.status(400).json({ success: false, message: 'Name and email are required.' });

  try {
    await query(
      `INSERT INTO quote_requests
        (contact_name, email, phone, pet_type, pet_name, breed, pet_color, pet_gender, pet_dob, microchip, pet_weight,
         origin_country, origin_city, dest_country, dest_city, travel_date, transport_type,
         pickup_delivery, pickup_address, delivery_address, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [contact_name, email, phone||null, pet_type||'Dog', pet_name||null, breed||null, pet_color||null, pet_gender||null, pet_dob||null, microchip||null, pet_weight||null,
       origin_country||null, origin_city||null, dest_country||null, dest_city||null,
       travel_date||null, transport_type||null,
       pickup_delivery ? true : null, pickup_address||null, delivery_address||null, notes||null]
    );

    // Send email notification to admin
    const petDetails = [
      pet_type || 'Dog',
      pet_name ? `Name: ${pet_name}` : null,
      breed ? `Breed: ${breed}` : null,
      pet_color ? `Color: ${pet_color}` : null,
      pet_gender ? `Gender: ${pet_gender}` : null,
      pet_dob ? `DOB: ${pet_dob}` : null,
      microchip ? `Microchip: ${microchip}` : null,
      pet_weight ? `Weight: ${pet_weight}` : null,
    ].filter(Boolean).join(' | ');

    let pickupInfo = '';
    if (pickup_delivery) {
      pickupInfo = `<p><strong>Pickup &amp; Delivery:</strong> Requested</p>` +
        (pickup_address ? `<p><strong>Pickup Address:</strong> ${pickup_address}</p>` : '') +
        (delivery_address ? `<p><strong>Delivery Address:</strong> ${delivery_address}</p>` : '');
    }

    const adminEmailHtml = `
      <h2>New Quote Request</h2>
      <p><strong>From:</strong> ${contact_name} &lt;${email}&gt; ${phone ? ` / ${phone}` : ''}</p>
      <p><strong>Pet:</strong> ${petDetails}</p>
      <p><strong>From:</strong> ${origin_city || 'N/A'}, ${origin_country || 'N/A'}</p>
      <p><strong>To:</strong> ${dest_city || 'N/A'}, ${dest_country || 'N/A'}</p>
      <p><strong>Travel Date:</strong> ${travel_date || 'Not specified'}</p>
      <p><strong>Transport Type:</strong> ${transport_type || 'Not specified'}</p>
      ${pickupInfo}
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <hr><p style="color:#888;">Sent via petflyinc.com quote form</p>
    `;
    await sendEmail('info@petflyinc.com', `New Quote Request from ${contact_name}`, adminEmailHtml);

    // Send auto-reply confirmation to the client
    const autoReplyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a3a5c; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🐾 Pet Fly Inc</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">International Pet Transportation</p>
        </div>
        <div style="padding: 32px 24px; background: #ffffff;">
          <h2 style="color: #1a3a5c; margin-top: 0;">Hi ${contact_name},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Thank you for reaching out to Pet Fly Inc! We've received your quote request and our team is on it.</p>
          <div style="background: #f0f7ff; border-left: 4px solid #1a3a5c; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #333;"><strong>🕐 Response Time:</strong></p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #333;">During business hours (Mon–Fri, 9AM–6PM PST), we typically respond within <strong>15–30 minutes</strong>.</p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #333;">Outside business hours or on weekends, we'll get back to you first thing the next business day.</p>
          </div>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">In the meantime, feel free to explore our services at <a href="https://petflyinc.com/service" style="color: #1a3a5c;">petflyinc.com/service</a> or learn about country-specific regulations at <a href="https://petflyinc.com/regulations" style="color: #1a3a5c;">petflyinc.com/regulations</a>.</p>
          <p style="font-size: 15px; color: #333; margin-top: 24px;">Safe travels for your furry friend! 🐕🐈</p>
          <p style="color: #888; font-size: 14px; margin-top: 32px;">— The Pet Fly Inc Team<br>📧 info@petflyinc.com | 🌐 petflyinc.com</p>
        </div>
        <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Pet Fly Inc. IATA & USDA Certified.</p>
        </div>
      </div>
    `;
    await sendEmail(email, `We've received your quote request, ${contact_name}! 🐾`, autoReplyHtml);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── Contact Submission ──────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message, fax_only, email_addr } = req.body;
  if (fax_only || email_addr) return res.json({ success: true });
  if (!name || !email || !message) return res.status(400).json({ success: false });

  try {
    await query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?,?,?,?,?)',
      [name, email, phone||null, subject||null, message]
    );

    // Send email notification to admin
    const adminEmailHtml = `
      <h2>New Contact Message</h2>
      <p><strong>From:</strong> ${name} &lt;${email}&gt; ${phone ? ` / ${phone}` : ''}</p>
      <p><strong>Subject:</strong> ${subject || '(no subject)'}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr><p style="color:#888;">Sent via petflyinc.com contact form</p>
    `;
    await sendEmail('info@petflyinc.com', `Contact Form: ${subject || name}`, adminEmailHtml);

    // Send auto-reply confirmation to the client
    const autoReplyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a3a5c; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🐾 Pet Fly Inc</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">International Pet Transportation</p>
        </div>
        <div style="padding: 32px 24px; background: #ffffff;">
          <h2 style="color: #1a3a5c; margin-top: 0;">Hi ${name},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Thank you for contacting Pet Fly Inc! We've received your message and our team will get back to you shortly.</p>
          <div style="background: #f0f7ff; border-left: 4px solid #1a3a5c; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #333;"><strong>🕐 Response Time:</strong></p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #333;">During business hours (Mon–Fri, 9AM–6PM PST), we typically respond within <strong>15–30 minutes</strong>.</p>
            <p style="margin: 8px 0 0; font-size: 15px; color: #333;">Outside business hours or on weekends, we'll get back to you first thing the next business day.</p>
          </div>
          <p style="font-size: 15px; color: #333; margin-top: 24px;">Safe travels for your furry friend! 🐕🐈</p>
          <p style="color: #888; font-size: 14px; margin-top: 32px;">— The Pet Fly Inc Team<br>📧 info@petflyinc.com | 🌐 petflyinc.com</p>
        </div>
        <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Pet Fly Inc. IATA & USDA Certified.</p>
        </div>
      </div>
    `;
    await sendEmail(email, `We've received your message, ${name}! 🐾`, autoReplyHtml);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ── Admin Auth Routes ──────────────────────────────────────────────────────

app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin');
  res.render('admin-login');
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password required.' });

  try {
    const rows = await query('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    if (!admin) return res.json({ success: false, error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.json({ success: false, error: 'Invalid credentials.' });

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    res.json({ success: true });
  } catch (err) { console.error('LOGIN ERROR:', err); res.status(500).json({ success: false, error: 'Server error.' }); }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/me', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.adminId) });
});

app.get('/api/admin/email-health', requireAdmin, async (req, res) => {
  if (!smtpConfig.auth.pass) return res.json({ success: false, error: 'SMTP password is not configured.' });
  try {
    await mailTransporter.verify();
    res.json({ success: true, message: 'SMTP connection and authentication succeeded.' });
  } catch (err) {
    console.error('[Email health]', err.message);
    res.json({ success: false, error: err.code || 'SMTP_CONNECTION_FAILED' });
  }
});

app.post('/api/admin/email-test', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, error: 'Enter a valid recipient email.' });
  const sent = await sendEmail(email, 'Pet Fly Inc email delivery test', '<p>This confirms that Pet Fly Inc can send email from its current SMTP configuration.</p>');
  if (!sent) return res.status(503).json({ success: false, error: lastEmailDeliveryError || 'SMTP_SEND_FAILED' });
  res.json({ success: true, message: 'Test email sent.' });
});

// Admin SPA
app.get('/admin', requireAdmin, (req, res) => res.render('admin'));

// ── Admin API: Quotes ───────────────────────────────────────────────────────
app.get('/api/admin/quotes', requireAdmin, async (req, res) => {
  try {
    const quotes = await query('SELECT * FROM quote_requests ORDER BY created_at DESC');
    res.json({ quotes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['pending','reviewed','completed','cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await query('UPDATE quote_requests SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM quote_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API: Contacts ────────────────────────────────────────────────────
app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  try {
    const contacts = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json({ contacts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API: Contracts ───────────────────────────────────────────────────
function contractDataFromQuote(quote) {
  const data = blankContractData();
  if (!quote) return data;
  data.client = { first_name: quote.contact_name || '', last_name: '', address: quote.pickup_address || '', city_state_zip: '', phone: quote.phone || '', email: quote.email || '' };
  data.animal = { ...data.animal, name: quote.pet_name || '', type: quote.pet_type || '', breed: quote.breed || '', gender: quote.pet_gender || '', dob: quote.pet_dob || '', weight_kg: quote.pet_weight || '', color: quote.pet_color || '', microchip: quote.microchip || '' };
  data.travel = { ...data.travel, departure_country: quote.origin_country || '', departure_city: quote.origin_city || '', arrival_country: quote.dest_country || '', arrival_city: quote.dest_city || '', travel_date: quote.travel_date || '' };
  data.shipment.pickup_name_address_phone = [quote.contact_name, quote.pickup_address, quote.phone].filter(Boolean).join('\n');
  return data;
}

app.get('/api/admin/contracts', requireAdmin, async (req, res) => {
  try {
    const contracts = await query(`SELECT c.id, c.contract_number, c.quote_request_id, c.status, c.contract_data, c.issued_at, c.signed_at, c.created_at,
      q.contact_name AS quote_contact_name FROM contracts c LEFT JOIN quote_requests q ON q.id=c.quote_request_id ORDER BY c.created_at DESC`);
    contracts.forEach(contract => { contract.contract_data = typeof contract.contract_data === 'string' ? JSON.parse(contract.contract_data) : contract.contract_data; });
    res.json({ contracts });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contract-photos', requireAdmin, contractPhotoUpload.array('photos', 5), async (req, res) => {
  const photos = (req.files || []).map(file => {
    const mime = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpeg';
    return `data:image/${mime};base64,${fs.readFileSync(file.path).toString('base64')}`;
  });
  if (!photos.length) return res.status(400).json({ error: 'Upload up to five JPG, PNG, or WebP pet photos.' });
  const contractId = Number.parseInt(req.body.contract_id, 10);
  try {
    if (contractId) {
      const rows = await query('SELECT contract_data FROM contracts WHERE id=?', [contractId]);
      if (!rows.length) return res.status(404).json({ error: 'Contract not found.' });
      const data = typeof rows[0].contract_data === 'string' ? JSON.parse(rows[0].contract_data) : rows[0].contract_data;
      const existing = Array.isArray(data && data.animal && data.animal.photos) ? data.animal.photos : [];
      const normalized = normalizeContractData({ ...data, animal: { ...(data.animal || {}), photos: [...existing, ...photos].slice(0, 5) } });
      await query('UPDATE contracts SET contract_data=? WHERE id=?', [JSON.stringify(normalized), contractId]);
      return res.status(201).json({ photos, all_photos: normalized.animal.photos });
    }
    res.status(201).json({ photos, all_photos: photos });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.get('/api/admin/contracts/quotes/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM quote_requests WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Quote not found' });
    res.json({ contract_data: contractDataFromQuote(rows[0]), quote_request_id: rows[0].id });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts', requireAdmin, async (req, res) => {
  const data = normalizeContractData(req.body.contract_data || blankContractData());
  const quoteId = req.body.quote_request_id || null;
  try {
    let contractNumber;
    for (let attempt = 0; attempt < 5; attempt++) {
      contractNumber = createContractNumber();
      const existing = await query('SELECT id FROM contracts WHERE contract_number=?', [contractNumber]);
      if (!existing.length) break;
    }
    const [result] = await pool.execute('INSERT INTO contracts (contract_number, quote_request_id, contract_data) VALUES (?,?,?)', [contractNumber, quoteId, JSON.stringify(data)]);
    res.status(201).json({ success: true, id: result.insertId, contract_number: contractNumber });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.put('/api/admin/contracts/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT status FROM contracts WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contract not found' });
    await query('UPDATE contracts SET contract_data=?, quote_request_id=? WHERE id=?', [JSON.stringify(normalizeContractData(req.body.contract_data || {})), req.body.quote_request_id || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/issue', requireAdmin, async (req, res) => {
  try {
    const rows = await query('SELECT status FROM contracts WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contract not found' });
    await query(`UPDATE contracts SET contract_data=?, quote_request_id=?, status='issued', issued_at=COALESCE(issued_at, NOW()) WHERE id=?`, [JSON.stringify(normalizeContractData(req.body.contract_data || {})), req.body.quote_request_id || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { sendContractDatabaseError(res, err); }
});

// ── Admin API: Client Relocation Portal ────────────────────────────────────
async function contractExists(contractId) {
  const rows = await query('SELECT id FROM contracts WHERE id=?', [contractId]);
  return rows[0] || null;
}

function portalDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

app.get('/api/admin/contracts/:id/portal', requireAdmin, async (req, res) => {
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const [accounts, updates, events, documents, boarding] = await Promise.all([
      query(`SELECT ca.id, ca.email, ca.must_change_password FROM client_contracts cc JOIN client_accounts ca ON ca.id=cc.client_account_id WHERE cc.contract_id=?`, [req.params.id]),
      query('SELECT id, status_step, client_note, internal_note, occurred_at FROM relocation_updates WHERE contract_id=? ORDER BY occurred_at DESC, id DESC', [req.params.id]),
      query('SELECT id, event_type, title, description, location, starts_at FROM relocation_events WHERE contract_id=? ORDER BY starts_at ASC, id ASC', [req.params.id]),
      query('SELECT id, category, label, file_url, issued_on, expires_on FROM relocation_documents WHERE contract_id=? ORDER BY expires_on ASC, id DESC', [req.params.id]),
      query('SELECT id, title, youtube_id, client_note, published_at FROM boarding_updates WHERE contract_id=? ORDER BY published_at DESC, id DESC', [req.params.id])
    ]);
    res.json({ account: accounts[0] || null, updates, events, documents, boarding });
  } catch (err) { sendContractDatabaseError(res, err); }
});

async function sendPortalAccessEmail(email, initialPassword) {
  const loginUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/portal/login`;
  return sendEmail(email, 'Your Pet Fly relocation portal access', `<p>Your Pet Fly relocation portal is ready.</p><p><a href="${loginUrl}">Sign in to the client portal</a></p><p><strong>Temporary password:</strong> ${initialPassword}</p><p>You will be asked to create a new password after signing in.</p>`);
}

app.post('/api/admin/contracts/:id/portal-account', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const initialPassword = String(req.body.initial_password || '');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid client email.' });
  if (initialPassword.length < 8) return res.status(400).json({ error: 'The initial password must be at least 8 characters.' });
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const existing = await query('SELECT id FROM client_accounts WHERE email=?', [email]);
    let accountId;
    const hash = await bcrypt.hash(initialPassword, 12);
    if (existing.length) {
      accountId = existing[0].id;
      await query('UPDATE client_accounts SET password_hash=?, must_change_password=TRUE WHERE id=?', [hash, accountId]);
    } else {
      const [result] = await pool.execute('INSERT INTO client_accounts (email, password_hash, must_change_password) VALUES (?,?,TRUE)', [email, hash]);
      accountId = result.insertId;
    }
    await query('INSERT IGNORE INTO client_contracts (client_account_id, contract_id) VALUES (?,?)', [accountId, req.params.id]);
    const emailSent = await sendPortalAccessEmail(email, initialPassword);
    res.status(201).json({ success: true, email, email_sent: emailSent });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/portal-password-reset', requireAdmin, async (req, res) => {
  const initialPassword = String(req.body.initial_password || '');
  if (initialPassword.length < 8) return res.status(400).json({ error: 'The temporary password must be at least 8 characters.' });
  try {
    const accounts = await query(`SELECT ca.id, ca.email FROM client_contracts cc JOIN client_accounts ca ON ca.id=cc.client_account_id WHERE cc.contract_id=?`, [req.params.id]);
    if (!accounts.length) return res.status(404).json({ error: 'No client portal account is linked to this contract.' });
    const account = accounts[0];
    await query('UPDATE client_accounts SET password_hash=?, must_change_password=TRUE WHERE id=?', [await bcrypt.hash(initialPassword, 12), account.id]);
    const emailSent = await sendPortalAccessEmail(account.email, initialPassword);
    res.json({ success: true, email_sent: emailSent });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/relocation-updates', requireAdmin, async (req, res) => {
  const status = String(req.body.status_step || '');
  const occurredAt = portalDateTime(req.body.occurred_at);
  if (!relocationSteps.includes(status)) return res.status(400).json({ error: 'Select a valid relocation status.' });
  if (!occurredAt) return res.status(400).json({ error: 'Enter a valid update date and time.' });
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const [result] = await pool.execute('INSERT INTO relocation_updates (contract_id, status_step, client_note, internal_note, occurred_at) VALUES (?,?,?,?,?)', [req.params.id, status, String(req.body.client_note || '').trim() || null, String(req.body.internal_note || '').trim() || null, occurredAt]);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.delete('/api/admin/relocation-updates/:updateId', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM relocation_updates WHERE id=?', [req.params.updateId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/events', requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const startsAt = portalDateTime(req.body.starts_at);
  if (!title || !startsAt) return res.status(400).json({ error: 'Event title and date are required.' });
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const [result] = await pool.execute('INSERT INTO relocation_events (contract_id, event_type, title, description, location, starts_at) VALUES (?,?,?,?,?,?)', [req.params.id, String(req.body.event_type || 'Event').trim().slice(0, 64), title, String(req.body.description || '').trim() || null, String(req.body.location || '').trim() || null, startsAt]);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.put('/api/admin/events/:eventId', requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const startsAt = portalDateTime(req.body.starts_at);
  if (!title || !startsAt) return res.status(400).json({ error: 'Event title and date are required.' });
  try { await query('UPDATE relocation_events SET event_type=?, title=?, description=?, location=?, starts_at=? WHERE id=?', [String(req.body.event_type || 'Event').trim().slice(0, 64), title, String(req.body.description || '').trim() || null, String(req.body.location || '').trim() || null, startsAt, req.params.eventId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

app.delete('/api/admin/events/:eventId', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM relocation_events WHERE id=?', [req.params.eventId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/documents', requireAdmin, relocationDocumentUpload.single('file'), async (req, res) => {
  const category = String(req.body.category || '');
  const label = String(req.body.label || '').trim();
  if (!documentCategories.includes(category)) return res.status(400).json({ error: 'Select a valid document category.' });
  if (!label) return res.status(400).json({ error: 'Document label is required.' });
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const [result] = await pool.execute('INSERT INTO relocation_documents (contract_id, category, label, file_url, issued_on, expires_on) VALUES (?,?,?,?,?,?)', [req.params.id, category, label, fileUrl, req.body.issued_on || null, req.body.expires_on || null]);
    res.status(201).json({ success: true, id: result.insertId, file_url: fileUrl });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.delete('/api/admin/documents/:documentId', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM relocation_documents WHERE id=?', [req.params.documentId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

app.post('/api/admin/contracts/:id/boarding-updates', requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const youtubeId = normalizeYouTubeUrl(req.body.youtube_url);
  const publishedAt = portalDateTime(req.body.published_at);
  if (!title || !youtubeId || !publishedAt) return res.status(400).json({ error: 'Title, valid YouTube URL, and publish date are required.' });
  try {
    if (!await contractExists(req.params.id)) return res.status(404).json({ error: 'Contract not found.' });
    const [result] = await pool.execute('INSERT INTO boarding_updates (contract_id, title, youtube_id, client_note, published_at) VALUES (?,?,?,?,?)', [req.params.id, title, youtubeId, String(req.body.client_note || '').trim() || null, publishedAt]);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { sendContractDatabaseError(res, err); }
});

app.put('/api/admin/boarding-updates/:updateId', requireAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const youtubeId = normalizeYouTubeUrl(req.body.youtube_url);
  const publishedAt = portalDateTime(req.body.published_at);
  if (!title || !youtubeId || !publishedAt) return res.status(400).json({ error: 'Title, valid YouTube URL, and publish date are required.' });
  try { await query('UPDATE boarding_updates SET title=?, youtube_id=?, client_note=?, published_at=? WHERE id=?', [title, youtubeId, String(req.body.client_note || '').trim() || null, publishedAt, req.params.updateId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

app.delete('/api/admin/boarding-updates/:updateId', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM boarding_updates WHERE id=?', [req.params.updateId]); res.json({ success: true }); }
  catch (err) { sendContractDatabaseError(res, err); }
});

// TEMP DEBUG - no auth needed (for testing only)
app.get('/debug/content', async (req, res) => {
  try {
    const rows = await query('SELECT section_key, content FROM landing_content');
    const content = {};
    rows.forEach(row => {
      try { content[row.section_key] = JSON.parse(row.content); }
      catch { content[row.section_key] = row.content; }
    });
    res.json({ content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/debug/content/:section', async (req, res) => {
  try {
    const json = JSON.stringify(req.body);
    await query(
      'INSERT INTO landing_content (section_key, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)',
      [req.params.section, json]
    );
    res.json({ success: true, section: req.params.section });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API: Landing Content ─────────────────────────────────────────────
app.get('/api/admin/landing-content', requireAdmin, async (req, res) => {
  try {
    const content = await getLandingContent();
    res.json({ content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/landing-content/:section', requireAdmin, async (req, res) => {
  try {
    const section = await getLandingSection(req.params.section);
    res.json({ section });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/landing-content/:section', requireAdmin, async (req, res) => {
  try {
    await setLandingSection(req.params.section, req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API: Countries ────────────────────────────────────────────────────
app.get('/api/admin/countries', requireAdmin, async (req, res) => {
  try {
    const countries = await query('SELECT * FROM countries ORDER BY country_name');
    res.json({ countries });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/countries', requireAdmin, async (req, res) => {
  const {
    country_name, country_code, pet_types, microchip, rabies_vaccination,
    health_certificate, import_permit, quarantine_days, preparation_time,
    additional_requirements, restricted_breeds, contact_info
  } = req.body;
  if (!country_name) return res.status(400).json({ error: 'Country name required' });
  try {
    const [result] = await pool.execute(
      `INSERT INTO countries (country_name, country_code, pet_types, microchip, rabies_vaccination, health_certificate, import_permit, quarantine_days, preparation_time, additional_requirements, restricted_breeds, contact_info)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [country_name, country_code||null, pet_types||null, microchip||null, rabies_vaccination||null,
       health_certificate||null, import_permit||null, Number(quarantine_days)||0,
       preparation_time||null, additional_requirements||null, restricted_breeds||null, contact_info||null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/countries/:id', requireAdmin, async (req, res) => {
  const {
    country_name, country_code, pet_types, microchip, rabies_vaccination,
    health_certificate, import_permit, quarantine_days, preparation_time,
    additional_requirements, restricted_breeds, contact_info
  } = req.body;
  try {
    await query(
      `UPDATE countries SET country_name=?, country_code=?, pet_types=?, microchip=?, rabies_vaccination=?,
       health_certificate=?, import_permit=?, quarantine_days=?, preparation_time=?,
       additional_requirements=?, restricted_breeds=?, contact_info=? WHERE id=?`,
      [country_name, country_code||null, pet_types||null, microchip||null, rabies_vaccination||null,
       health_certificate||null, import_permit||null, Number(quarantine_days)||0,
       preparation_time||null, additional_requirements||null, restricted_breeds||null,
       contact_info||null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/countries/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM countries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API: Airlines ─────────────────────────────────────────────────────
app.get('/api/admin/airlines', requireAdmin, async (req, res) => {
  try {
    const airlines = await query('SELECT * FROM airlines ORDER BY airline_name');
    res.json({ airlines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/airlines', requireAdmin, async (req, res) => {
  const { airline_name, carry_on, checked_bag, cargo, pet_fee, size_limits, breed_restrictions, booking_info, crate_requirements } = req.body;
  if (!airline_name) return res.status(400).json({ error: 'Airline name required' });
  try {
    const [result] = await pool.execute(
      `INSERT INTO airlines (airline_name, carry_on, checked_bag, cargo, pet_fee, size_limits, breed_restrictions, booking_info, crate_requirements)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [airline_name, carry_on||null, checked_bag||null, cargo||null, pet_fee||null,
       size_limits||null, breed_restrictions||null, booking_info||null, crate_requirements||null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/airlines/:id', requireAdmin, async (req, res) => {
  const { airline_name, carry_on, checked_bag, cargo, pet_fee, size_limits, breed_restrictions, booking_info, crate_requirements } = req.body;
  try {
    await query(
      `UPDATE airlines SET airline_name=?, carry_on=?, checked_bag=?, cargo=?, pet_fee=?,
       size_limits=?, breed_restrictions=?, booking_info=?, crate_requirements=? WHERE id=?`,
      [airline_name, carry_on||null, checked_bag||null, cargo||null, pet_fee||null,
       size_limits||null, breed_restrictions||null, booking_info||null, crate_requirements||null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/airlines/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM airlines WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Pet Fly Inc running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
