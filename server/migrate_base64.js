const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const storagePath = 'E:/mdrsMemories';

async function migrate() {
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL. Fetching memories...');
    const [rows] = await connection.query('SELECT * FROM memories');
    let migratedCount = 0;

    for (const row of rows) {
      if (row.url && row.url.startsWith('data:image/')) {
        console.log(`Migrating memory ID: ${row.id}`);
        
        // Extract base64 data and extension
        const matches = row.url.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
          console.error(`Failed to parse base64 for ID ${row.id}`);
          continue;
        }
        
        let ext = matches[1];
        if (ext === 'jpeg') ext = 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        
        const filename = `${uuidv4()}.${ext}`;
        const filePath = path.join(storagePath, filename).replace(/\\/g, '/');
        
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved file: ${filePath}`);
        
        // Update database
        await connection.query('UPDATE memories SET url = ? WHERE id = ?', [filePath, row.id]);
        console.log(`Updated DB for ID ${row.id}`);
        migratedCount++;
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} images.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
