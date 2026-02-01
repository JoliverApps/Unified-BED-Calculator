document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const cellSelect = document.getElementById('cell-line-select');
  const cellDesc = document.getElementById('cell-desc');
  const sourceBox = document.getElementById('source-box');
  const sourceText = document.getElementById('source-text');
  const sourceUrl = document.getElementById('source-url');

  const errorContainer = document.getElementById('error-container');
  const btnModeClassical = document.getElementById('mode-classical');
  const btnModeRD = document.getElementById('mode-rd');
  const btnCalc = document.getElementById('calculate-btn');

  const resultContainer = document.getElementById('result-container');
  const lblDpf = document.getElementById('original-dpf');

  // Result Fields
  const bedText = document.getElementById('bed-text');
  const resultText = document.getElementById('result-text');
  const dpfText = document.getElementById('dose-per-fraction-text');

  // Reference-derived (LIVE)
  const bedRefText = document.getElementById('bed-ref-text'); 
  const refEqd2FractionsText = document.getElementById('ref-eqd2-fractions-text');
  const refEqd2TotalText = document.getElementById('ref-eqd2-total-text');

  const inputs = {
    // Classical
    alpha: document.getElementById('param-alpha'),
    beta: document.getElementById('param-beta'),
    d0: document.getElementById('param-d0'),
    // RD
    r: document.getElementById('param-r'),
    s: document.getElementById('param-s'),
    k: document.getElementById('param-k'),
    // Schedule
    d1: document.getElementById('dose-d1'),
    n1: document.getElementById('fractions-n1'),
    n2: document.getElementById('fractions-n2'),
  };

  // --- State ---
  let currentMode = 'classical'; // 'classical' | 'rd'
  let suppress = false;

  // --- Numeric Tolerances ---
  const B_EPS = 1e-12;     // beta -> 0
  const S_EPS = 1e-12;     // s -> 0
  const R_EPS = 1e-12;     // r -> 0 singularity
  const ONE_R_EPS = 1e-9;  // 1-r -> 0 (BED blowup)
  const W_EPS = 1e-14;     // Lambert W convergence

  // --- UI Helpers ---
  const setActive = (btn) => {
    btn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
    btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
  };

  const setInactive = (btn) => {
    btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
    btn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
  };

  function hideResults() {
    resultContainer.classList.add('hidden');
  }

  function clearErrorsAndInvalid() {
    Object.values(inputs).forEach(el => el.classList.remove('invalid'));
    errorContainer.innerHTML = '';
    errorContainer.classList.add('hidden');
    btnCalc.disabled = false;
    btnCalc.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  function addError(msg, elements = []) {
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = msg;
    errorContainer.appendChild(p);
    errorContainer.classList.remove('hidden');
    elements.forEach(el => el.classList.add('invalid'));
    btnCalc.disabled = true;
    btnCalc.classList.add('opacity-50', 'cursor-not-allowed');
  }

  function toNum(v) {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
  }

  function isPosInt(x) {
    return Number.isFinite(x) && Number.isInteger(x) && x > 0;
  }

  function needFinite(name, x, els = []) {
    if (!Number.isFinite(x)) {
      addError(`Internal error: ${name} is missing or invalid. Check inputs.`, els);
      return false;
    }
    return true;
  }

  // --- Helper: Update Dose Per Fraction Display ---
  function updateDpf() {
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    if (Number.isFinite(D1) && Number.isFinite(n1) && D1 > 0 && n1 > 0) {
      lblDpf.textContent = (D1 / n1).toFixed(2);
    } else {
      lblDpf.textContent = "--";
    }
  }

  // --- UX: Break Preset (Detach) ---
  function breakPresetAndDetach() {
    if (suppress) return;
    if (cellSelect.value === "") return;

    suppress = true;
    cellSelect.value = "";
    cellDesc.textContent = "";
    sourceBox.classList.add('hidden');
    suppress = false;
  }

  // --- Validation Logic (Mode Aware) ---
  function validateAll(strict = false, validateSchedule = false) {
    clearErrorsAndInvalid();

    const scheduleSet = new Set([inputs.d1, inputs.n1, inputs.n2]);

    const shouldValidate = (el) => {
      // Schedule fields validate only when requested (on Calculate)
      if (scheduleSet.has(el)) return validateSchedule;

      if (el.disabled) return false;
      if (strict) return true;
      return el.value !== "";
    };

    const alpha = toNum(inputs.alpha.value);
    const beta  = toNum(inputs.beta.value);
    const D0    = toNum(inputs.d0.value);

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    // --- Classical Validation ---
    if (shouldValidate(inputs.alpha)) {
      if (!(Number.isFinite(alpha) && alpha > 0)) addError("α must be strictly positive.", [inputs.alpha]);
    }
    if (shouldValidate(inputs.beta)) {
      // UPDATED: Allow negative beta
      if (!Number.isFinite(beta)) addError("β must be a valid number.", [inputs.beta]);
    }
    if (shouldValidate(inputs.d0)) {
      if (!(Number.isFinite(D0) && D0 > 0)) addError("D0 must be strictly positive.", [inputs.d0]);
    }

    // --- RD Validation ---
    if (shouldValidate(inputs.k)) {
      if (!(Number.isFinite(k) && k > 0)) addError("k must be strictly positive.", [inputs.k]);
    }
    if (shouldValidate(inputs.r)) {
      if (!(Number.isFinite(r) && r < 1)) addError("r must be strictly < 1.", [inputs.r]);
      if (Number.isFinite(r) && (1 - r) <= ONE_R_EPS) addError("r is too close to 1 (BED singularity).", [inputs.r]);
    }
    if (shouldValidate(inputs.s)) {
      // UPDATED: Allow negative s
      if (!Number.isFinite(s)) addError("s must be a valid number.", [inputs.s]);
    }

    // --- Schedule Validation (ONLY ON CALCULATE) ---
    if (shouldValidate(inputs.d1)) {
      if (!(Number.isFinite(D1) && D1 > 0)) addError("Total Dose D1 must be > 0.", [inputs.d1]);
    }
    if (shouldValidate(inputs.n1)) {
      if (!isPosInt(n1)) addError("n1 must be a positive integer.", [inputs.n1]);
    }
    if (shouldValidate(inputs.n2)) {
      if (!isPosInt(n2)) addError("n2 must be a positive integer.", [inputs.n2]);
    }

    return !btnCalc.disabled;
  }

  // --- Conversion: Classical -> RD ---
  function convertClassicalToRD() {
    if (suppress) return;

    const alpha = toNum(inputs.alpha.value);
    const beta  = toNum(inputs.beta.value);
    const D0    = toNum(inputs.d0.value);

    // Only compute when data necessary to compute k,r,s exists
    if (!(Number.isFinite(alpha) && Number.isFinite(beta) && Number.isFinite(D0) && D0 > 0)) return;

    const k = 1 / D0;
    const r = 1 - (alpha * D0);

    // BRANCH: beta -> 0 implies s = 0
    if (Math.abs(beta) <= B_EPS) {
      suppress = true;
      inputs.k.value = k.toFixed(6);
      inputs.r.value = r.toFixed(6);
      inputs.s.value = "0";
      suppress = false;
      validateAll(false, false);
      return;
    }

    // Singularity Check: r -> 0
    if (Math.abs(r) < R_EPS) {
      suppress = true;
      inputs.k.value = k.toFixed(6);
      inputs.r.value = r.toFixed(6);
      inputs.s.value = "";
      suppress = false;
      validateAll(false, false);
      addError("Conversion singular: r ≈ 0 while β > 0. s is undefined.", [inputs.alpha, inputs.d0]);
      return;
    }

    // Normal Calculation
    const s = (2 * beta) / (r * k);

    // UPDATED: Removed "Resulting s < 0" check block here to allow negative beta.

    suppress = true;
    inputs.k.value = k.toFixed(6);
    inputs.r.value = r.toFixed(6);
    inputs.s.value = s.toFixed(6);
    suppress = false;
    validateAll(false, false);
  }

  // --- Conversion: RD -> Classical ---
  function convertRDToClassical() {
    if (suppress) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    // UPDATED: Removed s >= 0 requirement
    if (!(Number.isFinite(r) && Number.isFinite(s) && Number.isFinite(k) && k > 0)) return;
    if (!(r < 1)) return;

    const D0 = 1 / k;
    const alpha = k * (1 - r);
    const beta = (r * s * k) / 2;

    suppress = true;
    inputs.d0.value = D0.toFixed(6);
    inputs.alpha.value = alpha.toFixed(6);
    inputs.beta.value = beta.toFixed(6);
    suppress = false;
    validateAll(false, false);
  }

  // --- UI Mode Switching ---
  function updateModeUI() {
    const classicalInputs = [inputs.alpha, inputs.beta, inputs.d0];
    const rdInputs = [inputs.r, inputs.s, inputs.k];

    if (currentMode === 'classical') {
      setActive(btnModeClassical);
      setInactive(btnModeRD);
      classicalInputs.forEach(el => el.disabled = false);
      rdInputs.forEach(el => el.disabled = true);
      convertClassicalToRD();
    } else {
      setActive(btnModeRD);
      setInactive(btnModeClassical);
      rdInputs.forEach(el => el.disabled = false);
      classicalInputs.forEach(el => el.disabled = true);
      convertRDToClassical();
    }
  }

  function setMode(mode) {
    currentMode = mode;
    hideResults();
    validateAll(false, false);
    updateModeUI();
    updateReferenceDerived();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  // --- Preset Loading ---
  function initData() {
    if (!window.RD_DATA) {
      cellSelect.innerHTML = '<option value="">Error: datasrc.js not found</option>';
      return;
    }

    const isVerified = (v) => v === true || v === 1 || v === "true" || v === "True";

    const keysVerified = Object.keys(window.RD_DATA)
      .filter((key) => isVerified(window.RD_DATA[key]?.verified))
      .sort();

    cellSelect.innerHTML = '<option value="">— Select Verified Cell Line —</option>';

    if (keysVerified.length === 0) {
      cellSelect.innerHTML = '<option value="">No verified datasets available</option>';
      cellSelect.disabled = true;
      return;
    }

    cellSelect.disabled = false;
    keysVerified.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      cellSelect.appendChild(opt);
    });
  }

  // --- Preset Select ---
  cellSelect.addEventListener('change', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

    const prevMode = currentMode;
    const key = cellSelect.value;
    if (!key || !window.RD_DATA[key]) {
      cellDesc.textContent = "";
      sourceBox.classList.add('hidden');
      updateReferenceDerived();
      return;
    }

    const data = window.RD_DATA[key];
    suppress = true;

    inputs.alpha.value = (data.alpha ?? '');
    inputs.beta.value  = (data.beta  ?? '');
    inputs.d0.value    = (data.D0    ?? '');

    // Clear derived + schedule
    inputs.r.value = ''; inputs.s.value = ''; inputs.k.value = '';
    inputs.d1.value = ''; inputs.n1.value = ''; inputs.n2.value = '';

    suppress = false;
    convertClassicalToRD();

    cellDesc.textContent = data.desc || "";

    if (data.source || data.url) {
      sourceText.textContent = data.source || "";
      sourceUrl.textContent = data.url || "";
      sourceUrl.href = data.url || "#";
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    currentMode = prevMode;
    updateModeUI();
    updateDpf();
    updateReferenceDerived();
    validateAll(false, false);
  });

  // --- BED / EQD2 Helpers (for live reference display) ---
  function denomBEDperFrac2Gy(r, s) {
    const one_r = 1 - r;
    if (!(one_r > ONE_R_EPS)) return NaN;
    // UPDATED: Allow negative s
    if (!Number.isFinite(s)) return NaN;

    if (Math.abs(s) <= S_EPS) return 2;

    const termExp2 = -Math.expm1(-2 * s); // 1 - e^{-2s}
    return (2 / one_r) - (r / (s * one_r)) * termExp2;
  }

  function bedUnified(D, n, r, s) {
    const one_r = 1 - r;
    if (!(Number.isFinite(D) && Number.isFinite(n) && D > 0 && n > 0)) return NaN;
    // UPDATED: Allow negative s
    if (!(Number.isFinite(r) && r < 1 && one_r > ONE_R_EPS && Number.isFinite(s))) return NaN;

    if (Math.abs(s) <= S_EPS) return D;

    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x); // 1 - e^{-s D/n}
    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function clearReferenceDerived() {
    bedRefText.textContent = "--";
    refEqd2FractionsText.textContent = "--";
    refEqd2TotalText.textContent = "--";
  }

  function updateReferenceDerived() {
    updateDpf();

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);

    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1))) {
      clearReferenceDerived();
      return;
    }

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    // UPDATED: Allow negative s
    if (!(Number.isFinite(r) && r < 1 && (1 - r) > ONE_R_EPS && Number.isFinite(s))) {
      clearReferenceDerived();
      return;
    }

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      clearReferenceDerived();
      return;
    }

    const denom2 = denomBEDperFrac2Gy(r, s);
    if (!(Number.isFinite(denom2) && denom2 > 0)) {
      clearReferenceDerived();
      return;
    }

    const nEqd2 = BED1 / denom2;
    const D_Eqd2 = 2 * nEqd2;

    bedRefText.textContent = `${BED1.toFixed(2)} Gy`;
    refEqd2FractionsText.textContent = nEqd2.toFixed(2);
    refEqd2TotalText.textContent = `${D_Eqd2.toFixed(2)} Gy`;
  }

  // --- Input Listeners ---
  function attachInputBehavior(el, onChange, detachPreset = false) {
    el.addEventListener('input', () => {
      hideResults();
      if (detachPreset) breakPresetAndDetach();
      if (bedText) bedText.textContent = "";
      onChange();
      updateReferenceDerived();
      validateAll(false, false);
    });
  }

  attachInputBehavior(inputs.alpha, () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);
  attachInputBehavior(inputs.beta,  () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);
  attachInputBehavior(inputs.d0,    () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);

  attachInputBehavior(inputs.r, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);
  attachInputBehavior(inputs.s, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);
  attachInputBehavior(inputs.k, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);

  attachInputBehavior(inputs.d1, () => {}, false);
  attachInputBehavior(inputs.n1, () => {}, false);
  attachInputBehavior(inputs.n2, () => {}, false);

  // --- Lambert W0 ---
  function lambertW0(z) {
    const minZ = -1 / Math.E;
    if (!Number.isFinite(z)) return NaN;
    if (z < minZ - 1e-12) return NaN;
    if (Math.abs(z - minZ) < 1e-12) return -1;
    if (Math.abs(z) < W_EPS) return 0;

    let w;
    if (z < 0) {
      w = Math.log1p(z);
      if (!Number.isFinite(w)) w = -0.5;
      if (w < -0.999999999) w = -0.999999999;
    } else if (z > 1) {
      w = Math.log(z);
    } else {
      w = z;
    }

    for (let i = 0; i < 80; i++) {
      const ew = Math.exp(w);
      const f = w * ew - z;
      const wp1 = w + 1;
      if (Math.abs(wp1) < 1e-14) {
        w = -1 + (wp1 >= 0 ? 1e-12 : -1e-12);
        continue;
      }
      const denom = ew * wp1 - (wp1 + 1) * f / (2 * wp1);
      if (!Number.isFinite(denom) || Math.abs(denom) < 1e-18) {
        const newtonDen = ew * wp1;
        if (!Number.isFinite(newtonDen) || Math.abs(newtonDen) < 1e-18) return NaN;
        let dwN = f / newtonDen;
        dwN = Math.max(Math.min(dwN, 1), -1);
        w -= dwN;
      } else {
        let dw = f / denom;
        dw = Math.max(Math.min(dw, 1), -1);
        w -= dw;
        if (Math.abs(dw) < 1e-12) break;
      }
    }
    return w;
  }

  // --- Display Result Helper ---
  function updateResultUI(BED_val, D2_val, n2_val, K_val, W_val) {
    const d2_val = D2_val / n2_val;

    bedText.textContent = `${BED_val.toFixed(2)} Gy`;
    resultText.textContent = `${D2_val.toFixed(2)} Gy`;
    dpfText.textContent = `${d2_val.toFixed(2)} Gy`;

    document.getElementById('dbg-bed1').textContent = BED_val.toFixed(6);
    document.getElementById('dbg-k').textContent = K_val !== null ? K_val.toFixed(6) : "—";
    document.getElementById('dbg-w').textContent = W_val !== null ? W_val.toFixed(6) : "—";

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // --- MAIN CALCULATION ---
  btnCalc.addEventListener('click', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

    // Validate schedule ONLY here
    if (!validateAll(true, true)) return;

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    // --- Classical Mode Handling ---
    if (currentMode === 'classical') {
      const beta = toNum(inputs.beta.value);

      // β -> 0 => linear BED = D1 and D2 = D1
      if (Number.isFinite(beta) && Math.abs(beta) <= B_EPS) {
        updateResultUI(D1, D1, n2, null, null);
        return;
      }

      convertClassicalToRD();
      if (btnCalc.disabled) return;
    }

    // --- RD Parameter Extraction ---
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!needFinite("r", r, [inputs.r])) return;
    if (!needFinite("s", s, [inputs.s])) return;

    if (!(r < 1) || (1 - r) <= ONE_R_EPS) {
      addError("Parameter error: r must be strictly < 1.", [inputs.r]);
      return;
    }
    // UPDATED: Removed s >= 0 requirement check here

    // s -> 0 => D2 = D1
    if (Math.abs(s) <= S_EPS) {
      updateResultUI(D1, D1, n2, null, null);
      return;
    }

    // --- General Case: Lambert-W Solve ---
    const one_r = 1 - r;
    const d1 = D1 / n1;
    const x = -s * d1;
    const oneMinusExp = -Math.expm1(x);

    const BED1 = (D1 / one_r) - ((n1 * r) / (s * one_r)) * oneMinusExp;

    const K = r + (s * one_r / n2) * BED1;
    const arg = -r * Math.exp(-K);
    const w_val = lambertW0(arg);

    if (!Number.isFinite(w_val)) {
      addError("Lambert-W failure: parameters out of domain.", []);
      return;
    }

    const D2 = (n2 / s) * (K + w_val);
    if (!(Number.isFinite(D2) && D2 > 0)) {
      addError("Computed D2 is non-physical.", []);
      return;
    }

    updateResultUI(BED1, D2, n2, K, w_val);
  });

  // --- Initialization ---
  initData();
  updateModeUI();
  updateDpf();
  updateReferenceDerived();
  validateAll(false, false);
});
