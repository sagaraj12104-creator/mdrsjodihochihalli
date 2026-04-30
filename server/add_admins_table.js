const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAdminsTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    // Create admins table (separate from users)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "admins" created or already exists.');

    // Seed default admin if not present
    const [adminRows] = await connection.query('SELECT * FROM admins WHERE username = ?', ['admin']);
    if (adminRows.length === 0) {
      await connection.query(
        'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
        ['admin', 'admin@mdrs.edu', 'admin123']
      );
      console.log('Default admin account seeded into admins table.');
    } else {
      console.log('Admin already exists in admins table, skipping seed.');
    }

    // Remove admin from users table to avoid duplication (optional cleanup)
    const [userAdminRows] = await connection.query('SELECT * FROM users WHERE username = ? AND isAdmin = 1', ['admin']);
    if (userAdminRows.length > 0) {
      await connection.query('DELETE FROM users WHERE username = ? AND isAdmin = 1', ['admin']);
      console.log('Removed admin entry from users table (moved to admins table).');
    }

    console.log('Admin table setup complete.');
    await connection.end();
  } catch (error) {
    console.error('Error setting up admins table:', error);
    if (connection) await connection.end();
  }
}

addAdminsTable();
