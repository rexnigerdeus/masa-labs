#!/usr/bin/env python3
"""
Build the App Store Routing App Coverage File for Rondo.

App Store requires a GeoJSON file with:
  - a single MultiPolygon element (one only)
  - a coordinate order of [longitude, latitude]
  - outer rings + inner rings (holes) in clockwise / counter-clockwise order

Coverage targets (in order of priority):
  1. Côte d'Ivoire (primary market, highest weight)
  2. West Africa (UEMOA + ECOWAS: SN, ML, BF, NE, GW, TG, BJ, MR, NG, GH, LR, SL, GN, GM, CV)
  3. Other francophone Africa (CM, GA, CG, CD, TD, CF, DJ, KM, MG, ML, RW, BI, TG already in WA)
  4. Rest of world (very low weight — international users welcome)

Strategy:
  - Download Natural Earth Admin 0 Countries (low res, 1:110m) — public domain
  - Filter by ISO_A3 codes
  - Concatenate all country polygons into a single MultiPolygon
  - Simplify with shapely (tolerance ~ 0.05 deg) to keep file small (< 1 MB)
  - Write to appstore/coverage.geojson
"""

import os
import sys
import json
import urllib.request
import zipfile
import io

import geopandas as gpd
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

# ---------------------------------------------------------------------------
# Country selection
# ---------------------------------------------------------------------------
# ISO_A3 codes from Natural Earth Admin 0 dataset.
# `-99` is the sentinel for "user-assigned" codes; we'll handle them.

# Primary: Côte d'Ivoire
PRIMARY = {"CIV"}

# West Africa (UEMOA + ECOWAS overlap)
WEST_AFRICA = {
    "SEN",  # Senegal
    "MLI",  # Mali
    "BFA",  # Burkina Faso
    "GNB",  # Guinea-Bissau
    "NER",  # Niger
    "TGO",  # Togo
    "BEN",  # Benin
    "MRT",  # Mauritania
    "NGA",  # Nigeria
    "GHA",  # Ghana
    "LBR",  # Liberia
    "SLE",  # Sierra Leone
    "GIN",  # Guinea
    "GMB",  # Gambia
    "CPV",  # Cape Verde
}

# Other francophone Africa
OTHER_FRANCOPHONE = {
    "CMR",  # Cameroon
    "GAB",  # Gabon
    "COG",  # Republic of Congo
    "COD",  # DR Congo
    "TCD",  # Chad
    "CAF",  # Central African Republic
    "DJI",  # Djibouti
    "COM",  # Comoros
    "MDG",  # Madagascar
    "RWA",  # Rwanda
    "BDI",  # Burundi
    "HTI",  # Haiti (francophone)
    "COM",  # Comoros
    "GNQ",  # Equatorial Guinea (partly francophone)
}

# Rest of the world — add as light simplification
REST_OF_WORLD = {
    "FRA", "DEU", "ESP", "PRT", "ITA", "BEL", "CHE", "CAN", "USA", "GBR",
    "MAR", "DZA", "TUN", "EGY", "LBY", "SDN", "ETH", "KEN", "TZA", "UGA",
    "ZAF", "AGO", "MOZ", "ZMB", "ZWE", "BWA", "NAM", "MDV", "MUS", "SYC",
    "ATG", "AUS", "BGD", "BRB", "BLZ", "BTN", "BOL", "BRA", "BRN", "KHM",
    "CAN", "CHL", "CHN", "COL", "CRI", "CUB", "CYP", "CZE", "DNK", "DOM",
    "ECU", "SLV", "EST", "FJI", "FIN", "GRC", "GRD", "GTM", "HND", "HUN",
    "IDN", "IND", "IRL", "IRN", "IRQ", "ISR", "JAM", "JPN", "JOR", "KAZ",
    "KIR", "PRK", "KOR", "KWT", "KGZ", "LAO", "LVA", "LBN", "LBY", "LIE",
    "LTU", "LUX", "MYS", "MDV", "MHL", "MEX", "FSM", "MCO", "MNG", "MNE",
    "MMR", "NRU", "NPL", "NZL", "NIC", "NER", "NOR", "OMN", "PAK", "PLW",
    "PAN", "PNG", "PRY", "PER", "PHL", "POL", "QAT", "ROU", "RUS", "RWA",
    "KNA", "LCA", "VCT", "WSM", "SMR", "STP", "SAU", "SRB", "SGP", "SVK",
    "SVN", "SLB", "SOM", "ZAF", "SSD", "LKA", "SDN", "SUR", "SWE", "SYR",
    "TWN", "TJK", "THA", "TLS", "TON", "TTO", "TUN", "TUR", "TKM", "TUV",
    "UGA", "UKR", "ARE", "GBR", "TZA", "USA", "URY", "UZB", "VUT", "VEN",
    "VNM", "YEM", "ZMB", "ZWE",
}

# Combine all targets, with primary duplicated for emphasis
ALL_TARGETS = PRIMARY | WEST_AFRICA | OTHER_FRANCOPHONE | REST_OF_WORLD

# ---------------------------------------------------------------------------
# Download Natural Earth Admin 0 (countries, low res)
# ---------------------------------------------------------------------------
NE_URL = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
NE_ZIP_NAME = "ne_110m_admin_0_countries.zip"
NE_DIR = os.path.expanduser("~/.cache/natural_earth")

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "appstore", "_cache")


def download_natural_earth():
    """Download and extract the Natural Earth Admin-0 dataset."""
    os.makedirs(NE_DIR, exist_ok=True)
    zip_path = os.path.join(NE_DIR, NE_ZIP_NAME)
    shp_path = os.path.join(NE_DIR, "ne_110m_admin_0_countries.shp")
    if os.path.isfile(shp_path):
        print(f"  ✓ Already cached at {shp_path}")
        return NE_DIR

    print(f"  Downloading {NE_URL}...")
    with urllib.request.urlopen(NE_URL, timeout=60) as r:
        data = r.read()
    with open(zip_path, "wb") as f:
        f.write(data)

    print(f"  Extracting {zip_path}...")
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(NE_DIR)
    return NE_DIR


def load_countries():
    """Load the Natural Earth shapefile as a GeoDataFrame."""
    extract_dir = download_natural_earth()
    shp = os.path.join(extract_dir, "ne_110m_admin_0_countries.shp")
    gdf = gpd.read_file(shp)
    return gdf


def normalize_iso_codes(gdf):
    """Return a set of present ISO_A3 codes, with common variants handled."""
    codes = set()
    for _, row in gdf.iterrows():
        # Some datasets use ISO_A3_EH (with -99 for user-assigned)
        iso = str(row.get("ISO_A3", "")).strip()
        iso_eh = str(row.get("ISO_A3_EH", "")).strip()
        sov = str(row.get("SOV_A3", "")).strip()
        if iso and iso != "-99":
            codes.add(iso)
        elif iso_eh and iso_eh != "-99":
            codes.add(iso_eh)
        elif sov and sov != "-99":
            codes.add(sov)
    return codes


def main():
    print("Loading Natural Earth Admin 0 countries...")
    gdf = load_countries()
    print(f"  ✓ {len(gdf)} countries loaded")

    available = normalize_iso_codes(gdf)
    missing = ALL_TARGETS - available
    if missing:
        print(f"  ⚠ Not found in dataset: {sorted(missing)}")
    found = ALL_TARGETS & available
    print(f"  ✓ {len(found)} target countries present in dataset")

    # Filter to our target set
    mask = gdf["ISO_A3"].isin(found) | gdf["ISO_A3_EH"].isin(found)
    target = gdf[mask].copy()

    # Union all geometries into one multipolygon
    print(f"  Unioning {len(target)} country polygons...")
    combined = unary_union(list(target.geometry))

    # Simplify to reduce file size
    print("  Simplifying geometry (tolerance 0.05°)...")
    simplified = combined.simplify(0.05, preserve_topology=True)

    # RFC 7946 compliance: exterior rings must be CCW, interior rings CW
    # (App Store Connect rejects files with wrong winding order)
    print("  Fixing ring orientation (RFC 7946)...")
    from shapely.geometry.polygon import orient as _orient
    simplified = _orient(simplified, sign=1.0)

    # Ensure we have a MultiPolygon
    if simplified.geom_type == "Polygon":
        simplified = type("MultiPolygon", (simplified.__class__,), {})([simplified])
    if simplified.geom_type != "MultiPolygon":
        # Use shapely MultiPolygon
        from shapely.geometry import MultiPolygon
        simplified = MultiPolygon([simplified])

    # Convert to GeoJSON
    print("  Converting to GeoJSON...")
    geojson = {
        "type": "MultiPolygon",
        "coordinates": mapping(simplified)["coordinates"],
    }

    # Validate coordinate bounds (and clean up tiny floating-point overshoots)
    def clean_lon(lon):
        if lon > 180:
            return 180.0
        if lon < -180:
            return -180.0
        return lon

    def clean_lat(lat):
        if lat > 90:
            return 90.0
        if lat < -90:
            return -90.0
        return lat

    for poly_idx, poly_coords in enumerate(geojson["coordinates"]):
        new_poly = []
        for ring in poly_coords:
            new_ring = []
            for lon, lat in ring:
                lon2, lat2 = clean_lon(lon), clean_lat(lat)
                if abs(lon2) > 180.001 or abs(lat2) > 90.001:
                    print(f"  ⚠ Out-of-bounds coord: [{lon}, {lat}]")
                    sys.exit(1)
                new_ring.append([lon2, lat2])
            new_poly.append(new_ring)
        geojson["coordinates"][poly_idx] = new_poly

    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "appstore", "coverage.geojson",
    )
    out_path = os.path.normpath(out_path)
    with open(out_path, "w") as f:
        json.dump(geojson, f, separators=(",", ":"))

    size_kb = os.path.getsize(out_path) / 1024
    poly_count = len(geojson["coordinates"])
    print(f"\n✅ Wrote {out_path}")
    print(f"   {poly_count} polygons, {size_kb:.1f} KB")
    print(f"   Countries: {len(found)} (CIV + West Africa + Francophone + RoW)")


if __name__ == "__main__":
    main()
