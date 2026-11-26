"""Login gate test. Run: python3 tools/test_login.py"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/shots"
os.makedirs(OUT, exist_ok=True)
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(400)
    assert pg.is_visible("#login") and "Latest" not in pg.inner_text("#login")
    pg.screenshot(path=f"{OUT}/login-1.png")
    def attempt(e, p):
        pg.fill("#lg-email", e); pg.fill("#lg-pass", p); pg.click(".lg-go"); pg.wait_for_timeout(150)
    attempt("", "x"); assert "college email" in pg.inner_text("#lg-err") and pg.is_visible("#login")
    attempt("23csu001@gmail.com", "23csu001"); assert "college email" in pg.inner_text("#lg-err")
    attempt("23csu001@ncuindia.edu", ""); assert "password" in pg.inner_text("#lg-err").lower()
    attempt("23csu001@ncuindia.edu", "wrong"); assert "wrong" in pg.inner_text("#lg-err") and pg.is_visible("#login")
    pg.screenshot(path=f"{OUT}/login-2-error.png")
    pg.click("#lg-show"); assert pg.get_attribute("#lg-pass", "type") == "text"
    attempt("  23CSU001@NCUINDIA.EDU ", "23csu001")           # trims and ignores email case
    assert not pg.is_visible("#login") and pg.inner_text("#brand") == "NCU Navigator"
    pg.reload(); pg.wait_for_timeout(400); assert not pg.is_visible("#login")      # stays signed in
    pg.click("#account-btn"); pg.wait_for_timeout(200)
    assert "23csu001@ncuindia.edu" in pg.inner_text("#account")
    pg.click('[data-act="logout"]'); pg.wait_for_timeout(200)
    assert pg.is_visible("#login") and pg.input_value("#lg-pass") == ""
    pg.reload(); pg.wait_for_timeout(300); assert pg.is_visible("#login")
    ph = b.new_page(viewport={"width": 390, "height": 800}); ph.goto(URL); ph.wait_for_timeout(400)
    assert ph.is_visible(".lg-go"); ph.screenshot(path=f"{OUT}/login-3-phone.png")
    b.close()
assert not errs, errs
print("LOGIN TESTS PASSED")
