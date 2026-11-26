"""Turn the three aSc Timetables PDFs into tools/tt/real_timetable.json.
Run: python3 tools/tt/build.py <room-wise.pdf> <class-wise.pdf> <faculty-wise.pdf>
Room-wise gives every class in every room (all departments, faculty by short name).
Faculty-wise (CSE) gives full names plus lab rooms that the room-wise file does not list.
Class-wise legends give subject names and more full names."""
import sys, re, json, subprocess, collections
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import pdfgrid

PERIODS = {i + 1: (8 * 60 + 30 + 60 * i, 8 * 60 + 30 + 60 * i + 50) for i in range(8)}
CODE = re.compile(r"^[A-Z]{2,6}\d{2,4}[A-Z]{0,2}\.?$")
hm = lambda m: f"{m // 60:02d}:{m % 60:02d}"

def title_re(t):
    m = re.match(r"^(.*?)\s*\((\w+)\)\s*\w*$", t.strip())
    return m or re.match(r"^(.*?)()$", t.strip())

def short_of(tokens):
    out = ""
    for t in tokens:
        out += t if (not out or t.startswith(".")) else " " + t
    return out.strip()

LOCAL = re.compile(r"^(RN|N|CN) \d{3}\b")

# Labs that are not in the main building: the non-CSE, non-electrical ones are placed on the two lab blocks of the map
LAB_BLOCKS = {"BME LAB": "labs-north", "BIO CHEM LAB": "labs-north", "PHY LAB 1": "labs-south", "PHY LAB 2": "labs-south"}

def room_id(title):
    t = re.sub(r"\s+", " ", title.replace("Gurugram", "")).strip()
    if t in LAB_BLOCKS: return LAB_BLOCKS[t], t
    m = re.match(r"^RN (\d{3})\b", t)
    if m: return "old-" + m.group(1), t
    m = re.match(r"^N ?(\d{3})\b", t)
    if m: return "new-N" + m.group(1), t
    return None, t

def parse_entry(lines):
    """Lines of one cell -> list of entries (code, faculty, qualifier, classes)."""
    out, cur = [], None
    for ln in lines:
        ln = [t[0] for t in ln]
        txt = " ".join(ln)
        first = ln[0].rstrip(".")
        if CODE.match(ln[0]):
            m = re.match(r"^(\S+?)\.?\s+(.*?)\s*(\((?:Group|Section)[^)]*\))?$", txt)
            cur = dict(code=ln[0].rstrip("."), faculty=(m.group(2) if m else "").strip(), qual=(m.group(3) or "") if m else "", cls=[])
            out.append(cur)
        elif re.search(r"\s(" + "|".join([r"[A-Z]{2,6}\d{2,4}[A-Z]{0,2}"]) + r")$", txt) and "(" in txt and cur is None:
            m = re.match(r"^(.*?)(\((?:Group|Section)[^)]*\))\s+(\S+)$", txt)           # "Lavanya.M(Section-B) CLL200"
            cur = dict(code=m.group(3), faculty=m.group(1).strip(), qual=m.group(2), cls=[]); out.append(cur)
        elif cur is None and re.match(r"^[A-Z().\-/a-z0-9]+/?$", txt) and "." not in txt.split("/")[0][:3]:
            cur = None; out.append(dict(code="", faculty="", qual="", cls=[txt], pending=True)); cur = out[-1]
        elif cur is not None:
            cur["cls"].append(txt)
        else:
            out.append(dict(code="", faculty="", qual="", cls=[txt])); cur = out[-1]
    # a cell that starts with a class line and carries the code later: merge "pending" with the next entry
    if len(out) == 2 and out[0].get("pending") and out[1]["code"]:
        out[1]["cls"] = out[0]["cls"] + out[1]["cls"]; out = out[1:]
    return out

def classes(cl):
    s = " ".join(cl).replace("/ ", "/")
    return sorted({x.strip() for x in s.split("/") if x.strip() and x.strip() != "Entire class"})

def main(room_pdf, class_pdf, fac_pdf, out):
    room = pdfgrid.read(room_pdf)
    fac = pdfgrid.read(fac_pdf)
    # ---- legends: subject names and short -> full names
    txt = subprocess.run(["pdftotext", "-layout", class_pdf, "-"], capture_output=True, text=True).stdout + \
          subprocess.run(["pdftotext", "-layout", fac_pdf, "-"], capture_output=True, text=True).stdout
    subjects = {}
    for m in re.finditer(r"\b([A-Z]{2,6}\d{2,4}[A-Z]{0,2})\s+\1 ((?:[^\s]+ ?)+?)(?=\s{2,}|$)", txt, re.M):
        subjects.setdefault(m.group(1), m.group(2).strip())
    names = {}
    for m in re.finditer(r"(?:^|\s{2,})([A-Z][\w'.]*(?: [A-Z][\w'.]*)?)\s{3,}((?:[A-Za-z'.]+ )*[A-Za-z'.]+)\s?\((\w+)\)", txt, re.M):
        names.setdefault(m.group(1), (m.group(2).strip(), m.group(3)))
    # faculty pages: title is the full name, cells carry the short name
    for p in fac:
        mm = title_re(p["title"])
        for c in p["cells"]:
            for ln in c["lines"]:
                if len(ln) >= 3 and ln[0][0] == "Entire":
                    sh = short_of([t[0] for t in ln[2:]])
                    if sh: names.setdefault(sh, (mm.group(1).strip(), mm.group(2)))
    slots, unplaced = collections.OrderedDict(), collections.Counter()
    def add(place, room_txt, day, p0, p1, code, fac_short, qual, cls):
        s, e = PERIODS[p0][0], PERIODS[p1][1]
        key = (place or room_txt, day, s, e, code, fac_short, qual)
        if key in slots:
            slots[key]["cls"] = sorted(set(slots[key]["cls"]) | set(cls)); return
        slots[key] = dict(place=place, room=room_txt, day=day, start=hm(s), end=hm(e), code=code, faculty_short=fac_short, qual=qual, cls=list(cls))
    rooms_seen = set()
    for p in room:
        pid, rtxt = room_id(p["title"])
        rooms_seen.add(rtxt)
        for c in p["cells"]:
            if c["day"] > 5: continue
            for e in parse_entry(c["lines"]):
                if not e["code"] and not e["cls"]: continue
                if e["code"] == "OE" or not e["code"]:
                    e["code"] = e["code"] or "OE"
                add(pid, rtxt, c["day"] + 1, c["p0"], c["p1"], e["code"], e["faculty"], e["qual"], classes(e["cls"]))
    have = {(k[5], k[1], k[2], k[3], k[4]) for k in slots}             # faculty, day, start, end, code from room-wise
    # ---- faculty pages: lab rooms and anything the room-wise file lacks
    for p in fac:
        mm = title_re(p["title"])
        for c in p["cells"]:
            if c["day"] > 5: continue
            c = dict(c, lines=[[t[0] for t in ln] for ln in c["lines"]])
            if len(c["lines"][0]) < 2 or not CODE.match(c["lines"][0][0]): continue
            l0 = c["lines"][0]; code = l0[0].rstrip("."); rtxt = " ".join(t[0] for t in l0[1:]).strip()
            pid, rt = room_id(rtxt)
            if rt in rooms_seen or not LOCAL.match(rt): continue
            short = next((short_of(ln[2:]) for ln in c["lines"] if len(ln) >= 3 and ln[0] == "Entire"), "")
            if not short:
                short = next((k for k, v in names.items() if v[0] == mm.group(1).strip()), mm.group(1).strip())
            if (short, c["day"] + 1, PERIODS[c["p0"]][0], PERIODS[c["p1"]][1], code) in have: continue
            add(pid, rt, c["day"] + 1, c["p0"], c["p1"], code, short, "", classes([" ".join(x) for x in c["lines"][1:2]]))
    # ---- merge the same class over several days
    merged = collections.OrderedDict()
    for s in slots.values():
        k = (s["place"], s["room"], s["start"], s["end"], s["code"], s["faculty_short"], s["qual"], tuple(s["cls"]))
        if k in merged: merged[k]["days"].append(s["day"])
        else: merged[k] = dict(s, days=[s["day"]])
    def pretty(sh):                                   # "Vipin.Y" -> "Vipin Y."
        parts = [x for x in sh.split(".") if x]
        return parts[0] + (" " + ". ".join(parts[1:]) + "." if len(parts) > 1 else "") if parts else sh
    # Two teachers can share one short name ("Shruti.S" in CSE and in Psychology). If merging every
    # "Shruti.S" into one person double-books them, only the classes the CSE files cover keep the full name.
    cse_classes = {x for p in pdfgrid.read(class_pdf) for x in [p["title"]]}
    booked = collections.defaultdict(list)
    for s in merged.values():
        for d in s["days"]: booked[(s["faculty_short"], d)].append((s["start"], s["end"]))
    clash = set()
    for (sh, d), L in booked.items():
        L.sort()
        if any(b[0] < a[1] for a, b in zip(L, L[1:])): clash.add(sh)
    print("shared short names:", sorted(clash))
    out_slots = []
    for s in merged.values():
        sh = s["faculty_short"]
        known = sh in names and (sh not in clash or any(c.strip().split(" ")[0] in cse_classes for c in s["cls"]))
        full = names[sh][0] if known else pretty(sh)
        sub = subjects.get(s["code"], s["code"])
        out_slots.append(dict(place=s["place"], room=s["room"], days=sorted(s["days"]), start=s["start"], end=s["end"], code=s["code"],
                              subject=sub, faculty=full, cls=", ".join(s["cls"]) + (" " + s["qual"] if s["qual"] else "")))
    people = collections.OrderedDict()
    for s in out_slots:
        if s["faculty"]:
            dept = next((v[1] for v in names.values() if v[0] == s["faculty"]), "")
            people.setdefault(s["faculty"], dict(name=s["faculty"], dept=dept))
    json.dump(dict(slots=out_slots, faculty=list(people.values()), subjects=subjects), open(out, "w"), indent=1)
    placed = sum(1 for s in out_slots if s["place"]); print("slots", len(out_slots), "placed", placed, "faculty", len(people), "subjects", len(subjects))
    print("unmapped rooms:", sorted({s["room"] for s in out_slots if not s["place"]}))

if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], a[1], a[2], a[3] if len(a) > 3 else __file__.rsplit("/", 1)[0] + "/real_timetable.json")
