// auth.js
// ------------------------------------------------------
// Grundinställningar
// ------------------------------------------------------
const ADMIN_EMAIL = "edgar@test.se";
const ADMIN_PASSWORD = "1234"; // samma som i backend/database.js

// ------------------------------------------------------
// Helpers för users i localStorage (används av admin-users / contacts)
// ------------------------------------------------------
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

// Skapa standard-admin om den saknas (endast i localStorage-demot)
function ensureDefaultAdmin() {
  let users = getUsers();
  const exists = users.some((u) => u.email === ADMIN_EMAIL);

  if (!exists) {
    const adminUser = {
      id: Date.now(),
      firstName: "Edgar",
      lastName: "Zubkov",
      email: ADMIN_EMAIL,
      role: "admin", // admin / anställd / platschef / inhyrd
      phone: "",
      password: ADMIN_PASSWORD, // endast för ren front-end-inloggning
    };
    users.push(adminUser);
    saveUsers(users);
    console.log("Skapade standard-admin:", ADMIN_EMAIL, "/", ADMIN_PASSWORD);
  }
}

// ------------------------------------------------------
// Inloggad användare (gemensamt format)
// ------------------------------------------------------

// Anropas på login-sidan när backend /login lyckas
function setCurrentUser(user) {
  if (!user) return;

  // Spara full user från backend
  localStorage.setItem("currentUser", JSON.stringify(user));

  // Extra fält för äldre sidor
  const name =
    (user.first_name || user.firstName || "") +
    (user.last_name || user.lastName ? " " + (user.last_name || user.lastName) : "");

  localStorage.setItem("name", name.trim() || user.email || "");
  localStorage.setItem("role", user.role || "user");
  localStorage.setItem("email", user.email || "");
  localStorage.setItem("token", localStorage.getItem("token") || "loggedin");
}

// Hämta inloggad användare
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignorera parse-fel och fortsätt
  }

  // Fallback om bara role/name/email finns sparat (äldre sidor)
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  if (!role && !email) return null;

  const [firstName, ...rest] = (name || "").split(" ");
  const lastName = rest.join(" ").trim() || "";

  return {
    firstName: firstName || "",
    lastName,
    email: email || "",
    role: role || "user",
  };
}

// Kräv att man är inloggad – annars tillbaka till login.html
function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// Är användaren admin?
function isAdmin(user) {
  return user && user.role === "admin";
}

// ------------------------------------------------------
// Meny & header (vänstersida + välkomsttext)
// ------------------------------------------------------
function setupSidebarForUser(user) {
  if (!user) return;

  // Dölj alla element med klassen .admin-only om inte admin
  const adminEls = document.querySelectorAll(".admin-only");
  if (!isAdmin(user)) {
    adminEls.forEach((el) => {
      el.style.display = "none";
    });
  }

  // Sätt välkomsttext
  const welcomeEls = document.querySelectorAll("#welcomeText, .welcome");
  const name =
    (user.first_name || user.firstName || "") +
    ((user.last_name || user.lastName) ? " " + (user.last_name || user.lastName) : "");
  const label = name.trim() || user.email || "";

  if (label) {
    welcomeEls.forEach((el) => {
      el.textContent = "Välkommen, " + label;
    });
  }
}

// ------------------------------------------------------
// Lösenordsgenerator (används t.ex. på admin-users.html)
// ------------------------------------------------------
function generatePassword(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

// ------------------------------------------------------
// Körs automatiskt på alla sidor som laddar auth.js
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  ensureDefaultAdmin(); // påverkar bara localStorage-demot
});
