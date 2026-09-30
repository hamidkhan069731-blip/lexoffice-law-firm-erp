require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const store = require('./db');
const { login, verifyToken, requirePermission } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '15mb' })); // documents/notes can carry big base64 blobs

// ---------------------------------------------------------------------
// Serve the front-end SPA itself, so the whole app is just one server.
// ---------------------------------------------------------------------
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ---------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const result = login(username, password);
  if (!result.ok) {
    if (result.reason === 'disabled') return res.status(403).json({ error: 'disabled' });
    return res.status(401).json({ error: 'invalid' });
  }
  res.json({ token: result.token, user: result.user });
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------
// Helper: strip sensitive fields before a "users" record leaves the server
// ---------------------------------------------------------------------
function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash, password, ...safe } = u;
  return safe;
}

// ---------------------------------------------------------------------
// GENERIC CRUD — mirrors the old dbAll/dbGet/dbPut/dbDel/dbClearStore
// IndexedDB helpers 1:1, so the front-end logic barely has to change.
// ---------------------------------------------------------------------
app.get('/api/:store', verifyToken, requirePermission_param, (req, res) => {
  try {
    let rows = store.all(req.params.store);
    if (req.params.store === 'users') rows = rows.map(sanitizeUser);
    res.json(rows);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get('/api/:store/:id', verifyToken, requirePermission_param, (req, res) => {
  try {
    let row = store.get(req.params.store, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (req.params.store === 'users') row = sanitizeUser(row);
    res.json(row);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.put('/api/:store/:id', verifyToken, requirePermission_param, (req, res) => {
  try {
    const s = req.params.store;
    let payload = { ...req.body };
    const keyField = store.STORE_KEYS[s];
    payload[keyField] = req.params.id; // trust the URL, not the body, for the primary key

    if (s === 'users') {
      const existing = store.get('users', req.params.id) || {};
      const merged = { ...existing, ...payload };
      if (payload.password) {
        merged.passwordHash = bcrypt.hashSync(payload.password, 10);
      }
      delete merged.password;
      const saved = store.put('users', merged);
      return res.json(sanitizeUser(saved));
    }

    const saved = store.put(s, payload);
    res.json(saved);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/:store/:id', verifyToken, requirePermission_param, (req, res) => {
  try {
    store.del(req.params.store, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// bulk clear (used by the "Restore backup" feature before re-importing rows)
app.delete('/api/:store', verifyToken, requirePermission_param, (req, res) => {
  try {
    store.clear(req.params.store);
    res.json({ ok: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// small helper middleware so :store can double as the permission key
function requirePermission_param(req, res, next) {
  return requirePermission(req.params.store)(req, res, next);
}

// SPA fallback (client-side hash routing lives after '#', so any GET that
// isn't /api/* or a real static file should just get index.html)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  LexOffice server running:  http://localhost:${PORT}\n`);
});
