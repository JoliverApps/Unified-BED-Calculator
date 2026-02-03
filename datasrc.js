/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * VERIFIED DATASETS for RD Framework Demonstration
 *
 * PARAMETER KEY:
 * - alpha_by_beta (Gy) : The standard LQ ratio.
 * - D_q           (Gy) : The shoulder displacement (quasi-threshold dose).
 * - alpha         (Gy^-1): Optional/Legacy
 * - D0            (Gy)   : Optional/Legacy
 *
 * CITATION POLICY:
 * Full credit is provided in the 'source' field for application display.
 */

window.RD_DATA = {

  "Rhabdomyosarcoma (Pediatric)": {
    alpha_by_beta: 9.02, 
    D_q: 9.2,
    alpha: 0.0406,
    D0: 3.2,
    desc: "Pediatric Rhabdomyosarcoma cell line. Shows extreme radioresistance with a massive shoulder (Dq=9.2Gy). Ideal for testing high-repair scenarios.",
    source: "Al-Shaick, H., Al-Bairmani, S., & Al-Jawad, F. (2015). Radiation Survival Curve for Pediatric Rhabdomyosarcoma Cells. Medical Physics Department, College of Medicine, University of Babylon.",
    url: "https://www.irpa.net/members/P01.33a.pdf",
    verified: true
  },

  "NSCLC (average by Park et al)": {
    alpha_by_beta: 8.68,
    D_q: 1.8,
    alpha: 0.33,
    D0: 1.25,
    desc: "NCI-H460 Non-Small Cell Lung Cancer. Parameters explicitly used to derive and validate the Universal Survival Curve (USC) model for hypofractionation.",
    source: "Park, C., Papiez, L., Zhang, S., Story, M., & Timmerman, R. D. (2008). Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. International Journal of Radiation Oncology • Biology • Physics, 70(3), 847–852.",
    url: "https://doi.org/10.1016/J.IJROBP.2007.10.059",
    verified: true
  },

    "CHO-K1 (Original paper)": {
    alpha: 0.050904,
    beta: 0.103401,
    D0: 1.100110,
    Dq: 3.917012,
    desc: "From Oliveira, JM original paper",
    source: "",
    url: "",
    verified: true
  },

    "XRS6 (Original paper)": {
    alpha: 1.654596,
    beta: -0.665829,
    D0: 1.461988,
    Dq: -1.034257,
    desc: "From Oliveira, JM original paper",
    source: "",
    url: "",
    verified: true
  },
  /* UNVERIFIED----------------------------------------------------*/

  "Glioblastoma (U87MG - Stem-Like)": {
    alpha_by_beta: 14.1,
    D_q: 2.10,
    alpha: 0.098,
    D0: 1.40,
    desc: "U87MG Glioblastoma Stem-Like Cells (CD133+). Shows distinct radioresistance compared to adherent cells. Parameters derived from the reported alpha/beta ratio of 14.1.",
    source: "Marmolejo-León, P., Azorín-Vega, E. P., Jiménez-Mancilla, N., et al. (2018). Estimation of the effectiveness ratio (α/β) for resistant cancer cells in U87MG human glioblastoma. Applied Radiation and Isotopes, 135, 12-17.",
    url: "https://doi.org/10.1016/j.apradiso.2018.01.011",
    verified: false
  },

  "V79 (Chinese Hamster) - Standard": {
    alpha_by_beta: 9.0,
    D_q: 3.7,
    alpha: 0.180,
    D0: 1.61,
    desc: "V79 Chinese Hamster lung fibroblasts. The historical 'standard' reference cell line used in foundational radiobiology textbooks.",
    source: "Hall, E. J., & Giaccia, A. J. (2012). Radiobiology for the Radiologist (7th Edition). Philadelphia: Lippincott Williams & Wilkins. ISBN: 978-1451129634.",
    url: "https://books.google.com/books?id=QruDQAAQBAJ",
    verified: false
  }

};
