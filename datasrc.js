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

  "NSCLC (average by Park et al)": {
    alpha_by_beta: 8.604798, 
    D_q: 1.8,
    D0: 1.25,
    desc: "NCI-H460 Non-Small Cell Lung Cancer. Parameters explicitly used to derive and validate the Universal Survival Curve (USC) model.",
    source: "Park, C., Papiez, L., Zhang, S., Story, M., & Timmerman, R. D. (2008). Int J Radiat Oncol Biol Phys, 70(3).",
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
  },

  /* UNVERIFIED----------------------------------------------------*/
  
  "Rhabdomyosarcoma (Pediatric)": {
    alpha_by_beta: 9.022222,
    D_q: 9.2,
    D0: 3.2,
    desc: "Pediatric Rhabdomyosarcoma cell line. Shows extreme radioresistance with a massive shoulder.",
    source: "Al-Shaick, H., Al-Bairmani, S., & Al-Jawad, F. (2015). Radiation Survival Curve for Pediatric Rhabdomyosarcoma Cells.",
    url: "https://www.irpa.net/members/P01.33a.pdf",
    verified: false /*This source and data is verifiable. The datapoints in the sample however, do not indicate that a proper tail was achieved to conclude in the values of D_0, but specialy D_q */
  },

  "Glioblastoma (U87MG - Stem-Like)": {
    alpha_by_beta: 14.000000,
    D_q: 37.980816,
    D0: 1.40,
    desc: "U87MG Glioblastoma Stem-Like Cells (CD133+). Shows distinct radioresistance.",
    source: "Marmolejo-León, P., et al. (2018). Applied Radiation and Isotopes, 135.",
    url: "https://doi.org/10.1016/j.apradiso.2018.01.011",
    verified: false
  },

  "V79 (Chinese Hamster) - Standard": {
    alpha_by_beta: 9.000000,
    D_q: 7.832050,
    D0: 1.61,
    desc: "V79 Chinese Hamster lung fibroblasts. Historical standard reference.",
    source: "Hall, E. J., & Giaccia, A. J. (2012). Radiobiology for the Radiologist.",
    url: "https://books.google.com/books?id=QruDQAAQBAJ",
    verified: false
  }

};
