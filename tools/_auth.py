"""Imported by the UI tests: signs every page in as a student so the login screen does not block them."""
from playwright.sync_api import Page
_goto = Page.goto
def _g(self, *a, **k):
    if not getattr(self, "_authed", False):
        self.add_init_script("try{localStorage.setItem('ncu-session',JSON.stringify({email:'23csu001@ncuindia.edu',id:'23csu001',t:Date.now()}))}catch(e){}")
        self._authed = True
    return _goto(self, *a, **k)
Page.goto = _g
