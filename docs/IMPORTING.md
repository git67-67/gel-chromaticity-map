# Adding your own data: filters, pigments and LEDs

Everything you import is **saved in your browser** and is there next time you open the page. Nothing is uploaded anywhere. Ready-made files to copy are in `examples/templates/`.

## The short version

| I have… | Where to drop it | What the file looks like |
|---|---|---|
| Filter or gel spectra (transmission) | Colour map tab → *Your own filters* | a wide table, a long table, or one two-column file per filter |
| Paint or pigment spectra (reflectance) | same panel, set *Imported spectra are* to the right kind | same formats |
| LED spectra | LED library tab → *Import* (or the *Choose files / folder* buttons) | one file per LED, or many LEDs in one table |
| Names, CCT, CRI… for them | same panel as the spectra | a small table with an id column |

You can select many files at once, a whole folder, or drag and drop. Order does not matter: names and metadata can be imported before or after the spectra.

## Filters, gels, pigments (Colour map tab)

1. Under **Imported spectra are** choose what the data is: *Gels*, *Pigments*, *LEE filters*, *Munsell*, *CRI samples*… This sets the wording only (transmission or reflectance); the maths is the same.
2. Under **When I import** choose *Replace the current set* or *Add to the current set*.
3. Drop the file(s). The set is saved under that data set's name and shows up in the switch at the top.

Switching between data sets never loses an imported set. **Delete saved & restore built-in** removes the saved copy of the current data set; **Clear** empties it. **Keep only a subset** lets you reduce a big set to a list of names, and the reduced set is what gets saved.

### The three accepted layouts

**Wide**: first column the wavelength in nm, one column per filter. Easiest if you have a spreadsheet. See `examples/templates/filters_wide.csv`.
```
wavelength_nm,my-red,my-blue
380,0.02,0.05
400,0.02,0.14
```

**Long**: one row per filter and wavelength, with an id column. A `name` column is optional. See `filters_long.csv`.
```
filter_id,name,wavelength_nm,transmission
my-red,My Red,380,0.02
my-red,My Red,400,0.02
```
The id column may be `filter_id`, `pigment_id` or `id`. The value column may be `transmission` or `reflectance` (fractions 0–1) or `transmission_percent` / `reflectance_percent`.

**One file per filter**: two columns, wavelength and value, no id. The file name becomes the id. See `filter_single_my-red.csv`.

**Names** (optional, any time): `filter_id,name`. A leading catalogue number in the name ("101 My Red") is used as a short label. See `filter_names.csv`.

Rules for all layouts:
- Wavelengths in nm, any spacing (1, 5, 10 nm, irregular). Readings are interpolated onto the 380–780 nm grid. If your data covers less, *Outside the measured range* decides: hold the end value, or treat it as zero.
- Values as fractions (0–1) or percent (the page detects it: if any value is above 1.5 it divides by 100).
- At least 5 readings per spectrum.
- Delimiters `,` `;` tab or spaces; decimal commas when the delimiter is `;`; UTF-8 BOM and Windows line endings are fine.
- Reflectance is relative to a perfect white diffuser; transmission is relative to no filter.

### LEE filters
LEE data is not bundled. If you have collected it yourself, import it like any other filter set and choose *LEE filters*. `tools/lee_scraper.py` and `tools/lee_csv_to_json.py` exist for that; check LEE's terms first.

### Munsell
Choose *Munsell*, then import. If your Munsell spectra are one big text matrix, `tools/spectra_matrix_to_csv.py` converts it to a wide CSV (see `DATA_FORMATS.md`).

## LEDs (LED library tab)

A relative intensity is enough: spectra are scaled to a peak of 1. Use the range 380–780 nm; anything outside is ignored, gaps inside are interpolated, and a measurement that stops short of 420–680 nm gets a warning note. Negative values (dark-subtracted noise) become 0.

### One file per LED (typical spectrometer export)
`examples/templates/led_single.csv`
```
# cct,4100
# ra,82
# device,My Spectrometer
Wavelength (nm),Intensity
380,0.0004
400,0.0011
```
- The file name (without extension) is the LED's id.
- Lines at the very top that start with `#` and look like `# key,value` are read as numbers your instrument reported. Recognised keys: `cct`, `duv`, `ra`, `r9`, `rf`, `rg`, `x`, `y`, `device` (or `instrument`, `model`), `name`. A `metrics.` prefix and a unit such as `(K)` are ignored. The page also calculates its own values and shows both.
- The header row is optional.

### Many LEDs in one file
`led_wide.csv`: first column wavelength, one column per LED.
`led_long.csv`: `led_id,wavelength_nm,intensity`; the id column may also be `rid`, `id`, `sample`, `spectrum` or `file`, and a `name` column is optional.

### Descriptions for the LEDs (optional)
`led_metadata.csv`, one row per LED, matched by id:
```
rid,title,cct,duv,ra,r9,rf,rg,tag_LED Brand,notes
white-led,"My white LED, 4100 K",4100,0.001,82,10,80,98,Acme,bench measurement
```
`title` or `name` is the display name. `cct`, `duv`, `ra`, `r9`, `rf`, `rg` are the values you report. Every `tag_*` column becomes a searchable tag. `notes`, `uploader` and `url` are kept. This is also the layout of hcri.io report exports.

### Saving and removing
Imported LEDs are saved in the browser (1000+ is fine). **Remove imported** deletes them. Standard CIE sources are always built in and cannot be removed.

## Keeping a copy: backup file

*Download backup* (in both panels) writes one file, `gel-map-backup.json`, with all your imported spectra sets and all imported LEDs. *Load backup* puts them back, in this or another browser. If your browser does not start a download (some embedded viewers block it), use *Copy backup text* and paste the text into a file with that name.

## If nothing is saved

Saving needs browser storage. It is switched off in private windows, in some embedded viewers, and when site data is cleared on exit. The page tells you ("This page cannot store data here…"); everything still works until you close the tab, and the backup file is then the way to keep your data. The hosted copy (GitHub Pages) and a local copy opened via `http://localhost` store data normally. A file opened from disk (`file://`) works in most browsers too, but each browser treats it differently.

Storage is per browser and per address: data saved at one address is not visible at another, or in another browser. Clearing "site data" removes it.
