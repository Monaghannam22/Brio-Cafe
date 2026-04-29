"""
Generate public/og-image.png — 1200x630 share-link preview for Brewo.

Layout:
  - Emerald background (#0D4F3C)
  - Centered gold rounded square (#D4A843) with the brand letter "B"
    in emerald, mirroring the favicon
  - "Brewo · بريو" wordmark below the logo
  - Short bilingual tagline at the bottom

Re-run with `python scripts/generate-og-image.py` whenever the brand
assets change. Output file is committed so deploys serve it directly.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    def shape_ar(text):
        return get_display(arabic_reshaper.reshape(text))
except ImportError:
    def shape_ar(text):
        return text

OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"

W, H = 1200, 630
EM = (13, 79, 60)         # --em
GOLD = (212, 168, 67)     # --gold
GOLD_LIGHT = (255, 249, 235)
WHITE = (255, 255, 255)
GOLD_TEXT = (255, 232, 175)


def find_font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    img = Image.new("RGB", (W, H), EM)
    draw = ImageDraw.Draw(img)

    # Subtle radial-ish vignette via a darker gradient at the edges.
    edge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    edge_draw = ImageDraw.Draw(edge)
    for i in range(60):
        alpha = int(2 + i * 1.2)
        edge_draw.rectangle(
            (i, i, W - i, H - i),
            outline=(0, 0, 0, alpha)
        )
    img.paste(edge, (0, 0), edge)

    # Logo card: gold rounded square with emerald "B".
    card_size = 240
    cx, cy = W // 2, 230
    card_box = (cx - card_size // 2, cy - card_size // 2,
                cx + card_size // 2, cy + card_size // 2)
    draw.rounded_rectangle(card_box, radius=44, fill=GOLD)

    b_font = find_font([
        "arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf",
        "tahomabd.ttf", "verdanab.ttf"
    ], 170)
    b_text = "B"
    bbox = draw.textbbox((0, 0), b_text, font=b_font)
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (cx - bw // 2 - bbox[0], cy - bh // 2 - bbox[1] - 6),
        b_text, fill=EM, font=b_font
    )

    # Wordmark: "Brewo · بريو"
    word_font = find_font([
        "arialbd.ttf", "Arial Bold.ttf", "tahomabd.ttf",
        "DejaVuSans-Bold.ttf", "verdanab.ttf"
    ], 84)
    wordmark = "Brewo  ·  " + shape_ar("بريو")
    wbbox = draw.textbbox((0, 0), wordmark, font=word_font)
    ww, wh = wbbox[2] - wbbox[0], wbbox[3] - wbbox[1]
    draw.text(
        ((W - ww) // 2 - wbbox[0], 410 - wbbox[1]),
        wordmark, fill=WHITE, font=word_font
    )

    # Tagline (gold, smaller, two lines for AR + EN).
    tag_font = find_font([
        "arial.ttf", "tahoma.ttf", "DejaVuSans.ttf"
    ], 30)

    def centered(text, y, fill):
        bb = draw.textbbox((0, 0), text, font=tag_font)
        tw = bb[2] - bb[0]
        draw.text(((W - tw) // 2 - bb[0], y - bb[1]),
                  text, fill=fill, font=tag_font)

    centered("Coffee delivered to your desk in Ammal Complex, Amman", 510, GOLD_TEXT)
    centered(shape_ar("اطلب قهوتك المفضلة وتوصلك لمكتبك في مجمع عمال"), 555, GOLD_TEXT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {W}x{H})")


if __name__ == "__main__":
    main()
