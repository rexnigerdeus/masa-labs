#!/usr/bin/env python3
"""
Build multiple App Store Routing Coverage File variants and validate each.

The .geojson file is being rejected by App Store Connect even though it's
technically valid GeoJSON. Common causes Apple rejects:

  1. Too many polygons / too much precision (file size)
  2. Coordinates with more than 6 decimal places
  3. Antimeridian-crossing polygons (lon = ±180)
  4. Use of integers vs floats
  5. Whitespace, encoding, or newline issues
  6. File not served as `application/geo+json` or `application/json`
  7. Extra trailing zeros or NaN
  8. Some polygons covering 0 area (degenerate)
  9. Coords that round to exact antimeridian line

We generate three variants to try:
  - minimal: 1 polygon (a simple bounding box around the world)
  - africa: 1 polygon for West Africa + francophone (CIV, West Africa only)
  - rounded: same 145 countries but coords rounded to 4 decimals
"""

import os
import json
import urllib.request
import zipfile
import io

import geopandas as gpd
from shapely.geometry import shape, mapping, MultiPolygon, Polygon
from shapely.geometry.polygon import orient as _orient
from shapely.ops import unary_union


# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------
NE_URL = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
NE_DIR = os.path.expanduser("~/.cache/natural_earth")

# Country selection
PRIMARY = {"CIV"}
WEST_AFRICA = {
    "SEN", "MLI", "BFA", "GNB", "NER", "TGO", "BEN", "MRT",
    "NGA", "GHA", "LBR", "SLE", "GIN", "GMB", "CPV",
}
OTHER_FRANCOPHONE = {
    "CMR", "GAB", "COG", "COD", "TCD", "CAF", "DJI", "COM",
    "MDG", "RWA", "BDI", "HTI", "GNQ",
}
ALL_TARGETS = PRIMARY | WEST_AFRICA | OTHER_FRANCOPHONE


def download_ne():
    os.makedirs(NE_DIR, exist_ok=True)
    zip_path = os.path.join(NE_DIR, "ne_110m_admin_0_countries.zip")
    shp = os.path.join(NE_DIR, "ne_110m_admin_0_countries.shp")
    if os.path.isfile(shp):
        return shp
    with urllib.request.urlopen(NE_URL, timeout=60) as r:
        data = r.read()
    with open(zip_path, "wb") as f:
        f.write(data)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(NE_DIR)
    return shp


def load_countries():
    return gpd.read_file(download_ne())


def normalize_codes(gdf):
    codes = set()
    for _, row in gdf.iterrows():
        for c in ["ISO_A3", "ISO_A3_EH", "SOV_A3"]:
            v = str(row.get(c, "")).strip()
            if v and v != "-99":
                codes.add(v)
    return codes


def coords_to_fixed_precision(coords, decimals=4):
    """Recursively round all coordinates to N decimals."""
    if isinstance(coords[0], (int, float)):
        return [round(float(coords[0]), decimals), round(float(coords[1]), decimals)]
    return [coords_to_fixed_precision(c, decimals) for c in coords]


def fix_antimeridian(geom):
    """Shift coords that are exactly at -180 or +180 to ±179.9999 to avoid
    Apple validator's antimeridian handling."""
    if geom.geom_type == "Polygon":
        rings = geom.exterior.coords[:]
        if geom.interiors:
            holes = [list(i.coords) for i in geom.interiors]
        else:
            holes = []
        new_rings = []
        for r in [rings] + holes:
            new_r = []
            for lon, lat in r:
                if lon == -180.0 or lon == 180.0:
                    lon = -179.9999 if lon < 0 else 179.9999
                new_r.append([lon, lat])
            new_rings.append(new_r)
        return Polygon(new_rings[0], new_rings[1:])
    elif geom.geom_type == "MultiPolygon":
        return MultiPolygon([fix_antimeridian(p) for p in geom.geoms])
    return geom


def build_variant(name, target_codes, gdf, decimals=4, simplify_tol=0.05):
    print(f"\n=== Building variant: {name} ===")
    available = normalize_codes(gdf)
    found = target_codes & available
    print(f"  Countries: {len(found)}")
    target = gdf[gdf["ISO_A3"].isin(found) | gdf["ISO_A3_EH"].isin(found)].copy()

    combined = unary_union(list(target.geometry))
    simplified = combined.simplify(simplify_tol, preserve_topology=True)
    # Fix antimeridian
    simplified = fix_antimeridian(simplified)
    # Apply RFC 7946 orientation
    simplified = _orient(simplified, sign=1.0)
    # Ensure MultiPolygon
    if simplified.geom_type == "Polygon":
        simplified = MultiPolygon([simplified])

    geojson = {"type": "MultiPolygon", "coordinates": mapping(simplified)["coordinates"]}
    # Round coords
    geojson["coordinates"] = coords_to_fixed_precision(geojson["coordinates"], decimals)

    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "appstore", f"coverage-{name}.geojson",
    )
    out_path = os.path.normpath(out_path)
    # Write WITHOUT trailing newline, with proper indent
    with open(out_path, "w") as f:
        json.dump(geojson, f, separators=(",", ":"))

    size_kb = os.path.getsize(out_path) / 1024
    print(f"  ✓ {out_path}")
    print(f"  Polygons: {len(geojson['coordinates'])}, Size: {size_kb:.1f} KB")

    return out_path


def main():
    print("Loading Natural Earth...")
    gdf = load_countries()
    print(f"  ✓ {len(gdf)} countries")

    # Build 3 variants
    paths = []
    paths.append(build_variant("africa-focused", PRIMARY | WEST_AFRICA, gdf, decimals=4, simplify_tol=0.1))
    paths.append(build_variant("francophone", ALL_TARGETS, gdf, decimals=4, simplify_tol=0.05))
    paths.append(build_variant("minimal-global", ALL_TARGETS, gdf, decimals=2, simplify_tol=0.5))

    # Validate each
    print("\n=== Validation ===")
    for p in paths:
        with open(p) as f:
            data = json.load(f)
        size_kb = os.path.getsize(p) / 1024
        n = len(data["coordinates"])
        total = sum(len(ring) for poly in data["coordinates"] for ring in poly)
        print(f"  {os.path.basename(p)}: {n} polygons, {total} coords, {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
