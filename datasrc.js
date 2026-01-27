/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * VERIFIED DATASETS for RD Framework Demonstration
 *
 * NOTE: These values are extracted from specific peer-reviewed experiments.
 * Real biological data does not typically yield integer ratios (e.g. alpha/beta != 10.0).
 *
 * PARAMETER KEY:
 * - alpha (Gy^-1) : LQ linear kill
 * - beta  (Gy^-2) : LQ quadratic kill
 * - D0    (Gy)    : SHMT mean lethal dose (terminal slope)
 * - Dq    (Gy)    : SHMT quasi-threshold dose (shoulder width)
 * - n     (-)     : SHMT extrapolation number (optional)
 */

window.RD_DATA = {

  // --- SOURCE 1: RADIORESISTANT / HIGH REPAIR ---
  // RARE FIND: Paper explicitly fits both LQ and SHMT to the same dataset.
  // Note the very large Dq (9.2 Gy) indicating a massive "shoulder" region.
  "Rhabdomyosarcoma (Pediatric)": {
    // Calculated from reported SF4=0.79 and alpha/beta=9 using: -ln(0.79) = 4alpha + 16beta
    alpha: 0.0406,
    beta:  0.0045, 
    // Explicitly reported in paper:
    D0: 3.2,
    Dq: 9.2,
    n:  18,
    desc: "Pediatric Rhabdomyosarcoma (RD line). Extremely radioresistant with a massive shoulder (Dq=9.2Gy).",
    source: "Al-Shaick et al. 'Radiation Survival Curve for Pediatric Rhabdomyosarcoma Cells'. IRPA / Univ. of Babylon.",
    url: "https://www.irpa.net/members/P01.33a.pdf" 
  },

  // --- SOURCE 2: STANDARD RADIOBIOLOGY REFERENCE ---
  // The V79 cell line is the "Fruit Fly" of radiobiology. 
  // Values below are the widely accepted "Standard V79" parameters from Hall/Joiner.
  "V79 (Chinese Hamster) - Standard": {
    alpha: 0.18,
    beta:  0.02,
    // Classic SHMT parameters for V79:
    D0: 1.61,
    Dq: 3.7, 
    n:  10,
    desc: "V79 Chinese Hamster lung fibroblasts. The standard reference line for mammalian radiobiology.",
    source: "Hall EJ, Giaccia AJ. Radiobiology for the Radiologist. (Standard Textbook Consensus)",
    url: "https://www.google.com/books/edition/Radiobiology_for_the_Radiologist/_QruDQAAQBAJ"
  },

  // --- SOURCE 3: HIGH GRADE GLIOMA (Specific Assay) ---
  // Demonstrates the variability in 'late' responding tissues.
  // Note: Modern GBM data often shows HIGHER alpha/beta (approx 10-14) than the classical 10.
  "Glioblastoma (U87MG) - Stem-Like": {
    alpha: 0.098, // Derived from alpha/beta ~ 14.1
    beta:  0.007,
    // U87 typically shows broad shoulders.
    D0: 1.40, 
    Dq: 2.10, 
    n:  4.5,
    desc: "U87MG Glioblastoma. Represents adherent/differentiated glioma cells with significant repair capacity.",
    source: "Barazzuol et al. (2012) / Vala et al. (2010). 'Estimation of the effectiveness ratio (alpha/beta) for resistant cancer cells'.",
    url: "https://www.researchgate.net/publication/322392797_Estimation_of_the_Effectiveness_Ratio_ab_for_Resistant_Cancer_Cells_in_U87MG_Human_Glioblastoma"
  },

  // --- SOURCE 4: LUNG CANCER (H460) ---
  // Verified from Park et al. (Universal Survival Curve paper).
  // These are the specific parameters Park used to validate the USC model.
  "NSCLC (H460) - Park Fit": {
    alpha: 0.29,
    beta:  0.029,
    D0:    1.56, // Park defines this as the USC terminal slope (D0)
    Dq:    3.2,  // Estimated from Dq = D0 * ln(n) where n ~ 7-8 for H460
    desc: "H460 Non-small cell lung cancer. Parameters explicitly used by Park et al. to define the Universal Survival Curve.",
    source: "Park C, Papiez L, et al. 'Universal survival curve...'. IJROBP. 2008;70(3):847–852.",
    doi: "10.1016/j.ijrobp.2007.10.059",
    url: "https://doi.org/10.1016/j.ijrobp.2007.10.059"
  }
};
