const mysql = require('mysql2/promise');
require('dotenv').config();

async function createRemainingTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server.');

    // 1. Create alumni table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alumni (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_year VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "alumni" created.');

    const [alumniRows] = await connection.query('SELECT COUNT(*) as count FROM alumni');
    if (alumniRows[0].count === 0) {
      const initialAlumni = [
        ['2006', 'Anil Kumar'], ['2006', 'Bharath S'], ['2006', 'Chetan M'], ['2006', 'Deepa K'],
        ['2007', 'Eshwar P'], ['2007', 'Farooq H'], ['2007', 'Gowri V'], ['2007', 'Harish L']
      ];
      for (const a of initialAlumni) {
        await connection.query('INSERT INTO alumni (batch_year, name) VALUES (?, ?)', a);
      }
      console.log('Pre-populated dummy alumni.');
    }

    // 2. Create events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        description TEXT NOT NULL,
        image TEXT,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "events" created.');

    const [eventRows] = await connection.query('SELECT COUNT(*) as count FROM events');
    if (eventRows[0].count === 0) {
      const dummyEvents = [
        ['Annual Day Celebrations', '2024-05-15', 'Join us for a grand celebration of our annual day with cultural programs and prize distribution.', '', 'upcoming'],
        ['Science Exhibition', '2024-06-10', 'Students will showcase their innovative projects and experiments.', '', 'upcoming'],
        ['Sports Meet 2023', '2023-12-20', 'Annual sports meet with various track and field events.', 'https://images.unsplash.com/photo-1511871893393-82e9c16b81e3?auto=format&fit=crop&q=80&w=1000', 'past'],
        ['Republic Day Parade', '2024-01-26', 'Flag hoisting ceremony and patriotic cultural events.', 'https://images.unsplash.com/photo-1599408162449-3669146f3456?auto=format&fit=crop&q=80&w=1000', 'past']
      ];
      for (const e of dummyEvents) {
        await connection.query('INSERT INTO events (title, event_date, description, image, type) VALUES (?, ?, ?, ?, ?)', e);
      }
      console.log('Pre-populated dummy events.');
    }

    // 3. Create results table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        percentage VARCHAR(50) NOT NULL,
        grade VARCHAR(10) NOT NULL,
        batch_year VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "results" created.');

    const [resultRows] = await connection.query('SELECT COUNT(*) as count FROM results');
    if (resultRows[0].count === 0) {
      const dummyResults = [
        ['Abhishek G', '98.5%', 'A+', '2023-24'],
        ['Bhoomika S', '96.2%', 'A+', '2023-24'],
        ['Charan Raj', '94.8%', 'A', '2023-24'],
        ['Deepa H', '95.5%', 'A+', '2022-23'],
        ['Eshwar M', '93.1%', 'A', '2022-23']
      ];
      for (const r of dummyResults) {
        await connection.query('INSERT INTO results (student_name, percentage, grade, batch_year) VALUES (?, ?, ?, ?)', r);
      }
      console.log('Pre-populated dummy results.');
    }

    console.log('Table creation complete.');
    await connection.end();
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createRemainingTables();
