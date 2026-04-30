const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- Multer Configuration ---
const storagePath = 'E:/mdrsMemories';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storagePath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png format allowed!'), false);
    }
  }
});

// --- API ENDPOINTS ---

// GET /api/memories
app.get('/api/memories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM memories ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// POST /api/memories
app.post('/api/memories', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { title } = req.body;
    if (!title) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title is required' });
    }

    // Use normalized physical path
    const filePath = req.file.path.replace(/\\/g, '/');

    try {
      const [result] = await pool.query('INSERT INTO memories (url, title) VALUES (?, ?)', [filePath, title]);
      
      const [newMemory] = await pool.query('SELECT * FROM memories WHERE id = ?', [result.insertId]);
      res.status(201).json(newMemory[0]);
    } catch (error) {
      console.error('Error adding memory:', error);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Cleanup file if DB insert fails
      }
      res.status(500).json({ error: 'Failed to add memory' });
    }
  });
});

// GET /api/image
app.get('/api/image', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return res.redirect(filePath);
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// DELETE /api/memories/:id
app.delete('/api/memories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM memories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// --- AUTH ENDPOINTS ---

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // 'admin' username is reserved for the admins table
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'Username "admin" is reserved and cannot be used for signup.' });
  }

  try {
    const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const [result] = await pool.query('INSERT INTO users (username, email, password, isAdmin) VALUES (?, ?, ?, ?)', [username, email, password, false]);
    const [newUser] = await pool.query('SELECT id, username, email, isAdmin FROM users WHERE id = ?', [result.insertId]);
    
    newUser[0].isAdmin = false;
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /api/auth/login
// Checks admins table first, then regular users table
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // --- Check admins table first ---
    const [admins] = await pool.query('SELECT id, username, email, password FROM admins WHERE username = ?', [username]);
    if (admins.length > 0) {
      const admin = admins[0];
      if (admin.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      delete admin.password;
      return res.json({ ...admin, isAdmin: true, role: 'admin' });
    }

    // --- Check regular users table ---
    const [users] = await pool.query('SELECT id, username, email, isAdmin, password FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    delete user.password;
    user.isAdmin = !!user.isAdmin;
    
    res.json(user);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// PUT /api/admins/profile — change admin username and/or password
app.put('/api/admins/profile', async (req, res) => {
  const { admin_id, current_password, new_username, new_password } = req.body;

  if (!admin_id || !current_password) {
    return res.status(400).json({ error: 'Admin ID and current password are required' });
  }
  if (!new_username && !new_password) {
    return res.status(400).json({ error: 'Provide a new username or password to update' });
  }

  try {
    const [admins] = await pool.query('SELECT * FROM admins WHERE id = ?', [admin_id]);
    if (admins.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const admin = admins[0];
    if (admin.password !== current_password) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check new username isn't already taken
    if (new_username && new_username !== admin.username) {
      const [existing] = await pool.query('SELECT id FROM admins WHERE username = ? AND id != ?', [new_username, admin_id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'That username is already taken' });
      }
    }

    const updatedUsername = new_username || admin.username;
    const updatedPassword = new_password || admin.password;

    await pool.query('UPDATE admins SET username = ?, password = ? WHERE id = ?', [updatedUsername, updatedPassword, admin_id]);

    res.json({ success: true, username: updatedUsername, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- STAFF ENDPOINTS ---

// GET /api/staff
app.get('/api/staff', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM staff ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /api/staff
app.post('/api/staff', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    const { name, role, experience } = req.body;
    if (!name || !role || !experience) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Name, role, and experience are required' });
    }

    let photoPath = '';
    if (req.file) {
      photoPath = req.file.path.replace(/\\/g, '/');
    } else {
      photoPath = req.body.photo || '';
    }

    try {
      const [result] = await pool.query('INSERT INTO staff (name, role, experience, photo) VALUES (?, ?, ?, ?)', [name, role, experience, photoPath]);
      const [newStaff] = await pool.query('SELECT * FROM staff WHERE id = ?', [result.insertId]);
      res.status(201).json(newStaff[0]);
    } catch (error) {
      console.error('Error adding staff:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to add staff' });
    }
  });
});

// PUT /api/staff/:id
app.put('/api/staff/:id', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    const { id } = req.params;
    const { name, role, experience } = req.body;
    
    let photoPath = req.body.photo || '';
    if (req.file) {
      photoPath = req.file.path.replace(/\\/g, '/');
    }

    try {
      const [result] = await pool.query('UPDATE staff SET name=?, role=?, experience=?, photo=? WHERE id=?', [name, role, experience, photoPath, id]);
      if (result.affectedRows === 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Staff member not found' });
      }
      const [updatedStaff] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
      res.json(updatedStaff[0]);
    } catch (error) {
      console.error('Error updating staff:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to update staff' });
    }
  });
});

// DELETE /api/staff/:id
app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM staff WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json({ message: 'Staff member deleted' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// --- ALUMNI ENDPOINTS ---

app.get('/api/alumni', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM alumni ORDER BY batch_year DESC, name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching alumni:', error);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
});

app.post('/api/alumni', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    const { batch_year, name, phone, profession, instagram_id, user_id } = req.body;
    if (!batch_year || !name) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Batch year and name are required' });
    }

    let photoPath = '';
    if (req.file) {
      photoPath = req.file.path.replace(/\\/g, '/');
    }

    try {
      if (user_id) {
        const [userRows] = await pool.query('SELECT isAdmin FROM users WHERE id = ?', [user_id]);
        const isAdmin = userRows.length > 0 && userRows[0].isAdmin;
        if (!isAdmin) {
          const [existing] = await pool.query('SELECT id FROM alumni WHERE user_id = ?', [user_id]);
          if (existing.length > 0) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'You have already created an alumni profile.' });
          }
        }
      }

      const [result] = await pool.query(
        'INSERT INTO alumni (batch_year, name, phone, profession, photo, instagram_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [batch_year, name, phone || null, profession || null, photoPath || null, instagram_id || null, user_id || null]
      );
      const [newAlumni] = await pool.query('SELECT * FROM alumni WHERE id = ?', [result.insertId]);
      res.status(201).json(newAlumni[0]);
    } catch (error) {
      console.error('Error adding alumni:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to add alumni' });
    }
  });
});

app.put('/api/alumni/:id', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload failed' });

    const { batch_year, name, phone, profession, instagram_id } = req.body;
    let updateQuery = 'UPDATE alumni SET batch_year=?, name=?, phone=?, profession=?, instagram_id=?';
    let queryParams = [batch_year, name, phone || null, profession || null, instagram_id || null];

    if (req.file) {
      updateQuery += ', photo=?';
      queryParams.push(req.file.path.replace(/\\/g, '/'));
    }
    
    updateQuery += ' WHERE id=?';
    queryParams.push(req.params.id);

    try {
      await pool.query(updateQuery, queryParams);
      const [updated] = await pool.query('SELECT * FROM alumni WHERE id=?', [req.params.id]);
      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating alumni:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to update alumni' });
    }
  });
});

app.delete('/api/alumni/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM alumni WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alumni not found' });
    }
    res.json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    console.error('Error deleting alumni:', error);
    res.status(500).json({ error: 'Failed to delete alumni' });
  }
});

// --- EVENTS ENDPOINTS ---

app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, 
             (SELECT JSON_OBJECTAGG(emoji, count) 
              FROM (
                SELECT emoji, COUNT(*) as count 
                FROM event_reactions 
                WHERE event_id = e.id 
                GROUP BY emoji
              ) as reaction_counts
             ) as reactions
      FROM events e 
      ORDER BY e.event_date ASC
    `);
    
    // Map event_date to string YYYY-MM-DD and parse reactions
    const events = rows.map(r => {
      let reactions = r.reactions;
      if (typeof reactions === 'string') {
        try {
          reactions = JSON.parse(reactions);
        } catch (e) {
          reactions = {};
        }
      }
      return {
        ...r,
        event_date: r.event_date.toISOString().split('T')[0],
        reactions: reactions || {}
      };
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload failed' });

    const { title, event_date, description, type } = req.body;
    if (!title || !event_date || !description || !type) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Required fields missing' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, '/');
    } else {
      imagePath = req.body.image || '';
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO events (title, event_date, description, image, type) VALUES (?, ?, ?, ?, ?)',
        [title, event_date, description, imagePath, type]
      );
      const [newEvent] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
      newEvent[0].event_date = newEvent[0].event_date.toISOString().split('T')[0];
      res.status(201).json(newEvent[0]);
    } catch (error) {
      console.error('Error adding event:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to add event' });
    }
  });
});

app.put('/api/events/:id', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'File upload failed' });

    const { id } = req.params;
    const { title, event_date, description, type } = req.body;

    let imagePath = req.body.image || '';
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, '/');
    }

    try {
      const [result] = await pool.query(
        'UPDATE events SET title=?, event_date=?, description=?, image=?, type=? WHERE id=?',
        [title, event_date, description, imagePath, type, id]
      );
      if (result.affectedRows === 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Event not found' });
      }
      const [updatedEvent] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
      updatedEvent[0].event_date = updatedEvent[0].event_date.toISOString().split('T')[0];
      res.json(updatedEvent[0]);
    } catch (error) {
      console.error('Error updating event:', error);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Failed to update event' });
    }
  });
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/events/:id/react
app.post('/api/events/:id/react', async (req, res) => {
  const { id } = req.params;
  const { user_id, emoji } = req.body;

  if (!user_id || !emoji) {
    return res.status(400).json({ error: 'User ID and emoji are required' });
  }

  try {
    // Check if event exists
    const [events] = await pool.query('SELECT id FROM events WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Insert or update reaction
    await pool.query(
      'INSERT INTO event_reactions (event_id, user_id, emoji) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)',
      [id, user_id, emoji]
    );

    // Fetch updated reaction counts
    const [counts] = await pool.query(
      'SELECT emoji, COUNT(*) as count FROM event_reactions WHERE event_id = ? GROUP BY emoji',
      [id]
    );

    const reactionCounts = {};
    counts.forEach(c => reactionCounts[c.emoji] = c.count);

    res.json({ success: true, reactions: reactionCounts });
  } catch (error) {
    console.error('Error reacting to event:', error);
    res.status(500).json({ error: 'Failed to react to event' });
  }
});

// --- RESULTS ENDPOINTS ---

app.get('/api/results', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM results ORDER BY batch_year DESC, CAST(REPLACE(percentage, "%", "") AS DECIMAL(5,2)) DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.post('/api/results', async (req, res) => {
  const { student_name, percentage, grade, batch_year } = req.body;
  if (!student_name || !percentage || !grade || !batch_year) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const [result] = await pool.query('INSERT INTO results (student_name, percentage, grade, batch_year) VALUES (?, ?, ?, ?)', [student_name, percentage, grade, batch_year]);
    const [newResult] = await pool.query('SELECT * FROM results WHERE id = ?', [result.insertId]);
    res.status(201).json(newResult[0]);
  } catch (error) {
    console.error('Error adding result:', error);
    res.status(500).json({ error: 'Failed to add result' });
  }
});

app.put('/api/results/:id', async (req, res) => {
  const { id } = req.params;
  const { student_name, percentage, grade, batch_year } = req.body;
  try {
    const [result] = await pool.query('UPDATE results SET student_name=?, percentage=?, grade=?, batch_year=? WHERE id=?', [student_name, percentage, grade, batch_year, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    const [updatedResult] = await pool.query('SELECT * FROM results WHERE id = ?', [id]);
    res.json(updatedResult[0]);
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ error: 'Failed to update result' });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM results WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
