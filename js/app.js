/* Navigator UI. Everything campus-specific comes from the data package;
   nothing in this file knows about a particular college.

   Two modes, decided at start:
   - server mode: the page is served by server/server.js. Accounts work, admin
     changes are shared with everyone, personal data follows the account.
   - demo mode: the page is opened as plain files. Everything is kept in this browser. */
(function () {
  "use strict";
  var C = window.NavCore, T = C.TYPES;
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;

  /* ---------- icons ---------- */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    route: '<path d="M3 11 21 3l-8 18-2-8z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    flag: '<path d="M5 21V4M5 4h13l-3 4.5 3 4.5H5"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    straight: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    left: '<path d="M18 20v-7a4 4 0 0 0-4-4H5M9 5 5 9l4 4"/>',
    right: '<path d="M6 20v-7a4 4 0 0 1 4-4h9M15 5l4 4-4 4"/>',
    back: '<path d="M8 20V9a5 5 0 0 1 10 0v2M4 16l4 4 4-4"/>',
    stairs: '<path d="M4 20h4v-4h4v-4h4V8h4"/>',
    lift: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m9 10 3-3 3 3M9 14l3 3 3-3"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12v.01"/>',
    arrive: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    start: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    swap: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    access: '<circle cx="11" cy="4.5" r="1.5"/><path d="M11 8v6h5l2 5M11 11h4M8.5 11.5a5 5 0 1 0 6 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 21V5"/>',
    cup: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 5h-2M7 3v2M11 3v2"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    parking: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M10 17V7h3a3 3 0 0 1 0 6h-3"/>',
    wc: '<circle cx="7" cy="5" r="2"/><circle cx="17" cy="5" r="2"/><path d="M7 9v11M4 13h6M17 9v11M14 15l3-6 3 6"/>',
    bridge: '<path d="M2 15h20M4 15V9M20 15V9M4 9c4 4 12 4 16 0M8 12v3M12 13v2M16 12v3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    prev: '<path d="m15 6-6 6 6 6"/>', next: '<path d="m9 6 6 6-6 6"/>'
  };
  var TYPE_ICON = { room: "door", lab: "flask", library: "book", cafe: "cup", medical: "cross", common: "users", auditorium: "mic",
    waiting: "clock", office: "user", wc: "wc", stairs: "stairs", lift: "lift", entrance: "door", building: "building",
    sports: "ball", parking: "parking", gate: "door", hostel: "building", faculty: "user", bridge: "bridge" };
  function ic(name) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  var I = window.NavI18n, tr = I.tr;
  function tname(ty) { return tr((T[ty] || { label: ty }).label); }
  function mins(n) { return n < 1 ? tr("under 1 min") : tr("{n} min", { n: n }); }
  function distTxt(m) { return tr("{n} m", { n: C.roundDist(m) }); }
  function floorTxt(name) { var x = tr(name); return x === name ? name.toLowerCase() : x; }
  function layerTitleL(id) {
    var c = S.campus, l = c.layers[id];
    if (!l) return "";
    if (l.kind === "outdoor") return tr("Campus grounds");
    var b = c.buildings[l.building];
    return (b ? b.name + ", " : "") + tr(l.name);
  }
  function whereL(p) { return layerTitleL(p.layer); }

  /* ---------- storage in this browser ---------- */
  var mem = {};
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? Object.assign({}, def, JSON.parse(v)) : def; } catch (e) { return mem[key] || def; } }
  function save(key, val) { mem[key] = val; try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }

  var G = load("navigator:global", { campus: null, theme: null, imported: {}, token: null, lang: null });
  var U = null;                                        // working state for the open campus
  var S = { campus: null, layer: null, sel: null, tab: "explore", q: "", cat: null, from: null, to: null,
    route: null, leg: 0, step: -1, view: { tx: 0, ty: 0, k: 1 }, importError: "", authMode: "login", authError: "", users: null,
    when: null, meetNow: false, meetMin: 20, meetDept: "", meetQ: "", meetMax: 20, meetDay: null, freeMin: 30, freeB: "", freeMax: 25, facSel: null, facFilter: "all", ttDay: null, ttMsg: null, csvMsg: null, speaking: false };
  var API = { on: false, user: null }, REMOTE = {};

  function saveU() { save("navigator:u:" + S.campus.id, U); }
  function sources() { return Object.assign({}, window.CAMPUS_DATA || {}, API.on ? {} : G.imported || {}, REMOTE); }
  function P(id) { return S.campus.places[id]; }
  function routeOpts() { return { accessible: !!U.accessible, blocked: U.blocked }; }
  function isAdmin() { return !!(API.user && API.user.role === "admin"); }
  function canManage() { return !API.on || isAdmin(); }

  /* ---------- server ---------- */
  function call(method, url, body) {
    var headers = { "Content-Type": "application/json" };
    if (G.token) headers.Authorization = "Bearer " + G.token;
    return fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "The server could not do that (" + r.status + ").");
        return data;
      });
    });
  }
  var personalTimer = null;
  function savePersonal() {                              // favourites, classes, location
    saveU();
    if (!API.on || !API.user) return;
    clearTimeout(personalTimer);
    var id = S.campus.id, data = { fav: U.fav, recent: U.recent, schedule: U.schedule, loc: U.loc, accessible: U.accessible, prefs: { buffer: U.buffer, remind: U.remind, lang: I.getLang() } };
    personalTimer = setTimeout(function () { call("PUT", "api/me/data/" + id, data).catch(function () { /* retried on next change */ }); }, 400);
  }
  function saveShared() {                                // renamed places, closures, events, faculty
    saveU();
    if (!API.on || !isAdmin()) return;
    call("PUT", "api/campus/" + S.campus.id + "/state", { edits: U.edits, blocked: U.blocked, events: U.events, faculty: U.faculty, timetable: U.timetable })
      .catch(function (e) { toast(e.message); });
  }
  function pullShared() {
    if (!API.on) return Promise.resolve();
    var id = S.campus.id;
    return call("GET", "api/campus/" + id + "/state").then(function (st) {
      if (S.campus.id !== id) return;
      U.edits = st.edits || {}; U.blocked = st.blocked || {}; U.events = st.events || null; U.faculty = st.faculty || null; U.timetable = st.timetable || null;
      saveU(); rebuild();
    }).catch(function () { /* keep what we have */ });
  }
  function pullPersonal() {
    if (!API.on || !API.user) return Promise.resolve();
    var id = S.campus.id;
    return call("GET", "api/me/data/" + id).then(function (d) {
      if (S.campus.id !== id) return;
      if (d && d.fav) {
        var ok = function (pid) { return !!P(pid); };
        U.fav = d.fav.filter(ok); U.recent = (d.recent || []).filter(ok); U.accessible = !!d.accessible;
        U.schedule = (d.schedule || []).filter(function (e) { return ok(e.place); });
        if (d.prefs && d.prefs.buffer != null) { U.buffer = d.prefs.buffer; U.remind = !!d.prefs.remind; }
        U.loc = d.loc && ok(d.loc) ? d.loc : null;
        saveU(); computeRoute(false); drawRoute(); renderWhere(); renderBody();
      } else savePersonal();                              // first sign-in: keep what this browser had
    }).catch(function () { /* offline */ });
  }
  function connect() {
    if (!/^https?:$/.test(location.protocol)) return;
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 4000);
    fetch("api/health", ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (h) {
      if (!h || !h.ok) return;
      API.on = true;
      var me = G.token ? call("GET", "api/me").then(function (d) { API.user = d.user; }, function () { G.token = null; save("navigator:global", G); }) : Promise.resolve();
      var list = call("GET", "api/campuses").then(function (cs) {
        return Promise.all(cs.filter(function (c) { return c.imported; }).map(function (c) {
          return call("GET", "api/campuses/" + c.id).then(function (d) { REMOTE[d.id] = d; });
        }));
      }).catch(function () { /* bundled campuses still work */ });
      return Promise.all([me, list]).then(function () {
        paintAccount(); renderWhere();
        if (REMOTE[G.campus] && S.campus.id !== G.campus) loadCampus(G.campus);
        return pullShared().then(pullPersonal).then(function () { renderBody(); });
      });
    }).catch(function () { /* no server: demo mode */ });
  }

  /* ---------- campus ---------- */
  function annotate(c) {
    c.placeList.forEach(function (p) {              // which staircase or lift a stairs/lift place belongs to
      if (p.type !== "stairs" && p.type !== "lift") return;
      c.adj[p.node].forEach(function (e) { if (e.conn) p.conn = e.conn; });
    });
    if (U.events) c.events = U.events.filter(function (e) { return c.places[e.place]; });
    if (U.faculty) c.faculty = U.faculty.map(function (f) { return Object.assign({}, f, { place: c.places[f.place] ? f.place : "" }); });
    if (U.timetable) C.indexTimetable(c, U.timetable);
  }
  function loadCampus(id) {
    var src = sources(), data = src[id] || src[Object.keys(src)[0]];
    U = load("navigator:u:" + data.id, { fav: [], recent: [], schedule: [], blocked: {}, edits: {}, events: null, faculty: null, timetable: null, loc: null, accessible: false, buffer: 3, remind: false, notified: {} });
    S.campus = C.build(data, U.edits); annotate(S.campus);
    var ok = function (pid) { return !!S.campus.places[pid]; };
    U.fav = U.fav.filter(ok); U.recent = U.recent.filter(ok); U.schedule = U.schedule.filter(function (e) { return ok(e.place); });
    if (U.loc && !ok(U.loc)) U.loc = null;
    G.campus = data.id; save("navigator:global", G);
    S.sel = null; S.facSel = null; S.when = null; S.from = U.loc; S.to = null; S.route = null; S.q = ""; S.cat = null; $("q").value = "";
    $("brand").textContent = S.campus.shortName + " Navigator";
    $("campus-name").textContent = S.campus.name;
    document.title = S.campus.shortName + " Navigator";
    setLayer(S.campus.layerList[0].id, true);
    renderTabs(); renderBody();
  }
  function rebuild() {
    S.campus = C.build(S.campus.data, U.edits); annotate(S.campus);
    if (S.sel && !P(S.sel)) S.sel = null;
    computeRoute(false); drawLayer(); renderBody();
  }
  function isoDate(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function ownEvents() {                              // switch from the bundled list to an editable one
    if (!U.events) U.events = S.campus.events.map(function (e, i) { return { id: "e" + i, title: e.title, place: e.place, date: isoDate(eventDate(e)), time: e.time, desc: e.desc || "" }; });
    return U.events;
  }
  function ownFaculty() {
    if (!U.faculty) U.faculty = S.campus.faculty.map(function (f, i) { return { id: "f" + i, name: f.name, dept: f.dept, role: f.role || "", place: f.place, leave: f.leave || "" }; });
    return U.faculty;
  }
  function ownTimetable() {
    if (!U.timetable) U.timetable = S.campus.timetable.map(C.plainSlot);
    return U.timetable;
  }
  function retime() { C.indexTimetable(S.campus, U.timetable || S.campus.data.timetable || []); saveShared(); renderBody(); }

  /* ---------- map ---------- */
  var svg = $("svg"), world = $("world"), anim = null;
  var mobile = window.matchMedia("(max-width: 760px)");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var BADGE_FIRST = { wc: 1, stairs: 1, lift: 1 };

  function drawLayer() {
    var c = S.campus, L = c.layers[S.layer], out = L.kind === "outdoor", h = [];
    h.push('<rect class="plate-shadow" x="6" y="14" width="' + L.width + '" height="' + L.height + '" rx="26"/>');
    h.push('<rect class="plate ' + (out ? "outdoor" : "") + '" x="0" y="0" width="' + L.width + '" height="' + L.height + '" rx="' + (out ? 26 : 12) + '"/>');
    (L.shapes || []).forEach(function (s) {
      if (s.kind === "tree") h.push('<circle class="s-tree-2" cx="' + (s.x + 5) + '" cy="' + (s.y + 8) + '" r="24"/><circle class="s-tree" cx="' + s.x + '" cy="' + s.y + '" r="24"/><circle class="s-tree-2" cx="' + (s.x - 6) + '" cy="' + (s.y - 6) + '" r="9"/>');
      else if (s.kind === "void") h.push('<rect class="s-void" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '"/><polyline class="s-wall" points="' + s.x + "," + Math.max(0, s.y) + " " + s.x + "," + (s.y + s.h) + " " + Math.min(L.width, s.x + s.w) + "," + (s.y + s.h) + '"/>');
      else if (s.kind === "label") h.push('<text class="area-label" x="' + s.x + '" y="' + s.y + '"' + (s.rot ? ' transform="rotate(' + s.rot + " " + s.x + " " + s.y + ')"' : "") + ">" + esc(s.text) + "</text>");
      else if (s.kind === "bridge") {
        h.push('<rect class="s-bridge" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="3"/>' +
          '<line class="bridge-rail" x1="' + s.x + '" y1="' + (s.y + 5) + '" x2="' + (s.x + s.w) + '" y2="' + (s.y + 5) + '"/><line class="bridge-rail" x1="' + s.x + '" y1="' + (s.y + s.h - 5) + '" x2="' + (s.x + s.w) + '" y2="' + (s.y + s.h - 5) + '"/>');
      } else if (s.kind === "grill") {
        var gx = s.x, gy = s.y, gw = s.w, gh = s.h;
        h.push('<path class="s-grill" d="M' + gx + " " + gy + " A" + gw / 2 + " " + gh + " 0 0 0 " + (gx + gw) + " " + gy + '"/><path class="s-grill" d="M' + (gx + 16) + " " + gy + " A" + (gw / 2 - 16) + " " + (gh - 14) + " 0 0 0 " + (gx + gw - 16) + " " + gy + '"/>' +
          '<text class="court-label" x="' + (gx + gw / 2) + '" y="' + (gy + gh - 28) + '" font-size="16">GRILL</text>');
      } else if (s.kind === "court") {
        h.push('<rect class="s-court" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="4"/>');
        if (s.w > 300) h.push('<text class="court-label" x="' + (s.x + s.w / 2) + '" y="' + (s.y + s.h / 2) + '" font-size="' + Math.min(30, s.h / 5) + '">COURTYARD</text>');
      } else {
        h.push('<rect class="s-' + esc(s.kind) + '" x="' + s.x + '" y="' + s.y + '" width="' + s.w + '" height="' + s.h + '" rx="' + (s.kind === "road" ? 10 : 0) + '"/>');
        if (s.kind === "road" && Math.max(s.w, s.h) > 120) h.push(s.w > s.h
          ? '<line class="road-mark" x1="' + (s.x + 20) + '" y1="' + (s.y + s.h / 2) + '" x2="' + (s.x + s.w - 20) + '" y2="' + (s.y + s.h / 2) + '"/>'
          : '<line class="road-mark" x1="' + (s.x + s.w / 2) + '" y1="' + (s.y + 20) + '" x2="' + (s.x + s.w / 2) + '" y2="' + (s.y + s.h - 20) + '"/>');
      }
    });
    c.placeList.forEach(function (p) {
      if (p.layer !== S.layer) return;
      var closed = p.conn && U.blocked[p.conn], cx = p.x + p.w / 2, cy = p.y + p.h / 2, rx = p.shape === "pill" ? p.h / 2 : out ? 12 : 5, g = [];
      if (out && ["building", "hostel", "cafe", "parking"].indexOf(p.type) >= 0) g.push('<rect class="depth" x="' + (p.x + 4) + '" y="' + (p.y + 7) + '" width="' + p.w + '" height="' + p.h + '" rx="' + rx + '"/>');
      g.push('<rect class="shape" x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="' + rx + '"/>');
      if (p.court) g.push('<rect class="deco inner" x="' + (p.x + p.w * 0.16) + '" y="' + (p.y + p.h * 0.22) + '" width="' + p.w * 0.68 + '" height="' + p.h * 0.56 + '" rx="4"/>');
      if (p.type === "sports") g.push('<ellipse class="deco" cx="' + cx + '" cy="' + cy + '" rx="' + p.w * 0.36 + '" ry="' + p.h * 0.34 + '"/><line class="deco" x1="' + cx + '" y1="' + (p.y + p.h * 0.16) + '" x2="' + cx + '" y2="' + (p.y + p.h * 0.84) + '"/>');
      if (p.type === "parking") for (var bx = p.x + 40; bx < p.x + p.w - 20; bx += 50) g.push('<line class="deco bay" x1="' + bx + '" y1="' + p.y + '" x2="' + bx + '" y2="' + (p.y + p.h * 0.4) + '"/>');
      var badge = ["room", "entrance", "gate"].indexOf(p.type) < 0;
      if (badge) g.push('<g class="poi"><circle r="14"/><g transform="translate(-9 -9) scale(.75)">' + ICONS[TYPE_ICON[p.type] || "door"] + "</g></g>");
      if (out) g.push('<text class="ext" x="' + cx + '" y="' + (p.y + p.h) + '"></text>');
      g.push('<text x="' + cx + '" y="' + cy + '"></text>');
      h.push('<g class="pl t-' + esc(p.type) + (closed ? " closed" : "") + '" data-id="' + esc(p.id) + '" data-x="' + cx + '" data-y="' + (p.court ? p.y + p.h * 0.11 : cy) + '" data-w="' + p.w + '" data-by="' + (p.y + p.h) + '" data-h="' + (p.court ? p.h * 0.22 : p.h) +
        '" data-full="' + esc(p.name) + '" data-short="' + esc(closed ? "Closed" : p.label || "") + '"' + (BADGE_FIRST[p.type] ? ' data-pref="badge"' : "") + ">" + g.join("") + "</g>");
    });
    h.push('<g id="route-g"></g><g id="mk-g"></g>');
    world.innerHTML = h.join("");
    drawRoute(); markPlaces(); applyView();
    renderLayers(); renderWhere(); renderLegbar();
  }

  function drawRoute() {
    var g = $("route-g"), mk = $("mk-g"), h = [], m = [], r = S.route;
    if (!g) return;
    if (r && r.legs) r.legs.forEach(function (leg, i) {
      if (leg.layer !== S.layer || leg.pts.length < 1) return;
      var pts = leg.pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
      if (leg.pts.length > 1) h.push('<polyline class="route-case" points="' + pts + '"/><polyline class="route-solid" points="' + pts + '"/><polyline class="route-line" points="' + pts + '"/>');
      var a = leg.pts[0], b = leg.pts[leg.pts.length - 1];
      m.push(i === 0 ? fix(a, '<circle class="mk-start" r="8"/>') : fix(a, '<circle class="mk-via" r="8"/>'));
      m.push(i === r.legs.length - 1
        ? fix(b, '<path class="mk-end" d="M0 0C-9-10-13-16-13-22a13 13 0 1 1 26 0c0 6-4 12-13 22z"/><circle class="mk-end-dot" cy="-22" r="5"/>')
        : fix(b, '<circle class="mk-via" r="8"/>'));
    });
    var here = U.loc && P(U.loc);
    if (here && here.layer === S.layer) {
      var d = here.door || [here.x + here.w / 2, here.y + here.h / 2];
      m.unshift(fix(d, '<circle class="mk-here-ring" r="16"/><circle class="mk-here" r="8"/>'));
    }
    g.innerHTML = h.join(""); mk.innerHTML = m.join("");
    placeFixed();
  }
  function fix(p, inner) { return '<g class="fix" data-x="' + p[0] + '" data-y="' + p[1] + '">' + inner + "</g>"; }
  function placeFixed() {
    var k = S.view.k;
    world.querySelectorAll(".fix").forEach(function (el) {
      el.setAttribute("transform", "translate(" + el.dataset.x + " " + el.dataset.y + ") scale(" + 1 / k + ")");
    });
  }

  function listIds() {              // places the current search or filter is showing
    var ids = {};
    if (S.tab !== "explore") return ids;
    if (S.q) C.search(S.campus, S.q, 60).forEach(function (r) { ids[r.place.id] = 1; });
    else if (S.cat === "faculty") S.campus.faculty.forEach(function (f) { ids[f.place] = 1; });
    else if (S.cat) S.campus.placeList.forEach(function (p) { if (p.type === S.cat) ids[p.id] = 1; });
    return ids;
  }
  function markPlaces() {
    var ids = listIds();
    world.querySelectorAll(".pl").forEach(function (el) {
      el.classList.toggle("sel", el.dataset.id === S.sel);
      el.classList.toggle("hit", !!ids[el.dataset.id]);
    });
  }

  /* Labels and icon badges keep a constant size on screen; each place shows
     as much as fits: icon + name, name only, icon only, or nothing. */
  function applyView() {
    var v = S.view, k = v.k;
    if (!(k > 0) || !isFinite(v.tx) || !isFinite(v.ty)) return;       // a view that is not laid out yet
    world.setAttribute("transform", "translate(" + v.tx + " " + v.ty + ") scale(" + k + ")");
    var fs = Math.max(12, Math.min(17, 13 * Math.sqrt(k * 2))), cw = fs * 0.63;
    world.style.fontSize = fs / k + "px";
    var taken = [], cand = [];
    world.querySelectorAll(".pl").forEach(function (el) {
      var d = el.dataset, sw = d.w * k, sh = d.h * k, t = el.lastElementChild, poi = el.querySelector(".poi");
      var txt = sh <= fs + 6 ? "" : d.full.length * cw <= sw - 10 ? d.full : d.short.length * cw <= sw - 6 ? d.short : "";
      var canBadge = !!poi && sw >= 32 && sh >= 32, both = canBadge && txt && sh >= 62, y = +d.y;
      if (poi) {
        var show = both || (canBadge && (!txt || d.pref === "badge"));
        if (show && !both) txt = "";
        poi.style.display = show ? "" : "none";
        if (show) poi.setAttribute("transform", "translate(" + d.x + " " + (both ? y - 11 / k : y) + ") scale(" + 1 / k + ")");
        if (both) y += 15 / k;
      }
      t.setAttribute("y", y);
      if (t.textContent !== txt) t.textContent = txt;
      if (txt) taken.push({ x: +d.x, y: +d.y, w: txt.length * cw / k, h: fs * 1.2 / k });
      var ex = el.querySelector(".ext");          // outdoor places too small for a name inside get it underneath
      if (ex) {
        var et = txt && !(poi && poi.style.display !== "none" && !both) ? "" : d.full;
        if (et && !txt && d.short && d.short.length * cw <= sw - 6 && sh > fs + 6) et = "";
        if (ex.textContent) ex.textContent = "";
        if (et) cand.push({ ex: ex, text: et, x: +d.x, y: +d.by + (fs * 0.95) / k, w: et.length * cw / k, h: fs * 1.2 / k, area: d.w * d.h });
      }
    });
    /* Name labels outside shapes: biggest places first, and a label that would overlap another is left out
       (zoom in and it appears). This keeps the map readable when it is zoomed out. */
    cand.sort(function (a, b) { return b.area - a.area; });
    cand.forEach(function (c) {
      var clash = taken.some(function (t) { return Math.abs(t.x - c.x) < (t.w + c.w) / 2 && Math.abs(t.y - c.y) < (t.h + c.h) / 2; });
      if (clash) return;
      taken.push(c);
      c.ex.setAttribute("y", c.y);
      c.ex.textContent = c.text;
    });
    placeFixed();
  }

  function insets() {
    if (mobile.matches) return { l: 12, t: 104, r: 66, b: $("panel").offsetHeight + 12 };
    return { l: 452, t: 66, r: 92, b: S.route && S.route.legs && S.route.legs.length > 1 ? 90 : 28 };
  }
  function boxView(x, y, w, h, maxK) {
    var r = svg.getBoundingClientRect(), i = insets();
    var aw = Math.max(80, r.width - i.l - i.r), ah = Math.max(80, r.height - i.t - i.b);
    var k = Math.min(aw / w, ah / h, maxK || 3);
    return { k: k, tx: i.l + (aw - w * k) / 2 - x * k, ty: i.t + (ah - h * k) / 2 - y * k };
  }
  function go(target, instant) {
    if (anim) cancelAnimationFrame(anim);
    if (!target || !(target.k > 0) || !isFinite(target.tx) || !isFinite(target.ty)) return;
    if (instant || reduced.matches) { S.view = target; applyView(); return; }
    var from = S.view, t0 = performance.now();
    (function tick(now) {
      var t = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - t, 3);
      S.view = { k: from.k + (target.k - from.k) * e, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e };
      applyView();
      if (t < 1) anim = requestAnimationFrame(tick);
    })(t0);
  }
  function fitLayer(instant) { var L = S.campus.layers[S.layer]; go(boxView(-20, -20, L.width + 40, L.height + 40), instant); }
  function focusPoint(pt, w, h) { go(boxView(pt[0] - w / 2, pt[1] - h / 2, w, h)); }
  function focusPlace(p) {
    var L = S.campus.layers[p.layer];
    if (L.kind === "outdoor") return fitLayer();
    focusPoint([p.x + p.w / 2, p.y + p.h / 2], Math.min(L.width + 40, 900), Math.min(L.height + 40, 560));
  }
  function fitLeg(leg) {
    var xs = leg.pts.map(function (p) { return p[0]; }), ys = leg.pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var w = Math.max(560, x1 - x0 + 260), h = Math.max(300, y1 - y0 + 220);
    go(boxView((x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h));
  }
  function zoomAt(x, y, f) {
    if (anim) cancelAnimationFrame(anim);
    var v = S.view, k = Math.max(0.06, Math.min(8, v.k * f)); f = k / v.k;
    S.view = { k: k, tx: x - (x - v.tx) * f, ty: y - (y - v.ty) * f };
    applyView();
  }
  function setLayer(id, fit) {
    if (!S.campus.layers[id]) return;
    S.layer = id; drawLayer();
    if (fit) fitLayer(true);
  }

  /* pointer: drag to pan, pinch or wheel to zoom, tap to select */
  var ptrs = {}, moved = 0, downEl = null;
  function pcount() { return Object.keys(ptrs).length; }
  function local(e) { var r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  svg.addEventListener("pointerdown", function (e) {
    if (!pcount()) { moved = 0; downEl = e.target; }
    ptrs[e.pointerId] = local(e);
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    $("map").classList.add("drag");
  });
  svg.addEventListener("pointermove", function (e) {
    var prev = ptrs[e.pointerId];
    if (!prev) return;
    var cur = local(e), ids = Object.keys(ptrs);
    if (ids.length === 1) {
      moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (moved > 4) { if (anim) cancelAnimationFrame(anim); S.view.tx += cur.x - prev.x; S.view.ty += cur.y - prev.y; applyView(); }
    } else if (ids.length === 2) {
      var o = ptrs[ids[0] === String(e.pointerId) ? ids[1] : ids[0]];
      var d0 = Math.hypot(prev.x - o.x, prev.y - o.y), d1 = Math.hypot(cur.x - o.x, cur.y - o.y);
      moved += 10;
      if (d0 > 0) zoomAt((cur.x + o.x) / 2, (cur.y + o.y) / 2, d1 / d0);
    }
    ptrs[e.pointerId] = cur;
  });
  function pointerEnd(e) {
    if (!ptrs[e.pointerId]) return;
    var single = pcount() === 1;
    delete ptrs[e.pointerId];
    if (!pcount()) $("map").classList.remove("drag");
    if (e.type === "pointerup" && single && moved < 6 && downEl && downEl.closest) {
      var el = downEl.closest(".pl");
      if (el) select(el.dataset.id, false);
    }
  }
  svg.addEventListener("pointerup", pointerEnd);
  svg.addEventListener("pointercancel", pointerEnd);
  svg.addEventListener("wheel", function (e) { e.preventDefault(); var p = local(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  window.addEventListener("resize", function () { fitLayer(true); });

  /* ---------- map chrome ---------- */
  function renderLayers() {
    var c = S.campus, cur = c.layers[S.layer], h = [], onRoute = {};
    if (S.route && S.route.legs) S.route.legs.forEach(function (l) { onRoute[l.layer] = 1; });
    var btn = function (id, label, title, on, dot) {
      return '<button class="dock-btn' + (on ? " on" : "") + (dot ? " route" : "") + '" type="button" data-layer="' + esc(id) + '" title="' + esc(title) + '">' + esc(label) + "</button>";
    };
    c.layerList.forEach(function (l) { if (l.kind === "outdoor") h.push(btn(l.id, tr(l.short || "Campus"), tr("Campus overview"), l.id === S.layer, onRoute[l.id])); });
    c.buildingList.forEach(function (b) {
      var open = cur.building === b.id;
      h.push(btn(open ? S.layer : b.floors[0], b.short || b.name, b.name, open, b.floors.some(function (f) { return onRoute[f]; })));
    });
    var b = c.buildings[cur.building];
    if (b) {
      h.push('<div class="dock-sep"></div><div class="dock-label">' + esc(tr("Floor")) + '</div>');
      b.floors.slice().reverse().forEach(function (fid) { var l = c.layers[fid]; h.push(btn(fid, tr(l.short), tr(l.name), fid === S.layer, onRoute[fid])); });
    }
    $("layers").innerHTML = h.join("");
  }
  $("layers").addEventListener("click", function (e) {
    var b = e.target.closest("[data-layer]");
    if (b) { setLayer(b.dataset.layer, true); syncLeg(); }
  });
  function syncLeg() {
    if (!S.route || !S.route.legs) return;
    S.route.legs.forEach(function (l, i) { if (l.layer === S.layer) S.leg = i; });
    renderLegbar();
  }
  function renderWhere() {
    var h = '<span class="chip">' + esc(layerTitleL(S.layer)) + "</span>";
    if (U.loc && P(U.loc)) h += '<span class="chip here">' + ic("locate") + esc(tr("You are at {name}", { name: P(U.loc).name })) + "</span>";
    if (typeof navigator !== "undefined" && navigator.onLine === false) h += '<span class="chip off">' + esc(tr("Offline")) + "</span>";
    $("where").innerHTML = h;
  }
  function renderLegbar() {
    var bar = $("legbar"), r = S.route;
    if (!r || !r.legs || r.legs.length < 2) { bar.hidden = true; return; }
    var n = r.legs.length, i = S.leg, last = i === n - 1;
    bar.hidden = false;
    bar.innerHTML = '<div class="legbar-in"><button type="button" data-leg="-1" aria-label="' + esc(tr("Previous part")) + '"' + (i === 0 ? " disabled" : "") + ">" + ic("prev") + "</button>" +
      '<div class="legbar-txt">' + esc(layerTitleL(r.legs[i].layer)) + "<small>" + esc(tr("Part {i} of {n}", { i: i + 1, n: n })) + "</small></div>" +
      '<button type="button" class="next" data-leg="1"' + (last ? " disabled" : "") + ">" + esc(last ? tr("Arrived") : tr("Next")) + ic("next") + "</button></div>";
  }
  $("legbar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-leg]");
    if (b && !b.disabled) showLeg(S.leg + Number(b.dataset.leg));
  });
  function showLeg(i) {
    var legs = S.route.legs;
    S.leg = Math.max(0, Math.min(legs.length - 1, i));
    if (legs[S.leg].layer !== S.layer) setLayer(legs[S.leg].layer, false); else renderLegbar();
    fitLeg(legs[S.leg]);
  }
  $("zoom-in").innerHTML = ic("plus"); $("zoom-out").innerHTML = ic("minus"); $("zoom-fit").innerHTML = ic("fit"); $("go-loc").innerHTML = ic("locate");
  function zoomBtn(f) { var r = svg.getBoundingClientRect(), i = insets(); zoomAt(i.l + (r.width - i.l - i.r) / 2, i.t + (r.height - i.t - i.b) / 2, f); }
  $("zoom-in").onclick = function () { zoomBtn(1.4); };
  $("zoom-out").onclick = function () { zoomBtn(1 / 1.4); };
  $("zoom-fit").onclick = function () { fitLayer(); };
  $("go-loc").onclick = function () {
    var p = U.loc && P(U.loc);
    if (!p) return toast(tr("Pick a place and press I am here to set your location."));
    if (p.layer !== S.layer) setLayer(p.layer, false);
    focusPlace(p);
  };

  /* ---------- actions ---------- */
  function select(id, focus) {
    var p = P(id);
    if (!p) return;
    S.sel = id; S.facSel = null; S.tab = "explore"; S.q = ""; S.cat = null; $("q").value = "";
    U.recent = [id].concat(U.recent.filter(function (x) { return x !== id; })).slice(0, 8); savePersonal();
    if (p.layer !== S.layer) { setLayer(p.layer, false); focus = true; }
    if (focus) focusPlace(p);
    $("panel").classList.remove("min");
    renderTabs(); renderBody(); markPlaces(); setHash("p-" + id);
    $("body").scrollTop = 0;
  }
  function computeRoute(show) {
    S.route = null; S.leg = 0; S.step = -1;
    if (S.from && S.to && P(S.from) && P(S.to)) S.route = C.route(S.campus, S.from, S.to, routeOpts()) || { failed: true };
    var r = S.route;
    if (r && r.legs && r.legs.length && show) {
      if (r.legs[0].layer !== S.layer) setLayer(r.legs[0].layer, false);
      else { drawRoute(); renderLayers(); renderLegbar(); }
      fitLeg(r.legs[0]);
      setHash("r-" + S.from + "--" + S.to);
    } else { drawRoute(); renderLayers(); renderLegbar(); }
  }
  function showRoute(from, to) {
    S.from = from; S.to = to; S.tab = "directions"; S.q = ""; $("q").value = "";
    $("panel").classList.remove("min");
    computeRoute(true); renderTabs(); renderBody(); markPlaces();
  }
  function directionsTo(id) {
    var from = S.from && S.from !== id ? S.from : U.loc && U.loc !== id ? U.loc : null;
    showRoute(from, id);
  }
  function defaultStart() { return S.from || U.loc || (P("gate") ? "gate" : null); }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }
  function copy(text, done) {
    var ok = function () { toast(done); }, bad = function () {
      try { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); var r = document.execCommand("copy"); ta.remove(); r ? ok() : toast("Copy was blocked by the browser."); }
      catch (e) { toast("Copy was blocked by the browser."); }
    };
    try { navigator.clipboard.writeText(text).then(ok, bad); } catch (e) { bad(); }
  }
  var lastHash = "";
  function setHash(name) {
    lastHash = name;
    try { history.replaceState(null, "", "#" + name); } catch (e) { try { location.hash = name; } catch (e2) { /* sandboxed */ } }
  }
  function linkFor(name) { return location.href.split("#")[0] + "#" + name; }
  function readHash() {
    var h = decodeURIComponent((location.hash || "").slice(1));
    if (!h || h === lastHash) return;
    lastHash = h;
    if (h.indexOf("p-") === 0 && P(h.slice(2))) select(h.slice(2), true);
    else if (h.indexOf("at-") === 0 && P(h.slice(3))) checkIn(h.slice(3));
    else if (h === "free" || h === "leave") setTab(h === "free" ? "free" : "schedule");
    else if (h.indexOf("r-") === 0) {
      var parts = h.slice(2).split("--");
      if (P(parts[0]) && P(parts[1])) showRoute(parts[0], parts[1]);
    }
  }
  /* A scanned checkpoint: the visitor is standing at this place. */
  function checkIn(id) {
    U.loc = id; S.from = id; savePersonal(); select(id, true); drawRoute(); renderWhere();
    toast(tr("Checked in at {name}", { name: P(id).name }));
  }
  window.addEventListener("hashchange", readHash);

  /* Plain-language search in English, Hinglish or Hindi: "105 to N207", "library kidhar hai", "sabse paas washroom". */
  function smart(q) { return C.parse(S.campus, q); }
  function smartIcon(sm) { return ({ route: "route", nearest: "spark", free: "door", leave: "clock", faculty: "user", place: sm.go ? "route" : "arrive" })[sm.kind]; }
  function smartLabel(sm) {
    switch (sm.kind) {
      case "route": return tr("Directions from {a} to {b}", { a: sm.from.name, b: sm.to.name });
      case "nearest": return tr("Take me to the nearest {what}", { what: tname(sm.type).toLowerCase() });
      case "free": return tr("Show free rooms");
      case "leave": return tr("When should I leave for my next class?");
      case "faculty": return tr("Where is {name} right now?", { name: sm.faculty.name });
      default: return sm.go ? tr("Directions to {name}", { name: sm.place.name }) : tr("Show {name} on the map", { name: sm.place.name });
    }
  }
  function runSmart(sm) {
    S.q = ""; $("q").value = "";
    if (sm.kind === "route") return showRoute(sm.from.id, sm.to.id);
    if (sm.kind === "free") return setTab("free");
    if (sm.kind === "leave") return setTab("schedule");
    if (sm.kind === "faculty") return openFaculty(sm.faculty);
    if (sm.kind === "place") return sm.go ? directionsTo(sm.place.id) : select(sm.place.id, true);
    var start = defaultStart(), p = start && C.nearest(S.campus, start, sm.type, routeOpts());
    if (!p) return toast(tr("No {what} can be reached from your start.", { what: tname(sm.type).toLowerCase() }));
    showRoute(start, p.id);
  }

  /* ---------- panel: shared bits ---------- */
  var TABS = [["explore", "search", "Explore"], ["directions", "route", "Route"], ["free", "door", "Free now"], ["meet", "user", "Meet faculty"], ["schedule", "calendar", "Classes"],
    ["events", "flag", "Events"], ["saved", "star", "Saved"], ["manage", "sliders", "Manage"]];
  function renderTabs() {
    $("tabs").innerHTML = TABS.map(function (tb) {
      return '<button class="tab' + (S.tab === tb[0] ? " on" : "") + '" type="button" data-tab="' + tb[0] + '"' + (S.tab === tb[0] ? ' aria-current="page"' : "") + ">" + ic(tb[1]) + esc(tr(tb[2])) + "</button>";
    }).join("");
  }
  function setTab(name) {
    S.tab = name; $("panel").classList.remove("min");
    renderTabs(); renderBody(); markPlaces(); $("body").scrollTop = 0;
  }
  $("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (b) setTab(b.dataset.tab);
  });
  /* Rooms are shown as a door plate with their number; every other place gets a pictogram tile. */
  function lead(p) { return p.type === "room" && p.label ? '<span class="doorplate">' + esc(p.label) + "</span>" : tile(p.type); }
  function tile(type) { return '<span class="tile t-' + esc(type) + '">' + ic(TYPE_ICON[type] || "door") + "</span>"; }
  function liveChip(l) { return l ? '<span class="live ' + l.cls + '">' + esc(l.text) + "</span>" : ""; }
  /* Is a classroom free right now? Only rooms that have a timetable can tell. */
  function roomLive(p) {
    if (p.type !== "room" && p.type !== "lab") return null;
    var st = C.roomStatus(S.campus, p.id);
    if (!st.tracked) return null;
    if (st.state === "closed") return { cls: "off", text: tr("Campus closed"), st: st };
    if (st.state === "busy") return { cls: "busy", text: tr("In use until {time}", { time: t12m(st.until) }), st: st };
    return { cls: "ok", text: st.allDay ? tr("Free for the rest of the day") : tr("Free until {time}", { time: t12m(st.until) }), st: st };
  }
  function placeItem(p, act, extra, end) {
    if (end == null && (!act || act === "select")) end = liveChip(roomLive(p));
    return '<button class="item" type="button" data-act="' + (act || "select") + '" data-id="' + esc(p.id) + '"' + (extra || "") + ">" + lead(p) +
      '<span class="item-main"><span class="item-title">' + esc(p.name) + '</span><span class="item-sub">' + esc(whereL(p)) + "</span></span>" +
      (end ? '<span class="item-end">' + end + "</span>" : "") + "</button>";
  }
  function whenText(n) {
    if (!n) return "";
    var time = t12m(n.min);
    return n.daysAhead === 0 ? tr("today at {time}", { time: time }) : n.daysAhead === 1 ? tr("tomorrow at {time}", { time: time }) : tr("{day} at {time}", { day: tr(DAYS[n.day]), time: time });
  }
  function facText(fs) {
    var pl = fs.place && P(fs.place);
    switch (fs.state) {
      case "teaching": return { cls: "busy", text: tr("Teaching {subject} in {room} until {time}", { subject: fs.slot.subject || tr("a class"), room: pl ? pl.name : fs.room || tr("a classroom"), time: t12m(fs.until) }) };
      case "cabin": return { cls: "ok", text: tr("In cabin until {time}", { time: t12m(fs.until) }) };
      case "lunch": return { cls: "off", text: tr("On lunch break until {time}", { time: t12m(fs.until) }) };
      case "leave": return { cls: "off", text: tr("On leave today") };
      default: return { cls: "off", text: tr("Not on campus now. Back {when}", { when: whenText(fs.next) }) };
    }
  }
  function facultyItem(f) {
    var p = P(f.place), fs = C.facultyStatus(S.campus, f), x = facText(fs);
    return '<button class="item" type="button" data-act="faculty" data-id="' + esc(f.name) + '">' + tile("person") +
      '<span class="item-main"><span class="item-title">' + esc(f.name) + '</span><span class="item-sub">' + esc([f.dept, p ? p.name : ""].filter(Boolean).join(", ")) + "</span>" +
      '<span class="live ' + x.cls + '">' + esc(x.text) + "</span></span></button>";
  }
  function openFaculty(f) {                          // a teacher may have no cabin on the map yet
    if (P(f.place)) select(f.place, true); else { S.sel = null; S.route = null; S.tab = "explore"; S.q = ""; S.cat = null; $("q").value = ""; renderTabs(); markPlaces(); }
    S.facSel = f.name; renderBody(); $("panel").classList.remove("min");
  }
  function facultyByName(n) { return S.campus.faculty.filter(function (f) { return f.name === n; })[0]; }
  function natural(a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); }
  function eventDate(ev) {
    var d = ev.date ? new Date(ev.date + "T00:00:00") : new Date();
    if (!ev.date) d.setDate(d.getDate() + (ev.inDays || 0));
    d.setHours(0, 0, 0, 0); return d;
  }
  function dayLabel(d) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var diff = Math.round((d - t0) / 864e5);
    return diff === 0 ? tr("Today") : diff === 1 ? tr("Tomorrow") : d.toLocaleDateString(I.locale(), { weekday: "long", day: "numeric", month: "short" });
  }
  function t12(hm) { var a = String(hm || "00:00").split(":"), h = +a[0]; return (h % 12 || 12) + ":" + (a[1] || "00") + (h < 12 ? " am" : " pm"); }
  function t12m(min) { return t12(C.hm(((min % 1440) + 1440) % 1440)); }
  function longMins(n) {                              // 80 -> "1 h 20 min"
    n = Math.max(0, Math.round(n));
    return n < 60 ? mins(n) : tr("{h} h {m} min", { h: Math.floor(n / 60), m: n % 60 });
  }
  function placeOptions(types, selected) {
    var c = S.campus, groups = {}, order = [];
    c.placeList.filter(function (p) { return !types || types.indexOf(p.type) >= 0; }).sort(natural).forEach(function (p) {
      var g = whereL(p); if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(p);
    });
    return order.map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === selected ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</optgroup>";
    }).join("");
  }

  function renderBody() {
    var el = $("body");
    el.innerHTML = ({ explore: viewExplore, directions: viewDirections, free: viewFree, meet: viewMeet, schedule: viewSchedule, events: viewEvents, saved: viewSaved, manage: viewManage })[S.tab]();
    if (S.tab === "directions") renderDirResult();
    if (S.tab === "manage") paintQr();
  }

  /* ---------- Explore ---------- */
  function defaultDay() {                              // the day shown in a room timetable: today, or the next open day
    var cal = C.calendar(S.campus), d = new Date().getDay();
    return cal.days.indexOf(d) >= 0 ? d : cal.days[0];
  }
  function ttBlock(p) {
    var c = S.campus, all = (c.tt && c.tt.byPlace[p.id]) || [];
    if (p.type !== "room" && p.type !== "lab") return "";
    if (!all.length && !canManage()) return "";
    var cal = C.calendar(c), day = S.ttDay != null && cal.days.indexOf(S.ttDay) >= 0 ? S.ttDay : defaultDay(), list = C.slotsOn(c, p.id, day);
    var h = ["<h3>" + tr("Timetable") + '</h3><div class="seg days" role="group" aria-label="' + esc(tr("Day")) + '">' + cal.days.map(function (d) {
      return '<button type="button" data-act="ttday" data-id="' + d + '" class="' + (d === day ? "on" : "") + '">' + esc(tr(DAYS_SHORT[d])) + "</button>";
    }).join("") + "</div>"];
    if (!list.length) h.push('<p class="hint">' + (all.length ? tr("Nothing is booked here on {day}.", { day: tr(DAYS[day]) }) : tr("No timetable has been added for this room.")) + "</p>");
    else h.push('<div class="list">' + list.map(function (s) {
      var mine = s.days.every(function (d) { return U.schedule.some(function (e) { return e.place === s.place && e.day === d && e.time === s.start; }); });
      return '<div class="item slot"><span class="date-box"><b>' + esc(t12(s.start).split(" ")[0]) + "</b><span>" + esc(t12(s.start).split(" ")[1]) + '</span></span><span class="item-main"><span class="item-title">' + esc(s.subject || tr("Class")) +
        '</span><span class="item-sub">' + esc(t12(s.start)) + " - " + esc(t12(s.end)) + (s.room && !/^(RN|N) /.test(s.room) ? ", " + esc(s.room) : "") + (s.faculty ? ", " + esc(s.faculty) : "") + (s.cls ? ", " + esc(s.cls) : "") + "</span></span>" +
        '<button class="btn small' + (mine ? " on" : "") + '" type="button" data-act="addslot" data-id="' + esc(s.id) + '"' + (mine ? " disabled" : "") + ">" + (mine ? tr("Added") : tr("Add to my classes")) + "</button>" +
        (canManage() ? '<button class="icon-btn" type="button" data-act="delslot" data-id="' + esc(s.id) + '" aria-label="' + esc(tr("Remove this class slot")) + '">' + ic("trash") + "</button>" : "") + "</div>";
    }).join("") + "</div>");
    return h.join("");
  }
  function placeCard(p) {
    var c = S.campus, h = [], fav = U.fav.indexOf(p.id) >= 0, here = U.loc === p.id, live = roomLive(p);
    h.push('<div class="card place t-' + esc(p.type) + '"><div class="place-head">' + lead(p) + '<div class="item-main"><h2>' + esc(p.name) + '</h2><div class="hint">' + esc(whereL(p)) + "</div></div>" +
      '<button class="icon-btn" type="button" data-act="deselect" aria-label="' + esc(tr("Close place details")) + '">' + ic("x") + "</button></div>");
    h.push('<div class="row"><span class="badge type">' + esc(tname(p.type)) + "</span>" + (p.number ? '<span class="badge">' + esc(tr("No. {n}", { n: p.number })) + "</span>" : "") +
      (here ? '<span class="badge ok">' + esc(tr("You are here")) + "</span>" : "") + (p.conn && U.blocked[p.conn] ? '<span class="badge warn">' + esc(tr("Out of service")) + "</span>" : "") + liveChip(live) + "</div>");
    if (p.desc) h.push("<p>" + esc(p.desc) + "</p>");
    if (p.hours) h.push('<div class="meta">' + ic("clock") + "<span>" + esc(tr("Open {hours}", { hours: p.hours })) + "</span></div>");
    c.faculty.filter(function (f) { return f.place === p.id; }).forEach(function (f) {
      var x = facText(C.facultyStatus(c, f));
      h.push('<div class="meta">' + ic("user") + "<span><b>" + esc(f.name) + "</b>, " + esc(f.role || tr("Faculty")) + ", " + esc(f.dept) + '<br><span class="live ' + x.cls + '">' + esc(x.text) + "</span></span></div>");
    });
    c.events.filter(function (ev) { return ev.place === p.id; }).forEach(function (ev) {
      h.push('<div class="meta">' + ic("flag") + "<span><b>" + esc(ev.title) + "</b>, " + esc(dayLabel(eventDate(ev))) + " " + esc(tr("at {time}", { time: t12(ev.time) })) + "</span></div>");
    });
    var b = c.buildings[p.building];
    if (p.type === "building" && b) {
      h.push("<h3>" + tr("Open a floor plan") + '</h3><div class="row">' + b.floors.map(function (fid) {
        return '<button class="btn small" type="button" data-act="layer" data-id="' + esc(fid) + '">' + esc(tr(c.layers[fid].name)) + "</button>";
      }).join("") + "</div>");
    }
    h.push('<div class="btn-grid"><button class="btn primary" type="button" data-act="to" data-id="' + esc(p.id) + '">' + ic("route") + esc(tr("Directions")) + "</button>" +
      '<button class="btn" type="button" data-act="from" data-id="' + esc(p.id) + '">' + ic("start") + esc(tr("Start here")) + "</button>" +
      '<button class="btn' + (here ? " on" : "") + '" type="button" data-act="here" data-id="' + esc(p.id) + '" aria-pressed="' + here + '">' + ic("locate") + esc(tr("I am here")) + "</button>" +
      '<button class="btn' + (fav ? " on" : "") + '" type="button" data-act="fav" data-id="' + esc(p.id) + '" aria-pressed="' + fav + '">' + ic("star") + esc(fav ? tr("Saved") : tr("Save")) + "</button></div>");
    h.push(ttBlock(p));
    h.push('<button class="btn small" type="button" data-act="copylink" data-id="' + esc(p.id) + '">' + ic("link") + esc(tr("Copy link to this place")) + "</button></div>");
    return h.join("");
  }
  /* ---------- Meet faculty ---------- */
  function slotWhere(sl) { var q = sl && sl.place && P(sl.place); return q ? q.name : sl && sl.room || ""; }
  function windowNote(w) {
    var a = [];
    if (w.before) a.push(tr("After {subject} in {room}", { subject: w.before.subject || tr("a class"), room: slotWhere(w.before) }));
    if (w.after) a.push(tr("Next: {subject} in {room}", { subject: w.after.subject || tr("a class"), room: slotWhere(w.after) }));
    return a.join(". ");
  }
  function meetDayNow() {
    var cal = C.calendar(S.campus), d = new Date().getDay();
    return S.meetDay != null ? S.meetDay : cal.days.indexOf(d) >= 0 ? d : cal.days[0];
  }
  /* The part of a teacher's free window in which the student has no class of their own. */
  function bothFree(w, mine) {
    var free = [[w.s, w.e]];
    mine.forEach(function (e) {
      var a = C.toMin(e.time), b = a + (e.dur || 60), next = [];
      free.forEach(function (x) { if (b <= x[0] || a >= x[1]) return next.push(x); if (a > x[0]) next.push([x[0], a]); if (b < x[1]) next.push([b, x[1]]); });
      free = next;
    });
    return free.filter(function (x) { return x[1] - x[0] >= 15; });
  }
  function meetWeek(f) {
    var c = S.campus, cal = C.calendar(c), day = meetDayNow(), wins = C.facultyWindows(c, f, day, { min: 20, iso: C.isoOf(new Date()) }), cabin = P(f.place), h = [];
    var mine = U.schedule.filter(function (e) { return e.day === day; });
    h.push("<h3>" + esc(tr("When to meet")) + '</h3><div class="seg days" role="group" aria-label="' + esc(tr("Day")) + '">' + cal.days.map(function (d) {
      return '<button type="button" data-act="meetday" data-id="' + d + '" class="' + (d === day ? "on" : "") + '">' + esc(tr(DAYS[d].slice(0, 3))) + "</button>";
    }).join("") + "</div>");
    if (!wins.length) h.push('<p class="hint">' + esc(tr("No free time on this day.")) + "</p>");
    else h.push('<div class="list">' + wins.map(function (w) {
      var both = mine.length ? bothFree(w, mine) : null;
      return '<div class="item"><span class="date-box"><b>' + esc(t12(w.start).split(" ")[0]) + "</b><span>" + esc(t12(w.start).split(" ")[1]) + '</span></span><span class="item-main"><span class="item-title">' +
        esc(t12(w.start)) + " - " + esc(t12(w.end)) + '</span><span class="item-sub">' + esc(tr("{t} free", { t: longMins(w.mins) }) + (windowNote(w) ? ". " + windowNote(w) : "")) + "</span>" +
        (both ? '<span class="live ' + (both.length ? "ok" : "off") + '">' + esc(both.length ? tr("You are free too: {span}", { span: both.map(function (x) { return t12m(x[0]) + " - " + t12m(x[1]); }).join(", ") }) : tr("Clashes with your class")) + "</span>" : "") + "</span></div>";
    }).join("") + "</div>");
    if (cabin) h.push('<p class="hint small">' + esc(tr("Meet them at the cabin: {room}.", { room: cabin.name })) + "</p>");
    return h.join("");
  }
  function whenWord(daysAhead, day) { return daysAhead === 0 ? tr("Today") : daysAhead === 1 ? tr("Tomorrow") : tr(DAYS[day]); }
  function meetList() {
    var c = S.campus, q = C.norm(S.meetQ), now = new Date(), when = { day: now.getDay(), min: now.getHours() * 60 + now.getMinutes(), iso: C.isoOf(now) }, rows = [];
    c.faculty.forEach(function (f) {
      if ((S.meetDept && f.dept !== S.meetDept) || (q && C.norm(f.name + " " + f.dept).indexOf(q) < 0)) return;
      var w = C.nextWindow(c, f, when, { min: S.meetMin });
      if (w && (!S.meetNow || w.now)) rows.push({ f: f, w: w });
    });
    rows.sort(function (a, b) {
      return (b.w.now - a.w.now) || (a.w.daysAhead - b.w.daysAhead) || (a.w.s - b.w.s) || a.f.name.localeCompare(b.f.name);
    });
    if (!rows.length) return '<p class="hint">' + esc(tr("Nobody matches. Try a shorter time or another department.")) + "</p>";
    return '<p class="hint">' + esc(tr("{n} teachers. Each shows the next time you can meet them.", { n: rows.length })) + "</p>" + '<div class="list">' + rows.slice(0, S.meetMax).map(function (x) {
      var f = x.f, w = x.w, cab = P(f.place), span = t12m(w.s) + " - " + t12m(w.e);
      var line = w.now ? tr("Free now until {time}", { time: t12m(w.e) }) + " (" + longMins(w.mins) + ")" : tr("Next free: {day}, {span}", { day: whenWord(w.daysAhead, w.day), span: span });
      var note = w.before ? tr("After {subject} in {room}", { subject: w.before.subject || tr("a class"), room: slotWhere(w.before) }) : "";
      return '<div class="item rowitem">' + tile("person") + '<button class="item-main as-btn" type="button" data-act="faculty" data-id="' + esc(f.name) + '"><span class="item-title">' + esc(f.name) + '</span><span class="item-sub">' +
        esc([f.dept, cab ? cab.name : ""].filter(Boolean).join(", ")) + '</span><span class="live ' + (w.now ? "ok" : "off") + '">' + esc(line) + "</span>" + (note ? '<span class="item-sub">' + esc(note) + "</span>" : "") + "</button>" +
        (cab ? '<button class="icon-btn" type="button" data-act="to" data-id="' + esc(cab.id) + '" aria-label="' + esc(tr("Directions to cabin")) + '">' + ic("route") + "</button>" : "") + "</div>";
    }).join("") + "</div>" + (rows.length > S.meetMax ? '<button class="btn small" type="button" data-act="meetmore">' + esc(tr("Show more teachers")) + "</button>" : "");
  }
  function viewMeet() {
    var c = S.campus, h = ["<h2>" + esc(tr("Meet faculty")) + "</h2>"], depts = {};
    if (!c.faculty.length || !c.timetable.length) return h.concat(['<p class="hint">' + esc(tr("This campus has no timetable yet. An admin can import one from the Manage tab.")) + "</p>"]).join("");
    c.faculty.forEach(function (f) { if (f.dept) depts[f.dept] = 1; });
    h.push('<p class="hint">' + esc(tr("Teachers are free between their classes. Find a teacher, then go in their free time. If you have added your own timetable, the times you are both free are marked.")) + "</p>");
    h.push('<div class="seg" role="group" aria-label="' + esc(tr("Show")) + '"><button type="button" data-act="meetall" class="' + (S.meetNow ? "" : "on") + '">' + esc(tr("All teachers")) + '</button><button type="button" data-act="meetfree" class="' + (S.meetNow ? "on" : "") + '">' + esc(tr("Free now")) + "</button></div>");
    h.push('<input class="inp wide" id="mt-q" type="search" value="' + esc(S.meetQ) + '" placeholder="' + esc(tr("Search a teacher")) + '" aria-label="' + esc(tr("Search a teacher")) + '">');
    h.push('<div class="filters"><select class="inp" id="mt-min" aria-label="' + esc(tr("Free for at least")) + '">' + [[10, "At least 10 min"], [20, "At least 20 min"], [30, "At least 30 min"], [60, "At least 1 hour"]].map(function (x) {
      return '<option value="' + x[0] + '"' + (S.meetMin === x[0] ? " selected" : "") + ">" + esc(tr(x[1])) + "</option>";
    }).join("") + '</select><select class="inp" id="mt-dept" aria-label="' + esc(tr("Department")) + '"><option value="">' + esc(tr("All departments")) + "</option>" + Object.keys(depts).sort().map(function (n) {
      return '<option value="' + esc(n) + '"' + (S.meetDept === n ? " selected" : "") + ">" + esc(n) + "</option>";
    }).join("") + "</select></div>");
    h.push('<div id="meet-list">' + meetList() + "</div>");
    return h.join("");
  }
  function facultyCard(f) {
    var c = S.campus, fs = C.facultyStatus(c, f), x = facText(fs), cabin = P(f.place), now = fs.place && P(fs.place), h = [];
    h.push('<div class="card place t-faculty"><div class="place-head">' + tile("person") + '<div class="item-main"><h2>' + esc(f.name) + '</h2><div class="hint">' + esc(f.role || tr("Faculty")) + ", " + esc(f.dept) + "</div></div>" +
      '<button class="icon-btn" type="button" data-act="deselect" aria-label="' + esc(tr("Close place details")) + '">' + ic("x") + "</button></div>");
    h.push('<div class="row"><span class="live big ' + x.cls + '">' + esc(x.text) + "</span></div>");
    if (cabin) h.push('<div class="meta">' + ic("door") + "<span>" + esc(tr("Cabin: {room}", { room: cabin.name })) + ", " + esc(whereL(cabin)) + "</span></div>");
    else h.push('<div class="meta">' + ic("door") + "<span>" + esc(tr("Cabin not added yet. Look for them near their last or next class.")) + "</span></div>");
    h.push('<div class="btn-grid">' + (now ? '<button class="btn primary" type="button" data-act="to" data-id="' + esc(now.id) + '">' + ic("route") + esc(fs.state === "teaching" ? tr("Take me to their class") : tr("Take me to their cabin")) + "</button>" : "") +
      (cabin && now && cabin.id !== now.id ? '<button class="btn" type="button" data-act="to" data-id="' + esc(cabin.id) + '">' + ic("door") + esc(tr("Directions to cabin")) + "</button>" : "") + "</div>");
    var cal = C.calendar(c), day = new Date().getDay(), today = C.facultyDay(c, f, day);
    if (cal.days.indexOf(day) >= 0) h.push("<h3>" + tr("Classes today") + "</h3>" + (today.length ? '<div class="list">' + today.map(function (s) {
      var rp = P(s.place);
      return '<button class="item" type="button" ' + (rp ? 'data-act="select" data-id="' + esc(s.place) + '"' : "") + '><span class="date-box"><b>' + esc(t12(s.start).split(" ")[0]) + "</b><span>" + esc(t12(s.start).split(" ")[1]) + '</span></span><span class="item-main"><span class="item-title">' +
        esc(s.subject || tr("Class")) + '</span><span class="item-sub">' + esc(rp ? rp.name : s.room || "") + ", " + esc(t12(s.start)) + " - " + esc(t12(s.end)) + "</span></span></button>";
    }).join("") + "</div>" : '<p class="hint">' + tr("No classes today. Likely in the cabin.") + "</p>"));
    h.push(meetWeek(f));
    if (canManage()) h.push('<div class="form"><select class="inp wide" id="fa-cabin-set" data-name="' + esc(f.name) + '" aria-label="' + esc(tr("Cabin")) + '"><option value="">' + esc(tr("No cabin set")) + "</option>" +
      placeOptions(["room", "lab", "office", "common"], f.place) + "</select></div>");
    h.push("</div>");
    return h.join("");
  }
  function leaveHome() {
    var plan = planNow();
    return plan ? '<div data-live="leave">' + leaveCard(plan) + "</div>" : "";
  }
  function viewExplore() {
    var c = S.campus, h = [];
    if (S.facSel && !S.q && facultyByName(S.facSel)) h.push(facultyCard(facultyByName(S.facSel)));
    if (S.sel && !S.q && P(S.sel)) h.push(placeCard(P(S.sel)));
    if (!S.sel && !S.q && !S.cat) {
      var a = c.placeList.filter(function (p) { return p.type === "room"; })[4], b = c.placeList.filter(function (p) { return p.type === "room"; }).pop();
      var tries = [];
      if (a && b && a !== b) tries.push(tr("{a} to {b}", { a: a.number || a.name, b: b.number || b.name }));
      if (c.placeList.some(function (p) { return p.type === "cafe"; })) tries.push(tr("nearest cafe"));
      if (c.timetable.length) tries.push(tr("free rooms"));
      h.push('<div class="hero"><h2>' + esc(tr("Find a place on campus")) + "</h2><p>" + esc(tr("{n} places across {m} buildings. Search by room number or name, or type a trip.", { n: c.placeList.filter(function (p) { return ["stairs", "lift", "entrance"].indexOf(p.type) < 0; }).length, m: c.buildingList.length })) +
        '</p><div class="row">' + tries.map(function (q) { return '<button class="try" type="button" data-act="try" data-id="' + esc(q) + '">' + esc(q) + "</button>"; }).join("") + "</div></div>");
      if (c.timetable.length || c.faculty.length) h.push('<div class="now-row">' + (c.timetable.length && c.faculty.length ? '<button class="now-card" type="button" data-tab="meet"><span class="now-ic">' + ic("user") + "</span><b>" + esc(tr("Meet faculty")) + "</b><small>" + esc(tr("Who is free now")) + "</small></button>" : "") + (c.timetable.length ? '<button class="now-card" type="button" data-tab="free"><span class="now-ic">' + ic("door") + "</span><b>" + esc(tr("Free rooms")) + "</b><small>" + esc(tr("Empty right now")) + "</small></button>" : "") +
        '<button class="now-card" type="button" data-tab="schedule"><span class="now-ic">' + ic("clock") + "</span><b>" + esc(tr("Time to leave")) + "</b><small>" + esc(tr("For your next class")) + "</small></button></div>");
      h.push(leaveHome());
    }
    var count = {}; c.placeList.forEach(function (p) { count[p.type] = (count[p.type] || 0) + 1; });
    var cats = ["cafe", "lab", "wc", "library", "medical", "room", "auditorium", "common", "office", "sports", "parking", "hostel"].filter(function (ty) { return count[ty]; });
    if (!S.q) h.push('<div class="quick">' + cats.map(function (ty) {
      return '<button class="q-tile t-' + ty + (S.cat === ty ? " on" : "") + '" type="button" data-act="cat" data-id="' + ty + '" aria-pressed="' + (S.cat === ty) + '"><span class="q-ic">' + ic(TYPE_ICON[ty]) + "</span>" + esc(tr(T[ty].plural)) + "<small>" + count[ty] + "</small></button>";
    }).join("") + (c.faculty.length ? '<button class="q-tile t-faculty' + (S.cat === "faculty" ? " on" : "") + '" type="button" data-act="cat" data-id="faculty" aria-pressed="' + (S.cat === "faculty") + '"><span class="q-ic">' + ic("user") + "</span>" + esc(tr("Faculty")) + "<small>" + c.faculty.length + "</small></button>" : "") + "</div>");

    if (S.q) {
      var res = C.search(c, S.q, 40), sm = smart(S.q);
      if (sm) h.push('<button class="item smart" type="button" data-act="smart"><span class="tile">' + ic(smartIcon(sm)) + '</span><span class="item-main"><span class="item-title">' + esc(smartLabel(sm)) + '</span><span class="item-sub">' + esc(tr("Press Enter or tap here")) + "</span></span></button>");
      else h.push("<h3>" + esc(res.length === 1 ? tr("1 result for \"{q}\"", { q: S.q }) : tr("{n} results for \"{q}\"", { n: res.length, q: S.q })) + "</h3>");
      if (res.length && !(sm && sm.kind !== "place" && sm.kind !== "faculty")) h.push('<div class="list">' + res.map(function (r) { return r.kind === "faculty" ? facultyItem(r.faculty) : placeItem(r.place); }).join("") + "</div>");
      if (!res.length && !sm) h.push('<p class="hint">' + esc(tr("Nothing matches. Try a room number like 105 or N201, a word like lab or cafe, or a trip like \"105 to N207\".")) + "</p>");
    } else if (S.cat === "faculty") {
      var chips = [["all", "All"], ["cabin", "In cabin"], ["teaching", "Teaching"]], shown = c.faculty.filter(function (f) { return S.facFilter === "all" || C.facultyStatus(c, f).state === S.facFilter; });
      h.push("<h3>" + esc(tr("Faculty cabins")) + '</h3><div class="seg" role="group" aria-label="' + esc(tr("Filter faculty")) + '">' + chips.map(function (x) {
        return '<button type="button" data-act="facfilter" data-id="' + x[0] + '" class="' + (S.facFilter === x[0] ? "on" : "") + '">' + esc(tr(x[1])) + "</button>";
      }).join("") + "</div>" + (shown.length ? '<div class="list">' + shown.slice(0, 40).map(facultyItem).join("") + "</div>" + (shown.length > 40 ? '<button class="btn small" type="button" data-tab="meet">' + esc(tr("See all {n} teachers in Meet faculty", { n: shown.length })) + "</button>" : "") : '<p class="hint">' + esc(tr("Nobody matches right now.")) + "</p>"));
    } else if (S.cat) {
      var list = c.placeList.filter(function (p) { return p.type === S.cat; }).sort(natural);
      h.push("<h3>" + esc(tr("{n} {what}, highlighted on the map", { n: list.length, what: tr(T[S.cat].plural).toLowerCase() })) + "</h3>" + '<div class="list">' + list.map(function (p) { return placeItem(p); }).join("") + "</div>");
    } else {
      var poi = c.placeList.filter(function (p) { return ["room", "wc", "stairs", "lift", "entrance", "gate", "office", "waiting"].indexOf(p.type) < 0; });
      h.push("<h3>" + esc(tr("Popular places")) + "</h3>" + '<div class="list">' + poi.map(function (p) { return placeItem(p); }).join("") + "</div>");
    }
    return h.join("");
  }

  /* ---------- Directions ---------- */
  function fieldVal(id) { var p = id && P(id); return p ? p.name : ""; }
  /* Turn the engine's step into the interface language. English passes straight through. */
  function stepText(s) {
    if (I.getLang() === "en" || !s.k) return { text: s.text, sub: s.sub };
    var a = s.a || {}, ctx = a.out ? "Walk {d} along the walkway" : "Walk {d} along the corridor", d = a.m != null ? distTxt(a.m) : "";
    switch (s.k) {
      case "start": return { text: tr("Start at {name}", { name: a.name }), sub: layerTitleL(s.layer) };
      case "bridge": return { text: tr("Cross the bridge to {b}", { b: a.b }), sub: tr("You stay on the {fl}", { fl: floorTxt(a.fl) }) };
      case "exit": return { text: tr("Exit {b}", { b: a.b }), sub: tr("Continue outside") };
      case "enter": return { text: tr("Enter {b}", { b: a.b }), sub: tr("You are on the {fl}", { fl: floorTxt(a.fl) }) };
      case "level": return { text: tr(a.up ? "Take {what} up to the {fl}" : "Take {what} down to the {fl}", { what: a.lift ? tr("the lift") : a.what || tr("the stairs"), fl: floorTxt(a.fl) }), sub: a.n === 1 ? tr("1 floor") : tr("{n} floors", { n: a.n }) };
      case "across": return { text: tr("Walk straight across"), sub: d };
      case "walk": return { text: tr(ctx, { d: d }), sub: "" };
      case "turn": return { text: a.from ? tr("Leave {name} and turn {dir}", { name: a.from, dir: tr(a.dir === "back" ? "around" : a.dir) }) : tr(a.dir === "back" ? "Turn around" : a.dir === "left" ? "Turn left" : "Turn right"), sub: a.m >= 1.5 ? tr(ctx, { d: d }) : "" };
      case "arrive": return { text: tr("Arrive at {name}", { name: a.name }), sub: a.side ? tr("It is on your {side}", { side: tr(a.side) }) : layerTitleL(s.layer) };
    }
    return { text: s.text, sub: s.sub };
  }
  function viewDirections() {
    var near = ["wc", "cafe", "lift", "medical"].filter(function (ty) { return S.campus.placeList.some(function (p) { return p.type === ty; }); });
    return '<div class="od"><div class="od-fields">' +
      '<div class="field"><label for="f-from">' + esc(tr("From")) + '</label><input id="f-from" data-field="from" type="text" autocomplete="off" placeholder="' + esc(tr("Choose a start")) + '" value="' + esc(fieldVal(S.from)) + '"><div class="drop" id="drop-from"></div></div>' +
      '<div class="field"><label for="f-to">' + esc(tr("To")) + '</label><input id="f-to" data-field="to" type="text" autocomplete="off" placeholder="' + esc(tr("Choose a destination")) + '" value="' + esc(fieldVal(S.to)) + '"><div class="drop" id="drop-to"></div></div>' +
      '</div><button class="icon-btn" type="button" data-act="swap" aria-label="' + esc(tr("Swap start and destination")) + '">' + ic("swap") + "</button></div>" +
      '<label class="switch" for="sw-access"><input id="sw-access" type="checkbox" data-act="access"' + (U.accessible ? " checked" : "") + '><span class="grow">' + esc(tr("Step-free route (lifts only)")) + "</span>" + ic("access") + "</label>" +
      '<div class="stack"><h3>' + esc(tr("Take me to the nearest")) + '</h3><div class="row">' + near.map(function (ty) {
        return '<button class="btn small" type="button" data-act="nearest" data-id="' + ty + '">' + ic(TYPE_ICON[ty]) + esc(tname(ty)) + "</button>";
      }).join("") + '</div></div><div id="dir-result" class="stack" style="gap:14px"></div>';
  }
  function renderDirResult() {
    var el = $("dir-result"), r = S.route, h = [];
    if (!el) return;
    if (!S.from || !S.to) {
      h.push('<p class="hint">' + esc(!S.from && !S.to ? tr("Pick a start and a destination. You can also tap any room on the map and choose Directions.")
        : !S.from ? tr("Pick where you are starting from.") : tr("Pick where you want to go.")) + "</p>");
    } else if (r && r.same) {
      h.push('<p class="note">' + esc(tr("Start and destination are the same place.")) + "</p>");
    } else if (!r || r.failed) {
      var closed = Object.keys(U.blocked).some(function (k) { return U.blocked[k]; });
      h.push('<p class="note bad">' + esc(tr("No route found between these places.") + " " + (U.accessible ? tr("Step-free mode needs a working lift on the way.") + " " : "") +
        (closed ? tr("Some stairs or lifts are marked out of service.") : "")) + "</p>");
    } else {
      var changes = r.steps.filter(function (s) { return s.icon === "stairs" || s.icon === "lift"; }).length;
      h.push('<div class="summary"><div class="summary-time">' + esc(mins(C.roundMin(r.seconds))) + '</div><div class="summary-main">' + esc(tr("{a} to {b}", { a: r.from.name, b: r.to.name })) +
        '<div class="summary-sub">' + esc(tr("{d} walking", { d: distTxt(r.meters) }) + (changes ? ", " + (changes === 1 ? tr("1 floor change") : tr("{n} floor changes", { n: changes })) : "") + (r.accessible ? ", " + tr("step-free") : "")) + "</div></div></div>");
      h.push('<ol class="steps">' + r.steps.map(function (s, i) {
        var x = stepText(s);
        return '<li><button class="step' + (S.step === i ? " cur" : "") + '" type="button" data-act="step" data-id="' + i + '"><span class="step-ic k-' + s.icon + '">' + ic(s.icon) + "</span>" +
          '<span><span class="step-txt">' + esc(x.text) + "</span>" + (x.sub ? '<br><span class="step-sub">' + esc(x.sub) + "</span>" : "") + "</span></button></li>";
      }).join("") + "</ol>");
      h.push('<div class="row"><button class="btn small" type="button" data-act="copyroute">' + ic("link") + esc(tr("Copy route link")) + "</button>" +
        (window.speechSynthesis ? '<button class="btn small' + (S.speaking ? " on" : "") + '" type="button" data-act="speak">' + ic("mic") + esc(S.speaking ? tr("Stop reading") : tr("Read aloud")) + "</button>" : "") +
        '<button class="btn small" type="button" data-act="clearroute">' + ic("x") + esc(tr("Clear route")) + "</button></div>");
    }
    el.innerHTML = h.join("");
  }
  function showDrop(field, q) {
    var drop = $("drop-" + field), h = [];
    if (!drop) return;
    if (C.norm(q)) {
      var seen = {};
      C.search(S.campus, q, 12).forEach(function (r) { if (!seen[r.place.id] && h.length < 7) { seen[r.place.id] = 1; h.push(placeItem(r.place, "pick", ' data-field="' + field + '"', "")); } });
      if (!h.length) h.push('<p class="hint" style="padding:8px">' + esc(tr("No place matches.")) + "</p>");
    } else {
      var ids = [];
      if (U.loc) ids.push(U.loc);
      U.fav.concat(U.recent).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      ids.slice(0, 6).forEach(function (id) { h.push(placeItem(P(id), "pick", ' data-field="' + field + '"', id === U.loc ? esc(tr("My location")) : "")); });
    }
    drop.innerHTML = h.join("");
  }

  /* ---------- Free rooms ---------- */
  function whenObj() { return S.when ? { day: S.when.day, min: S.when.min } : undefined; }
  function freeStart() { return U.loc && P(U.loc) ? U.loc : P("gate") ? "gate" : null; }
  function freeList() {
    var c = S.campus, st = freeStart(), res = C.freeRooms(c, whenObj(), { from: st, minFree: S.freeMin, building: S.freeB || null, accessible: U.accessible, blocked: U.blocked }), h = [];
    if (res.closed) {
      return '<p class="note">' + esc(tr("The campus is closed at this time. It opens {when}.", { when: whenText(res.next) })) + "</p>";
    }
    if (!res.rooms.length) return '<p class="hint">' + esc(tr("No free room fits. Try a shorter time or another building.")) + "</p>";
    h.push('<p class="hint">' + esc(tr("{n} free rooms, nearest first.", { n: res.rooms.length })) + "</p>");
    h.push('<div class="list">' + res.rooms.slice(0, S.freeMax).map(function (x) {
      var p = x.place;
      return '<div class="item rowitem">' + lead(p) + '<button class="item-main as-btn" type="button" data-act="select" data-id="' + esc(p.id) + '"><span class="item-title">' + esc(p.name) + '</span><span class="item-sub">' + esc(whereL(p)) +
        (x.secs != null ? ", " + esc(tr("{t} walk", { t: mins(Math.max(1, C.roundMin(x.secs))) })) : "") + '</span><span class="live ok">' + esc(x.allDay ? tr("Free for the rest of the day") : tr("Free until {time}", { time: t12m(x.until) })) + "</span></button>" +
        '<button class="icon-btn" type="button" data-act="to" data-id="' + esc(p.id) + '" aria-label="' + esc(tr("Directions to {name}", { name: p.name })) + '">' + ic("route") + "</button></div>";
    }).join("") + "</div>" + (res.rooms.length > S.freeMax ? '<button class="btn small" type="button" data-act="freemore">' + esc(tr("Show more rooms")) + "</button>" : ""));
    return h.join("");
  }
  function viewFree() {
    var c = S.campus, h = ["<h2>" + esc(tr("Free rooms")) + "</h2>"], st = freeStart(), sp = st && P(st);
    if (!c.timetable.length) return h.concat(['<p class="hint">' + esc(tr("This campus has no timetable yet. An admin can import one from the Manage tab.")) + "</p>"]).join("");
    var d = S.when || { day: new Date().getDay(), min: new Date().getHours() * 60 + new Date().getMinutes() };
    h.push('<p class="hint">' + esc(tr("Rooms with nothing booked, for studying or a quick meeting. Based on the weekly timetable.")) + "</p>");
    h.push('<div class="seg" role="group" aria-label="' + esc(tr("When")) + '"><button type="button" data-act="whennow" class="' + (S.when ? "" : "on") + '">' + esc(tr("Now")) + '</button><button type="button" data-act="whenpick" class="' + (S.when ? "on" : "") + '">' + esc(tr("Pick a time")) + "</button></div>");
    if (S.when) h.push('<div class="form"><select class="inp" id="fr-day" aria-label="' + esc(tr("Day")) + '">' + DAYS.map(function (n, i) { return '<option value="' + i + '"' + (i === d.day ? " selected" : "") + ">" + esc(tr(n)) + "</option>"; }).join("") +
      '</select><input class="inp" id="fr-time" type="time" value="' + C.hm(d.min) + '" aria-label="' + esc(tr("Time")) + '"></div>');
    h.push('<div class="filters"><select class="inp" id="fr-min" aria-label="' + esc(tr("Free for at least")) + '">' + [[0, "Any time left"], [30, "At least 30 min"], [60, "At least 1 hour"], [120, "At least 2 hours"]].map(function (x) {
      return '<option value="' + x[0] + '"' + (S.freeMin === x[0] ? " selected" : "") + ">" + esc(tr(x[1])) + "</option>";
    }).join("") + '</select><select class="inp" id="fr-b" aria-label="' + esc(tr("Building")) + '"><option value="">' + esc(tr("All buildings")) + "</option>" + c.buildingList.map(function (b) {
      return '<option value="' + esc(b.id) + '"' + (S.freeB === b.id ? " selected" : "") + ">" + esc(b.name) + "</option>";
    }).join("") + "</select></div>");
    h.push('<p class="hint small">' + esc(sp ? (U.loc ? tr("Sorted by walking time from {name}.", { name: sp.name }) : tr("Sorted by walking time from {name}. Set your location for exact times.", { name: sp.name })) : "") + "</p>");
    h.push('<div id="free-list">' + freeList() + "</div>");
    return h.join("");
  }

  /* ---------- Classes and the time-to-leave planner ---------- */
  function planStart() { return U.loc && P(U.loc) ? U.loc : P("gate") ? "gate" : null; }
  function planNow() {
    if (!U.schedule.length) return null;
    return C.planLeave(S.campus, U.schedule, null, planStart(), { buffer: U.buffer, accessible: U.accessible, blocked: U.blocked });
  }
  function leaveCard(plan) {
    if (!plan) return '<div class="card hl"><h3>' + esc(tr("Time to leave")) + '</h3><p class="hint">' + esc(tr("Add your timetable once. This then tells you when to leave for every class, counting stairs, lifts and bridges on the way.")) + "</p></div>";
    var it = plan.items[plan.focus], p = P(it.cls.place), big, eta = "", kind = "ok";
    var dayTxt = plan.dayOff === 0 ? "" : plan.dayOff === 1 ? tr("Tomorrow") : tr(DAYS[plan.day]);
    var walk = it.walkMin == null ? "" : it.walkMin === 0 ? "" : tr("{t} walk", { t: mins(it.walkMin) });
    switch (it.status) {
      case "ok":
        big = dayTxt ? tr("{day}, leave at {time}", { day: dayTxt, time: t12m(it.leaveClock) }) : tr("Leave at {time}", { time: t12m(it.leaveClock) });
        eta = plan.dayOff === 0 ? tr("in {t}", { t: longMins(it.leaveRel) }) : ""; break;
      case "now": big = tr("Leave now"); eta = tr("Class starts in {t}", { t: longMins(it.rel) }); kind = "now"; break;
      case "late": big = tr("Leave now"); eta = tr("You will be about {t} late", { t: mins(Math.max(1, Math.round(it.lateBy))) }); kind = "late"; break;
      case "tight": big = tr("Leave as soon as the last class ends"); eta = it.lateBy ? tr("You will be about {t} late", { t: mins(it.lateBy) }) : tr("Leave at {time}", { time: t12m(it.leaveClock) }); kind = "late"; break;
      case "inprogress": big = tr("Class in progress"); eta = tr("Started at {time}", { time: t12m(it.startClock) }); break;
      default: big = tr("No route to the room"); eta = tr("Check for closed stairs or lifts."); kind = "late";
    }
    return '<div class="card leave ' + kind + '"><div class="leave-top"><span class="leave-lbl">' + esc(tr("Time to leave")) + '</span></div><div class="leave-big">' + esc(big) + "</div>" + (eta ? '<div class="leave-eta">' + esc(eta) + "</div>" : "") +
      '<div class="leave-sub">' + esc(it.cls.subject) + ", " + esc(p.name) + (p ? ", " + esc(whereL(p)) : "") + " " + esc(tr("at {time}", { time: t12m(it.startClock) })) + (walk ? ", " + esc(walk) : "") + "</div>" +
      '<div class="row"><button class="btn small light" type="button" data-act="leaveroute" data-id="' + esc(it.cls.place) + '">' + ic("route") + esc(tr("Take me there")) + "</button>" +
      '<button class="btn small light' + (U.remind ? " on" : "") + '" type="button" data-act="remind" aria-pressed="' + !!U.remind + '">' + ic("clock") + esc(U.remind ? tr("Reminder on") : tr("Remind me")) + "</button></div></div>";
  }
  function planList(plan) {
    var head = plan.dayOff === 0 ? tr("Today") : plan.dayOff === 1 ? tr("Tomorrow") : tr(DAYS[plan.day]);
    return "<h3>" + esc(tr("Plan for {day}", { day: head })) + '</h3><div class="list">' + plan.items.map(function (it, i) {
      var p = P(it.cls.place), st = it.status, text;
      text = st === "ok" ? tr("Leave at {time}", { time: t12m(it.leaveClock) }) : st === "now" ? tr("Leave now") : st === "late" ? tr("About {t} late", { t: mins(Math.max(1, Math.round(it.lateBy))) }) :
        st === "tight" ? (it.lateBy ? tr("About {t} late", { t: mins(it.lateBy) }) : tr("Leave at {time}", { time: t12m(it.leaveClock) })) : st === "inprogress" ? tr("In progress") : tr("No route");
      return '<div class="item plan' + (i === plan.focus ? " cur" : "") + '"><span class="date-box"><b>' + esc(t12m(it.startClock).split(" ")[0]) + "</b><span>" + esc(t12m(it.startClock).split(" ")[1]) + '</span></span><span class="item-main"><span class="item-title">' + esc(it.cls.subject) +
        '</span><span class="item-sub">' + esc(p.name) + (it.walkMin ? ", " + esc(tr("{t} walk", { t: mins(it.walkMin) })) : "") + (it.chained ? ", " + esc(tr("from the previous class")) : "") + '</span><span class="live ' + (st === "ok" || st === "now" ? "ok" : st === "inprogress" ? "off" : "busy") + '">' + esc(text) + "</span></span>" +
        '<button class="icon-btn" type="button" data-act="leaveroute" data-id="' + esc(it.cls.place) + '" aria-label="' + esc(tr("Directions to {name}", { name: p.name })) + '">' + ic("route") + "</button></div>";
    }).join("") + "</div>";
  }
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function viewSchedule() {
    var c = S.campus, h = ["<h2>" + esc(tr("My classes")) + "</h2>"], plan = planNow(), sp = planStart() && P(planStart());
    h.push('<div data-live="leave">' + leaveCard(plan) + "</div>");
    if (plan) {
      h.push('<div class="card"><h3>' + esc(tr("Settings")) + '</h3><p class="hint">' + esc(sp ? (U.loc ? tr("Walking time is counted from {name}.", { name: sp.name }) : tr("Walking time is counted from {name}. Set your location for a better estimate.", { name: sp.name })) : "") + "</p>" +
        '<label class="switch" for="lv-buf"><span class="grow">' + esc(tr("Minutes to spare")) + '</span><select class="inp slim" id="lv-buf" aria-label="' + esc(tr("Minutes to spare")) + '">' + [0, 3, 5, 10, 15].map(function (n) {
          return '<option value="' + n + '"' + (U.buffer === n ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label>" +
        '<p class="hint small">' + esc(tr("Reminders appear while this page is open. Install the app for the best experience.")) + "</p></div>");
      h.push('<div data-live="plan">' + planList(plan) + "</div>");
    }
    if (API.on && !API.user) h.push('<p class="note">' + esc(tr("Sign in to keep your timetable on every device.")) + ' <button class="btn small" type="button" data-act="account">' + esc(tr("Sign in")) + "</button></p>");

    h.push('<div class="card" id="upload-card"><h3>' + esc(tr("Upload my weekly timetable")) + '</h3><p class="hint">' + esc(tr("Upload your class timetable as a CSV or text file, or paste it. Days, times and rooms fill in by themselves. Works with the university grid layout (MON to Sa, one column per period, rooms like RN 001).")) + "</p>" +
      '<div class="row"><label class="btn small primary" for="tt-file">' + ic("plus") + esc(tr("Choose file")) + '</label><input class="file" id="tt-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain"><button class="btn small" type="button" data-act="ttsample">' + ic("link") + esc(tr("Copy a sample")) + "</button></div>" +
      '<textarea class="inp wide" id="tt-paste" rows="4" placeholder="' + esc(tr("Or paste the timetable here")) + '" aria-label="' + esc(tr("Paste timetable")) + '"></textarea>' +
      '<label class="switch" for="tt-replace"><input id="tt-replace" type="checkbox" checked><span class="grow">' + esc(tr("Replace my current classes")) + "</span></label>" +
      '<button class="btn dark" type="button" data-act="ttimport">' + ic("calendar") + esc(tr("Import timetable")) + "</button>" +
      (S.ttMsg ? '<p class="note ' + (S.ttMsg.ok ? "good" : "bad") + '">' + esc(S.ttMsg.text) + "</p>" + (S.ttMsg.errors.length ? '<ul class="errs">' + S.ttMsg.errors.slice(0, 6).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") : "") +
      '<p class="hint small">' + esc(tr("Photos and PDFs cannot be read yet. Export the timetable to CSV or Excel (Save as CSV) first.")) + "</p></div>");
    var today = new Date().getDay();
    h.push('<form class="form card" id="class-form"><h3 class="wide">' + esc(tr("Add a class")) + "</h3>" +
      '<input class="inp wide" id="cl-subject" type="text" placeholder="' + esc(tr("Subject, for example Operating Systems")) + '" maxlength="60" required aria-label="' + esc(tr("Subject")) + '">' +
      '<select class="inp wide" id="cl-place" aria-label="' + esc(tr("Room")) + '">' + placeOptions(["room", "lab", "auditorium", "library"]) + "</select>" +
      '<select class="inp" id="cl-day" aria-label="' + esc(tr("Day")) + '">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === today ? " selected" : "") + ">" + esc(tr(d)) + "</option>"; }).join("") + "</select>" +
      '<input class="inp" id="cl-time" type="time" value="09:00" required aria-label="' + esc(tr("Start time")) + '">' +
      '<select class="inp wide" id="cl-dur" aria-label="' + esc(tr("Length")) + '">' + [[50, "50 min"], [60, "1 hour"], [90, "1.5 hours"], [120, "2 hours"], [180, "3 hours"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === 60 ? " selected" : "") + ">" + esc(tr(x[1])) + "</option>"; }).join("") + "</select>" +
      '<button class="btn dark wide" type="submit">' + ic("plus") + esc(tr("Add class")) + "</button></form>");

    for (var i = 0; i < 7; i++) {
      var d = (today + i) % 7, list = U.schedule.filter(function (e) { return e.day === d; }).sort(function (a, b) { return a.time.localeCompare(b.time); });
      if (!list.length) continue;
      h.push('<div class="day' + (i === 0 ? " today" : "") + '">' + esc(tr(DAYS[d])) + (i === 0 ? " (" + esc(tr("today")) + ")" : "") + '</div><div class="list">' + list.map(function (e) {
        var p = P(e.place);
        return '<div class="item"><span class="date-box"><b>' + esc(t12(e.time).split(" ")[0]) + "</b><span>" + esc(t12(e.time).split(" ")[1]) + '</span></span><span class="item-main"><span class="item-title">' + esc(e.subject) +
          '</span><span class="item-sub">' + esc(p.name) + ", " + esc(whereL(p)) + '</span></span><button class="icon-btn" type="button" data-act="to" data-id="' + esc(e.place) + '" aria-label="' + esc(tr("Directions to {name}", { name: p.name })) + '">' + ic("route") +
          '</button><button class="icon-btn" type="button" data-act="delclass" data-id="' + esc(e.id) + '" aria-label="' + esc(tr("Remove {name}", { name: e.subject })) + '">' + ic("trash") + "</button></div>";
      }).join("") + "</div>");
    }
    return h.join("");
  }

  /* ---------- Events ---------- */
  function sortedEvents() {
    return S.campus.events.filter(function (e) { return P(e.place); }).map(function (e) { return { e: e, d: eventDate(e) }; })
      .sort(function (a, b) { return a.d - b.d || String(a.e.time).localeCompare(String(b.e.time)); });
  }
  function viewEvents() {
    var c = S.campus, h = ["<h2>" + esc(tr("Events on campus")) + "</h2>"], evs = sortedEvents();
    if (!evs.length) h.push('<p class="hint">' + esc(tr("No events are listed for this campus yet.")) + "</p>");
    evs.forEach(function (x) {
      var p = P(x.e.place);
      h.push('<div class="card"><div class="place-head"><span class="date-box"><b>' + x.d.getDate() + "</b><span>" + esc(x.d.toLocaleDateString(I.locale(), { month: "short" })) + '</span></span><div class="item-main"><h2>' + esc(x.e.title) +
        '</h2><div class="hint">' + esc(dayLabel(x.d)) + " " + esc(tr("at {time}", { time: t12(x.e.time) })) + ", " + esc(p.name) + "</div></div></div>" + (x.e.desc ? "<p>" + esc(x.e.desc) + "</p>" : "") +
        '<div class="row"><button class="btn small primary" type="button" data-act="to" data-id="' + esc(p.id) + '">' + ic("route") + esc(tr("Directions")) + '</button><button class="btn small" type="button" data-act="select" data-id="' + esc(p.id) + '">' + ic("arrive") + esc(tr("Show on map")) + "</button></div></div>");
    });
    if (c.data.sample && !U.events) h.push('<p class="note">' + esc(c.data.sample) + "</p>");
    return h.join("");
  }

  /* ---------- Saved ---------- */
  function viewSaved() {
    var h = ["<h2>" + esc(tr("Saved")) + "</h2>"], loc = U.loc && P(U.loc);
    h.push('<div class="card' + (loc ? " hl" : "") + '"><h3>' + esc(tr("My location")) + "</h3>" + (loc
      ? '<div class="place-head">' + tile(loc.type) + '<div class="item-main"><div class="item-title">' + esc(loc.name) + '</div><div class="item-sub">' + esc(whereL(loc)) + "</div></div></div>" +
        '<div class="row"><button class="btn small" type="button" data-act="select" data-id="' + esc(loc.id) + '">' + ic("locate") + esc(tr("Show on map")) + '</button><button class="btn small" type="button" data-act="clearloc">' + ic("x") + esc(tr("Clear")) + "</button></div>"
      : '<p class="hint">' + esc(tr("Not set. Open any place and press I am here. On campus, scanning the QR code at a door does this for you.")) + "</p>") + "</div>");
    h.push("<h3>" + esc(tr("Favourites")) + "</h3>" + (U.fav.length ? '<div class="list">' + U.fav.map(function (id) { return placeItem(P(id)); }).join("") + "</div>" : '<p class="hint">' + esc(tr("Press Save on a place to keep it here.")) + "</p>"));
    h.push("<h3>" + esc(tr("Recently viewed")) + "</h3>" + (U.recent.length ? '<div class="list">' + U.recent.map(function (id) { return placeItem(P(id)); }).join("") + '</div><button class="btn small" type="button" data-act="clearrecent">' + ic("trash") + esc(tr("Clear recent places")) + "</button>"
      : '<p class="hint">' + esc(tr("Places you open show up here.")) + "</p>"));
    return h.join("");
  }

  /* ---------- Manage ---------- */
  function viewManage() {
    var c = S.campus, src = sources(), admin = canManage(), h = ["<h2>Manage campus</h2>"];
    h.push(!API.on ? '<p class="note">Demo mode: changes here stay in this browser. Run the site with its server to share them with everyone and to add sign-in.</p>'
      : isAdmin() ? '<p class="note good">Signed in as admin. Your changes are saved for everyone.</p>'
      : '<p class="note">Only admins can change the campus. <button class="btn small" type="button" data-act="account">' + (API.user ? "Account" : "Sign in") + "</button></p>");
    h.push('<div class="stats"><div class="stat"><b>' + c.buildingList.length + '</b><span>Buildings</span></div><div class="stat"><b>' + c.layerList.filter(function (l) { return l.kind === "floor"; }).length +
      '</b><span>Floors</span></div><div class="stat"><b>' + c.placeList.length + '</b><span>Places</span></div><div class="stat"><b>' + Object.keys(c.nodes).length + "</b><span>Path points</span></div></div>");

    h.push('<div class="card"><h3>Campus map</h3><select class="inp" id="campus-select" aria-label="Campus">' + Object.keys(src).map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === c.id ? " selected" : "") + ">" + esc(src[id].name) + (G.imported[id] || REMOTE[id] ? " (imported)" : "") + "</option>";
    }).join("") + '</select><p class="hint">The site draws whatever campus file it is given. Another college loads by importing its JSON file.</p>' + (admin
      ? '<div class="row"><label class="btn small" for="campus-file">' + ic("plus") + 'Import campus file</label><input class="file" id="campus-file" type="file" accept=".json,application/json">' +
        '<button class="btn small" type="button" data-act="copyjson">' + ic("link") + "Copy this campus as JSON</button>" +
        (G.imported[c.id] || REMOTE[c.id] ? '<button class="btn small danger" type="button" data-act="removecampus">' + ic("trash") + "Remove</button>" : "") + "</div>" : "") +
      (S.importError ? '<p class="note bad">' + esc(S.importError) + "</p>" : "") + "</div>");
    if (!admin) return h.join("");

    h.push('<div class="card"><h3>Stairs and lifts out of service</h3><p class="hint">Routes avoid anything switched on here.</p>' + c.buildingList.map(function (b) {
      return c.connectorList.filter(function (k) { return k.building === b.id; }).map(function (k) {
        return '<label class="switch warn" for="k-' + esc(k.id) + '"><input id="k-' + esc(k.id) + '" type="checkbox" data-act="block" data-id="' + esc(k.id) + '"' + (U.blocked[k.id] ? " checked" : "") + '><span class="grow">' + esc(b.name) + ", " + esc(k.name) + "</span></label>";
      }).join("");
    }).join("") + "</div>");

    var p = S.sel && P(S.sel);
    h.push('<div class="card"><h3>Edit a place</h3>' + (p
      ? '<form class="form" id="edit-form"><input class="inp wide" id="ed-name" type="text" value="' + esc(p.name) + '" maxlength="60" required aria-label="Place name">' +
        '<select class="inp wide" id="ed-type" aria-label="Place type">' + Object.keys(T).filter(function (t) { return ["stairs", "lift", "entrance", "building", "gate"].indexOf(t) < 0 || t === p.type; }).map(function (t) {
          return '<option value="' + t + '"' + (t === p.type ? " selected" : "") + ">" + esc(T[t].label) + "</option>";
        }).join("") + '</select><button class="btn dark" type="submit">Save changes</button><button class="btn" type="button" data-act="resetplace" data-id="' + esc(p.id) + '">Undo edits</button></form>'
      : '<p class="hint">Tap a room on the map first, then come back here to rename it or change its type. For example, turn a classroom into a lab.</p>') + "</div>");

    h.push('<div class="card"><h3>QR checkpoints</h3>' + (p
      ? '<p class="hint">Checkpoint for ' + esc(p.name) + ". Scanning it opens the site with this place set as the visitor's location.</p>" +
        '<div class="row"><div class="qr" data-url="' + esc(linkFor("at-" + p.id)) + '"></div><div class="stack"><button class="btn small" type="button" data-act="copyqr" data-id="' + esc(p.id) + '">' + ic("link") + 'Copy link</button><button class="btn small" type="button" data-act="testqr" data-id="' + esc(p.id) + '">' + ic("locate") + "Simulate a scan</button></div></div>"
      : '<p class="hint">Select a place on the map to see its checkpoint code.</p>') +
      '<button class="btn" type="button" data-act="sheet">' + ic("fit") + "All checkpoints on this floor</button></div>");

    var evs = sortedEvents();
    h.push('<div class="card"><h3>Events</h3>' + evs.map(function (x) {
      return '<div class="mini"><span class="item-main">' + esc(x.e.title) + '<span class="item-sub">' + esc(dayLabel(x.d)) + ", " + esc(P(x.e.place).name) + '</span></span><button class="icon-btn" type="button" data-act="delevent" data-id="' + esc(x.e.title) + '" aria-label="Remove ' + esc(x.e.title) + '">' + ic("trash") + "</button></div>";
    }).join("") + '<form class="form" id="event-form"><input class="inp wide" id="ev-title" type="text" placeholder="Event name" maxlength="80" required aria-label="Event name">' +
      '<select class="inp wide" id="ev-place" aria-label="Event place">' + placeOptions(["room", "lab", "auditorium", "library", "sports", "cafe", "common"], S.sel) + "</select>" +
      '<input class="inp" id="ev-date" type="date" value="' + isoDate(new Date()) + '" required aria-label="Date"><input class="inp" id="ev-time" type="time" value="10:00" required aria-label="Time">' +
      '<button class="btn dark wide" type="submit">' + ic("plus") + "Add event</button></form></div>");

    h.push('<div class="card"><h3>Faculty cabins</h3>' + c.faculty.map(function (f) {
      return '<div class="mini"><span class="item-main">' + esc(f.name) + '<span class="item-sub">' + esc([f.dept, P(f.place) ? P(f.place).name : tr("No cabin set")].filter(Boolean).join(", ")) + '</span></span><button class="btn small' + (f.leave === C.isoOf(new Date()) ? " on" : "") + '" type="button" data-act="leavetoggle" data-id="' + esc(f.name) + '">' + esc(tr("On leave today")) + '</button><button class="icon-btn" type="button" data-act="delfaculty" data-id="' + esc(f.name) + '" aria-label="Remove ' + esc(f.name) + '">' + ic("trash") + "</button></div>";
    }).join("") + '<form class="form" id="faculty-form"><input class="inp" id="fa-name" type="text" placeholder="Name" maxlength="60" required aria-label="Faculty name">' +
      '<input class="inp" id="fa-dept" type="text" placeholder="Department" maxlength="60" required aria-label="Department">' +
      '<select class="inp wide" id="fa-place" aria-label="Cabin">' + placeOptions(["room", "lab", "office", "common"], S.sel) + "</select>" +
      '<button class="btn dark wide" type="submit">' + ic("plus") + "Add faculty</button></form></div>");

    var rooms = {}; c.timetable.forEach(function (x) { rooms[x.place] = 1; });
    h.push('<div class="card"><h3>' + esc(tr("Weekly room timetable")) + '</h3><p class="hint">' + esc(tr("{n} class slots in {m} rooms. They power Free rooms and the faculty status.", { n: c.timetable.length, m: Object.keys(rooms).length })) + "</p>" +
      '<div class="row"><label class="btn small" for="tt-csv">' + ic("plus") + esc(tr("Import CSV")) + '</label><input class="file" id="tt-csv" type="file" accept=".csv,text/csv,text/plain">' +
      '<button class="btn small" type="button" data-act="ttcopy">' + ic("link") + esc(tr("Copy as CSV")) + '</button><button class="btn small danger" type="button" data-act="ttreset">' + ic("trash") + esc(tr("Back to campus file")) + "</button></div>" +
      '<p class="hint small">' + esc(tr("Columns: room, days, start, end, subject, faculty. For example: N207, Mon Wed Fri, 09:00, 09:55, Algorithms, Dr. A. Sharma")) + "</p>" +
      (S.csvMsg ? '<p class="note ' + (S.csvMsg.ok ? "good" : "bad") + '">' + esc(S.csvMsg.text) + "</p>" + (S.csvMsg.errors.length ? '<ul class="errs">' + S.csvMsg.errors.slice(0, 6).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") : "") +
      '<form class="form" id="slot-form"><select class="inp wide" id="sl-room" aria-label="' + esc(tr("Room")) + '">' + placeOptions(["room", "lab"], S.sel) + "</select>" +
      '<div class="wide days-pick">' + C.calendar(c).days.map(function (d) { return '<label><input type="checkbox" name="sl-day" value="' + d + '"' + ([1, 3, 5].indexOf(d) >= 0 ? " checked" : "") + ">" + esc(tr(DAYS_SHORT[d])) + "</label>"; }).join("") + "</div>" +
      '<input class="inp" id="sl-start" type="time" value="09:00" required aria-label="' + esc(tr("Start time")) + '"><input class="inp" id="sl-end" type="time" value="09:55" required aria-label="' + esc(tr("End time")) + '">' +
      '<input class="inp wide" id="sl-subject" type="text" placeholder="' + esc(tr("Subject")) + '" maxlength="80" aria-label="' + esc(tr("Subject")) + '">' +
      '<select class="inp wide" id="sl-fac" aria-label="' + esc(tr("Faculty")) + '"><option value="">' + esc(tr("No teacher listed")) + "</option>" + c.faculty.map(function (f) { return '<option value="' + esc(f.name) + '">' + esc(f.name) + "</option>"; }).join("") + "</select>" +
      '<button class="btn dark wide" type="submit">' + ic("plus") + esc(tr("Add class slot")) + "</button></form></div>");
    h.push('<button class="btn small danger" type="button" data-act="resetall">' + ic("trash") + "Reset all changes for this campus</button>");
    return h.join("");
  }
  function paintQr() {
    document.querySelectorAll(".qr[data-url]").forEach(function (el) {
      try { el.innerHTML = window.NavQR.svg(el.dataset.url, 2); }
      catch (e) { el.textContent = "Link is too long for a QR code."; }
    });
  }
  /* Checkpoint sheet: one QR code per place on the open floor, ready to print and stick at doors. */
  function openSheet() {
    var c = S.campus, list = c.placeList.filter(function (p) { return p.layer === S.layer && ["stairs", "lift", "entrance"].indexOf(p.type) < 0; }).sort(natural);
    $("sheet").innerHTML = '<div class="modal-head"><h2 id="sheet-title">QR checkpoints: ' + esc(layerTitleL(S.layer)) + '</h2>' +
      '<button class="btn small no-print" type="button" data-act="print">Print</button><button class="icon-btn on-sign no-print" type="button" data-act="closesheet" aria-label="Close">' + ic("x") + '</button></div>' +
      '<div class="modal-body"><p class="hint no-print">' + list.length + ' checkpoints. Scanning a code opens the site with that place set as the visitor\'s location. To change the floor, close this and switch floors on the map.</p>' +
      '<div class="sheet-grid">' + list.map(function (p) {
        return '<div class="sheet-card"><div class="qr" data-url="' + esc(linkFor("at-" + p.id)) + '"></div><b>' + esc(p.name) + "</b><span>" + esc(whereL(p)) + "</span></div>";
      }).join("") + "</div></div>";
    paintQr();
    var d = $("sheet");
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute("open", ""); } }
  }
  $("sheet").addEventListener("click", function (e) {
    if (e.target === $("sheet")) return $("sheet").close();
    var el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "closesheet") $("sheet").close();
    else if (el.dataset.act === "print") { try { window.print(); } catch (err) { toast("Printing is blocked here. Open the site in its own tab to print."); } }
  });

  /* ---------- account ---------- */
  function paintAccount() {
    var b = $("account-btn");
    b.classList.toggle("user", !!API.user);
    b.innerHTML = API.user ? esc(API.user.name.charAt(0).toUpperCase()) : ic("user");
    b.setAttribute("aria-label", API.user ? "Account: " + API.user.name : "Sign in");
  }
  function renderAccount() {
    var h = ['<div class="modal-head"><h2 id="account-title">' + (API.user ? "Your account" : "Sign in") + '</h2><button class="icon-btn on-sign" type="button" data-act="closeaccount" aria-label="Close">' + ic("x") + '</button></div><div class="modal-body">'];
    if (!API.on) {
      h.push("<p>Accounts work when the site runs with its server. This copy is running as plain files, so everything is saved in this browser only.</p>" +
        '<p class="note">To turn accounts on, start the server in the project folder: <code>node server/server.js</code> and open the address it prints.</p>');
    } else if (API.user) {
      h.push('<div class="place-head"><span class="avatar">' + esc(API.user.name.charAt(0).toUpperCase()) + '</span><div class="item-main"><h2>' + esc(API.user.name) + '</h2><div class="hint">' + esc(API.user.email) + "</div></div></div>" +
        '<div class="row"><span class="badge type t-' + (isAdmin() ? "lab" : "room") + '">' + (isAdmin() ? "Admin" : "Student") + '</span></div><p class="hint">Your classes, favourites and location follow this account on every device.</p>');
      if (isAdmin() && S.users) h.push("<h3>Accounts</h3>" + S.users.map(function (u) {
        return '<div class="mini"><span class="item-main">' + esc(u.name) + '<span class="item-sub">' + esc(u.email) + ", " + esc(u.role) + "</span></span>" + (u.id === API.user.id ? "" :
          '<button class="btn small" type="button" data-act="role" data-id="' + esc(u.id) + '" data-role="' + (u.role === "admin" ? "student" : "admin") + '">' + (u.role === "admin" ? "Make student" : "Make admin") + "</button>") + "</div>";
      }).join(""));
      h.push('<button class="btn" type="button" data-act="signout">Sign out</button>');
    } else {
      var reg = S.authMode === "register";
      h.push('<div class="seg"><button type="button" data-act="authmode" data-id="login" class="' + (reg ? "" : "on") + '">Sign in</button><button type="button" data-act="authmode" data-id="register" class="' + (reg ? "on" : "") + '">Create account</button></div>' +
        '<form class="stack" id="auth-form">' + (reg ? '<input class="inp" id="au-name" type="text" placeholder="Your name" maxlength="60" required autocomplete="name" aria-label="Name" value="' + esc(S.authName || "") + '">' : "") +
        '<input class="inp" id="au-email" type="email" placeholder="Email" required autocomplete="email" aria-label="Email" value="' + esc(S.authEmail || "") + '">' +
        '<input class="inp" id="au-pass" type="password" placeholder="' + (reg ? "Password, at least 8 characters" : "Password") + '" required minlength="' + (reg ? 8 : 1) + '" autocomplete="' + (reg ? "new-password" : "current-password") + '" aria-label="Password">' +
        (S.authError ? '<p class="note bad">' + esc(S.authError) + "</p>" : "") +
        '<button class="btn primary" type="submit">' + (reg ? "Create account" : "Sign in") + "</button></form>");
    }
    var cu = window.NCUAuth && window.NCUAuth.user();
    if (cu) h.push('<div class="mini"><span class="item-main">College login<span class="item-sub">' + esc(cu.email) + '</span></span><button class="btn small" type="button" data-act="logout">Log out</button></div>');
    $("account").innerHTML = h.join("") + "</div>";
  }
  function openAccount() {
    S.authError = ""; renderAccount();
    var d = $("account");
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute("open", ""); } }
    if (isAdmin()) call("GET", "api/users").then(function (u) { S.users = u; renderAccount(); }).catch(function () { /* list is optional */ });
  }
  function signedIn(d) {
    G.token = d.token; save("navigator:global", G); API.user = d.user; S.authError = "";
    paintAccount(); renderAccount(); toast("Signed in as " + d.user.name);
    pullShared().then(pullPersonal).then(function () { renderBody(); if (isAdmin()) openAccount(); });
  }
  $("account-btn").addEventListener("click", openAccount);
  $("account").addEventListener("click", function (e) {
    if (e.target === $("account")) return $("account").close();
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var a = el.dataset.act;
    if (a === "closeaccount") $("account").close();
    else if (a === "logout") { $("account").close(); window.NCUAuth.logout(); }
    else if (a === "authmode") { S.authMode = el.dataset.id; S.authError = ""; renderAccount(); }
    else if (a === "signout") { G.token = null; save("navigator:global", G); API.user = null; S.users = null; paintAccount(); renderAccount(); renderBody(); toast("Signed out"); }
    else if (a === "role") call("PUT", "api/users/" + el.dataset.id, { role: el.dataset.role }).then(function () { return call("GET", "api/users"); }).then(function (u) { S.users = u; renderAccount(); toast("Role updated"); }).catch(function (err) { toast(err.message); });
  });
  $("account").addEventListener("submit", function (e) {
    e.preventDefault();
    var reg = S.authMode === "register", body = { email: $("au-email").value, password: $("au-pass").value };
    if (reg) body.name = $("au-name").value;
    S.authEmail = body.email; S.authName = body.name || "";
    call("POST", "api/auth/" + (reg ? "register" : "login"), body).then(signedIn).catch(function (err) { S.authError = err.message; renderAccount(); });
  });

  /* ---------- panel events ---------- */
  function isField(el) { return el.tagName === "INPUT" && !!el.dataset.field; }
  var ACT = {
    select: function (d) { select(d.id, true); },
    deselect: function () { S.sel = null; S.facSel = null; renderBody(); markPlaces(); },
    layer: function (d) { setLayer(d.id, true); },
    cat: function (d) { S.cat = S.cat === d.id ? null : d.id; S.sel = null; S.facSel = null; S.q = ""; $("q").value = ""; renderBody(); markPlaces(); },
    try: function (d) { $("q").value = d.id; S.q = d.id; renderBody(); markPlaces(); $("q").focus(); },
    smart: function () { var sm = smart(S.q); if (sm) runSmart(sm); },
    account: function () { openAccount(); },
    to: function (d) { directionsTo(d.id); },
    from: function (d) { showRoute(d.id, S.to === d.id ? null : S.to); },
    here: function (d) { U.loc = U.loc === d.id ? null : d.id; S.from = U.loc; savePersonal(); drawRoute(); renderWhere(); renderBody(); toast(U.loc ? "Location set to " + P(d.id).name : "Location cleared"); },
    fav: function (d) { var i = U.fav.indexOf(d.id); if (i >= 0) U.fav.splice(i, 1); else U.fav.unshift(d.id); savePersonal(); renderBody(); toast(i >= 0 ? "Removed from saved" : "Saved"); },
    copylink: function (d) { setHash("p-" + d.id); copy(linkFor("p-" + d.id), "Link copied"); },
    sheet: function () { openSheet(); },
    testqr: function (d) { checkIn(d.id); },
    copyqr: function (d) { copy(linkFor("at-" + d.id), "Location link copied"); },
    copyroute: function () { copy(linkFor("r-" + S.from + "--" + S.to), "Route link copied"); },
    clearroute: function () { S.to = null; computeRoute(false); renderBody(); },
    swap: function () { var a = S.from; S.from = S.to; S.to = a; computeRoute(true); renderBody(); },
    pick: function (d) { S[d.field] = d.id; computeRoute(true); renderBody(); },
    nearest: function (d) {
      var start = defaultStart();
      if (!start) return toast(tr("Choose a start first, or set your location."));
      var p = C.nearest(S.campus, start, d.id, routeOpts());
      if (!p) return toast(tr("No {what} can be reached from there.", { what: tname(d.id).toLowerCase() }));
      showRoute(start, p.id);
    },
    step: function (d) {
      var s = S.route.steps[+d.id]; S.step = +d.id;
      if (s.layer !== S.layer) setLayer(s.layer, false);
      syncLeg(); focusPoint(s.at, 620, 340); renderDirResult();
      if (mobile.matches) $("panel").classList.add("min");
    },
    faculty: function (d) { var f = facultyByName(d.id); if (!f) return; openFaculty(f); },
    facfilter: function (d) { S.facFilter = d.id; renderBody(); },
    ttday: function (d) { S.ttDay = +d.id; renderBody(); },
    addslot: function (d) {
      var slot = S.campus.timetable.filter(function (x) { return x.id === d.id; })[0], n = 0;
      if (!slot) return;
      slot.days.forEach(function (day) {
        if (U.schedule.some(function (e) { return e.place === slot.place && e.day === day && e.time === slot.start; })) return;
        U.schedule.push({ id: "c" + Date.now() + "-" + day + "-" + n, subject: slot.subject || P(slot.place).name, place: slot.place, day: day, time: slot.start, dur: slot.e - slot.s }); n++;
      });
      savePersonal(); renderBody(); toast(n ? tr("Added to your classes") : tr("Already in your classes"));
    },
    delslot: function (d) { var list = ownTimetable(), i = list.findIndex(function (x) { return x.id === d.id; }); if (i >= 0) list.splice(i, 1); retime(); toast(tr("Class slot removed")); },
    meetall: function () { S.meetNow = false; S.meetMax = 20; renderBody(); },
    meetfree: function () { S.meetNow = true; S.meetMax = 20; renderBody(); },
    meetmore: function () { S.meetMax += 20; $("meet-list").innerHTML = meetList(); },
    meetday: function (d) { S.meetDay = +d.id; renderBody(); },
    whennow: function () { S.when = null; renderBody(); },
    whenpick: function () { var n = new Date(); S.when = { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() }; renderBody(); },
    freemore: function () { S.freeMax += 25; $("free-list").innerHTML = freeList(); },
    leaveroute: function (d) { var st = planStart(); showRoute(st, d.id); },
    remind: function () {
      U.remind = !U.remind; savePersonal();
      if (U.remind && window.Notification && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) { /* not available */ } }
      toast(U.remind ? tr("We will remind you when it is time to leave, while this page is open.") : tr("Reminder off")); refreshLive(true);
    },
    ttsample: function () { copy(SAMPLE_TT, tr("Sample copied. Paste it into the box below.")); },
    ttimport: function () { importMine($("tt-paste").value); },
    ttcopy: function () { copy(C.timetableToCsv(S.campus), tr("Timetable copied as CSV")); },
    ttreset: function () { U.timetable = null; retime(); S.csvMsg = null; toast(tr("Timetable reset")); },
    leavetoggle: function (d) {
      var f = ownFaculty().filter(function (x) { return x.name === d.id; })[0], today = C.isoOf(new Date());
      if (!f) return; f.leave = f.leave === today ? "" : today;
      saveShared(); rebuild(); toast(f.leave ? tr("Marked on leave today") : tr("Back from leave"));
    },
    speak: function () {
      if (!window.speechSynthesis) return;
      if (S.speaking) { speechSynthesis.cancel(); S.speaking = false; return renderDirResult(); }
      if (!S.route || !S.route.steps) return;
      var text = S.route.steps.map(function (x) { var y = stepText(x); return y.text + (y.sub ? ". " + y.sub : ""); }).join(". ");
      var u = new SpeechSynthesisUtterance(text); u.lang = I.getLang() === "hi" ? "hi-IN" : "en-IN";
      u.onend = u.onerror = function () { S.speaking = false; renderDirResult(); };
      speechSynthesis.cancel(); speechSynthesis.speak(u); S.speaking = true; renderDirResult();
    },
    delclass: function (d) { U.schedule = U.schedule.filter(function (e) { return e.id !== d.id; }); savePersonal(); renderBody(); },
    clearloc: function () { U.loc = null; savePersonal(); drawRoute(); renderWhere(); renderBody(); },
    clearrecent: function () { U.recent = []; savePersonal(); renderBody(); },
    copyjson: function () {
      var data = JSON.parse(JSON.stringify(S.campus.data));
      data.places.forEach(function (p) { if (U.edits[p.id]) Object.assign(p, U.edits[p.id]); });
      if (U.events) data.events = U.events; if (U.faculty) data.faculty = U.faculty; if (U.timetable) data.timetable = U.timetable;
      copy(JSON.stringify(data, null, 1), "Campus JSON copied, including your changes");
    },
    removecampus: function () {
      var id = S.campus.id, done = function () { delete G.imported[id]; delete REMOTE[id]; save("navigator:global", G); loadCampus(Object.keys(sources())[0]); S.tab = "manage"; renderTabs(); renderBody(); toast("Imported campus removed"); };
      if (REMOTE[id]) call("DELETE", "api/campuses/" + id).then(done).catch(function (e) { toast(e.message); }); else done();
    },
    resetplace: function (d) { delete U.edits[d.id]; saveShared(); rebuild(); toast("Edits undone"); },
    resetall: function () { U.edits = {}; U.blocked = {}; U.events = null; U.faculty = null; U.timetable = null; saveShared(); rebuild(); toast("All changes cleared"); },
    delevent: function (d) { var list = ownEvents(), i = list.findIndex(function (e) { return e.title === d.id; }); if (i >= 0) list.splice(i, 1); saveShared(); rebuild(); toast("Event removed"); },
    delfaculty: function (d) { var list = ownFaculty(), i = list.findIndex(function (f) { return f.name === d.id; }); if (i >= 0) list.splice(i, 1); saveShared(); rebuild(); toast("Faculty removed"); }
  };
  $("body").addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el || el.tagName === "INPUT") return;
    if (ACT[el.dataset.act]) ACT[el.dataset.act](el.dataset);
  });
  function importCampus(data) {
    var finish = function () { S.importError = ""; loadCampus(data.id); S.tab = "manage"; renderTabs(); renderBody(); toast(data.name + " loaded"); if (API.on) pullShared(); };
    if (API.on) call("POST", "api/campuses", data).then(function () { REMOTE[data.id] = data; finish(); }).catch(function (e) { S.importError = e.message; renderBody(); });
    else { G.imported[data.id] = data; finish(); }
  }
  $("body").addEventListener("change", function (e) {
    var el = e.target;
    if (el.dataset.act === "access") { U.accessible = el.checked; savePersonal(); computeRoute(true); renderDirResult(); }
    else if (el.dataset.act === "block") { U.blocked[el.dataset.id] = el.checked; saveShared(); computeRoute(false); drawLayer(); toast(el.checked ? "Marked out of service" : "Back in service"); }
    else if (el.id === "fr-min") { S.freeMin = +el.value; $("free-list").innerHTML = freeList(); }
    else if (el.id === "fr-b") { S.freeB = el.value; $("free-list").innerHTML = freeList(); }
    else if (el.id === "fr-day" || el.id === "fr-time") {
      var tm = C.toMin($("fr-time").value); if (tm == null) return;
      S.when = { day: +$("fr-day").value, min: tm }; $("free-list").innerHTML = freeList();
    }
    else if (el.id === "mt-min") { S.meetMin = +el.value; S.meetMax = 20; $("meet-list").innerHTML = meetList(); }
    else if (el.id === "mt-dept") { S.meetDept = el.value; S.meetMax = 20; $("meet-list").innerHTML = meetList(); }
    else if (el.id === "fa-cabin-set") {
      var fx = ownFaculty().filter(function (x) { return x.name === el.dataset.name; })[0];
      if (fx) { fx.place = el.value; saveShared(); rebuild(); S.facSel = fx.name; renderBody(); toast(el.value ? "Cabin saved" : "Cabin cleared"); }
    }
    else if (el.id === "lv-buf") { U.buffer = +el.value; savePersonal(); refreshLive(true); }
    else if (el.id === "tt-file" && el.files[0]) { var fr1 = new FileReader(); fr1.onload = function () { importMine(String(fr1.result)); }; fr1.readAsText(el.files[0]); el.value = ""; }
    else if (el.id === "tt-csv" && el.files[0]) {
      var fr2 = new FileReader();
      fr2.onload = function () {
        var res = C.timetableFromCsv(S.campus, String(fr2.result));
        if (res.slots.length) { U.timetable = res.slots; C.indexTimetable(S.campus, U.timetable); saveShared(); }
        S.csvMsg = { ok: res.slots.length > 0, text: res.slots.length ? tr("Imported {n} class slots.", { n: res.slots.length }) + (res.errors.length ? " " + tr("{n} lines skipped.", { n: res.errors.length }) : "") : tr("Nothing was imported."), errors: res.errors };
        renderBody();
      };
      fr2.readAsText(el.files[0]); el.value = "";
    }
    else if (el.id === "campus-select") { S.importError = ""; loadCampus(el.value); S.tab = "manage"; renderTabs(); renderBody(); pullShared().then(pullPersonal); }
    else if (el.id === "campus-file" && el.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { var data = JSON.parse(fr.result); C.build(data); importCampus(data); }
        catch (err) {
          S.importError = err instanceof SyntaxError ? "That file is not valid JSON. Use Copy this campus as JSON to see the expected format." : err.message;
          renderBody();
        }
      };
      fr.readAsText(el.files[0]);
    }
  });
  $("body").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === "class-form") {
      var subject = $("cl-subject").value.trim();
      if (!subject) return;
      U.schedule.push({ id: "c" + Date.now(), subject: subject, place: $("cl-place").value, day: +$("cl-day").value, time: $("cl-time").value || "09:00", dur: +$("cl-dur").value || 60 });
      savePersonal(); renderBody(); toast(tr("Class added"));
    } else if (id === "slot-form") {
      var days = Array.prototype.map.call(document.querySelectorAll('input[name="sl-day"]:checked'), function (x) { return +x.value; }), st = C.toMin($("sl-start").value), en = C.toMin($("sl-end").value);
      if (!days.length || st == null || en == null || en <= st) return toast(tr("Pick at least one day, and an end time after the start."));
      ownTimetable().push({ id: "t" + Date.now(), place: $("sl-room").value, days: days, start: C.hm(st), end: C.hm(en), subject: $("sl-subject").value.trim(), faculty: $("sl-fac").value });
      retime(); toast(tr("Class slot added"));
    } else if (id === "edit-form") {
      var name = $("ed-name").value.trim();
      if (!name) return;
      U.edits[S.sel] = { name: name, type: $("ed-type").value }; saveShared(); rebuild(); toast("Changes saved");
    } else if (id === "event-form") {
      var title = $("ev-title").value.trim();
      if (!title) return;
      ownEvents().push({ id: "e" + Date.now(), title: title, place: $("ev-place").value, date: $("ev-date").value, time: $("ev-time").value || "10:00", desc: "" });
      saveShared(); rebuild(); toast("Event added");
    } else if (id === "faculty-form") {
      var fname = $("fa-name").value.trim(), dept = $("fa-dept").value.trim();
      if (!fname || !dept) return;
      ownFaculty().push({ id: "f" + Date.now(), name: fname, dept: dept, role: "Faculty", place: $("fa-place").value });
      saveShared(); rebuild(); toast("Faculty added");
    }
  });
  $("body").addEventListener("input", function (e) {
    if (e.target.id === "mt-q") { S.meetQ = e.target.value; S.meetMax = 20; $("meet-list").innerHTML = meetList(); }
    else if (isField(e.target)) showDrop(e.target.dataset.field, e.target.value);
  });
  $("body").addEventListener("focusin", function (e) { if (isField(e.target)) { e.target.select(); showDrop(e.target.dataset.field, ""); } });
  $("body").addEventListener("focusout", function (e) {
    var f = isField(e.target) && e.target.dataset.field;
    if (f) setTimeout(function () { var d = $("drop-" + f), i = $("f-" + f); if (d) d.innerHTML = ""; if (i && document.activeElement !== i) i.value = fieldVal(S[f]); }, 200);
  });

  $("q").addEventListener("input", function (e) {
    S.q = e.target.value; S.tab = "explore"; S.cat = null; $("panel").classList.remove("min");
    renderTabs(); renderBody(); markPlaces();
  });
  $("q").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var sm = smart(S.q);
    if (sm) return runSmart(sm);
    var r = C.search(S.campus, S.q, 1)[0];
    if (r && r.kind === "faculty") ACT.faculty({ id: r.faculty.name }); else if (r) select(r.place.id, true);
  });
  document.addEventListener("keydown", function (e) {
    var typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); $("q").focus(); }
    if (e.key === "Escape" && !$("account").open) { if (typing) document.activeElement.blur(); else if (S.sel) ACT.deselect(); }
  });
  $("grip").addEventListener("click", function () { $("panel").classList.toggle("min"); setTimeout(function () { fitLayer(); }, 260); });

  /* ---------- theme ---------- */
  function isDark() { return G.theme ? G.theme === "dark" : root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function paintTheme() { if (G.theme) root.dataset.theme = G.theme; $("theme").innerHTML = ic(isDark() ? "sun" : "moon"); }
  $("theme").addEventListener("click", function () { G.theme = isDark() ? "light" : "dark"; save("navigator:global", G); paintTheme(); });

  /* ---------- timetable upload ---------- */
  var SAMPLE_TT = ["Weekly Time Table,,,,,,,,", ",1,2,3,4,5,6,7,8", ",8:30 - 9:20,9:30 - 10:20,10:30 - 11:20,11:30 - 12:20,12:30 - 13:20,13:30 - 14:20,14:30 - 15:20,15:30 - 16:20",
    "MON,,MAL616 Arjun.S RN 001,MCL507 Shruti.S RN 001,MCL503 Pitamber.V RN 001,LUNCH BREAK,CLL513 Heena.C RN 001,MCV501 RN 001,MCV501 RN 001",
    "TUE,,MCL501 Neha RN 001,CLL513 Heena.C RN 001,LUNCH BREAK,CLV200 RN 001,CLV200 RN 001,MCL503 RN 124,MCL503 RN 124",
    "WED,,MCL507 Shruti.S RN 001,MCL501 Neha RN 001,LUNCH BREAK,,MCL507 RN 001,,", "THU,,,,,,,,", "FRI,,,MAL616 Arjun.S RN 001,LUNCH BREAK,MCL501 RN 302,,,", "Sa,,,,,,,,",
    "MAL616,Research Methodology", "MCL501,DBMS", "MCL503,Data Comm. and Networking", "MCL507,Data Structure and Algorithm Analysis"].join("\n");
  function importMine(text) {
    var res = C.parseMyTimetable(S.campus, text), replace = $("tt-replace") ? $("tt-replace").checked : true, stamp = Date.now();
    if (!res.entries.length) { S.ttMsg = { ok: false, text: tr("No classes were found."), errors: res.errors }; return renderBody(); }
    var fresh = res.entries.map(function (e, i) { return Object.assign({}, e, { id: "c" + stamp + "-" + i }); });
    if (replace) U.schedule = fresh;
    else fresh.forEach(function (e) { if (!U.schedule.some(function (x) { return x.place === e.place && x.day === e.day && x.time === e.time; })) U.schedule.push(e); });
    savePersonal();
    S.ttMsg = { ok: true, text: tr("{n} classes imported. Days, times and rooms are filled in.", { n: fresh.length }) + (res.errors.length ? " " + tr("{n} lines skipped.", { n: res.errors.length }) : ""), errors: res.errors };
    renderBody(); toast(tr("Timetable imported"));
  }

  /* ---------- live refresh and reminders ---------- */
  function refreshLive(force) {
    if (!S.campus || !U) return;
    var plan = U.schedule.length ? planNow() : null;
    document.querySelectorAll('[data-live="leave"]').forEach(function (el) { el.innerHTML = leaveCard(plan); });
    document.querySelectorAll('[data-live="plan"]').forEach(function (el) { el.innerHTML = plan ? planList(plan) : ""; });
    if (S.tab === "meet" && $("meet-list")) { var mb = $("body"), mtop = mb.scrollTop; $("meet-list").innerHTML = meetList(); mb.scrollTop = mtop; }
    if (S.tab === "free" && !S.when && $("free-list")) { var b = $("body"), top = b.scrollTop; $("free-list").innerHTML = freeList(); b.scrollTop = top; }
    if (!plan || !U.remind) return;
    var it = plan.items[plan.focus], key = it && it.cls.id + "@" + C.isoOf(new Date());
    if (plan.dayOff === 0 && it && (it.status === "ok" || it.status === "now" || it.status === "late") && it.leaveRel <= 0 && !U.notified[key]) {
      U.notified[key] = 1; saveU();
      var msg = tr("Time to leave for {subject} in {room}.", { subject: it.cls.subject, room: P(it.cls.place).name });
      toast(msg);
      try { if (window.Notification && Notification.permission === "granted") new Notification(tr("Time to leave"), { body: msg, icon: "icons/icon-192.png" }); } catch (e) { /* not allowed */ }
    }
  }
  setInterval(refreshLive, 30000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshLive(); });

  /* ---------- language ---------- */
  function applyStatic() {
    document.documentElement.lang = I.getLang();
    document.querySelectorAll("[data-tr]").forEach(function (el) { el.textContent = tr(el.dataset.tr); });
    document.querySelectorAll("[data-tr-ph]").forEach(function (el) { el.placeholder = tr(el.dataset.trPh); });
    document.querySelectorAll("[data-tr-label]").forEach(function (el) { el.setAttribute("aria-label", tr(el.dataset.trLabel)); el.title = tr(el.dataset.trLabel); });
    $("lang").textContent = I.getLang() === "hi" ? "EN" : "हिं";
    $("lang").setAttribute("aria-label", I.getLang() === "hi" ? "Switch to English" : "हिन्दी में बदलें");
  }
  function setLang(l) {
    I.setLang(l); G.lang = l; save("navigator:global", G); applyStatic();
    renderTabs(); renderBody(); renderWhere(); renderLayers(); renderLegbar(); paintAccount();
    if (S.campus) $("campus-name").textContent = S.campus.name;
    savePersonal();
  }
  $("lang").addEventListener("click", function () { setLang(I.getLang() === "hi" ? "en" : "hi"); });

  /* ---------- voice search ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  function submitQuery(text) {
    S.q = text; S.tab = "explore"; S.cat = null; $("q").value = text; renderTabs(); renderBody(); markPlaces();
    var sm = smart(text);
    if (sm) return runSmart(sm);
    var r = C.search(S.campus, text, 1)[0];
    if (r && r.kind === "faculty") ACT.faculty({ id: r.faculty.name }); else if (r) select(r.place.id, true);
  }
  if (SR) {
    $("mic").hidden = false; $("mic").innerHTML = ic("mic");
    $("mic").addEventListener("click", function () {
      if (rec) { try { rec.stop(); } catch (e) { /* already stopped */ } return; }
      rec = new SR(); rec.lang = I.getLang() === "hi" ? "hi-IN" : "en-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onstart = function () { $("mic").classList.add("listening"); $("q").placeholder = tr("Listening..."); };
      rec.onresult = function (e) { var text = e.results[0][0].transcript; if (text) submitQuery(text); };
      rec.onerror = function (e) { toast(e.error === "not-allowed" || e.error === "service-not-allowed" ? tr("Allow microphone access to search by voice.") : e.error === "no-speech" ? tr("I did not hear anything. Try again.") : tr("Voice search is not available right now.")); };
      rec.onend = function () { $("mic").classList.remove("listening"); $("q").placeholder = tr("Search a room, place or faculty"); rec = null; };
      try { rec.start(); } catch (e) { rec = null; }
    });
  }

  /* ---------- offline and install ---------- */
  window.addEventListener("online", renderWhere); window.addEventListener("offline", renderWhere);
  var installEvt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; $("install").hidden = false; });
  $("install").addEventListener("click", function () {
    if (!installEvt) return;
    installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; $("install").hidden = true; });
  });
  window.addEventListener("appinstalled", function () { $("install").hidden = true; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* hosting may not allow it */ }); });
  }

  /* ---------- start ---------- */
  I.setLang(G.lang || ((navigator.language || "").slice(0, 2) === "hi" ? "hi" : "en"));
  document.querySelector(".sign-arrow").innerHTML = ic("route");
  $("search-ic").innerHTML = ic("search");
  paintTheme(); paintAccount(); applyStatic();
  loadCampus(G.campus);
  readHash();
  connect();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(applyView);
})();
