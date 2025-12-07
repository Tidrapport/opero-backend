// database.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./opero.db");

db.serialize(() => {
  // Skapa companies-tabell (om du vill använda företag senare)
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE
    );
  `);

  // Skapa users-tabell med alla kolumner vi kan behöva
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE,
      email      TEXT UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'user',
      company_id INTEGER,
      first_name TEXT,
      last_name  TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Standard-företag (id = 1)
  db.run(
    `INSERT OR IGNORE INTO companies (id, name, code)
     VALUES (1, 'Rail Work AB', 'RWA');`
  );

  // Skapa admin-användare om den inte finns
  const adminEmail = "edgar@test.se";
  const adminPasswordPlain = "1234";

  db.get(
    `SELECT id FROM users WHERE email = ?`,
    [adminEmail],
    (err, row) => {
      if (err) {
        console.error("Kunde inte läsa admin-användare:", err);
        return;
      }

      if (!row) {
        const hash = bcrypt.hashSync(adminPasswordPlain, 10);

        db.run(
          `INSERT INTO users
           (username, email, password, role, company_id, first_name, last_name)
           VALUES (?, ?, ?, 'admin', 1, 'Edgar', 'Zubkov');`,
          [adminEmail, adminEmail, hash],
          (err2) => {
            if (err2) {
              console.error("Kunde inte skapa admin-användare:", err2);
            } else {
              console.log("Admin-användare skapad: edgar@test.se / 1234");
            }
          }
        );
      }
    }
  );
});

module.exports = db;
