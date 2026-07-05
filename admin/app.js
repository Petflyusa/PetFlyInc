/* ============================================================
   Pet Fly Inc — Admin Panel SPA
   ============================================================ */

var state = {
  quotes: [],
  contacts: [],
  content: {},
  countries: [],
  airlines: []
};

var toastTimeout;

// ── Auth Check ──────────────────────────────────────────────────────────────
(async function checkAuth() {
  try {
    var r = await fetch('/admin/me');
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
  if (name === 'content') loadLandingContent();
  if (name === 'countries') loadCountries();
  if (name === 'airlines') loadAirlines();
}

// ── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    var [qr, cr] = await Promise.all([
      fetch('/api/admin/quotes').then(function(r) { return r.json(); }),
      fetch('/api/admin/contacts').then(function(r) { return r.json(); })
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
    var d = await (await fetch('/api/admin/quotes')).json();
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
    await fetch('/api/admin/quotes/' + id, {
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
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Pet Type</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_type) + '</span></div>';
  html += '<div class="form-group"><label>Breed</label><span style="font-size:0.9375rem;">' + escHtml(q.breed || '—') + '</span></div>';
  html += '<div class="form-group"><label>Pet Name</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_name || '—') + '</span></div>';
  html += '<div class="form-group"><label>Weight</label><span style="font-size:0.9375rem;">' + escHtml(q.pet_weight || '—') + '</span></div>';
  html += '</div>';
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Origin</label><span style="font-size:0.9375rem;">' + escHtml((q.origin_city||'') + ', ' + (q.origin_country||'')) + '</span></div>';
  html += '<div class="form-group"><label>Destination</label><span style="font-size:0.9375rem;">' + escHtml((q.dest_city||'') + ', ' + (q.dest_country||'')) + '</span></div>';
  html += '<div class="form-group"><label>Transport Type</label><span style="font-size:0.9375rem;">' + (q.transport_type ? escHtml(q.transport_type) : '—') + '</span></div>';
  html += '<div class="form-group"><label>Referral</label><span style="font-size:0.9375rem;">' + escHtml(q.referral || '—') + '</span></div>';
  html += '</div>';
  if (q.notes) {
    html += '<div class="form-group full"><label>Notes</label><p style="font-size:0.9375rem;line-height:1.6;margin-top:0.25rem;">' + escHtml(q.notes).replace(/\n/g, '<br>') + '</p></div>';
  }
  openModal('Quote Details — ' + q.contact_name, html);
}

async function deleteQuote(id) {
  if (!confirm('Delete this quote request?')) return;
  try {
    await fetch('/api/admin/quotes/' + id, { method: 'DELETE' });
    showToast('Deleted', 'success');
    loadQuotes();
    loadDashboard();
  } catch { showToast('Delete failed', 'error'); }
}

// ── Contacts ───────────────────────────────────────────────────────────────
async function loadContacts() {
  try {
    var d = await (await fetch('/api/admin/contacts')).json();
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
  await fetch('/api/admin/contacts/' + id, { method: 'PATCH' });
  loadContacts();
  loadDashboard();
}

async function deleteContact(id) {
  if (!confirm('Delete this message?')) return;
  await fetch('/api/admin/contacts/' + id, { method: 'DELETE' });
  showToast('Deleted', 'success');
  loadContacts();
  loadDashboard();
}

// ── Landing Content ─────────────────────────────────────────────────────────
async function loadLandingContent() {
  try {
    var d = await (await fetch('/api/admin/landing-content')).json();
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
    fieldTpl('text', 'eyebrow', 'Eyebrow Text', h.eyebrow || ''),
    fieldTpl('textarea', 'headline', 'Headline (use Enter for line breaks)', h.headline || ''),
    fieldTpl('textarea', 'subheading', 'Subheading', h.subheading || ''),
    fieldTpl('text', 'cta_text', 'CTA Button Text', h.cta_text || '')
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
    fieldTpl('textarea', 'text', 'About Text', ab.text || '')
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
    fieldTpl('text', 'headline', 'Headline', cta.headline || ''),
    fieldTpl('textarea', 'sub', 'Sub-text', cta.sub || ''),
    fieldTpl('text', 'button_text', 'Button Text', cta.button_text || '')
  ].join(''));

  // Footer
  var ft = c.footer || {};
  html += sectionTpl('footer', 'Footer', [
    fieldTpl('text', 'email', 'Email', ft.email || ''),
    fieldTpl('text', 'phone', 'Phone', ft.phone || ''),
    fieldTpl('text', 'hours', 'Hours', ft.hours || '')
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

function fieldTpl(type, name, label, value) {
  if (type === 'textarea') {
    return '<div class="form-group full">' +
      '<label class="field-label">' + label + '</label>' +
      '<textarea class="field-textarea" data-section="__SECTION__" data-key="' + name + '" rows="3">' + escHtml(value) + '</textarea>' +
    '</div>';
  }
  return '<div class="form-group">' +
    '<label class="field-label">' + label + '</label>' +
    '<input type="text" class="field-input" data-section="__SECTION__" data-key="' + name + '" value="' + escHtml(value) + '">' +
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
      '<input type="text" class="field-input stat-num" placeholder="Number (e.g. 15+)" value="' + escHtml(s.number || '') + '" data-idx="' + i + '">' +
      '<input type="text" class="field-input stat-label" placeholder="Label" value="' + escHtml(s.label || '') + '" data-idx="' + i + '">' +
    '</div>';
  });
  el.innerHTML = html;
}

function addStat() {
  var stats = getStatsFromDOM();
  stats.push({number:'', label:''});
  renderStatsItems(stats);
}

function getStatsFromDOM() {
  var nums = document.querySelectorAll('.stat-num');
  var labs = document.querySelectorAll('.stat-label');
  var stats = [];
  nums.forEach(function(n, i) {
    if (n.value.trim() || labs[i].value.trim()) {
      stats.push({ number: n.value.trim(), label: labs[i].value.trim() });
    }
  });
  return stats;
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
        '<select class="field-select" data-idx="' + i + '" data-type="icon" style="width:120px;">';
    icons.forEach(function(ic) {
      html += '<option value="' + ic + '"' + (s.icon === ic ? ' selected' : '') + '>' + ic.replace('fa-','') + '</option>';
    });
    html += '</select>' +
        '<input type="text" class="field-input svc-title" placeholder="Service Title" value="' + escHtml(s.title || '') + '" data-idx="' + i + '">' +
      '</div>' +
      '<textarea class="field-textarea svc-desc" placeholder="Service Description" rows="2" data-idx="' + i + '">' + escHtml(s.desc || '') + '</textarea>' +
    '</div>';
  });
  el.innerHTML = html;
}

function addService() {
  var svcs = getServicesFromDOM();
  svcs.push({icon:'fa-plane', title:'', desc:''});
  renderServicesItems(svcs);
}

function getServicesFromDOM() {
  var titles = document.querySelectorAll('.svc-title');
  var descs = document.querySelectorAll('.svc-desc');
  var icons = document.querySelectorAll('.svc-title'); // workaround — get from selects
  var svcs = [];
  var sels = document.querySelectorAll('select[data-type="icon"]');
  titles.forEach(function(t, i) {
    if (t.value.trim() || descs[i].value.trim()) {
      svcs.push({
        icon: sels[i] ? sels[i].value : 'fa-plane',
        title: t.value.trim(),
        desc: descs[i].value.trim()
      });
    }
  });
  return svcs;
}

function renderOfficesItems(offs) {
  var el = document.getElementById('offices-items');
  if (!el) return;
  if (!offs.length) offs = [{city:'', country:'', type:''}];
  var html = '';
  offs.forEach(function(o, i) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:0.75rem;margin-bottom:0.75rem;align-items:end;">' +
      '<input type="text" class="field-input off-city" placeholder="City" value="' + escHtml(o.city || '') + '" data-idx="' + i + '">' +
      '<input type="text" class="field-input off-country" placeholder="Country" value="' + escHtml(o.country || '') + '" data-idx="' + i + '">' +
      '<input type="text" class="field-input off-type" placeholder="Type (e.g. HQ)" value="' + escHtml(o.type || '') + '" data-idx="' + i + '">' +
    '</div>';
  });
  el.innerHTML = html;
}

function addOffice() {
  var offs = getOfficesFromDOM();
  offs.push({city:'', country:'', type:''});
  renderOfficesItems(offs);
}

function getOfficesFromDOM() {
  var offs = [];
  var cities = document.querySelectorAll('.off-city');
  var countries = document.querySelectorAll('.off-country');
  var types = document.querySelectorAll('.off-type');
  cities.forEach(function(c, i) {
    if (c.value.trim() || countries[i].value.trim()) {
      offs.push({ city: c.value.trim(), country: countries[i].value.trim(), type: types[i].value.trim() });
    }
  });
  return offs;
}

async function saveLandingContent() {
  var c = {};
  // Gather simple fields
  document.querySelectorAll('.field-input[data-key], .field-textarea[data-key]').forEach(function(inp) {
    var sec = inp.getAttribute('data-section');
    var key = inp.getAttribute('data-key');
    if (!c[sec]) c[sec] = {};
    c[sec][key] = inp.value;
  });

  // Stats
  c.stats = getStatsFromDOM();
  // Services
  c.services = getServicesFromDOM();
  // Offices
  c.offices = getOfficesFromDOM();

  // Save each section
  try {
    for (var sec in c) {
      await fetch('/api/admin/landing-content/' + sec, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c[sec])
      });
    }
    showToast('All changes saved', 'success');
  } catch { showToast('Save failed', 'error'); }
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
      await fetch('/api/admin/countries/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/admin/countries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeModal();
    showToast('Country saved', 'success');
    loadCountries();
  } catch { showToast('Save failed', 'error'); }
}

async function deleteCountry(id) {
  if (!confirm('Delete this country?')) return;
  await fetch('/api/admin/countries/' + id, { method: 'DELETE' });
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
      await fetch('/api/admin/airlines/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/admin/airlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    closeModal();
    showToast('Airline saved', 'success');
    loadAirlines();
  } catch { showToast('Save failed', 'error'); }
}

async function deleteAirline(id) {
  if (!confirm('Delete this airline?')) return;
  await fetch('/api/admin/airlines/' + id, { method: 'DELETE' });
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
  await fetch('/admin/logout', { method: 'POST' });
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
