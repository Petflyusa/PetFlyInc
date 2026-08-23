function normalizeHeader(header) {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const headers = (rows.shift() || []).map(normalizeHeader);
  return rows.map((values, index) => ({
    row: index + 2,
    data: Object.fromEntries(headers.map((header, column) => [header, values[column] || '']))
  }));
}

function value(data, field) {
  const result = String(data[field] || '').trim();
  return result || null;
}

function lines(...entries) {
  return entries.filter(([, content]) => content).map(([label, content]) => `${label}: ${content}`).join('\n') || null;
}

function parseDays(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function mapCountryRow(data) {
  return {
    country_name: value(data, 'country'),
    country_code: value(data, 'country_code')?.toUpperCase() || null,
    pet_types: value(data, 'pet_types_allowed'),
    microchip: value(data, 'microchip_required'),
    rabies_vaccination: value(data, 'rabies_vaccination'),
    health_certificate: value(data, 'health_certificate'),
    import_permit: value(data, 'import_permit'),
    quarantine_days: parseDays(data.quarantine_days),
    preparation_time: null,
    restricted_breeds: null,
    contact_info: null,
    additional_requirements: lines(
      ['Rabies titer test', value(data, 'titer_test_required')],
      ['Entry ports', value(data, 'entry_ports')],
      ['Additional requirements', value(data, 'additional_requirements')],
      ['Last updated', value(data, 'last_updated')]
    )
  };
}

function mapAirlineRow(data) {
  const petOptions = value(data, 'pet_options');
  return {
    airline_name: value(data, 'airline_name'),
    carry_on: lines(['Pet options', petOptions], ['Cabin weight limit', value(data, 'cabin_weight_limit')]),
    checked_bag: /checked/i.test(petOptions || '') ? `Pet options: ${petOptions}` : null,
    cargo: lines(['Cargo service', value(data, 'cargo_service')], ['Cargo details', value(data, 'cargo_details')]),
    pet_fee: value(data, 'cabin_fee'),
    size_limits: lines(['Cabin size limit', value(data, 'cabin_size_limit')]),
    breed_restrictions: value(data, 'restrictions'),
    booking_info: lines(
      ['Advance booking', value(data, 'advance_booking')],
      ['Routes', value(data, 'routes')],
      ['Website', value(data, 'website')],
      ['Country', value(data, 'country')]
    ),
    crate_requirements: lines(['Carrier type', value(data, 'carrier_type')])
  };
}

module.exports = { mapAirlineRow, mapCountryRow, parseCsv };
