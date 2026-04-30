const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Connect without specifying a database first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Database \`${process.env.DB_NAME}\` created or already exists.`);

    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // Create Memories table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url LONGTEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "memories" created or already exists.');

    // Pre-populate with initial memories if empty
    const [rows] = await connection.query(`SELECT COUNT(*) as count FROM memories`);
    if (rows[0].count === 0) {
      console.log('Pre-populating memories table...');
      const initialMemories = [
        ['https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1471&auto=format&fit=crop', 'School Building'],
        ['https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1470&auto=format&fit=crop', 'Annual Day Function'],
        ['https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=1470&auto=format&fit=crop', 'Science Exhibition'],
        ['https://images.unsplash.com/photo-1577891729319-f4871c6ecdf1?q=80&w=1470&auto=format&fit=crop', 'Sports Meet'],
        ['https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1470&auto=format&fit=crop', 'Classroom Session'],
        ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1473&auto=format&fit=crop', 'Library'],
      ];
      for (const memory of initialMemories) {
        await connection.query(`INSERT INTO memories (url, title) VALUES (?, ?)`, memory);
      }
      console.log('Pre-populated initial memories.');
    }

    console.log('Database setup complete.');
    await connection.end();
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase();
