// db.js — SQLite-backed data layer using node-sqlite3-wasm (pure WASM,
// no native compiler needed — works on any Windows machine out of the box)

const path = require('path');
const fs = require('fs');
const { Database } = require('node-sqlite3-wasm');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.LEXOFFICE_DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'lexoffice.db'));

const STORE_KEYS = {
  users: 'id', clients: 'id', cases: 'id', caseParties: 'id', courts: 'id',
  hearings: 'id', documents: 'id', tasks: 'id', importantDates: 'id',
  fees: 'id', payments: 'id', expenses: 'id', notes: 'id',
  settings: 'key', auditLogs: 'id'
};
const STORES = Object.keys(STORE_KEYS);

function initTables() {
  for (const store of STORES) {
    db.run(`CREATE TABLE IF NOT EXISTS "${store}" (pk TEXT PRIMARY KEY, json TEXT NOT NULL)`);
  }
}
initTables();

function assertStore(store) {
  if (!STORE_KEYS[store]) {
    const err = new Error(`Unknown store: ${store}`);
    err.status = 404;
    throw err;
  }
}

function all(store) {
  assertStore(store);
  const rows = db.all(`SELECT json FROM "${store}"`);
  return rows.map(r => JSON.parse(r.json));
}

function get(store, id) {
  assertStore(store);
  const rows = db.all(`SELECT json FROM "${store}" WHERE pk = ?`, [String(id)]);
  return rows.length ? JSON.parse(rows[0].json) : null;
}

function put(store, obj) {
  assertStore(store);
  const keyField = STORE_KEYS[store];
  const pk = obj[keyField];
  if (pk === undefined || pk === null || pk === '') {
    const err = new Error(`Record for store "${store}" is missing its "${keyField}" field`);
    err.status = 400;
    throw err;
  }
  db.run(
    `INSERT INTO "${store}" (pk, json) VALUES (?, ?)
     ON CONFLICT(pk) DO UPDATE SET json = excluded.json`,
    [String(pk), JSON.stringify(obj)]
  );
  return obj;
}

function del(store, id) {
  assertStore(store);
  db.run(`DELETE FROM "${store}" WHERE pk = ?`, [String(id)]);
  return true;
}

function clear(store) {
  assertStore(store);
  db.run(`DELETE FROM "${store}"`);
  return true;
}

function ensureDefaultUsers() {
  const existing = all('users');
  if (existing.length) return;
  const defaults = [
    { u: 'admin', n: 'Administrator', r: 'admin' },
    { u: 'lawyer', n: 'Barrister Ahmed Raza', r: 'lawyer' },
    { u: 'assistant', n: 'Bilal Assistant', r: 'assistant' },
    { u: 'accountant', n: 'Sana Accountant', r: 'accountant' }
  ];
  for (const x of defaults) {
    put('users', {
      id: 'USR-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100),
      username: x.u,
      passwordHash: bcrypt.hashSync('demo123', 10),
      fullName: x.n,
      role: x.r,
      status: 'Active',
      createdAt: new Date().toISOString()
    });
  }
  console.log('[lexoffice] seeded default users (admin/lawyer/assistant/accountant, password: demo123)');
}
ensureDefaultUsers();

module.exports = { db, STORES, STORE_KEYS, all, get, put, del, clear };

require('./seed').seedDemoData();