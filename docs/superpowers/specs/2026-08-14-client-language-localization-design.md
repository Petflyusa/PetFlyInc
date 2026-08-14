# Client Language Localization Design

## Goal

Make all visitor-facing Pet Fly pages available in English, Spanish, and Simplified Chinese. Select the initial language from the visitor's browser language, and retain an explicit visitor choice across visits. The internal admin interface remains English.

## Scope

Localization applies to the public home, service, quote, contact, regulations, contract, client portal login, password setup, and client dashboard pages. It includes fixed headings, navigation, labels, button text, validation and lookup messages, portal status labels, and document category labels.

The admin application at `/admin` is excluded. Client-entered, administrator-entered, and database-originated values are also excluded. This includes names, addresses, contract numbers, pet data, service details, quotes, contract conditions, progress notes, uploaded file names, and other saved records. They remain displayed exactly as entered.

## Architecture

Create a browser-only localization module at `public/js/i18n.js`. It will contain English, Spanish, and Simplified Chinese dictionaries keyed by stable translation identifiers. Public EJS templates will mark fixed text with `data-i18n` attributes. Dynamic JavaScript views will request translated strings from the module rather than embedding visitor-facing English literals.

The module resolves an initial language in this order:

1. A supported value previously saved in `localStorage` under `petfly_language`.
2. The first supported browser language in `navigator.languages`, mapping `es-*` to Spanish and `zh-*` to Simplified Chinese.
3. English.

The shared site header will include an accessible language menu. Selecting English, Espanol, or Chinese immediately applies that dictionary, updates the document `lang` attribute, and persists the override. The menu will be present on every page using the public header, including the contract and portal pages.

Pages that do not use the shared header, such as the initial password page, will load the same module and include a compact language menu in their page layout.

## User Experience

- English remains the fallback, so unsupported system languages display the existing English site.
- A Spanish system language opens in Spanish; a Chinese system language opens in Simplified Chinese.
- The visitor can switch languages at any time from the menu. Their selection remains effective after navigating or refreshing.
- No selected language is sent to the database. The preference is specific to that browser, preserving client privacy and avoiding modification of contract records.
- Date, currency, and data formats entered in contract fields are not altered by localization. Only labels and explanatory copy change.

## Content Rules

Each language dictionary must include a translation for every `data-i18n` key. The module should retain the existing English template text when a dictionary key is unavailable and report the missing key to the browser console in development.

The contract's legally operative terms will remain in English for this release. A translated UI does not make legal conditions bilingual, and automated translation of a signed legal agreement would be inappropriate. The contract page will translate its lookup experience, field labels, action buttons, and surrounding interface only.

## Error Handling

- Invalid or absent saved language values are ignored and replaced using browser detection.
- An unsupported browser language falls back to English without a visible error.
- If the localization script fails to load, pages remain fully usable in their original English because the EJS templates provide English source text.

## Testing

Automated tests will verify the module has English, Spanish, and Chinese dictionaries; language detection honors a saved override before browser languages; browser mappings and English fallback work; the shared header includes the selector; and visitor-facing templates load the shared module. Existing tests will continue verifying contract and portal behavior.

Manual browser verification will cover initial Spanish and Chinese detection, explicit language switching, refresh persistence, navigation persistence, and English fallback for an unsupported language.
