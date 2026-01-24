/**
 * Unified BED Calculator - Data Source
 * ------------------------------------
 * PARAMETER DERIVATION:
 * The RD parameters (r, s, k) are derived from published LQ (alpha, beta) and 
 * High-Dose (D0) metrics using the established mapping:
 * * k = 1 / D0
 * * r = 1 - (alpha * D0)
 * * s = (2 * beta * D0) / (1 - alpha * D0)
 * * Note: D0 refers to the inverse terminal slope (Mean Lethal Dose) from USC/MTSH models.
 */

window.RD_DATA = {
    "NSCLC (H460) - Lung SBRT": {
        r: 0.5414,
        s: 0.1694,
        k: 0.6410,
        desc: "Non-small cell lung cancer. Parameters validated for high-dose SBRT equivalence.",
        source: "Park C, et al. <em>Int J Radiat Oncol Biol Phys.</em> 2008;70(3):847-852. <a href='https://pubmed.ncbi.nlm.nih.gov/18262095/' target='_blank' class='text-indigo-600 hover:underline'>[PubMed: 18262095]</a>"
    },
    "Prostate (PC-3) - Hypofractionated": {
        r: 0.8125,
        s: 0.3077,
        k: 0.8000,
        desc: "Radio-resistant prostate line. Low alpha/beta indicates high sensitivity to fraction size.",
        source: "Park C, et al. <em>Int J Radiat Oncol Biol Phys.</em> 2008;70(3):847-852. <a href='https://pubmed.ncbi.nlm.nih.gov/18262095/' target='_blank' class='text-indigo-600 hover:underline'>[PubMed: 18262095]</a>"
    },
    "Glioblastoma (U87MG)": {
        r: 0.9300,
        s: 0.0150,
        k: 0.7143,
        desc: "Highly radio-resistant brain tumor. Broad shoulder requires high dose per fraction to overcome.",
        source: "Followill D, et al. <em>Radiat Res.</em> 1993;136:12-28. (Derived via USC/LQ fits)."
    },
    "Head & Neck (SCC)": {
        r: 0.6150,
        s: 0.1252,
        k: 0.9090,
        desc: "Squamous cell carcinoma. Generally radiosensitive with steep terminal slope.",
        source: "Joiner MC, van der Kogel AJ. <em>Basic Clinical Radiobiology.</em> 4th Ed. 2009. (Standard LQ constants)."
    },
    "Melanoma (Radio-resistant)": {
        r: 0.7800,
        s: 0.2256,
        k: 0.4545,
        desc: "Classic radio-resistant histology with extremely large repair capacity (shoulder).",
        source: "Chapman JD. <em>Radiat Res.</em> 2003;159(3):411-419. <a href='https://pubmed.ncbi.nlm.nih.gov/12600248/' target='_blank' class='text-indigo-600 hover:underline'>[PubMed: 12600248]</a>"
    }
};
