const crypto = require('crypto');

function createContractNumber(date = new Date(), suffix = crypto.randomBytes(3).toString('hex')) {
  const ymd = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');
  return `PF-${ymd}-${String(suffix).toUpperCase()}`;
}

function canEditContract(status) {
  return status !== 'signed';
}

module.exports = { createContractNumber, canEditContract };
