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

// ✅ servera alla .html, .js, .css osv från samma mapp som server.js
app.use(express.static(__dirname));

const SECRET = "superhemligt-token-nyckel";

// Test-route
app.get("/", (req, res) => {
  res.send("Opero backend är igång!");
});

// (extra, om du vill vara säker)
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Hämta företag (dropdown för login)
app.get("/companies", (req, res) => {
  db.all(`SELECT id, name, code AS company_code FROM companies`, (err, rows) => {
    if (err) {
      console.error("DB-fel vid /companies:", err);
      return res.status(500).json({ error: "Tekniskt fel." });
    }
    res.json(rows || []);
  });
});

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

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

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
        last_name: user.last_name
      }
    });
  });
});

// Debug – visar users
app.get("/debug-users", (req, res) => {
  db.all(`SELECT id, email, username, role, company_id FROM users`, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB-fel" });
    res.json(rows);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Opero backend kör på http://localhost:${PORT}`);
});
