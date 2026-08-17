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

function nextGeocodeStatus({ coordinates, error, attempts, maxAttempts }) {
  if (isValidCoordinates(coordinates)) return GEOCODE_STATUSES.located;
  if (!error) return GEOCODE_STATUSES.needsReview;
  return Number(attempts) >= Number(maxAttempts) ? GEOCODE_STATUSES.failed : GEOCODE_STATUSES.pending;
}

module.exports = { GEOCODE_STATUSES, isRetryableGeocode, isValidCoordinates, nextGeocodeStatus };
