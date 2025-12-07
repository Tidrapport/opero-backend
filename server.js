const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Servera alla statiska filer (html, css, js, bilder) från projektmappen
app.use(express.static(__dirname));

// 2. Standard-route: gå till company-select när man öppnar /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "company-select.html"));
});

// (Valfritt – men trevligt) direkta routes om du skriver /dashboard osv i URL:en
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/tidrapporter", (req, res) => {
  res.sendFile(path.join(__dirname, "tidrapporter.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Starta servern
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
