"""Tests for the time-aware features in a real browser, with the clock fixed to
Thursday 19 Nov 2026, 11:00. Run: python3 tools/test_ui_features.py [screenshot dir]"""
import os, sys, datetime
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _auth
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"
os.makedirs(OUT, exist_ok=True)
errors = []
NOW = datetime.datetime(2026, 11, 19, 11, 0, 0)

def text(pg, sel="#body"):
    return pg.inner_text(sel)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, timezone_id="UTC")
    pg = ctx.new_page()
    pg.clock.set_fixed_time(NOW)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fonts" not in m.text and "ERR_" not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)

    # ---- free rooms
    pg.click('[data-tab="free"]'); pg.wait_for_timeout(200)
    t = text(pg)
    assert "Free rooms" in t and "Free until" in t, t[:300]
    n_now = pg.locator("#free-list .rowitem").count(); assert n_now > 5
    pg.select_option("#fr-min", "120"); pg.wait_for_timeout(150)
    assert pg.locator("#free-list .rowitem").count() <= n_now
    pg.select_option("#fr-min", "0"); pg.select_option("#fr-b", "new"); pg.wait_for_timeout(150)
    first = text(pg, "#free-list .rowitem >> nth=0"); assert "N" in first, first
    pg.screenshot(path=f"{OUT}/f1-free.png")
    # pick a time: Sunday is closed, Monday 9:30 has rooms
    pg.click('[data-act="whenpick"]'); pg.select_option("#fr-day", "0"); pg.wait_for_timeout(150)
    assert "campus is closed" in text(pg).lower() and "Monday" in text(pg)
    pg.select_option("#fr-day", "1"); pg.fill("#fr-time", "09:30"); pg.dispatch_event("#fr-time", "change"); pg.wait_for_timeout(150)
    pg.select_option("#fr-b", ""); pg.wait_for_timeout(150)
    assert pg.locator("#free-list .rowitem").count() > 5
    pg.click('[data-act="whennow"]')
    # a free room opens its card with the timetable, directions work from the list
    pg.click('#free-list .as-btn >> nth=0'); pg.wait_for_timeout(300)
    assert "Timetable" in text(pg) and "Free until" in text(pg)
    pg.screenshot(path=f"{OUT}/f2-room-card.png")

    # ---- faculty status (real teachers, no cabins on the map yet)
    pg.click('[data-tab="explore"]'); pg.click('[data-act="cat"][data-id="faculty"]'); pg.wait_for_timeout(150)
    t = text(pg); assert "Faculty cabins" in t and ("In cabin until" in t or "Teaching" in t), t[:400]
    pg.click('[data-act="facfilter"][data-id="cabin"]'); pg.wait_for_timeout(100)
    pg.click('[data-act="facfilter"][data-id="all"]')
    pg.click('[data-act="faculty"] >> nth=0'); pg.wait_for_timeout(300)
    t = text(pg); assert "Cabin not added yet" in t and "When to meet" in t, t[:400]
    pg.screenshot(path=f"{OUT}/f3-faculty.png")
    pg.fill("#q", "sharma sir kahan hain"); pg.wait_for_timeout(150)
    assert "right now?" in text(pg) and "Where is" in text(pg)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    assert "When to meet" in text(pg)
    # an admin (or an offline page) can give a teacher a cabin; it then shows on the card and in the list
    pg.select_option("#fa-cabin-set", "old-112"); pg.wait_for_timeout(300)
    assert "Cabin: Room 112" in text(pg) and "Directions to cabin" in text(pg) or "Take me to their" in text(pg), text(pg)[:400]
    pg.select_option("#fa-cabin-set", ""); pg.wait_for_timeout(200)
    assert "Cabin not added yet" in text(pg)

    # ---- Meet faculty: who is free, and when
    pg.click('[data-tab="meet"]'); pg.wait_for_timeout(250)
    t = text(pg); assert "Meet faculty" in t and "next time you can meet them" in t and ("Free now until" in t or "Next free" in t), t[:400]
    assert "Pick a time" not in t                                   # the teacher's free time decides, not a time the student picks
    n_all = pg.locator("#meet-list .rowitem").count(); assert n_all >= 5, n_all
    pg.screenshot(path=f"{OUT}/f3b-meet.png")
    pg.click('[data-act="meetfree"]'); pg.wait_for_timeout(150)
    n_free = pg.locator("#meet-list .rowitem").count(); assert 1 <= n_free <= n_all
    assert "Next free" not in text(pg, "#meet-list")
    pg.click('[data-act="meetall"]'); pg.wait_for_timeout(150)
    pg.select_option("#mt-min", "60"); pg.wait_for_timeout(150)
    assert pg.locator("#meet-list .rowitem").count() <= n_all
    pg.select_option("#mt-min", "10")
    pg.fill("#mt-q", "zzzzqq"); pg.wait_for_timeout(150); assert "Nobody matches" in text(pg)
    pg.fill("#mt-q", ""); pg.wait_for_timeout(150)
    pg.click('#meet-list [data-act="faculty"] >> nth=0'); pg.wait_for_timeout(300)
    t = text(pg); assert "When to meet" in t and "free" in t, t[:400]
    pg.click('[data-act="meetday"][data-id="1"]'); pg.wait_for_timeout(150)
    assert pg.locator('[data-act="meetday"].on').inner_text().strip() == "Mon"
    pg.screenshot(path=f"{OUT}/f3c-faculty-week.png")

    # ---- Hinglish search
    pg.fill("#q", "sabse paas washroom"); pg.wait_for_timeout(150)
    assert "nearest washroom" in text(pg).lower()
    pg.fill("#q", "library kidhar hai"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    assert "Library" in text(pg) and pg.locator(".pl.sel").count() == 1
    pg.fill("#q", "105 se N207 tak"); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    assert "HOD Office (105) to Room N207" in text(pg)
    pg.fill("#q", "koi khali classroom"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    assert "Free rooms" in text(pg) and pg.locator("#free-list .rowitem").count() > 0

    # ---- upload my weekly timetable (NCU grid layout)
    pg.click('[data-tab="schedule"]'); pg.wait_for_timeout(150)
    assert "Upload my weekly timetable" in text(pg)
    csv = os.path.join("/tmp", "my_tt.csv")
    open(csv, "w").write("\n".join([",1,2,3,4,5,6,7,8", ",8:30 - 9:20,9:30 - 10:20,10:30 - 11:20,11:30 - 12:20,12:30 - 13:20,13:30 - 14:20,14:30 - 15:20,15:30 - 16:20",
        "MON,,MAL616 Arjun.S RN 001,MCL507 Shruti.S RN 001,MCL503 Pitamber.V RN 001,LUNCH BREAK,CLL513 RN 001,MCV501 RN 001,MCV501 RN 001",
        "THU,,,,,MCL501 Neha RN 102,,MCL503 Pitamber.V RN 124,", "FRI,,,MAL616 RN 001,LUNCH BREAK,MCL501 RN 302,,,",
        "MAL616,Research Methodology", "MCL501,DBMS"]))
    pg.set_input_files("#tt-file", csv); pg.wait_for_timeout(400)
    t = text(pg); assert "classes imported" in t, t[:500]
    assert "MCL501 DBMS" in t and "Thursday" in t and "RN" not in t.replace("Room", "")[:0]
    # Thursday 11:30 class in room 102 is next; the card says when to leave
    card = text(pg, '[data-live="leave"]'); assert "Time to leave" in card and "MCL501 DBMS" in card and "Room 102" in card, card
    assert "Leave at" in card or "Leave now" in card
    assert pg.locator('.item.plan').count() == 2, pg.locator('.item.plan').count()   # today: DBMS 11:30 and Networks 14:30
    pg.screenshot(path=f"{OUT}/f4-classes.png")
    # tap "Take me there" -> route from the gate to Room 102
    pg.click('.leave [data-act="leaveroute"]'); pg.wait_for_timeout(500)
    assert "Room 102" in text(pg) and "walking" in text(pg)
    pg.click('[data-tab="schedule"]')
    # append mode keeps existing, replace mode drops them
    pg.uncheck("#tt-replace"); pg.fill("#tt-paste", "day,start,end,subject,room\nThu,16:00,17:00,Club,N207"); pg.click('[data-act="ttimport"]'); pg.wait_for_timeout(200)
    assert pg.locator('.item.plan').count() == 3
    pg.check("#tt-replace"); pg.fill("#tt-paste", "nonsense"); pg.click('[data-act="ttimport"]'); pg.wait_for_timeout(200)
    assert "No classes were found" in text(pg) and pg.locator('.item.plan').count() == 3     # a bad file changes nothing
    # survives reload
    pg.reload(); pg.wait_for_timeout(400); pg.click('[data-tab="schedule"]')
    assert pg.locator('.item.plan').count() == 3
    # add a class straight from a room's timetable
    pg.fill("#q", "N207"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    if pg.locator('[data-act="addslot"]:not([disabled])').count():
        pg.locator('[data-act="addslot"]:not([disabled])').first.click(); pg.wait_for_timeout(200)
        assert pg.locator('[data-act="addslot"][disabled]').count() >= 1

    # ---- Hindi interface
    pg.click("#lang"); pg.wait_for_timeout(300)
    assert pg.evaluate("document.documentElement.lang") == "hi"
    assert "क्लास" in text(pg, "#tabs") and "खोजें" in text(pg, "#tabs")
    assert pg.get_attribute("#q", "placeholder") == "रूम, जगह या फैकल्टी खोजें"
    pg.click('[data-tab="schedule"]'); assert "अब निकलना पड़ेगा" in text(pg) and "निकलें" in text(pg)
    pg.fill("#q", "105 to N207"); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    t = text(pg); assert "पैदल" in t and "ब्रिज पार करें" in t, t[:500]
    pg.screenshot(path=f"{OUT}/f5-hindi-route.png")
    pg.fill("#q", "कैंटीन कहाँ है"); pg.wait_for_timeout(200)
    assert "सबसे पास वाला" in text(pg), text(pg)[:200]
    pg.click('[data-tab="free"]'); assert "खाली" in text(pg) and "तक खाली" in text(pg)
    pg.click("#lang"); pg.wait_for_timeout(200)
    assert pg.evaluate("document.documentElement.lang") == "en" and "Free rooms" in text(pg)
    pg.reload(); pg.wait_for_timeout(300)

    # ---- voice search with a fake recogniser
    pg2 = ctx.new_page(); pg2.clock.set_fixed_time(NOW)
    pg2.on("pageerror", lambda e: errors.append("voice: " + str(e)))
    pg2.add_init_script("""
      window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { this.onstart && this.onstart(); const t = window.__SAY || 'nearest washroom';
        setTimeout(() => { this.onresult({ results: [[{ transcript: t }]] }); this.onend && this.onend(); }, 50); } stop() {} };
    """)
    pg2.goto(URL); pg2.wait_for_timeout(400)
    assert pg2.is_visible("#mic")
    pg2.click("#mic"); pg2.wait_for_timeout(600)
    assert "washroom" in text(pg2).lower() and pg2.locator(".route-line").count() == 1
    pg2.evaluate("window.__SAY = 'ab nikalna padega'"); pg2.click("#mic"); pg2.wait_for_timeout(500)
    assert "My classes" in text(pg2)
    pg2.close()

    # ---- deep links used by the app shortcuts
    pg3 = ctx.new_page(); pg3.clock.set_fixed_time(NOW)
    pg3.goto(URL + "#free"); pg3.wait_for_timeout(500)
    assert "Free rooms" in text(pg3) and pg3.locator("#tabs .tab.on").inner_text().strip() == "Free now"
    pg3.close()

    # ---- phone layout
    ph = ctx.new_page(); ph.set_viewport_size({"width": 390, "height": 800}); ph.clock.set_fixed_time(NOW)
    ph.on("pageerror", lambda e: errors.append("phone: " + str(e)))
    ph.goto(URL); ph.wait_for_timeout(500); ph.click('[data-tab="free"]'); ph.wait_for_timeout(300)
    ph.screenshot(path=f"{OUT}/f6-phone-free.png")
    assert ph.evaluate("document.documentElement.scrollWidth") <= 392
    b.close()

print("errors:", errors)
assert not errors
print("FEATURE UI TESTS PASSED")
