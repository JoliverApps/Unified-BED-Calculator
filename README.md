# Unified BED Calculator

Interactive web calculator for the **Unified Biologically Effective Dose (BED)** in the **Resilience–Depletion (RD)** framework, providing a closed-form isoeffect solution for radiotherapy fractionation comparisons.

**Live Demo:** [https://joliverapps.github.io/Unified-BED-Calculator/](https://joliverapps.github.io/Unified-BED-Calculator/)

---

> ⚠️ **Clinical Disclaimer**
>
> This is a non-validated, non-approved research demonstration tool intended solely to illustrate the calculations presented in the associated manuscript. **It must not be used for clinical decision-making.** Use is entirely at the end-user’s risk.

## Overview

This is a simple, static web application (HTML/JS/Tailwind CSS) that serves as the companion tool for the paper: *"Resilience-Depletion Hypothesis: Unifying Biological Effective Dose (BED) from conventional to hypofractionated radiotherapy"*.

*First-principles Resilience-Depletion (RD) model unifying BED from conventional to hypofractionated dose.*

The standard Linear–Quadratic (LQ) model is widely used but can mischaracterize survival and isoeffect at the high dose-per-fraction regimes used in SBRT/SRS. This tool implements the **RD survival-derived BED** from the paper, based on the postulate of **proportional depletion of resilience**, yielding a **single BED definition** that remains well-behaved from conventional fractionation to extreme hypofractionation.

![Screenshot of the Unified BED Calculator](uBED_app_v1.png)

## The Model Implemented

The calculation is based on the unified Biologically Effective Dose (BED) derived in the paper. Unlike the LQ model, this formulation describes the full dose-response curve, including the high-dose linear tail.

The Unified BED equation is:

$$
\mathrm{BED}(D,n;r,s) = \frac{D}{1-r} - \frac{n r}{s(1-r)}\Bigl(1-e^{-s D/n}\Bigr)
$$

Where:
* $D$ is the total dose.
* $n$ is the number of fractions.
* $r$ is the **Initial Resilience** (probability of surviving the first strike).
* $s$ is the **Sensitization Rate** (rate of resilience depletion).

To find an equivalent total dose $D_2$ for a new schedule of $n_2$ fractions, the tool solves the isoeffect equation $\mathrm{BED}(D_1, n_1) = \mathrm{BED}(D_2, n_2)$. It uses the exact, closed-form solution derived in the paper, which relies on the principal branch of the **Lambert-$W$ function**:

$$
D_2 = \frac{n_2}{s}\Bigl(K+W_0\!\bigl(-r e^{-K}\bigr)\Bigr)
$$

This design choice is deliberate: many published datasets provide \(\alpha\), \(\beta\), and (historically) a terminal-slope scale such as \(D_0\). The calculator therefore preserves the paper’s operational mapping without requiring ad hoc reparameterizations.

$$
K \coloneqq r + \frac{s(1-r)}{n_2} \mathrm{BED}(D_1,n_1;r,s)
$$

This approach provides a single, consistent method for comparing all fractionation schedules without the limitations of the LQ model. It is backward-compatible with LQ at low doses while correcting for high-dose overestimation.

## Features

* **Calculate Equivalent Dose:** Find the equivalent total dose ($D_2$) and new dose-per-fraction ($d_2$) for a target number of fractions ($n_2$).
* **Closed-Form Solution:** Uses a direct, exact calculation via the Lambert-$W$ function (implemented in vanilla JavaScript with Halley's method for precision).
* **Automatic Parameter Conversion:** Inputs can be standard LQ parameters ($\alpha, \beta, D_0$), which are automatically converted to the RD framework parameters ($r, s, k$).
* **Robust Edge Case Handling:** Correctly handles the single-hit limit ($s \to 0$ or $\beta \to 0$) where the BED reduces to physical dose.
* **Cell Line Presets:** Includes pre-filled parameters for cell lines analyzed in the paper (e.g., T-47D, A549, XRS5).
* **Handles Heterogeneity:** The model allows for an **effective negative resilience ($r < 0$)**, correctly describing the biphasic survival curves of heterogeneous populations (e.g., XRS lines) often mischaracterized by standard models.
* **Lightweight & Static:** Runs entirely in the browser. No server or build step required.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
