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

  // Debug fields (optional in UI)
  const dbgBed = document.getElementById('dbg-bed1');
  const dbgK = document.getElementById('dbg-k');
  const dbgW = document.getElementById('dbg-w');

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
  const ONE_R_EPS = 1e-9;  // 1-r -> 0 singularity threshold
  const W_EPS = 1e-12;     // Lambert W convergence threshold (practical for JS)
  const S_EPS = 1e-12;

  // --- Helpers: safe exp for large magnitude ---
  function expSafe(x) {
    // JS Math.exp overflows > ~709.78
    if (x > 709.0) return Infinity;
    if (x < -745.0) return 0; // underflow to ~0
    return Math.exp(x);
  }

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
    // Close the details panel if it exists
    const details = resultContainer.querySelector('details');
    if (details) details.open = false;
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
    // Robust: reject empty/whitespace explicitly
    if (typeof v !== 'string' || v.trim() === '') return NaN;
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
      if (Number.isFinite(ab) && Math.abs(ab) < 1e-12) addError("α/β cannot be zero.", [inputs.ab]);
    }
    if (shouldValidate(inputs.dq)) {
      if (!Number.isFinite(dq)) addError("Dq must be a valid number.", [inputs.dq]);
      if (Number.isFinite(dq) && Math.abs(dq) < 1e-12) addError("Dq cannot be zero.", [inputs.dq]);
    }

    if (shouldValidate(inputs.r)) {
      if (!Number.isFinite(r)) addError("r is invalid.", [inputs.r]);
      // r≈1 causes 1/(1-r) blow-up; also r>1 makes standard BED normalization problematic.
      if (Number.isFinite(r) && (1 - r) <= ONE_R_EPS) addError("r ≈ 1 (singularity).", [inputs.r]);
    }
    if (shouldValidate(inputs.s)) {
      if (!Number.isFinite(s)) addError("s is invalid.", [inputs.s]);
      // Allow negative s only if you explicitly intend it; otherwise disallow:
      // if (Number.isFinite(s) && s <= 0) addError("s must be > 0.", [inputs.s]);
    }

    // Schedule
    if (shouldValidate(inputs.d1)) {
      const D1 = toNum(inputs.d1.value);
      if (!(Number.isFinite(D1) && D1 > 0)) addError("Total Dose D1 must be > 0.", [inputs.d1]);
    }
    if (shouldValidate(inputs.n1)) {
      const n1 = toNum(inputs.n1.value);
      if (!isPosInt(n1)) addError("n1 must be a positive integer.", [inputs.n1]);
    }
    if (shouldValidate(inputs.n2)) {
      const n2 = toNum(inputs.n2.value);
      if (!isPosInt(n2)) addError("n2 must be a positive integer.", [inputs.n2]);
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

    // r = 2 * [ (sqrt(Dq^2 + Dq(α/β)) - Dq) / (α/β) ]
    const termInside = (DQ * DQ) + (DQ * AB); 
    
    if (termInside < 0) {
      addError("Complex root detected (Dq, α/β mismatch).", [inputs.ab, inputs.dq]);
      return;
    }

    const r = 2 * ((Math.sqrt(termInside) - DQ) / AB);
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
    if (Math.abs(s) < 1e-12 || Math.abs(r) < 1e-12) return;

    // Dq = r/s 
    // α/β (clinic) = 4 * (1-r)/(r s)
    // (This is 2x the internal RD ratio, so the numerator factor becomes 4)
    const DQ = r / s;
    const AB = (4 * (1 - r)) / (r * s);

    suppress = true;
    inputs.dq.value = DQ.toFixed(6);
    inputs.ab.value = Number.isFinite(AB) ? AB.toFixed(6) : '';
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
    // Robustness: Check if external script loaded
    if (typeof window.RD_DATA === 'undefined') {
      cellSelect.innerHTML = '<option value="">Error: Data unavailable (network?)</option>';
      cellSelect.disabled = true;
      return;
    }

    const isVerified = (v) => v === true || v === 1 || v === "true";
    const keys = Object.keys(window.RD_DATA)
      .filter(k => isVerified(window.RD_DATA[k]?.verified))
      .sort();

    cellSelect.innerHTML = '<option value="">— Select Cell Line —</option>';
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

    // Load α/β and Dq
    inputs.ab.value = data.alpha_by_beta ?? '';
    inputs.dq.value = data.D_q ?? '';

    // Clear RD/Schedule
    inputs.r.value = '';
    inputs.s.value = '';
    inputs.d1.value = '';
    inputs.n1.value = '';
    inputs.n2.value = '';

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
    if ((1 - r) <= ONE_R_EPS) return NaN; // singular

    // Limit case s -> 0: use series limit of (1 - e^{-s D/n})/s -> D/n
    if (Math.abs(s) < S_EPS) {
      // BED = D/(1-r) - (n r)/(s(1-r))*(1-e^{-s D/n})
      // -> D/(1-r) - (n r)/(1-r) * (D/n) = D
      return D;
    }

    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x); // 1 - e^{-s D/n} (stable)
    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function denomBEDperFrac2Gy(r, s) {
    const one_r = 1 - r;
    if ((1 - r) <= ONE_R_EPS) return NaN;

    if (Math.abs(s) < S_EPS) return 2; // consistent with limit BED = D

    const termExp2 = -Math.expm1(-2 * s); // 1 - e^{-2s}
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

    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1))) {
      clearReferenceDerived();
      return;
    }

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!Number.isFinite(r) || !Number.isFinite(s)) {
      clearReferenceDerived();
      return;
    }
    if ((1 - r) <= ONE_R_EPS) {
      clearReferenceDerived();
      return;
    }

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      clearReferenceDerived();
      return;
    }

    const bed2Gy = denomBEDperFrac2Gy(r, s);
    let nEqd2 = 0;
    let D_Eqd2 = 0;

    if (Number.isFinite(bed2Gy) && bed2Gy > 1e-9) {
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
      // Only re-run non-strict validation if there are errors currently shown
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

  // --- Robust Lambert W0 (Principal Branch) ---
  // Halley's method + branch-point initialization near z ~ -1/e.
  function lambertW0(z) {
    if (!Number.isFinite(z)) return NaN;

    const minZ = -1 / Math.E;
    if (z < minZ - 1e-15) return NaN;
    if (Math.abs(z - minZ) < 1e-15) return -1;
    if (Math.abs(z) < 1e-16) return 0;

    let w;

    // Initial guess
    if (z < -0.3) {
      // Near branch point: w ≈ -1 + p - p^2/3, p = sqrt(2(e z + 1))
      const t = Math.E * z + 1;
      const p = Math.sqrt(Math.max(0, 2 * t));
      w = -1 + p - (p * p) / 3;
      // keep in principal branch domain
      if (w > 0) w = -0.1;
      if (w < -1) w = -1;
    } else if (z < 1) {
      w = z; // good near 0
    } else {
      // large z
      w = Math.log(z) - Math.log(Math.log(z));
    }

    // Halley's iterations
    for (let i = 0; i < 30; i++) {
      const ew = expSafe(w);
      const wew = w * ew;
      const f = wew - z;

      const wp1 = w + 1;
      if (Math.abs(wp1) < 1e-15) {
        // avoid division blow-up near w=-1
        w += 1e-6;
        continue;
      }

      // Halley denominator:
      // w_{n+1} = w - f / ( ew*(w+1) - (w+2)*f/(2*(w+1)) )
      const denom = ew * wp1 - ((w + 2) * f) / (2 * wp1);
      if (!Number.isFinite(denom) || Math.abs(denom) < 1e-18) break;

      const dw = f / denom;
      w -= dw;

      if (!Number.isFinite(w)) return NaN;
      if (Math.abs(dw) < W_EPS) break;
    }

    return w;
  }

  // --- Display Result Helper ---
  function updateResultUI(BED_val, D2_val, n2_val, K_val, W_val) {
    const d2_val = D2_val / n2_val;

    if (bedText) bedText.textContent = `${BED_val.toFixed(2)} Gy`;
    if (resultText) resultText.textContent = `${D2_val.toFixed(2)} Gy`;
    if (dpfText) dpfText.textContent = `${d2_val.toFixed(2)} Gy`;

    if (dbgBed) dbgBed.textContent = BED_val.toFixed(6);
    if (dbgK) dbgK.textContent = (K_val !== null && Number.isFinite(K_val)) ? K_val.toFixed(6) : "—";
    if (dbgW) dbgW.textContent = (W_val !== null && Number.isFinite(W_val)) ? W_val.toFixed(6) : "—";

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // --- MAIN CALCULATION ---
  btnCalc.addEventListener('click', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

    if (!validateAll(true, true)) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!needFinite("r", r, [inputs.r])) return;
    if (!needFinite("s", s, [inputs.s])) return;

    if ((1 - r) <= ONE_R_EPS) {
      addError("Calculation singularity (r ≈ 1).", [inputs.r]);
      return;
    }
    if (Math.abs(s) < S_EPS) {
      addError("s is too close to zero for stable inversion.", [inputs.s]);
      return;
    }

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    if (!needFinite("D1", D1, [inputs.d1])) return;
    if (!needFinite("n1", n1, [inputs.n1])) return;
    if (!needFinite("n2", n2, [inputs.n2])) return;

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      addError("BED computation failed (check parameters).", [inputs.r, inputs.s]);
      return;
    }

    const one_r = 1 - r;
    const K = r + (s * one_r / n2) * BED1;

    // arg = -r exp(-K) with exp clamp for stability
    const eNegK = expSafe(-K);
    if (!Number.isFinite(eNegK)) {
      addError("Numeric overflow in exp(-K). Please check inputs.", []);
      return;
    }
    const arg = -r * eNegK;

    const w_val = lambertW0(arg);
    if (!Number.isFinite(w_val)) {
      addError("Lambert-W failure: parameters out of domain / non-physical root.", [inputs.r, inputs.s]);
      return;
    }

    const D2 = (n2 / s) * (K + w_val);
    if (!(Number.isFinite(D2) && D2 > 0)) {
      addError("Computed D2 is non-physical (negative or infinite).", []);
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
