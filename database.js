// database.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./opero.db");

db.serialize(() => {
  // Slå på foreign keys (bra vana)
  db.run(`PRAGMA foreign_keys = ON;`);

  // --- Companies ---
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE
    );
  `);

  // --- Users ---
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
      phone      TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
  `);

  // --- Job roles (Yrkesroller) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS job_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- Material types (Materialtyper) ---
  db.run(`
    CREATE TABLE IF NOT EXISTS material_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Lägg till "unit"-kolumn om tabellen redan fanns utan den
  db.all(`PRAGMA table_info(material_types);`, (err, columns) => {
    if (err) {
      console.error("Kunde inte läsa schema för material_types:", err);
      return;
    }
    const hasUnit = columns.some((col) => col.name === "unit");
    if (!hasUnit) {
      db.run(`ALTER TABLE material_types ADD COLUMN unit TEXT;`, (alterErr) => {
        if (alterErr) {
          console.error("Kunde inte lägga till kolumnen unit:", alterErr);
        } else {
          console.log('Kolumnen "unit" har lagts till i material_types.');
        }
      });
    }
  });

  // Standard‑företag (id = 1)
  db.run(
    `INSERT OR IGNORE INTO companies (id, name, code)
     VALUES (1, 'Rail Work AB', 'RWA');`
  );

  // Skapa admin‑användare om den inte finns
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
            (username, email, password, role, company_id, first_name, last_name, phone)
           VALUES (?, ?, ?, 'admin', 1, 'Edgar', 'Zubkov', '');`,
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

  // Skapa Lukas (admin) om saknas – efterfrågad testanvändare
  const lukasEmail = "lukas@test.se";
  const lukasPasswordPlain = "1234";

  db.get(
    `SELECT id FROM users WHERE email = ?`,
    [lukasEmail],
    (err, row) => {
      if (err) {
        console.error("Kunde inte läsa Lukas-användare:", err);
        return;
      }

      if (!row) {
        const hash = bcrypt.hashSync(lukasPasswordPlain, 10);
        db.run(
          `INSERT INTO users
            (username, email, password, role, company_id, first_name, last_name, phone)
           VALUES (?, ?, ?, 'admin', 1, 'Lukas', '', '');`,
          [lukasEmail, lukasEmail, hash],
          (err2) => {
            if (err2) {
              console.error("Kunde inte skapa Lukas-användare:", err2);
            } else {
              console.log("Admin-användare skapad: lukas@test.se / 1234");
            }
          }
        );
      }
    }
  );
});

module.exports = db;
