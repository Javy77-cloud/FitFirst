#!/usr/bin/env python3
"""Regenerate fixtures/sample-photo-dec.png (phone-scan demo, OCR-friendly)."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "fixtures" / "sample-photo-dec.png"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def main() -> None:
    width, height = 1600, 1900
    img = Image.new("RGB", (width, height), (242, 238, 230))
    draw = ImageDraw.Draw(img)
    draw.rectangle((40, 50, 1560, 1850), fill=(255, 255, 252), outline=(30, 30, 30), width=4)

    title = ImageFont.truetype(str(FONT_DIR / "DejaVuSans-Bold.ttf"), 48)
    label_f = ImageFont.truetype(str(FONT_DIR / "DejaVuSans-Bold.ttf"), 34)
    value_f = ImageFont.truetype(str(FONT_DIR / "DejaVuSansMono.ttf"), 36)
    small = ImageFont.truetype(str(FONT_DIR / "DejaVuSans.ttf"), 24)

    draw.text((80, 80), "HOMEOWNERS DECLARATIONS", font=title, fill=(10, 10, 10))
    draw.text(
        (80, 150),
        "PHONE SCAN  in-desk OCR demo  not a Zestimate",
        font=small,
        fill=(60, 60, 60),
    )
    draw.line([(80, 200), (1520, 200)], fill=(20, 20, 20), width=3)

    rows = [
        ("Named insured", "Luis Vega"),
        ("Location", "88 Sandpiper Ln, Cocoa Beach, FL 32931"),
        ("City", "Cocoa Beach"),
        ("County", "Brevard"),
        ("Year built", "2011"),
        ("Roof year", "2019"),
        ("Construction", "masonry"),
        ("Square feet", "1840"),
        ("Coverage A", "$245,000"),
        ("Hurricane deductible", "2%"),
        ("AOP deductible", "$2,500"),
        ("Occupancy", "owner"),
        ("Stories", "1"),
        ("Current carrier", "Citizens"),
    ]
    y = 240
    for label, value in rows:
        draw.text((80, y), f"{label}:", font=label_f, fill=(20, 20, 20))
        draw.text((620, y), value, font=value_f, fill=(0, 0, 0))
        y += 96

    draw.text(
        (80, 1760),
        "Dwelling limit from the dec. Do not use Zillow list price.",
        font=small,
        fill=(70, 70, 70),
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
