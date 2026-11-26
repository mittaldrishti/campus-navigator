"""Generates campus data packages for the navigator.

Every campus is plain data: layers (outdoor + one per floor), places, a walkable
graph (nodes + edges), faculty and events. The website never hardcodes a campus;
it renders whatever package it is given.

Run:  python3 tools/gen_data.py     (writes data/*.js and data/*.json)
"""
import json, os

DEPTH, CORR = 100, 46
FLOOR_NAMES = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor"]
FLOOR_SHORT = ["G", "1", "2", "3", "4"]


class Campus:
    def __init__(self, cid, name, short, tagline, accent=None):
        self.d = dict(id=cid, name=name, shortName=short, tagline=tagline, version=1,
                      layers=[], buildings=[], places=[], nodes=[], edges=[], connectors=[],
                      faculty=[], events=[])
        if accent:
            self.d["accent"] = accent
        self.ids = set()
        self.bridge_ends = {}

    def node(self, nid, layer, x, y):
        assert nid not in self.ids, nid
        self.ids.add(nid)
        self.d["nodes"].append(dict(id=nid, layer=layer, x=round(x, 1), y=round(y, 1)))
        return nid

    def edge(self, a, b, kind="walk", conn=None):
        e = dict(a=a, b=b, kind=kind)
        if conn:
            e["conn"] = conn
        self.d["edges"].append(e)

    def place(self, **p):
        assert p["id"] not in self.ids, p["id"]
        self.ids.add(p["id"])
        self.d["places"].append(p)
        return p

    # ---------- outdoor ----------
    def outdoor(self, width, height, walkway_y, items, gate_x, mpu=0.12, trees=()):
        """items: dicts with id,name,type,x,y,w,h and optional building/shape/desc/door_x."""
        L = "outdoor"
        shapes = [dict(kind="road", x=40, y=walkway_y - 25, w=width - 80, h=50),
                  dict(kind="road", x=gate_x - 25, y=walkway_y, w=50, h=height - walkway_y)]
        shapes += [dict(kind="tree", x=x, y=y) for x, y in trees]
        self.d["layers"].append(dict(id=L, name="Campus", short="Campus", kind="outdoor",
                                     width=width, height=height, mpu=mpu, shapes=shapes))
        walk = []
        for it in items:
            above = it["y"] + it["h"] <= walkway_y
            dx = it.pop("door_x", it["x"] + it["w"] / 2)
            dy = it["y"] + it["h"] if above else it["y"]
            n_door = self.node(f"n-{it['id']}", L, dx, dy)
            n_walk = self.node(f"n-{it['id']}-w", L, dx, walkway_y)
            self.edge(n_door, n_walk)
            walk.append((dx, n_walk))
            shapes.append(dict(kind="road", x=dx - 18, y=min(dy, walkway_y), w=36, h=abs(dy - walkway_y)))
            self.place(layer=L, node=n_door, door=[dx, dy], **it)
        g = self.node("n-gate", L, gate_x, height - 48)
        gw = self.node("n-gate-w", L, gate_x, walkway_y)
        self.edge(g, gw)
        walk.append((gate_x, gw))
        self.place(id="gate", name="Main Gate", label="Gate", type="gate", layer=L, node=g,
                   x=gate_x - 80, y=height - 48, w=160, h=48, door=[gate_x, height - 48],
                   desc="Main entry to the campus.")
        walk.sort()
        for (_, a), (_, b) in zip(walk, walk[1:]):
            self.edge(a, b)

    # ---------- free-form outdoor (drawn from a site sketch) ----------
    def site(self, width, height, mpu, trees=()):
        self.wps = {}
        self.osh = [dict(kind="tree", x=x, y=y) for x, y in trees]   # callers may add a "void" to cut the plate
        self.d["layers"].append(dict(id="outdoor", name="Campus", short="Campus", kind="outdoor",
                                     width=width, height=height, mpu=mpu, shapes=self.osh))

    def wp(self, name, x, y):
        """A waypoint on a path."""
        self.wps[name] = (x, y)
        return self.node(f"w-{name}", "outdoor", x, y)

    def road(self, names, w=50):
        """Connects waypoints in order and draws the path (paths must be horizontal or vertical)."""
        for a, b in zip(names, names[1:]):
            (x1, y1), (x2, y2) = self.wps[a], self.wps[b]
            self.edge(f"w-{a}", f"w-{b}")
            self.osh.append(dict(kind="road", x=min(x1, x2) - w / 2, y=min(y1, y2) - w / 2,
                                 w=abs(x2 - x1) + w, h=abs(y2 - y1) + w))

    def gate_node(self, nid, x, y, via, w=34):
        """A door on the outside of a building, joined to a waypoint."""
        self.node(nid, "outdoor", x, y)
        vx, vy = self.wps[via]
        self.edge(nid, f"w-{via}")
        self.osh.append(dict(kind="road", x=min(x, vx) - w / 2, y=min(y, vy) - w / 2, w=abs(vx - x) + w, h=abs(vy - y) + w))

    def spot(self, via, **it):
        """A place with one door at (door_x, door_y), joined to waypoint `via`."""
        dx, dy = it.pop("door")
        nid = f"n-{it['id']}"
        self.gate_node(nid, dx, dy, via)
        return self.place(layer="outdoor", node=nid, door=[dx, dy], **it)

    # ---------- buildings ----------
    def building(self, bid, name, short, floors, nx, ny, sx, sy=100, gates=None, side_lifts=None):
        """A rectangular block: rooms around the outside, a corridor ring inside them
        and an open courtyard in the middle. Corners hold the stairs and the lift.

        floors: one entry per level, each a list of four sides in clockwise order
        (top left-to-right, right top-to-bottom, bottom right-to-left, left bottom-to-top).
        A side is a list of (label, span, type[, extra dict]); spans on a side must add
        up to nx (top/bottom) or ny (left/right). Needs an outdoor place with id == bid.
        gates: [(corner, side, outdoor door node id, name)]; default is one gate at the bottom-left corner.
        side_lifts: [(connector key, side, name)]: lifts that sit in the middle of the left or right corridor
        instead of in the bottom-right corner (that corner then stays a plain corridor corner).
        A floor may also be a dict (see hall_floor) for a layout that is not a ring around a courtyard."""
        gates = gates or [("stairsA", "bottom", f"n-{bid}", f"{name} Entrance")]
        gate_at = {g[0]: (k, g) for k, g in enumerate(gates)}
        b = dict(id=bid, name=name, short=short, floors=[])
        self.d["buildings"].append(b)
        W, H = 2 * DEPTH + nx * sx, 2 * DEPTH + ny * sy
        c0, cx1, cy1 = DEPTH + CORR / 2, W - DEPTH - CORR / 2, H - DEPTH - CORR / 2   # corridor centre lines
        corners = [("stairsC", "stairs", "Stairs C", 0, 0, c0, c0),
                   ("stairsB", "stairs", "Stairs B", W - DEPTH, 0, cx1, c0),
                   ("lift", "lift", "Lift", W - DEPTH, H - DEPTH, cx1, cy1),
                   ("stairsA", "stairs", "Stairs A", 0, H - DEPTH, c0, cy1)]
        side_lifts = side_lifts or []
        plain = {"lift"} if side_lifts else set()                # corners that hold no stair or lift
        for key, kind, label, *_ in corners:
            if key not in plain:
                self.d["connectors"].append(dict(id=f"{bid}-{key}", name=label, building=bid, kind=kind))
        for key, side, label in side_lifts:
            self.d["connectors"].append(dict(id=f"{bid}-{key}", name=label, building=bid, kind="lift"))
        prev = {}
        for lvl, sides in enumerate(floors):
            L = f"{bid}-{lvl}"
            b["floors"].append(L)
            if isinstance(sides, dict):
                self.hall_floor(bid, lvl, L, W, H, sides, prev)
                continue
            inner = DEPTH + CORR
            shapes = [dict(kind="corridor", x=DEPTH, y=DEPTH, w=W - 2 * DEPTH, h=H - 2 * DEPTH),
                      dict(kind="court", x=inner, y=inner, w=W - 2 * inner, h=H - 2 * inner)]
            self.d["layers"].append(dict(id=L, name=FLOOR_NAMES[lvl], short=FLOOR_SHORT[lvl], kind="floor",
                                         building=bid, level=lvl, width=W, height=H, mpu=0.06, shapes=shapes))
            ring = {"top": [], "right": [], "bottom": [], "left": []}
            cnode = {}
            for key, kind, label, x, y, rx, ry in corners:
                turn = self.node(f"{L}-c-{key}", L, rx, ry)                      # corridor corner
                n = self.node(f"{L}-n{key}", L, x + DEPTH / 2, y + DEPTH / 2)   # inside the stair or lift cell
                self.edge(n, turn)
                cnode[key] = turn
                slug = label.lower().replace(" ", "-")
                if key not in plain:
                    self.place(id=f"{L}-{slug}", name=label, label=label, type=kind, layer=L, node=n,
                               x=x, y=y, w=DEPTH, h=DEPTH, door=[x + DEPTH / 2, y + DEPTH / 2])
                    if key in prev:
                        self.edge(prev[key], n, kind, f"{bid}-{key}")
                    prev[key] = n
                if lvl == 0 and key in gate_at:
                    k, (_, gside, door_node, gname) = gate_at[key]
                    ex, ey = x + DEPTH / 2, (H if gside == "bottom" else 0)
                    nE = self.node(f"{L}-entry{k or ''}", L, ex, ey)
                    self.edge(n, nE)
                    self.edge(nE, door_node, "door")
                    self.place(id=f"{bid}-entrance" + (f"-{k + 1}" if k else ""), name=gname, label="Entry", type="entrance",
                               layer=L, node=nE, x=ex - 34, y=(H - 12 if gside == "bottom" else -14), w=68, h=26, door=[ex, ey])
            for key, side, label in side_lifts:                      # a lift in the middle of the left or right corridor
                lx, ly = (c0 if side == "left" else cx1), H / 2
                n = self.node(f"{L}-n-{key}", L, lx, ly)
                self.place(id=f"{L}-{key}", name=label, label=label, type="lift", layer=L, node=n, x=lx - 20, y=ly - 20, w=40, h=40, door=[lx, ly])
                ring[side].append((ly, n))
                if key in prev:
                    self.edge(prev[key], n, "lift", f"{bid}-{key}")
                prev[key] = n
            wc = 0
            for side, row in zip(("top", "right", "bottom", "left"), sides):
                need = nx if side in ("top", "bottom") else ny
                assert sum(i[1] for i in row) == need, f"{L} {side}: spans must add up to {need}"
                pos = 0
                for label, span, typ, *rest in row:
                    extra = dict(rest[0]) if rest else {}
                    if side == "top":
                        x, y, w, h = DEPTH + pos * sx, 0, span * sx, DEPTH
                        door, at, key = [x + w / 2, DEPTH], (x + w / 2, c0), x + w / 2
                    elif side == "right":
                        x, y, w, h = W - DEPTH, DEPTH + pos * sy, DEPTH, span * sy
                        door, at, key = [W - DEPTH, y + h / 2], (cx1, y + h / 2), y + h / 2
                    elif side == "bottom":
                        x, y, w, h = W - DEPTH - (pos + span) * sx, H - DEPTH, span * sx, DEPTH
                        door, at, key = [x + w / 2, H - DEPTH], (x + w / 2, cy1), x + w / 2
                    else:
                        x, y, w, h = 0, H - DEPTH - (pos + span) * sy, DEPTH, span * sy
                        door, at, key = [DEPTH, y + h / 2], (c0, y + h / 2), y + h / 2
                    pos += span
                    if typ == "room":
                        pid, number = f"{bid}-{label}", label
                        pname = extra.pop("name", f"Room {label}")
                    else:
                        number = extra.pop("number", None)
                        if typ == "wc":
                            wc += 1
                        slug = label.lower().replace(" ", "-").replace("'", "")
                        pid = f"{bid}-{number}" if number else f"{L}-{slug}" + (f"-{wc}" if typ == "wc" else "")
                        pname = extra.pop("name", label)
                    nid = self.node(f"n-{pid}", L, *at)
                    ring[side].append((key, nid))
                    if typ == "bridge":                       # a passage through the outer wall
                        mx, my = x + w / 2, y + h / 2
                        ox, oy, br = {"right": (W, my, dict(x=W, y=my - 30, w=70, h=60)),
                                      "left": (0, my, dict(x=-70, y=my - 30, w=70, h=60)),
                                      "top": (mx, 0, dict(x=mx - 30, y=-70, w=60, h=70)),
                                      "bottom": (mx, H, dict(x=mx - 30, y=H, w=60, h=70))}[side]
                        out = self.node(f"{L}-bridge-out", L, ox, oy)
                        self.edge(nid, out)
                        self.bridge_ends[(bid, lvl)] = out
                        shapes.append(dict(kind="bridge", **br))
                    p = dict(id=pid, name=pname, label=number or label, type=typ, layer=L, node=nid, x=x, y=y, w=w, h=h, door=door)
                    if number:
                        p["number"] = number
                    p.update(extra)
                    self.place(**p)
            # walk the corridor ring: corner, rooms along the side, next corner
            order = [("top", "stairsC", "stairsB"), ("right", "stairsB", "lift"), ("bottom", "stairsA", "lift"), ("left", "stairsC", "stairsA")]
            for side, a, z in order:
                chain = [cnode[a]] + [n for _, n in sorted(ring[side])] + [cnode[z]]
                for u, v in zip(chain, chain[1:]):
                    self.edge(u, v)

    def hall_floor(self, bid, lvl, L, W, H, spec, prev):
        """A floor drawn from a sketch: a block of rooms in a hall with corridors around it.
        spec: shapes, cells (stairs, lifts, rooms, washrooms as dicts with x,y,w,h,door,at), nodes {name: (x, y)},
        chains [[node names]] walked in order, and an optional bridge."""
        b = self.d["buildings"][-1]
        shapes = list(spec["shapes"])
        self.d["layers"].append(dict(id=L, name=FLOOR_NAMES[lvl], short=FLOOR_SHORT[lvl], kind="floor",
                                     building=bid, level=lvl, width=W, height=H, mpu=0.06, shapes=shapes))
        N = {name: self.node(f"{L}-h-{name}", L, *xy) for name, xy in spec["nodes"].items()}
        for chain in spec["chains"]:
            for u, v in zip(chain, chain[1:]):
                self.edge(N[u], N[v])
        wc = 0
        for cell in spec["cells"]:
            kind = cell["type"]
            at = N[cell["at"]]
            if cell.get("conn"):                                         # stairs or lift: a node inside the cell, linked to the floor below
                n = self.node(f"{L}-n{cell['conn']}", L, cell["x"] + cell["w"] / 2, cell["y"] + cell["h"] / 2)
                self.edge(n, at)
                if cell["conn"] in prev:
                    self.edge(prev[cell["conn"]], n, kind, f"{bid}-{cell['conn']}")
                prev[cell["conn"]] = n
                door = [cell["x"] + cell["w"] / 2, cell["y"] + cell["h"] / 2]
                self.place(id=f"{L}-{cell['label'].lower().replace(' ', '-')}", name=cell["label"], label=cell["label"], type=kind, layer=L, node=n,
                           x=cell["x"], y=cell["y"], w=cell["w"], h=cell["h"], door=door)
                continue
            extra = dict(cell.get("extra", {}))
            if kind == "room":
                pid, number, pname = f"{bid}-{cell['label']}", cell["label"], extra.pop("name", f"Room {cell['label']}")
            else:
                if kind == "wc":
                    wc += 1
                slug = cell["label"].lower().replace(" ", "-")
                number = None
                pid, pname = f"{L}-{slug}" + (f"-{wc}" if kind == "wc" else ""), extra.pop("name", cell["label"])
            p = dict(id=pid, name=pname, label=number or cell["label"], type=kind, layer=L, node=at, x=cell["x"], y=cell["y"], w=cell["w"], h=cell["h"], door=list(cell["door"]))
            if number:
                p["number"] = number
            p.update(extra)
            self.place(**p)
            if kind == "bridge":                                         # passage through the outer wall
                mx = cell["x"] + cell["w"] / 2
                out = self.node(f"{L}-bridge-out", L, mx, H)
                self.edge(at, out)
                self.bridge_ends[(bid, lvl)] = out
                shapes.append(dict(kind="bridge", x=mx - 30, y=H, w=60, h=70))

    def link_bridges(self, a, b, metres):
        """Joins two buildings by a bridge on every floor where both have a bridge cell."""
        for (bid, lvl), node in sorted(self.bridge_ends.items()):
            other = self.bridge_ends.get((b, lvl))
            if bid == a and other:
                self.d["edges"].append(dict(a=node, b=other, kind="bridge", m=metres))

    def save(self, outdir):
        d = self.d
        with open(os.path.join(outdir, f"{d['id']}.json"), "w") as f:
            json.dump(d, f, indent=1)
        with open(os.path.join(outdir, f"{d['id']}.js"), "w") as f:
            f.write("window.CAMPUS_DATA = window.CAMPUS_DATA || {};\n")
            f.write(f"window.CAMPUS_DATA[{json.dumps(d['id'])}] = " + json.dumps(d, separators=(",", ":")) + ";\n")
        print(d["id"], "layers", len(d["layers"]), "places", len(d["places"]), "nodes", len(d["nodes"]), "edges", len(d["edges"]))


def rooms(prefix, a, b, pad=0):
    return [(f"{prefix}{i:0{pad}d}", 1, "room") for i in range(a, b + 1)]


# ---------------------------------------------------------------------
# Sample timetable: a believable weekly pattern so the free-room finder,
# faculty status and leave planner have something to work with. Real
# campuses replace this from the Manage tab (CSV import).
# ---------------------------------------------------------------------
import random

GENERIC_SUBJECTS = ["Engineering Mathematics", "Communication Skills", "Environmental Studies", "Data Structures", "Digital Electronics",
                    "Thermodynamics", "Business Law", "Marketing Basics", "Database Systems", "Computer Networks", "Signals and Systems",
                    "Machine Design", "Organisational Behaviour", "Constitutional Law", "Operating Systems", "Engineering Physics",
                    "Financial Accounting", "Linear Algebra", "Software Engineering", "Control Systems"]
DEPT_SUBJECTS = {"Computer Science": ["Data Structures", "Operating Systems", "Database Systems", "Computer Networks", "Algorithms"],
                 "Electronics": ["Digital Electronics", "Signals and Systems", "Analog Circuits"],
                 "Mechanical": ["Thermodynamics", "Machine Design", "Fluid Mechanics"],
                 "Applied Sciences": ["Engineering Physics", "Engineering Mathematics", "Linear Algebra"],
                 "Management": ["Marketing Basics", "Organisational Behaviour", "Financial Accounting"],
                 "Law": ["Constitutional Law", "Business Law"],
                 "Physics": ["Quantum Mechanics", "Classical Mechanics"], "Robotics": ["Robot Kinematics", "Embedded Systems"],
                 "Mathematics": ["Calculus", "Discrete Mathematics", "Probability"]}
EXTRA_NAMES = ["Dr. B. Malik", "Ms. S. Arora", "Mr. D. Khanna", "Dr. J. Bansal", "Ms. R. Saxena", "Mr. A. Tyagi", "Dr. M. Joshi", "Ms. K. Dhawan",
               "Mr. H. Chauhan", "Dr. P. Nair", "Ms. G. Bajaj", "Mr. S. Yadav", "Dr. T. Kaur", "Ms. V. Menon", "Mr. L. Ahuja", "Dr. C. Pillai",
               "Ms. N. Sethi", "Mr. R. Dutta", "Dr. F. Ansari", "Ms. Y. Kohli", "Mr. U. Rawat", "Dr. O. Grover", "Ms. E. Thakur", "Mr. I. Walia",
               "Dr. Z. Hussain", "Ms. A. Bedi", "Mr. P. Sood", "Dr. K. Luthra", "Ms. D. Mittal", "Mr. V. Anand", "Dr. S. Chopra", "Ms. M. Gill",
               "Mr. B. Rathi", "Dr. H. Mehra", "Ms. T. Kumar", "Mr. G. Sinha", "Dr. L. Batra", "Ms. P. Ghosh", "Mr. N. Lamba", "Dr. R. Oberoi"]


def make_timetable(c, seed, periods, skip, cabin_limit=5, chance=0.22):
    """Weekly pattern: each room-period may hold a Mon/Wed/Fri class and a Tue/Thu class.
    No room and no teacher is ever booked twice at the same time."""
    rnd = random.Random(seed)
    cabin = {f["name"]: f["dept"] for f in c.d["faculty"]}
    pool = list(cabin) + EXTRA_NAMES
    busy, load, slots = set(), {}, []
    rooms_ = [p for p in c.d["places"] if p["type"] == "room" and p["id"] not in skip]
    for r in rooms_:
        mine = 0
        for pi, (s, e) in enumerate(periods):
            for pat in ([1, 3, 5], [2, 4]):
                if rnd.random() >= chance:
                    continue
                cands = [f for f in pool if all((f, d, pi) not in busy for d in pat) and load.get(f, 0) < (cabin_limit if f in cabin else 99)]
                f = rnd.choice(cands) if cands else ""
                for d in pat:
                    busy.add((f, d, pi))
                load[f] = load.get(f, 0) + 1
                subj = rnd.choice(DEPT_SUBJECTS.get(cabin.get(f), GENERIC_SUBJECTS))
                slots.append(dict(place=r["id"], days=pat, start=s, end=e, subject=subj, faculty=f))
                mine += 1
        if not mine:                                        # every classroom has at least one booking
            s, e = periods[rnd.randrange(len(periods))]
            slots.append(dict(place=r["id"], days=[2, 4], start=s, end=e, subject=rnd.choice(GENERIC_SUBJECTS), faculty=""))
    return slots


def add_alias(c, pid, words):
    for p in c.d["places"]:
        if p["id"] == pid:
            p["alias"] = words
            return
    raise KeyError(pid)

PERIODS = [("09:00", "09:55"), ("10:00", "10:55"), ("11:00", "11:55"), ("12:00", "12:55"),
           ("14:00", "14:55"), ("15:00", "15:55"), ("16:00", "16:55")]


WC = ("Washroom", 1, "wc")

# =====================================================================
# Campus 1: NCU (dummy layout, real room numbering from the team)
# =====================================================================
c = Campus("ncu", "The NorthCap University", "NCU", "Dummy layout for development. Not to scale.")
c.site(2460, 1500, 0.15, trees=[(70, 80), (70, 330), (70, 560), (70, 800), (70, 1250), (200, 1420), (560, 1420), (900, 1420),
                                (590, 300), (590, 440), (880, 190), (900, 400), (1190, 300), (1190, 560), (1230, 760), (1500, 300),
                                (1700, 200), (1900, 380), (2200, 240), (2300, 700), (1000, 1450), (2000, 1420), (2350, 1420)])
# The row Cafe 10 / parking / labs / lab-lane buildings backs onto the campus wall: the land north-east of it is outside NCU.
sh = c.d["layers"][0]["shapes"]
sh[:] = [t for t in sh if not (t["kind"] == "tree" and ((t["x"] > 1070 and t["y"] < 900) or (t["x"] < 1090 and t["y"] > 1060 and t["x"] > 100)))]
sh.insert(0, dict(kind="void", x=1066, y=-30, w=1500, h=930))
sh.append(dict(kind="bridge", x=305, y=510, w=70, h=90))   # the bridge between the buildings
# paths: top road (Main Gate), right-hand road, plaza, path along the ground, and the lab lane
for n, x, y in [("new", 480, 100), ("gate", 600, 100), ("tr", 1040, 100), ("plaza", 1040, 555), ("park", 1040, 810),
                ("cafe", 1040, 980), ("south", 1040, 1040), ("lane0", 1040, 1150), ("pl-n", 740, 555),
                ("sw", 140, 1040), ("ground", 440, 1040), ("se", 740, 1040)]:
    c.wp(n, x, y)
c.road(["new", "gate", "tr"])
c.wp("c11", 1040, 1072)
c.road(["tr", "plaza", "park", "cafe", "south", "c11", "lane0"])
c.road(["pl-n", "plaza"])
c.wp("amp", 990, 1040)
c.road(["sw", "ground", "se", "amp", "south"])
LANE = [("court", 1230), ("vb", 1450), ("sports", 1585), ("kiosk", 1645), ("labn", 1780), ("labs", 1880), ("end", 2250)]
for n, x in LANE:
    c.wp("l-" + n, x, 1150)
c.road(["lane0"] + ["l-" + n for n, _ in LANE], w=100)
c.gate_node("n-gate", 600, 68, "gate")
c.place(id="gate", name="Main Gate", label="Gate", type="gate", layer="outdoor", node="n-gate",
        x=520, y=20, w=160, h=48, door=[600, 68], desc="Main entry to the campus.")
c.gate_node("n-new", 480, 190, "new")
c.gate_node("n-old", 140, 1000, "sw")
c.gate_node("n-old-2", 740, 600, "pl-n")
c.gate_node("n-old-3", 740, 1000, "se")
c.place(id="old", name="Old Building", label="Old Building", type="building", building="old", layer="outdoor", node="n-old",
        x=120, y=600, w=640, h=400, door=[140, 1000], court=True,
        desc="Ground + 3 floors around a central courtyard. Rooms 001-040, 101-141, 201-239, 301-329. Medical Room, Common Room, Library and labs. A bridge on every floor leads to the New Building.")
c.place(id="new", name="New Building", label="New Building", type="building", building="new", layer="outdoor", node="n-new",
        x=260, y=190, w=240, h=320, door=[480, 190], court=True,
        desc="Ground + 3 floors. Auditorium and Waiting Area on ground, Cafe 1 on first, classrooms N201-N209 and N301-N309. A bridge on every floor leads to the Old Building.")
c.spot("south", id="ground", name="Ground", label="Ground", type="sports", x=120, y=1080, w=940, h=390, door=(440, 1080),
       desc="Main sports ground. Football, cricket and events.")
c.spot("amp", id="amphitheatre", name="Amphitheatre", label="Amphitheatre", type="sports", x=940, y=1110, w=100, h=330, door=(990, 1110),
       desc="Open-air amphitheatre at the east end of the ground.")
c.spot("l-vb", id="parking-labs", name="Parking (lab road)", label="Parking", type="parking", x=1336, y=930, w=150, h=116, door=(1450, 1046),
       desc="Parking next to Cafe 10, along the road to the labs.")
c.spot("c11", id="parking-behind", name="Parking (in front of Cafe 10)", label="Parking", type="parking", x=1090, y=1046, w=396, h=52, door=(1090, 1072),
       desc="Parking on the lab-lane side of Cafe 10. Together with the parking beside it, it forms an L.")
c.spot("cafe", id="cafe-10", name="Cafe 10", label="Cafe 10", type="cafe", x=1090, y=930, w=240, h=110, door=(1090, 980),
       desc="Canteen near the ground. Snacks, meals and beverages.", hours="8:30 am - 6:00 pm")
c.spot("l-court", id="court", name="Court", label="Court", type="sports", x=1080, y=1320, w=300, h=150, door=(1230, 1320),
       desc="Open court next to the lab lane.")
c.spot("l-vb", id="volley-badminton", name="Volleyball and Badminton Court", label="Volley / Badminton", type="sports", x=1400, y=1320, w=100, h=150,
       door=(1450, 1320), desc="Volleyball and badminton courts.")
c.spot("l-sports", id="sports-room", name="Sports Room", label="Sports Room", type="sports", x=1520, y=1320, w=130, h=70, door=(1585, 1320),
       desc="Indoor sports equipment room.")
c.spot("l-labn", id="labs-north", name="Labs (north side)", label="Labs", type="lab", x=1500, y=1010, w=560, h=90, door=(1780, 1100),
       desc="Row of laboratories on the north side of the lab lane.")
c.spot("l-labs", id="labs-south", name="Labs (south side)", label="Labs", type="lab", x=1700, y=1225, w=360, h=80, door=(1880, 1225),
       desc="Row of laboratories on the south side of the lab lane.")
c.spot("l-kiosk", id="nescafe", name="Nescafe", label="Nescafe", type="cafe", x=1630, y=1112, w=30, h=76, door=(1645, 1188),
       desc="Coffee kiosk in the middle of the lab lane.")
c.spot("l-end", id="outdoor-washroom", name="Washroom (lab lane)", label="Washroom", type="wc", x=2300, y=1100, w=100, h=100, door=(2300, 1150),
       desc="Washroom at the end of the lab lane.")

for t, x, y, r in [("Main Road", 800, 100, 0), ("Right Road", 1040, 330, -90), ("Lab Lane", 1400, 1150, 0),
                   ("Ground Path", 330, 1040, 0), ("Plaza Path", 905, 555, 0), ("Bridge", 420, 555, 0)]:
    c.d["layers"][0]["shapes"].append(dict(kind="label", text=t, x=x, y=y, rot=r))
BR_NEW = ("Bridge", 1, "bridge", dict(name="Bridge to New Building", desc="Covered bridge to the New Building on this floor."))
BR_OLD = ("Bridge", 1, "bridge", dict(name="Bridge to Old Building", desc="Covered bridge to the Old Building on this floor."))
WC2 = ("Washroom", 2, "wc")
def N_HALL(lvl):
    """New Building floors 2 and 3, redrawn from the hand sketch: a solid block of eight rooms
    (left N202-N205, right N209-N206, top to bottom) with N201 on top of it, its door on the north side.
    Corridors run down the left and right and along the bottom; the lift is a box at the far left;
    stairs, the waiting area and the GRILL (a railed opening) sit in the open lobby to the north;
    the bridge is at the bottom-left."""
    P = lvl * 100
    rows = [374, 454, 534, 625, 708]
    ycs = [(rows[i] + rows[i + 1]) / 2 for i in range(4)]
    nodes = {"S1": (55, 160), "S2": (145, 160), "LN": (130, 215), "LT": (130, 270), "ND": (373, 270), "RT": (572, 270),
             "WN": (215, 170), "LL": (130, 322), "BL": (130, 754), "BR": (572, 754), "BB": (90, 754)}
    left, right, cells = ["LT", "LL"], ["RT"], []
    for i, y in enumerate(ycs):
        nodes[f"L{i}"], nodes[f"R{i}"] = (130, y), (572, y)
        left.append(f"L{i}"); right.append(f"R{i}")
        cells.append(dict(type="room", label=f"N{P + 2 + i}", x=170, y=rows[i], w=213, h=rows[i + 1] - rows[i], door=[170, y], at=f"L{i}"))
        cells.append(dict(type="room", label=f"N{P + 9 - i}", x=383, y=rows[i], w=162, h=rows[i + 1] - rows[i], door=[545, y], at=f"R{i}"))
    chains = [["S1", "S2", "LN", "LT", "ND", "RT"], left + ["BL"], right + ["BR"], ["BL", "BR"], ["BL", "BB"], ["S2", "WN", "ND"]]
    cells += [dict(type="room", label=f"N{P + 1}", x=263, y=303, w=211, h=71, door=[373, 303], at="ND"),
              dict(type="lift", label="Lift", conn="lift", x=10, y=226, w=80, h=148, at="LL"),
              dict(type="stairs", label="Stairs C", conn="stairsC", x=25, y=30, w=60, h=105, at="S1"),
              dict(type="stairs", label="Stairs B", conn="stairsB", x=118, y=30, w=55, h=105, at="S2"),
              dict(type="waiting", label="Waiting Area", x=190, y=20, w=50, h=134, door=[215, 154], at="WN", extra=dict(name=f"{FLOOR_NAMES[lvl]} Waiting Area", desc=f"Waiting area for the {FLOOR_NAMES[lvl].lower()} of the New Building.")),
              dict(type="bridge", label="Bridge", x=27, y=762, w=126, h=38, door=[90, 800], at="BB",
                   extra=dict(name="Bridge to Old Building", desc="Covered bridge to the Old Building on this floor."))]
    shapes = [dict(kind="corridor", x=90, y=0, w=510, h=300), dict(kind="corridor", x=90, y=300, w=80, h=500),
              dict(kind="corridor", x=545, y=300, w=55, h=500), dict(kind="corridor", x=90, y=708, w=510, h=92),
              dict(kind="grill", x=290, y=11, w=266, h=143)]
    return dict(shapes=shapes, nodes=nodes, chains=chains, cells=cells)

M = dict(number="002", desc="First aid and nurse on duty.", hours="9:00 am - 5:00 pm")
c.building("old", "Old Building", "Old", [
    # ground: 001-040
    [rooms("", 1, 1, 3) + [("Medical Room", 1, "medical", M)] + rooms("", 3, 4, 3) + [BR_NEW] + rooms("", 5, 13, 3), rooms("", 14, 21, 3),
     rooms("", 22, 35, 3), rooms("", 36, 40, 3) + [WC, WC2]],
    # first: 101-141
    [[("Common Room", 1, "common", dict(number="101", desc="Student common room."))] + rooms("", 102, 104) + [BR_NEW] + rooms("", 105, 113), rooms("", 114, 121),
     rooms("", 122, 135), rooms("", 136, 141) + [WC2]],
    # second: 201-239
    [rooms("", 201, 204) + [BR_NEW] + rooms("", 205, 213), rooms("", 214, 221), rooms("", 222, 235),
     rooms("", 236, 239) + [("Chemistry Lab", 2, "lab", dict(desc="Chemistry laboratory.")), WC2]],
    # third: 301-329
    [rooms("", 301, 304) + [BR_NEW] + rooms("", 305, 313), rooms("", 314, 321),
     rooms("", 322, 329) + [("Library", 6, "library", dict(desc="Central library with reading hall.", hours="9:00 am - 7:00 pm"))],
     [("Computer Lab", 3, "lab", dict(desc="Computer laboratory.")), ("Physics Lab", 3, "lab", dict(desc="Physics laboratory.")), WC2]],
], nx=14, ny=8, sx=100, gates=[("stairsA", "bottom", "n-old", "Old Building Ground Gate"),
                               ("stairsB", "top", "n-old-2", "Old Building North Gate"),
                               ("lift", "bottom", "n-old-3", "Old Building East Gate")],
           side_lifts=[("lift", "left", "Lift (West)"), ("lift2", "right", "Lift (East)")])
c.building("new", "New Building", "New", [
    [[("Waiting Area", 2, "waiting", dict(desc="Visitor waiting area."))],
     [("Auditorium", 5, "auditorium", dict(desc="Main auditorium for seminars, fests and guest lectures."))],
     [("Reception", 1, "office", dict(desc="Front desk and enquiries.")), BR_OLD],
     [WC, ("Green Room", 4, "office", dict(desc="Backstage room for the auditorium."))]],
    [[("Cafe 1 Seating", 2, "cafe", dict(desc="Seating area for Cafe 1."))],
     [("Cafe 1", 5, "cafe", dict(desc="Canteen on the first floor of the New Building.", hours="8:30 am - 5:30 pm"))],
     [("Cafe 1 Counter", 1, "cafe", dict(desc="Billing and pick-up counter.")), BR_OLD],
     [WC, ("Cafe 1 Kitchen", 4, "office", dict(desc="Kitchen and service area."))]],
    N_HALL(2),
    N_HALL(3),
], nx=2, ny=5, sx=200, sy=120, gates=[("stairsB", "top", "n-new", "New Building Entrance")])
c.link_bridges("old", "new", 14)
REAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tt", "real_timetable.json")
if os.path.exists(REAL):                       # the 12 Oct 2026 timetables (tools/tt/build.py); cabins are added from the Manage tab
    real = json.load(open(REAL))
    c.d["faculty"] = [dict(name=f["name"], dept=f["dept"] or "", role="Faculty", place="") for f in real["faculty"]]
else:
    c.d["faculty"] = [
        dict(name="Dr. A. Sharma", dept="Computer Science", role="Professor", place="old-112"),
        dict(name="Dr. R. Mehta", dept="Computer Science", role="Associate Professor", place="old-113"),
        dict(name="Ms. P. Kapoor", dept="Computer Science", role="Assistant Professor", place="old-114"),
        dict(name="Dr. S. Verma", dept="Electronics", role="Professor", place="old-210"),
        dict(name="Mr. K. Singh", dept="Mechanical", role="Assistant Professor", place="old-211"),
        dict(name="Dr. N. Gupta", dept="Applied Sciences", role="Associate Professor", place="old-305"),
        dict(name="Dr. V. Rao", dept="Management", role="Professor", place="new-N305"),
        dict(name="Ms. T. Bhatia", dept="Law", role="Assistant Professor", place="new-N306"),
    ]
c.d["events"] = [
    dict(title="Tech fest opening", place="new-0-auditorium", inDays=0, time="11:00", desc="Opening ceremony and keynote."),
    dict(title="Inter-department football final", place="ground", inDays=1, time="16:00", desc="Final match of the season."),
    dict(title="Coding contest", place="old-3-computer-lab", inDays=2, time="10:00", desc="Three-hour team contest."),
    dict(title="Book exhibition", place="old-3-library", inDays=4, time="09:30", desc="New arrivals on display all day."),
    dict(title="Placement talk", place="new-N302", inDays=6, time="14:00", desc="Pre-placement session for final-year students."),
]
if os.path.exists(REAL):
    c.d["calendar"] = dict(days=[1, 2, 3, 4, 5, 6], open="08:30", close="16:30", lunch=None)
    c.d["timetable"] = [dict(place=t["place"] or "", room=t["room"], days=t["days"], start=t["start"], end=t["end"], code=t["code"],
                             subject=t["subject"], faculty=t["faculty"], cls=t["cls"]) for t in real["slots"]]
else:
    c.d["calendar"] = dict(days=[1, 2, 3, 4, 5], open="08:30", close="17:30", lunch=["13:00", "14:00"])
    c.d["timetable"] = make_timetable(c, 2026, PERIODS, {f["place"] for f in c.d["faculty"]})
# Rooms with a known purpose (from the team). Offices and faculty rooms are not classrooms, so the
# free-room finder skips them; the Manage tab lets an admin pick them as a teacher's cabin.
def retag(pid, name, typ, desc, words=()):
    p = next(x for x in c.d["places"] if x["id"] == pid)
    p.update(name=name, type=typ, desc=desc)
    if words:
        add_alias(c, pid, list(words))

FACULTY_ROOMS = ["old-029", "old-107", "old-125", "old-130", "old-132", "old-205", "old-206", "old-220", "old-230", "old-306"]
for pid in FACULTY_ROOMS:
    retag(pid, f"Faculty Room ({pid[4:]})", "office", "Faculty cabins.", ["faculty room", "staff room", "teachers room"])
retag("new-N201", "Management Faculty Room (N201)", "office", "Faculty room for the Management department.", ["faculty room", "management", "staff room"])
retag("new-N301", "CPAA Office (N301)", "office", "CPAA office.", ["cpaa"])
retag("old-028", "Admission Office (028)", "office", "Admissions and enquiries.", ["admission", "admissions", "enquiry"])
retag("old-009", "Seminar Hall (009)", "auditorium", "Seminar hall.", ["seminar hall", "seminar"])
retag("old-105", "HOD Office (105)", "office", "Offices of the heads of departments.", ["hod", "head of department"])
retag("old-104", "Smart Classroom (104)", "room", "Smart classroom.", ["smart class", "smart classroom"])
retag("old-135", "Unnati Lab (135)", "lab", "Unnati lab.", ["unnati"])
retag("old-229", "CAD Lab (229)", "lab", "CAD laboratory.", ["cad", "cad lab"])
retag("old-006", "Canara Bank (006)", "office", "Bank branch on the ground floor.", ["bank", "canara", "atm"])
retag("old-007", "Server Room (007)", "office", "Server room.", ["server", "it room"])
retag("old-123", "Dean's Office (123)", "office", "Office of the Dean.", ["dean", "deans office"])
retag("old-116", "Controller of Examination (116)", "office", "COE, the office of the Controller of Examination.", ["coe", "exam cell", "examination", "controller"])
for pid, words in {"cafe-10": ["canteen", "kanteen", "cafe ten"], "ground": ["football field", "cricket ground", "playground", "maidan"],
                   "gate": ["main entrance", "entry"], "old-3-library": ["central library", "lib"], "old-002": ["dispensary", "doctor", "clinic", "first aid", "nurse"],
                   "amphitheatre": ["amphi", "open stage"], "nescafe": ["coffee", "nescafe kiosk"], "new-1-cafe-1": ["canteen", "cafe one"],
                   "new-0-auditorium": ["main hall", "big hall"]}.items():
    add_alias(c, pid, words)
c.d["sample"] = ("Timetable and faculty are from the 12 Oct 2026 files; events and cabin locations are still samples."
                 if os.path.exists(REAL) else "Faculty, events and the weekly timetable are sample entries. Replace them with real data.")
os.makedirs("data", exist_ok=True)
c.save("data")

# =====================================================================
# Campus 2: fictional campus with a different shape, to prove the site adapts
# =====================================================================
c = Campus("greenfield", "Greenfield Institute of Technology", "GIT", "Fictional campus used to show that any map loads.")
c.outdoor(2000, 900, 470, [
    dict(id="acad", name="Academic Block", label="Academic Block", type="building", building="acad",
         x=100, y=110, w=400, h=250, door_x=125, court=True, desc="Ground + 2 floors of classrooms."),
    dict(id="sci", name="Science Block", label="Science Block", type="building", building="sci",
         x=760, y=120, w=380, h=200, door_x=785, court=True, desc="Ground + 1 floor of laboratories."),
    dict(id="admin", name="Admin & Library", label="Admin & Library", type="building", building="admin",
         x=1480, y=110, w=320, h=250, door_x=1510, court=True, desc="Administration on ground, library on first."),
    dict(id="hostel", name="Hostel", label="Hostel", type="hostel", x=100, y=590, w=420, h=200, desc="Student residence."),
    dict(id="food-court", name="Food Court", label="Food Court", type="cafe", x=640, y=610, w=300, h=150,
         desc="Six counters and open seating.", hours="8:00 am - 9:00 pm"),
    dict(id="sports", name="Sports Complex", label="Sports Complex", type="sports", shape="pill", x=1240, y=590, w=640, h=220,
         desc="Track, courts and gym."),
], gate_x=1080, mpu=0.15, trees=[(60, 60), (620, 100), (1300, 90), (1930, 60), (580, 680), (1010, 700), (1160, 800), (1930, 840), (60, 850)])
c.building("acad", "Academic Block", "Acad", [
    [rooms("A", 1, 5, 3), rooms("A", 6, 8, 3), rooms("A", 9, 13, 3), rooms("A", 14, 14, 3) + [("Seminar Hall", 1, "auditorium"), WC]],
    [rooms("A", 101, 105), rooms("A", 106, 108), rooms("A", 109, 113), rooms("A", 114, 115) + [WC]],
    [rooms("A", 201, 205), rooms("A", 206, 208), rooms("A", 209, 213), rooms("A", 214, 215) + [WC]],
], nx=5, ny=3, sx=120)
c.building("sci", "Science Block", "Sci", [
    [[("Physics Lab", 2, "lab"), ("Chemistry Lab", 2, "lab")], [("Workshop", 2, "lab")],
     [("Biology Lab", 2, "lab"), ("Store", 1, "office"), ("First Aid", 1, "medical")], [("Staff Room", 1, "common"), WC]],
    [[("Computer Centre", 2, "lab"), ("Robotics Lab", 2, "lab")], [("Electronics Lab", 2, "lab")],
     [("Faculty Room", 2, "office"), ("Project Lab", 2, "lab")], [("Seminar Room", 1, "room", dict(name="Seminar Room")), WC]],
], nx=4, ny=2, sx=150, sy=140)
c.building("admin", "Admin & Library", "Admin", [
    [[("Admissions", 2, "office")], [("Accounts", 1, "office"), ("Directors Office", 1, "office", dict(name="Director's Office"))],
     [("Reception", 2, "waiting")], [("Exam Cell", 1, "office"), WC]],
    [[("Library", 2, "library", dict(hours="8:00 am - 8:00 pm"))], [("Periodicals", 2, "library")],
     [("Reading Hall", 2, "library")], [("Digital Library", 1, "library"), WC]],
], nx=2, ny=2, sx=180, sy=150)
c.d["faculty"] = [
    dict(name="Prof. L. Fernandes", dept="Physics", role="Professor", place="sci-1-faculty-room"),
    dict(name="Dr. M. Iyer", dept="Robotics", role="Associate Professor", place="sci-1-robotics-lab"),
    dict(name="Dr. H. Qureshi", dept="Mathematics", role="Professor", place="acad-A105"),
]
c.d["events"] = [
    dict(title="Robotics demo day", place="sci-1-robotics-lab", inDays=1, time="12:00", desc="Student projects on show."),
    dict(title="Athletics meet", place="sports", inDays=3, time="08:00", desc="Annual track and field events."),
]
c.d["calendar"] = dict(days=[1, 2, 3, 4, 5, 6], open="08:00", close="17:00", lunch=["12:30", "13:30"])
c.d["timetable"] = make_timetable(c, 7, [("08:30", "09:25"), ("09:30", "10:25"), ("10:30", "11:25"), ("11:30", "12:25"), ("13:30", "14:25"), ("14:30", "15:25"), ("15:30", "16:25")],
                                  {f["place"] for f in c.d["faculty"]}, chance=0.2)
c.d["sample"] = "Everything in this campus is fictional sample data."
c.save("data")
