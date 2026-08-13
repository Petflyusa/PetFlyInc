const relocationSteps = ['Consulting', 'Contract Signed', 'Pick-Up', 'Exam/Vaccination', 'Documentation', 'On Route', 'In-Transfer', 'Home Delivery'];
const documentCategories = ['Rabies Vaccination', 'Other Vaccination', 'Exam Reports', 'Other Reports', 'Travel Documents', 'Other Documents', 'Client Identifications'];

function documentExpiryStatus(expiresOn, today = new Date().toISOString().slice(0, 10)) {
  if (!expiresOn) return 'not_set';
  const expires = new Date(`${expiresOn}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(expires.getTime())) return 'not_set';
  if (expires < current) return 'expired';
  const threshold = new Date(current);
  threshold.setUTCDate(threshold.getUTCDate() + 30);
  return expires <= threshold ? 'expiring' : 'valid';
}

function normalizeYouTubeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    let id = null;
    if (hostname === 'youtu.be') id = url.pathname.slice(1);
    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/) || [])[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function isActiveRelocation(statusStep) {
  return statusStep !== 'Home Delivery';
}

module.exports = { documentCategories, documentExpiryStatus, isActiveRelocation, normalizeYouTubeUrl, relocationSteps };
