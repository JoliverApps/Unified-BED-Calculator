document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const cellSelect = document.getElementById('cell-line-select');
  const cellDesc = document.getElementById('cell-desc');
  const sourceBox = document.getElementById('source-box');
  const sourceText = document.getElementById('source-text');
  const sourceDoi = document.getElementById('source-doi');
  const sourceUrl = document.getElementById('source-url');

  const errorContainer = document.getElementById('error-container');
  const btnModeClassical = document.getElementById('mode-classical');
  const btnModeRD = document.getElementById('mode-rd');
  const btnCalc = document.getElementById('calculate-btn');

  const resultContainer = document.getElementById('result-container');

  const inputs = {
    alpha: document.getElementById('param-alpha'),
    beta: document.getElementById('param-beta'),
    d0: document.getElementById('param-d0'),
    r: document.getElementById('param-r'),
    s: document.getElementById('param-s'),
    k: document.getElementById('param-k'),
    d1: document.getElementById('dose-d1'),
    n1: document.getElementById('fractions-n1'),
    n2: document.getElementById('fractions-n2'),
  };

  let currentMode = 'classical'; // 'classical' | 'rd'
  let suppress = false;

  // --- NEW: tolerance and limit handler for s -> 0 ---
  // In the theory: s -> 0 implies single-hit limit, BED -> D, and isoeffect => D2 = D1.
  const S_EPS = 1e-10;

  // UI helpers
  const setActive = (btn) => {
    btn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
    btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
  };
  const setInactive = (btn) => {
    btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
    btn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
  };

  function clearErrorsAndInvalid() {
    Object.values(inputs).forEach(el => el.classList.remove('invalid'));
    errorContainer.innerHTML = '';
    errorContainer.classList.add('hidden');
    btnCalc.disabled = false;
    btnCalc.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  function hideResults() {
    resultContainer.classList.add('hidden');
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

  // *** REQUIRED BEHAVIOR ***
  // If preset is selected and user types in ANY input:
  // reset dropdown to default and clear all other inputs.
  function breakPresetAndClearOthers(editedEl) {
    if (suppress) return;
    if (cellSelect.value === "") return;

    suppress = true;

    // Reset preset UI
    cellSelect.value = "";
    cellDesc.textContent = "";
    sourceBox.classList.add('hidden');

    // Clear all inputs except editedEl (keep their typed value)
    Object.values(inputs).forEach(el => {
      if (el !== editedEl) el.value = '';
    });

    suppress = false;
  }

  function updateDpf() {
    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const lbl = document.getElementById('original-dpf');
    if (Number.isFinite(D1) && Number.isFinite(n1) && D1 > 0 && n1 > 0) lbl.textContent = (D1/n1).toFixed(2);
    else lbl.textContent = "--";
  }

  // Validation
  // strict=false: only validate fields that are filled; do not require completeness.
  // strict=true: require everything needed for calculation.
  function validateAll(strict=false) {
    clearErrorsAndInvalid();

    const alpha = toNum(inputs.alpha.value);
    const beta  = toNum(inputs.beta.value);
    const D0    = toNum(inputs.d0.value);

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    // Classical (if filled or strict)
    if (strict || inputs.alpha.value !== "") {
      if (!(Number.isFinite(alpha) && alpha > 0)) addError("α must be strictly positive.", [inputs.alpha]);
    }
    if (strict || inputs.beta.value !== "") {
      if (!(Number.isFinite(beta) && beta >= 0)) addError("β must be non-negative.", [inputs.beta]);
    }
    if (strict || inputs.d0.value !== "") {
      if (!(Number.isFinite(D0) && D0 > 0)) addError("D0 must be strictly positive.", [inputs.d0]);
    }

    // RD (if filled or strict)
    if (strict || inputs.k.value !== "") {
      if (!(Number.isFinite(k) && k > 0)) addError("k must be strictly positive.", [inputs.k]);
    }

    // IMPORTANT: allow s = 0 only in the limit sense (handled at calculation).
    // For input validation UI, we still require s > 0 whenever user is trying to provide s explicitly.
    // On strict validation, we permit |s| <= S_EPS only if beta == 0 (classical) OR user intentionally sets s≈0.
    if (strict || inputs.s.value !== "") {
      if (!Number.isFinite(s)) addError("s must be a finite number.", [inputs.s]);
      // If user types s explicitly (not blank), negative is never allowed.
      if (Number.isFinite(s) && s < 0) addError("s must be non-negative (s < 0 is not allowed).", [inputs.s]);
      // For strict mode: allow s very small (limit case), otherwise require > 0.
      if (strict && Number.isFinite(s) && Math.abs(s) > S_EPS && !(s > 0)) {
        addError("s must be strictly positive (or approximately 0 only for the single-hit limit).", [inputs.s]);
      }
      // For non-strict: keep the old behavior (if filled, require > 0) to avoid confusion.
      if (!strict && Number.isFinite(s) && inputs.s.value !== "" && !(s > 0)) {
        addError("s must be strictly positive.", [inputs.s]);
      }
    }

    if (strict || inputs.r.value !== "") {
      if (!(Number.isFinite(r) && r < 1)) addError("r must be finite and strictly < 1 (r = 1 is not allowed).", [inputs.r]);
    }

    // Schedule (only enforce on strict or if filled)
    if (strict || inputs.d1.value !== "") {
      if (!(Number.isFinite(D1) && D1 > 0)) addError("D1 must be > 0.", [inputs.d1]);
    }
    if (strict || inputs.n1.value !== "") {
      if (!isPosInt(n1)) addError("n1 must be a positive integer.", [inputs.n1]);
    }
    if (strict || inputs.n2.value !== "") {
      if (!isPosInt(n2)) addError("n2 must be a positive integer.", [inputs.n2]);
    }

    return !btnCalc.disabled;
  }

  // Conversions (your mapping preserved)
  function convertClassicalToRD() {
    if (suppress) return;

    const alpha = toNum(inputs.alpha.value);
    const beta  = toNum(inputs.beta.value);
    const D0    = toNum(inputs.d0.value);

    // Only compute if all three present and valid enough
    if (!(Number.isFinite(alpha) && Number.isFinite(beta) && Number.isFinite(D0) && D0 > 0)) return;

    const k = 1 / D0;
    const r = 1 - (alpha * D0);

    // Compute s = 2 beta / (r k). This has two important singular limits:
    //  (i) beta -> 0 => s -> 0 (single-hit limit): this is allowed and handled downstream.
    //  (ii) r -> 0 => s ill-conditioned; keep your warning behavior.
    let s;

    if (Math.abs(r) < 1e-10) {
      // Populate r,k; s left blank (ill-conditioned)
      suppress = true;
      inputs.k.value = k.toFixed(6);
      inputs.r.value = r.toFixed(6);
      inputs.s.value = '';
      suppress = false;

      validateAll(false);
      addError("Conversion singular: r = 1 - αD0 ≈ 0 makes s = (2β)/(rk) ill-conditioned. Adjust α and/or D0.", [inputs.alpha, inputs.d0, inputs.beta]);
      return;
    } else {
      s = (2 * beta) / (r * k);
    }

    suppress = true;
    inputs.k.value = k.toFixed(6);
    inputs.r.value = r.toFixed(6);
    // If beta is exactly 0, s will be exactly 0. Keep it explicit so the limit branch triggers.
    inputs.s.value = s.toFixed(6);
    suppress = false;

    // Do not hard-error on s==0 here; calculation will branch to the limit.
    clearErrorsAndInvalid();
    validateAll(false);
  }

  function convertRDToClassical() {
    if (suppress) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    // Here, if user provides s ~ 0, then beta ~ 0. Allow that (non-negative).
    if (!(Number.isFinite(r) && Number.isFinite(s) && Number.isFinite(k) && k > 0)) return;
    if (!(r < 1)) return;
    if (s < 0) return;

    const D0 = 1 / k;
    const alpha = k * (1 - r);
    const beta = (r * s * k) / 2;

    suppress = true;
    inputs.d0.value = D0.toFixed(6);
    inputs.alpha.value = alpha.toFixed(6);
    inputs.beta.value = beta.toFixed(6);
    suppress = false;

    validateAll(false);
  }

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
    validateAll(false);
    updateModeUI();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  // Load presets
  function initData() {
    if (!window.RD_DATA) return;
    cellSelect.innerHTML = '<option value="">— Select Tumor Type —</option>';
    Object.keys(window.RD_DATA).sort().forEach(key => {
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
    if (!key || !window.RD_DATA || !window.RD_DATA[key]) {
      // If user returned to default
      cellDesc.textContent = "";
      sourceBox.classList.add('hidden');
      return;
    }

    const data = window.RD_DATA[key];

    suppress = true;
    inputs.alpha.value = data.alpha ?? '';
    inputs.beta.value  = data.beta  ?? '';
    inputs.d0.value    = data.D0    ?? '';
    inputs.r.value = '';
    inputs.s.value = '';
    inputs.k.value = '';
    inputs.d1.value = '';
    inputs.n1.value = '';
    inputs.n2.value = '';
    suppress = false;

    cellDesc.textContent = data.desc || "";

    const src = data.source || "";
    const doi = data.doi || "";
    const url = data.url || "";

    if (src || doi || url) {
      sourceText.textContent = src;       // SAFE: no innerHTML
      sourceDoi.textContent = doi;
      if (url) {
        sourceUrl.textContent = url;
        sourceUrl.href = url;
      } else {
        sourceUrl.textContent = "";
        sourceUrl.href = "#";
      }
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    // Presets are classical
    currentMode = 'classical';
    updateModeUI();
    updateDpf();
    validateAll(false);
  });

  // Attach "break preset + clear others" behavior + live validation + conversion
  function attachInputBehavior(el, onChange) {
    el.addEventListener('input', () => {
      hideResults();
      breakPresetAndClearOthers(el);
      onChange();
      updateDpf();
      validateAll(false);
    });
  }

  // Classical edits
  attachInputBehavior(inputs.alpha, () => { if (currentMode === 'classical') convertClassicalToRD(); });
  attachInputBehavior(inputs.beta,  () => { if (currentMode === 'classical') convertClassicalToRD(); });
  attachInputBehavior(inputs.d0,    () => { if (currentMode === 'classical') convertClassicalToRD(); });

  // RD edits
  attachInputBehavior(inputs.r, () => { if (currentMode === 'rd') convertRDToClassical(); });
  attachInputBehavior(inputs.s, () => { if (currentMode === 'rd') convertRDToClassical(); });
  attachInputBehavior(inputs.k, () => { if (currentMode === 'rd') convertRDToClassical(); });

  // Schedule edits
  attachInputBehavior(inputs.d1, () => {});
  attachInputBehavior(inputs.n1, () => {});
  attachInputBehavior(inputs.n2, () => {});

  // Lambert W0
  function lambertW0(z) {
    const minZ = -1 / Math.E;
    if (!Number.isFinite(z)) return NaN;
    if (z < minZ - 1e-12) return NaN;
    if (Math.abs(z - minZ) < 1e-12) return -1;
    if (Math.abs(z) < 1e-14) return 0;

    let w = (z > 1) ? Math.log(z) : z;
    for (let i = 0; i < 60; i++) {
      const ew = Math.exp(w);
      const wew = w * ew;
      const f = wew - z;
      const wp1 = w + 1;
      const denom = ew * wp1 - (wp1 + 1) * f / (2 * wp1);
      const dw = f / denom;
      w -= dw;
      if (Math.abs(dw) < 1e-12) break;
    }
    return w;
  }

  // Calculation
  btnCalc.addEventListener('click', () => {
    hideResults();
    clearErrorsAndInvalid();

    // Strict enforcement for calculation
    if (!validateAll(true)) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    if (!(Number.isFinite(r) && Number.isFinite(s) && Number.isFinite(k))) {
      addError("Internal consistency error: RD parameters are missing. Ensure α, β, D0 are valid (or enter r,s,k in RD mode).", []);
      return;
    }

    // --- NEW: s -> 0 limit (single-hit) branch ---
    // Theory: as s -> 0, H(x) -> α x, BED -> D, and isoeffect => D2 = D1 regardless of n2.
    // Implementation: if |s| <= S_EPS, bypass Lambert-W formula to avoid catastrophic cancellation.
    if (Math.abs(s) <= S_EPS) {
      const D2 = D1;
      const d2 = D2 / n2;

      document.getElementById('result-text').textContent = D2.toFixed(2) + " Gy";
      document.getElementById('dose-per-fraction-text').textContent = d2.toFixed(2) + " Gy / fx";

      // Debug values: in the limit, BED1 = D1, K -> r + (s*(1-r)/n2)*D1 -> r, W -> W0(-r e^{-r}) = -r
      document.getElementById('dbg-bed1').textContent = D1.toFixed(6);
      document.getElementById('dbg-k').textContent = r.toFixed(6);
      document.getElementById('dbg-w').textContent = (-r).toFixed(6);

      // Optional: warn user we used the limit (non-fatal, does not disable button)
      const p = document.createElement('p');
      p.className = 'text-xs text-slate-500 mt-2';
      p.textContent = "Note: s ≈ 0 detected; using the single-hit limit (BED = D, so D2 = D1).";
      // Ensure we don't stack multiple notes:
      const details = document.querySelector('#result-container details');
      if (details && !details.dataset.limitNote) {
        details.dataset.limitNote = "1";
        details.parentElement.insertBefore(p, details);
      }

      resultContainer.classList.remove('hidden');
      resultContainer.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // BED and isoeffect solve (regular case s > 0)
    const one_r = 1 - r;
    const Dq = r / s;
    const d1 = D1 / n1;

    const BED1 = (D1 / one_r) - (Dq * n1 / one_r) * (1 - Math.exp(-s * d1));

    const K = r + (s * one_r / n2) * BED1;
    const arg = -r * Math.exp(-K);
    const w_val = lambertW0(arg);

    if (!Number.isFinite(w_val)) {
      addError("Lambert-W failure: non-physical combination of parameters/schedule (domain error).", []);
      return;
    }

    const D2 = (n2 / s) * (K + w_val);
    if (!(Number.isFinite(D2) && D2 > 0)) {
      addError("Computed D2 is non-physical (≤ 0 or NaN). Check inputs.", []);
      return;
    }

    const d2 = D2 / n2;

    document.getElementById('result-text').textContent = D2.toFixed(2) + " Gy";
    document.getElementById('dose-per-fraction-text').textContent = d2.toFixed(2) + " Gy / fx";

    document.getElementById('dbg-bed1').textContent = BED1.toFixed(6);
    document.getElementById('dbg-k').textContent = K.toFixed(6);
    document.getElementById('dbg-w').textContent = w_val.toFixed(6);

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  });

  // Init
  initData();
  updateModeUI();
  updateDpf();
  validateAll(false);
});
