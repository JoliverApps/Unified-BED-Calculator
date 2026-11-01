/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * VERIFIED DATASETS for RD Framework Demonstration
 *
 * PARAMETER KEY:
 * - alpha_by_beta (Gy) : Standard LQ ratio.
 * - D_q           (Gy) : Shoulder displacement (High-dose tail intercept).
 * - D0            (Gy) : Mean lethal dose (High-dose tail slope inverse).
 *
 * NOTE: The app calculates internal state (k, r, s) from these three values.
 */

window.RD_DATA = {
  "NSCLC (α/β=10 Gy, Dq=0.1418 Gy; optimized from 13 prescriptions)": {
    alpha_by_beta: 10.0,
    D_q: 0.14178559892984927,
    D0: 0,
    desc: "Optimized from 13 prescriptions spanning conventional fractionation, hypofractionation, and SBRT, with α/β = 10 Gy. Optimal Dq = 0.1418 Gy; mean EQD2 = 59.22 Gy; SD = 7.60 Gy; 95% CI for mean EQD2 = 54.63–63.81 Gy; RSD = 12.84%; η = 0.450%. Dq values keeping EQD2 SD within 5% of its minimum span 0.0100–0.4636 Gy within the search range; the lower crossing was not reached. Unpublished calibration.",
    source: "",
    url: "",
    verified: true
  },

  "Prostate (α/β=1.5 Gy, Dq=3.5439 Gy; optimized from 8 prescriptions)": {
    alpha_by_beta: 1.5,
    D_q: 3.5438593425390432,
    D0: 0,
    desc: "Optimized from 8 definitive, curative-intent prescriptions for localized prostate cancer identified from NCCN, joint EAU–ESTRO, and ASTRO guidelines, restricted to single-phase treatment without a planned boost. With α/β = 1.5 Gy, optimal Dq = 3.5439 Gy; mean EQD2 = 75.82 Gy; SD = 2.15 Gy; 95% CI for mean EQD2 = 74.02–77.62 Gy; RSD = 2.84%; η = 0.117%. Dq values keeping EQD2 SD within 5% of its minimum span 3.2749–3.8357 Gy. Unpublished calibration.",
    source: "",
    url: "",
    verified: true
  }
};
