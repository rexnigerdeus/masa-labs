"""Génère les icônes PWA de Vitae.

    python scripts/generate-icons.py

Écrit les PNG dans `public/`. Aucune dépendance : la machine n'a ni Pillow ni
ImageMagick, et l'encodeur PNG tient en quelques lignes avec `zlib`, qui est
dans la bibliothèque standard. Les icônes sont donc reproductibles par
n'importe qui clonant le dépôt, sans outil à installer.

La marque : un « V » vert sur le noir olive du header (brief §7). Pas de
dégradé ni d'ombre — une icône d'application se lit à 48 pixels de côté.
"""

import struct
import zlib
from pathlib import Path

HEADER = (0x17, 0x21, 0x0C)   # #17210C — header, brief §7
ACCENT = (0x6F, 0xAE, 0x2E)   # #6FAE2E — accent principal

PUBLIC = Path(__file__).resolve().parent.parent / "public"


def write_png(path: Path, size: int, pixels: list[list[tuple[int, int, int]]]) -> None:
    """Encode une image RGB en PNG (filtre 0, aucune optimisation)."""
    raw = b"".join(
        b"\x00" + b"".join(bytes(pixels[y][x]) for x in range(size))
        for y in range(size)
    )

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def distance_to_segment(px: float, py: float,
                        ax: float, ay: float,
                        bx: float, by: float) -> float:
    """Distance d'un point au segment [AB]. Sert à tracer les branches du V."""
    dx, dy = bx - ax, by - ay
    length2 = dx * dx + dy * dy
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length2))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def render(size: int, padding: float, rounded: bool) -> list[list[tuple[int, int, int]]]:
    """Dessine le V.

    `padding` réserve une marge autour du glyphe : les icônes « maskable » sont
    recadrées par le système, et un glyphe qui touche les bords se fait rogner.
    """
    inner = size * (1 - 2 * padding)
    ox = oy = size * padding

    # Les deux branches du V, en coordonnées relatives au carré intérieur.
    top_left = (ox + inner * 0.22, oy + inner * 0.24)
    bottom = (ox + inner * 0.50, oy + inner * 0.78)
    top_right = (ox + inner * 0.78, oy + inner * 0.24)
    stroke = inner * 0.085

    radius = size * 0.22
    pixels: list[list[tuple[int, int, int]]] = []

    for y in range(size):
        row: list[tuple[int, int, int]] = []
        for x in range(size):
            cx, cy = x + 0.5, y + 0.5

            # Coins arrondis : seulement pour l'icône carrée classique. Une
            # maskable doit remplir tout le carré, le système applique sa
            # propre forme par-dessus.
            if rounded:
                nx = min(cx, size - cx)
                ny = min(cy, size - cy)
                if nx < radius and ny < radius:
                    if ((radius - nx) ** 2 + (radius - ny) ** 2) ** 0.5 > radius:
                        row.append((255, 255, 255))
                        continue

            d = min(
                distance_to_segment(cx, cy, *top_left, *bottom),
                distance_to_segment(cx, cy, *top_right, *bottom),
            )
            row.append(ACCENT if d <= stroke else HEADER)
        pixels.append(row)

    return pixels


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 0.10, True),
        ("icon-512.png", 512, 0.10, True),
        # Zone de sécurité de 20 % pour le recadrage adaptatif d'Android.
        ("icon-maskable-512.png", 512, 0.20, False),
        # iOS ignore le manifeste et n'arrondit pas de lui-même : angles pleins.
        ("apple-touch-icon.png", 180, 0.12, False),
    ]
    for name, size, padding, rounded in targets:
        path = PUBLIC / name
        write_png(path, size, render(size, padding, rounded))
        print(f"{name}: {size}x{size}, {path.stat().st_size} octets")


if __name__ == "__main__":
    main()
