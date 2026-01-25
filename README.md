# Unified BED Calculator

Interactive web calculator for the **Unified Biologically Effective Dose (BED)** in the **Resilience–Depletion (RD)** framework, providing a closed-form isoeffect solution for radiotherapy fractionation comparisons.

**Live Demo:** [https://joliverapps.github.io/Unified-BED-Calculator/](https://joliverapps.github.io/Unified-BED-Calculator/)

---

> ⚠️ **Clinical Disclaimer**
>
> This is a non-validated, non-approved research demonstration tool intended solely to illustrate the calculations presented in the associated manuscript. **It must not be used for clinical decision-making.** Use is entirely at the end-user’s risk.

## Overview

This is a simple, static web application (HTML / vanilla JavaScript / Tailwind CSS) that serves as a companion tool for the paper:

*First-principles Resilience-Depletion (RD) model unifying BED from conventional to hypofractionated dose.*

The standard Linear–Quadratic (LQ) model is widely used but can mischaracterize survival and isoeffect at the high dose-per-fraction regimes used in SBRT/SRS. This tool implements the **RD survival-derived BED** from the paper, based on the postulate of **proportional depletion of resilience**, yielding a **single BED definition** that remains well-behaved from conventional fractionation to extreme hypofractionation.

![Screenshot of the Unified BED Calculator](uBED_app_v1.png)

## The Model Implemented

### Parameterization

The app is intentionally built around **three classical radiobiological inputs**:

- \(\alpha\) (Gy\(^{-1}\))
- \(\beta\) (Gy\(^{-2}\))
- \(D_0\) (Gy), where \(k \coloneqq 1/D_0\)

These are used to compute the RD parameters internally:

\[
k = \frac{1}{D_0}, \qquad r = 1-\alpha D_0, \qquad s = \frac{2\beta}{r k} = \frac{2\beta D_0}{r}.
\]

This design choice is deliberate: many published datasets provide \(\alpha\), \(\beta\), and (historically) a terminal-slope scale such as \(D_0\). The calculator therefore preserves the paper’s operational mapping without requiring ad hoc reparameterizations.

### Unified BED (RD, \(m=1\))

For a schedule with total dose \(D\) delivered in \(n\) fractions (\(d = D/n\)), the unified RD BED used in the calculator is:

\[
\mathrm{BED}(D,n;r,s)
=
\frac{D}{1-r}
-
\frac{n}{1-r}\frac{r}{s}\Bigl(1-e^{-s D/n}\Bigr).
\]

Isoeffect between two schedules \((D_1,n_1)\) and \((D_2,n_2)\) is defined by:

\[
\mathrm{BED}(D_1,n_1;r,s) = \mathrm{BED}(D_2,n_2;r,s).
\]

### Closed-form isoeffect solution (Lambert-\(W\))

The tool solves the isoeffect equation in closed form using the principal branch \(W_0\):

\[
D_2=\frac{n_2}{s}\Bigl(K+W_0\!\bigl(-r e^{-K}\bigr)\Bigr),
\]

with

\[
K\coloneqq r+\frac{s(1-r)}{n_2}\mathrm{BED}(D_1,n_1;r,s).
\]

The Lambert-\(W\) function is implemented in vanilla JavaScript via a robust iterative routine (principal branch).

### Special case: single-hit limit (\(s=0\))

The implementation explicitly handles the **\(s \to 0\)** limit (classical single-hit behavior). In this limit the RD hazard reduces to a purely linear form and BED becomes proportional to physical dose, so isoeffect reduces to:

\[
D_2 = D_1.
\]

The app detects \(s=0\) (within a small numerical tolerance) and applies this limit directly, avoiding division by \(s\) and avoiding the ill-defined intermediate quantity \(D_q=r/s\).

## Features

- **Isoeffect Solver:** Compute the equivalent total dose \(D_2\) and dose-per-fraction \(d_2\) for a target fraction count \(n_2\).
- **Closed-form Solution:** Uses the exact RD Lambert-\(W\) isoeffect solution (principal branch) for \(s>0\), plus a correct \(s=0\) limit.
- **Two Input Modes:** Toggle between:
  - **Classical mode** (\(\alpha,\beta,D_0\)) and
  - **RD mode** (\(r,s,k\)),
  with automatic conversion.
- **Preset Library:** `datasrc.js` provides curated presets storing **\(\alpha,\beta,D_0\)** plus traceability metadata.
- **Traceability Fields:** Each preset includes a memo-style citation plus optional **DOI** and **URL** fields.
- **Strong Input Validation:** Enforces physical/operational constraints before allowing computation:
  - \(\alpha>0\), \(\beta\ge 0\), \(D_0>0\)
  - \(k>0\), \(r<1\) (strict; \(r=1\) disallowed), \(s\ge 0\)
  - \(D_1>0\), \(n_1,n_2\in\mathbb{Z}_{>0}\)
- **Preset Safety Behavior:** If a preset is selected and the user edits any input field, the app automatically resets the preset dropdown to “— Select Tumor Type —” and clears all other inputs to prevent mixed provenance states.
- **Static & Lightweight:** Runs entirely in the browser; no server and no build step required.

## Repository Structure

Typical structure:

- `index.html` — UI markup
- `app.js` — application logic (validation, conversions, Lambert-\(W\), solver)
- `datasrc.js` — preset library (classical parameters + DOI/URL + source memo)
- `styles.css` — minimal overrides

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
