# PetConnect Organization Geocoding and List Management

## Goal

Make the PetConnect Organizations workspace usable for large imports and provide durable geographic-location tracking for every organization.

## Organization List

- The API accepts a search term, existing filters, page number, and page size.
- Page size options are 50, 100, 200, and All.
- The response includes records, total matching count, current page, and total pages.
- Search covers organization name, contact, email, street address, city, state, postal code, and country.
- A header checkbox selects every organization on the visible filtered page. Selection remains explicit and is used by the existing bulk invitation action.
- The table displays full address, geographic status, latitude/longitude when available, last geocoded time, and an organization-level retry action.

## Persistent Geocoding State

`rescue_partners` gains these nullable fields:

- `geocode_status`: `pending`, `located`, `failed`, or `needs_review`.
- `geocode_attempts`: number of background attempts.
- `geocoded_at`: last successful geocoding timestamp.
- `geocode_error`: the latest provider or data-quality failure message.

New imports create records with `pending` status. New and edited manually entered organizations also begin or return to `pending` when their address changes.

## Background Worker

- The CSV import saves records immediately and never waits for geocoding.
- On server startup and at a regular interval, a single worker claims pending or retryable records.
- It sends one address at a time to the existing provider with the required rate limit.
- Successful requests save latitude/longitude, set `located`, clear the error, and timestamp the result.
- Empty or ambiguous provider results become `needs_review`; transient provider failures remain retryable until the configured maximum attempt count, then become `failed`.
- Work is database-backed, so a restart resumes from persisted status without losing progress.
- Administrators can retry one selected failed/review record or queue all failed/review records again.

## Radius Notifications

Distance-based alert notifications use only organizations with `located` status and valid coordinates. Organizations still awaiting geocoding remain stored and visible, but are excluded from radius calculations until located.

## Validation

- Unit tests cover page-size validation, pagination metadata, and state transitions.
- CSV imports remain compatible with the supplied California veterinary-hospital CSV.
- Tests confirm that bulk import does not await the geocoding function.
- The complete test suite and server syntax check must pass before deployment.
