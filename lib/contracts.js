const crypto = require('crypto');

const quotationAmountFields = ['cargo_charge', 'vaccination', 'documentation', 'customs_service', 'quarantine', 'other_service'];

function blankContractData(effectiveDate = new Date().toISOString().slice(0, 10)) {
  return {
    agreement: { effective_date: effectiveDate },
    client: { first_name: '', last_name: '', address: '', city_state_zip: '', phone: '', email: '' },
    animal: { name: '', type: '', breed: '', gender: '', dob: '', weight_kg: '', color: '', microchip: '', length_cm: '', height_cm: '' },
    travel: { departure_country: '', departure_state: '', departure_city: '', arrival_country: '', arrival_state: '', arrival_city: '', travel_date: '', airline_flight: '', transfer_city: '' },
    shipment: { pickup_name_address_phone: '', consignee_name_address_phone: '', arrival_date: '' },
    quotation: { shipping_method: '', cargo_charge: '', cargo_charge_details: '', vaccination: '', vaccination_details: '', documentation: '', documentation_details: '', customs_service: '', customs_service_details: '', quarantine: '', quarantine_details: '', other_service: '', other_service_details: '', total_cost: '0.00' },
    payment: { payment_method: '', deposit_amount: '', deposit_due: '', balance_amount: '0.00', balance_due: '', transfer_fee: '' },
    carrier: { representative_name: '', representative_signature: '', office_address: '12101 Clark St Unit F, Arcadia, CA 91007', email: 'petflyusa@hotmail.com', website: 'www.petsrelocation.com', office_phone: '661-505-0707', cell_phone: '323-285-9939' }
  };
}

function calculateQuotationTotal(quotation = {}) {
  const total = quotationAmountFields.reduce((sum, key) => sum + (Number.parseFloat(quotation[key]) || 0), 0);
  return total.toFixed(2);
}

function calculateBalance(totalCost, depositAmount) {
  return Math.max(0, (Number.parseFloat(totalCost) || 0) - (Number.parseFloat(depositAmount) || 0)).toFixed(2);
}

function normalizeContractData(data = {}, effectiveDate) {
  const defaults = blankContractData(effectiveDate);
  const contract = {
    ...defaults,
    ...data,
    agreement: { ...defaults.agreement, ...(data.agreement || {}) },
    client: { ...defaults.client, ...(data.client || {}) },
    animal: { ...defaults.animal, ...(data.animal || {}) },
    travel: { ...defaults.travel, ...(data.travel || {}) },
    shipment: { ...defaults.shipment, ...(data.shipment || {}) },
    quotation: { ...defaults.quotation, ...(data.quotation || {}) },
    payment: { ...defaults.payment, ...(data.payment || {}) },
    carrier: { ...defaults.carrier, ...(data.carrier || {}) }
  };
  contract.quotation.total_cost = calculateQuotationTotal(contract.quotation);
  contract.payment.balance_amount = calculateBalance(contract.quotation.total_cost, contract.payment.deposit_amount);
  return contract;
}

function createContractNumber(date = new Date(), suffix = crypto.randomBytes(3).toString('hex')) {
  const ymd = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');
  return `PF-${ymd}-${String(suffix).toUpperCase()}`;
}

function canEditContract(status) {
  return status !== 'signed';
}

module.exports = { blankContractData, calculateBalance, calculateQuotationTotal, createContractNumber, canEditContract, normalizeContractData, quotationAmountFields };
