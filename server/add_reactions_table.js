const mysql = require('mysql2/promise');
require('dotenv').config();

async function addReactionsTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    // Create event_reactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        emoji VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reaction (event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "event_reactions" created or already exists.');

    await connection.end();
  } catch (error) {
    console.error('Error creating reactions table:', error);
  }
}

addReactionsTable();
