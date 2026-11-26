"""Draws the app icons (rust board, sand arrow). Run: python3 tools/make_icons.py"""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
A, B, SIG = (142, 58, 25), (74, 26, 9), (232, 201, 138)

def draw(size, rounded=True, scale=0.78):
    K = 4; S = size * K
    img = Image.new("RGBA", (S, S))
    px = img.load()
    for y in range(S):                                   # diagonal gradient
        for x in range(S):
            t = (x + y) / (2 * S)
            px[x, y] = tuple(int(A[i] + (B[i] - A[i]) * t) for i in range(3)) + (255,)
    if rounded:
        m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * .22), fill=255)
        img.putalpha(m)
    d = ImageDraw.Draw(img)
    c = S / 2; u = S * scale / 512 * 1.0
    def P(x, y): return (c + (x - 256) * u, c + (y - 256) * u)
    d.polygon([P(256, 96), P(372, 340), P(256, 284), P(140, 340)], fill=SIG)
    return img.resize((size, size), Image.LANCZOS)

draw(512).save(os.path.join(OUT, "icon-512.png"))
draw(192).save(os.path.join(OUT, "icon-192.png"))
draw(180, rounded=False).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
draw(512, rounded=False, scale=0.6).save(os.path.join(OUT, "icon-maskable-512.png"))
