# Data formats

## Importing in the page

Drop files on the page, or use *Choose files* / *Choose folder*. Accepted: `.csv`, `.tsv`, `.txt`. The delimiter is detected: comma, semicolon (a comma is then read as the decimal mark), tab or spaces. Values larger than 1.5 are read as percent, otherwise as fractions. Wavelengths are in nm and may be uneven; the page interpolates onto a 1 nm grid from 380 to 780 nm.

The page recognises these layouts. Examples are in [`examples/`](../examples/).

### 1. One file per filter (two columns)

`custom_single_pigment.csv`:
```csv
wavelength_nm,reflectance
400,0.08
...
```
The header row is optional. The **file name** becomes the id and name. Select many files at once.

### 2. Wide table (one column per filter)

`custom_wide.csv`:
```csv
wavelength_nm,example-red,example-green,example-blue
400,0.0200,0.0200,0.2000
...
```
The first column must have a header containing `wavelength`, `nm` or `wl`. Each other column is one filter; the header is its id.

### 3. Long table (one row per wavelength per filter)

`custom_long.csv`:
```csv
filter_id,name,wavelength_nm,transmission_percent
example-red,Example Red,400,2.0
...
```
Needs `filter_id` (or `pigment_id` or `id`), a wavelength column, and one of `transmission`, `transmission_percent`, `reflectance`, `reflectance_percent`. The `name` column is optional.

### 4. Names (metadata)

`metadata_example.csv`:
```csv
filter_id,name
example-red,Example Red
```
Load it together with a wide table or single files to give them readable names. A name whose first word contains a digit (`119 Dark Blue`) uses that word as the catalogue number.

### Subset lists

A plain text file or pasted text, one entry per line. An entry matches a loaded item if it equals its id, its name or its catalogue number (case, spaces and punctuation are ignored), or if it is the start of the id up to a hyphen (`119` matches `119-lee-dark-blue`). Text after `#` is a comment and only the part before the first comma is used, so a one-column CSV exported from a spreadsheet works. `examples/subset_list.txt`:

```
# one entry per line
119
201
Cobalt blue
```

## LED spectra (LED library tab)

Any of these can be dropped on the LED library panel, many files at once. A relative intensity is enough: spectra are scaled to a peak of 1. Wavelengths in nm; the 380–780 nm range is what is used (data outside it is ignored, missing data inside is interpolated, a measurement that stops short of 420–680 nm raises a note). Negative values (dark-subtracted noise) are clipped to 0. Delimiters `,` `;` and tab, decimal commas with `;`, a UTF-8 BOM and Windows line endings are accepted.

### 1. One spectrum per file (instrument export)

```
# status,normal
# metrics.cct,1092
# metrics.duv,0.00011
# metrics.ra,38.8
# metrics.r9,13.7
Wavelength (nm),Intensity
350,0.0000459
351,0.00004132
...
```

The file name (without extension) becomes the light's id, so `113.csv` is `113`. The leading `# key,value` block is read as numbers the instrument reported; they appear in the detail panel next to this tool's own values. Recognised keys, with or without a `metrics.` prefix and a `(K)` unit: `cct`, `duv`, `ra`, `r9`, `rf`, `rg`, `x`, `y`, `device`/`instrument`/`model` and `name`. Other `#` lines are ignored. A second style, with `# CCT(K),1118`, `# Ra,95.9`, `# R9,96`, `# Model,HPCS-330P…`, works the same way. The data may start with a header row (`Wavelength (nm),Intensity`) or without one.

### 2. Many spectra in one file

Long: one row per wavelength and light, with an id column (`led_id`, `rid`, `id`, `sample`, `spectrum` or `file`):

```
led_id,wavelength_nm,intensity
A,380,0.01
A,385,0.02
B,380,0.00
```

Wide: the first column is the wavelength, every other column one light, named by its header:

```
wavelength_nm,LED-A,LED-B
380,0.01,0.00
```

### 3. Metadata table

One row per light, matched to a spectrum by the id (for `70.csv` the id is `70`):

```
rid,title,cct,duv,ra,r9,rf,rg,tag_LED Brand,tag_Optic,notes,uploader,url
70,Ultra Warm DT8K,1375,-0.0461,66,15,74,97,Nichia,TIR optic,...
```

`title` or `name` becomes the display name; `cct`, `duv`, `ra`, `r9`, `rf`, `rg` become the reported values; every `tag_*` column becomes a searchable tag; `notes`, `uploader` and `url` are kept. Quoted fields may contain commas and line breaks (long text columns such as `analysis` are ignored). Import it before or after the spectra; entries with no spectrum yet wait for it. This is the layout of reports exported from hcri.io.

### Make test data

`python3 tools/make_demo_leds.py 1000 demo_leds` writes 1000 synthetic white-LED files in format 1, for trying the library at scale.

## Built-in data (`data/*.json`)

Both files are produced by the tools in `tools/` and embedded by `tools/build.py`.

**`data/lee.json`** (optional, yours, git-ignored; embedded only if present): irregular grid with gaps.
```json
{"w":[405,410,...,700], "f":[["119-lee-dark-blue", "119 Dark Blue", [0.5, 0.7, null, ...]], ...]}
```
Values are percent transmission; `null` means no reading at that wavelength.

**`data/gels.json`, `data/colorchecker.json`**: same regular-grid format as `data/pigments.json` (`w0` 380, `s` 5).

**`data/pigments.json`**: regular grid.
```json
{"w0":380, "s":1, "f":[["cobalt-blue", "Cobalt blue", [7.0, 7.1, ...]], ...]}
```
Wavelength is `w0 + i·s`. Values are percent reflectance.

`data/standard-sources.json` holds the 38 built-in CIE sources (380–780 nm, 5 nm, peak 1) and `data/colour-tables.json` the tables behind CRI and TM-30: the 99 TM-30 colour evaluation samples, the 14 CRI test colour samples, the CIE 1964 10° observer and the D-series basis functions (all 380–780 nm, 5 nm). Both are exported from the Python package `colour-science` by `tools/gen_standard_sources.py` and `tools/gen_colour_tables.py`; they only need regenerating if the tables change.

### Making these files

```bash
# LEE: scrape, then convert
python3 tools/lee_scraper.py                       # writes lee_output/ (needs internet, ~1 s per filter)
python3 tools/lee_csv_to_json.py lee_output/spectra_long.csv lee_output/metadata.csv -o data/lee.json

# any folder of two-column text files (pigments, paints, inks, other gel makers)
python3 tools/spectra_folder_to_json.py my_folder/ -o data/my_set.json
python3 tools/spectra_folder_to_json.py pig_folder/ -o data/pigments.json --tidy-pigment-names --names tools/pigment_names.json
```
`spectra_folder_to_json.py` accepts tab, space, semicolon or comma separated files, comma or dot decimals, and any sampling density (it averages into 1 nm bins). Spectra must cover 380–780 nm. To show the new file in the page, register it as a data set: see [ARCHITECTURE.md](ARCHITECTURE.md#add-a-data-set).

## Using LEE or Munsell data

Neither is built in. In the app: import your CSVs, then pick *LEE filters* or *Munsell* under *Imported spectra are* so the wording matches. For a self-built copy with LEE included, create `data/lee.json` (format above, e.g. with `tools/lee_csv_to_json.py`) and run `python3 tools/build.py`; the manifest line `data? LEE_DATA data/lee.json` skips it silently when the file is missing.

For Munsell spectra stored as a plain-text matrix (wavelength column plus one column per chip, or chips in rows), convert them to the wide CSV the app reads:

```bash
python3 tools/spectra_matrix_to_csv.py munsell_matrix.txt munsell.csv --names chip_names.txt
# no wavelength column:  --first 380 --step 1      chips are rows:  --chips-in-rows
```
The converter has been tested on a small synthetic file only; check the first lines of the output.
