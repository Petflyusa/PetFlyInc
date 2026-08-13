# Contract Form Editing Design

## Goal

Improve both contract editors so the admin can create a structured quotation and clients can complete only the permitted contract details before signing.

## Data Model

The existing `contract_data` JSON snapshot remains the source of truth. New contracts use `agreement.effective_date` as today in local ISO date format. Animal data removes `kennel_size`, uses `weight_kg`, `length_cm`, and `height_cm`, and stores the selected values for `type` and `gender`. The quotation retains its named service fields and adds `service_details` text for each service. `total_cost` and `payment.balance_amount` are calculated values, persisted when an admin saves or issues a contract.

## Admin Editor

The effective date, birth date, travel date, and arrival date are native date inputs. Pet type, gender, shipping method, and payment method are selects. Departure and arrival each render as a three-column row: country, state or province, city. Countries are sourced from the existing admin country endpoint, with a manual fallback option when no country records are available.

Every quotation item is its own full-width row with a service-detail field and a currency amount. The total displays as read-only and changes immediately when any amount changes. The remaining balance displays as read-only and changes immediately when deposit changes. Payment method choices are WeChat RMB, Alipay RMB, Bank Transfer RMB, Zelle, and Wire.

## Client Editor

The client sees the same field definitions. Quotation, total cost, payment method, deposit, balance, and payment due dates are read-only. The client may complete their personal, animal, travel, and shipment details until signature. Once signed, the existing contract lock continues to make every field read-only.

## Compatibility

Existing contract data may still contain prior field names. Rendering treats absent new fields as empty and preserves old JSON values. No database migration is required because contracts already store a JSON document.

## Testing

Unit tests cover current-date defaults, sum of quotation amounts, balance calculation, and a client read-only field policy. Source tests assert selects, date inputs, measurement labels, and quotation locking are present in both editor surfaces.
