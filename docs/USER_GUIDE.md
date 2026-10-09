# User guide

Anything you import is saved in your browser and loaded automatically next time; see [IMPORTING.md](IMPORTING.md) for file layouts, saving and the backup file.

The page has two tabs, **Colour map** and **Adaptation lab**, and a switch in the top right for the data set: **Colour gels** (synthetic examples), **Artist pigments**, **CRI samples**, **TM-30 samples** or **ColorChecker**. LEE filters and Munsell chips are not built in: import your files and choose them under *Imported spectra are*. The switch applies to both tabs.

## Colour map

### 1. Data
- **Drop CSV files here** (or *Choose files* / *Choose folder*). The formats are in [DATA_FORMATS.md](DATA_FORMATS.md).
- **When I import**: *Replace the current set* (default) or *Add to the current set*.
- **Imported spectra are**: tells the page whether your data is transmission (filters) or reflectance (pigments). It only changes the wording and the CSV column names; the calculation is the same.
- **Keep only a subset**: paste a list (one per line: catalogue number, id or name) or load a text file, then press *Keep only these*. *Keep search results* keeps whatever the search box in section 3 currently shows. Anything not found is listed in the status line. This only changes what is loaded on the page; the built-in data is not touched, and *Restore built-in set* brings everything back.
- **Outside the measured range**: Many filter catalogues (LEE, for example) are measured only from 405 to 700 nm. The page works on 380–780 nm. *Hold the end values* repeats the first and last reading; *Treat as zero* blocks light outside the measurement. Gels are usually nearly flat in the far blue and red, so holding is the better default.

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

## LED library

The **LED library** tab holds every light source: 38 built-in CIE standard sources (F series, the newer LED series, A and D65) and any LED spectra you import. There is room for thousands; 1000 files import in a couple of seconds.

**Adding LEDs.** Drop files on the panel, or use *Choose files* / *Choose folder*. Three kinds of file work (details in [DATA_FORMATS.md](DATA_FORMATS.md)): one spectrum per file (an instrument export, `# key,value` header lines are read as the instrument's own numbers), one file with many spectra (long or wide), and a metadata table with a `rid` or `id` column that adds names, tags and reported CCT/Duv/Ra/R9/Rf/Rg. The table can be imported before or after the spectra. On the hosted copy the library is kept in your browser between visits (IndexedDB); inside a sandboxed page it lasts until you close it.

**Reading the chart.** Each point is one light on the u′v′ (or xy) diagram. *Colour points by* switches between TM-30 Rf, CRI Ra, TM-30 Rg, R9 and CCT; the ramp always spans the 2nd to 98th percentile of the lights shown, so a library full of 80–95 Ra LEDs still shows contrast. *Frame the lights* zooms to where they are. Grey points have no CCT, so no CRI or TM-30.

**Search and filters.** Search by name, model or tag. *Filter by CCT, Duv and rendering* keeps lights inside a CCT range, below a |Duv| limit, or above a minimum Ra, Rf or R9. The chart and the list always show the same set. *Copy table as CSV* copies the numbers for the lights currently shown (CCT, Duv, Ra, R1–R14, Rf, Rg, the 16 chroma and hue shifts, and your reported values) as CSV.

**The detail panel.** Spectrum (with the ideal reference light of the same CCT dashed), the TM-30 colour vector graphic, and a *Reported / This tool* table when the file carried its own numbers. Buttons send the light to the Colour map, to the compare tab as A or B, or straight to the partner search.

## LED compare

This is the tab for the question "what changes if I swap an LED for another one with the same CCT and Duv but a different CRI or TM-30?".

1. Pick **light A** (the one you have in mind) and **light B** (what you swap in). B starts as the *ideal reference light* of A: a blackbody or daylight spectrum with exactly the same CCT, which scores Ra = Rf = Rg = 100. That shows what A gets wrong compared with perfect rendering.
2. *Find a partner for A* lists every library light within a CCT window and a Duv window of A (defaults ±150 K and |ΔDuv| ≤ 0.003), sorted by Rf, Ra or Rg. Click a row to make it B. Because the chromaticity is almost the same, any difference you see is a rendering difference.
3. The chart plots every filter (or pigment) twice, worked out from its real spectrum: an open dot under A and a filled dot, coloured with the colour it gives, under B, joined by a line. **Shift magnification** stretches the lines (the open dot stays at the true position) so small differences become visible. **White-point difference** (a dropdown with advanced options, see below) takes out the part of the shift that comes only from the two lights having different white points, so only the change in how colours are rendered remains. *Frame the colours* zooms to the data.

**Brightness and absorbed energy.** The *Show* menu changes what the chart, the "Biggest changes" tiles and the list numbers show:
- *Colour shift*: as before (dots drawn in the colour under B).
- *Brightness change*: how much brighter (orange) or darker (blue) each item looks under B than under A, in % and in stops. This assumes both lights give the **same luminous flux** (same lumens). Then the filtered light is brighter under B by exactly the ratio of the two "light out" figures, (B ÷ A − 1). *Compare brightness at → equal radiant power* instead assumes the same watts; then the lights' own luminous efficacy (lumens per watt) is included, so a flat 50 % filter changes by that ratio. The detail panel also gives the change in lightness L\* (relative to a white of Y = 1).
- *Absorbed energy*: how many percentage points more (orange) or less (blue) of the light's radiant energy B's spectrum loses in the item than A's does.

*Light out* is what the eye sees: the spectrum weighted by the eye's sensitivity (Y). *Energy passed* and *Energy absorbed* are different: the plain sum of the light's power over 380–780 nm, with no eye weighting. A deep red filter under a blue-rich light can pass almost no light the eye sees yet pass a larger share of the energy, or the reverse, because the two weight the spectrum differently. Energy beyond 380–780 nm (UV, infra-red) is not in the data and not counted, and scattering by frost or diffusion filters is not modelled, so "absorbed" is "not passed". The same two numbers (*Energy passed*, *Energy absorbed*) are in the Colour map detail panel, the sort menu and the CSV for the selected light source.

**Apparent change: colour and brightness together.** A colour shift and a brightness change are two parts of one thing the eye sees, so *Show → Apparent change* puts both in one perceptual colour space and measures the distance between the colour under A and the colour under B. That distance is **ΔE**. Rule of thumb: about 1 is barely visible side by side, 2–3 is visible, above 5 is a clear difference. The detail panel splits ΔE into the lightness part (ΔL*), the chroma part (ΔC*, more or less saturated) and the hue part (ΔH*); a change that is mostly lightness is a brightness change, a change that is mostly chroma and hue is a colour change.
- **CIELUV** (default): L*, u*, v* with the other light's white as the reference. It follows the *White-point difference* setting, so with the setting off the white-point change counts as part of the colour change; choose a method there to leave only the rendering change. It uses your brightness basis (equal lumens or equal watts).
- **CAM02-UCS** (J′, a′, b′): the CIECAM02 appearance model with complete adaptation, the same model TM-30 uses. Each colour is judged against its own light's white, which removes the white-point change by itself, so the white-point setting and the equal-watts option do not apply to it. It is the better choice for large differences.

The **3D view** under the chart draws every item under A (open dot) and under B (filled dot) in that space: lightness upright, the colour plane flat, grey in the middle. ΔE is the straight-line distance between the two dots. Drag to rotate, wheel to zoom, click a dot to select it; *Top* shows the colour plane only (like the chromaticity diagram) and *Side* shows lightness against colour. The same *Show* menu colours the dots by ΔE.

**White-point difference.** Swapping A for B moves a colour for two reasons: the lights render it differently, and the whole scene turns warmer or cooler. The dropdown chooses how the second part is removed (the eye mostly adapts to it):
- *Off*: the real difference, white point included.
- *Plain shift in u′v′*: every colour is moved by the vector between the two white points.
- *CRI method*: von Kries in CIE 1960 u,v, as CIE 13.3 does for the colour rendering index.
- *TM-30 method*: CAT02 with complete adaptation, the adaptation step of CIECAM02 that TM-30 uses.
- *Matrix CAT*: XYZ scaling, von Kries (HPE), Bradford, CAT02, CAT16, Sharp or CMCCAT2000, with the degree of adaptation D (complete, from viewing conditions L<sub>A</sub> and surround, or by hand).

*Advanced options* also let you choose which light stays fixed: B's colours are moved to A's white (default), or A's colours to B's. In every method the source light's white lands exactly on the target white, so what is left is the colour rendering difference. The panel itself carries a longer explanation.
4. The summary line gives the mean, median, 90th percentile and largest Δu′v′. As a rough guide, differences under about 0.002 are hard to see and above about 0.01 are obvious side by side.
5. The **TM-30 colour vector graphics** overlay A and B. The circle is each light's own reference; a dot outside it means that hue is more saturated, inside less, sideways a hue shift. The **table** gives CCT, Duv, Ra, R9, Rf and Rg for both and the difference. *Biggest changes* shows A and B as pairs of swatches.
6. Click a filter on the chart or in the list to see its spectrum together with the light that leaves it under A and under B.

The Colour map and the Adaptation lab also accept a library light: choose *LED library* as the source and search.

## CRI and TM-30 in this tool

CRI (CIE 13.3-1995, Ra and R1–R14) and TM-30 (IES TM-30 / CIE 224:2017: Rf, Rg, per-hue-bin fidelity, chroma shift Rcs and hue shift Rhs) are calculated for every light, and for the light that comes out of every filter in the Colour map (columns *CRI Ra*, *R9*, *TM-30 Rf*, *TM-30 Rg* in the detail panel, the sort menu and the CSV). For a pigment the numbers describe the reflected light and are informative only: a pigment is not a light source.

Treat them with care when:
- **|Duv| is above 0.0054.** The standards do not recommend CRI or TM-30 there. The numbers are still computed.
- **There is no CCT** (|Duv| > 0.05 or outside 1000–25000 K). No value is shown.
- **CCT is below about 1700 K.** CRI and TM-30 become very sensitive to the reference light. For one deep-red LED a 50 K change in the reference CCT moved Ra by several points, and different tools disagree. See [MATHS.md](MATHS.md).
- **The spectrum is noisy or truncated.** Noise at the ends adds light the real LED does not emit. The library warns when the measurement does not cover 420–680 nm and clips negative values.

## What the numbers are not

- Not a measurement of how a surface looks in a scene: no gloss, no surround, no brightness adaptation.
- Not full CIECAM02/CAM16: only the adaptation step is implemented.
- Not a replacement for a spectrometer: results are as good as the curves, and published curves are usually 5–10 nm resolution.
