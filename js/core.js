/* Navigator core: campus model, search and routing. No DOM in this file,
   so it runs the same in the browser, in Node tests, or on a server later. */
(function (root) {
  "use strict";

  var WALK_MPS = 1.3;                 // average walking speed
  var COST = { stairs: 16, lift: 22, door: 4 };   // seconds per floor / per doorway

  var TYPES = {
    room: { label: "Classroom", plural: "Classrooms" },
    lab: { label: "Lab", plural: "Labs" },
    library: { label: "Library", plural: "Library" },
    cafe: { label: "Cafe", plural: "Cafes" },
    medical: { label: "Medical", plural: "Medical" },
    common: { label: "Common room", plural: "Common rooms" },
    auditorium: { label: "Auditorium", plural: "Auditorium" },
    waiting: { label: "Waiting area", plural: "Waiting areas" },
    office: { label: "Office", plural: "Offices" },
    wc: { label: "Washroom", plural: "Washrooms" },
    stairs: { label: "Stairs", plural: "Stairs" },
    lift: { label: "Lift", plural: "Lifts" },
    entrance: { label: "Entrance", plural: "Entrances" },
    building: { label: "Building", plural: "Buildings" },
    sports: { label: "Sports", plural: "Sports" },
    parking: { label: "Parking", plural: "Parking" },
    gate: { label: "Gate", plural: "Gates" },
    bridge: { label: "Bridge", plural: "Bridges" },
    hostel: { label: "Hostel", plural: "Hostels" }
  };

  function fail(msg) { throw new Error("Campus file problem: " + msg); }

  /* Turns a raw campus package into an indexed model. `edits` are per-place
     overrides ({id: {name, type}}) made from the Manage tab. */
  function build(data, edits) {
    if (!data || typeof data !== "object") fail("the file is not a JSON object.");
    ["id", "name", "layers", "places", "nodes", "edges"].forEach(function (k) {
      if (data[k] == null) fail('"' + k + '" is missing.');
    });
    var c = {
      data: data, id: data.id, name: data.name, shortName: data.shortName || data.name,
      layers: {}, layerList: data.layers, places: {}, placeList: [], nodes: {}, adj: {},
      buildings: {}, buildingList: data.buildings || [], connectors: {}, connectorList: data.connectors || [],
      faculty: data.faculty || [], events: data.events || []
    };
    data.layers.forEach(function (l) {
      if (!l.id || !l.width || !l.height) fail("every layer needs id, width and height.");
      c.layers[l.id] = l;
    });
    c.buildingList.forEach(function (b) { c.buildings[b.id] = b; });
    c.connectorList.forEach(function (k) { c.connectors[k.id] = k; });
    data.nodes.forEach(function (n) {
      if (!c.layers[n.layer]) fail('node "' + n.id + '" points to unknown layer "' + n.layer + '".');
      c.nodes[n.id] = n; c.adj[n.id] = [];
    });
    data.edges.forEach(function (e) {
      var a = c.nodes[e.a], b = c.nodes[e.b];
      if (!a || !b) fail('edge "' + e.a + '" to "' + e.b + '" uses a node that does not exist.');
      var kind = e.kind || "walk", m = 0, s;
      if (kind === "walk") {
        m = Math.hypot(a.x - b.x, a.y - b.y) * (c.layers[a.layer].mpu || 0.1);
        s = m / WALK_MPS;
      } else if (kind === "bridge") {          // a walkway between two buildings on the same level
        m = e.m || 20; s = m / WALK_MPS;
      } else {
        s = COST[kind] != null ? COST[kind] : 10;
        if (kind === "door") m = 2;
      }
      c.adj[e.a].push({ to: e.b, kind: kind, conn: e.conn || null, m: m, s: s });
      c.adj[e.b].push({ to: e.a, kind: kind, conn: e.conn || null, m: m, s: s });
    });
    data.places.forEach(function (raw) {
      if (!c.layers[raw.layer]) fail('place "' + raw.id + '" points to unknown layer "' + raw.layer + '".');
      if (!c.nodes[raw.node]) fail('place "' + raw.id + '" has no valid graph node.');
      var p = Object.assign({}, raw, (edits && edits[raw.id]) || {});
      c.places[p.id] = p; c.placeList.push(p);
    });
    if (api.indexTimetable) api.indexTimetable(c, data.timetable || []);
    return c;
  }

  function layerTitle(c, layerId) {
    var l = c.layers[layerId];
    if (!l) return "";
    if (l.kind === "outdoor") return "Campus grounds";
    var b = c.buildings[l.building];
    return (b ? b.name + ", " : "") + l.name;
  }
  function where(c, p) { return layerTitle(c, p.layer); }

  /* ---------- search ---------- */
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

  function scoreText(q, qTight, name, extra) {
    var n = norm(name), tight = n.replace(/ /g, "");
    if (!q) return 0;
    if (n === q || tight === qTight) return 100;
    if (n.indexOf(q) === 0 || tight.indexOf(qTight) === 0) return 80;
    if ((" " + n).indexOf(" " + q) >= 0) return 65;
    if (n.indexOf(q) >= 0 || tight.indexOf(qTight) >= 0) return 50;
    var hay = n + " " + norm(extra), ok = q.split(" ").every(function (t) { return hay.indexOf(t) >= 0; });
    return ok ? 30 : 0;
  }

  function search(c, query, limit) {
    var q = norm(query), qTight = q.replace(/ /g, ""), out = [];
    if (!q) return out;
    c.placeList.forEach(function (p) {
      if (p.type === "entrance") return;
      var t = TYPES[p.type] || { label: p.type, plural: p.type };
      var extra = [t.label, t.plural, where(c, p), p.desc || "", (p.alias || []).join(" ")].join(" ");
      var s = Math.max(scoreText(q, qTight, p.name, extra), p.number ? scoreText(q, qTight, p.number, "") : 0);
      (p.alias || []).forEach(function (al) { s = Math.max(s, scoreText(q, qTight, al, "") - 5); });
      if (s) out.push({ kind: "place", place: p, score: s - (p.type === "stairs" || p.type === "lift" || p.type === "wc" ? 8 : 0) });
    });
    c.faculty.forEach(function (f) {
      var p = c.places[f.place] || null;                  // a teacher without a cabin on the map can still be found
      var s = scoreText(q, qTight, f.name, f.dept + " " + (f.role || "") + " faculty teacher");
      if (!s) s = scoreText(q, qTight, f.dept, "faculty") ? 45 : 0;
      if (s) out.push({ kind: "faculty", faculty: f, place: p, score: s + 1 });
    });
    var nm = function (x) { return x.place ? x.place.name : x.faculty.name; };
    out.sort(function (a, b) { return b.score - a.score || nm(a).localeCompare(nm(b), undefined, { numeric: true }); });
    return out.slice(0, limit || 30);
  }

  /* ---------- routing ---------- */
  /* Dijkstra over the walkable graph. Cost is time in seconds, so stairs, lifts
     and doorways compete fairly with long corridors. */
  function dijkstra(c, startNode, opts, target) {
    opts = opts || {};
    var blocked = opts.blocked || {}, dist = {}, prev = {}, done = {}, open = [startNode];
    dist[startNode] = 0;
    while (open.length) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      var u = open.splice(bi, 1)[0];
      if (done[u]) continue;
      done[u] = true;
      if (u === target) break;
      var edges = c.adj[u];
      for (var j = 0; j < edges.length; j++) {
        var e = edges[j];
        if (opts.accessible && e.kind === "stairs") continue;
        if (e.conn && blocked[e.conn]) continue;
        var d = dist[u] + e.s;
        if (dist[e.to] == null || d < dist[e.to]) { dist[e.to] = d; prev[e.to] = { node: u, edge: e }; open.push(e.to); }
      }
    }
    return { dist: dist, prev: prev };
  }

  function simplify(pts) {
    var out = [];
    pts.forEach(function (p) {
      var n = out.length;
      if (n && Math.abs(out[n - 1][0] - p[0]) < 0.5 && Math.abs(out[n - 1][1] - p[1]) < 0.5) return;
      if (n >= 2) {
        var a = out[n - 2], b = out[n - 1];
        var cross = (b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0]);
        var dot = (b[0] - a[0]) * (p[0] - b[0]) + (b[1] - a[1]) * (p[1] - b[1]);
        if (Math.abs(cross) < 1 && dot > 0) { out[n - 1] = p; return; }
      }
      out.push(p);
    });
    return out;
  }

  function turn(a, b, p) {      // screen coordinates: y grows downward
    var cross = (b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0]);
    var dot = (b[0] - a[0]) * (p[0] - b[0]) + (b[1] - a[1]) * (p[1] - b[1]);
    if (Math.abs(cross) < 1) return dot < 0 ? "back" : "straight";
    return cross > 0 ? "right" : "left";
  }

  function fmtDist(m) { return m < 10 ? Math.max(1, Math.round(m)) + " m" : Math.round(m / 5) * 5 + " m"; }
  function fmtTime(s) { var m = Math.round(s / 60); return m < 1 ? "under 1 min" : m + " min"; }

  function route(c, fromId, toId, opts) {
    var from = c.places[fromId], to = c.places[toId];
    if (!from || !to) return null;
    if (from.id === to.id) return { from: from, to: to, same: true, meters: 0, seconds: 0, legs: [], steps: [] };
    var r = dijkstra(c, from.node, opts, to.node);
    if (r.dist[to.node] == null) return null;

    var path = [to.node], edges = [];
    while (path[0] !== from.node) { var pr = r.prev[path[0]]; edges.unshift(pr.edge); path.unshift(pr.node); }

    // Split the path into walking legs (one per layer) and transitions between layers.
    var items = [], n0 = c.nodes[path[0]], cur = { type: "leg", layer: n0.layer, pts: [[n0.x, n0.y]] }, meters = 0;
    for (var i = 1; i < path.length; i++) {
      var n = c.nodes[path[i]], e = edges[i - 1];
      meters += e.m;
      if (e.kind === "walk") { cur.pts.push([n.x, n.y]); continue; }
      var last = items[items.length - 1];
      if (cur.pts.length === 1 && last && last.type === "trans" && last.conn && last.conn === e.conn) {
        last.toLayer = n.layer;                              // same staircase, one more floor
      } else {
        items.push(cur);
        items.push({ type: "trans", kind: e.kind, conn: e.conn, fromLayer: cur.layer, toLayer: n.layer, at: cur.pts[cur.pts.length - 1] });
      }
      cur = { type: "leg", layer: n.layer, pts: [[n.x, n.y]] };
    }
    items.push(cur);

    var legs = items.filter(function (it) { return it.type === "leg"; });
    var first = legs[0], lastLeg = legs[legs.length - 1];
    var startStub = from.door && Math.hypot(from.door[0] - first.pts[0][0], from.door[1] - first.pts[0][1]) > 1;
    var lp = lastLeg.pts[lastLeg.pts.length - 1];
    var endStub = to.door && Math.hypot(to.door[0] - lp[0], to.door[1] - lp[1]) > 1;
    if (startStub) first.pts.unshift(from.door.slice());
    if (endStub) lastLeg.pts.push(to.door.slice());

    var steps = [{ icon: "start", k: "start", a: { name: from.name }, text: "Start at " + from.name, sub: where(c, from), layer: from.layer, at: first.pts[0] }];
    items.forEach(function (it) {
      if (it.type === "trans") {
        var a = c.layers[it.fromLayer], b = c.layers[it.toLayer];
        if (it.kind === "bridge") {
          var tb = c.buildings[b.building];
          steps.push({ icon: "bridge", k: "bridge", a: { b: tb ? tb.name : "", fl: b.name }, text: "Cross the bridge to " + (tb ? tb.name : "the next building"), sub: "You stay on the " + b.name.toLowerCase(), layer: it.fromLayer, at: it.at });
        } else if (it.kind === "door") {
          var out = b.kind === "outdoor", bd = c.buildings[(out ? a : b).building];
          steps.push({ icon: "door", k: out ? "exit" : "enter", a: { b: bd ? bd.name : "", fl: b.name }, text: (out ? "Exit " : "Enter ") + (bd ? bd.name : "the building"),
            sub: out ? "Continue outside" : "You are on the " + b.name.toLowerCase(), layer: it.fromLayer, at: it.at });
        } else {
          var k = c.connectors[it.conn], diff = (b.level || 0) - (a.level || 0), fl = Math.abs(diff);
          steps.push({ icon: it.kind, k: "level", a: { lift: it.kind === "lift", what: k ? k.name : "", up: diff > 0, fl: b.name, n: fl }, text: "Take " + (it.kind === "lift" ? "the lift" : k ? k.name : "the stairs") + (diff > 0 ? " up" : " down") + " to the " + b.name.toLowerCase(),
            sub: fl + (fl === 1 ? " floor" : " floors"), layer: it.fromLayer, at: it.at });
        }
        return;
      }
      it.pts = simplify(it.pts);
      var pts = it.pts, mpu = c.layers[it.layer].mpu || 0.1, isFirst = it === first, isLast = it === lastLeg;
      it.meters = 0;
      var ctx = c.layers[it.layer].kind === "outdoor" ? " along the walkway" : " along the corridor";
      for (var s = 0; s + 1 < pts.length; s++) {
        var len = Math.hypot(pts[s + 1][0] - pts[s][0], pts[s + 1][1] - pts[s][1]) * mpu;
        it.meters += len;
        var isStart = isFirst && startStub && s === 0, isEnd = isLast && endStub && s === pts.length - 2;
        var dir = s > 0 ? turn(pts[s - 1], pts[s], pts[s + 1]) : null;
        if (isEnd) {
          if (s === 0 && isStart) steps.push({ icon: "straight", k: "across", a: { m: len }, text: "Walk straight across", sub: fmtDist(len), layer: it.layer, at: pts[s] });
          it.endSide = dir === "left" || dir === "right" ? dir : null;
        } else if (isStart) {
          it.leaving = true;                                 // next bend says which way to go
        } else if (s === 0 || !dir || dir === "straight") {
          steps.push({ icon: "straight", k: "walk", a: { m: len, out: c.layers[it.layer].kind === "outdoor" }, text: "Walk " + fmtDist(len) + ctx, layer: it.layer, at: pts[s] });
        } else {
          var lead = it.leaving && s === 1 ? "Leave " + from.name + " and turn " : "Turn ";
          steps.push({ icon: dir, k: "turn", a: { dir: dir, m: len, from: it.leaving && s === 1 ? from.name : "", out: c.layers[it.layer].kind === "outdoor" }, text: lead + (dir === "back" ? "around" : dir), sub: len >= 1.5 ? "Walk " + fmtDist(len) + ctx : "", layer: it.layer, at: pts[s] });
        }
      }
    });
    steps.push({ icon: "arrive", k: "arrive", a: { name: to.name, side: lastLeg.endSide || "", where: where(c, to) }, text: "Arrive at " + to.name, sub: lastLeg.endSide ? "It is on your " + lastLeg.endSide : where(c, to), layer: to.layer, at: lastLeg.pts[lastLeg.pts.length - 1] });

    return { from: from, to: to, meters: meters, seconds: r.dist[to.node], legs: legs, steps: steps, accessible: !!(opts && opts.accessible) };
  }

  /* Closest place of a given type, by walking time from `fromId`. */
  function nearest(c, fromId, type, opts) {
    var from = c.places[fromId];
    if (!from) return null;
    var r = dijkstra(c, from.node, opts), best = null;
    c.placeList.forEach(function (p) {
      if (p.type !== type || p.id === fromId) return;
      var d = r.dist[p.node];
      if (d != null && (!best || d < best.d)) best = { place: p, d: d };
    });
    return best && best.place;
  }

  /* Walking time in seconds from a place to every graph node. */
  function distances(c, fromId, opts) {
    var from = c.places[fromId];
    return from ? dijkstra(c, from.node, opts).dist : {};
  }
  function roundDist(m) { return m < 10 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5; }
  function roundMin(s) { return Math.round(s / 60); }

  var api = { TYPES: TYPES, build: build, search: search, route: route, nearest: nearest, where: where, distances: distances,
    layerTitle: layerTitle, fmtDist: fmtDist, fmtTime: fmtTime, norm: norm, roundDist: roundDist, roundMin: roundMin };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NavCore = api;
})(typeof window !== "undefined" ? window : globalThis);
