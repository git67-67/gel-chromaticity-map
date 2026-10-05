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

## Tests

`tests/maths.mjs` checks: equal energy at (1/3, 1/3); D65 at (0.3127, 0.3290); blackbody CCT round trip (2700 to 10 000 K, Duv ≈ 0); a grey filter halves Y and leaves chromaticity unchanged; each CAT is the identity for equal whites and maps W_A exactly to W_B.
