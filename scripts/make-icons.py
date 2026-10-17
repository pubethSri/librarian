"""Draw the app icons into static/ (PWA manifest + apple-touch-icon).

The mark is an "L" read as a book on a shelf: the upright is a spine with two
bands, the foot is the shelf. Monochrome zinc (zinc-950 tile, zinc-50 mark),
per docs/design_direction.md. Re-run after changing the mark:

    python scripts/make-icons.py      (needs Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

BG = (9, 9, 11, 255)  # zinc-950, = manifest background_color / theme_color
FG = (250, 250, 250, 255)  # zinc-50
SS = 4  # supersampling factor for smooth edges

STATIC = Path(__file__).resolve().parent.parent / 'static'


def draw_mark(d: ImageDraw.ImageDraw, size: int, scale: float) -> None:
    """The mark on a 512-unit grid centred on the canvas, scaled by `scale`."""
    u = size / 512

    def box(x0, y0, x1, y1):
        c = 256
        return [((v - c) * scale + c) * u for v in (x0, y0, x1, y1)]

    r = 12 * scale * u
    # Spine (upright of the L) and shelf (foot); bbox 168..344 x 128..384, centred
    d.rounded_rectangle(box(168, 128, 248, 384), radius=r, fill=FG)
    d.rounded_rectangle(box(168, 328, 344, 384), radius=r, fill=FG)
    # Spine bands, cut out in the tile colour
    d.rectangle(box(168, 172, 248, 182), fill=BG)
    d.rectangle(box(168, 196, 248, 206), fill=BG)


def render(size: int, *, maskable: bool) -> Image.Image:
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        # Full bleed; the mark stays inside the 80% safe-zone circle
        d.rectangle([0, 0, big, big], fill=BG)
        draw_mark(d, big, 1.1)
    else:
        # Rounded tile with transparent corners, larger mark
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=BG)
        draw_mark(d, big, 1.25)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    icons = STATIC / 'icons'
    icons.mkdir(parents=True, exist_ok=True)
    render(192, maskable=False).save(icons / 'icon-192.png', optimize=True)
    render(512, maskable=False).save(icons / 'icon-512.png', optimize=True)
    render(192, maskable=True).save(icons / 'icon-maskable-192.png', optimize=True)
    render(512, maskable=True).save(icons / 'icon-maskable-512.png', optimize=True)
    # iOS masks it itself and shows transparency as black: full bleed, no alpha
    render(180, maskable=True).convert('RGB').save(STATIC / 'apple-touch-icon.png', optimize=True)


if __name__ == '__main__':
    main()
