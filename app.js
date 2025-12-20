require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

/* ===================== MIDDLEWARE ===================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true // IMPORTANT for guest users
}));

/* ===================== DATABASE ===================== */

const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'media_player_db',
  port: 3306
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected – Everything works now!');
});

/* ===================== STATIC FILES ===================== */

app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/welcome.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/signup.html'));
});

/* ===================== AUTH MIDDLEWARE ===================== */

function requireAuth(req, res, next) {
  if (!req.session.user || req.session.user.is_guest) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
}

function requirePremium(req, res, next) {
  if (!req.session.user || !req.session.user.is_premium) {
    return res.status(403).json({ error: 'Premium required' });
  }
  next();
}

/* ===================== ROUTES ===================== */

/* ---------- GUEST LOGIN ---------- */
app.get('/guest', (req, res) => {
  req.session.user = {
    id: null,
    username: 'Guest',
    is_guest: true,
    is_premium: false
  };
  res.redirect('/main.html');
});

/* ---------- AUTH ---------- */
app.post('/signup', async (req, res) => {
  const { username, email, phone, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)',
    [username, email, phone, hashed],
    err => {
      if (err) return res.send('Signup error');
      res.redirect('/login.html');
    }
  );
});

app.post('/login', (req, res) => {
  const { identifier, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [identifier, identifier],
    async (err, results) => {
      if (err || results.length === 0) return res.send('Invalid login');

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.send('Invalid password');

      req.session.user = {
        id: user.id,
        username: user.username,
        is_guest: false,
        is_premium: user.is_premium === 1
      };

      res.redirect('/main.html');
    }
  );
});

/* ---------- LOGOUT ---------- */
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

/* ---------- USER INFO ---------- */
app.get('/api/user', (req, res) => {
  res.json(req.session.user || null);
});

/* ---------- SONGS ---------- */
app.get('/api/songs', (req, res) => {
  db.query('SELECT * FROM songs', (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

/* ---------- FAVORITES (AUTH ONLY) ---------- */
app.post('/api/favorites', requireAuth, (req, res) => {
  const { song_id } = req.body;
  const userId = req.session.user.id;

  db.query(
    'INSERT IGNORE INTO favorites (user_id, song_id) VALUES (?, ?)',
    [userId, song_id],
    () => res.json({ success: true })
  );
});

/* ---------- PLAYLISTS (AUTH ONLY) ---------- */
app.post('/api/playlists', requireAuth, (req, res) => {
  const { name } = req.body;
  const userId = req.session.user.id;

  db.query(
    'INSERT INTO playlists (user_id, name) VALUES (?, ?)',
    [userId, name],
    () => res.json({ success: true })
  );
});

/* ---------- PREMIUM UPGRADE ---------- */
app.post('/upgrade', requireAuth, (req, res) => {
  const userId = req.session.user.id;

  db.query(
    'UPDATE users SET is_premium = 1 WHERE id = ?',
    [userId],
    () => {
      req.session.user.is_premium = true;
      res.redirect('/main.html');
    }
  );
});

/* ===================== SERVER ===================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LIVE → http://localhost:${PORT}`);
});

