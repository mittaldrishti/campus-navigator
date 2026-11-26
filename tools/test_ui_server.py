"""End-to-end test in server mode: accounts, shared admin changes, synced personal data.
Run: python3 tools/test_ui_server.py"""
import os, sys, subprocess, tempfile, time, urllib.request
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _auth
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"
os.makedirs(OUT, exist_ok=True)
PORT = "3988"; URL = "http://localhost:" + PORT + "/"
env = dict(os.environ, PORT=PORT, DATA_FILE=os.path.join(tempfile.mkdtemp(), "db.json"), ADMIN_EMAIL="admin@test.in", ADMIN_PASSWORD="admin-pass-1")
srv = subprocess.Popen(["node", os.path.join(ROOT, "server", "server.js")], env=env, stdout=subprocess.DEVNULL)
errors = []
try:
    for _ in range(50):
        try: urllib.request.urlopen(URL + "api/health"); break
        except Exception: time.sleep(0.1)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])

        def page(w=1440, h=900):
            pg = b.new_context(viewport={"width": w, "height": h}).new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(700)
            return pg

        def sign_in(pg, email, pw_, name=None):
            pg.click("#account-btn")
            if name:
                pg.click('[data-act="authmode"][data-id="register"]'); pg.fill("#au-name", name)
            pg.fill("#au-email", email); pg.fill("#au-pass", pw_); pg.click('#auth-form button[type=submit]'); pg.wait_for_timeout(600)

        # visitor: manage tools are locked
        v = page()
        v.click('[data-tab="manage"]')
        assert "Only admins can change the campus" in v.inner_text("#body")
        assert v.locator("#k-old-lift").count() == 0

        # wrong password shows a clear error
        a = page()
        sign_in(a, "admin@test.in", "nope")
        assert "Email or password is wrong" in a.inner_text("#account")
        a.fill("#au-pass", "admin-pass-1"); a.click('#auth-form button[type=submit]'); a.wait_for_timeout(700)
        assert "Admin" in a.inner_text("#account")
        a.click('[data-act="closeaccount"]')
        # admin closes a lift, renames a room, adds an event
        a.click('[data-tab="manage"]'); a.check("#k-old-lift"); a.wait_for_timeout(300)
        a.fill("#q", "110"); a.keyboard.press("Enter"); a.wait_for_timeout(300)
        a.click('[data-tab="manage"]'); a.fill("#ed-name", "AI Lab"); a.select_option("#ed-type", "lab"); a.click('#edit-form button[type=submit]'); a.wait_for_timeout(300)
        a.fill("#ev-title", "Hackathon kickoff"); a.click('#event-form button[type=submit]'); a.wait_for_timeout(400)
        a.screenshot(path=f"{OUT}/s1-admin.png")

        # a different visitor sees all three changes
        v2 = page()
        v2.fill("#q", "ai lab"); v2.wait_for_timeout(150)
        assert "AI Lab" in v2.inner_text("#body")
        v2.fill("#q", "")
        v2.click('[data-tab="events"]'); assert "Hackathon kickoff" in v2.inner_text("#body")
        v2.fill("#q", "gate to library"); v2.keyboard.press("Enter"); v2.wait_for_timeout(500)
        v2.check("#sw-access"); v2.wait_for_timeout(300)
        assert "Cross the bridge to Old Building" in v2.inner_text("#body")   # old lift is closed: step-free goes in through the New Building

        # student registers, adds a class and a favourite; they appear on a second device
        s = page()
        sign_in(s, "riya@test.in", "long-enough-1", "Riya")
        assert "Riya" in s.inner_text("#account"); s.click('[data-act="closeaccount"]')
        s.click('[data-tab="manage"]'); assert "Only admins" in s.inner_text("#body")
        s.click('[data-tab="schedule"]'); s.fill("#cl-subject", "Compilers"); s.select_option("#cl-place", "new-N207"); s.click('#class-form button[type=submit]')
        s.fill("#q", "library"); s.keyboard.press("Enter"); s.wait_for_timeout(300); s.click('[data-act="fav"]'); s.wait_for_timeout(900)
        s2 = page()
        sign_in(s2, "riya@test.in", "long-enough-1"); s2.click('[data-act="closeaccount"]'); s2.wait_for_timeout(300)
        s2.click('[data-tab="schedule"]'); assert "Compilers" in s2.inner_text("#body")
        s2.click('[data-tab="saved"]'); assert "Library" in s2.inner_text("#body")
        # stays signed in after reload
        s2.reload(); s2.wait_for_timeout(700)
        assert s2.inner_text("#account-btn").strip() == "R"
        b.close()
finally:
    srv.terminate()
print("errors:", errors)
assert not errors
print("SERVER UI TESTS PASSED")
