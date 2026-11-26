"""Browser smoke test. Run: python3 tools/test_ui.py  (needs playwright + chrome)"""
import os, sys, json
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _auth
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"
os.makedirs(OUT, exist_ok=True)
errors = []

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fonts" not in m.text and "ERR_" not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    assert pg.inner_text("#brand") == "NCU Navigator"
    pg.screenshot(path=f"{OUT}/1-home.png")

    # search -> select
    pg.fill("#q", "n207"); pg.wait_for_timeout(100)
    assert "Room N207" in pg.inner_text("#body")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    assert "New Building, Second Floor" in pg.inner_text("#where")
    assert pg.locator(".pl.sel").count() == 1
    pg.screenshot(path=f"{OUT}/2-place.png")

    # set location at 105, route to N207
    pg.fill("#q", "105"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    pg.click('[data-act="here"]'); pg.wait_for_timeout(100)
    assert "You are at HOD Office (105)" in pg.inner_text("#where")
    pg.fill("#q", "n207"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    pg.click('[data-act="to"]'); pg.wait_for_timeout(600)
    body = pg.inner_text("#body")
    assert "HOD Office (105) to Room N207" in body and "Cross the bridge to New Building" in body, body
    assert "Exit Old Building" not in body
    assert pg.locator(".route-line").count() == 1
    assert "Part 1 of 3" in pg.inner_text("#legbar"), pg.inner_text("#legbar")
    pg.screenshot(path=f"{OUT}/3-route.png")
    pg.click("#legbar .next"); pg.wait_for_timeout(500)
    pg.click("#legbar .next"); pg.wait_for_timeout(500)
    assert "New Building, Second Floor" in pg.inner_text("#where"), pg.inner_text("#where")
    pg.screenshot(path=f"{OUT}/4-route-new-building.png")

    # step-free
    pg.check("#sw-access"); pg.wait_for_timeout(500)
    assert "step-free" in pg.inner_text("#body") and "Take the lift" in pg.inner_text("#body")
    # close both lifts -> no step-free route between floors
    pg.click('[data-tab="manage"]'); pg.check("#k-old-lift"); pg.check("#k-old-lift2"); pg.check("#k-new-lift"); pg.wait_for_timeout(200)
    pg.click('[data-tab="directions"]')
    assert "No route found" in pg.inner_text("#body")
    pg.uncheck("#sw-access"); pg.wait_for_timeout(300)
    assert "Cross the bridge to New Building" in pg.inner_text("#body")
    # step click
    pg.click('.step >> nth=3'); pg.wait_for_timeout(400)
    # picker
    pg.fill("#f-to", "library"); pg.wait_for_timeout(150)
    pg.click('#drop-to [data-act="pick"] >> nth=0'); pg.wait_for_timeout(500)
    assert "HOD Office (105) to Library" in pg.inner_text("#body")
    pg.click('[data-act="nearest"][data-id="wc"]'); pg.wait_for_timeout(400)
    assert "to Washroom" in pg.inner_text("#body")

    # classes
    pg.click('[data-tab="schedule"]')
    pg.fill("#cl-subject", "Operating Systems"); pg.select_option("#cl-place", "new-N207"); pg.click('#class-form button[type=submit]')
    pg.wait_for_timeout(200)
    assert "Time to leave" in pg.inner_text("#body") and "Operating Systems" in pg.inner_text("#body")
    pg.screenshot(path=f"{OUT}/5-classes.png")
    # events, saved
    pg.click('[data-tab="events"]'); assert "Tech fest opening" in pg.inner_text("#body")
    pg.click('[data-tab="saved"]'); assert "HOD Office (105)" in pg.inner_text("#body")
    # category
    pg.click('[data-tab="explore"]'); pg.click('[data-act="cat"][data-id="lab"]'); pg.wait_for_timeout(100)
    assert "7 labs" in pg.inner_text("#body")
    # edit a place
    pg.fill("#q", "110"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    pg.click('[data-tab="manage"]'); pg.fill("#ed-name", "AI Lab"); pg.select_option("#ed-type", "lab"); pg.click('#edit-form button[type=submit]')
    pg.wait_for_timeout(200)
    pg.fill("#q", "ai lab"); pg.wait_for_timeout(100)
    assert "AI Lab" in pg.inner_text("#body")
    pg.fill("#q", "")
    # persistence across reload
    pg.reload(); pg.wait_for_timeout(400)
    assert "You are at HOD Office (105)" in pg.inner_text("#where")
    # import a campus file, then switch campus
    pg.click('[data-tab="manage"]')
    pg.set_input_files("#campus-file", os.path.join(ROOT, "data", "greenfield.json")); pg.wait_for_timeout(500)
    assert pg.inner_text("#brand") == "GIT Navigator"
    bad = "/tmp/bad.json"; open(bad, "w").write('{"id":"x","name":"X"}')
    pg.set_input_files("#campus-file", bad); pg.wait_for_timeout(300)
    assert "Campus file problem" in pg.inner_text("#body")
    pg.fill("#q", "robotics"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    pg.click('[data-act="to"]'); pg.wait_for_timeout(200)
    pg.fill("#f-from", "gate"); pg.wait_for_timeout(150); pg.click('#drop-from [data-act="pick"] >> nth=0'); pg.wait_for_timeout(600)
    assert "Main Gate to Robotics Lab" in pg.inner_text("#body")
    pg.screenshot(path=f"{OUT}/6-greenfield.png")
    pg.click('[data-tab="manage"]'); pg.select_option("#campus-select", "ncu"); pg.wait_for_timeout(400)
    assert pg.inner_text("#brand") == "NCU Navigator"

    # QR checkpoints: code for a place, simulated scan, printable sheet for the floor
    pg.fill("#q", "library"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    pg.click('[data-tab="manage"]'); pg.wait_for_timeout(200)
    assert pg.locator("#body .qr svg").count() == 1
    pg.click('[data-act="testqr"]'); pg.wait_for_timeout(400)
    assert "You are at Library" in pg.inner_text("#where")
    pg.click('[data-tab="manage"]'); pg.click('[data-act="sheet"]'); pg.wait_for_timeout(500)
    assert pg.locator("#sheet .sheet-card svg").count() == 34, pg.locator("#sheet .sheet-card svg").count()
    pg.screenshot(path=f"{OUT}/9-qr-sheet.png")
    pg.click('[data-act="closesheet"]')
    # a checkpoint link, as a phone would open it after scanning
    pg.goto(URL + "#at-new-N302"); pg.reload(); pg.wait_for_timeout(600)
    assert "You are at Room N302" in pg.inner_text("#where")

    # deep links
    pg.goto(URL + "#r-gate--old-3-library"); pg.reload(); pg.wait_for_timeout(600)
    assert "Main Gate to Library" in pg.inner_text("#body")
    # dark theme
    pg.click("#theme"); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/7-dark.png")

    # phone
    ph = b.new_page(viewport={"width": 390, "height": 800}, has_touch=True, is_mobile=True)
    ph.on("pageerror", lambda e: errors.append("phone: " + str(e)))
    ph.goto(URL + "#r-old-105--new-N207"); ph.wait_for_timeout(700)
    ph.screenshot(path=f"{OUT}/8-phone.png")
    b.close()

print("errors:", errors)
assert not errors
print("UI TESTS PASSED")
