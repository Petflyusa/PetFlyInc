const test = require('node:test');
const assert = require('node:assert/strict');

const { mapAirlineRow, mapCountryRow, parseCsv } = require('../lib/regulation-import');

test('maps country passport data to the country regulation fields', () => {
  const [row] = parseCsv([
    'Country,Country_Code,Pet_Types_Allowed,Microchip_Required,Rabies_Vaccination,Titer_Test_Required,Health_Certificate,Quarantine_Days,Import_Permit,Entry_Ports,Additional_Requirements,Last_Updated',
    'Exampleland,EX,"Dogs, Cats",Yes,Required,Yes,Yes,14,Yes,Capital Airport,Keep original records,2026-01'
  ].join('\n'));

  assert.deepEqual(mapCountryRow(row.data), {
    country_name: 'Exampleland',
    country_code: 'EX',
    pet_types: 'Dogs, Cats',
    microchip: 'Yes',
    rabies_vaccination: 'Required',
    health_certificate: 'Yes',
    import_permit: 'Yes',
    quarantine_days: 14,
    preparation_time: null,
    restricted_breeds: null,
    contact_info: null,
    additional_requirements: 'Rabies titer test: Yes\nEntry ports: Capital Airport\nAdditional requirements: Keep original records\nLast updated: 2026-01'
  });
});

test('maps airline policy data to the airline regulation fields', () => {
  const [row] = parseCsv([
    'Airline_Name,Country,Pet_Options,Cargo_Service,Routes,Cabin_Weight_Limit,Advance_Booking,Restrictions,Website,Cargo_Details,Cabin_Fee,Carrier_Type,Cabin_Size_Limit',
    'Example Air,US,Cabin/Cargo/Checked,Yes - Example Cargo,Worldwide,Cabin: 20 lbs,48 hours,Snub-nosed restricted,example.test/pets,Temperature restrictions,$125 cabin,Hard-sided,18x11x11 in'
  ].join('\n'));

  assert.deepEqual(mapAirlineRow(row.data), {
    airline_name: 'Example Air',
    carry_on: 'Pet options: Cabin/Cargo/Checked\nCabin weight limit: Cabin: 20 lbs',
    checked_bag: 'Pet options: Cabin/Cargo/Checked',
    cargo: 'Cargo service: Yes - Example Cargo\nCargo details: Temperature restrictions',
    pet_fee: '$125 cabin',
    size_limits: 'Cabin size limit: 18x11x11 in',
    breed_restrictions: 'Snub-nosed restricted',
    booking_info: 'Advance booking: 48 hours\nRoutes: Worldwide\nWebsite: example.test/pets\nCountry: US',
    crate_requirements: 'Carrier type: Hard-sided'
  });
});
