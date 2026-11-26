"""Generates QR codes with js/qr.js and reads them back with OpenCV.
Run: python3 tools/test_qr.py   (needs node, numpy and opencv-python)"""
import json, os, subprocess
import numpy as np, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
texts = ["A", "http://localhost:3000/#at-old-105", "https://ncu-navigator.example.edu/#at-old-3-computer-lab",
         "https://navigator.example.edu/#r-old-105--new-N207 " + "x" * 40,
         "https://very-long-host-name.example.org/some/deep/path/index.html?campus=ncu&source=qr-checkpoint#at-new-1-cafe-1-seating" + "y" * 60,
         "z" * 213]
js = "const q=require(%s);console.log(JSON.stringify(%s.map(t=>q.matrix(t))))" % (json.dumps(os.path.join(ROOT, "js", "qr.js")), json.dumps(texts))
mats = json.loads(subprocess.check_output(["node", "-e", js]))
det = cv2.QRCodeDetector()
for t, m in zip(texts, mats):
    a = np.array(m, dtype=np.uint8)
    img = np.kron(np.pad(1 - a, 4, constant_values=1), np.ones((8, 8), dtype=np.uint8)) * 255
    got, _, _ = det.detectAndDecode(img)
    version = (len(m) - 17) // 4
    assert got == t, "version %d failed: %r != %r" % (version, got[:40], t[:40])
    print("ok  version %2d  %d bytes" % (version, len(t)))
try:
    subprocess.check_output(["node", "-e", "require(%s).matrix('q'.repeat(214))" % json.dumps(os.path.join(ROOT, "js", "qr.js"))], stderr=subprocess.STDOUT)
    raise SystemExit("too-long text should fail")
except subprocess.CalledProcessError as e:
    assert b"too long" in e.output
print("QR TESTS PASSED")
