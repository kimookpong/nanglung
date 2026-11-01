"""Cut the supplied puppet PNGs into clean, outlined sprites for the rig.

Usage: python3 scripts/cut-puppet-sprites.py
Requires Pillow (with WebP) and numpy. Runs offline; the app and CI use the
committed output in public/characters/sprites/ and src/puppet-sprites.json.

Per piece: clean alpha (drop dust, solidify the body), smooth the cut stencil
from src/puppet-cuts.json, fill the body behind moving parts so joints never
open a hole, cap each limb with a disc at its pivot, then add a leather outline.
"""
from pathlib import Path
import json
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art/puppets"
OUT = ROOT / "public/characters/sprites"
CUTS = json.loads((ROOT / "src/puppet-cuts.json").read_text())
W, H, SS = 1024, 1536, 4          # source size and stencil supersampling
INK = (23, 19, 15)                 # leather outline colour
MOUTH = (58, 20, 16)               # shown when the jaw opens
OUTLINE = 7                        # px at source scale (~2 rig units)
# Costume recolours: dark, unsaturated cloth above `above` (plus the sleeves)
# is remapped to a red ramp that keeps the fabric shading and seam lines.
RECOLOUR = {"thaksin": {"above": 745, "shadow": (92, 12, 16), "base": (176, 28, 34),
                        "light": (226, 72, 70), "line": (38, 8, 9)}}


def parse(path):
    """Flatten an M/L/Q/Z path into one closed polygon of source pixels."""
    points, cursor = [], (0.0, 0.0)
    for command, values in re.findall(r"([MLQZ])([^MLQZ]*)", path):
        n = [float(v) for v in re.findall(r"-?\d*\.?\d+", values)]
        if command in "ML":
            for i in range(0, len(n), 2):
                cursor = (n[i], n[i + 1]); points.append(cursor)
        elif command == "Q":
            for i in range(0, len(n), 4):
                (cx, cy), end = (n[i], n[i + 1]), (n[i + 2], n[i + 3])
                for t in np.linspace(0, 1, 9)[1:]:
                    points.append(((1-t)**2*cursor[0]+2*(1-t)*t*cx+t*t*end[0],
                                   (1-t)**2*cursor[1]+2*(1-t)*t*cy+t*t*end[1]))
                cursor = end
    return points


def smooth(points, steps=6):
    """Closed Catmull-Rom through the hand-placed vertices: no faceted cuts."""
    p = np.array(points)
    if len(p) > 2 and np.allclose(p[0], p[-1]):
        p = p[:-1]
    out = []
    for i in range(len(p)):
        p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % len(p)], p[(i + 2) % len(p)]
        for t in np.linspace(0, 1, steps, endpoint=False):
            out.append(0.5 * (2*p1 + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t*t + (-p0+3*p1-3*p2+p3)*t**3))
    return out


def stencil(path=None, discs=()):
    """Anti-aliased coverage in [0,1] for a smoothed path plus pivot discs."""
    image = Image.new("L", (W * SS, H * SS), 0)
    draw = ImageDraw.Draw(image)
    if path:
        draw.polygon([(x * SS, y * SS) for x, y in smooth(parse(path))], fill=255)
    for (x, y), r in discs:
        draw.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=255)
    return np.asarray(image.resize((W, H), Image.BOX), dtype=np.float32) / 255


def components(mask, minimum):
    """Keep connected regions of at least `minimum` pixels (drops dust specks)."""
    # An opening first removes the thousands of tiny specks, so only a handful
    # of regions are flood-filled; the result still masks the unopened pixels.
    opened = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(9))
    image = Image.fromarray(np.where(np.asarray(opened) > 0, 255, 0).astype(np.uint8)).copy()  # writable for floodfill
    keep = np.zeros(mask.shape, bool)
    label = 1
    while True:
        values = np.asarray(image)
        found = np.argwhere(values == 255)
        if not len(found):
            return keep & mask
        y, x = found[0]
        ImageDraw.floodfill(image, (int(x), int(y)), label)
        region = np.asarray(image) == label
        if region.sum() >= minimum:
            keep |= region
        label = label % 250 + 1


def load(cut):
    rgba = Image.open(ART / f"{cut['id']}.png")
    if rgba.mode == "RGB":
        # White matte: remove only white connected to the border (eyes, logos stay).
        rgb = np.asarray(rgba, dtype=np.uint8)
        white = Image.fromarray(np.where(rgb.min(axis=2) > 225, 255, 0).astype(np.uint8)).copy()
        for x, y in [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + \
                    [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]:
            if white.getpixel((x, y)) == 255:
                ImageDraw.floodfill(white, (x, y), 128)
        background = np.asarray(white) == 128
        alpha = np.where(background, 0, 255).astype(np.float32)
        # Soften the matte edge by one pixel so it anti-aliases like the RGBA art.
        alpha = np.asarray(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)), np.float32)
        rgb = rgb.astype(np.float32)
    else:
        data = np.asarray(rgba.convert("RGBA"), dtype=np.float32)
        rgb, alpha = data[..., :3], data[..., 3].copy()
        alpha[alpha < 24] = 0            # invisible dust left by background removal
        alpha[alpha >= 232] = 255        # the supplied art is ~1% translucent everywhere
    alpha *= components(alpha > 0, 600)
    return rgb, alpha / 255


def inpaint(rgb, known, hole, iterations=90):
    """Diffuse surrounding colour into `hole` (body seen behind a moved limb)."""
    colour, weight = rgb * known[..., None], known.astype(np.float32)
    kernel = lambda a: (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1))
    filled = known.copy()
    for _ in range(iterations):
        c, w = kernel(colour), kernel(weight)
        grow = hole & ~filled & (w > 0)
        if not grow.any():
            break
        colour[grow] = c[grow]
        weight[grow] = w[grow]
        filled |= grow
        colour[grow] /= weight[grow, None]
        weight[grow] = 1
    return colour, filled


def closing(mask, radius):
    small = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).resize((W // 4, H // 4), Image.BOX)
    size = radius // 2 * 2 + 1
    closed = small.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    return np.asarray(closed.resize((W, H), Image.BILINEAR)) > 127


def save(name, rgb, alpha, outline=True):
    """Outline, crop and write one sprite; returns its source-pixel box."""
    ys, xs = np.nonzero(alpha > 0.02)
    pad = OUTLINE + 3
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(W, xs.max() + pad + 1), min(H, ys.max() + pad + 1)
    a, c = alpha[y0:y1, x0:x1], rgb[y0:y1, x0:x1]
    # Blur-and-boost is a fast, soft dilation: an even outline with smooth ends.
    ring = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(OUTLINE * .55))
    ring = np.clip(np.asarray(ring, np.float32) / 255 * 3.2, 0, 1)
    if not outline:
        ring = np.zeros_like(a)
    out_a = a + ring * (1 - a)
    out_c = (c * a[..., None] + np.array(INK) * (ring * (1 - a))[..., None]) / np.maximum(out_a, 1e-6)[..., None]
    pixels = np.dstack([np.clip(out_c, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8)
    Image.fromarray(pixels).save(OUT / f"{name}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
    return {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}


def recolour(rgb, alpha, area, spec):
    lum, sat = rgb.mean(axis=2), rgb.max(axis=2) - rgb.min(axis=2)
    cloth = area & (lum < 70) & (sat < 28) & (alpha > .1)
    t = np.clip((lum - 2) / 34, 0, 1)[..., None]
    shadow, base, light = (np.array(spec[k], np.float32) for k in ("shadow", "base", "light"))
    red = np.where(t < .5, shadow + (base - shadow) * (t / .5), base + (light - base) * ((t - .5) / .5))
    red = np.where((lum < 2.5)[..., None], np.array(spec["line"], np.float32), red)
    return np.where(cloth[..., None], red, rgb)


def cut_puppet(cut):
    rgb, alpha = load(cut)
    if cut["id"] in RECOLOUR:
        spec = RECOLOUR[cut["id"]]
        sleeves = sum(stencil(cut[side][part]) for side in ("point", "palm") for part in ("upper", "lower"))
        area = ((np.arange(H)[:, None] < spec["above"]) | (sleeves > .5)) & (stencil(cut["head"]) < .5)
        rgb = recolour(rgb, alpha, area, spec)
    pid, boxes = cut["id"], {}
    head, jaw, body = stencil(cut["head"]), stencil(cut["jaw"]), stencil(cut["body"])
    arms = {side: {part: stencil(cut[side][part]) for part in ("upper", "lower", "hand")} for side in ("point", "palm")}
    # The arm stencils sit just inside the drawn sleeve edge; widen them so the
    # body keeps no sliver of sleeve or stray fingertip once an arm swings away.
    # The back (palm) arm hangs behind the body, so it can be widened further.
    def widen(mask, blur):
        soft = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
        return np.maximum(mask, np.clip(np.asarray(soft, np.float32) / 255 * 3, 0, 1))
    limbs = np.maximum(widen(np.clip(sum(arms["point"].values()), 0, 1), 9),
                       widen(np.clip(sum(arms["palm"].values()), 0, 1), 18))
    moving = np.clip(head + limbs, 0, 1)

    # Body: everything not carried by a moving part, plus a filled backing where
    # the head and arms used to be, so turning a joint reveals body, not a hole.
    body_alpha = alpha * body * (1 - moving)
    body_alpha *= components(body_alpha > .5, 40000)  # the body is one piece
    pivots = [(cut["headPivot"], 70)] + [(cut[side]["shoulder"], 28) for side in arms]
    backing = (closing(body_alpha > .5, 22) | (stencil(discs=pivots) > .5)) & (body > .5) & (moving > .02) & (alpha > .5)
    colour, filled = inpaint(rgb, body_alpha > .5, backing)
    fill = (filled & backing).astype(np.float32) * alpha * body
    body_rgb = np.where((body_alpha > .5)[..., None], rgb, colour)
    boxes["body"] = save(f"{pid}-body", body_rgb, np.maximum(body_alpha, fill))

    # Head carries a dark mouth backing that shows as the jaw drops.
    head_alpha = alpha * head * (1 - jaw)
    mouth = alpha * head * jaw
    head_rgb = np.where((jaw > .5)[..., None] & (head > .5)[..., None], np.array(MOUTH, np.float32), rgb)
    boxes["head"] = save(f"{pid}-head", head_rgb, np.maximum(head_alpha, mouth))
    # The jaw sits inside the face: an outline would draw a ring across the cheek.
    boxes["jaw"] = save(f"{pid}-jaw", rgb, alpha * jaw, outline=False)

    for side, parts in arms.items():
        joint = {"upper": cut[side]["shoulder"], "lower": cut[side]["elbow"], "hand": cut[side]["wrist"]}
        radius = {"upper": 30, "lower": 26, "hand": 20}
        for part, mask in parts.items():
            capped = np.maximum(mask, stencil(discs=[(joint[part], radius[part])]) * (alpha > .5))
            boxes[f"{side}-{part}"] = save(f"{pid}-{side}-{part}", rgb, alpha * capped)
    return boxes


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    result = {}
    for cut in CUTS.values():
        result[cut["id"]] = cut_puppet(cut)
        print("cut", cut["id"])
    (ROOT / "src/puppet-sprites.json").write_text(json.dumps(result, indent=1) + "\n")
