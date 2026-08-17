const test = require('node:test');
const assert = require('node:assert/strict');

const { findPartnerType, normalizePartnerImportRow, parsePartnerCsv } = require('../lib/partner-csv');

test('reads the California veterinary hospital CSV column names into import fields', () => {
  const [row] = parsePartnerCsv([
    'Organization,Contact,Valid Email,Phone Number,Address: Street,City,State,zip Code,Country,Organization Type',
    'ACCESS Specialty Animal Hospital - Culver City,Dr. Seth Ghantous,info@accessanimalhospitals.com,(310) 558-6100,9599 Jefferson Blvd,Culver City,CA,90232,United States,Veterinary Specialty Center'
  ].join('\n'));

  assert.deepEqual(normalizePartnerImportRow(row.data), {
    organization_name: 'ACCESS Specialty Animal Hospital - Culver City',
    contact_name: 'Dr. Seth Ghantous',
    email: 'info@accessanimalhospitals.com',
    phone: '(310) 558-6100',
    address_line: '9599 Jefferson Blvd',
    city: 'Culver City',
    state: 'CA',
    postal_code: '90232',
    country: 'US',
    organization_type: 'Veterinary Specialty Center',
    website: ''
  });
});

test('classifies veterinary CSV subtypes as the existing veterinary partner type', () => {
  const type = findPartnerType([
    { id: 1, slug: 'vet', label: 'Veterinary Hospital' },
    { id: 2, slug: 'shelter', label: 'Animal Shelter' }
  ], '24/7 Emergency & Specialty Hospital');

  assert.equal(type.id, 1);
});

test('classifies animal shelter CSV subtypes as the existing shelter partner type', () => {
  const types = [
    { id: 1, slug: 'vet', label: 'Veterinary Hospital' },
    { id: 2, slug: 'shelter', label: 'Animal Shelter' }
  ];

  ['Municipal Animal Control & Care Center', 'Humane Society / SPCA', 'Pet Adoption Center', 'Non-Profit Animal Rescue Center'].forEach(label => {
    assert.equal(findPartnerType(types, label).id, 2, label);
  });
});
