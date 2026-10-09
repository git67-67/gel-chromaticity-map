# Architecture

The page is built from small files by `tools/build.py` into one self-contained `dist/index.html`. There is no framework and no module system: all JavaScript shares one global scope, and the order of files is set in `src/js/manifest.txt`.

```
src/index.html          template: <!--@include partials/x.html-->, <!--@css-->, <!--@js-->
src/css/*.css           concatenated (base.css first)
src/js/manifest.txt     JavaScript build order; `data NAME path` embeds a JSON file as `const NAME=...;`
```

## Layers

| Folder | Depends on | Contents |
|---|---|---|
| `core/` | nothing (no DOM) | the 380–780 nm grid (`N`, `WLS`), CIE 1931 tables (`XB`,`YB`,`ZB`), `sums`, `chroma`, Planck, D65, CCT/Duv (`cctDuv`), display colour (`rgbOfXY`), `resample`, `evalFilter`, example LED spectra |
| `metrics/` | `core/` | the metric registry and one file per metric |
| `app/` | `core/`, `metrics/` | colour map tab: `state.js` (`st`), data-set registry, import, subset, calculation, list, diagram, interaction |
| `lab/` | `core/`, `app/` | adaptation lab: CAT matrices (`cat.js`), state, computation, diagram, panels |
| `boot.js` | all | start-up, runs last |

`tests/maths.mjs` loads only `core/*` and `lab/cat.js` in a bare Node context. If that test passes, the colour science works without a browser. Keep `core/` free of DOM code so this stays true.

## Data flow

```
data set (registry) ─┐
CSV import ──────────┴─> st.filters (Map id -> {id,name,code,lab,wl,v,T,res})
light source ─> st.spd ─┐
                        ├─ recompute() ─> f.res = {x,y,u,v,Yr,cct,duv,shift,css,m:{metric values}}
f.T (1 nm curve) ───────┘                         │
                                                  └─> renderAll(): list, detail, diagram, lab
```
`recompute()` (in `app/calc.js`) runs whenever the source, the edge mode or the set of filters changes. The lab (`lab/compute.js`) re-reads `st.filters` and the two lab sources.

## Add a data set

A data set is one `registerDataset({...})` call. Example: a second gel maker, `data/rosco.json` in the format of `pigments.json` (`{"w0":380,"s":1,"f":[[id,name,[percent...]]]}`).

1. Make the data: `python3 tools/spectra_folder_to_json.py rosco_folder/ -o data/rosco.json`
2. Copy `src/js/app/datasets/pigments.js` to `src/js/app/datasets/rosco.js`. Change the `id`, `label`, `noun`, `measure`, the `vocab` words (`filter`, `filters`, `Out`, `curve`, `attrib`, `sel` = the id selected at start, ...) and the data variable name.
3. In `src/js/manifest.txt`, after the other data sets add:
   ```
   data ROSCO_DATA data/rosco.json
   app/datasets/rosco.js
   ```
4. `python3 tools/build.py`. The header switch, the *Imported spectra are* selector and every label pick it up. Nothing else changes.

`entries()` must return `[{id, name, code?, wl:[nm...], v:[fraction 0..1...]}]`. Use `code:''` and `noCode:true` in `vocab` when the set has no catalogue numbers; the number column is then hidden (`html[data-nocode]` in `src/css/layout.css`).

The words shown in the page come from `vocab` through `{token}` placeholders: any element with class `tk` has its original HTML kept as a template and re-rendered when the data set changes (`applyTerms()`); attributes use `data-tk-al` (aria-label) and `data-tk-ph` (placeholder). In JavaScript use `tk('Pick a {filter}')`.

## Add a metric

A metric is a function of the light that reaches the eye. CRI and TM-30 are built this way: `src/js/metrics/colour-rendering.js` is a thin wrapper over `core/cri.js` and `core/tm30.js` and is the best template. The smallest example is `metrics/peak-wavelength.js`:

```js
registerMetric({
  id: 'peak', title: 'Output peak',
  heavy: false,                     // true = computed after the page has drawn, in small slices (see below)
  columns: [{ key: 'peakNm', label: 'Peak', digits: 0, unit: ' nm', sortable: true }],
  compute(ctx) {
    // ctx.spd, ctx.T, ctx.out (spd*T), ctx.xyz, ctx.chroma, all on the 380-780 nm 1 nm grid
    return { peakNm: ... };
  }
});
```

Add the file to `src/js/manifest.txt` after `metrics/registry.js`. The detail panel, the CSV export and the sort menu pick the columns up. `compute` is called for every item and for the bare source (`ctx.T === null`), inside try/catch, so a failing metric does not break the page. Return `null` for a value that does not exist; it shows as a dash.

**Heavy metrics.** CRI plus TM-30 cost about 1 ms per spectrum, which would make a CCT slider stutter with ~300 filters. Setting `heavy: true` makes `recompute()` skip the metric for the first draw and `runHeavy()` fill it in afterwards in 25 ms slices, then redraw the list and the detail panel. Sorting by a heavy column works once it has finished; a new `recompute()` cancels the pass in progress.

Put the maths in `core/` (pure functions, tested in `tests/maths.mjs`) and keep the metric file thin. Check against known values: CIE F-series and LED-series illuminants have published scores, and a Planckian or D-series source has Ra = Rf = Rg = 100 by definition.

For non-numeric output (the TM-30 colour vector graphic) the registry only handles scalar columns; draw it from the result object instead, as `led/plots.js` does.

## LED library, picker and the two LED tabs

```
core/reference-light.js   Planckian and D-series on a 5 nm grid; the reference-light rules (CRI hard switch at 5000 K, TM-30 mix 4500-5500 K, CIE 224 mix 4000-5000 K)
core/cri.js               cri(spd, cct) -> {Ra, R[14]}
core/tm30.js              tm30(spd, cct, rule) -> {Rf, Rg, Rfi[99], Rfh[16], Rcs[16], Rhs[16], bins}
core/quality.js           quality(spd) -> chromaticity, CCT, Duv, cri, tm30 in one call
led/parse.js              ingestLED(text, fileName) -> {kind:'spectra'|'meta', ...}, cleanLED(), parseCSVFull()
led/library.js            LED store: items, import in slices, metadata merge, IndexedDB persistence, ledReference()
led/picker.js             mountPicker(host, {get, set, text}): searchable chooser (max 80 rows rendered)
led/plots.js              plotSpectra(), plotCVG(), seqColor(): small canvas plots used by both LED tabs
led/tab.js                LED library tab (state object `ld`)
led/compare.js            LED compare tab (state object `cmp`)
```

A light source anywhere in the app is an object `{src, ...}` resolved by `spdOf()` (lab/sources.js): `bb` (blackbody at `cct`), `lib` (library item `id`), `ref` (ideal reference of library item `id`), or one of the built-in examples. To add a new kind of source, add a case there and in `srcName()`.

Library items hold `spd` (1 nm grid, peak 1) and `q = quality(spd)`, computed once at import. `LED.listeners` are called after every change; each tab registers one and re-renders only if it is visible.

Tabs are listed in `TABS` (lab/tabs.js). A new tab needs a partial, a button in `partials/header.html`, an entry in `TABS`, and a show function.

## Add a CAT

Edit `src/js/lab/cat.js`: add an object to `CATS` with `id`, `name`, `short`, the 3×3 matrix `M` (XYZ to cone-like space) and a one-line `note`. Add a colour variable `--k<index>` to `base.css`/`lab.css` for the new row if you add beyond seven. `tests/maths.mjs` automatically checks that the new transform maps white A onto white B and is the identity when the whites are equal.

## Conventions

- Colours are CSS custom properties on `:root` with dark-mode overrides, never hard-coded in JavaScript. Canvas code reads them with `readCols()` / `readLCols()`.
- Wavelength arrays are `Float64Array(N)` on the 380–780 nm grid. Index `i` is `380 + i` nm.
- Function names are global. Both tabs once defined a `drawSpectrum`; the second silently replaced the first and blanked a plot. Prefix tab-specific functions (`drawSpec` is the map tab's, `drawLabSpectrum` the lab's) and let the smoke test guard it.
- Rebuild and run both tests before committing; commit `dist/index.html`.

## Saved data

`app/store.js` keeps user-imported spectra per data set in IndexedDB (`gelmap-sets`, key `set:<id>`, plus `last` = last data set used) and builds/restores the backup JSON (`format: gel-chromaticity-map-library`, `sets`, `leds`). `importFiles`, `keepOnly` and Clear call `usSaveSoon()`/`usDelete()`. `loadBuiltin(kind)` shows the saved set if one exists, so a saved set replaces the built-in one until you delete it; data sets with no built-in spectra (LEE, Munsell) appear in the header switch only while a saved set exists (`hasSet`). The LED library saves itself in `led/library.js`. Tests: `tests/persist.py`.
