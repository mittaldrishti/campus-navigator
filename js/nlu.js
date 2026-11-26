/* Understands how students actually type or speak: English, Hinglish and Hindi.
     "library kidhar hai"          where is the library
     "105 se N207 tak"             directions between two rooms
     "sabse paas washroom"         nearest washroom
     "Sharma sir kahan hain"       where is a teacher right now
     "koi khali classroom"         free rooms
     "ab nikalna padega"           time to leave for the next class
   parse() returns an intent, or null when the text is just a plain search. */
(function (root) {
  "use strict";
  var C = root.NavCore || (typeof require !== "undefined" ? require("./core.js") : null);

  var TYPE_WORDS = {
    wc: "washroom washrooms toilet toilets restroom bathroom loo wc lavatory shauchalay शौचालय टॉयलेट वॉशरूम वाशरूम बाथरूम",
    cafe: "cafe canteen cafeteria kanteen cantin food khana khaana chai coffee nashta snacks कैंटीन कैफे खाना चाय कॉफी नाश्ता",
    library: "library libary lib kitab books pustakalaya लाइब्रेरी पुस्तकालय किताब",
    medical: "medical doctor nurse dawai dawa dispensary clinic hospital मेडिकल डॉक्टर दवाई दवा अस्पताल",
    lab: "lab labs laboratory लैब प्रयोगशाला",
    parking: "parking gaadi gadi पार्किंग गाड़ी",
    auditorium: "auditorium hall ऑडिटोरियम सभागार हॉल",
    sports: "sports khel खेल",
    lift: "lift elevator लिफ्ट",
    office: "office दफ्तर ऑफिस",
    hostel: "hostel हॉस्टल",
    gate: "gate गेट",
    room: "classroom classrooms kaksha कक्षा क्लासरूम"
  };
  var WORD_TYPE = {};
  Object.keys(TYPE_WORDS).forEach(function (t) { TYPE_WORDS[t].split(" ").forEach(function (w) { WORD_TYPE[w] = t; }); });

  function set(s) { var o = {}; s.split(" ").forEach(function (w) { o[w] = 1; }); return o; }
  var WHERE = set("kahan kaha kahaan kidhar kidhr kdr where whr कहाँ कहां कहा किधर hai hain he ho is are है हैं");
  var GO = set("jana jaana jaanaa jaao jao jaun jau chalo chalna chaliye ja rasta raasta raste route directions direction path way navigate take kaise kese kaisa how get go जाना जाओ चलो चलें रास्ता रूट कैसे ले");
  var SOFT = set("ka ki ke ko ek mein me mai mujhe muje mereko mujhko batao bata bataiye bataao do dikhao dikha dena le lo show find i need want please plz pls kripya wala wali wale the a an of at to from tak तक का की के को में मुझे बताओ बताइए दिखाओ दो");
  var HONOR = set("sir madam mam maam dr prof professor mr mrs ms miss ji सर मैडम डॉ प्रोफेसर जी");
  var NEAR = set("nearest closest nearby near paas pass nazdeek nazdik najdik nazdiki sabse पास नज़दीक नजदीक सबसे");
  var FREE = set("free khali khaali empty vacant available खाली खली");
  var ROOMW = set("room rooms class classroom classrooms kamra kamre kaksha कमरा कमरे रूम क्लास कक्षा");

  function tokens(q) { return String(q || "").toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}\p{M}']+/u).filter(Boolean).map(function (t) { return t.replace(/'/g, ""); }); }

  function lev1(a, b) {                                  // edit distance of at most one
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, miss = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++miss > 1) return false;
      if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
    }
    return miss + (a.length - i) + (b.length - j) <= 1;
  }
  function typeOf(c, w) {
    if (WORD_TYPE[w]) return WORD_TYPE[w];
    var found = null;
    if (w.length >= 5) Object.keys(WORD_TYPE).forEach(function (k) { if (!found && k.length >= 5 && /^[a-z]+$/.test(k) && lev1(w, k)) found = WORD_TYPE[k]; });
    if (!found) Object.keys(C.TYPES).forEach(function (t) { if (!found && (t === w || C.norm(C.TYPES[t].label) === w || C.norm(C.TYPES[t].plural) === w)) found = t; });
    return found && c.placeList.some(function (p) { return p.type === found; }) ? found : null;
  }
  function find(c, words) {
    var text = words.join(" ");
    if (!text) return null;
    var hits = C.search(c, text, 4);
    for (var i = 0; i < hits.length; i++) if (hits[i].kind === "place" || hits[i].kind === "faculty") return hits[i];
    return null;
  }

  function parse(c, query) {
    var raw = tokens(query);
    if (!raw.length) return null;
    var joined = raw.join(" ");

    // time to leave
    if (/nikal|निकल|next class|agli class|अगली क्लास|time to leave|when (do|should) i leave|class kab|क्लास कब/.test(joined)) return { kind: "leave" };

    // free rooms
    if (raw.some(function (w) { return FREE[w]; }) && raw.some(function (w) { return ROOMW[w]; })) return { kind: "free" };

    // two places: "A to B", "A se B tak"
    var sep = -1, i;
    for (i = 0; i < raw.length; i++) if (raw[i] === "to" || raw[i] === "se" || raw[i] === "से") { sep = i; break; }
    var clean = function (ws) { return ws.filter(function (w) { return !SOFT[w] && !WHERE[w] && !GO[w] && !HONOR[w]; }); };
    if (sep > 0) {
      var A = clean(raw.slice(0, sep)), B = clean(raw.slice(sep + 1));
      if (A.length && B.length) {
        var a = find(c, A), b = find(c, B);
        if (a && b && a.place.id !== b.place.id) return { kind: "route", from: a.place, to: b.place };
      }
    }

    // nearest of a kind
    var nearWord = raw.some(function (w) { return NEAR[w]; });
    var rest = raw.filter(function (w) { return !NEAR[w] && !SOFT[w] && !WHERE[w] && !GO[w]; });
    var asks = raw.some(function (w) { return WHERE[w]; });
    if (rest.length === 1) {
      var t = typeOf(c, rest[0]);
      var count = t ? c.placeList.filter(function (p) { return p.type === t; }).length : 0;
      if (t && (nearWord || (asks && count > 1))) return { kind: "nearest", type: t };
    }
    if (rest.length === 2 && nearWord) {                  // "nearest common room"
      var t2 = typeOf(c, rest.join(" ")) || typeOf(c, rest[1]) || typeOf(c, rest[0]);
      if (t2) return { kind: "nearest", type: t2 };
    }

    // one place or one teacher
    var removed = raw.length - rest.length, hadHonor = raw.some(function (w) { return HONOR[w]; });
    var words = rest.filter(function (w) { return !HONOR[w]; });
    if (!words.length) return null;
    var hit = find(c, words);
    if (!hit) return null;
    if (hit.kind === "faculty" && (removed || hadHonor)) return { kind: "faculty", faculty: hit.faculty, place: hit.place };
    if (hit.kind === "faculty" || !removed) return null;
    var go = raw.some(function (w) { return GO[w]; });
    return { kind: "place", place: hit.place, go: go };
  }

  Object.assign(C, { parse: parse, TYPE_WORDS: TYPE_WORDS, tokens: tokens });
})(typeof window !== "undefined" ? window : globalThis);
