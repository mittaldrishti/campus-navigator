// Run: node tools/test_i18n.js   Every string the interface shows through tr() must have a Hindi version.
const fs = require("fs"), path = require("path"), assert = require("assert");
require("../js/i18n.js");
const HI = NavI18n.tables.hi, app = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const keys = new Set();
for (const m of app.matchAll(/\btr\("((?:[^"\\]|\\.)*)"/g)) keys.add(m[1].replace(/\\"/g, '"'));
// strings that reach tr() through variables
const core = require("../js/core.js");
Object.values(core.TYPES).forEach((t) => { keys.add(t.label); keys.add(t.plural); });
["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "left", "right", "around",
 "All", "In cabin", "Teaching", "Any time left", "At least 10 min", "At least 20 min", "At least 30 min", "At least 1 hour", "At least 2 hours", "50 min", "1 hour", "1.5 hours", "2 hours", "3 hours",
 "Explore", "Route", "Free now", "Classes", "Events", "Saved", "Manage", "Take {what} up to the {fl}", "Take {what} down to the {fl}", "Walk {d} along the walkway", "Walk {d} along the corridor",
 "Turn left", "Turn right", "Turn around"].forEach((k) => keys.add(k));
for (const id of ["ncu", "greenfield"]) for (const l of require("../data/" + id + ".json").layers) { keys.add(l.name); }
const skip = new Set(["G", "1", "2", "3", "4", "Campus", "Ground", "Greenfield"]);
const missing = [...keys].filter((k) => !skip.has(k) && !HI[k] && !/^[A-Z][a-z]+( [A-Z][a-z]+)?$/.test(k) || (!HI[k] && /Floor$/.test(k)));
assert.deepStrictEqual(missing.filter((k) => !skip.has(k)), [], "Missing Hindi: " + JSON.stringify(missing, null, 1));
// placeholders survive translation
for (const [k, v] of Object.entries(HI)) {
  const a = (k.match(/\{\w+\}/g) || []).sort().join(), b = (v.match(/\{\w+\}/g) || []).sort().join();
  assert.strictEqual(a, b, "placeholders differ for: " + k);
}
NavI18n.setLang("hi");
assert.strictEqual(NavI18n.tr("{n} min", { n: 5 }), "5 मिनट");
assert.strictEqual(NavI18n.tr("not translated {x}", { x: 1 }), "not translated 1");
NavI18n.setLang("en");
assert.strictEqual(NavI18n.tr("{n} min", { n: 5 }), "5 min");
console.log("I18N OK:", keys.size, "strings,", Object.keys(HI).length, "Hindi entries");
