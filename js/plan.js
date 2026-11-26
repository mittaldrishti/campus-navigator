/* Time-aware features: room timetables, free-room finder, faculty availability and
   the "time to leave" planner. Pure functions on top of NavCore, no DOM, so the
   same code runs in the browser and in Node tests.

   A timetable slot is plain data:
     { place, days: [1,3,5], start: "09:00", end: "09:55", subject, faculty }
   `days` uses 0 = Sunday ... 6 = Saturday. The campus package may also carry
   a `calendar` ({ days, open, close, lunch }) that says when the campus is in use. */
(function (root) {
  "use strict";
  var C = root.NavCore || (typeof require !== "undefined" ? require("./core.js") : null);
  var DEFAULT_CAL = { days: [1, 2, 3, 4, 5, 6], open: "08:00", close: "18:00", lunch: null };
  var DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  function toMin(hm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ""));
    return m ? Math.min(1439, +m[1] * 60 + +m[2]) : null;
  }
  function hm(min) { return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
  function isoOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  /* `when` is a Date, or { day, min } for "Tuesday 10:30", or nothing for right now. */
  function clock(when) {
    if (when && typeof when.day === "number" && typeof when.min === "number") return { day: when.day, min: when.min, iso: when.iso || null };
    var d = when instanceof Date ? when : new Date();
    return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), iso: isoOf(d) };
  }
  function calendar(c) {
    var k = Object.assign({}, DEFAULT_CAL, c.data && c.data.calendar || {});
    return { days: k.days, open: toMin(k.open), close: toMin(k.close), lunch: k.lunch ? [toMin(k.lunch[0]), toMin(k.lunch[1])] : null };
  }
  /* The next moment the campus opens, counting from `t`. */
  function nextOpen(c, t) {
    var cal = calendar(c);
    for (var i = 0; i < 8; i++) {
      var day = (t.day + i) % 7;
      if (cal.days.indexOf(day) < 0) continue;
      if (i === 0 && t.min >= cal.open) continue;
      return { day: day, min: cal.open, daysAhead: i };
    }
    return null;
  }
  function isOpen(c, t) {
    var cal = calendar(c);
    return cal.days.indexOf(t.day) >= 0 && t.min >= cal.open && t.min < cal.close;
  }

  /* ---------- timetable index ---------- */
  function indexTimetable(c, list) {
    c.timetable = []; c.tt = { byPlace: {}, byFac: {} };
    (list || []).forEach(function (raw, i) {
      var s = toMin(raw.start), e = toMin(raw.end);
      var mapped = !!c.places[raw.place];
      if ((!mapped && !raw.room) || s == null || e == null || e <= s || !Array.isArray(raw.days) || !raw.days.length) return;
      var slot = { id: raw.id || "t" + i, place: mapped ? raw.place : "", room: raw.room || "", days: raw.days.map(Number).filter(function (d) { return d >= 0 && d <= 6; }),
        start: hm(s), end: hm(e), s: s, e: e, subject: raw.subject || "", faculty: raw.faculty || "", cls: raw.cls || "", code: raw.code || "" };
      if (!slot.days.length) return;
      c.timetable.push(slot);                          // rooms that are not on the map yet still count for the teacher
      if (mapped) (c.tt.byPlace[slot.place] = c.tt.byPlace[slot.place] || []).push(slot);
      if (slot.faculty) (c.tt.byFac[C.norm(slot.faculty)] = c.tt.byFac[C.norm(slot.faculty)] || []).push(slot);
    });
    return c;
  }
  function plainSlot(s) { return { id: s.id, place: s.place, room: s.room, days: s.days.slice(), start: s.start, end: s.end, subject: s.subject, faculty: s.faculty, cls: s.cls, code: s.code }; }
  function slotsOn(c, placeId, day) {
    return ((c.tt && c.tt.byPlace[placeId]) || []).filter(function (s) { return s.days.indexOf(day) >= 0; }).sort(function (a, b) { return a.s - b.s; });
  }
  function cabinIds(c) { var o = {}; (c.faculty || []).forEach(function (f) { o[f.place] = 1; }); return o; }

  /* ---------- rooms ---------- */
  function roomStatus(c, placeId, when) {
    var t = clock(when), cal = calendar(c), all = (c.tt && c.tt.byPlace[placeId]) || [];
    var base = { tracked: all.length > 0, t: t };
    if (!isOpen(c, t)) return Object.assign(base, { state: "closed", next: nextOpen(c, t) });
    var list = slotsOn(c, placeId, t.day), cur = null, i;
    for (i = 0; i < list.length; i++) if (list[i].s <= t.min && t.min < list[i].e) { cur = list[i]; break; }
    if (cur) {                                           // back-to-back classes count as one busy block
      var until = cur.e, moved = true;
      while (moved) { moved = false; for (i = 0; i < list.length; i++) if (list[i].s <= until && list[i].e > until) { until = list[i].e; moved = true; } }
      return Object.assign(base, { state: "busy", slot: cur, until: until });
    }
    var nxt = null;
    for (i = 0; i < list.length; i++) if (list[i].s > t.min) { nxt = list[i]; break; }
    return Object.assign(base, { state: "free", until: nxt ? nxt.s : cal.close, next: nxt, allDay: !nxt });
  }

  /* Rooms nobody has booked for at least `minFree` minutes, nearest first.
     Rooms with no timetable at all are left out: we cannot tell if they are free. */
  function freeRooms(c, when, o) {
    o = o || {};
    var t = clock(when), cabins = cabinIds(c), types = o.types || ["room"];
    if (!isOpen(c, t)) return { closed: true, next: nextOpen(c, t), rooms: [], t: t };
    var dist = o.from ? C.distances(c, o.from, { accessible: o.accessible, blocked: o.blocked }) : null, out = [];
    c.placeList.forEach(function (p) {
      if (types.indexOf(p.type) < 0 || cabins[p.id] || (o.building && p.building !== o.building && c.layers[p.layer] && c.layers[p.layer].building !== o.building)) return;
      var st = roomStatus(c, p.id, t);
      if (!st.tracked || st.state !== "free" || st.until - t.min < (o.minFree || 0)) return;
      var secs = dist ? dist[p.node] : null;
      if (dist && secs == null) return;
      out.push({ place: p, until: st.until, mins: st.until - t.min, allDay: st.allDay, secs: secs });
    });
    out.sort(function (a, b) {
      return (a.secs != null && b.secs != null ? a.secs - b.secs : 0) || b.mins - a.mins || a.place.name.localeCompare(b.place.name, undefined, { numeric: true });
    });
    return { closed: false, rooms: out, t: t };
  }

  /* ---------- faculty ---------- */
  function facultyDay(c, f, day) {
    return ((c.tt && c.tt.byFac[C.norm(f.name)]) || []).filter(function (s) { return s.days.indexOf(day) >= 0; }).sort(function (a, b) { return a.s - b.s; });
  }
  /* Where a teacher is right now: teaching, in the cabin, at lunch, on leave or away. */
  function facultyStatus(c, f, when) {
    var t = clock(when), cal = calendar(c);
    if (f.leave && t.iso && f.leave === t.iso) return { state: "leave", place: f.place, t: t };
    if (!isOpen(c, t)) return { state: "away", place: f.place, next: nextOpen(c, t), t: t };
    var list = facultyDay(c, f, t.day), cur = null, i;
    for (i = 0; i < list.length; i++) if (list[i].s <= t.min && t.min < list[i].e) { cur = list[i]; break; }
    if (cur) {
      var until = cur.e, moved = true;
      while (moved) { moved = false; for (i = 0; i < list.length; i++) if (list[i].s <= until && list[i].e > until && list[i].place === cur.place) { until = list[i].e; moved = true; } }
      return { state: "teaching", slot: cur, place: cur.place, room: cur.room, until: until, t: t };
    }
    if (cal.lunch && t.min >= cal.lunch[0] && t.min < cal.lunch[1]) return { state: "lunch", place: f.place, until: cal.lunch[1], t: t };
    var nxt = null;
    for (i = 0; i < list.length; i++) if (list[i].s > t.min) { nxt = list[i]; break; }
    return { state: "cabin", place: f.place, until: nxt ? nxt.s : cal.close, next: nxt, t: t };
  }

  /* ---------- meeting a teacher ---------- */
  /* The gaps in a teacher's day when students can meet them. Each window says what the
     teacher is coming from and going to, so students know where to look if no cabin is set. */
  function facultyWindows(c, f, day, o) {
    o = o || {};
    var cal = calendar(c), min = o.min == null ? 20 : o.min, out = [];
    if (cal.days.indexOf(day) < 0) return out;
    if (f.leave && o.iso && f.leave === o.iso) return out;
    var list = facultyDay(c, f, day), cur = cal.open, prev = null, i;
    function push(a, b, before, after) {
      if (cal.lunch) {                                  // a break the whole campus takes is not a meeting window
        if (a < cal.lunch[1] && b > cal.lunch[0]) {
          if (a < cal.lunch[0]) push2(a, cal.lunch[0], before, null);
          if (b > cal.lunch[1]) push2(cal.lunch[1], b, null, after);
          return;
        }
      }
      push2(a, b, before, after);
    }
    function push2(a, b, before, after) { if (b - a >= min) out.push({ s: a, e: b, mins: b - a, start: hm(a), end: hm(b), before: before, after: after }); }
    for (i = 0; i < list.length; i++) {
      if (list[i].s > cur) push(cur, list[i].s, prev, list[i]);
      if (list[i].e > cur) { cur = list[i].e; prev = list[i]; }
    }
    if (cal.close > cur) push(cur, cal.close, prev, null);
    return out;
  }
  /* The next time a teacher can be met, from `when`: { now, daysAhead, day, s, e, mins, before, after } or null.
     `now` means they are free at this moment. Looks a week ahead. */
  function nextWindow(c, f, when, o) {
    o = o || {};
    var t = clock(when), min = o.min == null ? 20 : o.min;
    for (var i = 0; i < 8; i++) {
      var day = (t.day + i) % 7, wins = facultyWindows(c, f, day, { min: 1, iso: i === 0 ? t.iso : null });
      for (var j = 0; j < wins.length; j++) {
        var w = wins[j], st = i === 0 ? Math.max(w.s, t.min) : w.s;
        if (w.e - st >= min) return { now: i === 0 && w.s <= t.min, daysAhead: i, day: day, s: st, e: w.e, mins: w.e - st, before: w.before, after: w.after };
      }
    }
    return null;
  }
  /* Teachers who are free right now (or at `when`), longest free stretch first. */
  function freeFaculty(c, when, o) {
    o = o || {};
    var t = clock(when), min = o.min == null ? 10 : o.min, out = [];
    (c.faculty || []).forEach(function (f) {
      var st = facultyStatus(c, f, t);
      if (st.state !== "cabin" || st.until - t.min < min) return;
      var wins = facultyWindows(c, f, t.day, { min: 1, iso: t.iso }), w = null, i;
      for (i = 0; i < wins.length; i++) if (wins[i].s <= t.min && t.min < wins[i].e) { w = wins[i]; break; }
      out.push({ faculty: f, until: st.until, mins: st.until - t.min, next: st.next, prev: w ? w.before : null, window: w });
    });
    out.sort(function (a, b) { return b.mins - a.mins || a.faculty.name.localeCompare(b.faculty.name); });
    return out;
  }

  /* ---------- time to leave ---------- */
  /* schedule: [{ day, time, dur, place, subject }]. Returns the next day's classes with the
     time to leave for each one, based on real walking time (stairs, lifts and bridges included). */
  function planLeave(c, schedule, when, startId, o) {
    o = o || {};
    var t = clock(when), buffer = o.buffer == null ? 3 : o.buffer, ropts = { accessible: !!o.accessible, blocked: o.blocked || {} };
    var cl = [];
    (schedule || []).forEach(function (e) {
      var st = toMin(e.time);
      if (st == null || !c.places[e.place]) return;
      var dur = e.dur || 60, rel = ((e.day - t.day + 7) % 7) * 1440 + st - t.min;
      if (rel <= -dur) rel += 10080;                    // already over this week: next time round
      cl.push({ e: e, rel: rel, dur: dur, start: st });
    });
    if (!cl.length) return null;
    cl.sort(function (a, b) { return a.rel - b.rel; });
    var dayOff = Math.floor((t.min + cl[0].rel) / 1440), items = [], prev = null;
    cl.forEach(function (x) {
      if (Math.floor((t.min + x.rel) / 1440) !== dayOff) return;
      var from = prev ? prev.e.place : startId, r = from && from !== x.e.place ? C.route(c, from, x.e.place, ropts) : null;
      var walkMin = !from || from === x.e.place ? 0 : r ? Math.max(1, Math.ceil(r.seconds / 60)) : null;
      var it = { cls: x.e, rel: x.rel, dur: x.dur, from: from, walkMin: walkMin, meters: r ? r.meters : 0, route: r, chained: !!prev, buffer: buffer };
      if (walkMin == null) { it.status = "noroute"; it.leaveRel = null; }
      else {
        var latest = x.rel - walkMin - buffer, earliest = prev ? prev.rel + prev.dur : -Infinity;
        if (x.rel < 0) { it.status = "inprogress"; it.leaveRel = null; }
        else if (latest < earliest) { it.leaveRel = earliest; it.status = "tight"; it.lateBy = Math.max(0, Math.ceil(earliest + walkMin - x.rel)); }
        else if (!prev && latest <= 0 && x.rel - walkMin < 0) { it.leaveRel = 0; it.status = "late"; it.lateBy = walkMin - x.rel; }
        else if (!prev && latest <= 0) { it.leaveRel = 0; it.status = "now"; }
        else { it.leaveRel = latest; it.status = "ok"; }
      }
      it.leaveClock = it.leaveRel == null ? null : (((t.min + it.leaveRel) % 1440) + 1440) % 1440;
      it.startClock = x.start; it.endClock = (x.start + x.dur) % 1440;
      items.push(it); prev = { e: x.e, rel: x.rel, dur: x.dur };
    });
    var focus = 0;
    for (var i = 0; i < items.length; i++) if (items[i].status !== "inprogress") { focus = i; break; }
    return { items: items, dayOff: dayOff, day: (t.day + dayOff) % 7, focus: focus, t: t };
  }

  /* ---------- CSV import / export ---------- */
  function parseCsv(text) {
    var rows = [], row = [], cell = "", q = false, i, ch;
    text = String(text || "").replace(/^﻿/, "");
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  function parseDays(s) {
    s = String(s || "").toLowerCase().trim();
    var out = [], i, rng = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*-\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*/.exec(s);
    if (rng) {
      var a = DAY_NAMES.indexOf(rng[1]), b = DAY_NAMES.indexOf(rng[2]);
      for (i = a; ; i = (i + 1) % 7) { out.push(i); if (i === b) break; }
      return out;
    }
    if (/^[\d,\s;/|]+$/.test(s)) return s.split(/[,\s;/|]+/).filter(Boolean).map(Number).filter(function (d) { return d >= 0 && d <= 6; });
    var named = s.match(/(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g), letters = s.replace(/[^a-z]/g, "");
    if (named && named.join("") === letters) return named.map(function (d) { return DAY_NAMES.indexOf(d.slice(0, 3)); });
    var compact = letters, m = compact.match(/th|su|sa|m|t|w|f|s/g) || [], map = { m: 1, t: 2, w: 3, th: 4, f: 5, sa: 6, s: 6, su: 0 };
    return m.map(function (x) { return map[x]; });
  }
  /* Rows: room, days, start, end, subject, faculty. Returns { slots, errors }. */
  function timetableFromCsv(c, text) {
    var rows = parseCsv(text), slots = [], errors = [];
    if (rows.length && /room/i.test(rows[0][0]) && /day/i.test(rows[0][1] || "")) rows.shift();
    rows.forEach(function (r, i) {
      var line = i + 2, room = (r[0] || "").trim(), p = c.places[room];
      if (!p) {
        var nr = C.norm(room);
        p = c.placeList.filter(function (x) { return C.norm(x.number || "") === nr || C.norm(x.name) === nr || C.norm(x.label || "") === nr; })[0];
        if (!p) { var h = C.search(c, room, 1)[0]; if (h && h.kind === "place" && h.score >= 80) p = h.place; }
      }
      var days = parseDays(r[1]), s = toMin((r[2] || "").trim()), e = toMin((r[3] || "").trim());
      if (!p) return errors.push("Line " + line + ': no room matches "' + room + '".');
      if (!days.length) return errors.push("Line " + line + ': days "' + (r[1] || "") + '" are not clear. Use Mon Wed Fri or 1,3,5.');
      if (s == null || e == null || e <= s) return errors.push("Line " + line + ": start and end must look like 09:00 and 09:55.");
      slots.push({ id: "t" + Date.now().toString(36) + i, place: p.id, days: days, start: hm(s), end: hm(e), subject: (r[4] || "").trim().slice(0, 80), faculty: (r[5] || "").trim().slice(0, 60) });
    });
    return { slots: slots, errors: errors };
  }
  function timetableToCsv(c) {
    var q = function (x) { return /[",\n]/.test(x) ? '"' + String(x).replace(/"/g, '""') + '"' : x; };
    return ["room,days,start,end,subject,faculty"].concat(c.timetable.map(function (s) {
      return [s.place, s.days.map(function (d) { return DAY_NAMES[d]; }).join(" "), s.start, s.end, s.subject, s.faculty].map(q).join(",");
    })).join("\n");
  }


  /* ---------- a student's own weekly timetable ---------- */
  function resolveRoom(c, text) {
    var t = String(text || "").trim(), m = /\bR\.?N\.?\s*([A-Za-z]?\d{1,3})\b/i.exec(t) || /\broom\s*([A-Za-z]?\d{1,3})\b/i.exec(t);
    var key = m ? m[1] : t, p = c.places[key];
    if (p) return p;
    var nk = C.norm(key);
    p = c.placeList.filter(function (x) { return nk && (C.norm(x.number || "") === nk || C.norm(x.name) === nk || C.norm(x.label || "") === nk); })[0];
    if (!p) { var h = C.search(c, key, 1)[0]; if (h && h.kind === "place" && h.score >= 80) p = h.place; }
    return p || null;
  }
  var RANGE = /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.](\d{2})/i;
  function rangeOf(cell) {
    var m = RANGE.exec(String(cell || ""));
    if (!m) return null;
    var s = +m[1] * 60 + +m[2], e = +m[3] * 60 + +m[4];
    if (s < 7 * 60) s += 720;                                  // 1:30 means 13:30
    if (e <= s) e += 720;
    return e > s && e < 1440 ? [s, e] : null;
  }
  var DAYWORD = /^(sun|mon|tue|wed|thu|fri|sat|sa)\w*\.?$/i;
  function dayIndex(cell) {
    var w = String(cell || "").trim().toLowerCase();
    if (!DAYWORD.test(w)) return null;
    return w === "sa" ? 6 : DAY_NAMES.indexOf(w.slice(0, 3));
  }
  /* Reads either a plain list (day,start,end,subject,room) or a timetable grid:
       header row with period times, then one row per day, each cell like "MCL616 Arjun.S RN 001".
     A legend (code,full name) below the grid is used to name the subjects. */
  function parseMyTimetable(c, text) {
    var rows = parseCsv(String(text || "").replace(/\t/g, ",")), out = [], errors = [], i, j;
    if (!rows.length) return { entries: out, errors: ["The file is empty."] };
    var headIdx = -1;
    for (i = 0; i < Math.min(rows.length, 6); i++) if (rows[i].filter(function (x) { return rangeOf(x); }).length >= 3) { headIdx = i; break; }
    if (headIdx >= 0) {                                          // ---- grid
      var times = rows[headIdx].map(rangeOf), legend = {}, grid = [];
      for (i = headIdx + 1; i < rows.length; i++) {
        var d = dayIndex(rows[i][0]);
        if (d != null) grid.push({ day: d, cells: rows[i] });
        else if (rows[i].length >= 2 && /^[A-Z]{2,5}\s?\d{2,4}$/.test((rows[i][0] || "").trim()) && (rows[i][1] || "").trim()) legend[rows[i][0].replace(/\s/g, "")] = rows[i][1].trim();
      }
      if (!grid.length) return { entries: out, errors: ["No day rows found. Rows should start with MON, TUE, WED..."] };
      grid.forEach(function (g) {
        var prev = null;
        for (j = 1; j < g.cells.length; j++) {
          var cell = String(g.cells[j] || "").replace(/\s+/g, " ").trim(), tr = times[j];
          if (!cell || !tr || /lunch|break/i.test(cell) || /^(cs|entire class)$/i.test(cell)) { prev = null; continue; }
          if (prev && prev.cell === cell && prev.e === tr[0] - 0 || prev && prev.cell === cell && tr[0] - prev.e <= 15) { prev.e = tr[1]; prev.entry.dur = prev.e - prev.s; continue; }
          var room = resolveRoom(c, (/\bR\.?N\.?\s*[A-Za-z]?\d{1,3}\b/i.exec(cell) || [""])[0]);
          var code = (/\b[A-Z]{2,5}\s?\d{2,4}\b/.exec(cell) || [cell.split(" ")[0]])[0].replace(/\s/g, "");
          if (!room) { errors.push(DAY_NAMES[g.day].toUpperCase() + " " + hm(tr[0]) + ': no room found in "' + cell + '".'); prev = null; continue; }
          var entry = { id: "m" + g.day + "-" + tr[0], subject: legend[code] ? code + " " + legend[code] : code, place: room.id, day: g.day, time: hm(tr[0]), dur: tr[1] - tr[0] };
          out.push(entry); prev = { cell: cell, s: tr[0], e: tr[1], entry: entry };
        }
      });
      out.forEach(function (e) { var k = e.subject.split(" ")[0]; if (legend[k] && e.subject === k) e.subject = k + " " + legend[k]; });
      return { entries: out, errors: errors };
    }
    // ---- list
    if (rows.length && /day/i.test(rows[0][0] || "") && /start|time/i.test(rows[0][1] || "")) rows.shift();
    rows.forEach(function (r, n) {
      var days = parseDays(r[0]), s = toMin((r[1] || "").trim()), e = toMin((r[2] || "").trim()), room = resolveRoom(c, r[4]), line = n + 1;
      if (!days.length) return errors.push("Line " + line + ': day "' + (r[0] || "") + '" is not clear.');
      if (s == null || e == null || e <= s) return errors.push("Line " + line + ": start and end must look like 09:00 and 09:50.");
      if (!room) return errors.push("Line " + line + ': no room matches "' + (r[4] || "") + '".');
      days.forEach(function (d) { out.push({ id: "m" + d + "-" + s, subject: (r[3] || "Class").trim().slice(0, 60), place: room.id, day: d, time: hm(s), dur: e - s }); });
    });
    return { entries: out, errors: errors };
  }

  Object.assign(C, { parseMyTimetable: parseMyTimetable, resolveRoom: resolveRoom, toMin: toMin, hm: hm, clock: clock, calendar: calendar, isOpen: isOpen, nextOpen: nextOpen, indexTimetable: indexTimetable,
    plainSlot: plainSlot, slotsOn: slotsOn, facultyWindows: facultyWindows, freeFaculty: freeFaculty, nextWindow: nextWindow, roomStatus: roomStatus, freeRooms: freeRooms, facultyDay: facultyDay, facultyStatus: facultyStatus,
    planLeave: planLeave, parseCsv: parseCsv, parseDays: parseDays, timetableFromCsv: timetableFromCsv, timetableToCsv: timetableToCsv, isoOf: isoOf, DAY_NAMES: DAY_NAMES });
})(typeof window !== "undefined" ? window : globalThis);
