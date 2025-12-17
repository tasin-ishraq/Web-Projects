require('dotenv').config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "nasheedpro_secret_2025",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "nasheed_player_db"
});

db.connect(err => {
  if (err) throw err;
  console.log("MySQL Connected – Everything works now!");
});

// ROUTES
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/welcome.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../public/login.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "../public/signup.html")));

app.post("/signup", async (req, res) => {
  const { username, email, phone, password } = req.body;
  const hashed = await bcrypt.hash(password, 12);
  db.query("INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)",
    [username, email, phone || null, hashed], err => {
      if (err) return res.send("Username/email already exists");
      res.redirect("/login");
    });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, username], async (err, results) => {
    if (err || results.length === 0 || !await bcrypt.compare(password, results[0].password)) {
      return res.send("Invalid credentials");
    }
    const user = results[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isPremium = !!user.is_premium;

    // THIS LINE WAS BROKEN BEFORE — NOW FIXED
    res.redirect(`/main?user=${encodeURIComponent(user.username)}`);
  });
});

app.get("/main", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "../public/main.html"));
});

app.get("/logout", (req, res) => { req.session.destroy(); res.redirect("/"); });

// API
app.get("/api/songs", (req, res) => {
  if (!req.session.userId) return res.json([]);
  const sql = `
    SELECT s.*, IF(f.song_id IS NOT NULL, 1, 0) AS is_favorite
    FROM songs s
    LEFT JOIN favorites f ON f.song_id = s.id AND f.user_id = ?
  `;
  db.query(sql, [req.session.userId], (err, results) => {
    res.json(err ? [] : results);
  });
});

app.post("/api/toggle-favorite", (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const { song_id } = req.body;
  db.query("SELECT * FROM favorites WHERE user_id = ? AND song_id = ?", [req.session.userId, song_id], (err, rows) => {
    if (rows?.length > 0) {
      db.query("DELETE FROM favorites WHERE user_id = ? AND song_id = ?", [req.session.userId, song_id]);
      res.json({ is_favorite: false });
    } else {
      db.query("INSERT INTO favorites (user_id, song_id) VALUES (?, ?)", [req.session.userId, song_id]);
      res.json({ is_favorite: true });
    }
  });
});

// Playlists (basic working)
app.get("/api/playlists", (req, res) => {
  if (!req.session.userId) return res.json([]);
  db.query("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC", [req.session.userId], (err, results) => {
    res.json(err ? [] : results);
  });
});

app.post("/api/playlist", (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const { name } = req.body;
  db.query("INSERT INTO playlists (user_id, name) VALUES (?, ?)", [req.session.userId, name || "New Playlist"], (err, result) => {
    res.json(err ? { success: false } : { success: true, playlist: { id: result.insertId, name: name || "New Playlist" } });
  });
});

app.listen(PORT, () => console.log(`LIVE → http://localhost:${PORT}`));
