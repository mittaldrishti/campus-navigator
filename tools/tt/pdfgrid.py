"""Read an aSc Timetables PDF (one timetable per page) into cells.
Each cell is a rectangle of the grid (merged periods give a wide cell) with its text lines."""
import pdfplumber, re

DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]

def read(path, first=None, last=None):
    pdf = pdfplumber.open(path)
    pages = []
    for i, pg in enumerate(pdf.pages):
        if first and i + 1 < first: continue
        if last and i + 1 > last: break
        ws = pg.extract_words(extra_attrs=["size"])
        V = [l for l in pg.lines if abs(l["x0"] - l["x1"]) < .5]
        H = sorted({round(l["top"], 1) for l in pg.lines if abs(l["top"] - l["bottom"]) < .5 and l["top"] > 140})
        cols = sorted({round(l["x0"], 1) for l in V if l["x0"] > 80 and l["top"] < 110})
        head = [w for w in ws if w["top"] < 95 and w["size"] > 20 and w["text"] not in
                ("The", "NorthCap", "University,", "Gurugram", "Weekly", "Time", "Table", "w.e.f.", "12th", "October", "2026")]
        title = " ".join(w["text"] for w in sorted(head, key=lambda w: (round(w["top"]), w["x0"])))
        cells = []
        for r in range(len(H) - 1):
            top, bot = H[r], H[r + 1]
            mid = (top + bot) / 2
            seps = sorted({round(l["x0"], 1) for l in V if l["top"] - .5 <= mid <= l["bottom"] + .5 and l["x0"] > 80})
            for a, b in zip(seps, seps[1:]):
                inside = [w for w in ws if top <= w["top"] < bot and a <= (w["x0"] + w["x1"]) / 2 <= b]
                if not inside: continue
                p0 = min(range(len(cols)), key=lambda k: abs(cols[k] - a))
                p1 = min(range(len(cols)), key=lambda k: abs(cols[k] - b))
                rows = {}
                for w in sorted(inside, key=lambda w: (w["top"], w["x0"])):
                    key = next((k for k in rows if abs(k - w["top"]) < 2.2), None)
                    rows.setdefault(w["top"] if key is None else key, []).append(w)
                lines = [[(w["text"], w["x0"], w["x1"]) for w in sorted(v, key=lambda w: w["x0"])] for _, v in sorted(rows.items())]
                cells.append(dict(day=r, p0=p0 + 1, p1=p1, lines=lines, x0=a, x1=b))
        pages.append(dict(page=i + 1, title=title, ncols=len(cols), cells=cells))
    return pages
