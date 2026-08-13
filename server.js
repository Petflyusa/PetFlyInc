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
const { blankContractData, createContractNumber, canEditContract, mergeClientContractData, normalizeContractData } = require('./lib/contracts');
const { ensureContractSchema, sendContractDatabaseError } = require('./lib/contract-database');
const { generateContractPdf } = require('./lib/contract-pdf');
const { documentExpiryStatus, isActiveRelocation, relocationSteps } = require('./lib/portal');
const { defaultFooter } = require('./lib/site');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Email Transporter ───────────────────────────────────────────────────────
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'info@petflyinc.com',
    pass: process.env.SMTP_PASS || '',
  },
};
const mailTransporter = nodemailer.createTransport(smtpConfig);

async function sendEmail(to, subject, htmlContent, attachments = []) {
  if (!smtpConfig.auth.pass) {
    console.warn('[Email] SMTP_PASS not set, skipping email send to', to);
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
    return true;
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
    return false;
  }
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
ensureContractSchema(pool).then(() => {
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
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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

app.post('/api/admin/contract-photos', requireAdmin, contractPhotoUpload.array('photos', 5), (req, res) => {
  const photos = (req.files || []).map(file => `/uploads/${file.filename}`);
  if (!photos.length) return res.status(400).json({ error: 'Upload up to five JPG, PNG, or WebP pet photos.' });
  res.status(201).json({ photos });
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
