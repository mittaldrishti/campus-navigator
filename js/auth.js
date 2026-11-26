/* University login gate. Sign in with a college email (anything@ncuindia.edu); the password is the part before the @.
   This is a front-door check that runs in the browser, so it keeps casual visitors out but is not real security.
   For real accounts, put the site behind the university's own sign-in (SSO) on the server. */
(function () {
  var KEY = "ncu-session", DAYS = 30, DOMAIN = "@ncuindia.edu";
  var mem = null;
  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return mem; } }
  function write(v) { mem = v; try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }
  function check(email, pass) {
    email = String(email || "").trim().toLowerCase();
    var i = email.lastIndexOf("@");
    if (!email) return { err: "Enter your college email." };
    if (i < 1 || email.slice(i) !== DOMAIN) return { err: "Use your college email, like 23csu001" + DOMAIN + "." };
    if (!pass) return { err: "Enter your password." };
    if (pass !== email.slice(0, i)) return { err: "Email or password is wrong. Try again." };
    return { ok: { email: email, id: email.slice(0, i), t: Date.now() } };
  }
  function valid(s) { return !!(s && s.email && s.t && Date.now() - s.t < DAYS * 864e5 && /@ncuindia\.edu$/.test(s.email)); }
  var box = document.getElementById("login");
  function lock(on) {
    document.documentElement.classList.toggle("locked", on);
    if (box) box.hidden = !on;
    if (on) { var f = document.getElementById("lg-email"); if (f) setTimeout(function () { try { f.focus(); } catch (e) { /* ignore */ } }, 50); }
  }
  var s = read();
  lock(!valid(s));
  window.NCUAuth = {
    user: function () { var v = read(); return valid(v) ? v : null; },
    logout: function () { write(null); var p = document.getElementById("lg-pass"); if (p) p.value = ""; lock(true); }
  };
  var form = document.getElementById("login-form"); if (!form) return;
  var err = document.getElementById("lg-err"), pass = document.getElementById("lg-pass"), em = document.getElementById("lg-email");
  function say(m) { err.textContent = m || ""; err.hidden = !m; em.setAttribute("aria-invalid", m ? "true" : "false"); pass.setAttribute("aria-invalid", m ? "true" : "false"); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var r = check(em.value, pass.value);
    if (r.err) { say(r.err); (/password|wrong/.test(r.err) ? pass : em).focus(); return; }
    say(""); write(r.ok); pass.value = ""; lock(false);
    document.dispatchEvent(new CustomEvent("ncu-login", { detail: r.ok }));
  });
  [em, pass].forEach(function (el) { el.addEventListener("input", function () { say(""); }); });
  var tg = document.getElementById("lg-show");
  tg.addEventListener("click", function () { var show = pass.type === "password"; pass.type = show ? "text" : "password"; tg.textContent = show ? "Hide" : "Show"; tg.setAttribute("aria-pressed", String(show)); });
})();
