# User guide

The page has two tabs, **Colour map** and **Adaptation lab**, and a switch in the top right for the data set: **LEE filters** or **Artist pigments**. The switch applies to both tabs.

## Colour map

### 1. Data
- **Drop CSV files here** (or *Choose files* / *Choose folder*). The formats are in [DATA_FORMATS.md](DATA_FORMATS.md).
- **When I import**: *Replace the current set* (default) or *Add to the current set*.
- **Imported spectra are**: tells the page whether your data is transmission (filters) or reflectance (pigments). It only changes the wording and the CSV column names; the calculation is the same.
- **Keep only a subset**: paste a list (one per line: catalogue number, id or name) or load a text file, then press *Keep only these*. *Keep search results* keeps whatever the search box in section 3 currently shows. Anything not found is listed in the status line. This only changes what is loaded on the page; the built-in data is not touched, and *Restore built-in set* brings everything back.
- **Outside the measured range**: LEE filters are measured from 405 to 700 nm. The page works on 380–780 nm. *Hold the end values* repeats the first and last reading; *Treat as zero* blocks light outside the measurement. Gels are usually nearly flat in the far blue and red, so holding is the better default.

### 2. Light source
White LED and RGB LED are example spectra built from Gaussian peaks. D65 is the CIE daylight table. Blackbody has a temperature slider (1000–25 000 K). Equal energy is a flat spectrum. *Import your LED spectrum* takes two columns, wavelength in nm and relative intensity.

### 3. List
Search by name or number, sort by number/name, light transmitted, colour shift, CCT, Duv, or any sortable metric plug-in. Click a row to select it. *Copy results as CSV* copies the table (including metric columns) to the clipboard. If the clipboard is blocked the text appears in a box for you to copy by hand.

### The diagram
Switch between **CIE 1931 xy** and **CIE 1976 u′v′**. u′v′ is closer to how big a difference looks. Scroll or pinch to zoom, drag to pan, ⤢ resets. The curved edge is the spectral locus (pure single wavelengths, labelled in nm); the straight edge is the line of purples. The dotted curve is the Planckian locus (blackbody colours) with temperatures marked.

- A **dot's position** is the chromaticity of the light that comes out: source spectrum × the filter's curve (or the pigment's reflectance).
- A **dot's colour** is that chromaticity drawn at constant brightness. It does not show how dark the sample is; a black pigment can look as bright as a white one. Use the *Light out* / *Reflectance* number for brightness.
- The **ring** marks the selected item and the cross marks the bare source.

### Detail panel
For the selected item: the percentage of light that comes out (relative to a perfect transmitter or diffuser), x, y, u′, v′, CCT, Duv, the shift in u′v′ from the bare source, any metric plug-ins, and a spectrum plot: source (grey), filter or pigment curve (dashed), resulting light (coloured).

*CCT* and *Duv* describe how far a colour is from the blackbody curve. CCT is shown only when Duv is within ±0.05; far from the curve the number would mean nothing.

## Adaptation lab

**The question.** A filter looks one colour under tungsten and another under daylight. A chromatic adaptation transform (CAT) tries to predict the second from the first, using only the colour under light A and the white points of A and B. The lab measures how wrong each CAT is by comparing with the colour calculated from the full spectra.

1. **Light A (from)** and **Light B (to)**: choose a source each (same choices as the colour map, including blackbody temperatures and your imported LED).
2. **Degree of adaptation D**: *Complete* (D = 1, a plain von Kries-type transform), *From viewing conditions* (the CIECAM02 formula from the adapting luminance L_A and surround factor F), or *Set by hand* (0 to 1).
3. **Which CAT is closest?** is the leaderboard: mean, median, 95th percentile and worst error across the loaded items, in Δu′v′ × 1000. The grey row (*No CAT*) is the real shift if nothing is adapted, so a CAT must beat it to be useful. *Only … passing ≥* removes very dark items and *Skip near-neutral* removes items that barely change colour (they make every CAT look good).
4. **One filter, all CATs** shows the selected item: a dashed arrow from its colour under A to the true colour under B (big dot), and one diamond per CAT showing where that CAT puts it. **All filters, one CAT** draws a whisker from every true point towards the chosen CAT's prediction, magnified (slider). Long whiskers are items this CAT gets wrong.
5. The **list** ranks items by error for the selected CAT (worst first by default). The last two columns are that CAT's error and the CAT that does best for that item.
6. **Step by step** shows the matrix arithmetic for the selected item. **Why a CAT cannot be exact** explains it: two spectra can give the same XYZ under A and different XYZ under B (metamers); the CAT receives only XYZ so it cannot tell them apart.
7. The spectrum plot also draws the three sensitivities of the selected CAT (its cone-like space), scaled to their peaks.

The error is Δu′v′ in the 1976 diagram. Metamerism is the main reason a CAT is not exact, so the biggest errors tend to be narrow-band, strongly coloured filters.

## What the numbers are not

- Not a measurement of how a surface looks in a scene: no gloss, no surround, no brightness adaptation.
- Not full CIECAM02/CAM16: only the adaptation step is implemented.
- Not a replacement for a spectrometer: results are as good as the curves, and published curves are usually 5–10 nm resolution.
