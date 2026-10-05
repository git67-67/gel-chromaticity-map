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

## Add a metric (CRI, TM-30, ...)

A metric is a function of the light that reaches the eye. Copy `src/js/metrics/peak-wavelength.js`:

```js
registerMetric({
  id: 'cri', title: 'Colour rendering',
  columns: [
    { key: 'ra', label: 'CRI Ra', digits: 0, sortable: true },
    { key: 'r9', label: 'R9',     digits: 0, sortable: true },
  ],
  compute(ctx) {
    // ctx.spd, ctx.T, ctx.out (spd*T), ctx.xyz, ctx.chroma, all on the 380-780 nm 1 nm grid
    return { ra: ..., r9: ... };
  }
});
```

Then add `metrics/cri.js` to `src/js/manifest.txt` after `metrics/registry.js`. The detail panel, the CSV export and the sort menu pick the columns up; nothing else changes. `compute` is called for every item and for the bare source (`ctx.T === null`), inside try/catch, so a failing metric does not break the page.

Notes for CRI and TM-30 specifically:
- Both need tables that are not in this repository: the CIE 13.3 test colour samples (TCS01–14) for CRI, and the 99 colour evaluation samples (CES) plus the CIE 1964 10° observer for TM-30 (IES TM-30-20 / CIE 224:2017). They can be taken from the Python package `colour-science` (`colour.SDS_COLOURCHECKERS`, `colour.COLOURS_RENDERING_INDEX…`, or the TM-30 sample set shipped with it) and written to `data/*.json`, then embedded with a `data NAME path` manifest line.
- Compute the test-source and reference-source reflected spectra on the 380–780 nm grid, `ctx.out` being the test source.
- Put the maths in `core/` (pure functions, testable in `tests/maths.mjs`) and keep the metric file as a thin wrapper.
- Check your implementation against known values: for example CIE illuminant F-series spectra have published Ra, and a Planckian or D-series reference has Ra = 100 by definition.
- Remember what `ctx.out` is: a filter changes the light. Ra of "LED through filter" is a valid question, but a filter alone is not a light source.

For non-numeric output (a colour-vector graphic for TM-30) a metric would also need a view; the registry only handles scalar columns. Add a panel under `app/` for that and call it from `renderDetail()`.

## Add a CAT

Edit `src/js/lab/cat.js`: add an object to `CATS` with `id`, `name`, `short`, the 3×3 matrix `M` (XYZ to cone-like space) and a one-line `note`. Add a colour variable `--k<index>` to `base.css`/`lab.css` for the new row if you add beyond seven. `tests/maths.mjs` automatically checks that the new transform maps white A onto white B and is the identity when the whites are equal.

## Conventions

- Colours are CSS custom properties on `:root` with dark-mode overrides, never hard-coded in JavaScript. Canvas code reads them with `readCols()` / `readLCols()`.
- Wavelength arrays are `Float64Array(N)` on the 380–780 nm grid. Index `i` is `380 + i` nm.
- Function names are global. Both tabs once defined a `drawSpectrum`; the second silently replaced the first and blanked a plot. Prefix tab-specific functions (`drawSpec` is the map tab's, `drawLabSpectrum` the lab's) and let the smoke test guard it.
- Rebuild and run both tests before committing; commit `dist/index.html`.
