/* ============================================================
   Pet Fly Inc — Admin Panel SPA
   ============================================================ */

var state = {
  quotes: [],
  contacts: [],
  content: {},
  countries: [],
  airlines: [],
  contracts: [], petconnect: { members: [], pets: [], alerts: [], partners: [], types: [] }
};

var toastTimeout;
var creds = { credentials: 'include' };

// ── Auth Check ──────────────────────────────────────────────────────────────
(async function checkAuth() {
  try {
    var r = await fetch('/admin/me', creds);
    var d = await r.json();
    if (!d.loggedIn) { window.location.href = '/admin/login'; }
  } catch {
    window.location.href = '/admin/login';
  }
})();

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type) {
  var el = document.getElementById('toast') || createToast();
  el.textContent = msg;
  el.className = 'toast ' + (type || 'success') + ' show';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() { el.classList.remove('show'); }, 3500);
}
function createToast() {
  var el = document.createElement('div');
  el.id = 'toast';
  el.className = 'toast';
  document.body.appendChild(el);
  return el;
}

// ── Navigation ─────────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('section-' + name).classList.add('active');
  var btn = document.querySelector('.nav-btn[data-section="' + name + '"]');
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);

  if (name === 'dashboard') loadDashboard();
  if (name === 'quotes') loadQuotes();
  if (name === 'contacts') loadContacts();
  if (name === 'contracts') loadContracts();
  if (name === 'petconnect') loadPetConnect();
  if (name === 'content') loadLandingContent();
  if (name === 'countries') loadCountries();
  if (name === 'airlines') loadAirlines();
}

// Mobile navigation is independent from section loading so desktop behavior stays unchanged.
function closeAdminNav() {
  var sidebar = document.getElementById('adminSidebar');
  var overlay = document.getElementById('adminNavOverlay');
  var toggle = document.getElementById('adminMenuToggle');
  if (!sidebar || !overlay || !toggle) return;
  sidebar.classList.remove('is-open');
  overlay.classList.remove('is-visible');
  document.body.classList.remove('admin-nav-open');
  overlay.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
}

function toggleAdminNav() {
  var sidebar = document.getElementById('adminSidebar');
  var overlay = document.getElementById('adminNavOverlay');
  var toggle = document.getElementById('adminMenuToggle');
  if (!sidebar || !overlay || !toggle) return;
  var isOpen = sidebar.classList.toggle('is-open');
  overlay.classList.toggle('is-visible', isOpen);
  document.body.classList.toggle('admin-nav-open', isOpen);
  overlay.setAttribute('aria-hidden', String(!isOpen));
  toggle.setAttribute('aria-expanded', String(isOpen));
}

document.getElementById('adminMenuToggle').addEventListener('click', toggleAdminNav);
document.getElementById('adminNavOverlay').addEventListener('click', closeAdminNav);
document.querySelectorAll('.nav-btn').forEach(function(button) {
  button.addEventListener('click', closeAdminNav);
});
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') closeAdminNav();
});

// ── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    var [qr, cr] = await Promise.all([
      fetch('/api/admin/quotes', creds).then(function(r) { return r.json(); }),
      fetch('/api/admin/contacts', creds).then(function(r) { return r.json(); })
    ]);
    state.quotes = qr.quotes || [];
    state.contacts = cr.contacts || [];
    renderDashboard();
  } catch (err) { console.error(err); }
}

function renderDashboard() {
  var quotes = state.quotes;
  var contacts = state.contacts;
  var pending = quotes.filter(function(q) { return q.status === 'pending'; }).length;
  var completed = quotes.filter(function(q) { return q.status === 'completed'; }).length;

  document.getElementById('dashQuotes').textContent = quotes.length;
  document.getElementById('dashPending').textContent = pending;
  document.getElementById('dashContacts').textContent = contacts.length;
  document.getElementById('dashCompleted').textContent = completed;

  document.getElementById('badgeQuotes').textContent = pending;
  document.getElementById('badgeQuotes').classList.toggle('hidden', pending === 0);
  document.getElementById('badgeContacts').textContent = contacts.filter(function(c) { return !c.is_read; }).length;
  document.getElementById('badgeContacts').classList.toggle('hidden', contacts.filter(function(c) { return !c.is_read; }).length === 0);

  var recent = quotes.slice(0, 5);
  var el = document.getElementById('recentQuotes');
  if (recent.length === 0) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i>No quote requests yet</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr>';
  html += '<th>Name</th><th>Pet</th><th>Route</th><th>Date</th><th>Status</th>';
  html += '</tr></thead><tbody>';
  recent.forEach(function(q) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(q.contact_name) + '</strong><br><span style="font-size:0.8125rem;color:var(--text-muted);">' + escHtml(q.email) + '</span></td>';
    html += '<td>' + escHtml(q.pet_type) + (q.breed ? ' — ' + escHtml(q.breed) : '') + (q.pet_name ? ' (' + escHtml(q.pet_name) + ')' : '') + '</td>';
    html += '<td>' + escHtml(q.origin_city || '') + ' → ' + escHtml(q.dest_city || '') + '</td>';
    html += '<td>' + (q.travel_date ? escHtml(q.travel_date) : '—') + '</td>';
    html += '<td><span class="status-badge ' + escHtml(q.status) + '">' + escHtml(q.status) + '</span></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── Quotes ─────────────────────────────────────────────────────────────────
async function loadQuotes() {
  try {
    var d = await (await fetch('/api/admin/quotes', creds)).json();
    state.quotes = d.quotes || [];
    renderQuotes();
  } catch (err) { console.error(err); }
}

function renderQuotes() {
  var quotes = state.quotes;
  var el = document.getElementById('quotesTable');
  if (quotes.length === 0) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i>No quote requests yet</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr>';
  html += '<th>Date</th><th>Name / Email</th><th>Pet Info</th><th>Route</th><th>Type</th><th>Status</th><th></th>';
  html += '</tr></thead><tbody>';
  quotes.forEach(function(q) {
    html += '<tr>';
    html += '<td style="white-space:nowrap;">' + fmtDate(q.created_at) + '</td>';
    html += '<td><strong>' + escHtml(q.contact_name) + '</strong><br><a href="mailto:' + escHtml(q.email) + '" style="font-size:0.8125rem;color:var(--accent);">' + escHtml(q.email) + '</a>' + (q.phone ? '<br><span style="font-size:0.8125rem;color:rgba(247,245,240,0.4);">' + escHtml(q.phone) + '</span>' : '') + '</td>';
    html += '<td>' + escHtml(q.pet_type) + (q.breed ? ' ' + escHtml(q.breed) : '') + (q.pet_name ? '<br>Name: ' + escHtml(q.pet_name) : '') + (q.pet_weight ? '<br>' + escHtml(q.pet_weight) + ' lbs' : '') + '</td>';
    html += '<td>' + escHtml(q.origin_city || '') + ', ' + escHtml(q.origin_country || '') + '<br>→ ' + escHtml(q.dest_city || '') + ', ' + escHtml(q.dest_country || '') + '</td>';
    html += '<td>' + (q.transport_type ? escHtml(q.transport_type) : '—') + '<br><span style="font-size:0.8125rem;color:rgba(247,245,240,0.4);">' + (q.travel_date ? fmtDate(q.travel_date) : 'Date TBD') + '</span></td>';
    html += '<td><select onchange="updateQuoteStatus(' + q.id + ', this.value)" style="background:var(--charcoal);border:1px solid var(--border);color:var(--cream);padding:0.25rem 0.5rem;font-size:0.8125rem;border-radius:2px;cursor:pointer;">';
    ['pending','reviewed','completed','cancelled'].forEach(function(s) {
      html += '<option value="' + s + '"' + (q.status === s ? ' selected' : '') + '>' + ucFirst(s) + '</option>';
    });
    html += '</select></td>';
    html += '<td class="col-actions">';
    html += '<button class="btn-outline" onclick="viewQuote(' + q.id + ')" title="View"><i class="fas fa-eye"></i></button> ';
    html += '<button class="btn-danger" onclick="deleteQuote(' + q.id + ')" title="Delete"><i class="fas fa-trash"></i></button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

async function updateQuoteStatus(id, status) {
  try {
    await fetch('/api/admin/quotes/' + id, { ...creds,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    });
    showToast('Status updated', 'success');
    loadDashboard();
  } catch { showToast('Update failed', 'error'); }
}

function viewQuote(id) {
  var q = state.quotes.find(function(x) { return x.id === id; });
  if (!q) return;
  var html = '<div class="form-row">';
  html += '<div class="form-group"><label>Name</label><span style="font-size:0.9375rem;">' + escHtml(q.contact_name) + '</span></div>';
  html += '<div class="form-group"><label>Email</label><span style="font-size:0.9375rem;"><a href="mailto:' + escHtml(q.email) + '">' + escHtml(q.email) + '</a></span></div>';
  html += '<div class="form-group"><label>Phone</label><span style="font-size:0.9375rem;">' + escHtml(q.phone || '—') + '</span></div>';
  html += '<div class="form-group"><label>Travel Date</label><span style="font-size:0.9375rem;">' + (q.travel_date ? fmtDate(q.travel_date) : 'Not specified') + '</span></div>';
  html += '</div>';

  // Pet info
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Pet Type</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_type) + '</span></div>';
  html += '<div class="form-group"><label>Pet Name</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_name || '—') + '</span></div>';
  html += '<div class="form-group"><label>Breed</label><span style="font-size:0.9375rem;">' + escHtml(q.breed || '—') + '</span></div>';
  html += '<div class="form-group"><label>Color</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_color || '—') + '</span></div>';
  html += '<div class="form-group"><label>Gender</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_gender || '—') + '</span></div>';
  html += '<div class="form-group"><label>Date of Birth</label><span style="font-size:0.9375rem;">' + (q.pet_dob ? fmtDate(q.pet_dob) : '—') + '</span></div>';
  html += '<div class="form-group"><label>Microchip</label><span style="font-size:0.9375rem;">' + escHtml(q.microchip || '—') + '</span></div>';
  html += '</div>';

  // Route
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Origin</label><span style="font-size:0.9375rem;">' + escHtml((q.origin_city||'') + ', ' + (q.origin_country||'')) + '</span></div>';
  html += '<div class="form-group"><label>Destination</label><span style="font-size:0.9375rem;">' + escHtml((q.dest_city||'') + ', ' + (q.dest_country||'')) + '</span></div>';
  html += '<div class="form-group"><label>Transport Type</label><span style="font-size:0.9375rem;">' + (q.transport_type ? escHtml(q.transport_type) : '—') + '</span></div>';
  html += '</div>';

  // Pickup & Delivery
  if (q.pickup_delivery) {
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Pickup &amp; Delivery</label><span style="font-size:0.9375rem;color:var(--accent);">Requested</span></div>';
    html += '<div class="form-group"><label>Pickup Address</label><span style="font-size:0.9375rem;">' + escHtml(q.pickup_address || '—') + '</span></div>';
    html += '<div class="form-group"><label>Delivery Address</label><span style="font-size:0.9375rem;">' + escHtml(q.delivery_address || '—') + '</span></div>';
    html += '</div>';
  }

  if (q.notes) {
    html += '<div class="form-group full"><label>Notes</label><p style="font-size:0.9375rem;line-height:1.6;margin-top:0.25rem;">' + escHtml(q.notes).replace(/\n/g, '<br>') + '</p></div>';
  }
  openModal('Quote Details — ' + q.contact_name, html);
}

async function deleteQuote(id) {
  if (!confirm('Delete this quote request?')) return;
  try {
    await fetch('/api/admin/quotes/' + id, { ...creds, method: 'DELETE' });
    showToast('Deleted', 'success');
    loadQuotes();
    loadDashboard();
  } catch { showToast('Delete failed', 'error'); }
}

// ── Contacts ───────────────────────────────────────────────────────────────
async function loadContacts() {
  try {
    var d = await (await fetch('/api/admin/contacts', creds)).json();
    state.contacts = d.contacts || [];
    renderContacts();
  } catch (err) { console.error(err); }
}

function renderContacts() {
  var contacts = state.contacts;
  var el = document.getElementById('contactsTable');
  if (contacts.length === 0) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-envelope"></i>No messages yet</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr>';
  html += '<th>Date</th><th>Name</th><th>Subject</th><th>Email</th><th>Status</th><th></th>';
  html += '</tr></thead><tbody>';
  contacts.forEach(function(c) {
    html += '<tr>';
    html += '<td style="white-space:nowrap;">' + fmtDate(c.created_at) + '</td>';
    html += '<td><strong>' + escHtml(c.name) + '</strong></td>';
    html += '<td>' + escHtml(c.subject || '—') + '</td>';
    html += '<td><a href="mailto:' + escHtml(c.email) + '" style="font-size:0.875rem;color:var(--accent);">' + escHtml(c.email) + '</a></td>';
    html += '<td><span class="status-badge ' + (c.is_read ? 'read' : 'unread') + '">' + (c.is_read ? 'Read' : 'Unread') + '</span></td>';
    html += '<td class="col-actions">';
    html += '<button class="btn-outline" onclick="viewContact(' + c.id + ')" title="View"><i class="fas fa-eye"></i></button> ';
    if (!c.is_read) html += '<button class="btn-success" onclick="markContactRead(' + c.id + ')" title="Mark Read"><i class="fas fa-check"></i></button> ';
    html += '<button class="btn-danger" onclick="deleteContact(' + c.id + ')" title="Delete"><i class="fas fa-trash"></i></button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function viewContact(id) {
  var c = state.contacts.find(function(x) { return x.id === id; });
  if (!c) return;
  var html = '<div class="form-row">';
  html += '<div class="form-group"><label>From</label><span style="font-size:0.9375rem;">' + escHtml(c.name) + '</span></div>';
  html += '<div class="form-group"><label>Email</label><span style="font-size:0.9375rem;"><a href="mailto:' + escHtml(c.email) + '">' + escHtml(c.email) + '</a></span></div>';
  html += '<div class="form-group"><label>Phone</label><span style="font-size:0.9375rem;">' + escHtml(c.phone || '—') + '</span></div>';
  html += '<div class="form-group"><label>Subject</label><span style="font-size:0.9375rem;">' + escHtml(c.subject || '—') + '</span></div>';
  html += '</div>';
  if (c.message) html += '<div class="form-group full"><label>Message</label><p style="font-size:0.9375rem;line-height:1.6;margin-top:0.25rem;white-space:pre-wrap;">' + escHtml(c.message).replace(/\n/g, '<br>') + '</p></div>';
  openModal('Contact Message — ' + c.name, html);
}

async function markContactRead(id) {
  await fetch('/api/admin/contacts/' + id, { ...creds, method: 'PATCH' });
  loadContacts();
  loadDashboard();
}

async function deleteContact(id) {
  if (!confirm('Delete this message?')) return;
  await fetch('/api/admin/contacts/' + id, { ...creds, method: 'DELETE' });
  showToast('Deleted', 'success');
  loadContacts();
  loadDashboard();
}

// ── Contracts ──────────────────────────────────────────────────────────────
async function loadContracts() {
  try {
    var d = await (await fetch('/api/admin/contracts', creds)).json();
    state.contracts = d.contracts || [];
    renderContracts();
  } catch (err) { console.error(err); showToast('Could not load contracts', 'error'); }
}

function renderContracts() {
  var el = document.getElementById('contractsTable');
  if (!state.contracts.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-file-signature"></i>No contracts yet. Create one to issue a client agreement.</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Contract No.</th><th>Client</th><th>Pet</th><th>Travel</th><th>Quote</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>';
  state.contracts.forEach(function(c) {
    var client = (c.contract_data.client || {});
    var animal = (c.contract_data.animal || {});
    var travel = (c.contract_data.travel || {});
    var from = [travel.departure_city, travel.departure_country].filter(Boolean).join(', ') || '—';
    var to = [travel.arrival_city, travel.arrival_country].filter(Boolean).join(', ') || '—';
    html += '<tr><td><strong>' + escHtml(c.contract_number) + '</strong></td>';
    html += '<td>' + escHtml([client.first_name, client.last_name].filter(Boolean).join(' ') || '—') + '<br><span style="font-size:.8125rem;color:var(--text-muted);">' + escHtml(client.email || '') + '</span></td>';
    html += '<td><strong>' + escHtml(animal.name || '—') + '</strong><br><span style="font-size:.8125rem;color:var(--text-muted);">' + escHtml(animal.breed || animal.type || '—') + '</span></td>';
    html += '<td><span style="font-size:.8125rem;color:var(--text-muted);">From</span> ' + escHtml(from) + '<br><span style="font-size:.8125rem;color:var(--text-muted);">To</span> ' + escHtml(to) + '<br><span style="font-size:.8125rem;color:var(--text-muted);">Expected travel:</span> ' + (travel.travel_date ? fmtDate(travel.travel_date) : '—') + '</td>';
    html += '<td>' + (c.quote_request_id ? '#' + c.quote_request_id : '—') + '</td><td>' + fmtDate(c.created_at) + '</td>';
    html += '<td><span class="status-badge ' + escHtml(c.status) + '">' + ucFirst(c.status) + '</span></td><td class="col-actions">';
    html += '<button class="btn-outline" onclick="editContract(' + c.id + ')" title="Edit"><i class="fas fa-edit"></i></button>';
    if (c.status === 'draft') html += ' <button class="btn-success" onclick="issueContract(' + c.id + ')" title="Issue contract"><i class="fas fa-paper-plane"></i></button>';
    if (c.status !== 'draft') html += ' <button class="btn-outline" onclick="copyContractLink(\'' + escHtml(c.contract_number) + '\')" title="Copy client link"><i class="fas fa-link"></i></button>';
    if (c.status !== 'draft') html += ' <button class="btn-outline" onclick="managePortal(' + c.id + ')" title="Manage client portal"><i class="fas fa-route"></i></button>';
    html += '</td></tr>';
  });
  el.innerHTML = html + '</tbody></table>';
}

function emptyContract() {
  return { agreement:{effective_date:localDate()}, client:{first_name:'',last_name:'',address:'',city_state_zip:'',phone:'',email:''}, animal:{name:'',type:'',breed:'',gender:'',dob:'',weight_kg:'',color:'',microchip:'',length_cm:'',height_cm:'',photos:[]}, travel:{departure_country:'',departure_state:'',departure_city:'',arrival_country:'',arrival_state:'',arrival_city:'',travel_date:'',airline_flight:'',transfer_city:''}, shipment:{pickup_name_address_phone:'',consignee_name_address_phone:'',arrival_date:''}, quotation:{shipping_method:'',cargo_charge:'',cargo_charge_details:'',vaccination:'',vaccination_details:'',documentation:'',documentation_details:'',customs_service:'',customs_service_details:'',quarantine:'',quarantine_details:'',other_service:'',other_service_details:'',total_cost:'0.00'}, payment:{payment_method:'',deposit_amount:'',deposit_due:'',balance_amount:'0.00',balance_due:'',transfer_fee:''}, carrier:{representative_name:'',office_address:'12101 Clark St Unit F, Arcadia, CA 91007',email:'petflyusa@hotmail.com',website:'www.petflyinc.com',office_phone:'626-656-5666',cell_phone:'323-285-9939'} };
}
var petTypes = ['Feline','Canine','Reptile','Birds','Other'];
var petGenders = ['Female Spayed','Male Neutered','Female Intact','Male Intact'];
var shippingMethods = ['In-Cabin','Cargo','VIP Chauffeur','Private Charter','Ground'];
var paymentMethods = ['WeChat RMB','Alipay RMB','Bank Transfer RMB','Zelle','Wire'];
var quoteAmountFields = ['cargo_charge','vaccination','documentation','customs_service','quarantine','other_service'];
var quoteRows = [['cargo_charge','Cargo Charge'],['vaccination','Vaccination'],['documentation','Documentation'],['customs_service','Customs Service'],['quarantine','Quarantine'],['other_service','Other Service']];

function localDate() { var date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
function contractValue(data, group, field) {
  var values = data[group] || {};
  if (values[field] != null && values[field] !== '') return values[field];
  var legacy = { weight_kg:'weight', length_cm:'length', height_cm:'height', payment_method:'payee' };
  return legacy[field] && values[legacy[field]] ? values[legacy[field]] : '';
}
function contractInput(group, field, label, value, type, locked, extra) {
  extra = extra || '';
  return '<div class="form-group"><label>' + label + '</label><input type="' + (type || 'text') + '" class="field-input contract-input" data-group="' + group + '" data-field="' + field + '" value="' + escHtml(value) + '" ' + (locked ? 'readonly' : '') + ' ' + extra + '></div>';
}
function contractTextArea(group, field, label, value, locked) {
  return '<div class="form-group"><label>' + label + '</label><textarea class="field-textarea contract-input" data-group="' + group + '" data-field="' + field + '" ' + (locked ? 'readonly' : '') + '>' + escHtml(value) + '</textarea></div>';
}
function contractSelect(group, field, label, value, options, locked, className) {
  var html = '<div class="form-group"><label>' + label + '</label><select class="field-input contract-input ' + (className || '') + '" data-group="' + group + '" data-field="' + field + '" ' + (locked ? 'disabled' : '') + '><option value="">Select...</option>';
  options.forEach(function(option) { html += '<option value="' + escHtml(option) + '"' + (option === value ? ' selected' : '') + '>' + escHtml(option) + '</option>'; });
  return html + '</select></div>';
}
function contractSection(title, body) { return '<h3 style="margin:1.5rem 0 .75rem;color:var(--cream);">' + title + '</h3>' + body; }
function contractPhotoEditor(photos) { var html='<div class="form-group full"><label>Pet Photos</label><input id="fContractPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple onchange="uploadContractPhotos(this)"><small>Upload up to five JPG, PNG, or WebP photos. Maximum 5 MB each.</small><div id="contractPhotoList" style="display:flex;flex-wrap:wrap;gap:.75rem;margin-top:.75rem;">'; (photos||[]).forEach(function(photo,index){html+='<div data-photo="'+escHtml(photo)+'" style="position:relative;"><img src="'+escHtml(photo)+'" alt="Pet photo" style="width:110px;height:82px;object-fit:cover;border:1px solid var(--border);"><button type="button" class="btn-danger" onclick="removeContractPhoto('+index+')" style="position:absolute;top:3px;right:3px;padding:.2rem .35rem;">&times;</button></div>';}); return html+'</div></div>'; }
function contractEditorHtml(contract) {
  contract = contract || { contract_data:emptyContract(), quote_request_id:'', status:'draft' };
  var data = contract.contract_data || emptyContract();
  var locked = false;
  var html = '<input type="hidden" id="fContractId" value="' + (contract.id || '') + '"><input type="hidden" id="fContractStatus" value="' + escHtml(contract.status || 'draft') + '">';
  html += '<div class="form-group full"><label>Import quote (optional)</label><select class="field-input" id="fContractQuote" onchange="importQuoteToContract(this.value)" ' + (locked ? 'disabled' : '') + '><option value="">Start without a quote</option></select></div>';
  if (contract.contract_number) html += '<p style="margin-bottom:1rem;color:var(--accent);"><strong>Contract number:</strong> ' + escHtml(contract.contract_number) + '</p>';
  html += contractSection('Agreement', '<div class="form-row">' + contractInput('agreement','effective_date','Contract Effective Date',contractValue(data,'agreement','effective_date') || localDate(),'date',locked) + '</div>');
  html += contractSection('Client Information', '<div class="form-row">' + ['first_name','last_name','address','city_state_zip','phone','email'].map(function(field) { var labels={first_name:'First Name',last_name:'Last Name',address:'Street Address',city_state_zip:'City / State / ZIP',phone:'Phone',email:'Email'}; return contractInput('client',field,labels[field],contractValue(data,'client',field),field === 'email' ? 'email' : 'text',locked); }).join('') + '</div>');
  html += contractSection('Animal Information', '<div class="form-row">' + contractInput('animal','name',"Pet's Name",contractValue(data,'animal','name'),'text',locked) + contractSelect('animal','type',"Pet's Type",contractValue(data,'animal','type'),petTypes,locked) + contractInput('animal','breed','Breed',contractValue(data,'animal','breed'),'text',locked) + contractSelect('animal','gender','Gender',contractValue(data,'animal','gender'),petGenders,locked) + contractInput('animal','dob','Date of Birth',contractValue(data,'animal','dob'),'date',locked) + contractInput('animal','weight_kg','Weight (kg)',contractValue(data,'animal','weight_kg'),'number',locked,'step="0.01" min="0"') + contractInput('animal','color','Color',contractValue(data,'animal','color'),'text',locked) + contractInput('animal','microchip','Microchip',contractValue(data,'animal','microchip'),'text',locked) + contractInput('animal','length_cm','Length (cm)',contractValue(data,'animal','length_cm'),'number',locked,'step="0.01" min="0"') + contractInput('animal','height_cm','Height (cm)',contractValue(data,'animal','height_cm'),'number',locked,'step="0.01" min="0"') + '</div>' + contractPhotoEditor((data.animal||{}).photos));
  html += contractSection('Travel Details', '<label style="display:block;margin:.5rem 0;color:var(--text-muted);">Departure</label><div class="form-row" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + contractInput('travel','departure_country','Country',contractValue(data,'travel','departure_country'),'text',locked) + contractInput('travel','departure_state','State / Province',contractValue(data,'travel','departure_state'),'text',locked) + contractInput('travel','departure_city','City / Airport',contractValue(data,'travel','departure_city'),'text',locked) + '</div><label style="display:block;margin:.5rem 0;color:var(--text-muted);">Arrival</label><div class="form-row" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + contractInput('travel','arrival_country','Country',contractValue(data,'travel','arrival_country'),'text',locked) + contractInput('travel','arrival_state','State / Province',contractValue(data,'travel','arrival_state'),'text',locked) + contractInput('travel','arrival_city','City / Airport',contractValue(data,'travel','arrival_city'),'text',locked) + '</div><label style="display:block;margin:.5rem 0;color:var(--text-muted);">Travel Schedule</label><div class="form-row" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + contractInput('travel','travel_date','Travel Date',contractValue(data,'travel','travel_date'),'date',locked) + contractInput('travel','airline_flight','Airline / Flight',contractValue(data,'travel','airline_flight'),'text',locked) + contractInput('travel','transfer_city','Transfer City',contractValue(data,'travel','transfer_city'),'text',locked) + '</div>');
  html += contractSection('Shipment and Delivery', '<div class="form-row">' + contractTextArea('shipment','pickup_name_address_phone','Pickup Name / Address / Phone',contractValue(data,'shipment','pickup_name_address_phone'),locked) + contractTextArea('shipment','consignee_name_address_phone','Consignee Name / Address / Phone',contractValue(data,'shipment','consignee_name_address_phone'),locked) + contractInput('shipment','arrival_date','Arrival Date',contractValue(data,'shipment','arrival_date'),'date',locked) + '</div>');
  html += contractSection('Service Quotation', '<div class="form-row">' + contractSelect('quotation','shipping_method','Shipping Method',contractValue(data,'quotation','shipping_method'),shippingMethods,locked) + '</div>' + quoteRows.map(function(row) { var field=row[0], label=row[1], details=contractValue(data,'quotation',field + '_details'), amount=contractValue(data,'quotation',field); return '<div class="form-row" style="grid-template-columns:2fr 1fr;">' + contractInput('quotation',field + '_details',label + ' Details',details,'text',locked) + contractInput('quotation',field,label + ' Amount',amount,'number',locked,'step="0.01" min="0" oninput="calculateAdminContractTotals()"') + '</div>'; }).join('') + '<div class="form-row"><div class="form-group full"><label>Total Cost</label><input id="fContractTotal" class="field-input contract-input" data-group="quotation" data-field="total_cost" value="' + escHtml(contractValue(data,'quotation','total_cost')) + '" readonly></div></div>');
  html += contractSection('Payment', '<div class="form-row">' + contractSelect('payment','payment_method','Payment Method',contractValue(data,'payment','payment_method'),paymentMethods,locked) + contractInput('payment','deposit_amount','Deposit Amount',contractValue(data,'payment','deposit_amount'),'number',locked,'step="0.01" min="0" oninput="calculateAdminContractTotals()"') + contractInput('payment','deposit_due','Deposit Due Date',contractValue(data,'payment','deposit_due'),'date',locked) + '<div class="form-group"><label>Remaining Balance</label><input id="fContractBalance" class="field-input contract-input" data-group="payment" data-field="balance_amount" value="' + escHtml(contractValue(data,'payment','balance_amount')) + '" readonly></div>' + contractInput('payment','balance_due','Balance Due Date',contractValue(data,'payment','balance_due'),'date',locked) + contractInput('payment','transfer_fee','Transfer Fee, if applicable',contractValue(data,'payment','transfer_fee'),'number',locked,'step="0.01" min="0"') + '</div>');
  html += contractSection('Carrier Details', '<div class="form-row">' + ['representative_name','office_address','email','website','office_phone','cell_phone'].map(function(field) { var labels={representative_name:'Representative Name',office_address:'Office Address',email:'Email',website:'Website',office_phone:'Office Phone',cell_phone:'Cell Phone'}; return contractInput('carrier',field,labels[field],contractValue(data,'carrier',field),field === 'email' ? 'email' : 'text',locked); }).join('') + '</div>');
  if (locked) html += '<div class="form-actions"><button class="btn-outline" onclick="closeModal()">Close</button></div>';
  else html += '<div class="form-actions"><button class="btn-outline" onclick="closeModal()">Cancel</button><button class="btn-primary-sm" onclick="saveContract(false)">Save Draft</button><button class="btn-success" onclick="saveContract(true)">Save & Issue</button></div>';
  return html;
}
async function newContract() { openModal('New Contract', contractEditorHtml()); calculateAdminContractTotals(); await populateContractQuotes(); }
async function editContract(id) { var c=state.contracts.find(function(x){return x.id===id;}); if(!c)return; openModal((c.status==='signed'?'Signed':'Edit')+' Contract',contractEditorHtml(c)); calculateAdminContractTotals(); await populateContractQuotes(c.quote_request_id); }
async function populateContractQuotes(selected) { try { var d=await (await fetch('/api/admin/quotes',creds)).json(); var s=document.getElementById('fContractQuote'); (d.quotes||[]).forEach(function(q){var o=document.createElement('option');o.value=q.id;o.textContent='#'+q.id+' — '+q.contact_name+' ('+q.email+')';o.selected=String(q.id)===String(selected||'');s.appendChild(o);}); } catch(e){console.error(e);} }
async function importQuoteToContract(id) { if(!id)return; var r=await fetch('/api/admin/contracts/quotes/'+id,creds),d=await r.json();if(!r.ok){showToast(d.error||'Could not import quote','error');return;} document.getElementById('modalBody').innerHTML=contractEditorHtml({contract_data:d.contract_data,quote_request_id:id,status:'draft',id:document.getElementById('fContractId').value}); calculateAdminContractTotals(); await populateContractQuotes(id); }
function collectContractData() { var d=emptyContract(); document.querySelectorAll('.contract-input').forEach(function(el){d[el.dataset.group][el.dataset.field]=el.value;}); d.animal.photos=Array.from(document.querySelectorAll('#contractPhotoList [data-photo]')).map(function(el){return el.dataset.photo;}); return d; }
async function uploadContractPhotos(input) { var files=Array.from(input.files||[]), existing=document.querySelectorAll('#contractPhotoList [data-photo]').length, contractId=document.getElementById('fContractId').value; if(!files.length)return; if(files.length+existing>5){showToast('A contract can have up to five pet photos','error');input.value='';return;} var form=new FormData();files.forEach(function(file){form.append('photos',file);});if(contractId)form.append('contract_id',contractId); try { var r=await fetch('/api/admin/contract-photos',{...creds,method:'POST',body:form}),d=await r.json();if(!r.ok)throw new Error(d.error);var list=document.getElementById('contractPhotoList');(d.photos||[]).forEach(function(photo){var index=list.querySelectorAll('[data-photo]').length;list.insertAdjacentHTML('beforeend','<div data-photo="'+escHtml(photo)+'" style="position:relative;"><img src="'+escHtml(photo)+'" alt="Pet photo" style="width:110px;height:82px;object-fit:cover;border:1px solid var(--border);"><button type="button" class="btn-danger" onclick="removeContractPhoto('+index+')" style="position:absolute;top:3px;right:3px;padding:.2rem .35rem;">&times;</button></div>');});input.value='';} catch(e){showToast(e.message||'Could not upload pet photos','error');} }
function removeContractPhoto(index) { var photos=document.querySelectorAll('#contractPhotoList [data-photo]');if(photos[index])photos[index].remove(); }
function calculateAdminContractTotals() { var total=quoteAmountFields.reduce(function(sum,field) { var input=document.querySelector('[data-group="quotation"][data-field="'+field+'"]'); return sum + (parseFloat(input && input.value) || 0); },0); var depositInput=document.querySelector('[data-group="payment"][data-field="deposit_amount"]'); var balance=Math.max(0,total-(parseFloat(depositInput && depositInput.value)||0)); var totalInput=document.getElementById('fContractTotal'); var balanceInput=document.getElementById('fContractBalance'); if(totalInput)totalInput.value=total.toFixed(2); if(balanceInput)balanceInput.value=balance.toFixed(2); }
async function saveContract(issue) { var id=document.getElementById('fContractId').value, payload={contract_data:collectContractData(),quote_request_id:document.getElementById('fContractQuote').value||null}; var url=id?'/api/admin/contracts/'+id:'/api/admin/contracts',method=id?'PUT':'POST'; try { var r=await fetch(url,{...creds,method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error); var contractId=id||d.id;if(issue){r=await fetch('/api/admin/contracts/'+contractId+'/issue',{...creds,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});d=await r.json();if(!r.ok)throw new Error(d.error);showToast('Contract issued: '+(id?'':' '+d.contract_number),'success');}else showToast('Contract draft saved','success');closeModal();loadContracts(); } catch(e){showToast(e.message||'Could not save contract','error');} }
async function issueContract(id) { var c=state.contracts.find(function(x){return x.id===id;});if(!c)return; openModal('Issue Contract',contractEditorHtml(c)); calculateAdminContractTotals(); await populateContractQuotes(c.quote_request_id); }
function copyContractLink(number) { var link=window.location.origin+'/contract'; navigator.clipboard.writeText(link); showToast('Client link copied. Give the client contract number '+number,'success'); }

// ── PetConnect ─────────────────────────────────────────────────────────────
async function loadPetConnect() {
  try {
    var results = await Promise.all(['members','pets','alerts','partners','partner-types'].map(function(name) { return fetch('/api/admin/petconnect/' + name, creds).then(function(r) { return r.json(); }); }));
    state.petconnect.members = results[0].members || []; state.petconnect.pets = results[1].pets || []; state.petconnect.alerts = results[2].alerts || []; state.petconnect.partners = results[3].partners || []; state.petconnect.types = results[4].types || [];
    renderPetConnect();
  } catch (err) { console.error(err); showToast('Could not load PetConnect', 'error'); }
}
function pcTable(id, headers, rows) { document.getElementById(id).innerHTML = rows.length ? '<table class="data-table"><thead><tr>' + headers.map(function(h){return '<th>'+h+'</th>';}).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>' : '<div class="empty-state">No records yet.</div>'; }
function renderPetConnect() {
  var pc=state.petconnect;
  pcTable('petconnectMembers',['Member','Location','Verified','Email alerts',''],pc.members.map(function(m){return '<tr><td><strong>'+escHtml(m.first_name+' '+m.last_name)+'</strong><br>'+escHtml(m.email)+'</td><td>'+escHtml([m.city,m.state,m.country].filter(Boolean).join(', ')||'—')+'</td><td>'+ (m.is_verified?'Yes':'No')+'</td><td><label><input type="checkbox" '+(m.email_alerts?'checked':'')+' onchange="savePetConnectMember('+m.id+',this.checked,'+(m.email_alert_radius||100)+')"> '+escHtml(m.email_alert_radius||100)+' mi</label></td><td></td></tr>'; }));
  pcTable('petconnectPets',['Pet','Microchip','Owner','Missing'],pc.pets.map(function(p){return '<tr><td><strong>'+escHtml(p.pet_name)+'</strong><br>'+escHtml([p.species,p.breed,p.color].filter(Boolean).join(' · '))+'</td><td>'+escHtml(p.microchip_number||'—')+'</td><td>'+escHtml(p.member_name)+'<br>'+escHtml(p.member_email)+'</td><td>'+(p.is_missing?'Yes':'No')+'</td></tr>'; }));
  pcTable('petconnectAlerts',['Pet','Type / Location','Status','Actions'],pc.alerts.map(function(a){return '<tr><td><strong>'+escHtml(a.pet_name)+'</strong><br>'+escHtml(a.member_email)+'</td><td>'+escHtml(a.alert_type)+'<br>'+escHtml([a.last_seen_city,a.last_seen_state].filter(Boolean).join(', '))+'</td><td><select onchange="savePetConnectAlert('+a.id+',this.value)"><option '+(a.status==='active'?'selected':'')+'>active</option><option '+(a.status==='found'?'selected':'')+'>found</option><option '+(a.status==='closed'?'selected':'')+'>closed</option></select></td><td><button class="btn-danger" onclick="deletePetConnectAlert('+a.id+')"><i class="fas fa-trash"></i></button></td></tr>'; }));
  pcTable('petconnectPartners',['Organization','Type','Location','Active','Actions'],pc.partners.map(function(p){return '<tr><td><strong>'+escHtml(p.company_name)+'</strong><br>'+escHtml(p.email)+'</td><td>'+escHtml(p.type_label)+'</td><td>'+escHtml([p.city,p.state,p.country].filter(Boolean).join(', '))+'</td><td><input type="checkbox" '+(p.is_active?'checked':'')+' onchange="togglePetConnectPartner('+p.id+',this.checked)"></td><td><button class="btn-danger" onclick="deletePetConnectPartner('+p.id+')"><i class="fas fa-trash"></i></button></td></tr>'; }));
}
async function savePetConnectMember(id, alerts, radius) { await fetch('/api/admin/petconnect/members/'+id,{...creds,method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({email_alerts:alerts,email_alert_radius:radius})}); showToast('Member preferences saved','success'); }
async function savePetConnectAlert(id,status) { await fetch('/api/admin/petconnect/alerts/'+id,{...creds,method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:status})}); showToast('Alert updated','success'); loadPetConnect(); }
async function deletePetConnectAlert(id) { if(!confirm('Delete this alert?'))return; await fetch('/api/admin/petconnect/alerts/'+id,{...creds,method:'DELETE'}); loadPetConnect(); }
async function togglePetConnectPartner(id,active) { var partner=state.petconnect.partners.find(function(p){return p.id===id;}); if(!partner)return; await fetch('/api/admin/petconnect/partners/'+id,{...creds,method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...partner,is_active:active})}); showToast('Partner updated','success'); }
async function deletePetConnectPartner(id) { if(!confirm('Delete this partner?'))return; await fetch('/api/admin/petconnect/partners/'+id,{...creds,method:'DELETE'}); loadPetConnect(); }
function newPetConnectPartner() { var types=state.petconnect.types||[]; var options=types.map(function(t){return '<option value="'+t.id+'">'+escHtml(t.label)+'</option>';}).join(''); openModal('Add PetConnect Partner','<div class="form-row"><div class="form-group"><label>Type</label><select id="pcType" class="field-input">'+options+'</select></div><div class="form-group"><label>Organization</label><input id="pcCompany" class="field-input"></div><div class="form-group"><label>Contact</label><input id="pcContact" class="field-input"></div><div class="form-group"><label>Email</label><input id="pcEmail" type="email" class="field-input"></div></div><div class="form-row"><div class="form-group"><label>Phone</label><input id="pcPhone" class="field-input"></div><div class="form-group"><label>City</label><input id="pcCity" class="field-input"></div><div class="form-group"><label>State</label><input id="pcState" class="field-input"></div><div class="form-group"><label>Country</label><select id="pcCountry" class="field-input"><option value="US">United States</option><option value="CA">Canada</option></select></div></div><div class="form-actions"><button class="btn-outline" onclick="closeModal()">Cancel</button><button class="btn-primary-sm" onclick="savePetConnectPartner()">Save Partner</button></div>'); }
async function savePetConnectPartner() { var payload={partner_type_id:document.getElementById('pcType').value,company_name:document.getElementById('pcCompany').value,contact_name:document.getElementById('pcContact').value,email:document.getElementById('pcEmail').value,phone:document.getElementById('pcPhone').value,city:document.getElementById('pcCity').value,state:document.getElementById('pcState').value,country:document.getElementById('pcCountry').value}; var r=await fetch('/api/admin/petconnect/partners',{...creds,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});var d=await r.json();if(!r.ok){showToast(d.error||'Could not add partner','error');return;}closeModal();loadPetConnect();showToast('Partner added','success');}

// ── Relocation Portal ──────────────────────────────────────────────────────
var portalContractId = null;
var portalStatusSteps = ['Consulting','Contract Signed','Pick-Up','Exam/Vaccination','Documentation','On Route','In-Transfer','Home Delivery'];
var portalDocumentCategories = ['Rabies Vaccination','Other Vaccination','Exam Reports','Other Reports','Travel Documents','Other Documents','Client Identifications'];

function portalSelect(id, options, value) { var html='<select id="'+id+'" class="field-input">'; options.forEach(function(option){html+='<option value="'+escHtml(option)+'"'+(option===value?' selected':'')+'>'+escHtml(option)+'</option>';}); return html+'</select>'; }
function portalDateTime(value) { if (!value) return ''; var date=new Date(value); if(Number.isNaN(date.getTime()))return ''; var offset=date.getTimezoneOffset()*60000; return new Date(date.getTime()-offset).toISOString().slice(0,16); }
function portalLine(label, value) { return '<div style="padding:.6rem 0;border-bottom:1px solid var(--border);"><strong>'+escHtml(label)+'</strong><br><span style="color:var(--text-muted);white-space:pre-wrap;">'+escHtml(value||'No client-visible note')+'</span></div>'; }

async function managePortal(contractId) {
  portalContractId = contractId;
  openModal('Relocation Portal', '<div id="portalManager"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i>Loading portal details...</div></div>');
  await loadPortalManager();
}

async function loadPortalManager() {
  if (!portalContractId) return;
  var target=document.getElementById('portalManager'); if(!target)return;
  try {
    var response=await fetch('/api/admin/contracts/'+portalContractId+'/portal',creds), data=await response.json();
    if(!response.ok)throw new Error(data.error||'Could not load portal data.');
    renderPortalManager(data);
  } catch(error) { target.innerHTML='<div class="empty-state">'+escHtml(error.message||'Could not load portal data.')+'</div>'; }
}

function renderPortalManager(data) {
  var target=document.getElementById('portalManager'); if(!target)return;
  var account=data.account||null;
  var contract=state.contracts.find(function(item){ return item.id===portalContractId; }) || {};
  var defaultEmail=((contract.contract_data||{}).client||{}).email || '';
  var html='<div style="display:grid;gap:1.5rem;">';
  html+='<section><h3 style="margin:0 0 .75rem;color:var(--cream);">Client Access</h3>';
  if(account) html+='<p style="color:var(--text-muted);">Linked account: <strong style="color:var(--cream);">'+escHtml(account.email)+'</strong></p><div class="form-row"><div class="form-group"><label>New temporary password</label><input id="portalResetPassword" class="field-input" type="password" minlength="8"></div><div class="form-group" style="align-self:end;"><button class="btn-outline" onclick="resetPortalPassword()"><i class="fas fa-key"></i> Reset Password</button></div></div>';
  else html+='<div class="form-row"><div class="form-group"><label>Client email</label><input id="portalClientEmail" class="field-input" type="email" value="'+escHtml(defaultEmail)+'"></div><div class="form-group"><label>Initial password</label><input id="portalInitialPassword" class="field-input" type="password" minlength="8"></div></div><button class="btn-primary-sm" onclick="savePortalAccount()"><i class="fas fa-user-plus"></i> Create & Send Access</button>';
  html+='</section>';
  html+='<section><h3 style="margin:0 0 .75rem;color:var(--cream);">Progress Update</h3><div class="form-row"><div class="form-group"><label>Status</label>'+portalSelect('portalStatusStep',portalStatusSteps,'Consulting')+'</div><div class="form-group"><label>Date & time</label><input id="portalUpdateDate" class="field-input" type="datetime-local" value="'+portalDateTime(new Date())+'"></div></div><div class="form-group full"><label>Client-visible update</label><textarea id="portalClientNote" class="field-textarea" rows="2"></textarea></div><div class="form-group full"><label>Internal note</label><textarea id="portalInternalNote" class="field-textarea" rows="2"></textarea></div><button class="btn-primary-sm" onclick="addRelocationUpdate()"><i class="fas fa-plus"></i> Add Update</button><div style="margin-top:.75rem;">'+(data.updates.length?data.updates.map(function(item){return portalLine(fmtDate(item.occurred_at)+' - '+item.status_step,item.client_note)+'<button class="btn-danger" style="margin:.4rem 0 .5rem;" onclick="deletePortalRecord(\'relocation-updates\','+item.id+')"><i class="fas fa-trash"></i></button>';}).join(''):'<span style="color:var(--text-muted);">No progress updates yet.</span>')+'</div></section>';
  html+='<section><h3 style="margin:0 0 .75rem;color:var(--cream);">Upcoming Event</h3><div class="form-row"><div class="form-group"><label>Title</label><input id="portalEventTitle" class="field-input"></div><div class="form-group"><label>Type</label><input id="portalEventType" class="field-input" value="Event"></div><div class="form-group"><label>Date & time</label><input id="portalEventDate" class="field-input" type="datetime-local"></div><div class="form-group"><label>Location</label><input id="portalEventLocation" class="field-input"></div></div><div class="form-group full"><label>Description</label><textarea id="portalEventDescription" class="field-textarea" rows="2"></textarea></div><button class="btn-primary-sm" onclick="addRelocationEvent()"><i class="fas fa-calendar-plus"></i> Add Event</button><div style="margin-top:.75rem;">'+(data.events.length?data.events.map(function(item){return portalLine(fmtDate(item.starts_at)+' - '+item.title,[item.location,item.description].filter(Boolean).join('\n'))+'<button class="btn-danger" style="margin:.4rem 0 .5rem;" onclick="deletePortalRecord(\'events\','+item.id+')"><i class="fas fa-trash"></i></button>';}).join(''):'<span style="color:var(--text-muted);">No events yet.</span>')+'</div></section>';
  html+='<section><h3 style="margin:0 0 .75rem;color:var(--cream);">Document</h3><div class="form-row"><div class="form-group"><label>Category</label>'+portalSelect('portalDocumentCategory',portalDocumentCategories,'Rabies Vaccination')+'</div><div class="form-group"><label>Document label</label><input id="portalDocumentLabel" class="field-input"></div><div class="form-group"><label>Issued on</label><input id="portalIssuedOn" class="field-input" type="date"></div><div class="form-group"><label>Expires on</label><input id="portalExpiresOn" class="field-input" type="date"></div></div><div class="form-group full"><label>File (PDF, JPG, PNG, or WebP)</label><input id="portalDocumentFile" class="field-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></div><button class="btn-primary-sm" onclick="addRelocationDocument()"><i class="fas fa-file-upload"></i> Add Document</button><div style="margin-top:.75rem;">'+(data.documents.length?data.documents.map(function(item){return portalLine(item.category+' - '+item.label,'Expires: '+(item.expires_on||'Not set'))+(item.file_url?' <a href="'+escHtml(item.file_url)+'" target="_blank" rel="noopener">View file</a>':'')+' <button class="btn-danger" style="margin:.4rem 0 .5rem;" onclick="deletePortalRecord(\'documents\','+item.id+')"><i class="fas fa-trash"></i></button>';}).join(''):'<span style="color:var(--text-muted);">No documents yet.</span>')+'</div></section>';
  html+='<section><h3 style="margin:0 0 .75rem;color:var(--cream);">Boarding Video Update</h3><div class="form-row"><div class="form-group"><label>Title</label><input id="portalBoardingTitle" class="field-input"></div><div class="form-group"><label>YouTube URL</label><input id="portalYouTubeUrl" class="field-input" type="url" placeholder="https://youtu.be/... "></div><div class="form-group"><label>Publish date & time</label><input id="portalBoardingDate" class="field-input" type="datetime-local" value="'+portalDateTime(new Date())+'"></div></div><div class="form-group full"><label>Client note</label><textarea id="portalBoardingNote" class="field-textarea" rows="2"></textarea></div><button class="btn-primary-sm" onclick="addBoardingUpdate()"><i class="fas fa-video"></i> Add Video</button><div style="margin-top:.75rem;">'+(data.boarding.length?data.boarding.map(function(item){return portalLine(fmtDate(item.published_at)+' - '+item.title,item.client_note)+'<button class="btn-danger" style="margin:.4rem 0 .5rem;" onclick="deletePortalRecord(\'boarding-updates\','+item.id+')"><i class="fas fa-trash"></i></button>';}).join(''):'<span style="color:var(--text-muted);">No boarding videos yet.</span>')+'</div></section></div>';
  target.innerHTML=html;
}

async function portalJson(url, method, payload) { var response=await fetch(url,{...creds,method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save portal data.');return data; }
async function savePortalAccount(){try{var data=await portalJson('/api/admin/contracts/'+portalContractId+'/portal-account','POST',{email:document.getElementById('portalClientEmail').value,initial_password:document.getElementById('portalInitialPassword').value});showToast(data.email_sent?'Portal access email sent':'Portal account created; email was not sent','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function resetPortalPassword(){try{var data=await portalJson('/api/admin/contracts/'+portalContractId+'/portal-password-reset','POST',{initial_password:document.getElementById('portalResetPassword').value});showToast(data.email_sent?'Temporary password emailed':'Password reset; email was not sent','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function addRelocationUpdate(){try{await portalJson('/api/admin/contracts/'+portalContractId+'/relocation-updates','POST',{status_step:document.getElementById('portalStatusStep').value,occurred_at:document.getElementById('portalUpdateDate').value,client_note:document.getElementById('portalClientNote').value,internal_note:document.getElementById('portalInternalNote').value});showToast('Progress update added','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function addRelocationEvent(){try{await portalJson('/api/admin/contracts/'+portalContractId+'/events','POST',{title:document.getElementById('portalEventTitle').value,event_type:document.getElementById('portalEventType').value,starts_at:document.getElementById('portalEventDate').value,location:document.getElementById('portalEventLocation').value,description:document.getElementById('portalEventDescription').value});showToast('Event added','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function addRelocationDocument(){try{var form=new FormData();form.append('category',document.getElementById('portalDocumentCategory').value);form.append('label',document.getElementById('portalDocumentLabel').value);form.append('issued_on',document.getElementById('portalIssuedOn').value);form.append('expires_on',document.getElementById('portalExpiresOn').value);var file=document.getElementById('portalDocumentFile').files[0];if(file)form.append('file',file);var response=await fetch('/api/admin/contracts/'+portalContractId+'/documents',{...creds,method:'POST',body:form}),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not add document.');showToast('Document added','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function addBoardingUpdate(){try{await portalJson('/api/admin/contracts/'+portalContractId+'/boarding-updates','POST',{title:document.getElementById('portalBoardingTitle').value,youtube_url:document.getElementById('portalYouTubeUrl').value,published_at:document.getElementById('portalBoardingDate').value,client_note:document.getElementById('portalBoardingNote').value});showToast('Boarding video added','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}
async function deletePortalRecord(type,id){if(!confirm('Delete this portal record?'))return;try{var response=await fetch('/api/admin/'+type+'/'+id,{...creds,method:'DELETE'}),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not delete record.');showToast('Portal record deleted','success');loadPortalManager();}catch(error){showToast(error.message,'error');}}

// ── Landing Content ─────────────────────────────────────────────────────────
async function loadLandingContent() {
  try {
    var d = await (await fetch('/api/admin/landing-content', creds)).json();
    state.content = d.content || {};
    renderLandingContent();
  } catch (err) { console.error(err); }
}

function renderLandingContent() {
  var c = state.content;
  var el = document.getElementById('landingContentEditor');

  var html = '';

  // Hero
  var h = c.hero || {};
  html += sectionTpl('hero', 'Hero Section', [
    fieldTpl('text', 'eyebrow', 'Eyebrow Text', h.eyebrow || '', 'hero'),
    fieldTpl('textarea', 'headline', 'Headline (use Enter for line breaks)', h.headline || '', 'hero'),
    fieldTpl('textarea', 'subheading', 'Subheading', h.subheading || '', 'hero'),
    fieldTpl('text', 'cta_text', 'CTA Button Text', h.cta_text || '', 'hero')
  ]);

  // Stats
  var stats = c.stats || [];
  html += sectionTpl('stats', 'Stats Bar', [
    '<div id="stats-items"></div>',
    '<button type="button" class="btn-outline" onclick="addStat()" style="margin-top:0.75rem;"><i class="fas fa-plus"></i> Add Stat</button>'
  ].join(''));

  // Services
  var svcs = c.services || [];
  html += sectionTpl('services', 'Services Section', [
    '<div id="services-items"></div>',
    '<button type="button" class="btn-outline" onclick="addService()" style="margin-top:0.75rem;"><i class="fas fa-plus"></i> Add Service</button>'
  ].join(''));

  // About
  var ab = c.about || {};
  html += sectionTpl('about', 'About Statement', [
    fieldTpl('textarea', 'text', 'About Text', ab.text || '', 'about')
  ].join(''));

  // Offices
  var offs = c.offices || [];
  html += sectionTpl('offices', 'Office Locations', [
    '<div id="offices-items"></div>',
    '<button type="button" class="btn-outline" onclick="addOffice()" style="margin-top:0.75rem;"><i class="fas fa-plus"></i> Add Office</button>'
  ].join(''));

  // CTA
  var cta = c.cta || {};
  html += sectionTpl('cta', 'CTA Section', [
    fieldTpl('text', 'headline', 'Headline', cta.headline || '', 'cta'),
    fieldTpl('textarea', 'sub', 'Sub-text', cta.sub || '', 'cta'),
    fieldTpl('text', 'button_text', 'Button Text', cta.button_text || '', 'cta')
  ].join(''));

  // Footer
  var ft = c.footer || {};
  html += sectionTpl('footer', 'Footer', [
    fieldTpl('text', 'email', 'Email', ft.email || '', 'footer'),
    fieldTpl('text', 'phone', 'Phone', ft.phone || '', 'footer'),
    fieldTpl('text', 'hours', 'Hours', ft.hours || '', 'footer')
  ].join(''));

  el.innerHTML = html;

  // Render nested items
  renderStatsItems(stats);
  renderServicesItems(svcs);
  renderOfficesItems(offs);
}

function sectionTpl(key, title, body) {
  return '<div class="content-section" id="section-' + key + '">' +
    '<div class="content-section-header" onclick="toggleSection(\'' + key + '\')">' +
      '<h3>' + title + '</h3><i class="fas fa-chevron-down chevron"></i>' +
    '</div>' +
    '<div class="content-section-body" id="body-' + key + '">' + body + '</div>' +
  '</div>';
}

function fieldTpl(type, name, label, value, section) {
  if (type === 'textarea') {
    return '<div class="form-group full">' +
      '<label class="field-label">' + label + '</label>' +
      '<textarea class="field-textarea" data-section="' + section + '" data-key="' + name + '" rows="3">' + escHtml(value) + '</textarea>' +
    '</div>';
  }
  return '<div class="form-group">' +
    '<label class="field-label">' + label + '</label>' +
    '<input type="text" class="field-input" data-section="' + section + '" data-key="' + name + '" value="' + escHtml(value) + '">' +
  '</div>';
}

function toggleSection(key) {
  var el = document.getElementById('section-' + key);
  el.classList.toggle('collapsed');
}

function renderStatsItems(stats) {
  var el = document.getElementById('stats-items');
  if (!el) return;
  if (!stats.length) stats = [{number:'', label:''}];
  var html = '';
  stats.forEach(function(s, i) {
    html += '<div style="display:grid;grid-template-columns:1fr 2fr;gap:0.75rem;margin-bottom:0.75rem;align-items:start;">' +
      '<input type="text" class="field-input" data-section="stats" data-key="' + i + '_number" placeholder="Number (e.g. 15+)" value="' + escHtml(s.number || '') + '">' +
      '<input type="text" class="field-input" data-section="stats" data-key="' + i + '_label" placeholder="Label" value="' + escHtml(s.label || '') + '">' +
    '</div>';
  });
  el.innerHTML = html;
}

function addStat() {
  var stats = [];
  Array.from(document.querySelectorAll('.field-input[data-section="stats"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = parseInt(m[1]);
    var prop = m[2];
    if (!stats[idx]) stats[idx] = {};
    stats[idx][prop] = inp.value;
  });
  stats.push({number:'', label:''});
  renderStatsItems(stats);
}

function renderServicesItems(svcs) {
  var el = document.getElementById('services-items');
  if (!el) return;
  if (!svcs.length) svcs = [{icon:'fa-plane', title:'', desc:''}];
  var icons = ['fa-plane','fa-passport','fa-box-open','fa-shield-alt','fa-heart','fa-clock','fa-headset','fa-file-medical'];
  var html = '';
  svcs.forEach(function(s, i) {
    html += '<div style="background:rgba(247,245,240,0.04);border:1px solid var(--border);padding:1rem;margin-bottom:0.75rem;border-radius:2px;">' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;margin-bottom:0.75rem;">' +
        '<select class="field-input" data-section="services" data-key="' + i + '_icon" style="width:120px;">';
    icons.forEach(function(ic) {
      html += '<option value="' + ic + '"' + (s.icon === ic ? ' selected' : '') + '>' + ic.replace('fa-','') + '</option>';
    });
    html += '</select>' +
        '<input type="text" class="field-input" data-section="services" data-key="' + i + '_title" placeholder="Service Title" value="' + escHtml(s.title || '') + '">' +
      '</div>' +
      '<textarea class="field-input" data-section="services" data-key="' + i + '_desc" placeholder="Service Description" rows="2">' + escHtml(s.desc || '') + '</textarea>' +
    '</div>';
  });
  el.innerHTML = html;
}

function addService() {
  var svcs = [];
  Array.from(document.querySelectorAll('.field-input[data-section="services"], textarea[data-section="services"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = parseInt(m[1]);
    var prop = m[2];
    if (!svcs[idx]) svcs[idx] = {icon:'fa-plane', title:'', desc:''};
    svcs[idx][prop] = inp.value;
  });
  svcs.push({icon:'fa-plane', title:'', desc:''});
  renderServicesItems(svcs);
}

function renderOfficesItems(offs) {
  var el = document.getElementById('offices-items');
  if (!el) return;
  if (!offs.length) offs = [{city:'', country:'', type:''}];
  var html = '';
  offs.forEach(function(o, i) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:0.75rem;margin-bottom:0.75rem;align-items:end;">' +
      '<input type="text" class="field-input" data-section="offices" data-key="' + i + '_city" placeholder="City" value="' + escHtml(o.city || '') + '">' +
      '<input type="text" class="field-input" data-section="offices" data-key="' + i + '_country" placeholder="Country" value="' + escHtml(o.country || '') + '">' +
      '<input type="text" class="field-input" data-section="offices" data-key="' + i + '_type" placeholder="Type (e.g. HQ)" value="' + escHtml(o.type || '') + '">' +
    '</div>';
  });
  el.innerHTML = html;
}

function addOffice() {
  var offs = [];
  Array.from(document.querySelectorAll('.field-input[data-section="offices"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = parseInt(m[1]);
    var prop = m[2];
    if (!offs[idx]) offs[idx] = {};
    offs[idx][prop] = inp.value;
  });
  offs.push({city:'', country:'', type:''});
  renderOfficesItems(offs);
}

async function saveLandingContent() {
  var c = {};
  // Gather simple fields (hero, about, cta, footer) — skip stats/services/offices, they use indexed data-key
  document.querySelectorAll('.field-input[data-key], .field-textarea[data-key]').forEach(function(inp) {
    var sec = inp.getAttribute('data-section');
    if (sec === 'stats' || sec === 'services' || sec === 'offices') return;
    var key = inp.getAttribute('data-key');
    if (!c[sec]) c[sec] = {};
    c[sec][key] = inp.value;
  });

  // Gather stats: group by index from data-key like "0_number", "1_label"
  var statsMap = {};
  Array.from(document.querySelectorAll('.field-input[data-section="stats"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = m[1], prop = m[2];
    if (!statsMap[idx]) statsMap[idx] = {};
    statsMap[idx][prop] = inp.value;
  });
  var stats = Object.values(statsMap);
  if (stats.length && stats.some(function(s) { return s.number; })) {
    c.stats = stats;
  }

  // Gather services
  var svcsMap = {};
  Array.from(document.querySelectorAll('.field-input[data-section="services"], textarea[data-section="services"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = m[1], prop = m[2];
    if (!svcsMap[idx]) svcsMap[idx] = {icon:'fa-plane', title:'', desc:''};
    svcsMap[idx][prop] = inp.value;
  });
  var svcs = Object.values(svcsMap);
  if (svcs.length && svcs.some(function(s) { return s.title; })) {
    c.services = svcs;
  }

  // Gather offices
  var offsMap = {};
  Array.from(document.querySelectorAll('.field-input[data-section="offices"]')).forEach(function(inp) {
    var m = inp.getAttribute('data-key').match(/^(\d+)_(.+)/);
    if (!m) return;
    var idx = m[1], prop = m[2];
    if (!offsMap[idx]) offsMap[idx] = {};
    offsMap[idx][prop] = inp.value;
  });
  var offs = Object.values(offsMap);
  if (offs.length && offs.some(function(o) { return o.city; })) {
    c.offices = offs;
  }

  try {
    for (var sec in c) {
      var r = await fetch('/api/admin/landing-content/' + sec, { ...creds,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c[sec])
      });
      if (!r.ok) {
        var result = await r.json();
        throw new Error('Failed to save ' + sec + ': ' + (result.error || r.status));
      }
    }
    state.content = { ...state.content, ...c };
    showToast('All changes saved', 'success');
    renderLandingContent(); // Re-render to reflect saved data
  } catch (err) { console.error(err); showToast('Save failed: ' + err.message, 'error'); }
}

// ── Countries ───────────────────────────────────────────────────────────────
async function loadCountries() {
  try {
    var d = await (await fetch('/api/countries')).json();
    state.countries = d.countries || [];
    renderCountries();
  } catch { console.error(err); }
}

function renderCountries() {
  var countries = state.countries;
  var el = document.getElementById('countriesTable');
  if (!countries.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-globe"></i>No countries yet — add one above</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Country</th><th>Code</th><th>Pet Types</th><th>Quarantine</th><th>Prep Time</th><th></th></tr></thead><tbody>';
  countries.forEach(function(c) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(c.country_name) + '</strong></td>';
    html += '<td>' + escHtml(c.country_code || '—') + '</td>';
    html += '<td>' + escHtml(c.pet_types || '—') + '</td>';
    html += '<td>' + (c.quarantine_days > 0 ? c.quarantine_days + ' days' : 'None') + '</td>';
    html += '<td>' + escHtml(c.preparation_time || '—') + '</td>';
    html += '<td class="col-actions">';
    html += '<button class="btn-outline" onclick="editCountry(' + c.id + ')"><i class="fas fa-edit"></i></button> ';
    html += '<button class="btn-danger" onclick="deleteCountry(' + c.id + ')"><i class="fas fa-trash"></i></button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function addCountry() {
  openModal('Add Country', countryFormHtml());
}

function editCountry(id) {
  var c = state.countries.find(function(x) { return x.id === id; });
  if (!c) return;
  openModal('Edit Country — ' + c.country_name, countryFormHtml(c));
}

function countryFormHtml(c) {
  c = c || {};
  var html = '<input type="hidden" id="fCountryId" value="' + (c.id || '') + '">';
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Country Name *</label><input type="text" id="fCountryName" class="field-input" value="' + escHtml(c.country_name || '') + '"></div>';
  html += '<div class="form-group"><label>Country Code</label><input type="text" id="fCountryCode" class="field-input" placeholder="e.g. GB" value="' + escHtml(c.country_code || '') + '"></div>';
  html += '<div class="form-group"><label>Accepted Pets</label><input type="text" id="fPetTypes" class="field-input" placeholder="e.g. Dogs, Cats" value="' + escHtml(c.pet_types || '') + '"></div>';
  html += '<div class="form-group"><label>Quarantine Days</label><input type="number" id="fQuarantine" class="field-input" value="' + (c.quarantine_days || 0) + '"></div>';
  html += '</div>';
  html += '<div class="form-group full"><label>Microchip Requirements</label><textarea id="fMicrochip" class="field-textarea" rows="2">' + escHtml(c.microchip || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Rabies Vaccination</label><textarea id="fRabies" class="field-textarea" rows="2">' + escHtml(c.rabies_vaccination || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Health Certificate</label><textarea id="fHealth" class="field-textarea" rows="2">' + escHtml(c.health_certificate || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Import Permit</label><textarea id="fImportPermit" class="field-textarea" rows="2">' + escHtml(c.import_permit || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Additional Requirements</label><textarea id="fAdditional" class="field-textarea" rows="2">' + escHtml(c.additional_requirements || '') + '</textarea></div>';
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Preparation Time</label><input type="text" id="fPrepTime" class="field-input" placeholder="e.g. At least 4 weeks" value="' + escHtml(c.preparation_time || '') + '"></div>';
  html += '<div class="form-group"><label>Restricted Breeds</label><input type="text" id="fRestricted" class="field-input" placeholder="Comma-separated" value="' + escHtml(c.restricted_breeds || '') + '"></div>';
  html += '</div>';
  html += '<div class="form-group full"><label>Contact Info</label><input type="text" id="fContactInfo" class="field-input" value="' + escHtml(c.contact_info || '') + '"></div>';
  html += '<div class="form-actions"><button class="btn-outline" onclick="closeModal()">Cancel</button><button class="btn-primary-sm" onclick="saveCountry()">Save</button></div>';
  return html;
}

async function saveCountry() {
  var id = document.getElementById('fCountryId').value;
  var payload = {
    country_name: document.getElementById('fCountryName').value,
    country_code: document.getElementById('fCountryCode').value,
    pet_types: document.getElementById('fPetTypes').value,
    quarantine_days: parseInt(document.getElementById('fQuarantine').value) || 0,
    microchip: document.getElementById('fMicrochip').value,
    rabies_vaccination: document.getElementById('fRabies').value,
    health_certificate: document.getElementById('fHealth').value,
    import_permit: document.getElementById('fImportPermit').value,
    additional_requirements: document.getElementById('fAdditional').value,
    preparation_time: document.getElementById('fPrepTime').value,
    restricted_breeds: document.getElementById('fRestricted').value,
    contact_info: document.getElementById('fContactInfo').value
  };
  try {
    if (id) {
      await fetch('/api/admin/countries/' + id, { ...creds, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/admin/countries', { ...creds, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeModal();
    showToast('Country saved', 'success');
    loadCountries();
  } catch { showToast('Save failed', 'error'); }
}

async function deleteCountry(id) {
  if (!confirm('Delete this country?')) return;
  await fetch('/api/admin/countries/' + id, { ...creds, method: 'DELETE' });
  showToast('Deleted', 'success');
  loadCountries();
}

// ── Airlines ────────────────────────────────────────────────────────────────
async function loadAirlines() {
  try {
    var d = await (await fetch('/api/airlines')).json();
    state.airlines = d.airlines || [];
    renderAirlines();
  } catch (err) { console.error(err); }
}

function renderAirlines() {
  var airlines = state.airlines;
  var el = document.getElementById('airlinesTable');
  if (!airlines.length) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-plane"></i>No airlines yet — add one above</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Airline</th><th>Cabin</th><th>Checked</th><th>Cargo</th><th></th></tr></thead><tbody>';
  airlines.forEach(function(a) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(a.airline_name) + '</strong></td>';
    html += '<td>' + (a.carry_on ? escHtml(a.carry_on).substring(0,40) + (a.carry_on.length > 40 ? '…' : '') : '—') + '</td>';
    html += '<td>' + (a.checked_bag ? escHtml(a.checked_bag).substring(0,40) + (a.checked_bag.length > 40 ? '…' : '') : '—') + '</td>';
    html += '<td>' + (a.cargo ? escHtml(a.cargo).substring(0,40) + (a.cargo.length > 40 ? '…' : '') : '—') + '</td>';
    html += '<td class="col-actions">';
    html += '<button class="btn-outline" onclick="editAirline(' + a.id + ')"><i class="fas fa-edit"></i></button> ';
    html += '<button class="btn-danger" onclick="deleteAirline(' + a.id + ')"><i class="fas fa-trash"></i></button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function addAirline() {
  openModal('Add Airline', airlineFormHtml());
}

function editAirline(id) {
  var a = state.airlines.find(function(x) { return x.id === id; });
  if (!a) return;
  openModal('Edit Airline — ' + a.airline_name, airlineFormHtml(a));
}

function airlineFormHtml(a) {
  a = a || {};
  var html = '<input type="hidden" id="fAirlineId" value="' + (a.id || '') + '">';
  html += '<div class="form-group full"><label>Airline Name *</label><input type="text" id="fAirlineName" class="field-input" value="' + escHtml(a.airline_name || '') + '"></div>';
  html += '<div class="form-group full"><label>Cabin Policy</label><textarea id="fCarryOn" class="field-textarea" rows="2">' + escHtml(a.carry_on || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Checked Bag Policy</label><textarea id="fCheckedBag" class="field-textarea" rows="2">' + escHtml(a.checked_bag || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Cargo Policy</label><textarea id="fCargo" class="field-textarea" rows="2">' + escHtml(a.cargo || '') + '</textarea></div>';
  html += '<div class="form-row">';
  html += '<div class="form-group full"><label>Pet Fee</label><input type="text" id="fPetFee" class="field-input" value="' + escHtml(a.pet_fee || '') + '"></div>';
  html += '<div class="form-group full"><label>Size Limits</label><input type="text" id="fSizeLimits" class="field-input" value="' + escHtml(a.size_limits || '') + '"></div>';
  html += '</div>';
  html += '<div class="form-group full"><label>Breed Restrictions</label><textarea id="fBreedRestrict" class="field-textarea" rows="2">' + escHtml(a.breed_restrictions || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Booking Info</label><textarea id="fBookingInfo" class="field-textarea" rows="2">' + escHtml(a.booking_info || '') + '</textarea></div>';
  html += '<div class="form-group full"><label>Crate Requirements</label><textarea id="fCrateReq" class="field-textarea" rows="2">' + escHtml(a.crate_requirements || '') + '</textarea></div>';
  html += '<div class="form-actions"><button class="btn-outline" onclick="closeModal()">Cancel</button><button class="btn-primary-sm" onclick="saveAirline()">Save</button></div>';
  return html;
}

async function saveAirline() {
  var id = document.getElementById('fAirlineId').value;
  var payload = {
    airline_name: document.getElementById('fAirlineName').value,
    carry_on: document.getElementById('fCarryOn').value,
    checked_bag: document.getElementById('fCheckedBag').value,
    cargo: document.getElementById('fCargo').value,
    pet_fee: document.getElementById('fPetFee').value,
    size_limits: document.getElementById('fSizeLimits').value,
    breed_restrictions: document.getElementById('fBreedRestrict').value,
    booking_info: document.getElementById('fBookingInfo').value,
    crate_requirements: document.getElementById('fCrateReq').value
  };
  try {
    if (id) {
      await fetch('/api/admin/airlines/' + id, { ...creds, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/admin/airlines', { ...creds, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeModal();
    showToast('Airline saved', 'success');
    loadAirlines();
  } catch { showToast('Save failed', 'error'); }
}

async function deleteAirline(id) {
  if (!confirm('Delete this airline?')) return;
  await fetch('/api/admin/airlines/' + id, { ...creds, method: 'DELETE' });
  showToast('Deleted', 'success');
  loadAirlines();
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Logout ─────────────────────────────────────────────────────────────────
async function logout() {
  await fetch('/admin/logout', { ...creds, method: 'POST' });
  window.location.href = '/admin/login';
}

// ── Utilities ───────────────────────────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ucFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
