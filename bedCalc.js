/**
 * Unified BED Calculator - Core Logic (bedCalc.js)
 * -------------------------------------------------
 * Reactive architecture: Auto-calculates isoeffect via Lambert W
 * the moment a valid mathematical state is reached.
 */

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

  const resultContainer = document.getElementById('result-container');
  const lblDpf = document.getElementById('original-dpf');

  // Result Fields
  const bedText = document.getElementById('bed-text');
  const resultText = document.getElementById('result-text');
  const dpfText = document.getElementById('dose-per-fraction-text');

  // Reference-derived
  const bedRefText = document.getElementById('bed-ref-text');
  const refEqd2FractionsText = document.getElementById('ref-eqd2-fractions-text');
  const refEqd2TotalText = document.getElementById('ref-eqd2-total-text');

  // Debug fields
  const dbgBed = document.getElementById('dbg-bed1');
  const dbgK = document.getElementById('dbg-k');
  const dbgW = document.getElementById('dbg-w');

  const inputs = {
    ab: document.getElementById('param-ab'),
    dq: document.getElementById('param-dq'),
    r: document.getElementById('param-r'),
    s: document.getElementById('param-s'),
    d1: document.getElementById('dose-d1'),
    n1: document.getElementById('fractions-n1'),
    n2: document.getElementById('fractions-n2'),
  };

  // --- State ---
  let currentMode = 'classical'; 
  let suppress = false;

  // --- Numeric Tolerances ---
  const ONE_R_EPS = 1e-9;  
  const W_EPS = 1e-12;     
  const S_EPS = 1e-12;

  // --- Helpers ---
  function expSafe(x) {
    if (x > 709.0) return Infinity;
    if (x < -745.0) return 0; 
    return Math.exp(x);
  }

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
    const details = resultContainer.querySelector('details');
    if (details) details.open = false;
  }

  function clearErrorsAndInvalid() {
    Object.values(inputs).forEach(el => el.classList.remove('invalid'));
    errorContainer.innerHTML = '';
    errorContainer.classList.add('hidden');
  }

  function addError(msg, elements = []) {
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = msg;
    errorContainer.appendChild(p);
    errorContainer.classList.remove('hidden');
    elements.forEach(el => el.classList.add('invalid'));
  }

  function toNum(v) {
    if (typeof v !== 'string' || v.trim() === '') return NaN;
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

  // --- Validation Logic ---
  function validateAll(strict = false, validateSchedule = false) {
    clearErrorsAndInvalid();
    let isValid = true;

    const scheduleSet = new Set([inputs.d1, inputs.n1, inputs.n2]);

    const shouldValidate = (el) => {
      if (scheduleSet.has(el)) return validateSchedule;
      if (el.disabled) return false;
      if (strict) return true;
      return el.value !== "";
    };

    const checkError = (condition, msg, els) => {
      if (condition) {
        addError(msg, els);
        isValid = false;
      }
    };

    const ab = toNum(inputs.ab.value);
    const dq = toNum(inputs.dq.value);
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (shouldValidate(inputs.ab)) {
      checkError(!Number.isFinite(ab), "α/β must be a valid number.", [inputs.ab]);
      checkError(Number.isFinite(ab) && Math.abs(ab) < 1e-12, "α/β cannot be zero.", [inputs.ab]);
    }
    if (shouldValidate(inputs.dq)) {
      checkError(!Number.isFinite(dq), "Dq must be a valid number.", [inputs.dq]);
      checkError(Number.isFinite(dq) && Math.abs(dq) < 1e-12, "Dq cannot be zero.", [inputs.dq]);
    }

    if (shouldValidate(inputs.r)) {
      checkError(!Number.isFinite(r), "r is invalid.", [inputs.r]);
      checkError(Number.isFinite(r) && (1 - r) <= ONE_R_EPS, "r ≈ 1 (singularity).", [inputs.r]);
    }
    if (shouldValidate(inputs.s)) {
      checkError(!Number.isFinite(s), "s is invalid.", [inputs.s]);
    }

    if (shouldValidate(inputs.d1)) {
      const D1 = toNum(inputs.d1.value);
      checkError(!(Number.isFinite(D1) && D1 > 0), "Total Dose D1 must be > 0.", [inputs.d1]);
    }
    if (shouldValidate(inputs.n1)) {
      const n1 = toNum(inputs.n1.value);
      checkError(!isPosInt(n1), "n1 must be a positive integer.", [inputs.n1]);
    }
    if (shouldValidate(inputs.n2)) {
      const n2 = toNum(inputs.n2.value);
      checkError(!isPosInt(n2), "n2 must be a positive integer.", [inputs.n2]);
    }

    return isValid;
  }

  // --- Parameter Mappings ---
  function convertClassicalToRD() {
    if (suppress) return;
    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    if (!Number.isFinite(AB) || !Number.isFinite(DQ) || Math.abs(AB) < 1e-12 || Math.abs(DQ) < 1e-12) return;

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
  }
  
  function convertRDToClassical() {
    if (suppress) return;
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!Number.isFinite(r) || !Number.isFinite(s) || Math.abs(s) < 1e-12 || Math.abs(r) < 1e-12) return;

    const DQ = r / s;
    const AB = (4 * (1 - r)) / (r * s);

    suppress = true;
    inputs.dq.value = DQ.toFixed(6);
    inputs.ab.value = Number.isFinite(AB) ? AB.toFixed(6) : '';
    suppress = false;
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
    updateModeUI();
    tryCalculateEquivalence();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  // --- Preset Loading ---
  function initData() {
    if (typeof window.RD_DATA === 'undefined') {
      cellSelect.innerHTML = '<option value="">Error: Data unavailable (network?)</option>';
      cellSelect.disabled = true;
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
    if(currentMode !== 'classical') setMode('classical');
    
    suppress = false;
    convertClassicalToRD();

    cellDesc.textContent = data.desc || "";
    if (data.source || data.url) {
      sourceText.textContent = data.source || "";
      sourceUrl.href = data.url || "#";
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    updateDpf();
    updateReferenceDerived();
    tryCalculateEquivalence();
  });

  // --- Mathematical Core ---
  function bedUnified(D, n, r, s) {
    const one_r = 1 - r;
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

  function updateReferenceDerived() {
    updateDpf();
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!(Number.isFinite(D1) && D1 > 0 && isPosInt(n1) && Number.isFinite(r) && Number.isFinite(s) && (1 - r) > ONE_R_EPS)) {
      bedRefText.textContent = "--";
      refEqd2FractionsText.textContent = "--";
      refEqd2TotalText.textContent = "--";
      return;
    }

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) return;

    const bed2Gy = denomBEDperFrac2Gy(r, s);
    let nEqd2 = 0, D_Eqd2 = 0;

    if (Number.isFinite(bed2Gy) && bed2Gy > 1e-9) {
      nEqd2 = BED1 / bed2Gy;
      D_Eqd2 = nEqd2 * 2;
    }

    bedRefText.textContent = `${BED1.toFixed(2)} Gy`;
    refEqd2FractionsText.textContent = nEqd2 > 0 ? nEqd2.toFixed(2) : "--";
    refEqd2TotalText.textContent = D_Eqd2 > 0 ? `${D_Eqd2.toFixed(2)} Gy` : "--";
  }

  function lambertW0(z) {
    if (!Number.isFinite(z)) return NaN;
    const minZ = -1 / Math.E;
    if (z < minZ - 1e-15) return NaN;
    if (Math.abs(z - minZ) < 1e-15) return -1;
    if (Math.abs(z) < 1e-16) return 0;

    let w;
    if (z < -0.3) {
      const t = Math.E * z + 1;
      const p = Math.sqrt(Math.max(0, 2 * t));
      w = -1 + p - (p * p) / 3;
      if (w > 0) w = -0.1;
      if (w < -1) w = -1;
    } else if (z < 1) {
      w = z; 
    } else {
      w = Math.log(z) - Math.log(Math.log(z));
    }

    for (let i = 0; i < 30; i++) {
      const ew = expSafe(w);
      const wew = w * ew;
      const f = wew - z;
      const wp1 = w + 1;
      
      if (Math.abs(wp1) < 1e-15) { w += 1e-6; continue; }

      const denom = ew * wp1 - ((w + 2) * f) / (2 * wp1);
      if (!Number.isFinite(denom) || Math.abs(denom) < 1e-18) break;

      const dw = f / denom;
      w -= dw;

      if (!Number.isFinite(w)) return NaN;
      if (Math.abs(dw) < W_EPS) break;
    }
    return w;
  }

  // --- Real-time Reactive Engine ---
  function tryCalculateEquivalence() {
    clearErrorsAndInvalid();

    // 1. Check if the mathematical prerequisites are met quietly
    const d1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);
    
    let isReady = Number.isFinite(d1) && Number.isFinite(n1) && Number.isFinite(n2);
    
    if (currentMode === 'classical') {
      const ab = toNum(inputs.ab.value);
      const dq = toNum(inputs.dq.value);
      isReady = isReady && Number.isFinite(ab) && Number.isFinite(dq);
    } else {
      const r = toNum(inputs.r.value);
      const s = toNum(inputs.s.value);
      isReady = isReady && Number.isFinite(r) && Number.isFinite(s);
    }

    if (!isReady) {
      hideResults();
      return; 
    }

    // 2. Perform strict logic validation
    if (!validateAll(true, true)) {
      hideResults();
      return;
    }

    // 3. Execute Mathematics
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if ((1 - r) <= ONE_R_EPS) { addError("Calculation singularity (r ≈ 1).", [inputs.r]); hideResults(); return; }
    if (Math.abs(s) < S_EPS) { addError("s is too close to zero for stable inversion.", [inputs.s]); hideResults(); return; }

    const BED1 = bedUnified(d1, n1, r, s);
    if (!Number.isFinite(BED1)) { addError("BED computation failed.", [inputs.r, inputs.s]); hideResults(); return; }

    const K = r + (s * (1 - r) / n2) * BED1;
    const eNegK = expSafe(-K);
    if (!Number.isFinite(eNegK)) { addError("Numeric overflow in exp(-K).", []); hideResults(); return; }
    
    const arg = -r * eNegK;
    const w_val = lambertW0(arg);
    
    if (!Number.isFinite(w_val)) { addError("Lambert-W failure: parameters out of domain.", [inputs.r, inputs.s]); hideResults(); return; }

    const D2 = (n2 / s) * (K + w_val);
    if (!(Number.isFinite(D2) && D2 > 0)) { addError("Computed D2 is non-physical.", []); hideResults(); return; }

    // 4. Update UI seamlessly
    bedText.textContent = `${BED1.toFixed(2)}`;
    resultText.textContent = `${D2.toFixed(2)}`;
    dpfText.textContent = `${(D2 / n2).toFixed(2)}`;
    dbgBed.textContent = BED1.toFixed(6);
    dbgK.textContent = K.toFixed(6);
    dbgW.textContent = w_val.toFixed(6);

    resultContainer.classList.remove('hidden');
  }

  // --- Input Listeners ---
  function attachInputBehavior(el, onChange, detachPreset = false) {
    el.addEventListener('input', () => {
      if (detachPreset) breakPresetAndDetach();
      onChange();
      updateReferenceDerived();
      tryCalculateEquivalence(); // Reactive trigger
    });
  }

  attachInputBehavior(inputs.ab, () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);
  attachInputBehavior(inputs.dq, () => { if (currentMode === 'classical') convertClassicalToRD(); }, true);
  attachInputBehavior(inputs.r, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);
  attachInputBehavior(inputs.s, () => { if (currentMode === 'rd') convertRDToClassical(); }, true);
  attachInputBehavior(inputs.d1, () => {}, false);
  attachInputBehavior(inputs.n1, () => {}, false);
  attachInputBehavior(inputs.n2, () => {}, false);

  // --- Initialization ---
  initData();
  updateModeUI();
  updateDpf();
  updateReferenceDerived();
});
