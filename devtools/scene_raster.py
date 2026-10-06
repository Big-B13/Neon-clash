#!/usr/bin/env python3
"""Software renderer for the in-game capture produced by pose.js.

Renders the real game scene (stage, backdrop, both fighters in their live
animation poses) through the real game camera, with an approximation of the
game's lighting rig (ambient + key + cyan/magenta rim point lights) and ACES
tone mapping. Outputs one PNG sheet of all shots.
"""
import json, math, sys, zlib, struct
import numpy as np

# ---------------- game lighting rig (from index.html) ----------------
AMBIENT = np.array([0x2a / 255, 0x1f / 255, 0x55 / 255]) * 0.38 * 2.1
KEY_DIR = np.array([8.0, 22.0, 16.0]); KEY_DIR = KEY_DIR / np.linalg.norm(KEY_DIR)
KEY_COL = np.array([0xcf / 255, 0xd9 / 255, 0xff / 255]) * 1.05
HEMI_SKY = np.array([0xff / 255, 0x7a / 255, 0xdf / 255]) * 0.22
HEMI_GND = np.array([0x1b / 255, 0x0b / 255, 0x3a / 255]) * 0.22
RIMS = [
    (np.array([-18.0, 6.0, 10.0]), np.array([0x5c / 255, 0xe9 / 255, 0xff / 255]) * 0.8, 70.0),
    (np.array([18.0, 8.0, -6.0]), np.array([0xff / 255, 0x5f / 255, 0xd2 / 255]) * 0.8, 70.0),
]
BG_TOP = np.array([0x0a / 255, 0x04 / 255, 0x20 / 255])
BG_HORIZON = np.array([0x2a / 255, 0x10 / 255, 0x4a / 255])


def write_png(path, img):
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
    open(path, "wb").write(png)


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ], dtype=np.float64)


def aces(x):
    return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)


FOG_COL = np.array([0x16 / 255, 0x0a / 255, 0x38 / 255])
FOG_NEAR, FOG_FAR = 34.0, 96.0


def apply_fog(col, centroid):
    d = float(np.linalg.norm(centroid))
    t = min(1.0, max(0.0, (d - FOG_NEAR) / (FOG_FAR - FOG_NEAR)))
    return col * (1 - t) + FOG_COL * t


FILL_COL = np.array([0x8e / 255, 0xa4 / 255, 0xd6 / 255]) * 0.42


def shade(base, emis, ei, normal, centroid, basic, cam_pos=None):
    """Approximate three.js shading for one triangle."""
    if basic:
        lit = base
    else:
        n = normal
        nrm = np.linalg.norm(n)
        n = n / nrm if nrm > 1e-9 else np.array([0, 0, 1.0])
        col = AMBIENT * base
        ndl = max(0.0, float(np.dot(n, KEY_DIR)))
        ndl2 = max(0.0, float(np.dot(-n, KEY_DIR))) * 0.32        # two-sided fill
        col = col + KEY_COL * base * (ndl + ndl2)
        # hemisphere: sky above, ground below
        t = 0.5 + 0.5 * float(n[1])
        col = col + base * (HEMI_GND * (1 - t) + HEMI_SKY * t)
        for pos, lc, dist in RIMS:                                 # neon rim lights
            d = pos - centroid
            dl = np.linalg.norm(d)
            if dl < 1e-6:
                continue
            att = max(0.0, 1.0 - dl / dist) ** 2
            ndl3 = max(0.0, float(np.dot(n, d / dl)))
            col = col + lc * base * att * ndl3 * 0.85
        if cam_pos is not None:
            d = cam_pos - centroid
            dl = np.linalg.norm(d)
            if dl > 1e-6:
                nd = max(0.0, float(np.dot(n, d / dl)))
                col = col + FILL_COL * base * (0.35 + 0.65 * nd)
        lit = col
    return lit + emis * ei


def render_shot(shot, W, H, SS=2):
    cam = shot["camera"]
    cam_pos = np.array(cam["p"], dtype=np.float64)
    R = quat_to_mat(cam["q"])
    Rt = R.T
    fov = math.radians(cam.get("fov", 48))
    aspect = cam.get("aspect", W / H)
    f = 1.0 / math.tan(fov / 2)

    Ws, Hs = W * SS, H * SS
    img = np.zeros((Hs, Ws, 3), dtype=np.float32)
    # sky gradient + horizon glow
    gy = np.linspace(0, 1, Hs, dtype=np.float32)[:, None]
    for i in range(3):
        img[:, :, i] = BG_TOP[i] * (1 - gy) + BG_HORIZON[i] * gy
    depth = np.full((Hs, Ws), 1e9, dtype=np.float32)

    def to_cam(pts):
        a = np.asarray(pts, dtype=np.float64)
        return (a - cam_pos) @ Rt.T

    def project(pc):
        z = -pc[..., 2]
        z = np.maximum(z, 0.05)
        x = pc[..., 0] * (f / aspect) / z
        y = pc[..., 1] * f / z
        sx = (x * 0.5 + 0.5) * Ws
        sy = (0.5 - y * 0.5) * Hs
        return sx, sy, z

    # ---------- opaque + emissive triangles ----------
    items = []
    for t in shot["tris"]:
        pc = to_cam(t["p"])
        if pc[:, 2].max() >= -0.05:
            continue
        a, b, c = pc
        n = np.cross(b - a, c - a)
        centroid = (a + b + c) / 3.0
        sx, sy, z = project(pc)
        items.append((t, sx, sy, z, n, centroid))
    items.sort(key=lambda e: -max(e[3]))

    for (t, sx, sy, z, n, centroid) in items:
        col = shade(np.array(t["c"], dtype=np.float64), np.array(t["e"], dtype=np.float64),
                    float(t["ei"] or 0), n, centroid, bool(t["ba"]), cam_pos)
        if not bool(t["ba"]) and not bool(t["ad"]):
            col = apply_fog(col, centroid)
        opacity = float(t["o"])
        additive = bool(t["ad"])
        transparent = bool(t["tr"])
        col = np.clip(col, 0, 1.6)
        x0 = int(max(0, math.floor(sx.min()))); x1 = int(min(Ws - 1, math.ceil(sx.max())))
        y0 = int(max(0, math.floor(sy.min()))); y1 = int(min(Hs - 1, math.ceil(sy.max())))
        if x1 < x0 or y1 < y0:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = ((sx[1] - sx[0]) * (sy[2] - sy[0]) - (sy[1] - sy[0]) * (sx[2] - sx[0]))
        if abs(d) < 1e-9:
            continue
        w0 = ((sx[1] - sx[0]) * (Y - sy[0]) - (sy[1] - sy[0]) * (X - sx[0])) / d
        w1 = ((sx[2] - sx[1]) * (Y - sy[1]) - (sy[2] - sy[1]) * (X - sx[1])) / d
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not inside.any():
            continue
        iz = w0 / z[0] + w1 / z[1] + w2 / z[2]
        zz = np.where(iz > 1e-9, 1.0 / np.maximum(iz, 1e-9), 1e9)
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        if transparent:
            # transparent FX still respect the opaque depth buffer (as three.js does
            # with depthTest on, depthWrite off) -- otherwise glows paint over the fighter
            vis = inside & (zz <= depth[sl] + 0.02)
            if not vis.any():
                continue
            if additive:
                if opacity < 0.085:          # idle auras etc: invisible in-game at this range
                    continue
                img[sl][vis] = np.clip(img[sl][vis] + col * min(0.30, opacity * 0.38), 0, 1)
                continue
            if opacity >= 0.98:
                continue
            img[sl][vis] = img[sl][vis] * (1 - opacity * 0.75) + col * (opacity * 0.75)
            continue
        m = inside & (zz < depth[sl])
        if not m.any():
            continue
        img[sl][m] = col
        depth[sl][m] = zz[m]

    # ---------- textured markers: the synthwave sun ----------
    for mk in shot.get("markers", []):
        pc = to_cam([mk["pos"]])
        if pc[0][2] >= -0.05:
            continue
        sx, sy, z = project(pc)
        # ---- additive sprite: impact star / muzzle flash. Soft radial falloff, tiny. ----
        if mk.get("add"):
            op = float(mk.get("op", 1))
            if op < 0.08:
                continue
            rad = max(3.0, (mk.get("w", 1) * 0.5) * (f / max(0.25, z[0])) * Hs * 0.5)
            rad = min(rad, Hs * 0.18)                      # never envelop the frame
            x0 = int(max(0, sx[0] - rad)); x1 = int(min(Ws - 1, sx[0] + rad))
            y0 = int(max(0, sy[0] - rad)); y1 = int(min(Hs - 1, sy[0] + rad))
            if x1 <= x0 or y1 <= y0:
                continue
            X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            rr = np.sqrt((X - sx[0]) ** 2 + (Y - sy[0]) ** 2) / rad
            beat = 0.55 + 0.45 * np.cos(np.arctan2(Y - sy[0], X - sx[0]) * 4.0)   # 4-point star
            fall = np.clip(1.0 - rr, 0, 1) ** 1.6 * (0.6 + 0.4 * beat)
            col = np.clip(np.array(mk.get("c", [1, 1, 1]), dtype=np.float64) * 1.3, 0, 1)
            patch = img[y0:y1 + 1, x0:x1 + 1]
            img[y0:y1 + 1, x0:x1 + 1] = np.clip(patch + fall[:, :, None] * col[None, None, :] * op * 0.85, 0, 1)
            continue
        # ---- otherwise it is the sun disc ----
        rad_rounded = (mk.get("w", 20) * 0.5) * (f / max(0.25, z[0])) * Hs * 0.5
        if rad_rounded < 12:
            continue
        sx = sx; sy = sy
        rad = rad_rounded
        if rad < 4:
            continue
        x0 = int(max(0, sx[0] - rad)); x1 = int(min(Ws - 1, sx[0] + rad))
        y0 = int(max(0, sy[0] - rad)); y1 = int(min(Hs - 1, sy[0] + rad))
        if x1 <= x0 or y1 <= y0:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        r = np.sqrt((X - sx[0]) ** 2 + (Y - sy[0]) ** 2) / max(1.0, rad)
        disc = r <= 1.0
        if not disc.any():
            continue
        t = np.clip((Y - (sy[0] - rad)) / max(1.0, 2 * rad), 0, 1)
        sun = np.zeros((Y.shape[0], Y.shape[1], 3), dtype=np.float32)
        sun[:, :, 0] = 1.00 - t * 0.42
        sun[:, :, 1] = 0.86 - t * 0.68
        sun[:, :, 2] = 0.36 + t * 0.62
        band_rows = (Y - sy[0]) / max(1.0, rad)
        bands = (band_rows < 0.05) | (((band_rows * 4.2) % 2.0) < 1.30)
        m = disc & bands
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        soft = np.clip(1.15 - r, 0, 1)[m]
        img[sl][m] = img[sl][m] * (1 - soft[:, None] * 0.94) + sun[m] * soft[:, None] * 0.94

    # ---------- neon grid lines ----------
    for ln in shot.get("lines", []):
        pc = to_cam(ln["p"])
        if pc[0][2] >= -0.05 or pc[1][2] >= -0.05:
            continue
        sx, sy, z = project(pc)
        n = max(2, int(max(abs(sx[1] - sx[0]), abs(sy[1] - sy[0]))) + 1)
        tt = np.linspace(0, 1, n)
        px = sx[0] + (sx[1] - sx[0]) * tt
        py = sy[0] + (sy[1] - sy[0]) * tt
        pz = z[0] + (z[1] - z[0]) * tt
        col = np.array(ln["c"], dtype=np.float64)
        op = float(ln.get("o", 1.0))
        ix = np.round(px).astype(int); iy = np.round(py).astype(int)
        ok = (ix >= 0) & (ix < Ws) & (iy >= 0) & (iy < Hs) & (pz < depth[iy.clip(0, Hs - 1), ix.clip(0, Ws - 1)] + 0.02)
        ix = ix[ok]; iy = iy[ok]
        if not len(ix):
            continue
        img[iy, ix] = np.clip(img[iy, ix] + col * op * 0.55, 0, 1)

    # ---------- points: stars and drifting motes (small additive dots) ----------
    for pt in shot.get("points", []):
        pc = to_cam([pt["p"]])
        if pc[0][2] >= -0.05:
            continue
        sx, sy, z = project(pc)
        rad = (pt.get("s", 0.3)) * (f / max(0.25, z[0])) * Hs * 0.5
        rad = min(3.2, max(0.8, rad))
        x0 = int(max(0, sx[0] - rad)); x1 = int(min(Ws - 1, sx[0] + rad))
        y0 = int(max(0, sy[0] - rad)); y1 = int(min(Hs - 1, sy[0] + rad))
        if x1 < x0 or y1 < y0:
            continue
        Y, X = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        rr = np.sqrt((X - sx[0]) ** 2 + (Y - sy[0]) ** 2) / max(0.6, rad)
        fall = np.clip(1.0 - rr, 0, 1) ** 1.4
        col = np.clip(np.array(pt["c"], dtype=np.float64) * float(pt.get("o", 1)) * 1.15, 0, 1)
        patch = img[y0:y1 + 1, x0:x1 + 1]
        img[y0:y1 + 1, x0:x1 + 1] = np.clip(patch + fall[:, :, None] * col[None, None, :], 0, 1)

    # ---------- tonemap + downsample ----------
    img = aces(np.clip(img * 0.92, 0, 4.0))
    img = img.reshape(H, SS, W, SS, 3).mean(axis=(1, 3))
    return np.clip(img, 0, 1)


def label_strip(img, text, color=(1.0, 1.0, 1.0)):
    """Bake a simple 5x7 label so shots can be told apart without a caption."""
    FONT = {
        'A': ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        'B': ["11110", "10001", "11110", "10001", "10001", "10001", "11110"],
        'C': ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
        'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
        'E': ["11111", "10000", "11110", "10000", "10000", "10000", "11111"],
        'F': ["11111", "10000", "11110", "10000", "10000", "10000", "10000"],
        'G': ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
        'H': ["10001", "10001", "11111", "10001", "10001", "10001", "10001"],
        'I': ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
        'J': ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
        'K': ["10001", "10010", "11100", "10010", "10001", "10001", "10001"],
        'L': ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        'M': ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
        'N': ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
        'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        'P': ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        'Q': ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
        'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
        'S': ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        'T': ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        'U': ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
        'V': ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
        'W': ["10001", "10001", "10001", "10001", "10101", "11011", "10001"],
        'X': ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
        'Y': ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
        'Z': ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
        '0': ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
        '1': ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
        '2': ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
        '3': ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
        '4': ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
        '5': ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
        '6': ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
        '7': ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
        '8': ["01110", "10001", "01110", "10001", "10001", "10001", "01110"],
        '9': ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
        ' ': ["00000"] * 7, '-': ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
        '.': ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
        '(': ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
        ')': ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
        '/': ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
        '!': ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    }
    H = img.shape[0]
    text = text.upper()
    pad = 12
    scale = 2
    cw, ch = 5 * scale + scale, 7 * scale
    tw = len(text) * cw + pad * 2
    th = ch + pad * 2
    band = img[H - th:H, :tw].copy()
    band = band * 0.15
    img[H - th:H, :tw] = band
    oy = H - th
    for i, chx in enumerate(text):
        glyph = FONT.get(chx, FONT[' '])
        ox = pad + i * cw
        for r, row in enumerate(glyph):
            for c in range(len(row)):
                if row[c] == '1':
                    y0 = oy + pad + r * scale
                    x0 = ox + c * scale
                    img[y0:y0 + scale, x0:x0 + scale] = color
    # neon underline
    img[oy + 3:oy + 6, pad:tw - pad] = np.array(color) * 0.85
    return img


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/scene.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "/tmp/scene.png"
    data = json.load(open(src))
    W = data.get("size", {}).get("w", 1000)
    H = data.get("size", {}).get("h", 620)
    shots = data["shots"]
    cols = 2
    rows = (len(shots) + cols - 1) // cols
    sheet = np.zeros((rows * H, cols * W, 3), dtype=np.float32)
    for i, shot in enumerate(shots):
        r, c = divmod(i, cols)
        panel = render_shot(shot, W, H)
        tint = np.array([0.55, 0.95, 1.0])
        panel = label_strip(panel, shot["label"][:30], color=tint)
        sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = panel
        print(f"  rendered {shot['name']}")
    write_png(dst, (sheet * 255).astype(np.uint8))
    print("wrote", dst, sheet.shape)


if __name__ == "__main__":
    main()
