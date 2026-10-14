/**
 * ============================================================================
 * SMART CAMPUS LOST & FOUND - EXPRESS-MYSQL DATABASE LAYER (db.js)
 * Database access and application data operations.
 * ============================================================================
 * Handles account, report, category, claim, conversation, and audit data.
 * ============================================================================
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

dotenv.config();
const scrypt = promisify(scryptCallback);

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_campus_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isConnected = false;
let connectionError = null;

// ============================================================================
// Initial Seed Data (Used for MySQL initialization & In-Memory Fallback)
// ============================================================================
const initialCategories = [
  { category_id: 1, name: "Electronics & Gadgets", description: "Laptops, phones, tablets, smartwatches, calculators, and chargers.", icon: "💻" },
  { category_id: 2, name: "Wallets & Identification", description: "Wallets, purses, campus ID cards, driver licenses, and travel passes.", icon: "💳" },
  { category_id: 3, name: "Academic Materials", description: "Textbooks, lab manuals, notebooks, stationery pouches, and project files.", icon: "📚" },
  { category_id: 4, name: "Personal & Campus Gear", description: "Backpacks, water bottles, umbrellas, jackets, and sports equipment.", icon: "🎒" },
  { category_id: 5, name: "Lab & Workshop Equipment", description: "Multimeters, engineering drawing instruments, Arduino kits, and safety gear.", icon: "🔬" }
];

const initialItems = [
  {
    id: 1,
    reported_by_user_id: 1,
    category_id: 1,
    name: "MacBook Air M2 (Space Grey)",
    location: "CSE Block Room 302",
    status: "Lost",
    studentName: "Ananya Sharma",
    branch: "CSE",
    admissionNumber: "CSE2024001",
    contactInfo: "ananya.s@campus.edu",
    estimated_value: 1199.00,
    reportedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 2,
    category_id: 2,
    name: "Brown Leather Wallet with Metro Pass",
    location: "Central Library 2nd Floor",
    status: "Found",
    studentName: "Rahul Verma",
    branch: "ECE",
    admissionNumber: "ECE2024014",
    contactInfo: "rahul.v@campus.edu",
    estimated_value: 45.00,
    reportedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 3,
    category_id: 2,
    name: "Official College ID Card",
    location: "Main Auditorium Row G",
    status: "Lost",
    studentName: "Meera Nair",
    branch: "IT",
    admissionNumber: "IT2024022",
    contactInfo: "meera.n@campus.edu",
    estimated_value: 10.00,
    reportedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 4,
    category_id: 1,
    name: "Casio FX-991EX Scientific Calculator",
    location: "Mechanical Engineering Lab 1",
    status: "Found",
    studentName: "Karthik Raja",
    branch: "MECH",
    admissionNumber: "MECH2024035",
    contactInfo: "karthik.r@campus.edu",
    estimated_value: 30.00,
    reportedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 5,
    category_id: 4,
    name: "Navy Blue Campus Backpack",
    location: "Cafeteria Table 12",
    status: "Claimed",
    studentName: "Sneha Patel",
    branch: "CIVIL",
    admissionNumber: "CIV2024019",
    contactInfo: "sneha.p@campus.edu",
    estimated_value: 50.00,
    reportedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 6,
    category_id: 1,
    name: "Apple AirPods Pro (2nd Gen) in Case",
    location: "Sports Complex Gym Area",
    status: "Lost",
    studentName: "Vikram Rao",
    branch: "EEE",
    admissionNumber: "EEE2024040",
    contactInfo: "vikram.r@campus.edu",
    estimated_value: 249.00,
    reportedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 7,
    category_id: 3,
    name: "Data Structures & Algorithms Textbook",
    location: "Reading Hall Desk 15",
    status: "Found",
    studentName: "Divya Sundaram",
    branch: "CSE",
    admissionNumber: "CSE2024078",
    contactInfo: "divya.s@campus.edu",
    estimated_value: 65.00,
    reportedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 8,
    category_id: 5,
    name: "Digital Multimeter & Probe Kit",
    location: "Electronics Workshop Bench 4",
    status: "Lost",
    studentName: "Aditya Joshi",
    branch: "ECE",
    admissionNumber: "ECE2024062",
    contactInfo: "aditya.j@campus.edu",
    estimated_value: 40.00,
    reportedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

const initialClaims = [
  {
    claim_id: 1,
    item_id: 5,
    claimant_name: "Sneha Patel",
    claimant_admission: "CIV2024019",
    claimant_contact: "sneha.p@campus.edu",
    proof_description: "Has university keychain attached and contains civil engineering drawing sheets.",
    status: "Approved",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    claim_id: 2,
    item_id: 2,
    claimant_name: "Arjun Menon",
    claimant_admission: "ECE2024089",
    claimant_contact: "arjun.m@campus.edu",
    proof_description: "Contains driving license with name Arjun Menon and metro transit smart card.",
    status: "Pending",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

const initialAuditLogs = [
  {
    log_id: 1,
    action: "DATABASE_INITIALIZED",
    table_name: "system",
    record_id: null,
    details: "Smart Campus Lost & Found database initialized.",
    created_at: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    log_id: 2,
    action: "REPORT_CREATED",
    table_name: "lost_found_items",
    record_id: 1,
    details: 'New report created: "MacBook Air M2 (Space Grey)" [Lost] in CSE Block Room 302 by Ananya Sharma (CSE).',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    log_id: 3,
    action: "CLAIM_APPROVED",
    table_name: "lost_found_items",
    record_id: 5,
    details: 'Item "Navy Blue Campus Backpack" (ID #5) successfully verified and claimed by Sneha Patel (CIV2024019).',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString()
  }
];

// Fallback in-memory state
let memCategories = JSON.parse(JSON.stringify(initialCategories));
let memItems = JSON.parse(JSON.stringify(initialItems));
let memClaims = JSON.parse(JSON.stringify(initialClaims));
let memAuditLogs = JSON.parse(JSON.stringify(initialAuditLogs));
let memUsers = [];
let memConversations = [];
let memMessages = [];
let nextItemId = 9;
let nextCategoryId = 6;
let nextClaimId = 3;
let nextLogId = 4;
let nextUserId = 1;
let nextConversationId = 1;
let nextMessageId = 1;

function addMemAuditLog(action, table_name, record_id, details) {
  const log = {
    log_id: nextLogId++,
    action,
    table_name,
    record_id,
    details,
    created_at: new Date().toISOString()
  };
  memAuditLogs.unshift(log);
  return log;
}

/**
 * [DATABASE DRIVER INITIALIZATION]: Connects to MySQL using mysql2
 */
export async function initDatabaseConnection() {
  try {
    console.log(`[MySQL Driver] Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as '${dbConfig.user}'...`);

    // The configured database and least-privilege user must already exist.
    pool = mysql.createPool(dbConfig);
    await pool.query('SELECT 1');

    if (process.env.NODE_ENV !== 'production') {
      // Local setup conveniences. Production schema is installed separately from schema.sql.

    // Step 3: Run DDL statements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(20) DEFAULT '📦',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash VARCHAR(128) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
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
        CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_item_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB;
    `);

    const [ownerColumn] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lost_found_items' AND COLUMN_NAME = 'reported_by_user_id'
    `);
    if (!ownerColumn.length) {
      await pool.query('ALTER TABLE lost_found_items ADD COLUMN reported_by_user_id INT NULL');
      await pool.query(`ALTER TABLE lost_found_items ADD CONSTRAINT fk_item_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS claim_requests (
        claim_id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        claimant_name VARCHAR(255) NOT NULL,
        claimant_admission VARCHAR(100) NOT NULL,
        claimant_contact VARCHAR(255) NOT NULL,
        proof_description TEXT NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_claim_item FOREIGN KEY (item_id) REFERENCES lost_found_items(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id INT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
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
    `);

    await pool.query(`
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
    `);

    // Seed if empty
    const [catCount] = await pool.query('SELECT COUNT(*) AS total FROM categories');
    if (catCount[0].total === 0) {
      for (const cat of initialCategories) {
        await pool.query('INSERT INTO categories (category_id, name, description, icon) VALUES (?, ?, ?, ?)',
          [cat.category_id, cat.name, cat.description, cat.icon]);
      }
      for (const it of initialItems) {
        await pool.query(
          `INSERT INTO lost_found_items (id, category_id, name, location, status, studentName, branch, admissionNumber, contactInfo, estimated_value)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [it.id, it.category_id, it.name, it.location, it.status, it.studentName, it.branch, it.admissionNumber, it.contactInfo, it.estimated_value]
        );
      }
      for (const cl of initialClaims) {
        await pool.query(
          `INSERT INTO claim_requests (claim_id, item_id, claimant_name, claimant_admission, claimant_contact, proof_description, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cl.claim_id, cl.item_id, cl.claimant_name, cl.claimant_admission, cl.claimant_contact, cl.proof_description, cl.status]
        );
      }
      for (const log of initialAuditLogs) {
        await pool.query('INSERT INTO audit_logs (log_id, action, table_name, record_id, details) VALUES (?, ?, ?, ?, ?)',
          [log.log_id, log.action, log.table_name, log.record_id, log.details]);
      }
      console.log(`[MySQL Driver] Seeded initial campus categories, items, claims & audit logs.`);
    }

    }

    isConnected = true;
    connectionError = null;
    console.log(`[MySQL Driver] SUCCESS: Connected to MySQL database '${dbConfig.database}' using mysql2 driver.`);
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.warn(`[MySQL Driver] Notice: MySQL server connection unavailable (${err.message}).`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Production database connection is required: ${err.message}`);
    }
    console.warn('[MySQL Driver] Running in temporary development mode; changes will not persist.');
  }
}

export async function createUser({ name, email, password, role = 'student' }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanName.length < 2 || cleanName.length > 120) throw new Error('Enter a name between 2 and 120 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) throw new Error('Password must be between 12 and 200 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  const assignedRole = role === 'admin' ? 'admin' : 'student';
  if (isConnected && pool) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, hash, salt, assignedRole]
    );
    return { user_id: result.insertId, name: cleanName, email: cleanEmail, role: assignedRole };
  }

  if (memUsers.some(u => u.email === cleanEmail)) {
    const err = new Error('An account with this email already exists.');
    err.code = 'ER_DUP_ENTRY';
    throw err;
  }
  const user = {
    user_id: nextUserId++,
    name: cleanName,
    email: cleanEmail,
    password_hash: hash,
    password_salt: salt,
    role: assignedRole,
    created_at: new Date().toISOString()
  };
  memUsers.push(user);
  return { user_id: user.user_id, name: user.name, email: user.email, role: user.role };
}

export async function verifyUserPassword(email, password) {
  if (typeof password !== 'string' || password.length > 200) return null;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (isConnected && pool) {
    const [rows] = await pool.query(
      'SELECT user_id, name, email, password_hash, password_salt, role FROM users WHERE email = ?',
      [cleanEmail]
    );
    if (!rows.length) return null;
    const row = rows[0];
    const candidate = Buffer.from((await scrypt(password, row.password_salt, 64)).toString('hex'), 'hex');
    const expected = Buffer.from(row.password_hash, 'hex');
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
    return { user_id: row.user_id, name: row.name, email: row.email, role: row.role };
  }

  const user = memUsers.find(u => u.email === cleanEmail);
  if (!user) return null;
  const candidate = Buffer.from((await scrypt(password, user.password_salt, 64)).toString('hex'), 'hex');
  const expected = Buffer.from(user.password_hash, 'hex');
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  return { user_id: user.user_id, name: user.name, email: user.email, role: user.role };
}

export async function ensureAdminAccount() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password && process.env.NODE_ENV !== 'production') return;
  if (!email || !password || password.length < 16) throw new Error('Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.');
  const name = process.env.ADMIN_NAME || 'Campus Administrator';

  if (isConnected && pool) {
    const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      await createUser({ name, email, password, role: 'admin' });
      return;
    }
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64)).toString('hex');
    await pool.query("UPDATE users SET name = ?, password_hash = ?, password_salt = ?, role = 'admin' WHERE user_id = ?",
      [name, hash, salt, rows[0].user_id]);
    return;
  }

  const existing = memUsers.find(u => u.email === email);
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  if (!existing) {
    memUsers.push({
      user_id: nextUserId++,
      name,
      email,
      password_hash: hash,
      password_salt: salt,
      role: 'admin',
      created_at: new Date().toISOString()
    });
  } else {
    existing.name = name;
    existing.password_hash = hash;
    existing.password_salt = salt;
    existing.role = 'admin';
  }
}

/**
 * Database health and driver status
 */
export async function getDatabaseStatus() {
  return {
    driver: 'mysql2',
    connected: isConnected,
    mode: isConnected ? 'MySQL Relational Database (Connected)' : 'Resilient In-Memory Relational Engine (Offline Fallback)',
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    error: connectionError,
    activeTables: ['users', 'categories', 'lost_found_items', 'claim_requests', 'item_conversations', 'item_messages', 'audit_logs'],
    itemCount: isConnected && pool ? (await pool.query('SELECT COUNT(*) AS c FROM lost_found_items'))[0][0].c : memItems.length,
    claimCount: isConnected && pool ? (await pool.query('SELECT COUNT(*) AS c FROM claim_requests'))[0][0].c : memClaims.length
  };
}

// ============================================================================
// CATEGORIES CRUD (1:N Parent Table)
// ============================================================================

export async function getAllCategories() {
  if (isConnected && pool) {
    const [rows] = await pool.query(`
      SELECT c.*, COUNT(i.id) AS item_count 
      FROM categories c 
      LEFT JOIN lost_found_items i ON c.category_id = i.category_id 
      GROUP BY c.category_id 
      ORDER BY c.category_id ASC
    `);
    return rows;
  }

  return memCategories.map(c => {
    const itemCount = memItems.filter(i => i.category_id === c.category_id).length;
    return { ...c, item_count: itemCount };
  });
}

export async function createCategory(data) {
  const name = data.name?.trim();
  const description = data.description?.trim() || '';
  const icon = data.icon?.trim() || '📦';

  if (!name) throw new Error("Category name is required");

  if (isConnected && pool) {
    const [res] = await pool.query(
      'INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)',
      [name, description, icon]
    );
    await pool.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
      ['CATEGORY_CREATED', 'categories', res.insertId, `Category "${name}" was created.`]);
    const [inserted] = await pool.query('SELECT * FROM categories WHERE category_id = ?', [res.insertId]);
    return inserted[0];
  }

  const existing = memCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) throw new Error(`Category "${name}" already exists (UNIQUE constraint violation)`);

  const newCat = {
    category_id: nextCategoryId++,
    name,
    description,
    icon,
    created_at: new Date().toISOString()
  };
  memCategories.push(newCat);
  addMemAuditLog('CATEGORY_CREATED', 'categories', newCat.category_id, `Category "${name}" created.`);
  return newCat;
}

export async function deleteCategory(categoryId) {
  const catId = parseInt(categoryId, 10);

  if (isConnected && pool) {
    const [existing] = await pool.query('SELECT * FROM categories WHERE category_id = ?', [catId]);
    if (!existing.length) return null;
    await pool.query('DELETE FROM categories WHERE category_id = ?', [catId]);
    await pool.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
      ['CATEGORY_DELETED', 'categories', catId, `Category "${existing[0].name}" was deleted.`]);
    return existing[0];
  }

  const idx = memCategories.findIndex(c => c.category_id === catId);
  if (idx === -1) return null;
  const deleted = memCategories.splice(idx, 1)[0];
  // ON DELETE SET NULL emulation
  memItems.forEach(item => {
    if (item.category_id === catId) item.category_id = null;
  });
  addMemAuditLog('CATEGORY_DELETED', 'categories', catId, `Category #${catId} deleted (Items updated with category_id = NULL via ON DELETE SET NULL).`);
  return deleted;
}

// ============================================================================
// LOST & FOUND ITEMS CRUD (1:N Child Table)
// ============================================================================

export async function getAllItems({ status, search, branch, categoryId }) {
  if (isConnected && pool) {
    let sql = `
      SELECT i.*, c.name AS category_name, c.icon AS category_icon 
      FROM lost_found_items i 
      LEFT JOIN categories c ON i.category_id = c.category_id 
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      sql += ' AND i.status = ?';
      params.push(status);
    }
    if (branch && branch !== 'All') {
      sql += ' AND i.branch = ?';
      params.push(branch);
    }
    if (categoryId && categoryId !== 'All') {
      sql += ' AND i.category_id = ?';
      params.push(parseInt(categoryId, 10));
    }
    if (search) {
      sql += ' AND (i.name LIKE ? OR i.location LIKE ? OR i.studentName LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    sql += ' ORDER BY i.id DESC';

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  // Fallback in-memory
  let items = memItems.map(item => {
    const cat = memCategories.find(c => c.category_id === item.category_id);
    return {
      ...item,
      category_name: cat ? cat.name : 'General Belongings',
      category_icon: cat ? cat.icon : '📦'
    };
  });

  if (status && status !== 'All') {
    items = items.filter(i => i.status.toLowerCase() === status.toLowerCase());
  }
  if (branch && branch !== 'All') {
    items = items.filter(i => i.branch.toLowerCase() === branch.toLowerCase());
  }
  if (categoryId && categoryId !== 'All') {
    items = items.filter(i => i.category_id === parseInt(categoryId, 10));
  }
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      i.studentName.toLowerCase().includes(q)
    );
  }
  return items.sort((a, b) => b.id - a.id);
}

export async function getItemById(id) {
  const numericId = parseInt(id, 10);
  if (isConnected && pool) {
    const [rows] = await pool.query(`
      SELECT i.*, c.name AS category_name, c.icon AS category_icon 
      FROM lost_found_items i 
      LEFT JOIN categories c ON i.category_id = c.category_id 
      WHERE i.id = ?
    `, [numericId]);
    return rows.length ? rows[0] : null;
  }

  const item = memItems.find(i => i.id === numericId);
  if (!item) return null;
  const cat = memCategories.find(c => c.category_id === item.category_id);
  return {
    ...item,
    category_name: cat ? cat.name : 'General Belongings',
    category_icon: cat ? cat.icon : '📦'
  };
}

export async function createItem(data, reporterUserId) {
  const name = data.name?.trim();
  const location = data.location?.trim();
  const studentName = data.studentName?.trim();
  const status = data.status === 'Found' ? 'Found' : 'Lost';
  const branch = data.branch?.trim() || 'CSE';
  const admissionNumber = data.admissionNumber?.trim() || 'Not provided';
  const contactInfo = data.contactInfo?.trim() || '';
  const category_id = data.category_id ? parseInt(data.category_id, 10) : null;
  const estimated_value = data.estimated_value ? parseFloat(data.estimated_value) : 25.00;

  if (!name || !location || !studentName) {
    throw new Error("Missing required fields: 'name', 'location', and 'studentName' are required.");
  }

  if (isConnected && pool) {
    const [res] = await pool.query(`
      INSERT INTO lost_found_items (reported_by_user_id, category_id, name, location, status, studentName, branch, admissionNumber, contactInfo, estimated_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [reporterUserId || null, category_id, name, location, status, studentName, branch, admissionNumber, contactInfo, estimated_value]);
    await pool.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
      ['REPORT_CREATED', 'lost_found_items', res.insertId, `A ${status.toLowerCase()} report for "${name}" was created.`]);
    return await getItemById(res.insertId);
  }

  const newItem = {
    id: nextItemId++,
    reported_by_user_id: reporterUserId || null,
    category_id,
    name,
    location,
    status,
    studentName,
    branch,
    admissionNumber,
    contactInfo,
    estimated_value,
    reportedAt: new Date().toISOString()
  };

  memItems.unshift(newItem);
  addMemAuditLog('REPORT_CREATED', 'lost_found_items', newItem.id,
    `New report created: "${name}" [${status}] at ${location} by ${studentName} (${branch}).`);

  return getItemById(newItem.id);
}

export async function updateItem(id, updates) {
  const numericId = parseInt(id, 10);
  if (updates.status !== undefined && !['Lost', 'Found', 'Claimed'].includes(updates.status)) {
    throw new Error('Choose a valid report status.');
  }

  if (isConnected && pool) {
    const existing = await getItemById(numericId);
    if (!existing) return null;
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name.trim()); }
    if (updates.location !== undefined) { fields.push('location = ?'); values.push(updates.location.trim()); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.studentName !== undefined) { fields.push('studentName = ?'); values.push(updates.studentName.trim()); }
    if (updates.branch !== undefined) { fields.push('branch = ?'); values.push(updates.branch.trim()); }
    if (updates.admissionNumber !== undefined) { fields.push('admissionNumber = ?'); values.push(updates.admissionNumber.trim()); }
    if (updates.contactInfo !== undefined) { fields.push('contactInfo = ?'); values.push(updates.contactInfo.trim()); }
    if (updates.category_id !== undefined) { fields.push('category_id = ?'); values.push(updates.category_id ? parseInt(updates.category_id, 10) : null); }
    if (updates.estimated_value !== undefined) { fields.push('estimated_value = ?'); values.push(parseFloat(updates.estimated_value)); }

    if (fields.length === 0) return await getItemById(numericId);

    values.push(numericId);
    await pool.query(`UPDATE lost_found_items SET ${fields.join(', ')} WHERE id = ?`, values);
    await pool.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
      ['REPORT_UPDATED', 'lost_found_items', numericId, `Report #${numericId} was updated.`]);
    return await getItemById(numericId);
  }

  const idx = memItems.findIndex(i => i.id === numericId);
  if (idx === -1) return null;

  const old = memItems[idx];
  const oldStatus = old.status;
  const oldLoc = old.location;

  memItems[idx] = {
    ...old,
    ...updates,
    id: numericId
  };

  if (updates.status && updates.status !== oldStatus) {
    addMemAuditLog('REPORT_UPDATED', 'lost_found_items', numericId,
      `Report #${numericId} modified: Status (${oldStatus} -> ${updates.status}), Location (${oldLoc} -> ${memItems[idx].location})`);
  }

  return getItemById(numericId);
}

export async function deleteItem(id) {
  const numericId = parseInt(id, 10);

  if (isConnected && pool) {
    const existing = await getItemById(numericId);
    if (!existing) return null;
    await pool.query('DELETE FROM lost_found_items WHERE id = ?', [numericId]);
    await pool.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
      ['REPORT_DELETED', 'lost_found_items', numericId, `Report #${numericId} ("${existing.name}") was deleted.`]);
    return existing;
  }

  const idx = memItems.findIndex(i => i.id === numericId);
  if (idx === -1) return null;
  const deleted = memItems.splice(idx, 1)[0];

  // ON DELETE CASCADE emulation for claims
  memClaims = memClaims.filter(c => c.item_id !== numericId);

  addMemAuditLog('ITEM_DELETED', 'lost_found_items', numericId, `Item #${numericId} ("${deleted.name}") deleted from database.`);
  return deleted;
}

// ============================================================================
// Claim request workflow
// ============================================================================

/**
 * Atomically creates a pending claim request.
 * Steps:
 * 1. START TRANSACTION
 * 2. Lock item row & verify status != 'Claimed'
 * 3. Insert claim request record
 * 4. Update item status to 'Claimed'
 * 5. Insert audit log
 * 6. COMMIT (or ROLLBACK on failure)
 */
export async function submitClaimTransaction({ item_id, claimant_name, claimant_admission, claimant_contact, proof_description }) {
  const itemId = Number.parseInt(item_id, 10);
  const name = String(claimant_name || '').trim();
  const admission = String(claimant_admission || '').trim();
  const proof = String(proof_description || '').trim();
  if (!Number.isInteger(itemId) || itemId < 1 || name.length < 2 || admission.length < 2 || proof.length < 8) {
    throw new Error('Provide valid item, claimant, admission number, and ownership proof details.');
  }

  if (isConnected && pool) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [items] = await connection.query('SELECT id, name, status FROM lost_found_items WHERE id = ? FOR UPDATE', [itemId]);
      if (!items.length) throw new Error('This item report no longer exists.');
      if (items[0].status === 'Claimed') throw new Error('This item has already been returned to its owner.');
      const [result] = await connection.query(
        `INSERT INTO claim_requests (item_id, claimant_name, claimant_admission, claimant_contact, proof_description, status)
         VALUES (?, ?, ?, ?, ?, 'Pending')`,
        [itemId, name, admission, String(claimant_contact || '').trim(), proof]
      );
      await connection.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
        ['CLAIM_SUBMITTED', 'claim_requests', result.insertId, `A claim request was submitted for item #${itemId}.`]);
      await connection.commit();
      return { success: true, message: 'Claim request sent to campus staff for review.', claimId: result.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  const item = memItems.find((record) => record.id === itemId);
  if (!item) throw new Error('This item report no longer exists.');
  if (item.status === 'Claimed') throw new Error('This item has already been returned to its owner.');
  const claim = {
    claim_id: nextClaimId++, item_id: itemId, claimant_name: name,
    claimant_admission: admission, claimant_contact: String(claimant_contact || '').trim(),
    proof_description: proof, status: 'Pending', created_at: new Date().toISOString()
  };
  memClaims.unshift(claim);
  addMemAuditLog('CLAIM_SUBMITTED', 'claim_requests', claim.claim_id, `A claim request was submitted for item #${itemId}.`);
  return { success: true, message: 'Claim request sent to campus staff for review.', claimId: claim.claim_id };
}

export async function reviewClaim(claimId, decision) {
  const id = Number.parseInt(claimId, 10);
  if (!Number.isInteger(id) || !['Approved', 'Rejected'].includes(decision)) throw new Error('Choose a valid claim decision.');
  if (isConnected && pool) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [claims] = await connection.query('SELECT * FROM claim_requests WHERE claim_id = ? FOR UPDATE', [id]);
      if (!claims.length) throw new Error('Claim request not found.');
      if (claims[0].status !== 'Pending') throw new Error('This claim has already been reviewed.');
      const [items] = await connection.query('SELECT id, name, status FROM lost_found_items WHERE id = ? FOR UPDATE', [claims[0].item_id]);
      if (!items.length) throw new Error('The item report no longer exists.');
      if (decision === 'Approved' && items[0].status === 'Claimed') throw new Error('This item has already been claimed.');
      await connection.query('UPDATE claim_requests SET status = ? WHERE claim_id = ?', [decision, id]);
      if (decision === 'Approved') await connection.query("UPDATE lost_found_items SET status = 'Claimed' WHERE id = ?", [items[0].id]);
      await connection.query('INSERT INTO audit_logs (action, table_name, record_id, details) VALUES (?, ?, ?, ?)',
        [`CLAIM_${decision.toUpperCase()}`, 'claim_requests', id, `Claim #${id} was ${decision.toLowerCase()} by campus staff.`]);
      await connection.commit();
      return { success: true, message: `Claim ${decision.toLowerCase()}.` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  const claim = memClaims.find((record) => record.claim_id === id);
  if (!claim) throw new Error('Claim request not found.');
  if (claim.status !== 'Pending') throw new Error('This claim has already been reviewed.');
  const item = memItems.find((record) => record.id === claim.item_id);
  if (!item) throw new Error('The item report no longer exists.');
  if (decision === 'Approved' && item.status === 'Claimed') throw new Error('This item has already been claimed.');
  claim.status = decision;
  if (decision === 'Approved') item.status = 'Claimed';
  addMemAuditLog(`CLAIM_${decision.toUpperCase()}`, 'claim_requests', id, `Claim #${id} was ${decision.toLowerCase()} by campus staff.`);
  return { success: true, message: `Claim ${decision.toLowerCase()}.` };
}
export async function getAllClaims() {
  if (isConnected && pool) {
    const [rows] = await pool.query(`
      SELECT cr.*, i.name AS item_name, i.location, i.branch 
      FROM claim_requests cr 
      INNER JOIN lost_found_items i ON cr.item_id = i.id 
      ORDER BY cr.claim_id DESC
    `);
    return rows;
  }

  return memClaims.map(c => {
    const it = memItems.find(i => i.id === c.item_id);
    return {
      ...c,
      item_name: it ? it.name : 'Unknown Item',
      location: it ? it.location : 'N/A',
      branch: it ? it.branch : 'N/A'
    };
  }).sort((a, b) => b.claim_id - a.claim_id);
}

export async function openItemConversation(itemId, userId) {
  const numericItemId = Number.parseInt(itemId, 10);
  const numericUserId = Number.parseInt(userId, 10);
  if (isConnected && pool) {
    const [items] = await pool.query('SELECT id, reported_by_user_id FROM lost_found_items WHERE id = ?', [numericItemId]);
    if (!items.length) throw new Error('Report not found.');
    const ownerId = items[0].reported_by_user_id;
    if (!ownerId) throw new Error('Private messaging is unavailable for this older report.');
    if (Number(ownerId) === numericUserId) {
      const [threads] = await pool.query(`
        SELECT c.conversation_id, c.item_id, u.name AS other_name, u.user_id AS other_user_id
        FROM item_conversations c JOIN users u ON u.user_id = c.student_user_id
        WHERE c.item_id = ? AND c.owner_user_id = ? ORDER BY c.created_at DESC
      `, [numericItemId, numericUserId]);
      return { isOwner: true, conversations: threads };
    }
    const [result] = await pool.query(`
      INSERT INTO item_conversations (item_id, owner_user_id, student_user_id)
      VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE conversation_id = LAST_INSERT_ID(conversation_id)
    `, [numericItemId, ownerId, numericUserId]);
    const conversationId = result.insertId;
    const [threads] = await pool.query(`
      SELECT c.conversation_id, c.item_id, u.name AS other_name, u.user_id AS other_user_id
      FROM item_conversations c JOIN users u ON u.user_id = c.owner_user_id
      WHERE c.conversation_id = ?
    `, [conversationId]);
    return { isOwner: false, conversations: threads };
  }

  const item = memItems.find(i => i.id === numericItemId);
  if (!item) throw new Error('Report not found.');
  const ownerId = item.reported_by_user_id;
  if (!ownerId) throw new Error('Private messaging is unavailable for this older report.');
  if (Number(ownerId) === numericUserId) {
    const threads = memConversations
      .filter(c => c.item_id === numericItemId && c.owner_user_id === numericUserId)
      .map(c => {
        const student = memUsers.find(u => u.user_id === c.student_user_id);
        return { conversation_id: c.conversation_id, item_id: c.item_id, other_name: student?.name || 'Student', other_user_id: c.student_user_id };
      });
    return { isOwner: true, conversations: threads };
  }

  let conv = memConversations.find(c => c.item_id === numericItemId && c.student_user_id === numericUserId);
  if (!conv) {
    conv = {
      conversation_id: nextConversationId++,
      item_id: numericItemId,
      owner_user_id: ownerId,
      student_user_id: numericUserId,
      created_at: new Date().toISOString()
    };
    memConversations.push(conv);
  }
  const owner = memUsers.find(u => u.user_id === conv.owner_user_id);
  const threads = [{ conversation_id: conv.conversation_id, item_id: conv.item_id, other_name: owner?.name || 'Reporter', other_user_id: conv.owner_user_id }];
  return { isOwner: false, conversations: threads };
}

export async function getConversationMessages(conversationId, userId) {
  const convId = Number.parseInt(conversationId, 10);
  const uid = Number.parseInt(userId, 10);
  if (isConnected && pool) {
    const [threads] = await pool.query(`
      SELECT conversation_id, owner_user_id, student_user_id FROM item_conversations
      WHERE conversation_id = ? AND (owner_user_id = ? OR student_user_id = ?)
    `, [convId, uid, uid]);
    if (!threads.length) throw new Error('Conversation not found.');
    const [messages] = await pool.query(`
      SELECT m.message_id, m.sender_user_id, u.name AS sender_name, m.body, m.created_at
      FROM item_messages m JOIN users u ON u.user_id = m.sender_user_id
      WHERE m.conversation_id = ? ORDER BY m.created_at ASC, m.message_id ASC
    `, [convId]);
    return messages;
  }

  const conv = memConversations.find(c => c.conversation_id === convId && (c.owner_user_id === uid || c.student_user_id === uid));
  if (!conv) throw new Error('Conversation not found.');
  return memMessages
    .filter(m => m.conversation_id === convId)
    .map(m => {
      const sender = memUsers.find(u => u.user_id === m.sender_user_id);
      return { message_id: m.message_id, sender_user_id: m.sender_user_id, sender_name: sender?.name || 'User', body: m.body, created_at: m.created_at };
    });
}

export async function sendConversationMessage(conversationId, userId, body) {
  const convId = Number.parseInt(conversationId, 10);
  const uid = Number.parseInt(userId, 10);
  const message = String(body || '').trim();
  if (!message || message.length > 2000) throw new Error('Message must contain 1 to 2,000 characters.');

  if (isConnected && pool) {
    const [threads] = await pool.query(`
      SELECT conversation_id FROM item_conversations
      WHERE conversation_id = ? AND (owner_user_id = ? OR student_user_id = ?)
    `, [convId, uid, uid]);
    if (!threads.length) throw new Error('Conversation not found.');
    await pool.query('INSERT INTO item_messages (conversation_id, sender_user_id, body) VALUES (?, ?, ?)', [convId, uid, message]);
    return { success: true };
  }

  const conv = memConversations.find(c => c.conversation_id === convId && (c.owner_user_id === uid || c.student_user_id === uid));
  if (!conv) throw new Error('Conversation not found.');
  memMessages.push({
    message_id: nextMessageId++,
    conversation_id: convId,
    sender_user_id: uid,
    body: message,
    created_at: new Date().toISOString()
  });
  return { success: true };
}

// ============================================================================
export async function getAuditLogs(limit = 50) {
  if (isConnected && pool) {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT ?', [limit]);
    return rows;
  }
  return memAuditLogs.slice(0, limit);
}
