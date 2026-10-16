const crypto = require('crypto');

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return String(req.headers['cf-connecting-ip'] || forwarded || req.socket?.remoteAddress || 'unknown').trim();
}

function getVisitorKey(req, secret) {
  return crypto.createHmac('sha256', secret || 'petfly-analytics-development-secret').update(getClientIp(req)).digest('hex');
}

function getAccount(req) {
  if (req.session?.adminId) return { type: 'admin', id: String(req.session.adminId) };
  if (req.session?.memberId) return { type: 'member', id: String(req.session.memberId) };
  if (req.session?.partnerId) return { type: 'partner', id: String(req.session.partnerId) };
  if (req.session?.clientAccountId) return { type: 'client', id: String(req.session.clientAccountId) };
  return { type: null, id: null };
}

function getLocation(req) {
  return {
    country: String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '').slice(0, 128) || null,
    city: String(req.headers['x-vercel-ip-city'] || '').slice(0, 128) || null
  };
}

function shouldTrack(req) {
  if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/admin') || req.path.startsWith('/portal') || req.path.startsWith('/dashboard') || req.path.startsWith('/partner') || req.path.startsWith('/login') || req.path.startsWith('/register') || req.path.startsWith('/verify')) return false;
  return String(req.headers.accept || '').includes('text/html');
}

function buildVisit(req, secret) {
  const location = getLocation(req);
  const account = getAccount(req);
  return {
    visitorKey: getVisitorKey(req, secret),
    path: String(req.path || '/').slice(0, 255),
    referrer: String(req.get('referer') || '').slice(0, 512) || null,
    country: location.country,
    city: location.city,
    userAgent: String(req.get('user-agent') || '').slice(0, 512) || null,
    accountType: account.type,
    accountId: account.id
  };
}

module.exports = { buildVisit, getClientIp, getVisitorKey, getLocation, shouldTrack };
