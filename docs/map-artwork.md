# Map artwork

`src/assets/map/uk.svg` is the illustrated base layer that Leaflet places as an image
overlay under the course pins. This page records where it came from and how to remake it.

## Data source and licence

All shapes come from [Natural Earth](https://www.naturalearthdata.com/) at the 1:10m
scale, taken from the GeoJSON copy in the `nvkelso/natural-earth-vector` repository
(`master` branch, fetched November 2026):

| Layer | Natural Earth file | Used for |
|---|---|---|
| Counties | `ne_10m_admin_1_states_provinces` (UK only) | UK land, county fills and boundaries |
| Neighbours | `ne_10m_admin_0_countries` (everything except the UK) | Ireland, Isle of Man, Channel Islands, France |
| Lakes | `ne_10m_lakes`, `ne_10m_lakes_europe` | Lakes and lochs |
| Rivers | `ne_10m_rivers_lake_centerlines`, `ne_10m_rivers_europe` | Rivers |
| Roads | `ne_10m_roads` (ferry routes removed) | Main roads |

**Licence:** Natural Earth is in the public domain. No permission or attribution is
required. We credit it anyway in the SVG's comment and here.

## Projection and size

- **Web Mercator** (the projection Leaflet uses by default), so pins line up when the
  SVG is stretched over `MAP_BOUNDS` from `src/lib/map-config.ts`:
  south 49.8, west −8.7, north 60.9, east 1.8.
- **100 SVG units per degree of longitude**, origin at the north-west corner:
  - `x = (lng + 8.7) × 100`
  - `y = (mercY(60.9) − mercY(lat)) × 100`, where
    `mercY(lat) = ln(tan(45° + lat / 2))` converted to degrees.
- That gives `viewBox="0 0 1050 1968.38"`, as the plan's contract requires.
  `preserveAspectRatio="none"` lets Leaflet stretch it to the bounds exactly.
- Coordinates are rounded to 0.1 units (about 1/1000 of a degree, roughly 70 m), and
  path data is written as relative moves to keep the file small.
- File size: about 230 KB (about 80 KB gzipped).

Because `MAP_BOUNDS` stops at −8.7° west, the Republic of Ireland is cut off by a
straight edge on the left. That is expected: the artwork covers exactly the bounds.

## Look (Option C, "Fairway Modern")

Layers from bottom to top:

1. Sea: water `#A6D8EE` over the whole box.
2. Neighbouring land: a paler land tint, `#EDF5E9`, so the UK stands out.
3. Coast: a 1.6-unit band in the river colour `#8CCDEA` around all land, giving a soft
   shoreline.
4. UK counties as a patchwork of land `#DDEFD5`, fields `#CBE6C0` and woods `#B9DCAE`.
   Colours were assigned so neighbouring counties differ wherever three colours allow.
5. Roads in white `#FFFFFF`: main roads 0.9 units wide, other roads 0.45.
6. Rivers in `#8CCDEA` (0.55 units), lakes filled with water `#A6D8EE`.
7. County boundaries in navy `#0F2C3F` at 35% opacity (0.3 units), and national borders
   in navy at 25%.

There is no text in the artwork. Labels inside an image overlay would grow and shrink
with the zoom, and they would not be readable by screen readers.

Each county is a `<path>` in `<defs>` with its name in a `<title>`, reused with `<use>`
for the coast band, the fill and the boundary, so the shapes are stored only once and
are easy to find when editing by hand.

### Counties

Natural Earth splits the UK into 232 council areas (London boroughs, metropolitan
boroughs, unitary authorities). These were grouped into the counties people know, so the
map shows 127 areas instead of borough confetti:

- **England:** ceremonial counties. For example the London boroughs became Greater
  London, Medway joined Kent, Brighton and Hove joined East Sussex, the six Berkshire
  unitaries became Berkshire, and the metropolitan boroughs became Greater Manchester,
  Merseyside, West Midlands, Tyne and Wear, South Yorkshire and West Yorkshire.
- **Wales and Scotland:** council areas as given (22 and 32).
- **Northern Ireland:** the 26 districts in Natural Earth (the boundaries from before
  the 2015 reorganisation).

The grouping also corrects two names in the source (North Ayrshire, Perth and Kinross)
and gives Eilean Siar its full name, Na h-Eileanan Siar.

## How it was made

A one-off script, kept outside the repository as the plan requires. It used
[mapshaper](https://github.com/mbloch/mapshaper) 0.6.121 (installed in a scratch folder,
not in this project) and a small Node script with no dependencies.

1. **Download** the GeoJSON files listed above.
2. **Clip, group and simplify** each layer with mapshaper, to a box slightly larger than
   `MAP_BOUNDS` (`-9.2,49.4,2.3,61.3`) so strokes at the edges run off the artwork:

   ```sh
   # Counties: UK only, grouped into counties, dissolved, coloured
   mapshaper ne_10m_admin_1_states_provinces.geojson \
     -filter 'adm0_a3 === "GBR"' \
     -require counties.js alias=C \
     -each 'county = C[name] || name, nation = geonunit' \
     -dissolve2 county copy-fields=nation \
     -clip bbox=-9.2,49.4,2.3,61.3 \
     -simplify interval=120 keep-shapes \
     -filter-slivers min-area=1km2 \
     -classify non-adjacent colors='#DDEFD5,#CBE6C0,#B9DCAE' \
     -o counties.json format=geojson precision=0.0001

   # Neighbours: every other country, clipped and simplified the same way
   # Lakes and rivers: both files merged (-merge-layers force), clipped, simplified
   # Roads: -filter '/Highway|Road/.test(type)' to drop ferries, then
   #        -each 'major = expressway === 1 || type === "Major Highway"'
   ```

   `counties.js` is a lookup from Natural Earth's unit name to the county it belongs
   to (for example `Medway` → `Kent`). `interval=120` simplifies to about 120 m, which
   keeps the coastline smooth at county zoom while keeping the file under 300 KB.
3. **Project and write the SVG** with the Node script: apply the formulas above to
   every point, round to 0.1 units, drop repeated points, and write the layers in the
   order listed under "Look".
4. **Check** by placing the SVG in Leaflet as an image overlay on `MAP_BOUNDS` with
   markers at known places (London, Edinburgh, Belfast, Cardiff, Land's End,
   John o' Groats, Lerwick, Dover, Margate, Dungeness, Whitstable). Each marker sat on
   the right spot on the coast or in the right county.

## Remaking or editing it

- **Small changes** (a colour, a stroke width): edit the SVG by hand. Colours and
  widths are attributes on the layer groups near the bottom of the file.
- **New shapes or a different simplification:** rerun the steps above. Keep the
  projection formulas and the `viewBox` exactly as they are, or the pins will drift.
- Natural Earth at 1:10m is a small-scale source. Smaller rivers (the Medway, for
  example) and minor roads are not included, and the coastline is accurate to roughly
  a kilometre. A more detailed source, such as Ordnance Survey Open Data under the Open
  Government Licence, would need an attribution line on the map.
