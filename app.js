document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
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
  const lblDpf = document.getElementById('original-dpf');
  const bedText = document.getElementById('bed-text');

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
  const B_EPS = 1e-12;     // Tolerance for beta -> 0
  const S_EPS = 1e-12;     // Tolerance for s -> 0
  const R_EPS = 1e-12;     // Tolerance for r -> 0 singularity
  const ONE_R_EPS = 1e-9;  // Tolerance for 1-r -> 0 (BED blowup)
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
  // Improved behavior: Keep values, just clear the dropdown so user can edit.
  function breakPresetAndDetach(editedEl) {
    if (suppress) return;
    if (cellSelect.value === "") return;

    suppress = true;
    cellSelect.value = "";
    cellDesc.textContent = "";
    sourceBox.classList.add('hidden');
    suppress = false;
  }

  // --- Validation Logic (Mode Aware) ---
  function validateAll(strict = false) {
    clearErrorsAndInvalid();

    // Determine relevance based on mode
    const scheduleSet = new Set([inputs.d1, inputs.n1, inputs.n2]);
    const shouldValidate = (el) => {
      if (scheduleSet.has(el)) return true;
      if (el.disabled) return false; // Ignore disabled fields
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
      if (!(Number.isFinite(beta) && beta >= 0)) addError("β must be non-negative (0 is allowed).", [inputs.beta]);
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
      if (!(Number.isFinite(s) && s >= 0)) addError("s must be non-negative (0 is allowed).", [inputs.s]);
    }

    // --- Schedule Validation ---
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
      validateAll(false);
      return;
    }

    // Singularity Check: r -> 0
    if (Math.abs(r) < R_EPS) {
      suppress = true;
      inputs.k.value = k.toFixed(6);
      inputs.r.value = r.toFixed(6);
      inputs.s.value = "";
      suppress = false;
      validateAll(false);
      addError("Conversion singular: r ≈ 0 while β > 0. s is undefined.", [inputs.alpha, inputs.d0]);
      return;
    }

    // Normal Calculation
    const s = (2 * beta) / (r * k);

    // Physicality check
    if (!(Number.isFinite(s) && s >= 0)) {
      suppress = true;
      inputs.k.value = k.toFixed(6);
      inputs.r.value = r.toFixed(6);
      inputs.s.value = "";
      suppress = false;
      validateAll(false);
      addError("Resulting s < 0. Incompatible classical inputs.", [inputs.beta]);
      return;
    }

    suppress = true;
    inputs.k.value = k.toFixed(6);
    inputs.r.value = r.toFixed(6);
    inputs.s.value = s.toFixed(6);
    suppress = false;
    validateAll(false);
  }

  // --- Conversion: RD -> Classical ---
  function convertRDToClassical() {
    if (suppress) return;

    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    if (!(Number.isFinite(r) && Number.isFinite(s) && Number.isFinite(k) && k > 0 && s >= 0)) return;
    if (!(r < 1)) return;

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
    validateAll(false);
    updateModeUI();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  // --- Preset Loading (VERIFIED ONLY) ---
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

  cellSelect.addEventListener('change', () => {
    hideResults();
    clearErrorsAndInvalid();

    // Clear BED display whenever preset changes
    if (bedText) bedText.textContent = "";

    const key = cellSelect.value;
    if (!key || !window.RD_DATA[key]) {
      cellDesc.textContent = "";
      sourceBox.classList.add('hidden');
      return;
    }
    const data = window.RD_DATA[key];

    suppress = true;
    inputs.alpha.value = (data.alpha ?? '');
    inputs.beta.value  = (data.beta  ?? '');
    inputs.d0.value    = (data.D0    ?? '');

    // Clear RD/Schedule inputs to force review
    inputs.r.value = ''; inputs.s.value = ''; inputs.k.value = '';
    inputs.d1.value = ''; inputs.n1.value = ''; inputs.n2.value = '';
    suppress = false;

    cellDesc.textContent = data.desc || "";
    if (data.source || data.doi) {
      sourceText.textContent = data.source || "";
      sourceDoi.textContent = data.doi || "";
      sourceUrl.textContent = data.url || "";
      sourceUrl.href = data.url || "#";
      sourceBox.classList.remove('hidden');
    } else {
      sourceBox.classList.add('hidden');
    }

    currentMode = 'classical';
    updateModeUI();
    updateDpf();
    validateAll(false);
  });

  // --- Input Listeners ---
  function attachInputBehavior(el, onChange) {
    el.addEventListener('input', () => {
      hideResults();
      breakPresetAndDetach(el);

      // Clear BED display on any edit that could affect it
      if (bedText) bedText.textContent = "";

      onChange();
      updateDpf();
      validateAll(false);
    });
  }

  attachInputBehavior(inputs.alpha, () => { if (currentMode === 'classical') convertClassicalToRD(); });
  attachInputBehavior(inputs.beta,  () => { if (currentMode === 'classical') convertClassicalToRD(); });
  attachInputBehavior(inputs.d0,    () => { if (currentMode === 'classical') convertClassicalToRD(); });

  attachInputBehavior(inputs.r, () => { if (currentMode === 'rd') convertRDToClassical(); });
  attachInputBehavior(inputs.s, () => { if (currentMode === 'rd') convertRDToClassical(); });
  attachInputBehavior(inputs.k, () => { if (currentMode === 'rd') convertRDToClassical(); });

  attachInputBehavior(inputs.d1, () => {});
  attachInputBehavior(inputs.n1, () => {});
  attachInputBehavior(inputs.n2, () => {});

  // --- Lambert W0 (Hardened) ---
  function lambertW0(z) {
    const minZ = -1 / Math.E;
    if (!Number.isFinite(z)) return NaN;
    if (z < minZ - 1e-12) return NaN;
    if (Math.abs(z - minZ) < 1e-12) return -1;
    if (Math.abs(z) < W_EPS) return 0;

    // Initial guess
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

    // Halley iterations with safeguards
    for (let i = 0; i < 80; i++) {
      const ew = Math.exp(w);
      const f = w * ew - z;
      const wp1 = w + 1;

      // Avoid singularity at w ~ -1
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

  // --- MAIN CALCULATION ---
  btnCalc.addEventListener('click', () => {
    hideResults();
    clearErrorsAndInvalid();
    if (bedText) bedText.textContent = "";

    if (!validateAll(true)) return;

    const D1 = toNum(inputs.d1.value);
    const n1 = toNum(inputs.n1.value);
    const n2 = toNum(inputs.n2.value);

    // --- Classical Mode Handling ---
    if (currentMode === 'classical') {
      const beta = toNum(inputs.beta.value);

      // Branch A: β -> 0 explicitly
      if (Number.isFinite(beta) && Math.abs(beta) <= B_EPS) {
        const D2 = D1;
        const d2 = D2 / n2;

        document.getElementById('result-text').textContent = D2.toFixed(2) + " Gy";
        document.getElementById('dose-per-fraction-text').textContent = d2.toFixed(2) + " Gy / fx";
        if (bedText) bedText.textContent = `BED(D1,n1,r,s): ${D1.toFixed(2)} Gy`;

        document.getElementById('dbg-bed1').textContent = "β=0 branch: BED = D";
        document.getElementById('dbg-k').textContent = "—";
        document.getElementById('dbg-w').textContent = "—";

        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Ensure valid conversion before proceeding
      convertClassicalToRD();

      // CRITICAL GUARD: If conversion failed (e.g. singularity), stop here.
      if (btnCalc.disabled) return;
    }

    // --- RD Parameter Extraction ---
    const r = toNum(inputs.r.value);
    const s = toNum(inputs.s.value);
    const k = toNum(inputs.k.value);

    // Verify finite values (catches missing or NaN results from failed conversions)
    if (!needFinite("r", r, [inputs.r])) return;
    if (!needFinite("s", s, [inputs.s])) return;
    if (currentMode === 'rd' && !needFinite("k", k, [inputs.k])) return;

    // Check Bounds
    if (!(r < 1) || (1 - r) <= ONE_R_EPS) {
      addError("Parameter error: r must be strictly < 1.", [inputs.r]);
      return;
    }
    if (!(s >= 0)) {
      addError("Parameter error: s must be non-negative.", [inputs.s]);
      return;
    }

    // --- Branch B: s -> 0 implies D2 = D1 ---
    if (Math.abs(s) <= S_EPS) {
      const D2 = D1;
      const d2 = D2 / n2;

      document.getElementById('result-text').textContent = D2.toFixed(2) + " Gy";
      document.getElementById('dose-per-fraction-text').textContent = d2.toFixed(2) + " Gy / fx";
      if (bedText) bedText.textContent = `BED(D1,n1,r,s): ${D1.toFixed(2)} Gy`;

      document.getElementById('dbg-bed1').textContent = "limit (s=0): BED = D";
      document.getElementById('dbg-k').textContent = "—";
      document.getElementById('dbg-w').textContent = "—";

      resultContainer.classList.remove('hidden');
      resultContainer.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // --- General Case: Lambert-W Solve ---
    const one_r = 1 - r;
    const d1 = D1 / n1;

    // Use expm1 for precision when s*d1 is small
    const x = -s * d1;
    const oneMinusExp = -Math.expm1(x); // 1 - exp(-s*d1)

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

    const d2 = D2 / n2;

    document.getElementById('result-text').textContent = D2.toFixed(2) + " Gy";
    document.getElementById('dose-per-fraction-text').textContent = d2.toFixed(2) + " Gy / fx";
    if (bedText) bedText.textContent = `BED(D1,n1,r,s): ${BED1.toFixed(2)} Gy`;

    document.getElementById('dbg-bed1').textContent = BED1.toFixed(6);
    document.getElementById('dbg-k').textContent = K.toFixed(6);
    document.getElementById('dbg-w').textContent = w_val.toFixed(6);

    resultContainer.classList.remove('hidden');
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  });

  // --- Initialization ---
  initData();
  updateModeUI();
  updateDpf();
  validateAll(false);
});
