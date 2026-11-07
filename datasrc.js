/**
 * Unified BED Calculator parameter presets.
 *
 * PARAMETER KEY:
 * - alpha_by_beta (Gy): Strict low-dose alpha/beta ratio.
 * - D_q (Gy): Dose-axis intercept of the extrapolated high-dose tail.
 * - desc, source, url: Preset description and reference.
 * - verified: Whether the preset is available in the selection list.
 *
 * The app reconstructs r and s from alpha_by_beta and D_q.
 * D0 entries provide additional data; D0 and k are not used by the calculator.
 */

window.RD_DATA = {
  "NSCLC (α/β=10, Dq=1.8, Oliveira, 2026)": {
    alpha_by_beta: 10.0,
    D_q: 1.8,
    D0: 1.25,
    desc: "From the original resilience depletion paper. Uses a standardized low-dose α/β = 10 Gy (clinical/Fe-plot convention) and tail descriptors D0 = 1.25 Gy, Dq = 1.8 Gy taken from Park et al. (2008) for high-dose behavior.",
    source: "Oliveira JM. Resilience–depletion hypothesis: Unifying BED from conventional to ablative radiotherapy. Med Phys. 2026; 53:e70490. https://doi.org/10.1002/mp.70490",
    url: "https://aapm.onlinelibrary.wiley.com/doi/abs/10.1002/mp.70490",
    verified: true
},
  
  "NSCLC (α/β=10 Gy, Dq=0.1418 Gy; 13 prescriptions)": {
    alpha_by_beta: 10.0,
    D_q: 0.1418,
    D0: 0,
    desc: "Optimized from 13 prescriptions spanning 2.0 to 22.0 Gy per fraction. With α/β = 10 Gy fixed, the results are: optimal Dq = 0.1418 Gy; mean EQD2 = 59.22 Gy; SD = 7.60 Gy; 95% CI for mean EQD2 = 54.63–63.81 Gy; RSD = 12.84%; η = 0.450%.",
    source: "",
    url: "",
    verified: false
  },

  "Prostate (α/β=1.5 Gy, Dq=3.5439 Gy; 8 prescriptions)": {
    alpha_by_beta: 1.5,
    D_q: 3.5439,
    D0: 0,
    desc: "Optimized from 8 prescriptions spanning 1.8 to 9.5 Gy per fraction. With α/β = 1.5 Gy fixed, the results are: optimal Dq = 3.5439 Gy; mean EQD2 = 75.82 Gy; SD = 2.15 Gy; 95% CI for mean EQD2 = 74.02–77.62 Gy; RSD = 2.84%; η = 0.117%.",
    source: "",
    url: "",
    verified: true
  }
};

