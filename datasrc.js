/**
 * Unified BED Calculator - Data Source (datasrc.js)
 * -------------------------------------------------
 * STORED PARAMETERS (Classical):
 *  - alpha (Gy^-1)
 *  - beta  (Gy^-2)
 *  - D0    (Gy) : mean lethal dose (typically related to terminal slope)
 *
 * App converts to RD parameters (r, s, k) internally.
 * NOTE: Numerical values below are kept as provided; this file focuses on
 *       provenance traceability (doi/url) and clean citation memos.
 */

window.RD_DATA = {
  "NSCLC (H460) - Lung SBRT": {
    alpha: 0.294,
    beta: 0.029,
    D0: 1.56,
    desc: "Non-small cell lung cancer line (NCI-H460). Used in hypofractionation/SBRT context.",
    source:
      "Park C, Papiez L, Zhang S, Story M, Timmerman RD. Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. International Journal of Radiation Oncology • Biology • Physics. 2008;70(3):847–852.",
    doi: "10.1016/j.ijrobp.2007.10.059",
    url: "https://doi.org/10.1016/j.ijrobp.2007.10.059"
  },

  "Prostate (PC-3) - Hypofractionated": {
    alpha: 0.150,
    beta: 0.100,
    D0: 1.25,
    desc: "Prostate cancer line (PC-3). Often discussed in hypofractionation / low α/β context.",
    source:
      "Park C, Papiez L, Zhang S, Story M, Timmerman RD. Universal survival curve and single fraction equivalent dose: useful tools in understanding potency of ablative radiotherapy. International Journal of Radiation Oncology • Biology • Physics. 2008;70(3):847–852.",
    doi: "10.1016/j.ijrobp.2007.10.059",
    url: "https://doi.org/10.1016/j.ijrobp.2007.10.059"
  },

  "Glioblastoma (U87MG)": {
    alpha: 0.050,
    beta: 0.005,
    D0: 1.40,
    desc: "Glioblastoma line (U87MG). Broad-shoulder survival is commonly reported across low-LET photon experiments.",
    source:
      "Polgár I, Schofield A, Madas B, et al. Datasets of in vitro clonogenic assays showing low-dose hyper-radiosensitivity. Scientific Data. 2022.",
    doi: "10.1038/s41597-022-01653-3",
    url: "https://doi.org/10.1038/s41597-022-01653-3"
  },

  "Head & Neck (SCC)": {
    alpha: 0.350,
    beta: 0.035,
    D0: 1.10,
    desc: "Squamous cell carcinoma (generic H&N SCC-type radiosensitivity placeholder).",
    source:
      "Joiner MC, van der Kogel AJ (eds.). Basic Clinical Radiobiology. (Textbook reference for foundational radiobiology concepts and typical parameter ranges; not a primary dataset paper.) ISBN: 9780340929667.",
    doi: "",
    url: ""
  },

  "Melanoma (Radio-resistant)": {
    alpha: 0.100,
    beta: 0.040,
    D0: 2.20,
    desc: "Melanoma (radioresistant phenotype). Placeholder classical parameters retained; ensure primary-source traceability when available.",
    source:
      "Polgár I, Schofield A, Madas B, et al. Datasets of in vitro clonogenic assays showing low-dose hyper-radiosensitivity. Scientific Data. 2022. (Use as a curated entry-point to locate melanoma-relevant clonogenic datasets; replace with a melanoma-specific primary paper if you have one.)",
    doi: "10.1038/s41597-022-01653-3",
    url: "https://doi.org/10.1038/s41597-022-01653-3"
  }
};
