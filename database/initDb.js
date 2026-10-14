import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
  let connection;
  try {
    console.log('Connecting to the configured MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    console.log('★ Connected to MySQL server successfully!');
    const sqlFilePath = path.join(__dirname, 'schema.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf-8');

    console.log('★ Executing Smart Campus Lost & Found schema (tables, relationships, and seed records)...');
    await connection.query(sqlScript);

    console.log('★ Database and tables created & seeded successfully!');
    await connection.query('USE smart_campus_db');

    const [items] = await connection.query('SELECT id, name, location, status, branch FROM lost_found_items LIMIT 8');
    console.log('\n★ Sample Seeded Campus Records:');
    console.table(items);
  } catch (error) {
    console.error(`★ Database Initialization Notice: ${error.message}`);
    console.log('★ Make sure MySQL service (e.g. MySQL80) is running and .env credentials are correct.');
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
