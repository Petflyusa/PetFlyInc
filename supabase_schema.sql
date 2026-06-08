-- Supabase PostgreSQL Schema & Seed Data for PetFly USA

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS client_messages CASCADE;
DROP TABLE IF EXISTS service_sop CASCADE;
DROP TABLE IF EXISTS client_services CASCADE;
DROP TABLE IF EXISTS client_pets CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS airline_regulations CASCADE;
DROP TABLE IF EXISTS country_regulations CASCADE;
DROP TABLE IF EXISTS quote_requests CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;

-- 1. Create country_regulations table
CREATE TABLE country_regulations (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(10),
    country_name VARCHAR(100),
    pet_types TEXT,
    microchip TEXT,
    rabies_vaccination TEXT,
    health_certificate TEXT,
    import_permit TEXT,
    quarantine_days INT DEFAULT 0,
    additional_requirements TEXT,
    preparation_time TEXT,
    restricted_breeds TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create airline_regulations table
CREATE TABLE airline_regulations (
    id SERIAL PRIMARY KEY,
    airline_name VARCHAR(100),
    carry_on TEXT,
    checked_bag TEXT,
    cargo TEXT,
    pet_fee TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    full_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create client_pets table
CREATE TABLE client_pets (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    pet_name VARCHAR(100),
    pet_type VARCHAR(100),
    breed VARCHAR(100),
    weight VARCHAR(50),
    microchip VARCHAR(100),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create client_services table
CREATE TABLE client_services (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    pet_id INT REFERENCES client_pets(id) ON DELETE CASCADE,
    origin_country VARCHAR(100),
    origin_city VARCHAR(100),
    dest_country VARCHAR(100),
    dest_city VARCHAR(100),
    transport_type VARCHAR(50),
    travel_date DATE,
    current_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create service_sop table
CREATE TABLE service_sop (
    id SERIAL PRIMARY KEY,
    service_id INT REFERENCES client_services(id) ON DELETE CASCADE,
    stage VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create client_messages table
CREATE TABLE client_messages (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    sender VARCHAR(20),
    subject VARCHAR(255),
    message TEXT,
    is_read INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Create quote_requests table
CREATE TABLE quote_requests (
    id SERIAL PRIMARY KEY,
    pet_type VARCHAR(50),
    pet_name VARCHAR(100),
    pet_weight VARCHAR(50),
    breed VARCHAR(100),
    origin_country VARCHAR(100),
    origin_city VARCHAR(100),
    dest_country VARCHAR(100),
    dest_city VARCHAR(100),
    travel_date VARCHAR(100),
    transport_type VARCHAR(50),
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(100),
    referral VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Create contact_messages table
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE country_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE airline_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_sop ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Country Regulations Seeding
INSERT INTO country_regulations (country_code, country_name, pet_types, microchip, rabies_vaccination, health_certificate, import_permit, quarantine_days, additional_requirements, preparation_time, restricted_breeds, contact_info) VALUES
('GB', 'United Kingdom', 'Dogs, Cats, Ferrets', 'Required', 'Required (Must be done after microchipping, at least 21 days before travel)', 'Required (Great Britain Health Certificate or Pet Passport)', 'Not Required (for standard imports under PETS scheme)', 0, 'Must enter via approved routes and undergo tapeworm treatment (dogs only) 24-120 hours before arrival.', '1 to 3 months', 'Pit Bull Terrier, Japanese Tosa, Dogo Argentino, Fila Brasileiro', 'DEFRA: imports@defra.gov.uk'),
('JP', 'Japan', 'Dogs, Cats', 'Required', 'Required (2 rabies vaccinations, followed by RNATT blood titer test)', 'Required (Form AC endorsed by government authorities)', 'Required (Notification at least 40 days before arrival)', 0, 'Titer test must be >= 0.5 IU/ml. 180-day waiting period required after titer test to avoid 180 days quarantine on arrival.', '7 to 8 months', 'None general, but specific local rules apply', 'MAFF Animal Quarantine Service: aqs.entry@maff.go.jp'),
('AU', 'Australia', 'Dogs, Cats', 'Required', 'Required (RNATT blood titer test required)', 'Required (Official health certificate issued by government vet)', 'Required (Import Permit must be applied for in advance)', 10, 'Mandatory 10-day quarantine at Mickleham Post Entry Quarantine facility. Blood tests for Ehrlichia canis, Brucella canis, Leishmania infantum required.', '6 to 9 months', 'Pit Bull Terriers, Dogo Argentino, Fila Brasileiro, Japanese Tosa, Presa Canario', 'Department of Agriculture: imports@agriculture.gov.au'),
('SG', 'Singapore', 'Dogs, Cats', 'Required', 'Required', 'Required (Veterinary health certificate and government endorsement)', 'Required (Import license required)', 30, 'Quarantine category depends on origin country. Category A (UK, Australia) has no quarantine; Category B/C (USA) has 10-30 days quarantine.', '3 to 6 months', 'Pit Bull, American Staffordshire Terrier, Dogo Argentino, Fila Brasileiro', 'NParks Animal & Veterinary Service: avs@nparks.gov.sg'),
('CA', 'Canada', 'Dogs, Cats', 'Not Required', 'Required (or rabies free country certificate)', 'Required (Veterinary health certificate showing description of pet)', 'Not Required', 0, 'Simple import rules for pets from low-rabies countries. Random inspection at border ($30 CAD fee).', '1 month', 'None (except some local municipal bylaws)', 'CFIA: cfia.import@inspection.gc.ca');

-- 2. Airline Regulations Seeding
INSERT INTO airline_regulations (airline_name, carry_on, checked_bag, cargo, pet_fee) VALUES
('United Airlines', 'Yes (Cats/Dogs in cabin for $125)', 'No (Suspended PetSafe program)', 'Yes (Through United Cargo for active military/state department)', '$125 in-cabin, cargo varies by weight/distance'),
('Emirates', 'No (Except service dogs)', 'Yes (For flights under 17 hours)', 'Yes (Emirates SkyCargo for all other travel)', 'Checked bag: $500 - $800, Cargo: Varies by size/weight'),
('Singapore Airlines', 'No (Except service dogs)', 'Yes (Checked baggage up to 32kg)', 'Yes (SIA Cargo for heavier pets/certain routes)', 'Checked: $200 - $350, Cargo: Calculated based on volumetric weight'),
('Lufthansa', 'Yes (Pets under 8kg including crate for €60-€100)', 'Yes (Heavier pets in air-conditioned hold)', 'Yes (Lufthansa Cargo)', 'Cabin: €60-€100, Hold: €150-€380, Cargo: Varies'),
('British Airways', 'No (Except service dogs)', 'No', 'Yes (All pets must travel as cargo via IAG Cargo)', 'Cargo: Typically starts at $1,000+ depending on crate size');

-- 3. Clients Seeding
INSERT INTO clients (id, username, password, full_name, email, phone) VALUES
(1, 'client1', 'password123', 'John Doe', 'john.doe@example.com', '+1 555-0199');

-- Adjust the auto-increment sequence for clients
SELECT setval(pg_get_serial_sequence('clients', 'id'), 1);

-- 4. Client Pets Seeding
INSERT INTO client_pets (id, client_id, pet_name, pet_type, breed, weight, microchip, photo_url) VALUES
(1, 1, 'Bella', 'Dog', 'Golden Retriever', '28', '985112000123456', 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200');

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('client_pets', 'id'), 1);

-- 5. Client Services Seeding
INSERT INTO client_services (id, client_id, pet_id, origin_country, origin_city, dest_country, dest_city, transport_type, travel_date, current_status) VALUES
(1, 1, 1, 'USA', 'Los Angeles', 'United Kingdom', 'London', 'cargo', '2026-08-15', 'documents');

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('client_services', 'id'), 1);

-- 6. Service SOP Seeding
INSERT INTO service_sop (id, service_id, stage, status, completed_date) VALUES
(1, 1, 'consultation', 'completed', NOW() - INTERVAL '3 days'),
(2, 1, 'documents', 'in_progress', NULL),
(3, 1, 'transfer_booking', 'pending', NULL),
(4, 1, 'pet_pickup', 'pending', NULL),
(5, 1, 'safe_transport', 'pending', NULL),
(6, 1, 'delivery', 'pending', NULL);

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('service_sop', 'id'), 6);

-- 7. Client Messages Seeding
INSERT INTO client_messages (id, client_id, sender, subject, message, is_read) VALUES
(1, 1, 'admin', 'Welcome to PetFly USA', 'Hi John, welcome to PetFly USA! We have received your request and Bella''s travel preparation is in the consultation stage. Please let us know if you have any questions!', 0);

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('client_messages', 'id'), 1);

-- 8. Quote Requests Seeding (Sample request in the admin panel)
INSERT INTO quote_requests (id, pet_type, pet_name, pet_weight, breed, origin_country, origin_city, dest_country, dest_city, travel_date, transport_type, contact_name, email, phone, referral, notes, status) VALUES
(1, 'Dog', 'Bella', '28', 'Golden Retriever', 'USA', 'Los Angeles', 'United Kingdom', 'London', '2026-08-15', 'cargo', 'John Doe', 'john.doe@example.com', '+1 555-0199', 'Google Search', 'Bella is very friendly and travels well.', 'approved');

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('quote_requests', 'id'), 1);

-- 9. Contact Messages Seeding (Sample message in the admin panel)
INSERT INTO contact_messages (id, name, email, phone, subject, message) VALUES
(1, 'Jane Smith', 'jane.smith@example.com', '+1 555-0144', 'Question about crate sizes', 'Hello, I have a large Great Dane and want to know if you can supply custom-sized wooden crates for international travel. Thank you!');

-- Adjust the sequence
SELECT setval(pg_get_serial_sequence('contact_messages', 'id'), 1);
