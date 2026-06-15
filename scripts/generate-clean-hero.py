import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "public" / "images"
OUT = IMAGES / "digital-nomad-life-real-stories-hero.webp"

CANVAS = (1536, 1024)

PHOTOS = [
    "digital-nomad-life-lora-pug-coastal-cliff.webp",
    "digital-nomad-life-across-every-border-machu-picchu.webp",
    "digital-nomad-life-marko-colorful-street-umbrellas.webp",
    "digital-nomad-life-yvette-bax-mountain-meal.webp",
    "digital-nomad-life-freeman-fung-waterfront-portrait.webp",
    "digital-nomad-life-lis-kanzler-mountain-smile.webp",
    "digital-nomad-life-will-hatton-motorcycle-mountains.webp",
]

def create_card(img_path, target_h=380, border=14):
    src = Image.open(img_path).convert("RGBA")
    src = ImageOps.exif_transpose(src)
    
    ratio = src.width / src.height
    target_w = int(target_h * ratio)
    src = src.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Add transparent padding to prevent jagged edges on rotation
    pad = 4
    card_w = target_w + border * 2 + pad * 2
    card_h = target_h + border * 2 + pad * 2
    card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    
    # Draw the white frame
    draw = ImageDraw.Draw(card)
    draw.rectangle([pad, pad, card_w - pad - 1, card_h - pad - 1], fill=(255, 255, 255, 255))
    
    card.paste(src, (border + pad, border + pad), src)
    return card

def add_shadow_and_rotate(card, angle):
    rotated_card = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    
    black_card = Image.new("RGBA", card.size, (0, 0, 0, 255))
    black_card = black_card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    
    alpha = black_card.split()[3]
    alpha = alpha.point(lambda p: p * 0.35)
    black_card.putalpha(alpha)
    
    shadow_blurred = black_card.filter(ImageFilter.GaussianBlur(12))
    
    final_w = rotated_card.width + 30
    final_h = rotated_card.height + 30
    final_img = Image.new("RGBA", (final_w, final_h), (0, 0, 0, 0))
    
    final_img.paste(shadow_blurred, (15, 20), shadow_blurred)
    final_img.paste(rotated_card, (5, 5), rotated_card)
    
    return final_img

def main():
    # Use a different background image (e.g. Yvette's mountain meal)
    bg_src = Image.open(IMAGES / PHOTOS[3]).convert("RGB")
    bg_src = ImageOps.fit(bg_src, CANVAS, Image.Resampling.LANCZOS)
    bg_blurred = bg_src.filter(ImageFilter.GaussianBlur(25))
    enhancer = ImageEnhance.Brightness(bg_blurred)
    bg_darkened = enhancer.enhance(0.65)
    
    # Add a slight color tint to make it look different
    tint = Image.new("RGBA", CANVAS, (40, 60, 80, 80))
    canvas = bg_darkened.convert("RGBA")
    canvas = Image.alpha_composite(canvas, tint)
    
    cards = []
    angles = [-2, 1.5, -1, 2, 1.5, -2, 1]
    for i, photo in enumerate(PHOTOS):
        card = create_card(IMAGES / photo, target_h=380)
        final_card = add_shadow_and_rotate(card, angles[i])
        cards.append(final_card)
    
    row1_y = 90
    row1_x_start = 50
    row1_gap = (CANVAS[0] - sum(c.width for c in cards[:4]) - 2 * row1_x_start) // 3
    
    current_x = row1_x_start
    for i in range(4):
        canvas.paste(cards[i], (int(current_x), row1_y), cards[i])
        current_x += cards[i].width + row1_gap
        
    row2_y = 510
    row2_x_start = 200
    row2_gap = (CANVAS[0] - sum(c.width for c in cards[4:]) - 2 * row2_x_start) // 2
    
    current_x = row2_x_start
    for i in range(3):
        idx = i + 4
        canvas.paste(cards[idx], (int(current_x), row2_y), cards[idx])
        current_x += cards[idx].width + row2_gap
        
    canvas.convert("RGB").save(OUT, "WEBP", quality=90)
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()