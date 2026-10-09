# Calculations

## Chromaticity of a filtered light

For a source spectrum S(λ) and a transmission (or reflectance) T(λ), on a 1 nm grid from 380 to 780 nm:

```
X = Σ S(λ) T(λ) x̄(λ)      Y = Σ S(λ) T(λ) ȳ(λ)      Z = Σ S(λ) T(λ) z̄(λ)
x = X/(X+Y+Z)             y = Y/(X+Y+Z)
u′ = 4X/(X+15Y+3Z)        v′ = 9Y/(X+15Y+3Z)
```
x̄ ȳ z̄ are the official CIE 1931 2° standard observer values at 1 nm. The relative luminance ("light out" / "reflectance") is `Y / Y₀`, where Y₀ is the same sum without T. This is relative to a perfect transmitter or perfect diffuser under the same light. Measured curves are resampled onto the grid by linear interpolation; outside the measured range the end values are held (or set to zero, as chosen).

## CCT and Duv

Correlated colour temperature and Duv are computed in the CIE 1960 (u, v) plane, where u = u′ and v = (2/3)v′. A table of 2000 Planckian points from 1000 to 25 000 K (log-spaced) is searched for the nearest point, then refined by projecting onto the two neighbouring segments. Duv is the signed distance to the locus, positive above it. CCT is withheld when |Duv| > 0.05 or the point falls at the end of the table.

## Blackbody and example sources

The blackbody spectrum is Planck's law with c₂ = 1.4388×10⁻² m·K. D65 is the CIE table (5 nm, interpolated). The *White LED* is a blue peak (452 nm, σ 8.5) plus broad phosphor emission (552 nm, σ 55) and a red component (625 nm, σ 45), scaled to about 5000 K. The *RGB white LED* is three Gaussians (462, 525, 628 nm) weighted so the mixture matches D65 white. Both are illustrative, not measurements of any product.

## Chromatic adaptation

A CAT is a 3×3 matrix **M** taking XYZ to a cone-like space, with gains per channel, and its inverse. With whites W_A and W_B (Y = 1) and degree of adaptation D:

```
(ρ,γ,β)_A = M·W_A       (ρ,γ,β)_B = M·W_B
gain_i = (D/ρ_Ai + 1 − D) / (D/ρ_Bi + 1 − D)
XYZ_B = M⁻¹ · diag(gain) · M · XYZ_A
```
With D = 1 this is the plain von Kries scaling. With D < 1, adaptation is incomplete as in CIECAM02's two-step form. D from viewing conditions: `D = F·(1 − (1/3.6)·e^((−L_A−42)/92))`, clamped to 0–1. Implemented matrices: identity (XYZ scaling), von Kries/Hunt-Pointer-Estévez, Bradford, CAT02, CAT16, Sharp and CMCCAT2000. Only this adaptation step of CIECAM02 and CAM16 is implemented, not the appearance model (no J, C, h).

**Truth** for the lab is the spectral XYZ of S_B·T divided by the Y of white B (S_B alone). **Prediction** is the CAT applied to the spectral XYZ under A, with both sides normalised to white Y = 1. **Error** is the Euclidean distance in the (u′, v′) plane. "No CAT" is the distance between the colour under A and the truth under B, i.e. the colour shift if nothing adapts.

## White-point treatment in LED compare

Light A has white W_A, light B has white W_B (XYZ scaled to Y = 1). A colour under B is mapped as if the eye had adapted from W_B to W_A, then compared with the same colour under A (or the reverse with "Move" set to A's colours).
- **Plain shift**: u′v′ → u′v′ + (u′_A − u′_B, v′_A − v′_B), the same vector for every colour.
- **CRI**: with c = (4 − u − 10v)/v and d = (1.708v + 0.404 − 1.481u)/v in CIE 1960 (u, v = u′, 2v′/3), c′ = (c_A/c_B)·c and d′ = (d_A/d_B)·d, then u = (10.872 + 0.404c′ − 4d′)/(16.518 + 1.481c′ − d′), v = 5.520/(16.518 + 1.481c′ − d′). Same code path as `cri.js`.
- **Matrix CAT**: ρ = M·XYZ (cone-like responses), gain per channel g_i = (D/ρ_s,i + 1 − D) / (D/ρ_t,i + 1 − D) with ρ_s, ρ_t the responses to the source and target white (Y = 1), XYZ′ = M⁻¹·(g ∘ ρ). With D = 1 this is ρ′_i = ρ_i · ρ_t,i/ρ_s,i; with D = 0 nothing changes. Implemented by `catGains`/`catApply` in `lab/cat.js`. D = 1, or D = F(1 − e^((−L_A−42)/92)/3.6) from the viewing conditions, or set by hand.
- **TM-30**: CAT02 with D = 1. TM-30 adapts test and reference to the same white inside CIECAM02; as that is a per-channel scaling, the B→A comparison equals one CAT02 step from W_B to W_A.

Tests (`tests/leds.py`) check that W_B maps exactly onto W_A for every method with D = 1, that D = 0 equals "off", and that the TM-30 option equals CAT02 with D = 1.

## CRI (CIE 13.3-1995)

Spectra are sampled every 5 nm from 380 to 780 nm. The reference light is a Planckian radiator below 5000 K and CIE daylight (D series) from 5000 K, at the test light's CCT. The 14 test colour samples are lit by both lights, converted to CIE 1960 UCS, and the sample under the test light is moved to the reference white with the CIE von Kries transform (`c`, `d` form of the standard). Colour differences are measured in U*V*W*, and R_i = 100 − 4.6 ΔE_i. Ra is the mean of R1–R8; R9–R14 are reported separately.

## TM-30 (IES TM-30 / CIE 224:2017)

- 99 colour evaluation samples (CES), CIE 1964 10° observer, 5 nm grid, 380–780 nm.
- Reference light at the CCT of the test light (1931 2° observer, 1000–25000 K): Planckian up to 4500 K, D series from 5500 K, a mixture in between weighted by (5500 − CCT)/1000 for the Planckian, each normalised to the same Y. CIE 224:2017 mixes over 4000–5000 K instead; `tm30(spd, cct, REF_CIE224)` uses that rule. The difference only matters for lights between about 4000 and 5500 K.
- Each sample, lit by the test and by the reference light, goes through CIECAM02 (L_A = 100 cd/m², Y_b = 20, average surround, D = 1, adapting to the light's own white) and then CAM02-UCS (J′, a′, b′).
- ΔE′ per sample is the Euclidean distance in J′a′b′. The scale is R_f,i = 10 ln(exp((100 − 6.73 ΔE′_i)/10) + 1); Rf uses the mean ΔE′ over the 99 samples.
- The samples are sorted into 16 hue bins of 22.5° by their hue angle under the reference light. The bin averages of (a′, b′) give a polygon for the test light and one for the reference; Rg = 100 × area(test)/area(reference).
- Per bin: Rf,h from the mean ΔE′ in the bin; chroma shift Rcs,h = (C′_test − C′_ref)/C′_ref and hue shift Rhs,h = the angle between the two bin-average vectors (radians), from the bin averages. The colour vector graphic plots the test bin averages divided by the reference chroma, so the reference lies on the unit circle. Rcs and Rhs follow these formulas; they are checked against an independent calculation of the same formulas, not against a published reference implementation.

## Validation against colour-science

`tests/reference-quality.json` holds values from the Python package `colour-science` (0.4.7) for 42 spectra: the CIE F1–F12 and F3.x fluorescent series, the CIE LED series, Planckians from 2200 to 10000 K, D65, A, three synthetic LEDs and two measured red LEDs. It is made by `tools/gen_quality_reference.py`. `tests/maths.mjs` compares at the reference CCT (so a few kelvin of difference between two CCT algorithms cannot move a sample across a hue-bin edge). Measured differences:

| Quantity | Largest difference |
|---|---|
| CCT (this tool's table against colour-science) | 0.13 % |
| CRI Ra | 0.010 |
| CRI R1–R14 | 0.058 |
| TM-30 Rf | 0.001 |
| TM-30 Rf,i (99 samples) | 0.007 |
| TM-30 Rg, Rcs (independent calculation) | 0.0001, 1e-6 |

Excluded from the CRI comparison, on purpose: lights with a CCT below 1800 K (the Robertson CCT table in colour-science starts at 1667 K and clamps below it, so its reference light is wrong there) and lights within 3 K of 5000 K (the Planckian/daylight switch).

**Very low CCT.** A deep red LED at 1100 K has almost no energy below 550 nm. Every sample is then lit by a thin tail, and CRI is dominated by how the reference light is chosen: shifting the reference CCT by ±50 K moves Ra by about ±3 for one LED and ±1 for another. Treat CRI and TM-30 below about 1700 K as indicative at best.

## Tests

`tests/maths.mjs` checks: equal energy at (1/3, 1/3); D65 at (0.3127, 0.3290); blackbody CCT round trip (2700 to 10 000 K, Duv ≈ 0); a grey filter halves Y and leaves chromaticity unchanged; each CAT is the identity for equal whites and maps W_A exactly to W_B; CRI and TM-30 against `colour-science` (above); and the LED file parser on both instrument header styles, long, wide and metadata layouts, decimal commas and quoted multi-line fields. `tests/leds.py [N]` drives the LED tabs in a browser with N generated LEDs (use 1000 for a scale check).
