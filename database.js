// database.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./opero.db");

db.serialize(() => {
  // Skapa users-tabell om den inte finns alls
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT
    )`
  );

  // Säkerställ att alla kolumner finns
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error("Kunde inte läsa users-schema:", err);
      return;
    }

    const cols = rows.map((r) => r.name);
    const alter = [];

    if (!cols.includes("username")) {
      alter.push(`ADD COLUMN username TEXT UNIQUE`);
    }
    if (!cols.includes("email")) {
      alter.push(`ADD COLUMN email TEXT UNIQUE`);
    }
    if (!cols.includes("password")) {
      alter.push(`ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
    }
    if (!cols.includes("role")) {
      alter.push(`ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
    }
    if (!cols.includes("created_at")) {
      alter.push(`ADD COLUMN created_at TEXT`);
    }

    alter.forEach((stmt) => {
      db.run(`ALTER TABLE users ${stmt}`, (e) => {
        if (e && !String(e).includes("duplicate column")) {
          console.error("ALTER TABLE-fel:", e);
        }
      });
    });

    // Seeda admin-användare om den inte finns
    db.get(
      `SELECT id FROM users WHERE email = ?`,
      ["edgar@test.se"],
      (err2, row) => {
        if (err2) {
          console.error("Kunde inte läsa admin-användare:", err2);
          return;
        }
        if (!row) {
          const hash = bcrypt.hashSync("1234", 10);
          db.run(
            `INSERT INTO users (username, email, password, role, created_at)
             VALUES (?, ?, ?, 'admin', datetime('now'))`,
            ["edgar@test.se", "edgar@test.se", hash],
            (err3) => {
              if (err3) {
                console.error("Kunde inte skapa admin-användare:", err3);
              } else {
                console.log("Admin-användare skapad: edgar@test.se / 1234");
              }
            }
          );
        }
      }
    );
  });
});

module.exports = db;
