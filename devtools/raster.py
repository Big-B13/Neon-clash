#!/usr/bin/env python3
"""Software rasterizer: renders the triangle soup exported by export.js into a
contact-sheet PNG (front / side / hero-3q views) so characters can be reviewed."""
import json, math, sys, zlib, struct
import numpy as np

VIEWS = [
    # (yaw_deg, pitch_deg, label)
    (0,    6,  "FRONT"),
    (55,   8,  "THREE-QUARTER"),
    (90,   6,  "SIDE"),
    (180,  6,  "BACK"),
]

W, H = 360, 470          # per-panel size
import os
if os.environ.get('BIG'):
    W, H = 520, 660
SS = 3                   # supersample factor


def load(path):
    with open(path) as f:
        return json.load(f)


def pack_color(c):
    return tuple(int(max(0, min(1, v)) * 255) for v in c[:3])


def write_png(path, img):
    """img: HxWx3 uint8 array"""
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def render_view(tris, yaw, pitch, w, h, zoom, bg_top=(0.04, 0.012, 0.10), bg_bot=(0.09, 0.03, 0.22)):
    """Renders one view. Returns HxWx3 float image (0..1)."""
    s = SS
    Ws, Hs = w * s, h * s
    img = np.zeros((Hs, Ws, 3), dtype=np.float32)
    # vertical gradient background
    grad = np.linspace(0, 1, Hs, dtype=np.float32)[:, None]
    for i in range(3):
        img[:, :, i] = bg_top[i] * (1 - grad) + bg_bot[i] * grad
    depth = np.full((Hs, Ws), 1e9, dtype=np.float32)

    ry, rp = math.radians(yaw), math.radians(pitch)
    cy, sy = math.cos(ry), math.sin(ry)
    cp, sp = math.cos(rp), math.sin(rp)

    # world -> view (yaw about Y, then pitch about X)
    def xform(p):
        x, y, z = p
        x, z = x * cy + z * sy, -x * sy + z * cy
        y, z = y * cp - z * sp, y * sp + z * cp
        return x, y, z

    # camera sits at +Z looking toward -Z
    focal = (w * 0.5) / math.tan(math.radians(16.0))
    D = zoom

    L_KEY = np.array([-0.38, 0.58, 0.72], dtype=np.float32)
    L_KEY /= np.linalg.norm(L_KEY)
    H_KEY = L_KEY + np.array([0.0, 0.0, 1.0], dtype=np.float32)
    H_KEY /= np.linalg.norm(H_KEY)
    L_RIM1 = np.array([-0.82, 0.25, -0.52], dtype=np.float32)
    L_RIM1 /= np.linalg.norm(L_RIM1)
    L_RIM2 = np.array([0.82, 0.30, -0.48], dtype=np.float32)
    L_RIM2 /= np.linalg.norm(L_RIM2)

    proj = []
    for t in tris:
        pv = [xform(p) for p in t["p"]]
        depths = [D - p[2] for p in pv]
        if min(depths) <= 0.05:
            continue
        a, b, c = pv
        n = np.cross(np.subtract(b, a), np.subtract(c, a))
        ln = np.linalg.norm(n)
        if ln < 1e-9:
            continue
        nn = (n / ln).astype(np.float32)
        if t.get("vn"):
            vnv = [np.array(xform(v), dtype=np.float32) for v in t["vn"]]
            for k in range(3):
                nl = np.linalg.norm(vnv[k])
                if nl > 1e-6:
                    vnv[k] /= nl
                else:
                    vnv[k] = nn
        else:
            vnv = [nn, nn, nn]
        scr = [(w / 2 + p[0] * focal / d, h / 2 - p[1] * focal / d)
               for p, d in zip(pv, depths)]
        scr = [(sx * s, sy * s) for (sx, sy) in scr]
        proj.append((t, scr, depths, nn, vnv))

    proj.sort(key=lambda e: -max(e[2]))

    for (t, scr, zs, nn, vnv) in proj:
        base = np.array(t["c"], dtype=np.float32)
        emis = np.array(t["e"], dtype=np.float32)
        ei = float(t["ei"] or 0)
        opacity = float(t["o"])
        rough = float(t.get("r", 0.42))
        metal = float(t.get("m", 0.28))
        additive = bool(t["ad"])
        basic = bool(t["ba"])

        # rasterize
        xs = [p[0] for p in scr]; ys = [p[1] for p in scr]
        x0, x1 = int(max(0, math.floor(min(xs)))), int(min(Ws - 1, math.ceil(max(xs))))
        y0, y1 = int(max(0, math.floor(min(ys)))), int(min(Hs - 1, math.ceil(max(ys))))
        if x1 < x0 or y1 < y0:
            continue
        ax, ay = scr[0]; bx, by = scr[1]; cx, cy = scr[2]
        area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        if abs(area) < 1e-9:
            continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w0 = ((bx - ax) * (Y - ay) - (by - ay) * (X - ax)) / area
        w1 = ((cx - bx) * (Y - by) - (cy - by) * (X - bx)) / area
        w2 = 1.0 - w0 - w1
        l0 = w1; l1 = w2; l2 = w0
        inside = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
        if not inside.any():
            continue
        iz0, iz1, iz2 = 1.0 / zs[0], 1.0 / zs[1], 1.0 / zs[2]
        iz = l0 * iz0 + l1 * iz1 + l2 * iz2
        zz = np.where(iz > 1e-6, 1.0 / np.maximum(iz, 1e-6), 1e6)
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        cur = depth[sl]
        if additive or (opacity < 0.98):
            m = inside & (zz <= cur + 0.03)
            if not m.any():
                continue
            col_flat = base + emis * ei
            if additive:
                if nn[2] <= 0.0 or opacity <= 0.05:
                    continue
                img[sl][m] = np.clip(img[sl][m] + col_flat * (min(0.8, opacity * 1.2) if opacity < 1 else 0.45), 0, 1)
            else:
                img[sl][m] = img[sl][m] * (1 - opacity * 0.7) + col_flat * (opacity * 0.7)
            continue
        m = inside & (zz < cur)
        if not m.any():
            continue
        if basic:
            pix_col = np.clip(base + emis * ei, 0, 1.4)
            img[sl][m] = pix_col
            cur[m] = zz[m]
            continue

        # Smooth Phong normal interpolation across the triangle
        w_a = l0[m]; w_b = l1[m]; w_c = l2[m]
        nx = w_a * vnv[0][0] + w_b * vnv[1][0] + w_c * vnv[2][0]
        ny = w_a * vnv[0][1] + w_b * vnv[1][1] + w_c * vnv[2][1]
        nz = w_a * vnv[0][2] + w_b * vnv[1][2] + w_c * vnv[2][2]
        inv_len = 1.0 / np.maximum(1e-6, np.sqrt(nx * nx + ny * ny + nz * nz))
        nx *= inv_len; ny *= inv_len; nz *= inv_len
        # Flip normal if back-facing
        flip = np.where(nz < -0.15, -1.0, 1.0)
        nx *= flip; ny *= flip; nz *= flip

        ndl = np.maximum(0.0, nx * L_KEY[0] + ny * L_KEY[1] + nz * L_KEY[2])
        ndh = np.maximum(0.0, nx * H_KEY[0] + ny * H_KEY[1] + nz * H_KEY[2])
        rim1 = np.maximum(0.0, nx * L_RIM1[0] + ny * L_RIM1[1] + nz * L_RIM1[2])
        rim2 = np.maximum(0.0, nx * L_RIM2[0] + ny * L_RIM2[1] + nz * L_RIM2[2])
        fres = np.power(1.0 - np.clip(np.abs(nz), 0.0, 1.0), 2.4)

        hemi = 0.36 + 0.14 * (0.5 + 0.5 * ny)
        diff = (hemi + ndl * 0.82) * (1.0 - metal * 0.38)
        shininess = max(8.0, (1.0 - rough) * 96.0)
        spec_str = (0.18 + metal * 0.65) * (1.0 - rough * 0.65)
        spec = np.power(ndh, shininess) * spec_str
        spec_col = (1.0 - metal * 0.6) * np.ones(3, dtype=np.float32) + metal * 0.6 * base

        rim_col = (rim1[:, None] * np.array([0.36, 0.91, 1.0], dtype=np.float32) * 0.28 +
                   rim2[:, None] * np.array([1.0, 0.37, 0.82], dtype=np.float32) * 0.24 +
                   fres[:, None] * np.array([0.72, 0.86, 1.0], dtype=np.float32) * 0.22)

        lit = ( diff[:, None] * base[None, :] +
                spec[:, None] * spec_col[None, :] +
                rim_col * (0.35 + 0.65 * base[None, :]) +
                (emis * ei)[None, :] )
        img[sl][m] = np.clip(lit, 0, 1.0)
        cur[m] = zz[m]

    # downsample (box filter)
    img = img.reshape(h, s, w, s, 3).mean(axis=(1, 3))
    return np.clip(img, 0, 1)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "geom.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "/tmp/preview/characters.png"
    data = load(src)
    ids = list(data.keys())
    n = len(ids)
    cols = min(n, 4)
    rows = (n + cols - 1) // cols
    per_view = len(VIEWS)
    panel_w, panel_h = W * per_view, H
    sheet = np.zeros((rows * panel_h, cols * panel_w, 3), dtype=np.float32)
    sheet[:] = 0.02

    for i, cid in enumerate(ids):
        e = data[cid]
        tris = e["tris"]
        if not tris:
            continue
        # normalize: center horizontally, feet at bottom of frame
        arr = np.array([p for t in tris for p in t["p"]], dtype=np.float32)
        lo, hi = arr.min(axis=0), arr.max(axis=0)
        cxm = (lo[0] + hi[0]) / 2
        height = max(0.001, hi[1] - lo[1])
        zoom = height * 1.62          # camera distance (view space z)
        shifted = []
        for t in tris:
            shifted.append({**t, "p": [[p[0] - cxm, p[1] - lo[1] - height * 0.5, p[2]] for p in t["p"]]})

        r, c = divmod(i, cols)
        for v, (yaw, pitch, label) in enumerate(VIEWS):
            panel = render_view(shifted, yaw, pitch, W, H, zoom)
            y0 = r * panel_h
            x0 = (c * per_view + v) * W
            sheet[y0:y0 + H, x0:x0 + W] = panel

    write_png(dst, (sheet * 255).astype(np.uint8))
    print("wrote", dst, sheet.shape)


if __name__ == "__main__":
    main()
