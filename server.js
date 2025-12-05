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

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, hashedPassword],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "Användarnamnet finns redan." });
      }
      res.json({ message: "Användare skapad!" });
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    async (err, user) => {
      if (!user) return res.status(400).json({ error: "Fel användare." });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: "Fel lösenord." });

      const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1d" });

      res.json({ message: "Inloggad!", token });
    }
  );
});

app.listen(3000, () => {
  console.log("Opero backend kör på http://localhost:3000");
});
