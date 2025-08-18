const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// SQLite database file (auto-created if not exists)
const db = new Database('data.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    data TEXT,
    createdAt INTEGER
  )
`).run();

// Submit form → save record
app.post('/api/submit', (req, res) => {
  const data = req.body || {};
  const id = uuidv4();
  const createdAt = Date.now();

  db.prepare("INSERT INTO records (id, data, createdAt) VALUES (?, ?, ?)")
    .run(id, JSON.stringify(data), createdAt);

  const host = req.get('host');
  const {protocol} = req;
  const url = `${protocol}://${host}/view/${id}`;
  res.json({ id, url });
});

// Fetch record
app.get('/api/data/:id', (req, res) => {
  const row = db.prepare("SELECT data FROM records WHERE id = ?").get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { data } = row;
  res.json(JSON.parse(data));
});

// Delete record manually
app.delete('/api/data/:id', (req, res) => {
  const result = db.prepare("DELETE FROM records WHERE id = ?").run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({ success: true });
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
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
