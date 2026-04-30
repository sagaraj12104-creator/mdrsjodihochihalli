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

    await connection.query('ALTER TABLE alumni ADD COLUMN profession VARCHAR(255) DEFAULT NULL');
    console.log('Column "profession" added to alumni table.');
    
    await connection.query('ALTER TABLE alumni ADD COLUMN photo TEXT DEFAULT NULL');
    console.log('Column "photo" added to alumni table.');
    
    await connection.query('ALTER TABLE alumni ADD COLUMN instagram_id VARCHAR(255) DEFAULT NULL');
    console.log('Column "instagram_id" added to alumni table.');

    await connection.end();
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('One or more columns already exist.');
    } else {
      console.error('Error altering table:', error);
    }
  }
}

alterTable();
