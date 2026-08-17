const GEOCODE_STATUSES = Object.freeze({
  pending: 'pending',
  located: 'located',
  failed: 'failed',
  needsReview: 'needs_review'
});

function isValidCoordinates(coordinates) {
  if (!coordinates || coordinates.latitude === null || coordinates.latitude === undefined || coordinates.longitude === null || coordinates.longitude === undefined) return false;
  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function isRetryableGeocode(status) {
  return [GEOCODE_STATUSES.pending, GEOCODE_STATUSES.failed, GEOCODE_STATUSES.needsReview].includes(status);
}

function isRetryableGeocodeError(error) {
  return /HTTP 429|timeout|timed out|network|fetch failed|ECONNRESET|ENOTFOUND/i.test(String(error || ''));
}

function geocodeRetryDelaySeconds(attempts) {
  const exponent = Math.max(0, Math.min(20, Number(attempts) - 1));
  return Math.min(24 * 60 * 60, 15 * 60 * (2 ** exponent));
}

function nextGeocodeStatus({ coordinates, error, retryable = false, attempts, maxAttempts }) {
  if (isValidCoordinates(coordinates)) return GEOCODE_STATUSES.located;
  if (!error) return GEOCODE_STATUSES.needsReview;
  if (retryable) return GEOCODE_STATUSES.pending;
  return Number(attempts) >= Number(maxAttempts) ? GEOCODE_STATUSES.failed : GEOCODE_STATUSES.pending;
}

module.exports = { GEOCODE_STATUSES, isRetryableGeocode, isRetryableGeocodeError, isValidCoordinates, geocodeRetryDelaySeconds, nextGeocodeStatus };
