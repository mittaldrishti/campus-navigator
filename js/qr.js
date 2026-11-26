/* QR code generator for the checkpoint module. Byte mode, error correction level M,
   versions 1-10 (up to 213 bytes, plenty for a place link). No dependencies, no network. */
(function (root) {
  "use strict";
  // version -> [error-correction codewords per block, [[blocks, data codewords per block], ...]]
  var BLOCKS = { 1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]],
    6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]] };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

  // GF(256) arithmetic for Reed-Solomon
  var EXP = [], LOG = [];
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } })();
  function mul(a, b) { return a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0; }
  function rsDivisor(deg) {
    var r = [], rootv = 1, i, j;
    for (i = 0; i < deg; i++) r.push(0);
    r[deg - 1] = 1;
    for (i = 0; i < deg; i++) {
      for (j = 0; j < deg; j++) { r[j] = mul(r[j], rootv); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      rootv = mul(rootv, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= mul(c, f); });
    });
    return r;
  }
  function utf8(s) {
    var out = [], str = unescape(encodeURIComponent(s));
    for (var i = 0; i < str.length; i++) out.push(str.charCodeAt(i));
    return out;
  }

  /* Returns a square array of rows; each cell is true for a dark module. */
  function matrix(text) {
    var bytes = utf8(text), ver = 0, v, spec, dataCw = 0;
    for (v = 1; v <= 10 && !ver; v++) {
      dataCw = BLOCKS[v][1].reduce(function (n, b) { return n + b[0] * b[1]; }, 0);
      if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCw * 8) ver = v;
    }
    if (!ver) throw new Error("Text is too long for a QR code (limit is 213 bytes).");
    spec = BLOCKS[ver];

    // bit stream: mode, length, data, terminator, padding
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, dataCw * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    for (var pad = 0xec; bits.length < dataCw * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

    // split into blocks, add error correction, interleave
    var div = rsDivisor(spec[0]), blocks = [], pos = 0;
    spec[1].forEach(function (g) { for (var n = 0; n < g[0]; n++) { var d = data.slice(pos, pos + g[1]); pos += g[1]; blocks.push({ d: d, e: rsRemainder(d, div) }); } });
    var code = [], maxLen = blocks[blocks.length - 1].d.length;
    for (i = 0; i < maxLen; i++) blocks.forEach(function (b) { if (i < b.d.length) code.push(b.d[i]); });
    for (i = 0; i < spec[0]; i++) blocks.forEach(function (b) { code.push(b.e[i]); });

    var size = ver * 4 + 17, m = [], fn = [], x, y;
    for (y = 0; y < size; y++) { m.push([]); fn.push([]); for (x = 0; x < size; x++) { m[y].push(false); fn[y].push(false); } }
    function set(x, y, dark) { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = !!dark; fn[y][x] = true; } }

    // timing, finders, alignment
    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        set(c[0] + dx, c[1] + dy, d !== 2 && d !== 4);
      }
    });
    var al = ALIGN[ver];
    al.forEach(function (ay, iy) {
      al.forEach(function (ax, ix) {
        if ((ix === 0 && iy === 0) || (ix === 0 && iy === al.length - 1) || (ix === al.length - 1 && iy === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    function drawFormat(mask) {
      var d = mask, rem = d, i;                              // level M has format bits 00
      for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var f = ((d << 10) | rem) ^ 0x5412, bit = function (n) { return (f >>> n) & 1; };
      for (i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    }
    drawFormat(0);                                           // reserves the format area
    if (ver >= 7) {
      var rem = ver;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var vbits = (ver << 12) | rem;
      for (i = 0; i < 18; i++) { var on = (vbits >>> i) & 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, on); set(b, a, on); }
    }

    // data modules in the zigzag order
    var k = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        x = right - j; y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fn[y][x] && k < code.length * 8) { m[y][x] = ((code[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
      }
    }

    // try all eight masks, keep the one with the lowest penalty
    var MASK = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; }, function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; }, function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }];
    function applyMask(n) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fn[y][x] && MASK[n](x, y)) m[y][x] = !m[y][x]; }
    function penalty() {
      var p = 0, dark = 0, x, y, run, c;
      for (y = 0; y < size; y++) for (x = 0, run = 0, c = null; x < size; x++) {
        if (m[y][x] === c) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else { c = m[y][x]; run = 1; }
        if (m[y][x]) dark++;
      }
      for (x = 0; x < size; x++) for (y = 0, run = 0, c = null; y < size; y++) {
        if (m[y][x] === c) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else { c = m[y][x]; run = 1; }
      }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    }
    var best = 0, bestP = Infinity;
    for (var n = 0; n < 8; n++) { applyMask(n); drawFormat(n); var pn = penalty(); if (pn < bestP) { bestP = pn; best = n; } applyMask(n); }
    applyMask(best); drawFormat(best);
    return m;
  }

  /* SVG markup for the code, with a quiet zone of `margin` modules. */
  function svg(text, margin) {
    var m = matrix(text), q = margin == null ? 4 : margin, n = m.length + q * 2, d = "";
    m.forEach(function (row, y) { row.forEach(function (on, x) { if (on) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z"; }); });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  var api = { matrix: matrix, svg: svg };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NavQR = api;
})(typeof window !== "undefined" ? window : globalThis);
