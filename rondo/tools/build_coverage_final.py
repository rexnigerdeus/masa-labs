#!/usr/bin/env python3
"""
Build the FINAL App Store Routing Coverage File for Rondo.

Strategy after multiple rejections:
  - Single MultiPolygon
  - 5 decimal places (suffisant, ~1m precision)
  - Shift coords away from exact ±180
  - Simplify more aggressively (tolerance 0.1)
  - Drop very small polygons (< 0.01 sq deg)
  - Drop polygons that are entirely in the antimeridian cutoff
  - Round-trip through shapely to normalize
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


NE_URL = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
NE_DIR = os.path.expanduser("~/.cache/natural_earth")

# Inclusive coverage: CIV primary, West Africa, all francophone Africa,
# plus the rest of the world
PRIMARY = {"CIV"}
WEST_AFRICA = {
    "SEN", "MLI", "BFA", "GNB", "NER", "TGO", "BEN", "MRT",
    "NGA", "GHA", "LBR", "SLE", "GIN", "GMB", "CPV",
}
OTHER_FRANCOPHONE = {
    "CMR", "GAB", "COG", "COD", "TCD", "CAF", "DJI", "COM",
    "MDG", "RWA", "BDI", "HTI", "GNQ",
}
REST_OF_WORLD = {
    "FRA", "DEU", "ESP", "PRT", "ITA", "BEL", "CHE", "CAN", "USA", "GBR",
    "MAR", "DZA", "TUN", "EGY", "LBY", "SDN", "ETH", "KEN", "TZA", "UGA",
    "ZAF", "AGO", "MOZ", "ZMB", "ZWE", "BWA", "NAM", "MDV", "MUS", "SYC",
    "ATG", "AUS", "BGD", "BRB", "BLZ", "BTN", "BOL", "BRA", "BRN", "KHM",
    "CHL", "CHN", "COL", "CRI", "CUB", "CYP", "CZE", "DNK", "DOM",
    "ECU", "SLV", "EST", "FJI", "FIN", "GRC", "GRD", "GTM", "HND", "HUN",
    "IDN", "IND", "IRL", "IRN", "IRQ", "ISR", "JAM", "JPN", "JOR", "KAZ",
    "KIR", "PRK", "KOR", "KWT", "KGZ", "LAO", "LVA", "LBN", "LBY", "LIE",
    "LTU", "LUX", "MYS", "MHL", "MEX", "FSM", "MCO", "MNG", "MNE",
    "MMR", "NRU", "NPL", "NZL", "NIC", "NOR", "OMN", "PAK", "PLW",
    "PAN", "PNG", "PRY", "PER", "PHL", "POL", "QAT", "ROU", "RUS", "RWA",
    "KNA", "LCA", "VCT", "WSM", "SMR", "STP", "SAU", "SRB", "SGP", "SVK",
    "SVN", "SLB", "SOM", "SSD", "LKA", "SUR", "SWE", "SYR",
    "TWN", "TJK", "THA", "TLS", "TON", "TTO", "TUR", "TKM", "TUV",
    "UKR", "ARE", "URY", "UZB", "VUT", "VEN", "VNM", "YEM",
}
ALL_TARGETS = PRIMARY | WEST_AFRICA | OTHER_FRANCOPHONE | REST_OF_WORLD


def download_ne():
    os.makedirs(NE_DIR, exist_ok=True)
    shp = os.path.join(NE_DIR, "ne_110m_admin_0_countries.shp")
    if os.path.isfile(shp):
        return shp
    zip_path = os.path.join(NE_DIR, "ne_110m_admin_0_countries.zip")
    with urllib.request.urlopen(NE_URL, timeout=60) as r:
        data = r.read()
    with open(zip_path, "wb") as f:
        f.write(data)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(NE_DIR)
    return shp


def normalize_codes(gdf):
    codes = set()
    for _, row in gdf.iterrows():
        for c in ["ISO_A3", "ISO_A3_EH", "SOV_A3"]:
            v = str(row.get(c, "")).strip()
            if v and v != "-99":
                codes.add(v)
    return codes


def fix_antimeridian(coords, decimals=5):
    """Recursively round coords, shift antimeridian by 0.0001 inward, ensure closed."""
    if isinstance(coords[0], (int, float)):
        lon, lat = coords
        # Round
        lon = round(float(lon), decimals)
        lat = round(float(lat), decimals)
        # Move off exact antimeridian (was: 179.9999 - still too close for Apple)
        if lon >= 179.0:
            lon = 178.999
        if lon <= -179.0:
            lon = -178.999
        # Clamp to valid range
        lon = max(-179.9999, min(179.9999, lon))
        lat = max(-89.9999, min(89.9999, lat))
        return [lon, lat]
    return [fix_antimeridian(c, decimals) for c in coords]


def remove_degenerate(polygons, min_area=0.01):
    """Remove polygons with area below threshold (in square degrees)."""
    kept = []
    for p in polygons:
        if p.area >= min_area:
            kept.append(p)
    return kept


def remove_duplicate_consecutive(coords):
    """Remove consecutive duplicate points."""
    if not coords:
        return coords
    out = [coords[0]]
    for c in coords[1:]:
        if c != out[-1]:
            out.append(c)
    if out[0] == out[-1]:
        out = out[:-1]
    return out + [out[0]]


def main():
    print("Loading Natural Earth...")
    gdf = gpd.read_file(download_ne())
    print(f"  ✓ {len(gdf)} countries")

    available = normalize_codes(gdf)
    found = ALL_TARGETS & available
    missing = ALL_TARGETS - available
    print(f"  Target countries: {len(found)} found, {len(missing)} missing")
    target = gdf[gdf["ISO_A3"].isin(found) | gdf["ISO_A3_EH"].isin(found)].copy()

    # Union all
    print("  Unioning...")
    combined = unary_union(list(target.geometry))

    # Simplify (more aggressive)
    print("  Simplifying (tolerance 0.1°)...")
    simplified = combined.simplify(0.1, preserve_topology=True)

    # Remove degenerate polygons
    if simplified.geom_type == "MultiPolygon":
        polygons = list(simplified.geoms)
    else:
        polygons = [simplified]
    polygons = remove_degenerate(polygons, min_area=0.01)
    simplified = MultiPolygon(polygons)

    # RFC 7946 orientation
    print("  Applying RFC 7946 orientation...")
    simplified = _orient(simplified, sign=1.0)

    # To dict
    geojson = {"type": "MultiPolygon", "coordinates": mapping(simplified)["coordinates"]}

    # Clean up
    print("  Cleaning coordinates...")
    cleaned = []
    for poly in geojson["coordinates"]:
        new_poly = []
        for ring in poly:
            ring = fix_antimeridian(ring, decimals=5)
            ring = remove_duplicate_consecutive(ring)
            new_poly.append(ring)
        cleaned.append(new_poly)
    geojson["coordinates"] = cleaned

    # Write
    out_path = os.path.normpath(os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "appstore", "coverage.geojson",
    ))
    # Write with NO trailing newline, single line (more compact)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        json.dump(geojson, f, separators=(",", ":"))

    # Validate
    print("\n=== Final validation ===")
    with open(out_path) as f:
        data = json.load(f)
    size = os.path.getsize(out_path)
    n_poly = len(data["coordinates"])
    n_coords = sum(len(ring) for poly in data["coordinates"] for ring in poly)
    print(f"  File size: {size} bytes ({size/1024:.1f} KB)")
    print(f"  Polygons: {n_poly}")
    print(f"  Total coords: {n_coords}")
    print(f"  Top type: {data['type']}")

    # Spot-check: no NaN, no inf, no out-of-bounds
    bad = 0
    for poly in data["coordinates"]:
        for ring in poly:
            for lon, lat in ring:
                if lon != lon or lat != lat:  # NaN check
                    bad += 1
                if abs(lon) > 180 or abs(lat) > 90:
                    bad += 1
    print(f"  Invalid coords (NaN/out-of-bounds): {bad}")

    # Antimeridian
    at_180 = 0
    for poly in data["coordinates"]:
        for ring in poly:
            for lon, lat in ring:
                if abs(lon) >= 179.999:
                    at_180 += 1
    print(f"  Coords at antimeridian (179.999+): {at_180}")

    # All closed
    unclosed = 0
    for poly in data["coordinates"]:
        for ring in poly:
            if ring[0] != ring[-1]:
                unclosed += 1
    print(f"  Unclosed rings: {unclosed}")

    if bad == 0 and unclosed == 0 and at_180 == 0 and data["type"] == "MultiPolygon":
        print(f"\n✅ File written: {out_path}")
    else:
        print(f"\n⚠ File written but has issues: {out_path}")


if __name__ == "__main__":
    main()
