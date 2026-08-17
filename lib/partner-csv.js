function normalizeHeader(header) {
  return String(header || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parsePartnerCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && (quoted || field === '')) {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = '';
    } else field += character;
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); }
  const headers = (rows.shift() || []).map(normalizeHeader);
  return rows.map((values, index) => ({ row: index + 2, data: Object.fromEntries(headers.map((header, column) => [header, values[column] || ''])) }));
}

const fieldAliases = {
  organization_name: ['organization_name', 'organization', 'company_name', 'company', 'name'],
  contact_name: ['contact_name', 'contact', 'contact_person'],
  email: ['email', 'valid_email', 'email_address'],
  phone: ['phone', 'phone_number', 'telephone'],
  address_line: ['address_line', 'address_street', 'street_address', 'street'],
  city: ['city'],
  state: ['state', 'state_province', 'province'],
  postal_code: ['postal_code', 'zip_code', 'zip', 'postcode'],
  country: ['country'],
  organization_type: ['organization_type', 'partner_type', 'type'],
  website: ['website', 'web_site', 'url']
};

function normalizeCountry(country) {
  const value = String(country || '').trim().toUpperCase();
  if (['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(value)) return 'US';
  if (['CA', 'CAN', 'CANADA'].includes(value)) return 'CA';
  return value;
}

function normalizePartnerImportRow(data) {
  const source = Object.fromEntries(Object.entries(data || {}).map(([key, value]) => [normalizeHeader(key), String(value || '').trim()]));
  const normalized = {};
  for (const [field, aliases] of Object.entries(fieldAliases)) normalized[field] = aliases.map(alias => source[alias]).find(Boolean) || '';
  normalized.country = normalizeCountry(normalized.country);
  return normalized;
}

function findPartnerType(types, value) {
  const typeValue = String(value || '').trim().toLowerCase();
  const direct = types.find(candidate => String(candidate.id) === String(value || '') || candidate.slug.toLowerCase() === typeValue || candidate.label.toLowerCase() === typeValue);
  if (direct) return direct;
  if (/(veterinary|\bvet\b|hospital|clinic|medical center|emergency|feline)/.test(typeValue)) return types.find(candidate => candidate.slug.toLowerCase() === 'vet');
  return undefined;
}

module.exports = { findPartnerType, normalizePartnerImportRow, parsePartnerCsv };
