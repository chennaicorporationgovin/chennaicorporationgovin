const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to Postgres (Render provides DATABASE_URL in environment)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Render
});

// Create table if not exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        data JSONB,
        createdAt BIGINT
      )
    `);
    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
})();

// Submit form → save record
app.post('/api/submit', async (req, res) => {
  try {
    const data = req.body || {};
    const id = uuidv4();
    const createdAt = Date.now();

    await pool.query(
      "INSERT INTO records (id, data, createdAt) VALUES ($1, $2, $3)",
      [id, data, createdAt]
    );

    const host = req.get('host');
    const protocol = req.protocol;
    const url = `${protocol}://${host}/view/${id}`;
    res.json({ id, url });
  } catch (err) {
    console.error("❌ Error inserting record:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Fetch record
app.get('/api/data/:id', async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM records WHERE id = $1", [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(result.rows[0].data);
  } catch (err) {
    console.error("❌ Error fetching record:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete record manually
app.delete('/api/data/:id', async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM records WHERE id = $1", [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting record:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// View certificate page
app.get('/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Default route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
