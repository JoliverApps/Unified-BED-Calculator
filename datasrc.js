/**
 * Unified BED Calculator - Data Source
 * ------------------------------------
 * STORED PARAMETERS (Classical):
 * - alpha (Gy^-1): Linear kill component
 * - beta (Gy^-2): Quadratic kill component
 * - D0 (Gy): Mean Lethal Dose (inverse of terminal slope k)
 * * The app will automatically convert these to RD parameters (r, s, k)
 * when a preset is loaded.
 */

window.RD_DATA = {
    "NSCLC (H460) - Lung SBRT": {
        alpha: 0.294,
        beta: 0.029,
        D0: 1.56,
        desc: "Non-small cell lung cancer. Validated for SBRT.",
        source: "Park C, et al. <em>Int J Radiat Oncol Biol Phys.</em> 2008."
    },
    "Prostate (PC-3) - Hypofractionated": {
        alpha: 0.150,
        beta: 0.100,
        D0: 1.25,
        desc: "Radio-resistant prostate line. Low alpha/beta ratio.",
        source: "Park C, et al. <em>Int J Radiat Oncol Biol Phys.</em> 2008."
    },
    "Glioblastoma (U87MG)": {
        alpha: 0.050,
        beta: 0.005,
        D0: 1.40,
        desc: "Highly radio-resistant. Very broad shoulder.",
        source: "Followill D, et al. <em>Radiat Res.</em> 1993."
    },
    "Head & Neck (SCC)": {
        alpha: 0.350,
        beta: 0.035,
        D0: 1.10,
        desc: "Squamous cell carcinoma. Standard radiosensitivity.",
        source: "Joiner MC, van der Kogel AJ. <em>Basic Clinical Radiobiology.</em>"
    },
    "Melanoma (Radio-resistant)": {
        alpha: 0.100,
        beta: 0.040,
        D0: 2.20,
        desc: "Radio-resistant with large repair capacity.",
        source: "Chapman JD. <em>Radiat Res.</em> 2003."
    }
};
