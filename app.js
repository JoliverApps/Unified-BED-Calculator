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
    // Classical Inputs
    ab: document.getElementById('param-ab'), // alpha/beta
    dq: document.getElementById('param-dq'), // Dq

    // RD Inputs
    r: document.getElementById('param-r'),
    s: document.getElementById('param-s'),

    // Schedule
    d1: document.getElementById('dose-d1'),
    n1: document.getElementById('fractions-n1'),
    n2: document.getElementById('fractions-n2'),
  };

  // --- State ---
  let currentMode = 'classical'; // 'classical' | 'rd'
  let suppress = false;

  // --- Numeric Tolerances ---
  const ONE_R_EPS = 1e-9;  // 1-r -> 0
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
      addError(`Internal error: ${name} is missing or invalid.`, els);
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

  // --- UX: Break Preset ---
  function breakPresetAndDetach() {
    if (suppress) return;
    if (cellSelect.value === "") return;
    suppress = true;
    cellSelect.value = "";
    cellDesc.textContent = "";
    sourceBox.classList.add('hidden');
    suppress = false;
  }

  // --- Validation Logic ---
  function validateAll(strict = false, validateSchedule = false) {
    clearErrorsAndInvalid();

    const scheduleSet = new Set([inputs.d1, inputs.n1, inputs.n2]);

    const shouldValidate = (el) => {
      if (scheduleSet.has(el)) return validateSchedule;
      if (el.disabled) return false;
      if (strict) return true;
      return el.value !== "";
    };

    // Classical Inputs
    const ab = toNum(inputs.ab.value);
    const dq = toNum(inputs.dq.value);

    // RD Inputs
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (shouldValidate(inputs.ab)) {
      if (!Number.isFinite(ab)) addError("α/β must be a valid number.", [inputs.ab]);
      if (Math.abs(ab) < 1e-12) addError("α/β cannot be zero.", [inputs.ab]);
    }
    if (shouldValidate(inputs.dq)) {
      if (!Number.isFinite(dq)) addError("Dq must be a valid number.", [inputs.dq]);
      if (Math.abs(dq) < 1e-12) addError("Dq cannot be zero.", [inputs.dq]);
    }

    if (shouldValidate(inputs.r)) {
      if (!Number.isFinite(r)) addError("r is invalid.", [inputs.r]);
      if (Number.isFinite(r) && (1 - r) <= ONE_R_EPS) addError("r ≈ 1 (singularity).", [inputs.r]);
    }
    if (shouldValidate(inputs.s)) {
      if (!Number.isFinite(s)) addError("s is invalid.", [inputs.s]);
    }

    // Schedule
    if (shouldValidate(inputs.d1)) {
      const D1 = toNum(inputs.d1.value);
      if (!(Number.isFinite(D1) && D1 > 0)) addError("Total Dose D1 > 0.", [inputs.d1]);
    }
    if (shouldValidate(inputs.n1)) {
      const n1 = toNum(inputs.n1.value);
      if (!isPosInt(n1)) addError("n1 must be positive integer.", [inputs.n1]);
    }
    if (shouldValidate(inputs.n2)) {
      const n2 = toNum(inputs.n2.value);
      if (!isPosInt(n2)) addError("n2 must be positive integer.", [inputs.n2]);
    }

    return !btnCalc.disabled;
  }

  // --- Conversion Classical (AB, Dq) -> RD (r, s) ---
  function convertClassicalToRD() {
    if (suppress) return;

    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    if (!Number.isFinite(AB) || !Number.isFinite(DQ)) return;
    if (Math.abs(AB) < 1e-12 || Math.abs(DQ) < 1e-12) return;

    // RD Framework: r = ( sqrt(Dq^2 + 2*Dq*AB) - Dq ) / AB
    // This allows exact geometric consistency with the shoulder and tail.
    const termInside = (DQ * DQ) + (2 * DQ * AB);
    
    if (termInside < 0) {
      addError("Complex root detected (Dq, α/β mismatch).", [inputs.ab, inputs.dq]);
      return;
    }

    const r = (Math.sqrt(termInside) - DQ) / AB;
    const s = r / DQ;

    suppress = true;
    inputs.r.value = r.toFixed(6);
    inputs.s.value = s.toFixed(6);
    suppress = false;
    
    validateAll(false, false);
  }

  // --- Conversion RD (r, s) -> Classical (AB, Dq) ---
  function convertRDToClassical() {
    if (suppress) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!Number.isFinite(r) || !Number.isFinite(s)) return;
    if (Math.abs(s) < 1e-12) return;

    // Classical Inversion:
    // Dq = r/s
    // alpha/beta = 2(1-r)/(rs)
    const DQ = r / s;
    const AB = (2 * (1 - r)) / (r * s);

    suppress = true;
    inputs.dq.value = DQ.toFixed(6);
    inputs.ab.value = AB.toFixed(6);
    suppress = false;
    
    validateAll(false, false);
  }

  // --- UI Mode Switching ---
  function updateModeUI() {
    const classicalInputs = [inputs.ab, inputs.dq];
    const rdInputs = [inputs.r, inputs.s];

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
    const isVerified = (v) => v === true || v === 1 || v === "true";
    const keys = Object.keys(window.RD_DATA).filter(k => isVerified(window.RD_DATA[k]?.verified)).sort();
    
    cellSelect.innerHTML = '<option value="">— Select Verified Cell Line —</option>';
    if (keys.length === 0) {
      cellSelect.innerHTML = '<option value="">No verified datasets</option>';
      cellSelect.disabled = true;
      return;
    }
    cellSelect.disabled = false;
    keys.forEach(key => {
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
    
    // Load α/β and Dq (D0 is available in data but not needed for isoeffect)
    inputs.ab.value = data.alpha_by_beta ?? '';
    inputs.dq.value = data.D_q ?? '';

    // Clear RD/Schedule
    inputs.r.value = ''; inputs.s.value = '';
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
  });

  // --- BED / EQD2 Logic ---
  function bedUnified(D, n, r, s) {
    const one_r = 1 - r;
    if (!Number.isFinite(D) || !Number.isFinite(n) || D <= 0 || n <= 0) return NaN;
    if (Math.abs(s) < 1e-12) return D;
    
    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x); 
    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function denomBEDperFrac2Gy(r, s) {
    const one_r = 1 - r;
    if (Math.abs(s) < 1e-12) return 2;
    const termExp2 = -Math.expm1(-2 * s);
    return (2 / one_r) - (r / (s * one_r)) * termExp2;
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

    // Basic validity
    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1))) {
      clearReferenceDerived();
      return;
    }

    // Get RD params
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    
    if (!(Number.isFinite(r) && Number.isFinite(s))) {
      clearReferenceDerived();
      return;
    }

    // Calc BED
    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      clearReferenceDerived();
      return;
    }

    // Calc EQD2
    const bed2Gy = denomBEDperFrac2Gy(r, s);
    let nEqd2 = 0;
    let D_Eqd2 = 0;

    if (Number.isFinite(bed2Gy) && bed2Gy > 0) {
      nEqd2 = BED1 / bed2Gy;
      D_Eqd2 = nEqd2 * 2;
    }

    bedRefText.textContent = `${BED1.toFixed(2)} Gy`;
    refEqd2FractionsText.textContent = nEqd2 > 0 ? nEqd2.toFixed(2) : "--";
    refEqd2TotalText.textContent = D_Eqd2 > 0 ? `${D_Eqd2.toFixed(2)} Gy` : "--";
  }

  // --- Input Listeners ---
  function attachInputBehavior(el, onChange, detachPreset = false) {
    el.addEventListener('input', () => {
      hideResults();
      if (detachPreset) breakPresetAndDetach();
      if (bedText) bedText.textContent = "";
      onChange();
      updateReferenceDerived();
      if (errorContainer.innerHTML !== "") validateAll(false, false);
    });
  }

  attachInputBehavior(inputs.ab, () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);
  attachInputBehavior(inputs.dq, () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);

  attachInputBehavior(inputs.r, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);
  attachInputBehavior(inputs.s, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);

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
    for (let i = 0; i < 50; i++) {
      const ew = Math.exp(w);
      const f = w * ew - z;
      const wp1 = w + 1;
      const denom = ew * wp1 - (wp1 + 1) * f / (2 * wp1);
      if (Math.abs(denom) < 1e-18) break;
      let dw = f / denom;
      dw = Math.max(Math.min(dw, 1), -1);
      w -= dw;
      if (Math.abs(dw) < 1e-12) break;
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

    if (!validateAll(true, true)) return;

    // For calculation, we rely on r and s (which are updated by convert functions)
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    
    // Safety check
    if (!needFinite("r", r, [inputs.r])) return;
    if (!needFinite("s", s, [inputs.s])) return;
    if ((1 - r) <= ONE_R_EPS) {
        addError("Calculation singularity (r ≈ 1).", [inputs.r]);
        return;
    }

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);
    
    // Calculate BED1 using Unified RD formula
    const BED1 = bedUnified(D1, n1, r, s);

    // Calculate Isoeffective D2 using Lambert-W inversion
    const one_r = 1 - r;
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
