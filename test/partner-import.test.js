const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPartnerInsert } = require('../lib/partner-import');

test('builds one duplicate-safe bulk insert for selected organizations', () => {
  const statement = buildPartnerInsert([{
    partner_type_id: 1,
    organization_name: 'Example Veterinary Hospital',
    contact_name: 'Dr. Example',
    email: 'example@vet.test',
    phone: '555-0100',
    address_line: '1 Main St',
    city: 'Los Angeles',
    state: 'CA',
    postal_code: '90001',
    country: 'US',
    website: ''
  }]);

  assert.match(statement.sql, /^INSERT IGNORE INTO rescue_partners/);
  assert.equal(statement.params.length, 15);
  assert.deepEqual(statement.params.slice(0, 11), [1, 'Example Veterinary Hospital', 'Dr. Example', 'example@vet.test', '555-0100', '1 Main St', 'Los Angeles', 'CA', '90001', 'US', null]);
});
