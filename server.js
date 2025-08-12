const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage
const store = {};

// Accept form submissions
app.post('/api/submit', (req, res) => {
  const data = req.body || {};
  const id = uuidv4();
  store[id] = data;

  const host = req.get('host');
  const protocol = req.protocol;
  const url = `${protocol}://${host}/view/${id}`;
  res.json({ id, url });
});

// Get data by ID
app.get('/api/data/:id', (req, res) => {
  const id = req.params.id;
  const data = store[id];
  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(data);
});

// Serve the certificate view
app.get('/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Default to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
