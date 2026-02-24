/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * VERIFIED DATASETS for RD Framework Demonstration
 *
 * PARAMETER KEY:
 * - alpha_by_beta (Gy) : Standard LQ ratio (Clinical/Fe-plot derived).
 * - D_q           (Gy) : Shoulder displacement (High-dose tail intercept).
 * - D0            (Gy) : Mean lethal dose (High-dose tail slope inverse).
 *
 * NOTE: The app calculates internal state (k, r, s) from these three values.
 */

window.RD_DATA = {

"NSCLC (Clinical standardization)": {
  alpha_by_beta: 10.0,
  D_q: 1.8,
  D0: 1.25,
  desc: "NSCLC clinical back-projection benchmark. Uses a standardized low-dose α/β = 10 Gy (clinical/Fe-plot convention) and tail descriptors D0 = 1.25 Gy, Dq = 1.8 Gy taken from Park et al. for high-dose behavior.",
  source: "α/β standardization: clinical convention; D0 and Dq: Park, C., et al. (2008). Int J Radiat Oncol Biol Phys, 70(3).",
  url: "https://doi.org/10.1016/J.IJROBP.2007.10.059",
  verified: true
},

  "CHO-K1 (Original paper)": {
    alpha_by_beta: 0.984594,
    D_q: 3.917012,
    D0: 1.100110,
    desc: "From Oliveira, JM original paper. Demonstrates high-shoulder behavior with low alpha/beta ratio.",
    source: "Oliveira, JM (Original Paper)",
    url: "",
    verified: true
  },

  "XRS6 (Original paper)": {
    alpha_by_beta: -4.970032,
    D_q: -1.034257,
    D0: 1.461988,
    desc: "From Oliveira, JM original paper. Represents a repair-deficient phenotype with negative shoulder displacement.",
    source: "Oliveira, JM (Original Paper)",
    url: "",
    verified: true
  }
  
};
