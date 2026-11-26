// Run: node tools/test_core.js
const assert = require("assert");
const path = require("path");
const core = require("../js/core.js");
require("../js/plan.js"); require("../js/nlu.js");
const load = (id) => core.build(require(path.join("..", "data", id + ".json")));

const ncu = load("ncu");
const show = (r) => r.steps.map((s) => "  " + s.icon.padEnd(8) + s.text + (s.sub ? "  [" + s.sub + "]" : "")).join("\n");

// every place can reach every other place
for (const id of ["ncu", "greenfield"]) {
  const c = load(id);
  const gate = c.places["gate"];
  for (const p of c.placeList) assert(core.route(c, "gate", p.id) , id + ": gate cannot reach " + p.id);
  assert(gate);
}

let r = core.route(ncu, "old-105", "new-N207");
console.log("105 -> N207:", core.fmtDist(r.meters), core.fmtTime(r.seconds)); console.log(show(r));
assert(r.steps.some((s) => s.icon === "stairs" || s.icon === "lift"));
assert(r.steps.some((s) => s.text === "Cross the bridge to New Building"));
assert(!r.steps.some((s) => s.text.startsWith("Exit Old Building")));

let a = core.route(ncu, "old-105", "new-N207", { accessible: true });
console.log("\nstep-free:", core.fmtDist(a.meters), core.fmtTime(a.seconds)); console.log(show(a));
assert(!a.steps.some((s) => s.icon === "stairs"));
assert(a.steps.some((s) => s.icon === "lift"));
assert(a.seconds >= r.seconds);

// old lift out of service + step-free => up the new building's lift, then across the bridge
let viaBridge = core.route(ncu, "gate", "old-3-library", { accessible: true, blocked: { "old-lift": true, "old-lift2": true } });
console.log("\nold lift closed, step-free:"); console.log(show(viaBridge));
assert(viaBridge.steps.some((s) => s.text === "Cross the bridge to Old Building"));
// both lifts out of service + step-free => no route up
assert.strictEqual(core.route(ncu, "gate", "old-3-library", { accessible: true, blocked: { "old-lift": true, "old-lift2": true, "new-lift": true } }), null);
// same floor in both buildings => bridge only, no stairs
let flat = core.route(ncu, "old-205", "new-N208");
assert(flat.steps.some((s) => s.icon === "bridge") && !flat.steps.some((s) => s.icon === "stairs" || s.icon === "door"));
// stairs A blocked => uses stairs B or lift
let b = core.route(ncu, "old-105", "old-205", { blocked: { "old-stairsA": true } });
assert(b && !b.steps.some((s) => /Stairs A/.test(s.text)));

r = core.route(ncu, "old-110", "old-126");
console.log("\nacross the courtyard block:"); console.log(show(r));
r = core.route(ncu, "gate", "cafe-10");
console.log("\ngate -> cafe 10:"); console.log(show(r));
r = core.route(ncu, "old-3-library", "old-002");
console.log("\nlibrary -> medical:"); console.log(show(r));
assert(/3 floors/.test(r.steps.find((s) => s.icon === "stairs" || s.icon === "lift").sub));

// search
const top = (q) => core.search(ncu, q)[0];
assert.strictEqual(top("n201").place.id, "new-N201");
assert.strictEqual(top("N 201").place.id, "new-N201");
assert.strictEqual(top("002").place.id, "old-002");
assert.strictEqual(top("medical").place.id, "old-002");
assert.strictEqual(top("common room").place.id, "old-101");
assert.strictEqual(top("cafe 10").place.id, "cafe-10");
assert.strictEqual(top("library").place.id, "old-3-library");
assert.strictEqual(top("sharma").kind, "faculty");
assert(core.search(ncu, "lab").length >= 3);
assert(/^old-2-washroom-/.test(core.nearest(ncu, "old-239", "wc").id));
assert(/^new-[01]-washroom-/.test(core.nearest(ncu, "new-N201", "wc").id));     // floors 2 and 3 have no washroom (sketch)
assert(/^new-1-cafe-1/.test(core.nearest(ncu, "old-3-library", "cafe").id));   // across the bridge
assert(/^new-1-cafe-1/.test(core.nearest(ncu, "gate", "cafe").id));
assert.strictEqual(core.nearest(ncu, "ground", "cafe").id, "cafe-10");
// the lab lane from the second sketch is reachable from the gate
assert(core.route(ncu, "gate", "nescafe") && core.route(ncu, "gate", "outdoor-washroom") && core.route(ncu, "gate", "volley-badminton"));

// ---------------------------------------------------------------------
// Time-aware features
// ---------------------------------------------------------------------
const THU = (h, m) => ({ day: 4, min: h * 60 + m, iso: "2026-11-19" });   // Thursday
const gf = load("greenfield");

// the sample timetable never double-books a room or a teacher
for (const c of [ncu, gf]) {
  assert(c.timetable.length > 100, "timetable is missing");
  const room = {}, fac = {}; let clashes = 0;
  for (const s of c.timetable) for (const d of s.days) for (let t = s.s; t < s.e; t += 5) {
    if (s.place && !/^labs-/.test(s.place)) { const rk = s.place + "|" + d + "|" + t; assert(!room[rk], "room double booked " + rk); room[rk] = 1; }
    if (s.faculty) { const fk = s.faculty + "|" + d + "|" + t; if (fac[fk]) clashes++; fac[fk] = 1; }
  }
  // the real NCU files reuse a few short names for different teachers, so a handful of clashes is the source, not a bug
  assert(clashes <= (c === ncu ? 120 : 0), "teacher double booked " + clashes);
}
assert(ncu.timetable.some((s) => !s.place && s.room), "rooms that are not on the map keep their name");
assert(ncu.timetable.some((s) => s.place === "labs-north" && s.room === "BME LAB") && ncu.timetable.some((s) => s.place === "labs-south" && /^PHY LAB/.test(s.room)), "outside labs sit on the lab blocks");

// room status
const some = ncu.timetable.find((s) => s.days.includes(4));              // a Thursday class
let st = core.roomStatus(ncu, some.place, THU(Math.floor(some.s / 60), some.s % 60));
assert.strictEqual(st.state, "busy"); assert(st.until >= some.e);
st = core.roomStatus(ncu, some.place, THU(7, 0)); assert.strictEqual(st.state, "closed");
st = core.roomStatus(ncu, some.place, { day: 0, min: 600 }); assert.strictEqual(st.state, "closed");   // Sunday
assert.strictEqual(core.nextOpen(ncu, { day: 0, min: 600 }).day, 1);                                       // Monday
assert.strictEqual(core.nextOpen(ncu, { day: 4, min: 400 }).daysAhead, 0);

// free rooms: nearest first, never a booked room, never a faculty cabin
let fr = core.freeRooms(ncu, THU(11, 30), { from: "gate", minFree: 20 });
assert(!fr.closed && fr.rooms.length > 10);
for (let i = 1; i < fr.rooms.length; i++) assert(fr.rooms[i - 1].secs <= fr.rooms[i].secs, "not sorted by walking time");
fr.rooms.forEach((x) => { assert.notStrictEqual(core.roomStatus(ncu, x.place.id, THU(11, 30)).state, "busy"); assert(x.mins >= 20); assert(!ncu.faculty.some((f) => f.place === x.place.id)); });
assert(core.freeRooms(ncu, THU(11, 30), { from: "gate", minFree: 60 }).rooms.length <= fr.rooms.length);
assert(core.freeRooms(ncu, { day: 0, min: 700 }).closed);                                                   // Sunday
assert(core.freeRooms(ncu, THU(18, 0)).closed);
const onlyNew = core.freeRooms(ncu, THU(11, 30), { from: "gate", building: "new" });
assert(onlyNew.rooms.length && onlyNew.rooms.every((x) => ncu.layers[x.place.layer].building === "new"));
const stepFree = core.freeRooms(ncu, THU(11, 30), { from: "gate", accessible: true, blocked: { "old-lift": true, "old-lift2": true, "new-lift": true } });
assert(stepFree.rooms.every((x) => x.place.layer === "old-0" || x.place.layer === "new-0" || !/^(old|new)-[1-9]/.test(x.place.layer)), "step-free with lifts closed must stay on the ground");

// faculty status (real teachers from the 12 Oct 2026 files; no cabin is set on the map yet)
assert(ncu.faculty.length > 150 && ncu.faculty.every((f) => !f.place), "real faculty without cabins");
const fac = ncu.faculty.find((f) => core.facultyDay(ncu, f, 4).length >= 2), slots = core.facultyDay(ncu, fac, 4);
const s0 = slots[0];
let fs = core.facultyStatus(ncu, fac, THU(Math.floor(s0.s / 60), s0.s % 60));
assert.strictEqual(fs.state, "teaching"); assert.strictEqual(fs.place, s0.place); assert(fs.until >= s0.e);
assert.strictEqual(core.facultyStatus(ncu, fac, THU(20, 0)).state, "away");
assert.strictEqual(core.facultyStatus(ncu, Object.assign({}, fac, { leave: "2026-11-19" }), THU(11, 0)).state, "leave");
assert.notStrictEqual(core.facultyStatus(ncu, Object.assign({}, fac, { leave: "2026-11-18" }), THU(11, 0)).state, "leave");   // yesterday's leave has expired
const gfac = gf.faculty.map((f) => core.facultyStatus(gf, f, THU(12, 45)).state);
assert(gfac.includes("lunch"), "campuses with a lunch break show it");

// meeting a teacher: free windows are the gaps between classes, never overlapping a class
const cal = core.calendar(ncu);
for (const f of ncu.faculty.slice(0, 60)) for (let day = 1; day <= 5; day++) {
  const w = core.facultyWindows(ncu, f, day, { min: 20 }), busy = core.facultyDay(ncu, f, day);
  let prevEnd = -1;
  w.forEach((x) => {
    assert(x.s >= cal.open && x.e <= cal.close && x.mins >= 20 && x.s >= prevEnd); prevEnd = x.e;
    busy.forEach((b) => assert(b.e <= x.s || b.s >= x.e, "window overlaps a class for " + f.name));
  });
  if (!busy.length) assert.strictEqual(w.length, 1), assert.strictEqual(w[0].mins, cal.close - cal.open);    // no class: free all day
}
const gapF = ncu.faculty.find((f) => { const l = core.facultyDay(ncu, f, 4); return l.length >= 2 && l[1].s - l[0].e >= 40; });
const g = core.facultyDay(ncu, gapF, 4), win = core.facultyWindows(ncu, gapF, 4, { min: 20 }).find((x) => x.s === g[0].e);
assert(win && win.before && win.after && win.before.id === g[0].id, "a window knows the class before and after it");
assert.strictEqual(core.facultyWindows(ncu, Object.assign({}, gapF, { leave: "2026-11-19" }), 4, { iso: "2026-11-19" }).length, 0);   // on leave: nothing to book
assert.strictEqual(core.facultyWindows(ncu, gapF, 0).length, 0);                                                                    // Sunday
const ff = core.freeFaculty(ncu, THU(g[0].e / 60 | 0, g[0].e % 60));
assert(ff.some((x) => x.faculty.name === gapF.name && x.mins >= 20), "free right after class");
ff.forEach((x) => assert.strictEqual(core.facultyStatus(ncu, x.faculty, THU(g[0].e / 60 | 0, g[0].e % 60)).state, "cabin"));
for (let i = 1; i < ff.length; i++) assert(ff[i - 1].mins >= ff[i].mins, "longest free stretch first");
assert.strictEqual(core.freeFaculty(ncu, THU(20, 0)).length, 0);                                                                   // after hours

// next time to meet: now when free, else the next gap (today, or a later day)
const nw = core.nextWindow(ncu, gapF, THU(g[0].e / 60 | 0, g[0].e % 60));
assert(nw && nw.now && nw.daysAhead === 0 && nw.mins >= 20 && nw.before.id === g[0].id);
const busyNow = core.nextWindow(ncu, gapF, THU(g[0].s / 60 | 0, g[0].s % 60 + 1));
assert(busyNow && !busyNow.now && busyNow.s >= g[0].e || busyNow.daysAhead > 0);
const evening = core.nextWindow(ncu, gapF, THU(18, 0));                                            // after hours: tomorrow or later
assert(evening && evening.daysAhead >= 1 && !evening.now);
assert.strictEqual(core.nextWindow(ncu, Object.assign({}, gapF, { name: "Nobody Here" }), THU(11, 0)).mins >= 20, true);   // no classes: free whenever

// time to leave
const sched = [{ id: "a", subject: "OS", place: "new-N207", day: 4, time: "09:30", dur: 60 }, { id: "b", subject: "DB", place: "old-105", day: 4, time: "11:30" },
  { id: "c", subject: "Law", place: "old-3-library", day: 4, time: "11:00", dur: 30 }];
let pl = core.planLeave(ncu, sched, THU(8, 50), "old-239", { buffer: 3 });
assert.strictEqual(pl.items.length, 3); assert.strictEqual(pl.items[0].cls.id, "a");
let a0 = pl.items[0], walk0 = core.route(ncu, "old-239", "new-N207").seconds;
assert.strictEqual(a0.walkMin, Math.ceil(walk0 / 60));
assert.strictEqual(a0.leaveRel, 40 - a0.walkMin - 3);                     // 8:50 -> 9:30 is 40 min away
assert.strictEqual(a0.status, "ok");
assert.strictEqual(a0.leaveClock, 8 * 60 + 50 + a0.leaveRel);
assert(pl.items[1].chained && pl.items[1].from === "new-N207");           // next leg starts from the previous room
assert.strictEqual(pl.items[1].cls.id, "c");                              // sorted by time
// leaving late
pl = core.planLeave(ncu, sched, THU(9, 29), "old-239", { buffer: 3 });
assert.strictEqual(pl.items[0].status, "late"); assert(pl.items[0].lateBy >= 1);
// right at the limit
pl = core.planLeave(ncu, sched, THU(9, 30 - a0.walkMin - 1), "old-239", { buffer: 3 });
assert.strictEqual(pl.items[0].status, "now");
// class in progress, plan moves to the next one
pl = core.planLeave(ncu, sched, THU(9, 45), "new-N207", {});
assert.strictEqual(pl.items[0].status, "inprogress"); assert.strictEqual(pl.focus, 1);
// nothing left today -> next day that has classes
pl = core.planLeave(ncu, [{ id: "x", subject: "Maths", place: "old-105", day: 1, time: "09:00" }], THU(18, 0), "gate", {});
assert.strictEqual(pl.day, 1); assert.strictEqual(pl.dayOff, 4);
assert.strictEqual(core.planLeave(ncu, [], THU(9, 0), "gate"), null);
// step-free walking is slower or equal, never faster
const fast = core.planLeave(ncu, sched, THU(8, 50), "old-239", {}).items[0].walkMin, slow = core.planLeave(ncu, sched, THU(8, 50), "old-239", { accessible: true }).items[0].walkMin;
assert(slow >= fast);

// CSV import / export round trip
const csv = 'room,days,start,end,subject,faculty\nN207,Mon Wed Fri,09:00,09:55,"Algorithms, Part 1",Dr. A. Sharma\n105,"Tue,Thu",10:00,10:55,Physics,\nnowhere,Mon,09:00,10:00,X,\nN201,Mon-Wed,9:00,8:00,Bad time,\nold-110,MWF,14:00,14:55,Lab prep,';
const imp = core.timetableFromCsv(ncu, csv);
assert.strictEqual(imp.slots.length, 3); assert.strictEqual(imp.errors.length, 2);
assert.deepStrictEqual(imp.slots[0].days, [1, 3, 5]); assert.strictEqual(imp.slots[0].subject, "Algorithms, Part 1");
assert.deepStrictEqual(imp.slots[1].days, [2, 4]); assert.strictEqual(imp.slots[1].place, "old-105");
assert.deepStrictEqual(imp.slots[2].days, [1, 3, 5]);
assert.deepStrictEqual(core.parseDays("Mon-Fri"), [1, 2, 3, 4, 5]); assert.deepStrictEqual(core.parseDays("TTh"), [2, 4]); assert.deepStrictEqual(core.parseDays("Sat Sun"), [6, 0]);
const copy = core.build(ncu.data); core.indexTimetable(copy, imp.slots);
assert.strictEqual(copy.timetable.length, 3);
assert.strictEqual(core.timetableFromCsv(copy, core.timetableToCsv(copy)).slots.length, 3);
assert.strictEqual(core.roomStatus(copy, "new-N207", { day: 3, min: 550 }).state, "busy");
assert.strictEqual(core.roomStatus(copy, "new-N208", THU(9, 10)).tracked, false);

// a student's own timetable: the NCU grid layout and a plain list
const grid = [
 'Weekly Time Table,,,,,,,,',
 ',1,2,3,4,5,6,7,8',
 ',8:30 - 9:20,9:30 - 10:20,10:30 - 11:20,11:30 - 12:20,12:30 - 13:20,13:30 - 14:20,14:30 - 15:20,15:30 - 16:20',
 'MON,,MAL616 Arjun.S RN 001,MCL507 Shruti.S RN 001,MCL503 Pitamber.V RN 001,LUNCH BREAK,CLL513 Heena.C RN 001,MCV501 RN 001,MCV501 RN 001',
 'TUE,,MCL501 Neha RN 001,CLL513 Heena.C RN 001,LUNCH BREAK,CLV200 RN 001,CLV200 RN 001,MCL503 RN 124,MCL503 RN 124',
 'THU,,,,,,,,CS',
 'FRI,,,MAL616 Arjun.S RN 001,LUNCH BREAK,MCL501 RN 302,,,',
 'Sa,,,,,,,,',
 'MAL616,Research Methodology',
 'MCL501,DBMS',
 'MCV501,Skilled Based Course'].join("\n");
const my = core.parseMyTimetable(ncu, grid);
assert.deepStrictEqual(my.errors, []);
const mon = my.entries.filter((e) => e.day === 1);
assert.strictEqual(mon.length, 5);                                         // lunch skipped, 2 MCV501 periods merged
assert.strictEqual(mon[0].time, "09:30"); assert.strictEqual(mon[0].place, "old-001"); assert.strictEqual(mon[0].dur, 50);
assert.strictEqual(mon[0].subject, "MAL616 Research Methodology");
const v = mon.find((e) => e.subject.startsWith("MCV501")); assert.strictEqual(v.time, "14:30"); assert.strictEqual(v.dur, 110); assert.strictEqual(v.subject, "MCV501 Skilled Based Course");
assert.strictEqual(my.entries.filter((e) => e.day === 2).length, 4); assert(my.entries.some((e) => e.place === "old-124" && e.dur === 110));
assert(my.entries.some((e) => e.day === 5 && e.place === "old-302" && e.time === "12:30"));
assert(!my.entries.some((e) => e.day === 4 || e.day === 6));               // "CS" and empty days stay empty
const plan2 = core.planLeave(ncu, my.entries, THU(8, 0), "gate", {});
assert(plan2 && plan2.items.length >= 1);
const lst = core.parseMyTimetable(ncu, "day,start,end,subject,room\nMon Wed,09:00,09:50,Maths,N207\nTue,10:00,11:00,Physics,nowhere");
assert.strictEqual(lst.entries.length, 2); assert.strictEqual(lst.entries[0].place, "new-N207"); assert.strictEqual(lst.errors.length, 1);
assert.strictEqual(core.parseMyTimetable(ncu, "").errors.length, 1);
assert(core.parseMyTimetable(ncu, ",1,2,3\n,9:00 - 9:50,10:00 - 10:50,11:00 - 11:50\nMON,X RN 9999,,").errors.length === 1);

// Hinglish, Hindi and plain English
const P = (q) => core.parse(ncu, q), kinds = (q) => (P(q) || {}).kind;
assert.strictEqual(P("105 to N207").kind, "route"); assert.strictEqual(P("105 to N207").to.id, "new-N207");
assert.strictEqual(P("105 se N207 tak").kind, "route"); assert.strictEqual(P("105 se N207 tak").from.id, "old-105");
assert.strictEqual(P("mujhe 105 se N207 jana hai").to.id, "new-N207");
assert.strictEqual(P("from library to cafe 10").to.id, "cafe-10");
assert.deepStrictEqual([P("nearest washroom").kind, P("nearest washroom").type], ["nearest", "wc"]);
assert.strictEqual(P("sabse paas washroom").type, "wc");
assert.strictEqual(P("washroom kidhar hai").type, "wc");
assert.strictEqual(P("nearest toilet").type, "wc");
assert.strictEqual(P("canteen kahan hai").type, "cafe");
assert.strictEqual(P("paas me canteen").type, "cafe");
assert.strictEqual(P("kanteen kidhar hai").type, "cafe");                  // spelling variant
assert.strictEqual(P("closest libary").type, "library");
assert.strictEqual(P("पास का वॉशरूम").type, "wc");
assert.strictEqual(P("कैंटीन कहाँ है").type, "cafe");
assert.strictEqual(P("library kidhar hai").kind, "place"); assert.strictEqual(P("library kidhar hai").place.id, "old-3-library"); assert.strictEqual(P("library kidhar hai").go, false);
assert.strictEqual(P("library jana hai").go, true);
assert.strictEqual(P("take me to cafe 10").place.id, "cafe-10"); assert.strictEqual(P("take me to cafe 10").go, true);
assert.strictEqual(P("where is the medical room").place.id, "old-002");
assert.strictEqual(P("doctor kahan hai").place.id, "old-002");              // alias
assert.strictEqual(P("main gate kahan hai").place.id, "gate");              // "main" is not a filler
assert.strictEqual(P("sharma sir kahan hain").kind, "faculty");
assert(/mehta/i.test(P("where is dr mehta").faculty.name));
assert.strictEqual(P("where is dr mehta").place, null);                        // no cabin on the map yet
assert.strictEqual(kinds("koi khali classroom"), "free"); assert.strictEqual(kinds("free rooms"), "free"); assert.strictEqual(kinds("खाली कमरा"), "free");
assert.strictEqual(kinds("ab nikalna padega"), "leave"); assert.strictEqual(kinds("next class"), "leave"); assert.strictEqual(kinds("अब निकलना है"), "leave");
// plain searches stay plain searches
["library", "n201", "cafe", "lab", "sharma", "105", "washroom"].forEach((q) => assert.strictEqual(P(q), null, q));
assert.strictEqual(P(""), null); assert.strictEqual(P("   "), null); assert.strictEqual(P("zzzz qqq"), null);

// every step carries a key so the interface can translate it
const rr = core.route(ncu, "old-105", "new-N207");
assert(rr.steps.every((x) => x.k), "steps need keys");
assert.deepStrictEqual(Array.from(new Set(rr.steps.map((x) => x.k))).sort(), ["arrive", "bridge", "level", "start", "turn", "walk"].filter((k) => rr.steps.some((x) => x.k === k)).sort());

// bad file gives a readable error
assert.throws(() => core.build({ id: "x" }), /Campus file problem/);
console.log("\nALL TESTS PASSED");
