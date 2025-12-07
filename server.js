// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "superhemligt-token-nyckel";

app.get("/", (req, res) => {
  res.send("Opero backend är igång!");
});

// LOGIN med e‑post + lösenord
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E‑post och lösenord krävs." });
  }

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, user) => {
      if (err) {
        console.error("DB-fel vid login:", err);
        return res.status(500).json({ error: "Tekniskt fel. Försök igen." });
      }

      if (!user) {
        return res
          .status(400)
          .json({ error: "Fel e‑post eller lösenord." });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res
          .status(400)
          .json({ error: "Fel e‑post eller lösenord." });
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
          role: user.role || "user",
        },
      });
    }
  );
});

// (valfritt) enkel route för att se alla users vid felsökning
app.get("/debug-users", (req, res) => {
  db.all(`SELECT id, email, username, role FROM users`, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB-fel" });
    res.json(rows);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Opero backend kör på http://localhost:${PORT}`);
});
