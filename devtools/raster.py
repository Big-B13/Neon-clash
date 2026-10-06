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
        nn = n / ln
        scr = [(w / 2 + p[0] * focal / d, h / 2 - p[1] * focal / d)
               for p, d in zip(pv, depths)]
        scr = [(sx * s, sy * s) for (sx, sy) in scr]
        proj.append((t, scr, depths, nn))

    proj.sort(key=lambda e: -max(e[2]))

    for (t, scr, zs, nn) in proj:
        base = np.array(t["c"], dtype=np.float32)
        emis = np.array(t["e"], dtype=np.float32)
        ei = float(t["ei"] or 0)
        opacity = float(t["o"])
        additive = bool(t["ad"])
        basic = bool(t["ba"])
        if additive or opacity <= 0.02:
            # additive glows: draw as soft halo, skip precise depth
            pass
        # lighting
        if basic:
            shade = np.ones(3, dtype=np.float32)
        else:
            L = np.array([-0.42, 0.62, 0.66]); L /= np.linalg.norm(L)
            nd = max(0.0, float(np.dot(nn, L)))
            # two-side lighting so back faces are not black
            nd2 = max(0.0, float(np.dot(-nn, L))) * 0.35
            fill = 0.42
            shade = np.clip((nd + nd2) * 0.85 + fill, 0, 1.6) * np.ones(3, dtype=np.float32)
        col = base * shade + emis * ei
        if t["tr"] and opacity < 0.98:
            col = col * opacity

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
        # barycentric for the other two verts
        l0 = w1; l1 = w2; l2 = w0
        inside = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
        if not inside.any():
            continue
        # perspective-ish depth (1/z interpolation)
        iz0, iz1, iz2 = 1.0 / zs[0], 1.0 / zs[1], 1.0 / zs[2]
        iz = l0 * iz0 + l1 * iz1 + l2 * iz2
        zz = np.where(iz > 1e-6, 1.0 / np.maximum(iz, 1e-6), 1e6)
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        cur = depth[sl]
        if additive or (opacity < 0.98):
            m = inside
            if additive:
                if nn[2] <= 0.0:
                    continue
                img[sl][m] = np.clip(img[sl][m] + col * (min(2.4, opacity * 2.0) if opacity < 1 else 0.5), 0, 1)
            else:
                img[sl][m] = img[sl][m] * (1 - opacity * 0.6) + col * (opacity * 0.6)
            continue
        better = m = inside & (zz < cur)
        if not m.any():
            continue
        img[sl][m] = col
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
