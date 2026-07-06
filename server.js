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

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
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
  crossOriginResourcePolicy: { policy: 'cross-origin' }
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
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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

// ── Auth Middleware ─────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

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
app.get('/service', (req, res) => res.render('service'));

// Quote
app.get('/quote', (req, res) => res.render('quote'));

// Contact
app.get('/contact', (req, res) => res.render('contact'));

// Regulations
app.get('/regulations', async (req, res) => {
  try {
    const countries = await query('SELECT id, country_name FROM countries ORDER BY country_name');
    const airlines = await query('SELECT id, airline_name FROM airlines ORDER BY airline_name');
    res.render('regulations', { countries, airlines });
  } catch (err) {
    console.error(err);
    res.render('regulations', { countries: [], airlines: [] });
  }
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

// ── Quote Submission ───────────────────────────────────────────────────────
app.post('/api/quote', (req, res) => {
  const {
    pet_type, pet_name, breed, pet_weight,
    origin_country, origin_city, dest_country, dest_city,
    travel_date, transport_type, contact_name, email, phone, notes,
    fax_only, email_addr  // honeypot
  } = req.body;

  // Honeypot check
  if (fax_only || email_addr) return res.json({ success: true }); // fake success to bots

  if (!contact_name || !email) return res.status(400).json({ success: false, message: 'Name and email are required.' });

  query(
    `INSERT INTO quote_requests
      (contact_name, email, phone, pet_type, pet_name, breed, pet_weight,
       origin_country, origin_city, dest_country, dest_city, travel_date, transport_type, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [contact_name, email, phone||null, pet_type||'Dog', pet_name||null, breed||null, pet_weight||null,
     origin_country||null, origin_city||null, dest_country||null, dest_city||null,
     travel_date||null, transport_type||null, notes||null]
  )
  .then(() => res.json({ success: true }))
  .catch(err => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  });
});

// ── Contact Submission ──────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message, fax_only, email_addr } = req.body;
  if (fax_only || email_addr) return res.json({ success: true });
  if (!name || !email || !message) return res.status(400).json({ success: false });

  query(
    'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?,?,?,?,?)',
    [name, email, phone||null, subject||null, message]
  )
  .then(() => res.json({ success: true }))
  .catch(err => { console.error(err); res.status(500).json({ success: false }); });
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
