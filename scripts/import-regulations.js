require('dotenv').config();

const fs = require('fs');
const mysql = require('mysql2/promise');
const { mapAirlineRow, mapCountryRow, parseCsv } = require('../lib/regulation-import');

const [countryFile, airlineFile] = process.argv.slice(2);
if (!countryFile || !airlineFile) {
  throw new Error('Usage: node scripts/import-regulations.js <country-csv> <airline-csv>');
}

const countryFields = ['country_name', 'country_code', 'pet_types', 'microchip', 'rabies_vaccination', 'health_certificate', 'import_permit', 'quarantine_days', 'preparation_time', 'additional_requirements', 'restricted_breeds', 'contact_info'];
const airlineFields = ['airline_name', 'carry_on', 'checked_bag', 'cargo', 'pet_fee', 'size_limits', 'breed_restrictions', 'booking_info', 'crate_requirements'];

async function importRows(connection, rows, mapper, table, fields, identityField) {
  const records = rows.map(row => mapper(row.data)).filter(record => record[identityField]);
  const skipped = rows.length - records.length;
  const identities = records.map(record => record[identityField]);
  const [existingRows] = await connection.query(`SELECT ${identityField} FROM ${table} WHERE ${identityField} IN (${identities.map(() => '?').join(', ')})`, identities);
  const existing = new Set(existingRows.map(row => String(row[identityField]).toLowerCase()));

  // Tables do not have unique keys, so replace only the CSV-matched records before one bulk insert.
  await connection.query(`DELETE FROM ${table} WHERE ${identityField} IN (${identities.map(() => '?').join(', ')})`, identities);
  await connection.query(
    `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${records.map(() => `(${fields.map(() => '?').join(', ')})`).join(', ')}`,
    records.flatMap(record => fields.map(field => record[field]))
  );

  const updated = records.filter(record => existing.has(String(record[identityField]).toLowerCase())).length;
  return { inserted: records.length - updated, updated, skipped };
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'petflyinc'
  });
  try {
    const countries = parseCsv(fs.readFileSync(countryFile, 'utf8'));
    const airlines = parseCsv(fs.readFileSync(airlineFile, 'utf8'));
    await connection.beginTransaction();
    const countryResults = await importRows(connection, countries, mapCountryRow, 'countries', countryFields, 'country_code');
    const airlineResults = await importRows(connection, airlines, mapAirlineRow, 'airlines', airlineFields, 'airline_name');
    await connection.commit();
    console.log(JSON.stringify({ countries: countryResults, airlines: airlineResults }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
