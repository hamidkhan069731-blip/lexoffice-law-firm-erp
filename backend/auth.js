const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const store = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'lexoffice-dev-secret-change-me';
const TOKEN_TTL = '12h';

// Same permission table as the front-end ROLE_PERMS, used again here so
// the server enforces it too (never trust the client alone).
const ROLE_PERMS = {
  admin: ['users', 'clients', 'cases', 'caseParties', 'courts', 'hearings', 'documents',
    'tasks', 'importantDates', 'fees', 'payments', 'expenses', 'notes', 'settings', 'auditLogs'],
  lawyer: ['users', 'clients', 'cases', 'caseParties', 'courts', 'hearings', 'documents', 'tasks',
    'importantDates', 'fees', 'payments', 'notes', 'auditLogs', 'settings'],
  assistant: ['users', 'clients', 'cases', 'caseParties', 'hearings', 'tasks', 'documents',
    'importantDates', 'notes', 'auditLogs', 'settings'],
  accountant: ['users', 'fees', 'payments', 'expenses', 'auditLogs', 'clients', 'cases', 'settings']
};
// notes:
// - every role can READ "users" (needed to populate "assigned to" dropdowns
//   with staff names) and READ/WRITE "settings" (the shared dark-mode flag).
// - only admin may create/edit/disable users — enforced separately below,
//   since that's a write-only restriction, not a whole-store one.
// - the front-end's own ROLE_PERMS (which module/page to *show*) is the
//   first line of defense; this table is the server-side backstop.

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, fullName: user.fullName, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function login(username, password) {
  const users = store.all('users');
  const u = users.find(x => x.username.toLowerCase() === String(username || '').trim().toLowerCase());
  if (!u) return { ok: false, reason: 'invalid' };
  if (u.status === 'Disabled') return { ok: false, reason: 'disabled' };

  // Backward compatibility: very first seed used plain "password"; every
  // user created afterwards (including re-seeded defaults) uses passwordHash.
  const matches = u.passwordHash
    ? bcrypt.compareSync(password, u.passwordHash)
    : u.password === password;
  if (!matches) return { ok: false, reason: 'invalid' };

  const safeUser = { id: u.id, username: u.username, fullName: u.fullName, role: u.role, status: u.status };
  return { ok: true, user: safeUser, token: issueToken(safeUser) };
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requirePermission(store_) {
  return (req, res, next) => {
    const perms = ROLE_PERMS[req.user.role] || [];
    if (!perms.includes(store_)) {
      return res.status(403).json({ error: `Role "${req.user.role}" cannot access "${store_}"` });
    }
    // Extra restriction: only admin may create/edit/disable/delete user
    // accounts. Every role may still GET "users" (read-only) to populate
    // "assigned to" dropdowns with staff names.
    if (store_ === 'users' && req.method !== 'GET' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can manage user accounts' });
    }
    next();
  };
}

module.exports = { login, verifyToken, requirePermission, issueToken, ROLE_PERMS };
