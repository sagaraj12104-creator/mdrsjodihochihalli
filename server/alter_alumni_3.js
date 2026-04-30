const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

async function alterTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    await connection.query('ALTER TABLE alumni ADD COLUMN user_id INT DEFAULT NULL');
    console.log('Column "user_id" added to alumni table.');

    await connection.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column "user_id" already exists.');
    } else {
      console.error('Error altering table:', error);
    }
  }
}

alterTable();
