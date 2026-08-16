# PetConnect Microchip Contact Relay

## Purpose

Allow a person who finds a pet to search its PetConnect microchip number and safely contact the registered owner without exposing the owner's personal contact information.

## Public Lookup

- The PetConnect public page will include a microchip lookup form available without an account.
- Input is normalized by removing spaces and hyphens, then validated as a 9 to 15 digit ISO or AVID microchip number.
- A matching pet displays its photo, name, microchip number, species, breed, color, gender, and birth date.
- Owner notes, owner name, email, phone, address, membership data, and internal identifiers never appear in a lookup response.
- A missing, invalid, or non-public record produces the same neutral no-public-record response.

## Contact Relay

- A successful lookup displays a form with the finder's name, email, optional phone number, and required message.
- Submitting the form sends an email from the site's configured sender to the matching pet owner's registered email address.
- The email identifies the pet and includes the finder's supplied contact details and message so the owner can reply directly.
- The browser receives a generic confirmation and never receives the owner's email address or delivery status.

## Safety Controls

- Lookup and message endpoints validate and normalize every submitted field.
- The email subject and body are built from escaped input to prevent header injection and HTML injection.
- Lookup and contact submissions are rate-limited by client IP address to reduce scraping and spam.
- Requests are logged with timestamp, microchip lookup outcome, and IP metadata suitable for abuse investigation, without recording the owner's email in the public response.

## Error Handling

- Unknown chips, malformed chips, disabled records, and private records use a neutral response.
- An SMTP failure is logged server-side; the finder still receives a generic confirmation so the owner account cannot be enumerated through delivery behavior.
- A direct match belongs to the currently registered owner of the pet and uses that account's email.

## Tests

- Normalized matching finds a registered pet.
- Lookup responses contain allowed pet details and exclude owner details.
- Unknown and invalid microchips return a neutral result.
- A valid contact submission produces an owner-directed relay message.
- Invalid contact fields and rate-limited traffic are rejected without sending email.
