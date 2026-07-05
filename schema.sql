-- ============================================================
-- Pet Fly Inc — Hostinger MySQL Schema
-- Run this against your Hostinger MySQL database
-- ============================================================

CREATE DATABASE IF NOT EXISTS u884869254_petflyinc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE u884869254_petflyinc;

-- ── Admins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin: petflyusa / Jz10191019 (change password immediately)
INSERT INTO admins (username, password_hash) VALUES
('petflyusa', '$2a$10$81kZZJY7e1Wr2LIbn1DYnuJ1mfPRYWvEJo/A797jsIWoRn/jk5fua')
ON DUPLICATE KEY UPDATE username=username;

-- ── Quote Requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  pet_type VARCHAR(32) NOT NULL DEFAULT 'Dog',
  pet_name VARCHAR(64) NULL,
  breed VARCHAR(128) NULL,
  pet_weight VARCHAR(16) NULL,
  origin_country VARCHAR(64) NULL,
  origin_city VARCHAR(64) NULL,
  dest_country VARCHAR(64) NULL,
  dest_city VARCHAR(64) NULL,
  travel_date DATE NULL,
  transport_type VARCHAR(32) NULL,
  referral VARCHAR(128) NULL,
  notes TEXT NULL,
  status ENUM('pending','reviewed','completed','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Contact Messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  subject VARCHAR(128) NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_read (is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Country Regulations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_name VARCHAR(128) NOT NULL,
  country_code CHAR(2) NULL,
  pet_types VARCHAR(128) NULL DEFAULT 'Dogs, Cats',
  microchip TEXT NULL,
  rabies_vaccination TEXT NULL,
  health_certificate TEXT NULL,
  import_permit TEXT NULL,
  quarantine_days INT UNSIGNED NOT NULL DEFAULT 0,
  preparation_time VARCHAR(128) NULL,
  additional_requirements TEXT NULL,
  restricted_breeds TEXT NULL,
  contact_info TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Airline Regulations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS airlines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  airline_name VARCHAR(128) NOT NULL,
  carry_on TEXT NULL,
  checked_bag TEXT NULL,
  cargo TEXT NULL,
  pet_fee VARCHAR(64) NULL,
  size_limits TEXT NULL,
  breed_restrictions TEXT NULL,
  booking_info TEXT NULL,
  crate_requirements TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Landing Page Content (JSON sections) ────────────────────
CREATE TABLE IF NOT EXISTS landing_content (
  section_key VARCHAR(64) PRIMARY KEY,
  content JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed: Default Landing Page Content ───────────────────────
INSERT INTO landing_content (section_key, content) VALUES
('hero', JSON_OBJECT(
  'eyebrow', 'International Pet Transport',
  'headline', 'Where Every\nJourney\nCounts.',
  'subheading', 'Safe passage for your most precious companions — to 15+ countries, with IATA & USDA certified care at every mile.',
  'cta_text', 'Request a Quote'
)),
('stats', JSON_ARRAY(
  JSON_OBJECT('number', '15+', 'label', 'Countries Served'),
  JSON_OBJECT('number', '8+', 'label', 'Years Experience'),
  JSON_OBJECT('number', '3', 'label', 'Global Offices'),
  JSON_OBJECT('number', '500+', 'label', 'Happy Pets')
)),
('services', JSON_ARRAY(
  JSON_OBJECT('icon', 'fa-plane', 'title', 'International Transport', 'desc', 'Complete door-to-door relocation to 15+ countries. We handle every step of the journey with precision and care.'),
  JSON_OBJECT('icon', 'fa-passport', 'title', 'Documentation & Compliance', 'desc', 'Health certificates, import permits, vaccination records — our team ensures full compliance with destination regulations.'),
  JSON_OBJECT('icon', 'fa-box-open', 'title', 'IATA-Approved Containers', 'desc', 'Premium, IATA-compliant transport crates sized for your pet. Proper fit is critical for safe and stress-free travel.'),
  JSON_OBJECT('icon', 'fa-shield-alt', 'title', 'Insurance & Safety', 'desc', 'Comprehensive transit insurance for all shipments. Live animal handling by certified professionals at every stage.')
)),
('about', JSON_OBJECT(
  'text', "We don't just transport pets. We shepherd them safely across oceans and continents — with precision, care, and unwavering attention."
)),
('offices', JSON_ARRAY(
  JSON_OBJECT('city', 'Los Angeles', 'country', 'California, USA', 'type', 'Headquarters'),
  JSON_OBJECT('city', 'Shanghai', 'country', 'China', 'type', ''),
  JSON_OBJECT('city', 'Beijing', 'country', 'China', 'type', '')
)),
('cta', JSON_OBJECT(
  'headline', "Ready to begin your pet's journey?",
  'sub', "Request a quote and we'll respond within 24 hours.",
  'button_text', 'Request a Quote'
)),
('footer', JSON_OBJECT(
  'email', 'info@petflyinc.com',
  'phone', '+1 (555) 123-4567',
  'hours', 'Mon—Fri: 9AM — 6PM PST'
))
ON DUPLICATE KEY UPDATE content=VALUES(content);

-- ── Seed: Sample Countries ─────────────────────────────────
INSERT INTO countries (country_name, country_code, pet_types, microchip, rabies_vaccination, health_certificate, import_permit, quarantine_days, preparation_time, restricted_breeds, additional_requirements) VALUES
('China', 'CN', 'Dogs, Cats', 'ISO 11784/11785 microchip required before rabies vaccination', 'Rabies vaccination at least 30 days before travel, not more than 12 months', 'Veterinary Health Certificate (CN) within 10 days of departure', 'Import Permit from China Customs required — apply 1+ months in advance', 0, 'At least 6 weeks', 'Pit Bull, Japanese Tosa, Dogo Argentino, Fila Brasileiro', 'All dogs must be treated for internal parasites within 30 days of import. Some breeds require additional permits.'),
('United States', 'US', 'Dogs, Cats', 'ISO microchip recommended but not required', 'Rabies vaccination required for dogs; cats recommended', 'APHIS Health Certificate within 10 days of travel', 'CDC Dog Import Form required for dogs arriving from high-risk rabies countries', 0, 'At least 4 weeks', NULL, 'Dogs must be at least 6 months old. Certain breeds restricted by airline and state.'),
('United Kingdom', 'GB', 'Dogs, Cats', 'ISO microchip mandatory', 'Rabies vaccination required at least 21 days before travel', 'Animal Health Certificate (AHC) within 10 days of travel', 'Not required for pets from eligible countries (USA)', 0, 'At least 5 months (for tapeworm treatment timing)', 'Pit Bull Terriers (and similar breeds per Dangerous Dogs Act)', 'Dogs must be treated for tapeworm 1-5 days before UK arrival. Pet Travel Scheme (PETS) route required.'),
('Australia', 'AU', 'Dogs, Cats', 'ISO microchip mandatory', 'Rabies vaccination NOT permitted before microchip — follow strict sequencing', 'Veterinary Health Certificate required', 'Import Permit from Department of Agriculture required — apply 3-6 months in advance', 10, 'At least 6 months', 'Pit Bull, Dogo Argentino, Fila Brasileiro, Japanese Tosa', 'Mandatory quarantine. Extremely strict biosecurity. Do NOT ship to Australia without a registered import permit.'),
('Japan', 'JP', 'Dogs, Cats', 'ISO microchip mandatory', 'Two rabies vaccinations required; waiting period applies', 'Veterinary Health Certificate within 10 days', 'Not required for USA-origin pets meeting all requirements', 0, 'At least 180 days', NULL, 'Dogs must be at least 91 days old. Specific blood test required for rabies antibody titration.')
ON DUPLICATE KEY UPDATE country_name=VALUES(country_name);

-- ── Seed: Sample Airlines ──────────────────────────────────
INSERT INTO airlines (airline_name, carry_on, checked_bag, cargo, pet_fee, size_limits, breed_restrictions, booking_info, crate_requirements) VALUES
('Delta Air Lines', 'Pets allowed in cabin on select flights. Fee applies. Must fit under seat.', 'Pets allowed as checked baggage on domestic US flights. Fee applies. Breed and weight restrictions apply.', 'Cargo option for pets not meeting cabin/checked requirements via Delta Cargo.', 'Cabin: $95 USD each way. Checked: $200 USD each way.', 'Cabin: max 20 lbs (9 kg) including carrier. Carrier max 18x11x11 in.', 'Brachycephalic breeds not allowed in cargo. Size/weight limits strictly enforced.', 'Book via delta.com pet travel or call Delta Reservations. Advance booking required — limited cabin spots per flight.', 'IATA-compliant crate required. Soft-sided carriers allowed in cabin. Hard-sided crate required for checked baggage.'),
('American Airlines', 'Small cats and dogs allowed in cabin. Carrier must fit under seat.', 'Checked pets on domestic US flights within policy.', 'Cargo service suspended for pets as of 2022.', 'Cabin: $125 USD per kennel. Checked: $200 USD per pet.', 'Cabin: max 20 lbs (9 kg). Carrier max 19x13x9 in.', 'Snub-nosed (brachycephalic) cats and dogs not accepted for checked or cargo.', 'Book through American Airlines reservations. Cabin pets must be booked at least 48 hours in advance.', 'IATA-compliant container required. Soft-sided or hard-sided kennel accepted for in-cabin.'),
('United Airlines', 'Carry-on pets allowed on most flights. Fee applies.', 'Checked pets allowed on domestic flights within policy.', 'United PetSafe program for cargo transport (select routes).', 'Cabin: $125 USD domestic. $125-$200 USD international. Checked/cargo: varies.', 'Cabin: max 20 lbs (9 kg). Max carrier size 18x11x11 in.', 'Brachycephalic breeds not permitted in cargo. Weight and breed restrictions apply to checked pets.', 'Book via United app or call Reservations. PetSafe cargo must be booked 5+ days in advance.', 'IATA-compliant transport crate required for all options.')
ON DUPLICATE KEY UPDATE airline_name=VALUES(airline_name);
