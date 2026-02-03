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

    // RD Inputs (k removed as it cancels out in ratio)
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

  // --- Numeric Tolerances & Limits ---
  const ONE_R_EPS = 1e-9;   // Prevent r from being too close to 1 (Singularity)
  const S_EPS = 1e-12;      // Sensitization near zero (Linear limit)
  const W_EPS = 1e-14;      // Lambert W precision
  const DQ_EPS = 1e-6;      // Shoulder displacement near zero

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
    if(!v || v.trim() === '') return NaN;
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
  }

  function isPosInt(x) {
    return Number.isFinite(x) && Number.isInteger(x) && x > 0;
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

    // Classical Inputs
    const ab = toNum(inputs.ab.value);
    const dq = toNum(inputs.dq.value);

    // RD Inputs
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    const check = (el, condition, msg) => {
      if ((strict || el.value !== "") && !el.disabled && !condition) {
        addError(msg, [el]);
      }
    };

    if (currentMode === 'classical') {
        check(inputs.ab, Number.isFinite(ab) && Math.abs(ab) > 1e-12, "α/β must be a non-zero number.");
        check(inputs.dq, Number.isFinite(dq), "Dq must be a valid number.");
    }

    if (currentMode === 'rd') {
        check(inputs.r, Number.isFinite(r), "r is invalid.");
        check(inputs.r, (1 - r) > ONE_R_EPS, "r cannot be 1 (Singularity).");
        check(inputs.s, Number.isFinite(s), "s is invalid.");
        check(inputs.s, s >= 0, "s cannot be negative.");
    }
    
    // Cross-check for RD parameters (even if derived)
    if (inputs.r.value !== "" && Number.isFinite(r) && (1 - r) <= ONE_R_EPS) {
         addError("r ≈ 1 implies infinite BED (Singularity).", [inputs.r]);
    }

    // Schedule Validation
    if (validateSchedule || strict) {
      const D1 = toNum(inputs.d1.value);
      const n1 = toNum(inputs.n1.value);
      const n2 = toNum(inputs.n2.value);

      check(inputs.d1, Number.isFinite(D1) && D1 > 0, "Reference Dose must be > 0.");
      check(inputs.n1, isPosInt(n1), "Ref. Fractions must be a positive integer.");
      check(inputs.n2, isPosInt(n2), "New Fractions must be a positive integer.");
    }

    return !btnCalc.disabled;
  }

  // --- Conversion Classical (AB, Dq) -> RD (r, s) ---
  function convertClassicalToRD() {
    if (suppress) return;

    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    // Do nothing if inputs are incomplete
    if (!Number.isFinite(AB) || !Number.isFinite(DQ)) return;
    
    // Avoid division by zero
    if (Math.abs(AB) < 1e-12) return;

    let r, s;

    // EDGE CASE: No shoulder (Dq -> 0)
    if (Math.abs(DQ) < DQ_EPS) {
        r = 0;
        s = 0; 
    } else {
        // Normal Case
        // r = ( sqrt(Dq^2 + 2*Dq*AB) - Dq ) / AB
        const termInside = (DQ * DQ) + (2 * DQ * AB);
        
        if (termInside < 0) {
            addError("Complex root: Impossible (Dq, α/β) combination.", [inputs.ab, inputs.dq]);
            return;
        }

        r = (Math.sqrt(termInside) - DQ) / AB;
        s = r / DQ;
    }

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
    
    let DQ, AB;

    // EDGE CASE: s -> 0 (Linear limit)
    if (Math.abs(s) < S_EPS) {
        DQ = 0;
        AB = 0;
    } else {
        DQ = r / s;
        // alpha/beta = 2(1-r) / (rs)
        if (Math.abs(r) < 1e-12) {
             AB = 99999;
        } else {
             AB = (2 * (1 - r)) / (r * s);
        }
    }

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
    if (currentMode === mode) return;
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
    
    inputs.ab.value = data.alpha_by_beta ?? '';
    inputs.dq.value = data.D_q ?? '';
    inputs.r.value = ''; inputs.s.value = '';

    suppress = false;
    
    // Always calculate derived params regardless of current mode
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

  // --- CORE MATH: BED / EQD2 ---
  
  function bedUnified(D, n, r, s) {
    if (!Number.isFinite(D) || !Number.isFinite(n) || D <= 0 || n <= 0) return NaN;
    const one_r = 1 - r;

    if (Math.abs(one_r) < ONE_R_EPS) return NaN;

    if (Math.abs(s) < S_EPS) return D;
    
    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x);
    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function denomBEDperFrac2Gy(r, s) {
    const one_r = 1 - r;
    if (Math.abs(s) < S_EPS) return 2;
    
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

    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1))) {
      clearReferenceDerived();
      return;
    }

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    
    if (!(Number.isFinite(r) && Number.isFinite(s))) {
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

    if (Number.isFinite(bed2Gy) && bed2Gy > 0.0001) {
      nEqd2 = BED1 / bed2Gy;
      D_Eqd2 = nEqd2 * 2;
    } else if (bed2Gy <= 0) {
      nEqd2 = 0; 
    }

    bedRefText.textContent = `${BED1.toFixed(2)} Gy`;
    refEqd2FractionsText.textContent = nEqd2 > 0 ? nEqd2.toFixed(2) : "--";
    refEqd2TotalText.textContent = D_Eqd2 > 0 ? `${D_Eqd2.toFixed(2)} Gy` : "--";
  }

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

  // --- MATH: Lambert W0 (Halley's Method) ---
  function lambertW0(z) {
    const minZ = -1 / Math.E; // -0.367879...

    if (!Number.isFinite(z)) return NaN;

    // Domain clamp near branch point (-1/e): tolerate tiny FP underflow
    const BRANCH_TOL = 1e-12;
    if (z < minZ) {
      if (z >= minZ - BRANCH_TOL) {
        z = minZ;
      } else {
        return NaN;
      }
    }

    // Special Values
    if (Math.abs(z - minZ) < 1e-12) return -1;
    if (Math.abs(z) < W_EPS) return 0;

    // Initial Guess
    let w;
    if (z < 0) {
       w = z > -0.3 ? -0.5 : -1.0; 
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

      if (Math.abs(denom) < 1e-12) break;

      let dw = f / denom;
      dw = Math.max(Math.min(dw, 2), -2);

      const wNew = w - dw;
      if (Math.abs(wNew - w) < W_EPS) {
        w = wNew;
        break;
      }
      w = wNew;
    }
    return w;
  }

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

  // --- MAIN CALCULATION TRIGGER ---
  btnCalc.addEventListener('click', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

    if (!validateAll(true, true)) return;

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    
    const one_r = 1 - r;
    
    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      addError("Calculation Error: BED is infinite/invalid.", []);
      return;
    }

    if (Math.abs(s) < S_EPS) {
      updateResultUI(D1, D1, n2, null, null);
      return;
    }

    const K = r + (s * one_r / n2) * BED1;
    const arg = -r * Math.exp(-K);

    const w_val = lambertW0(arg);
    if (!Number.isFinite(w_val)) {
      addError("No Solution: Target dose physically impossible (Lambert-W domain error).", []);
      return;
    }

    const D2 = (n2 / s) * (K + w_val);
    if (!(Number.isFinite(D2) && D2 > 0)) {
      addError("Computed D2 is non-physical (< 0).", []);
      return;
    }

    updateResultUI(BED1, D2, n2, K, w_val);
  });

  // --- Initialization ---
  initData();
  updateModeUI();
  updateReferenceDerived();
  validateAll(false, false);
});
