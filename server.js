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

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Ingen token angiven." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error("Tokenfel:", err);
    return res.status(401).json({ error: "Ogiltig eller utgången token." });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if ((req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Endast admin har behörighet." });
    }
    next();
  });
}

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

// ======================
//   ADMIN: USERS
// ======================
// Hämta användare (admin) – kan filtreras på company_id
app.get("/admin/users", requireAdmin, (req, res) => {
  const { company_id } = req.query;
  let sql = `
    SELECT id, username, email, role, company_id, first_name, last_name, phone
    FROM users
  `;
  const params = [];
  if (company_id) {
    sql += " WHERE company_id = ?";
    params.push(company_id);
  }
  sql += " ORDER BY first_name, last_name, email";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("DB-fel vid GET /admin/users:", err);
      return res.status(500).json({ error: "Kunde inte hämta användare." });
    }
    res.json(rows || []);
  });
});

// Skapa användare (admin)
app.post("/admin/users", requireAdmin, (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone = "",
    role = "user",
    password,
    company_id
  } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: "Förnamn, efternamn, e‑post och lösenord krävs." });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanRole = String(role || "user").toLowerCase();
  const username = cleanEmail; // använd e-post som användarnamn
  const hash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users
      (username, email, password, role, company_id, first_name, last_name, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      cleanEmail,
      hash,
      cleanRole,
      company_id || null,
      first_name.trim(),
      last_name.trim(),
      String(phone || "").trim()
    ],
    function (err) {
      if (err) {
        console.error("DB-fel vid POST /admin/users:", err);
        if ((err.message || "").includes("UNIQUE")) {
          return res.status(400).json({ error: "E‑post eller användarnamn används redan." });
        }
        return res.status(500).json({ error: "Kunde inte skapa användare." });
      }

      res.status(201).json({
        id: this.lastID,
        username,
        email: cleanEmail,
        role: cleanRole,
        company_id: company_id || null,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: String(phone || "").trim()
      });
    }
  );
});

// Ta bort användare (admin)
app.delete("/admin/users/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM users WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error("DB-fel vid DELETE /admin/users/:id:", err);
        return res.status(500).json({ error: "Kunde inte ta bort användare." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Användaren hittades inte." });
      }

      res.json({ success: true });
    }
  );
});

// =========================
//   YRKESROLLER (job_roles)
// =========================

// Hämta alla yrkesroller – används av både admin & tidrapport
app.get("/job-roles", (req, res) => {
  db.all(
    `SELECT id, name FROM job_roles ORDER BY name`,
    (err, rows) => {
      if (err) {
        console.error("DB-fel vid GET /job-roles:", err);
        return res.status(500).json({ error: "Kunde inte hämta yrkesroller." });
      }
      res.json(rows || []);
    }
  );
});

// Skapa ny yrkesroll (admin)
app.post("/job-roles", (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Namn på yrkesroll krävs." });
  }

  const cleanName = name.trim();

  db.run(
    `INSERT INTO job_roles (name) VALUES (?)`,
    [cleanName],
    function (err) {
      if (err) {
        console.error("DB-fel vid POST /job-roles:", err);
        return res.status(500).json({ error: "Kunde inte spara yrkesroll." });
      }

      res.status(201).json({
        id: this.lastID,
        name: cleanName
      });
    }
  );
});

// Ta bort yrkesroll (admin)
app.delete("/job-roles/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM job_roles WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error("DB-fel vid DELETE /job-roles:", err);
        return res.status(500).json({ error: "Kunde inte ta bort yrkesroll." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Yrkesrollen hittades inte." });
      }

      res.json({ success: true });
    }
  );
});

// ===========================
//   MATERIALTYPER (förbrukning)
// ===========================

// Hämta alla materialtyper – används i material_types.html + tidrapporter
app.get("/material-types", (req, res) => {
  db.all(
    `SELECT id, name, unit FROM material_types ORDER BY name`,
    (err, rows) => {
      if (err) {
        console.error("DB-fel vid GET /material-types:", err);
        return res.status(500).json({ error: "Kunde inte hämta materialtyper." });
      }
      res.json(rows || []);
    }
  );
});

// Skapa ny materialtyp (admin)
app.post("/material-types", (req, res) => {
  const { name, unit } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Namn på materialtyp krävs." });
  }

  const cleanName = name.trim();
  const cleanUnit = (unit || "").trim();

  db.run(
    `INSERT INTO material_types (name, unit) VALUES (?, ?)`,
    [cleanName, cleanUnit],
    function (err) {
      if (err) {
        console.error("DB-fel vid POST /material-types:", err);
        return res.status(500).json({ error: "Kunde inte spara materialtyp." });
      }

      res.status(201).json({
        id: this.lastID,
        name: cleanName,
        unit: cleanUnit
      });
    }
  );
});

// Ta bort materialtyp (admin)
app.delete("/material-types/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM material_types WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error("DB-fel vid DELETE /material-types:", err);
        return res.status(500).json({ error: "Kunde inte ta bort materialtyp." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Materialtypen hittades inte." });
      }

      res.json({ success: true });
    }
  );
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
