-- ============================================================================
-- SMART CAMPUS LOST & FOUND DATABASE SCHEMA
-- Application data for the Smart Campus Lost & Found service.
--
-- Schema and initial records for the application.

-- Step 1: DDL - Database Creation
CREATE DATABASE IF NOT EXISTS smart_campus_db;
USE smart_campus_db;

-- ----------------------------------------------------------------------------
-- Application tables and relationships
-- ----------------------------------------------------------------------------

-- Table 1: Categories (Parent Table: One category contains many lost/found items)
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(20) DEFAULT '📦',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table 2: Lost & Found Items (Child of Categories)
-- Relationships: One Category -> Many Items (1:N)
-- Constraints: NOT NULL, CHECK (estimated_value >= 0), ENUM('Lost', 'Found', 'Claimed')
-- Foreign Key Rule: ON DELETE SET NULL (Deleting a category keeps the items intact)
CREATE TABLE IF NOT EXISTS lost_found_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reported_by_user_id INT NULL,
    category_id INT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('Lost', 'Found', 'Claimed') NOT NULL DEFAULT 'Lost',
    studentName VARCHAR(255) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    admissionNumber VARCHAR(100) NOT NULL,
    contactInfo VARCHAR(255) DEFAULT '',
    estimated_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_value >= 0),
    reportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_item_reporter
        FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Table 3: Claim Requests (Child of Lost & Found Items)
-- Relationships: One Item -> Many Claim Verification Requests (1:N)
-- Constraints: NOT NULL, ENUM('Pending', 'Approved', 'Rejected')
-- Foreign Key Rule: ON DELETE CASCADE (Deleting an item removes associated claims)
CREATE TABLE IF NOT EXISTS claim_requests (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    claimant_name VARCHAR(255) NOT NULL,
    claimant_admission VARCHAR(100) NOT NULL,
    claimant_contact VARCHAR(255) NOT NULL,
    proof_description TEXT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_claim_item
        FOREIGN KEY (item_id) REFERENCES lost_found_items(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS item_conversations (
    conversation_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    owner_user_id INT NOT NULL,
    student_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_student_conversation (item_id, student_user_id),
    FOREIGN KEY (item_id) REFERENCES lost_found_items(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS item_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES item_conversations(conversation_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX ix_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB;

-- Table 4: Activity history
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- Sample records for a fresh installation
-- ----------------------------------------------------------------------------

-- Seed Categories (1:N Parents)
INSERT INTO categories (category_id, name, description, icon) VALUES
(1, 'Electronics & Gadgets', 'Laptops, mobile phones, tablets, smartwatches, calculators, and chargers.', '💻'),
(2, 'Wallets & Identification', 'Wallets, purses, campus ID cards, driver licenses, and travel passes.', '💳'),
(3, 'Academic Materials', 'Textbooks, lab manuals, notebooks, stationery pouches, and project files.', '📚'),
(4, 'Personal & Campus Gear', 'Backpacks, water bottles, umbrellas, jackets, and sports equipment.', '🎒'),
(5, 'Lab & Workshop Equipment', 'Multimeters, engineering drawing instruments, Arduino kits, and safety gear.', '🔬')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), icon=VALUES(icon);

-- Seed Lost & Found Items (1:N Children)
INSERT INTO lost_found_items (id, category_id, name, location, status, studentName, branch, admissionNumber, contactInfo, estimated_value) VALUES
(1, 1, 'MacBook Air M2 (Space Grey)', 'CSE Block Room 302', 'Lost', 'Ananya Sharma', 'CSE', 'CSE2024001', 'ananya.s@campus.edu', 1199.00),
(2, 2, 'Brown Leather Wallet with Metro Pass', 'Central Library 2nd Floor', 'Found', 'Rahul Verma', 'ECE', 'ECE2024014', 'rahul.v@campus.edu', 45.00),
(3, 2, 'Official College ID Card', 'Main Auditorium Row G', 'Lost', 'Meera Nair', 'IT', 'IT2024022', 'meera.n@campus.edu', 10.00),
(4, 1, 'Casio FX-991EX Scientific Calculator', 'Mechanical Engineering Lab 1', 'Found', 'Karthik Raja', 'MECH', 'MECH2024035', 'karthik.r@campus.edu', 30.00),
(5, 4, 'Navy Blue Campus Backpack', 'Cafeteria Table 12', 'Claimed', 'Sneha Patel', 'CIVIL', 'CIV2024019', 'sneha.p@campus.edu', 50.00),
(6, 1, 'Apple AirPods Pro (2nd Gen) in Case', 'Sports Complex Gym Area', 'Lost', 'Vikram Rao', 'EEE', 'EEE2024040', 'vikram.r@campus.edu', 249.00),
(7, 3, 'Data Structures & Algorithms Textbook', 'Reading Hall Desk 15', 'Found', 'Divya Sundaram', 'CSE', 'CSE2024078', 'divya.s@campus.edu', 65.00),
(8, 5, 'Digital Multimeter & Probe Kit', 'Electronics Workshop Bench 4', 'Lost', 'Aditya Joshi', 'ECE', 'ECE2024062', 'aditya.j@campus.edu', 40.00)
ON DUPLICATE KEY UPDATE name=VALUES(name), location=VALUES(location), status=VALUES(status);

-- Seed Initial Claim Requests (1:N Children)
INSERT INTO claim_requests (claim_id, item_id, claimant_name, claimant_admission, claimant_contact, proof_description, status) VALUES
(1, 5, 'Sneha Patel', 'CIV2024019', 'sneha.p@campus.edu', 'Has university keychain attached and contains civil engineering drawing sheets.', 'Approved'),
(2, 2, 'Arjun Menon', 'ECE2024089', 'arjun.m@campus.edu', 'Contains driving license with name Arjun Menon and metro transit smart card.', 'Pending')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Seed Initial Audit Logs
INSERT INTO audit_logs (log_id, action, table_name, record_id, details) VALUES
(1, 'DATABASE_INITIALIZED', 'system', NULL, 'Smart Campus Lost & Found relational database schema created for campus reports and claim tracking.'),
(2, 'REPORT_CREATED', 'lost_found_items', 1, 'Report seeded: MacBook Air M2 in CSE Block Room 302.'),
(3, 'CLAIM_APPROVED', 'lost_found_items', 5, 'Item #5 (Navy Blue Campus Backpack) reviewed by campus staff.')
ON DUPLICATE KEY UPDATE action=VALUES(action);

-- ----------------------------------------------------------------------------
