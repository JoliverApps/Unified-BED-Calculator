/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * VERIFIED DATASETS for RD Framework Demonstration
 *
 * PARAMETER KEY:
 * - alpha_by_beta (Gy) : The standard LQ ratio (High Precision).
 * - D_q           (Gy) : The shoulder displacement.
 * - alpha, beta, D0    : Legacy/Reference values.
 *
 * CITATION POLICY:
 * Full credit is provided in the 'source' field for application display.
 */

window.RD_DATA = {

  "Rhabdomyosarcoma (Pediatric)": {
    // alpha=0.0406, beta=0.0045 => Ratio ~ 9.022222
    alpha_by_beta: 9.022222, 
    D_q: 9.2,
    alpha: 0.0406,
    beta: 0.0045,
    D0: 3.2,
    desc: "Pediatric Rhabdomyosarcoma cell line. Shows extreme radioresistance with a massive shoulder (Dq=9.2Gy). Ideal for testing high-repair scenarios.",
    source: "Al-Shaick, H., Al-Bairmani, S., & Al-Jawad, F. (2015). Radiation Survival Curve for Pediatric Rhabdomyosarcoma Cells. Medical Physics Department, College of Medicine, University of Babylon.",
    url: "https://www.irpa.net/members/P01.33a.pdf",
    verified: true
  },

  "NSCLC (average by Park et al)": {
    // alpha=0.33, beta=0.038 => Ratio ~ 8.684211
    alpha_by_beta: 8.684211,
    D_q: 1.8,
    alpha: 0.33,
    beta: 0.038,
    D0: 1.25,
    desc: "NCI-H460 Non-Small Cell Lung Cancer. Parameters explicitly used to derive and validate the Universal Survival Curve (USC) model for hypofractionation.",
    source: "Park, C., Papiez, L., Zhang, S., Story, M., & Timmerman, R. D. (2008). Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. International Journal of Radiation Oncology • Biology • Physics, 70(3), 847–852.",
    url: "https://doi.org/10.1016/J.IJROBP.2007.10.059",
    verified: true
  },

  "CHO-K1 (Original paper)": {
    // alpha=0.050904, beta=0.103401 => Ratio ~ 0.492297
    alpha_by_beta: 0.492297,
    D_q: 3.917012, 
    alpha: 0.050904,
    beta: 0.103401,
    D0: 1.100110,
    desc: "From Oliveira, JM original paper. Demonstrates high-shoulder behavior with low alpha/beta ratio.",
    source: "Oliveira, JM (Original Paper)",
    url: "",
    verified: true
  },

  "XRS6 (Original paper)": {
    // alpha=1.654596, beta=-0.665829 => Ratio ~ -2.485016
    alpha_by_beta: -2.485016,
    D_q: -1.034257,
    alpha: 1.654596,
    beta: -0.665829,
    D0: 1.461988,
    desc: "From Oliveira, JM original paper. Represents a repair-deficient phenotype with negative shoulder displacement parameters.",
    source: "Oliveira, JM (Original Paper)",
    url: "",
    verified: true
  },

  /* UNVERIFIED----------------------------------------------------*/

  "Glioblastoma (U87MG - Stem-Like)": {
    // alpha=0.098, beta=0.007 => Ratio = 14.0 (Using cited ratio directly if available, else calc)
    // The source paper explicitly cites 14.1, keeping as is.
    alpha_by_beta: 14.1,
    D_q: 2.10,
    alpha: 0.098,
    beta: 0.007,
    D0: 1.40,
    desc: "U87MG Glioblastoma Stem-Like Cells (CD133+). Shows distinct radioresistance compared to adherent cells. Parameters derived from the reported alpha/beta ratio of 14.1.",
    source: "Marmolejo-León, P., Azorín-Vega, E. P., Jiménez-Mancilla, N., et al. (2018). Estimation of the effectiveness ratio (α/β) for resistant cancer cells in U87MG human glioblastoma. Applied Radiation and Isotopes, 135, 12-17.",
    url: "https://doi.org/10.1016/j.apradiso.2018.01.011",
    verified: false
  },

  "V79 (Chinese Hamster) - Standard": {
    // alpha=0.180, beta=0.020 => Ratio = 9.0
    alpha_by_beta: 9.0,
    D_q: 3.7,
    alpha: 0.180,
    beta: 0.020,
    D0: 1.61,
    desc: "V79 Chinese Hamster lung fibroblasts. The historical 'standard' reference cell line used in foundational radiobiology textbooks.",
    source: "Hall, E. J., & Giaccia, A. J. (2012). Radiobiology for the Radiologist (7th Edition). Philadelphia: Lippincott Williams & Wilkins. ISBN: 978-1451129634.",
    url: "https://books.google.com/books?id=QruDQAAQBAJ",
    verified: false
  }

};
