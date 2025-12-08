// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./database");

const app = express();

// --- middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ servera alla .html, .js, .css osv från samma mapp som server.js
app.use(express.static(__dirname));

const SECRET = "superhemligt-token-nyckel";

// Test-route
app.get("/", (req, res) => {
  res.send("Opero backend är igång!");
});

// (extra, om du vill vara säker på att login.html funkar direkt)
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Hämta företag (dropdown för login)
app.get("/companies", (req, res) => {
  db.all(
    `SELECT id, name, code AS company_code FROM companies`,
    (err, rows) => {
      if (err) {
        console.error("DB-fel vid /companies:", err);
        return res.status(500).json({ error: "Tekniskt fel." });
      }
      res.json(rows || []);
    }
  );
});

// =========================
//   ADMIN – ANVÄNDARE
// =========================

// Lista alla användare (för admin-sidan)
app.get("/admin/users", (req, res) => {
  db.all(
    `SELECT id, email, username, role, company_id, first_name, last_name
     FROM users`,
    (err, rows) => {
      if (err) {
        console.error("DB-fel vid /admin/users (GET):", err);
        return res.status(500).json({ error: "Kunde inte hämta användare." });
      }
      res.json(rows || []);
    }
  );
});

// Skapa ny användare (admin lägger in ny användare)
// Viktigt: lösenordet HASHAS innan det sparas!
app.post("/admin/users", async (req, res) => {
  const {
    email,
    username,
    password,
    role,
    company_id,
    first_name,
    last_name,
  } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "E‑post och lösenord krävs för att skapa användare." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (email, username, password, role, company_id, first_name, last_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      email,
      username || null,
      hashedPassword,
      role || "employee",
      company_id || null,
      first_name || null,
      last_name || null,
    ];

    db.run(sql, params, function (err) {
      if (err) {
        console.error("DB-fel vid /admin/users (POST):", err);
        return res
          .status(500)
          .json({ error: "Kunde inte skapa användare (kanske e‑post upptagen?)." });
      }

      // this.lastID är id:t på den nya användaren
      res.status(201).json({
        message: "Användare skapad",
        id: this.lastID,
      });
    });
  } catch (err) {
    console.error("Fel vid hashning av lösenord:", err);
    res.status(500).json({ error: "Tekniskt fel vid skapande av användare." });
  }
});

// (valfritt) Uppdatera lösenord för en användare – också med hash
app.put("/admin/users/:id/password", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Nytt lösenord krävs." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, id],
      function (err) {
        if (err) {
          console.error("DB-fel vid uppdatering av lösenord:", err);
          return res
            .status(500)
            .json({ error: "Kunde inte uppdatera lösenord." });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Användare hittades inte." });
        }

        res.json({ message: "Lösenord uppdaterat." });
      }
    );
  } catch (err) {
    console.error("Fel vid hashning av nytt lösenord:", err);
    res.status(500).json({ error: "Tekniskt fel." });
  }
});

// =========================
//   LOGIN
// =========================

// Login med email + lösenord + company_id (valfritt)
app.post("/login", (req, res) => {
  const { email, password, company_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E‑post och lösenord krävs." });
  }

  let sql = `SELECT * FROM users WHERE email = ?`;
  const params = [email];

  if (company_id) {
    sql += ` AND company_id = ?`;
    params.push(company_id);
  }

  db.get(sql, params, async (err, user) => {
    if (err) {
      console.error("DB-fel vid login:", err);
      return res.status(500).json({ error: "Tekniskt fel." });
    }

    if (!user) {
      return res.status(400).json({ error: "Fel e‑post eller lösenord." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Fel e‑post eller lösenord." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Inloggad",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        company_id: user.company_id,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  });
});

// Debug – visar users
app.get("/debug-users", (req, res) => {
  db.all(
    `SELECT id, email, username, role, company_id FROM users`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB-fel" });
      res.json(rows);
    }
  );
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Opero backend kör på http://localhost:${PORT}`);
});
