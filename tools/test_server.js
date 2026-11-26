// Run: node tools/test_server.js   (starts the server on a temp database and exercises the API)
const { spawn } = require("child_process");
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");

const PORT = 3977, BASE = "http://localhost:" + PORT;
const DATA_FILE = path.join(os.tmpdir(), "nav-test-" + Date.now() + ".json");
const srv = spawn("node", [path.join(__dirname, "..", "server", "server.js")], {
  env: Object.assign({}, process.env, { PORT, DATA_FILE, ADMIN_EMAIL: "admin@test.in", ADMIN_PASSWORD: "admin-pass-1" }), stdio: "pipe" });

async function call(method, url, body, token) {
  const r = await fetch(BASE + url, { method, headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
}

(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + "/api/health"); break; } catch (e) { await new Promise((r) => setTimeout(r, 100)); } }
  let r = await call("GET", "/api/health"); assert.strictEqual(r.status, 200);

  // static files, and nothing outside the public folders
  assert.strictEqual((await fetch(BASE + "/")).status, 200);
  assert.strictEqual((await fetch(BASE + "/js/core.js")).status, 200);
  assert.strictEqual((await fetch(BASE + "/server/db.json")).status, 404);
  assert.strictEqual((await fetch(BASE + "/server/server.js")).status, 404);
  assert.strictEqual((await fetch(BASE + "/..%2f..%2fetc/passwd")).status, 404);

  // accounts
  r = await call("POST", "/api/auth/register", { name: "Riya", email: "riya@test.in", password: "short" }); assert.strictEqual(r.status, 400);
  r = await call("POST", "/api/auth/register", { name: "Riya", email: "riya@test.in", password: "long-enough-1" }); assert.strictEqual(r.status, 201);
  const student = r.data.token; assert.strictEqual(r.data.user.role, "student");
  r = await call("POST", "/api/auth/register", { name: "Riya", email: "riya@test.in", password: "long-enough-1" }); assert.strictEqual(r.status, 409);
  r = await call("POST", "/api/auth/login", { email: "riya@test.in", password: "wrong" }); assert.strictEqual(r.status, 401);
  r = await call("POST", "/api/auth/login", { email: "admin@test.in", password: "admin-pass-1" }); assert.strictEqual(r.status, 200);
  const admin = r.data.token; assert.strictEqual(r.data.user.role, "admin");
  r = await call("GET", "/api/me", null, student); assert.strictEqual(r.data.user.name, "Riya");
  r = await call("GET", "/api/me", null, student + "x"); assert.strictEqual(r.status, 401);

  // shared campus state: students cannot write, admins can, everyone reads
  r = await call("PUT", "/api/campus/ncu/state", { blocked: { "old-lift": true } }); assert.strictEqual(r.status, 401);
  r = await call("PUT", "/api/campus/ncu/state", { blocked: { "old-lift": true } }, student); assert.strictEqual(r.status, 403);
  r = await call("PUT", "/api/campus/ncu/state", { blocked: { "old-lift": true }, edits: { "old-110": { name: "AI Lab", type: "lab" } } }, admin); assert.strictEqual(r.status, 200);
  r = await call("GET", "/api/campus/ncu/state"); assert.strictEqual(r.data.blocked["old-lift"], true); assert.strictEqual(r.data.edits["old-110"].name, "AI Lab");
  r = await call("GET", "/api/campus/nope/state"); assert.strictEqual(r.status, 404);
  // shared timetable and leave flags are admin-only, and cleaned on the way in
  const slot = { id: "t1", place: "old-105", days: [1, 3, 9, "x"], start: "09:00", end: "bad", subject: "Algorithms", faculty: "Dr. A. Sharma", evil: "<script>" };
  r = await call("PUT", "/api/campus/ncu/state", { timetable: [slot] }, student); assert.strictEqual(r.status, 403);
  r = await call("PUT", "/api/campus/ncu/state", { timetable: [slot], faculty: [{ name: "Dr. A. Sharma", dept: "CS", role: "Prof", place: "old-112", leave: "2026-11-19" }, { name: "B", dept: "CS", place: "old-113", leave: "tomorrow" }] }, admin); assert.strictEqual(r.status, 200);
  r = await call("GET", "/api/campus/ncu/state"); assert.deepStrictEqual(r.data.timetable[0].days, [1, 3]); assert.strictEqual(r.data.timetable[0].end, "10:00"); assert.strictEqual(r.data.timetable[0].evil, undefined);
  assert.strictEqual(r.data.faculty[0].leave, "2026-11-19"); assert.strictEqual(r.data.faculty[1].leave, "");
  r = await call("PUT", "/api/campus/ncu/state", { timetable: null, faculty: null }, admin); assert.strictEqual(r.data.timetable, null);

  // per-user data
  r = await call("PUT", "/api/me/data/ncu", { fav: ["old-105"], schedule: [{ id: "c1", subject: "OS", place: "new-N201", day: 1, time: "09:00" }] }, student); assert.strictEqual(r.status, 200);
  r = await call("GET", "/api/me/data/ncu", null, student); assert.deepStrictEqual(r.data.fav, ["old-105"]); assert.strictEqual(r.data.schedule[0].subject, "OS");
  r = await call("PUT", "/api/me/data/ncu", { fav: [], schedule: [{ id: "c2", subject: "DB", place: "old-105", day: 2, time: "10:00", dur: 90 }], prefs: { buffer: 99, remind: true, lang: "hi" } }, student);
  assert.strictEqual(r.data.schedule[0].dur, 90); assert.strictEqual(r.data.prefs.buffer, 30); assert.strictEqual(r.data.prefs.remind, true); assert.strictEqual(r.data.prefs.lang, "hi");
  r = await call("GET", "/api/me/data/ncu", null, admin); assert.deepStrictEqual(r.data, {});

  // campus import
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "greenfield.json"), "utf8")); pkg.id = "my-college"; pkg.name = "My College";
  r = await call("POST", "/api/campuses", pkg, student); assert.strictEqual(r.status, 403);
  r = await call("POST", "/api/campuses", { id: "x" }, admin); assert.strictEqual(r.status, 400);
  r = await call("POST", "/api/campuses", pkg, admin); assert.strictEqual(r.status, 201);
  r = await call("GET", "/api/campuses"); assert(r.data.some((c) => c.id === "my-college" && c.imported));
  r = await call("GET", "/api/campuses/my-college"); assert.strictEqual(r.data.name, "My College");
  r = await call("DELETE", "/api/campuses/my-college", null, admin); assert.strictEqual(r.status, 200);

  // roles
  r = await call("GET", "/api/users", null, student); assert.strictEqual(r.status, 403);
  r = await call("GET", "/api/users", null, admin); const riya = r.data.find((u) => u.email === "riya@test.in");
  r = await call("PUT", "/api/users/" + riya.id, { role: "admin" }, admin); assert.strictEqual(r.data.role, "admin");

  // nothing secret in the database dump
  await new Promise((res) => setTimeout(res, 150));
  const dump = fs.readFileSync(DATA_FILE, "utf8"); assert(!dump.includes("long-enough-1") && !dump.includes("admin-pass-1"));
  console.log("SERVER TESTS PASSED");
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => { srv.kill(); try { fs.unlinkSync(DATA_FILE); } catch (e) {} });
