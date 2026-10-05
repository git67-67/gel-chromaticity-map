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

## Built-in data (`data/*.json`)

Both files are produced by the tools in `tools/` and embedded by `tools/build.py`.

**`data/lee.json`**: irregular grid with gaps.
```json
{"w":[405,410,...,700], "f":[["119-lee-dark-blue", "119 Dark Blue", [0.5, 0.7, null, ...]], ...]}
```
Values are percent transmission; `null` means no reading at that wavelength.

**`data/pigments.json`**: regular grid.
```json
{"w0":380, "s":1, "f":[["cobalt-blue", "Cobalt blue", [7.0, 7.1, ...]], ...]}
```
Wavelength is `w0 + i·s`. Values are percent reflectance.

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
