const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "users" created or already exists.');

    // Pre-populate admin user if not exists
    const [adminRows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (adminRows.length === 0) {
      await connection.query('INSERT INTO users (username, email, password, isAdmin) VALUES (?, ?, ?, ?)', ['admin', 'admin@mdrs.edu', 'admin123', true]);
      console.log('Admin user created.');
    }

    // Create staff table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        experience VARCHAR(255) NOT NULL,
        photo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "staff" created or already exists.');

    // Pre-populate dummy staff if empty
    const [staffRows] = await connection.query('SELECT COUNT(*) as count FROM staff');
    if (staffRows[0].count === 0) {
      const dummyStaff = [
        ['Shri. Ramesh Kumar', 'Principal', '20 Years', 'https://i.pravatar.cc/150?u=1'],
        ['Smt. Lakshmi Devi', 'Vice Principal & Science', '15 Years', 'https://i.pravatar.cc/150?u=2'],
        ['Shri. Suresh Babu', 'Mathematics Teacher', '12 Years', 'https://i.pravatar.cc/150?u=3'],
        ['Smt. Geetha S', 'Social Science Teacher', '10 Years', 'https://i.pravatar.cc/150?u=4']
      ];
      for (const s of dummyStaff) {
        await connection.query('INSERT INTO staff (name, role, experience, photo) VALUES (?, ?, ?, ?)', s);
      }
      console.log('Dummy staff created.');
    }

    console.log('Table creation complete.');
    await connection.end();
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();
