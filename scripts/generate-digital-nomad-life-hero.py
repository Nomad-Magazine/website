#!/usr/bin/env python3
"""NGM editorial collage hero — constellation layout, no text."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "public" / "images"
OUT = IMAGES / "digital-nomad-life-real-stories-hero.webp"
CANVAS = (1536, 1024)
MARGIN = 72

# cx, cy, height, angle
LAYOUT = [
    ("digital-nomad-life-lora-pug-coastal-cliff.webp", 768, 512, 340, 0),
    ("digital-nomad-life-marko-colorful-street-umbrellas.webp", 330, 300, 285, -4),
    ("digital-nomad-life-yvette-bax-mountain-meal.webp", 768, 265, 285, 3),
    ("digital-nomad-life-freeman-fung-waterfront-portrait.webp", 1206, 300, 285, 4),
    ("digital-nomad-life-across-every-border-machu-picchu.webp", 330, 724, 285, 4),
    ("digital-nomad-life-lis-kanzler-mountain-smile.webp", 768, 754, 285, -3),
    ("digital-nomad-life-will-hatton-motorcycle-mountains.webp", 1206, 724, 285, -4),
]

HUB = (768, 512)


def dark_bg(size: tuple[int, int]) -> Image.Image:
    random.seed(7)
    w, h = size
    base = Image.new("RGB", size, (28, 30, 34))
    noise = Image.effect_noise((w, h), 32).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    bg = Image.blend(base, grain, 0.18)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((460, -40, 1080, 380), fill=(255, 170, 90, 28))
    draw.ellipse((120, 620, 500, 960), fill=(90, 130, 180, 18))
    return Image.alpha_composite(bg.convert("RGBA"), glow)


def sticker(src_path: Path, height: int, border: int = 12) -> Image.Image:
    src = ImageOps.exif_transpose(Image.open(src_path).convert("RGBA"))
    ratio = src.width / src.height
    width = max(1, int(height * ratio))
    src = src.resize((width, height), Image.Resampling.LANCZOS)

    pad = 6
    fw, fh = width + border * 2 + pad * 2, height + border * 2 + pad * 2
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rectangle(
        (pad, pad, fw - pad - 1, fh - pad - 1),
        fill=(252, 251, 248, 255),
    )
    frame.paste(src, (border + pad, border + pad), src)
    return frame


def with_shadow(card: Image.Image, angle: float) -> Image.Image:
    rotated = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    shadow = Image.new("RGBA", rotated.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rectangle((0, 0, rotated.size[0] - 1, rotated.size[1] - 1), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    pad = 14
    out = Image.new(
        "RGBA",
        (rotated.size[0] + pad * 2, rotated.size[1] + pad * 2),
        (0, 0, 0, 0),
    )
    out.alpha_composite(shadow, (pad + 5, pad + 9))
    out.alpha_composite(rotated, (pad, pad))
    return out


def card_position(card: Image.Image, cx: int, cy: int) -> tuple[int, int]:
    return cx - card.size[0] // 2, cy - card.size[1] // 2


def fits_canvas(card: Image.Image, pos: tuple[int, int]) -> bool:
    x, y = pos
    w, h = card.size
    return (
        x >= MARGIN
        and y >= MARGIN
        and x + w <= CANVAS[0] - MARGIN
        and y + h <= CANVAS[1] - MARGIN
    )


def dotted_line(
    draw: ImageDraw.ImageDraw,
    a: tuple[float, float],
    b: tuple[float, float],
    color: tuple[int, int, int, int] = (245, 242, 235, 170),
) -> None:
    x1, y1 = a
    x2, y2 = b
    dist = math.hypot(x2 - x1, y2 - y1)
    steps = max(1, int(dist / 9))
    for i in range(steps + 1):
        if i % 2:
            continue
        t = i / steps
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        draw.ellipse((x - 2.2, y - 2.2, x + 2.2, y + 2.2), fill=color)


def draw_plane(draw: ImageDraw.ImageDraw, x: float, y: float, angle: float) -> None:
    ca, sa = math.cos(angle), math.sin(angle)
    pts = [(0, 0), (-16, 5), (-16, -5)]

    def rot(px, py):
        return x + px * ca - py * sa, y + px * sa + py * ca

    draw.polygon([rot(*p) for p in pts], fill=(240, 238, 232, 210))


def draw_decor(canvas: Image.Image, nodes: list[tuple[int, int]]) -> None:
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for cx, cy in nodes[1:]:
        dotted_line(draw, HUB, (cx, cy))

    ring = nodes[1:]
    for i in range(len(ring)):
        dotted_line(draw, ring[i], ring[(i + 1) % len(ring)])

    draw_plane(draw, 1120, 120, -0.35)
    draw_plane(draw, 380, 900, 2.4)

    for sx, sy in [(560, 400), (980, 620), (420, 520), (1100, 460)]:
        draw.ellipse((sx - 4, sy - 4, sx + 4, sy + 4), fill=(255, 210, 120, 200))

    canvas.alpha_composite(layer)


def main() -> None:
    canvas = dark_bg(CANVAS)
    placed: list[tuple[int, Image.Image, tuple[int, int]]] = []
    node_centers: list[tuple[int, int]] = []

    for filename, cx, cy, height, angle in LAYOUT:
        card = with_shadow(sticker(IMAGES / filename, height), angle)
        pos = card_position(card, cx, cy)
        if not fits_canvas(card, pos):
            raise RuntimeError(f"{filename} exceeds canvas bounds at ({cx}, {cy})")
        z = 0 if "lora-pug" in filename else 1
        placed.append((z, card, pos))
        node_centers.append((cx, cy))

    draw_decor(canvas, node_centers)

    placed.sort(key=lambda item: item[0])
    for _, card, pos in placed:
        canvas.alpha_composite(card, pos)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT, "WEBP", quality=82, method=6)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024}KB)")


if __name__ == "__main__":
    main()
