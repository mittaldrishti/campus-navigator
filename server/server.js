/* Navigator backend. Zero dependencies: only Node's standard library (Node 18+).
   Serves the website and a small JSON API for accounts, shared campus changes
   and per-user data.

   Start:  node server/server.js
   Env:    PORT (default 3000)
           ADMIN_EMAIL, ADMIN_PASSWORD   first admin account (created on first start)
           TOKEN_SECRET                  signing secret (generated and stored if not set)
           DATA_FILE                     where the database JSON lives (default server/db.json) */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "db.json");
const PORT = Number(process.env.PORT) || 3000;
const TOKEN_DAYS = 7;
const MAX_BODY = 3 * 1024 * 1024;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8" };
const PUBLIC_DIRS = ["css", "js", "data", "icons"];          // only these folders (and the files below) are served
const PUBLIC_FILES = ["index.html", "sw.js", "manifest.webmanifest"];

/* ---------- storage: one JSON file, written atomically ---------- */
let db = { users: [], campusState: {}, userData: {}, campuses: {}, secret: null };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))); } catch (e) { /* first start */ }
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DATA_FILE);
  }, 50);
}
if (!db.secret) { db.secret = crypto.randomBytes(32).toString("hex"); persist(); }
const SECRET = process.env.TOKEN_SECRET || db.secret;

/* ---------- passwords and tokens ---------- */
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function checkPassword(user, password) {
  const h = Buffer.from(hashPassword(password, user.salt).hash, "hex");
  return crypto.timingSafeEqual(h, Buffer.from(user.hash, "hex"));
}
const b64 = (s) => Buffer.from(s).toString("base64url");
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + "." + crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}
function verify(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
function issue(u) { return { token: sign({ uid: u.id, exp: Date.now() + TOKEN_DAYS * 864e5 }), user: publicUser(u) }; }

/* first admin */
if (!db.users.some((u) => u.role === "admin")) {
  const email = (process.env.ADMIN_EMAIL || "admin@campus.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64url");
  db.users.push(Object.assign({ id: crypto.randomUUID(), name: "Admin", email, role: "admin" }, hashPassword(password)));
  persist();
  console.log("Admin account created:  " + email + "  /  " + password);
  if (!process.env.ADMIN_PASSWORD) console.log("(Random password. Set ADMIN_EMAIL and ADMIN_PASSWORD to choose your own.)");
}

/* ---------- campus packages ---------- */
function bundledCampuses() {
  const out = {};
  for (const f of fs.readdirSync(path.join(ROOT, "data"))) {
    if (!f.endsWith(".json")) continue;
    try { const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8")); out[d.id] = d; } catch (e) { /* skip broken file */ }
  }
  return out;
}
const BUNDLED = bundledCampuses();
const campusExists = (id) => !!(BUNDLED[id] || db.campuses[id]);
function validCampus(d) {
  return d && typeof d.id === "string" && /^[a-z0-9-]{2,40}$/.test(d.id) && typeof d.name === "string" &&
    ["layers", "places", "nodes", "edges"].every((k) => Array.isArray(d[k]));
}
const emptyState = () => ({ edits: {}, blocked: {}, events: null, faculty: null, timetable: null, updatedAt: null });

/* ---------- http helpers ---------- */
function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
const fail = (res, status, message) => send(res, status, { error: message });
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("Request is too large."), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(Object.assign(new Error("Body is not valid JSON."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function currentUser(req) {
  const h = req.headers.authorization || "";
  const p = h.startsWith("Bearer ") && verify(h.slice(7));
  return p ? db.users.find((u) => u.id === p.uid) || null : null;
}
/* simple fixed-window limiter for sign-in attempts */
const attempts = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(), a = attempts.get(key);
  if (!a || now > a.reset) { attempts.set(key, { n: 1, reset: now + windowMs }); return false; }
  return ++a.n > max;
}
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

/* ---------- API ---------- */
async function api(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean).slice(1);     // after "api"
  const m = req.method, ip = req.socket.remoteAddress || "?";
  const me = currentUser(req);

  if (m === "GET" && parts[0] === "health") return send(res, 200, { ok: true, time: new Date().toISOString() });

  if (m === "POST" && parts[0] === "auth" && (parts[1] === "register" || parts[1] === "login")) {
    if (limited("auth:" + ip, 20, 10 * 60 * 1000)) return fail(res, 429, "Too many attempts. Try again in a few minutes.");
    const b = await readBody(req), email = str(b.email, 120).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, "Enter a valid email address.");
    if (parts[1] === "register") {
      const name = str(b.name, 60);
      if (!name) return fail(res, 400, "Enter your name.");
      if (password.length < 8) return fail(res, 400, "Password needs at least 8 characters.");
      if (db.users.some((u) => u.email === email)) return fail(res, 409, "An account with this email already exists. Sign in instead.");
      const u = Object.assign({ id: crypto.randomUUID(), name, email, role: "student" }, hashPassword(password));
      db.users.push(u); persist();
      return send(res, 201, issue(u));
    }
    const u = db.users.find((x) => x.email === email);
    if (!u || !checkPassword(u, password)) return fail(res, 401, "Email or password is wrong.");
    return send(res, 200, issue(u));
  }

  if (m === "GET" && parts[0] === "me" && parts.length === 1) return me ? send(res, 200, { user: publicUser(me) }) : fail(res, 401, "Sign in first.");

  /* per-user data: favourites, timetable, location */
  if (parts[0] === "me" && parts[1] === "data" && parts[2]) {
    if (!me) return fail(res, 401, "Sign in first.");
    if (!campusExists(parts[2])) return fail(res, 404, "Unknown campus.");
    const mine = (db.userData[me.id] = db.userData[me.id] || {});
    if (m === "GET") return send(res, 200, mine[parts[2]] || {});
    if (m === "PUT") {
      const b = await readBody(req), ids = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 100) : []);
      mine[parts[2]] = {
        fav: ids(b.fav), recent: ids(b.recent).slice(0, 8), loc: typeof b.loc === "string" ? b.loc : null, accessible: !!b.accessible,
        schedule: (Array.isArray(b.schedule) ? b.schedule : []).slice(0, 200).map((e) => ({ id: str(e.id, 40), subject: str(e.subject, 60), place: str(e.place, 80), day: Number(e.day) % 7 || 0, time: str(e.time, 5), dur: Math.min(480, Math.max(10, Number(e.dur) || 60)) })),
        prefs: isObj(b.prefs) ? { buffer: Math.min(30, Math.max(0, Number(b.prefs.buffer) || 0)), remind: !!b.prefs.remind, lang: b.prefs.lang === "hi" ? "hi" : "en" } : {}
      };
      persist();
      return send(res, 200, mine[parts[2]]);
    }
  }

  /* campus packages */
  if (parts[0] === "campuses") {
    if (m === "GET" && !parts[1]) return send(res, 200, Object.values(Object.assign({}, BUNDLED, db.campuses)).map((c) => ({ id: c.id, name: c.name, imported: !BUNDLED[c.id] })));
    if (m === "GET" && parts[1]) { const c = db.campuses[parts[1]] || BUNDLED[parts[1]]; return c ? send(res, 200, c) : fail(res, 404, "Unknown campus."); }
    if (!me || me.role !== "admin") return fail(res, me ? 403 : 401, "Only an admin can change campus maps.");
    if (m === "POST") {
      const d = await readBody(req);
      if (!validCampus(d)) return fail(res, 400, "This is not a valid campus file. It needs id, name, layers, places, nodes and edges.");
      if (BUNDLED[d.id]) return fail(res, 409, 'A built-in campus already uses the id "' + d.id + '". Change the id in the file.');
      db.campuses[d.id] = d; persist();
      return send(res, 201, { id: d.id, name: d.name });
    }
    if (m === "DELETE" && parts[1]) {
      if (!db.campuses[parts[1]]) return fail(res, 404, "Only imported campuses can be removed.");
      delete db.campuses[parts[1]]; delete db.campusState[parts[1]]; persist();
      return send(res, 200, { ok: true });
    }
  }

  /* shared changes made by admins: renamed places, closures, events, faculty */
  if (parts[0] === "campus" && parts[1] && parts[2] === "state") {
    if (!campusExists(parts[1])) return fail(res, 404, "Unknown campus.");
    const st = db.campusState[parts[1]] || emptyState();
    if (m === "GET") return send(res, 200, st);
    if (m === "PUT") {
      if (!me || me.role !== "admin") return fail(res, me ? 403 : 401, "Only an admin can change the campus.");
      const b = await readBody(req);
      if (isObj(b.edits)) { st.edits = {}; for (const [k, v] of Object.entries(b.edits).slice(0, 2000)) if (isObj(v)) st.edits[str(k, 80)] = { name: str(v.name, 60), type: str(v.type, 20) }; }
      if (isObj(b.blocked)) { st.blocked = {}; for (const [k, v] of Object.entries(b.blocked).slice(0, 500)) if (v) st.blocked[str(k, 80)] = true; }
      if (b.events === null || Array.isArray(b.events)) st.events = b.events && b.events.slice(0, 300).map((e) => ({ id: str(e.id, 40) || crypto.randomUUID(), title: str(e.title, 80), place: str(e.place, 80), date: str(e.date, 10), time: str(e.time, 5), desc: str(e.desc, 240) }));
      if (b.faculty === null || Array.isArray(b.faculty)) st.faculty = b.faculty && b.faculty.slice(0, 1000).map((f) => ({ id: str(f.id, 40) || crypto.randomUUID(), name: str(f.name, 60), dept: str(f.dept, 60), role: str(f.role, 40), place: str(f.place, 80), leave: /^\d{4}-\d{2}-\d{2}$/.test(f.leave) ? f.leave : "" }));
      if (b.timetable === null || Array.isArray(b.timetable)) st.timetable = b.timetable && b.timetable.slice(0, 6000).map((t) => ({
        id: str(t.id, 40) || crypto.randomUUID(), place: str(t.place, 80), days: (Array.isArray(t.days) ? t.days : []).map(Number).filter((d) => d >= 0 && d <= 6).slice(0, 7),
        start: /^\d{1,2}:\d{2}$/.test(t.start) ? t.start : "09:00", end: /^\d{1,2}:\d{2}$/.test(t.end) ? t.end : "10:00", subject: str(t.subject, 80), faculty: str(t.faculty, 60),
        room: str(t.room, 40), cls: str(t.cls, 80), code: str(t.code, 12) }));
      st.updatedAt = new Date().toISOString(); st.updatedBy = me.name;
      db.campusState[parts[1]] = st; persist();
      return send(res, 200, st);
    }
  }

  /* admin: list accounts and change roles */
  if (parts[0] === "users") {
    if (!me || me.role !== "admin") return fail(res, me ? 403 : 401, "Only an admin can manage accounts.");
    if (m === "GET") return send(res, 200, db.users.map(publicUser));
    if (m === "PUT" && parts[1]) {
      const u = db.users.find((x) => x.id === parts[1]), b = await readBody(req);
      if (!u) return fail(res, 404, "Unknown account.");
      if (b.role !== "admin" && b.role !== "student") return fail(res, 400, "Role must be admin or student.");
      if (u.id === me.id) return fail(res, 400, "You cannot change your own role.");
      u.role = b.role; persist();
      return send(res, 200, publicUser(u));
    }
  }
  return fail(res, 404, "No such API route.");
}

/* ---------- static files ---------- */
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(ROOT, rel));
  const top = path.relative(ROOT, file).split(path.sep)[0];
  const allowed = file.startsWith(ROOT + path.sep) && (PUBLIC_FILES.includes(path.relative(ROOT, file)) || PUBLIC_DIRS.includes(top));
  if (!allowed) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": rel === "/index.html" || rel === "/sw.js" ? "no-cache" : "public, max-age=300" });
    res.end(req.method === "HEAD" ? undefined : buf);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    api(req, res, url).catch((e) => fail(res, e.status || 500, e.status ? e.message : "Something went wrong on the server."));
  } else if (req.method === "GET" || req.method === "HEAD") serveStatic(req, res, url);
  else { res.writeHead(405); res.end(); }
});
server.listen(PORT, () => console.log("Navigator running at http://localhost:" + PORT));
