function buildPartnerInsert(rows) {
  const placeholders = rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const params = rows.flatMap(data => [
    data.partner_type_id,
    data.organization_name,
    data.contact_name,
    data.email,
    data.phone || null,
    data.address_line || null,
    data.city,
    data.state || null,
    data.postal_code || null,
    data.country,
    null,
    null,
    data.website || null,
    false,
    false
  ]);
  return {
    sql: `INSERT IGNORE INTO rescue_partners (partner_type_id, company_name, contact_name, email, phone, address_line, city, state, postal_code, country, latitude, longitude, website, is_active, is_verified) VALUES ${placeholders}`,
    params
  };
}

module.exports = { buildPartnerInsert };
