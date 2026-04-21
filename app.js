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

  const groupRD = document.getElementById('group-rd');
  const groupClassical = document.getElementById('group-classical');

  const resultContainer = document.getElementById('result-container');
  const resultEmptyState = document.getElementById('result-empty-state');
  const lblDpf = document.getElementById('original-dpf');

  // Result Fields
  const bedText = document.getElementById('bed-text');
  const resultText = document.getElementById('result-text');
  const dpfText = document.getElementById('dose-per-fraction-text');

  // Reference-derived (LIVE)
  const bedRefText = document.getElementById('bed-ref-text');
  const refEqd2FractionsText = document.getElementById('ref-eqd2-fractions-text');
  const refEqd2TotalText = document.getElementById('ref-eqd2-total-text');

  // Debug fields
  const dbgBed = document.getElementById('dbg-bed1');
  const dbgK = document.getElementById('dbg-k');
  const dbgW = document.getElementById('dbg-w');

  const inputs = {
    // Classical Inputs
    ab: document.getElementById('param-ab'),
    dq: document.getElementById('param-dq'),

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
  const ONE_R_EPS = 1e-9;
  const W_EPS = 1e-12;
  const S_EPS = 1e-12;
  const ZERO_EPS = 1e-12;

  // --- Helpers ---
  function expSafe(x) {
    if (x > 709.0) return Infinity;
    if (x < -745.0) return 0;
    return Math.exp(x);
  }

  function toNum(v) {
    if (typeof v !== 'string' || v.trim() === '') return NaN;
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
  }

  function isPosInt(x) {
    return Number.isFinite(x) && Number.isInteger(x) && x > 0;
  }

  function fmt(x, digits = 2) {
    return Number.isFinite(x) ? x.toFixed(digits) : '--';
  }

  function needFinite(name, x, els = []) {
    if (!Number.isFinite(x)) {
      addError(`Internal error: ${name} is missing or invalid.`, els);
      return false;
    }
    return true;
  }

  function clearRDFields() {
    suppress = true;
    inputs.r.value = '';
    inputs.s.value = '';
    suppress = false;
  }

  function clearClassicalFields() {
    suppress = true;
    inputs.ab.value = '';
    inputs.dq.value = '';
    suppress = false;
  }

  // --- UI Helpers ---
  const setActive = (btn) => {
    btn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
    btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
    btn.setAttribute('aria-pressed', 'true');
  };

  const setInactive = (btn) => {
    btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
    btn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
    btn.setAttribute('aria-pressed', 'false');
  };

  function showEmptyResults() {
    resultContainer.classList.add('hidden');
    resultEmptyState.classList.remove('hidden');
    const details = resultContainer.querySelector('details');
    if (details) details.open = false;
  }

  function showResultPanel() {
    resultEmptyState.classList.add('hidden');
    resultContainer.classList.remove('hidden');
  }

  function clearErrorsAndInvalid() {
    Object.values(inputs).forEach(el => el.classList.remove('invalid'));
    errorContainer.innerHTML = '';
    errorContainer.classList.add('hidden');

    if (btnCalc) {
      btnCalc.disabled = false;
      btnCalc.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  function addError(msg, elements = []) {
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = msg;
    errorContainer.appendChild(p);
    errorContainer.classList.remove('hidden');

    elements.forEach(el => {
      if (el) el.classList.add('invalid');
    });

    if (btnCalc) {
      btnCalc.disabled = true;
      btnCalc.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  function updateDpf() {
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);

    if (Number.isFinite(D1) && Number.isFinite(n1) && D1 > 0 && n1 > 0) {
      lblDpf.textContent = (D1 / n1).toFixed(2);
    } else {
      lblDpf.textContent = '--';
    }
  }

  function breakPresetAndDetach() {
    if (suppress) return;
    if (cellSelect.value === '') return;

    suppress = true;
    cellSelect.value = '';
    cellDesc.textContent = '';
    sourceBox.classList.add('hidden');
    suppress = false;
  }

  function clearReferenceDerived() {
    bedRefText.textContent = '--';
    refEqd2FractionsText.textContent = '--';
    refEqd2TotalText.textContent = '--';
  }

  // --- Validation ---
  function validateAll(strict = false, validateSchedule = false) {
    clearErrorsAndInvalid();

    const scheduleSet = new Set([inputs.d1, inputs.n1, inputs.n2]);

    const shouldValidate = (el) => {
      if (scheduleSet.has(el)) return validateSchedule;
      if (el.disabled) return false;
      if (strict) return true;
      return el.value !== '';
    };

    const ab = toNum(inputs.ab.value);
    const dq = toNum(inputs.dq.value);
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    // Classical
    if (shouldValidate(inputs.ab)) {
      if (!Number.isFinite(ab)) addError('α/β must be a valid number.', [inputs.ab]);
      if (Number.isFinite(ab) && Math.abs(ab) < ZERO_EPS) addError('α/β cannot be zero.', [inputs.ab]);
    }

    if (shouldValidate(inputs.dq)) {
      if (!Number.isFinite(dq)) addError('Dq must be a valid number.', [inputs.dq]);
      if (Number.isFinite(dq) && Math.abs(dq) < ZERO_EPS) addError('Dq cannot be zero.', [inputs.dq]);
    }

    if (
      currentMode === 'classical' &&
      Number.isFinite(ab) &&
      Number.isFinite(dq) &&
      Math.abs(ab) >= ZERO_EPS &&
      Math.abs(dq) >= ZERO_EPS &&
      shouldValidate(inputs.ab) &&
      shouldValidate(inputs.dq)
    ) {
      const disc = (dq * dq) + (2 * dq * ab);
      if (disc < 0) {
        addError('Invalid classical pair: α/β and Dq produce no real RD solution.', [inputs.ab, inputs.dq]);
      }
    }

    // RD
    if (shouldValidate(inputs.r)) {
      if (!Number.isFinite(r)) addError('r must be a valid number.', [inputs.r]);
      if (Number.isFinite(r) && (1 - r) <= ONE_R_EPS) addError('r must satisfy r < 1.', [inputs.r]);
    }

    if (shouldValidate(inputs.s)) {
      if (!Number.isFinite(s)) addError('s must be a valid number.', [inputs.s]);
      if (Number.isFinite(s) && s < 0) addError('s must satisfy s ≥ 0.', [inputs.s]);
    }

    // Schedule
    if (shouldValidate(inputs.d1)) {
      const D1 = toNum(inputs.d1.value);
      if (!(Number.isFinite(D1) && D1 > 0)) addError('Total dose D1 must be > 0.', [inputs.d1]);
    }

    if (shouldValidate(inputs.n1)) {
      const n1 = toNum(inputs.n1.value);
      if (!isPosInt(n1)) addError('n1 must be a positive integer.', [inputs.n1]);
    }

    if (shouldValidate(inputs.n2)) {
      const n2 = toNum(inputs.n2.value);
      if (!isPosInt(n2)) addError('n2 must be a positive integer.', [inputs.n2]);
    }

    return !btnCalc.disabled;
  }

  // --- Conversion: Classical (AB, Dq) -> RD (r, s) ---
  function convertClassicalToRD() {
    if (suppress) return;

    const AB = toNum(inputs.ab.value);
    const DQ = toNum(inputs.dq.value);

    if (!Number.isFinite(AB) || !Number.isFinite(DQ)) {
      clearRDFields();
      return;
    }

    if (Math.abs(AB) < ZERO_EPS || Math.abs(DQ) < ZERO_EPS) {
      clearRDFields();
      return;
    }

    const termInside = (DQ * DQ) + (2 * DQ * AB);

    if (termInside < 0) {
      clearRDFields();
      addError('Complex root detected (Dq, α/β mismatch).', [inputs.ab, inputs.dq]);
      return;
    }

    const root = Math.sqrt(termInside);
    let r;

    if (DQ >= 0) {
      r = (2 * DQ) / (root + DQ);
    } else {
      r = (root - DQ) / AB;
    }

    const s = r / DQ;

    if (!Number.isFinite(r) || !Number.isFinite(s)) {
      clearRDFields();
      addError('Parameter conversion failed (non-finite r or s).', [inputs.ab, inputs.dq]);
      return;
    }

    if ((1 - r) <= ONE_R_EPS) {
      clearRDFields();
      addError('Converted RD parameters are singular (r ≈ 1).', [inputs.ab, inputs.dq]);
      return;
    }

    if (s < 0) {
      clearRDFields();
      addError('Converted RD parameters violate s ≥ 0.', [inputs.ab, inputs.dq]);
      return;
    }

    suppress = true;
    inputs.r.value = r.toFixed(6);
    inputs.s.value = s.toFixed(6);
    suppress = false;
  }

  // --- Conversion: RD (r, s) -> Classical (AB, Dq) ---
  function convertRDToClassical() {
    if (suppress) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);

    if (!Number.isFinite(r) || !Number.isFinite(s)) {
      clearClassicalFields();
      return;
    }

    if ((1 - r) <= ONE_R_EPS) {
      clearClassicalFields();
      return;
    }

    // s = 0 is a valid RD limit for BED, but Dq = r/s is not representable.
    if (Math.abs(s) < S_EPS) {
      clearClassicalFields();
      return;
    }

    // r = 0 makes α/β diverge in the exact mapping; leave classical blank.
    if (Math.abs(r) < ZERO_EPS) {
      clearClassicalFields();
      return;
    }

    const DQ = r / s;
    const AB = (2 * (1 - r)) / (r * s);

    if (!Number.isFinite(DQ) || !Number.isFinite(AB)) {
      clearClassicalFields();
      addError('Parameter conversion failed (non-finite α/β or Dq).', [inputs.r, inputs.s]);
      return;
    }

    suppress = true;
    inputs.dq.value = DQ.toFixed(6);
    inputs.ab.value = AB.toFixed(6);
    suppress = false;
  }

  // --- UI Mode Switching ---
  function updateModeUI() {
    const classicalInputs = [inputs.ab, inputs.dq];
    const rdInputs = [inputs.r, inputs.s];

    if (currentMode === 'classical') {
      setActive(btnModeClassical);
      setInactive(btnModeRD);

      classicalInputs.forEach(el => { el.disabled = false; });
      rdInputs.forEach(el => { el.disabled = true; });

      groupClassical.classList.remove('opacity-60');
      groupRD.classList.add('opacity-60');

      convertClassicalToRD();
    } else {
      setActive(btnModeRD);
      setInactive(btnModeClassical);

      rdInputs.forEach(el => { el.disabled = false; });
      classicalInputs.forEach(el => { el.disabled = true; });

      groupRD.classList.remove('opacity-60');
      groupClassical.classList.add('opacity-60');

      convertRDToClassical();
    }
  }

  function setMode(mode) {
    currentMode = mode;
    showEmptyResults();
    validateAll(false, false);
    updateModeUI();
    updateReferenceDerived();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  // --- Preset Data ---
  function initData() {
    if (typeof window.RD_DATA === 'undefined') {
      cellSelect.innerHTML = '<option value="">Error: Data unavailable (network?)</option>';
      cellSelect.disabled = true;
      return;
    }

    const isVerified = (v) => v === true || v === 1 || v === 'true';

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

  cellSelect.addEventListener('change', () => {
    showEmptyResults();
    clearErrorsAndInvalid();

    const prevMode = currentMode;
    const key = cellSelect.value;

    if (!key || !window.RD_DATA[key]) {
      cellDesc.textContent = '';
      sourceBox.classList.add('hidden');
      updateReferenceDerived();
      return;
    }

    const data = window.RD_DATA[key];
    suppress = true;

    inputs.ab.value = data.alpha_by_beta ?? '';
    inputs.dq.value = data.D_q ?? '';

    inputs.r.value = '';
    inputs.s.value = '';
    inputs.d1.value = '';
    inputs.n1.value = '';
    inputs.n2.value = '';

    suppress = false;

    convertClassicalToRD();

    cellDesc.textContent = data.desc || '';

    if (data.source || data.url) {
      sourceText.textContent = data.source || '';

      if (data.url) {
        sourceUrl.textContent = 'View Reference';
        sourceUrl.href = data.url;
        sourceUrl.classList.remove('hidden');
      } else {
        sourceUrl.href = '#';
        sourceUrl.classList.add('hidden');
      }

      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    currentMode = prevMode;
    updateModeUI();
    updateDpf();
    updateReferenceDerived();
  });

  // --- BED / EQD2 ---
  function bedUnified(D, n, r, s) {
    const one_r = 1 - r;

    if (!Number.isFinite(D) || !Number.isFinite(n) || D <= 0 || n <= 0) return NaN;
    if (one_r <= ONE_R_EPS) return NaN;
    if (!Number.isFinite(r) || !Number.isFinite(s) || s < 0) return NaN;

    // Regular limit s -> 0
    if (Math.abs(s) < S_EPS) return D;

    const x = -s * (D / n);
    const oneMinusExp = -Math.expm1(x);

    return (D / one_r) - ((n * r) / (s * one_r)) * oneMinusExp;
  }

  function denomBEDperFrac2Gy(r, s) {
    const one_r = 1 - r;

    if (one_r <= ONE_R_EPS) return NaN;
    if (!Number.isFinite(r) || !Number.isFinite(s) || s < 0) return NaN;

    if (Math.abs(s) < S_EPS) return 2;

    const termExp2 = -Math.expm1(-2 * s);
    return (2 / one_r) - (r / (s * one_r)) * termExp2;
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

    if ((1 - r) <= ONE_R_EPS || s < 0) {
      clearReferenceDerived();
      return;
    }

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      clearReferenceDerived();
      return;
    }

    const bed2Gy = denomBEDperFrac2Gy(r, s);

    let nEqd2 = NaN;
    let D_Eqd2 = NaN;

    if (Number.isFinite(bed2Gy) && Math.abs(bed2Gy) > ZERO_EPS) {
      nEqd2 = BED1 / bed2Gy;
      D_Eqd2 = 2 * nEqd2;
    }

    bedRefText.textContent = `${fmt(BED1, 2)} Gy`;
    refEqd2FractionsText.textContent = Number.isFinite(nEqd2) ? fmt(nEqd2, 2) : '--';
    refEqd2TotalText.textContent = Number.isFinite(D_Eqd2) ? `${fmt(D_Eqd2, 2)} Gy` : '--';
  }

  // --- Lambert W0 ---
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
      const L1 = Math.log(z);
      const L2 = Math.log(Math.max(L1, 1e-16));
      w = L1 - L2;
    }

    for (let i = 0; i < 40; i++) {
      const ew = expSafe(w);
      const wew = w * ew;
      const f = wew - z;

      const wp1 = w + 1;
      if (Math.abs(wp1) < 1e-15) {
        w += 1e-6;
        continue;
      }

      const denom = ew * wp1 - ((w + 2) * f) / (2 * wp1);
      if (!Number.isFinite(denom) || Math.abs(denom) < 1e-18) break;

      const dw = f / denom;
      w -= dw;

      if (!Number.isFinite(w)) return NaN;
      if (Math.abs(dw) < W_EPS) break;
    }

    return w;
  }

  // --- Result UI ---
  function updateResultUI(BED_val, D2_val, n2_val, K_val, W_val) {
    const d2_val = D2_val / n2_val;

    bedText.textContent = `${fmt(BED_val, 2)} Gy`;
    resultText.textContent = `${fmt(D2_val, 2)} Gy`;
    dpfText.textContent = `${fmt(d2_val, 2)} Gy`;

    dbgBed.textContent = fmt(BED_val, 6);
    dbgK.textContent = Number.isFinite(K_val) ? fmt(K_val, 6) : '—';
    dbgW.textContent = Number.isFinite(W_val) ? fmt(W_val, 6) : '—';

    showResultPanel();
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Main Calculation ---
  btnCalc.addEventListener('click', () => {
    showEmptyResults();
    clearErrorsAndInvalid();

    if (!validateAll(true, true)) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    if (!needFinite('r', r, [inputs.r])) return;
    if (!needFinite('s', s, [inputs.s])) return;
    if (!needFinite('D1', D1, [inputs.d1])) return;
    if (!needFinite('n1', n1, [inputs.n1])) return;
    if (!needFinite('n2', n2, [inputs.n2])) return;

    if ((1 - r) <= ONE_R_EPS) {
      addError('Calculation singularity (r ≈ 1).', [inputs.r]);
      return;
    }

    if (s < 0) {
      addError('s must satisfy s ≥ 0.', [inputs.s]);
      return;
    }

    const BED1 = bedUnified(D1, n1, r, s);
    if (!Number.isFinite(BED1)) {
      addError('BED computation failed (check parameters).', [inputs.r, inputs.s]);
      return;
    }

    // Regular limit s -> 0: BED = D, so isoeffect gives D2 = BED1 = D1.
    if (Math.abs(s) < S_EPS) {
      const D2_limit = BED1;

      if (!(Number.isFinite(D2_limit) && D2_limit > 0)) {
        addError('Computed D2 is non-physical in the s → 0 limit.', []);
        return;
      }

      updateResultUI(BED1, D2_limit, n2, null, null);
      return;
    }

    const one_r = 1 - r;
    const K = r + (s * one_r / n2) * BED1;

    const eNegK = expSafe(-K);
    if (!Number.isFinite(eNegK)) {
      addError('Numeric overflow in exp(-K). Please check inputs.', []);
      return;
    }

    const arg = -r * eNegK;
    const w_val = lambertW0(arg);

    if (!Number.isFinite(w_val)) {
      addError('Lambert-W failure: parameters out of domain or no real principal-branch solution.', [inputs.r, inputs.s]);
      return;
    }

    const D2 = (n2 / s) * (K + w_val);

    if (!(Number.isFinite(D2) && D2 > 0)) {
      addError('Computed D2 is non-physical (negative, zero, or infinite).', []);
      return;
    }

    updateResultUI(BED1, D2, n2, K, w_val);
  });

  // --- Input Behavior ---
  function attachInputBehavior(el, onChange, detachPreset = false) {
    el.addEventListener('input', () => {
      showEmptyResults();
      if (detachPreset) breakPresetAndDetach();

      onChange();
      updateReferenceDerived();

      if (errorContainer.innerHTML !== '') validateAll(false, false);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnCalc.click();
      }
    });
  }

  attachInputBehavior(inputs.ab, () => {
    if (currentMode === 'classical') convertClassicalToRD();
  }, true);

  attachInputBehavior(inputs.dq, () => {
    if (currentMode === 'classical') convertClassicalToRD();
  }, true);

  attachInputBehavior(inputs.r, () => {
    if (currentMode === 'rd') convertRDToClassical();
  }, true);

  attachInputBehavior(inputs.s, () => {
    if (currentMode === 'rd') convertRDToClassical();
  }, true);

  attachInputBehavior(inputs.d1, () => {}, false);
  attachInputBehavior(inputs.n1, () => {}, false);
  attachInputBehavior(inputs.n2, () => {}, false);

  // --- Initialization ---
  initData();
  updateModeUI();
  updateDpf();
  updateReferenceDerived();
  showEmptyResults();
  validateAll(false, false);
});
