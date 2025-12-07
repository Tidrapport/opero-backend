// auth.js
const ADMIN_EMAIL = "edgar@test.se";

// ---- Helpers för users i localStorage ----
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("users")) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// Skapa standard-admin om den saknas
function ensureDefaultAdmin() {
  let users = getUsers();
  const exists = users.some(u => u.email === ADMIN_EMAIL);

  if (!exists) {
    users.push({
      id: Date.now(),
      firstName: "Edgar",
      lastName: "Admin",
      email: ADMIN_EMAIL,
      role: "admin",          // admin / anställd / platschef / inhyrd
      phone: "",
      password: "Admin123!"   // kan bytas senare
    });
    saveUsers(users);
    console.log("Skapade standard-admin: edgar@test.se / Admin123!");
  }
}

// ---- Inloggad användare ----
function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("token", "loggedin"); // för dina gamla sidor
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {
    return null;
  }
}

function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function isAdmin(user) {
  return user && user.role === "admin";
}

// ---- Meny & header ----
function setupSidebarForUser(user) {
  const adminEls = document.querySelectorAll(".admin-only");
  if (!isAdmin(user)) {
    adminEls.forEach(el => {
      el.style.display = "none";
    });
  }

  const welcomeEls = document.querySelectorAll("#welcomeText, .welcome");
  const name =
    (user?.firstName || "") + (user?.lastName ? " " + user.lastName : "");
  const label = name.trim() || user?.email || "";

  if (label) {
    welcomeEls.forEach(el => {
      el.textContent = "Välkommen, " + label;
    });
  }
}

// ---- Lösenordsgenerator för admin-sidan ----
function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

// Körs på alla sidor som laddar auth.js
document.addEventListener("DOMContentLoaded", ensureDefaultAdmin);
