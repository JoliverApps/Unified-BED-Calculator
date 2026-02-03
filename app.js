document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const cellSelect = document.getElementById('cell-line-select');
  const cellDesc = document.getElementById('cell-desc');
  const sourceBox = document.getElementById('source-box');
  const sourceText = document.getElementById('source-text');
  const sourceUrl = document.getElementById('source-url');

  const errorContainer = document.getElementById('error-container');
  const btnCalc = document.getElementById('calculate-btn');

  const resultContainer = document.getElementById('result-container');
  const lblDpf = document.getElementById('original-dpf');

  // Result Fields
  const bedText = document.getElementById('bed-text');
  const resultText = document.getElementById('result-text');
  const dpfText = document.getElementById('dose-per-fraction-text');
  const bedRefText = document.getElementById('bed-ref-text'); 

  const inputs = {
    // New Primary Parameters
    ab: document.getElementById('param-ab'), // alpha/beta
    dq: document.getElementById('param-dq'), // Dq
    
    // Schedule
    d1: document.getElementById('dose-d1'),
    n1: document.getElementById('fractions-n1'),
    n2: document.getElementById('fractions-n2'),
  };

  let suppress = false;

  // --- Numeric Tolerances ---
  const R_EPS = 1e-12;      // r -> 0 singularity
  const ONE_R_EPS = 1e-9;   // 1-r -> 0 (BED blowup)
  const W_EPS = 1e-14;      // Lambert W convergence
  const ZERO_TOL = 1e-12;

  // --- UI Helpers ---
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

  function updateDpf() {
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    if (Number.isFinite(D1) && Number.isFinite(n1) && D1 > 0 && n1 > 0) {
      lblDpf.textContent = (D1 / n1).toFixed(2);
    } else {
      lblDpf.textContent = "--";
    }
  }

  function breakPresetAndDetach() {
    if (suppress) return;
    if (cellSelect.value === "") return;
    suppress = true;
    cellSelect.value = "";
    cellDesc.textContent = "";
    sourceBox.classList.add('hidden');
    suppress = false;
  }

  // --- CORE: Parameter Mapping ---
  // Calculates (r, s) from (alpha/beta, Dq) using the quadratic root
  function getModelParams() {
    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    // 1. Basic numeric validity checks (allow negatives)
    if (!Number.isFinite(AB) || !Number.isFinite(DQ)) return null;

    // 2. Singularity checks
    // If AB is zero, we divide by zero in the formula.
    if (Math.abs(AB) < ZERO_TOL) {
      addError("α/β cannot be zero (Division by zero in r derivation).", [inputs.ab]);
      return null;
    }
    // If DQ is zero, s is undefined.
    if (Math.abs(DQ) < ZERO_TOL) {
      addError("Dq cannot be zero (s is undefined).", [inputs.dq]);
      return null;
    }

    // 3. Quadratic Solution for r
    // r = ( sqrt( Dq^2 + 2*Dq*AB ) - Dq ) / AB
    const termInside = (DQ * DQ) + (2 * DQ * AB);

    if (termInside < 0) {
      addError("Complex root detected: Dq² + 2·Dq·(α/β) < 0. No real solution.", [inputs.ab, inputs.dq]);
      return null;
    }

    const r = (Math.sqrt(termInside) - DQ) / AB;
    
    // 4. Calculate s
    // s = r / Dq
    const s = r / DQ;

    // 5. Check Physical constraints for BED formula
    // We need 1-r != 0 for the BED denominator
    if (Math.abs(1 - r) <= ONE_R_EPS) {
      addError(`Singularity detected: derived r ≈ 1 (implies α/β ≈ 0).`, [inputs.ab]);
      return null;
    }

    return { r, s };
  }

  // --- Validation ---
  function validateInputs(strict = false) {
    clearErrorsAndInvalid();
    
    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    // Simple existence check
    if (strict) {
       if (!Number.isFinite(AB)) addError("α/β is required.", [inputs.ab]);
       if (!Number.isFinite(DQ)) addError("Dq is required.", [inputs.dq]);
    }
    
    // Check if params can be derived
    const params = getModelParams();
    return params !== null;
  }

  // --- Preset Loading ---
  function initData() {
    if (!window.RD_DATA) return;
    const isVerified = (v) => v === true || v === 1 || v === "true";
    const keysVerified = Object.keys(window.RD_DATA).filter(k => isVerified(window.RD_DATA[k]?.verified)).sort();
    
    cellSelect.innerHTML = '<option value="">— Select Verified Cell Line —</option>';
    if (keysVerified.length === 0) {
      cellSelect.innerHTML = '<option value="">No verified datasets available</option>';
      return;
    }

    keysVerified.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      cellSelect.appendChild(opt);
    });
  }

  // --- Preset Listener ---
  cellSelect.addEventListener('change', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

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
    suppress = false;

    cellDesc.textContent = data.desc || "";
    if (data.source || data.url) {
      sourceText.textContent = data.source || "";
      sourceUrl.textContent = data.url || "";
      sourceUrl.href = data.url || "#";
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    updateDpf();
    updateReferenceDerived();
  });

  // --- BED Calculations ---
  function bedUnified(D, n, r, s) {
    const one_r = 1 - r;
    // Safety
    if (!Number.isFinite(D) || !Number.isFinite(n) || D <= 0 || n <= 0) return NaN;

    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x); // 1 - e^{-s d}
    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function updateReferenceDerived() {
    updateDpf();
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    
    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1))) {
      bedRefText.textContent = "--";
      return;
    }

    const params = getModelParams(); // safe getter (handles null internally)
    if (!params) {
      bedRefText.textContent = "--";
      return;
    }

    const BED1 = bedUnified(D1, n1, params.r, params.s);
    if (!Number.isFinite(BED1)) {
       bedRefText.textContent = "Error";
       return;
    }
    bedRefText.textContent = `${BED1.toFixed(2)} Gy`;
  }

  // --- Input Listeners ---
  function attachInputBehavior(el, detachPreset = false) {
    el.addEventListener('input', () => {
      hideResults();
      if (detachPreset) breakPresetAndDetach();
      if (bedText) bedText.textContent = "";
      updateReferenceDerived();
      // On input, we just clear errors, we don't strictly validate until calc
      if (errorContainer.innerHTML !== "") validateInputs(false); 
    });
  }

  attachInputBehavior(inputs.ab, true);
  attachInputBehavior(inputs.dq, true);
  attachInputBehavior(inputs.d1, false);
  attachInputBehavior(inputs.n1, false);
  attachInputBehavior(inputs.n2, false);

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

  // --- Main Calculation ---
  btnCalc.addEventListener('click', () => {
    hideResults();
    
    // 1. Validate AB/DQ
    const params = getModelParams();
    if (!params) {
       // getModelParams adds its own errors to UI
       return;
    }

    // 2. Validate Schedule
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    let schedErr = false;
    if (!(Number.isFinite(D1) && D1 > 0)) { addError("Total Dose D1 must be > 0", [inputs.d1]); schedErr=true; }
    if (!isPosInt(n1)) { addError("n1 must be an integer > 0", [inputs.n1]); schedErr=true; }
    if (!isPosInt(n2)) { addError("n2 must be an integer > 0", [inputs.n2]); schedErr=true; }
    if (schedErr) return;

    // 3. Calc BED1
    const { r, s } = params;
    const one_r = 1 - r;
    const d1 = D1 / n1;
    const x = -s * d1;
    const BED1 = (D1 / one_r) - ((n1 * r) / (s * one_r)) * (-Math.expm1(x));

    if (!Number.isFinite(BED1)) {
        addError("Calculation Error: Resulting BED is infinite or invalid.", []);
        return;
    }

    // 4. Solve for D2 using Lambert W
    // K = r + (s * (1-r)/n2) * BED
    const K = r + ( (s * one_r) / n2 ) * BED1;
    
    // z = -r * exp(-K)
    const z = -r * Math.exp(-K);
    const w_val = lambertW0(z);

    if (!Number.isFinite(w_val)) {
        addError("Mathematical Domain Error: Lambert-W argument out of bounds (Check if inputs are physically consistent).", []);
        return;
    }

    // D2 = (n2 / s) * (K + W(z))
    const D2 = (n2 / s) * (K + w_val);

    if (!(Number.isFinite(D2) && D2 > 0)) {
        addError("Computed D2 is non-physical (<= 0).", []);
        return;
    }

    // Display
    const d2_val = D2 / n2;
    bedText.textContent = `${BED1.toFixed(2)} Gy`;
    resultText.textContent = `${D2.toFixed(2)} Gy`;
    dpfText.textContent = `${d2_val.toFixed(2)} Gy`;

    document.getElementById('dbg-r').textContent = r.toFixed(4);
    document.getElementById('dbg-s').textContent = s.toFixed(4);
    document.getElementById('dbg-k').textContent = K.toFixed(4);
    document.getElementById('dbg-w').textContent = w_val.toFixed(4);

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  });

  // Init
  initData();
  updateReferenceDerived();
});
