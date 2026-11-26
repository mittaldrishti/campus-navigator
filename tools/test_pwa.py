"""Offline test: serve the site, let the service worker cache it, go offline, reload.
Run: python3 tools/test_pwa.py"""
import os, subprocess, time, json, urllib.request, tempfile
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _auth
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = "3457"
BASE = f"http://localhost:{PORT}/"
env = dict(os.environ, PORT=PORT, DATA_FILE=os.path.join(tempfile.mkdtemp(), "db.json"), ADMIN_EMAIL="a@b.in", ADMIN_PASSWORD="password-1")
srv = subprocess.Popen(["node", os.path.join(ROOT, "server", "server.js")], env=env, stdout=subprocess.DEVNULL)
errors = []
try:
    for _ in range(40):
        try: urllib.request.urlopen(BASE + "api/health"); break
        except Exception: time.sleep(0.1)
    # static assets the installable app needs
    m = json.load(urllib.request.urlopen(BASE + "manifest.webmanifest"))
    assert m["display"] == "standalone" and any(i["purpose"] == "maskable" for i in m["icons"])
    for i in m["icons"]: assert urllib.request.urlopen(BASE + i["src"]).status == 200
    sw = urllib.request.urlopen(BASE + "sw.js"); assert "text/javascript" in sw.headers["Content-Type"] and sw.headers["Cache-Control"] == "no-cache"
    for f in ["js/plan.js", "js/nlu.js", "js/i18n.js"]: assert urllib.request.urlopen(BASE + f).status == 200
    for bad in ["server/server.js", "tools/gen_data.py", "package.json"]:
        try: urllib.request.urlopen(BASE + bad); raise SystemExit("should not be served: " + bad)
        except urllib.error.HTTPError as e: assert e.code == 404

    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": 1300, "height": 800})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(800)
        pg.evaluate("navigator.serviceWorker.ready.then(() => 1)")
        for _ in range(40):
            if pg.evaluate("!!navigator.serviceWorker.controller"): break
            pg.wait_for_timeout(150)
        pg.reload(); pg.wait_for_timeout(500)
        assert pg.evaluate("!!navigator.serviceWorker.controller"), "service worker is not controlling the page"
        keys = pg.evaluate("caches.keys()"); assert any(k.startswith("navigator-shell") for k in keys), keys
        # no network at all: the page, the maps and the search still work
        ctx.set_offline(True)
        pg.reload(); pg.wait_for_timeout(800)
        assert pg.inner_text("#brand") == "NCU Navigator"
        assert "Offline" in pg.inner_text("#where"), pg.inner_text("#where")
        pg.fill("#q", "105 to N207"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
        assert "Cross the bridge to New Building" in pg.inner_text("#body")
        pg.click('[data-tab="free"]'); assert pg.locator("#free-list .rowitem, #free-list .note").count() >= 1
        ctx.set_offline(False)
        b.close()
finally:
    srv.terminate()
print("errors:", errors)
assert not errors
print("PWA TESTS PASSED")
