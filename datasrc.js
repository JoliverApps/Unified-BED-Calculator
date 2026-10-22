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

"NSCLC (α/β=10, Dq=1.8, Oliveira, 2026)": {
  alpha_by_beta: 10.0,
  D_q: 1.8,
  D0: 1.25,
  desc: "From the original resilience depletion paper. Uses a standardized low-dose α/β = 10 Gy (clinical/Fe-plot convention) and tail descriptors D0 = 1.25 Gy, Dq = 1.8 Gy taken from Park et al. (2008) for high-dose behavior.",
  source: "Oliveira JM. Resilience–depletion hypothesis: Unifying BED from conventional to ablative radiotherapy. Med Phys. 2026; 53:e70490. https://doi.org/10.1002/mp.70490",
  url: "https://aapm.onlinelibrary.wiley.com/doi/abs/10.1002/mp.70490",
  verified: true
},
"Prostate (α/β=1.5, Dq=5.7306, Oliveira optimization)": {
  alpha_by_beta: 1.5,
  D_q: 5.7306,
  D0: ,
  desc: "Optimized from a set of clinically adopted treatment schedules ranging from 5 to 41 fractions.",
  source: "",
  url: "",
  verified: true
},
  
};
