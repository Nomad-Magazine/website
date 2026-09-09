#!/usr/bin/env python3
"""NGM editorial collage hero — white sticker borders, no text."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "public" / "images"
OUT = IMAGES / "kickhub-pickup-football-bangkok-hero.webp"
CANVAS = (1600, 780)
MARGIN = 28

# filename, cx, cy, height, angle
LAYOUT = [
    ("kickhub-pickup-football-bangkok-one-bangkok-team.webp", 800, 410, 300, -1),
    ("kickhub-pickup-football-bangkok-polo-park-team.webp", 800, 175, 175, 2),
    ("kickhub-pickup-football-bangkok-polo-park-action.webp", 255, 250, 250, -6),
    ("kickhub-pickup-football-bangkok-night-kick.webp", 1345, 250, 250, 6),
    ("kickhub-pickup-football-bangkok-high-five.webp", 280, 575, 240, 5),
    ("kickhub-pickup-football-bangkok-polo-greeting.webp", 1320, 575, 240, -5),
]


def dark_bg(size: tuple[int, int]) -> Image.Image:
    random.seed(11)
    w, h = size
    base = Image.new("RGB", size, (26, 30, 28))
    noise = Image.effect_noise((w, h), 32).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    bg = Image.blend(base, grain, 0.18)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((480, -80, 1120, 280), fill=(255, 176, 88, 26))
    draw.ellipse((40, 480, 480, 800), fill=(70, 140, 90, 22))
    draw.ellipse((1120, 480, 1560, 800), fill=(70, 120, 160, 16))
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
    color: tuple[int, int, int, int] = (245, 242, 235, 150),
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


def draw_decor(canvas: Image.Image, nodes: list[tuple[int, int]]) -> None:
    layer = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    hub = nodes[0]
    for cx, cy in nodes[1:]:
        dotted_line(draw, hub, (cx, cy))
    for sx, sy in [(560, 300), (1040, 480), (420, 400), (1180, 360)]:
        draw.ellipse((sx - 4, sy - 4, sx + 4, sy + 4), fill=(255, 210, 120, 190))
    canvas.alpha_composite(layer)


def main() -> None:
    canvas = dark_bg(CANVAS)
    placed: list[tuple[int, Image.Image, tuple[int, int]]] = []
    node_centers: list[tuple[int, int]] = []

    for i, (filename, cx, cy, height, angle) in enumerate(LAYOUT):
        card = with_shadow(sticker(IMAGES / filename, height), angle)
        pos = card_position(card, cx, cy)
        if not fits_canvas(card, pos):
            raise RuntimeError(f"{filename} exceeds canvas bounds at ({cx}, {cy}) size={card.size} pos={pos}")
        z = 0 if i == 0 else 1
        placed.append((z, card, pos))
        node_centers.append((cx, cy))

    draw_decor(canvas, node_centers)
    placed.sort(key=lambda item: item[0])
    for _, card, pos in placed:
        canvas.alpha_composite(card, pos)

    canvas.convert("RGB").save(OUT, "WEBP", quality=82, method=6)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024}KB) {CANVAS[0]}x{CANVAS[1]}")


if __name__ == "__main__":
    main()
