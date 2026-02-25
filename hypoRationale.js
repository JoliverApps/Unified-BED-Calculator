/**
 * Hypofractionation Rationale Logic (hypoRationale.js)
 * --------------------------------------------------
 * Reactive: evaluates Eq. (hypo_condition) as soon as inputs form a valid state.
 * * Target Equation: [ (1-rT)^2 * rN * sN ] / [ (1-rN)^2 * rT * sT ] <= 1
 */

document.addEventListener('DOMContentLoaded', () => {
  const errBox = document.getElementById('rationale-error-container');
  const resContainer = document.getElementById('rationale-result-container');
  const decBox = document.getElementById('decision-box');
  const decText = document.getElementById('decision-text');

  const btnModeClassical = document.getElementById('mode-classical');
  const btnModeRD = document.getElementById('mode-rd');

  const inputs = {
    rT: document.getElementById('r-t'),
    sT: document.getElementById('s-t'),
    abT: document.getElementById('ab-t'),
    dqT: document.getElementById('dq-t'),
    
    rN: document.getElementById('r-n'),
    sN: document.getElementById('s-n'),
    abN: document.getElementById('ab-n'),
    dqN: document.getElementById('dq-n')
  };

  let currentMode = 'rd'; 
  let suppress = false;

  const EPS = 1e-12;
  const ONE_R_EPS = 1e-9;

  // --- UI & Error Handling ---
  function showError(msg) {
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
    resContainer.classList.add('hidden');
  }

  function hideResultsAndErrors() {
    errBox.textContent = '';
    errBox.classList.add('hidden');
    resContainer.classList.add('hidden');
  }

  function toNum(v) {
    if (typeof v !== 'string' || v.trim() === '') return NaN;
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
  }

  const setActive = (btn) => {
    btn.classList.remove('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
    btn.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
  };

  const setInactive = (btn) => {
    btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
    btn.classList.add('bg-transparent', 'text-slate-500', 'hover:text-slate-700');
  };

  // --- Parameter Mappings ---
  function calcRDFromClassical(ab, dq) {
    if (!Number.isFinite(ab) || !Number.isFinite(dq) || Math.abs(ab) < EPS) return { r: NaN, s: NaN };
    const rad = (dq * dq) + (2 * dq * ab);
    if (!Number.isFinite(rad) || rad < 0) return { r: NaN, s: NaN };
    const r = (Math.sqrt(rad) - dq) / ab;
    const s = r / dq;
    return { r, s };
  }

  function calcClassicalFromRD(r, s) {
    if (!Number.isFinite(r) || !Number.isFinite(s) || Math.abs(s) < EPS || Math.abs(r) < EPS) return { ab: NaN, dq: NaN };
    const dq = r / s;
    const ab = (2 * (1 - r)) / (r * s);
    return { ab, dq };
  }

  function syncClassicalToRD() {
    if (suppress) return;
    suppress = true;
    
    const tRD = calcRDFromClassical(toNum(inputs.abT.value), toNum(inputs.dqT.value));
    inputs.rT.value = Number.isFinite(tRD.r) ? tRD.r.toFixed(6) : '';
    inputs.sT.value = Number.isFinite(tRD.s) ? tRD.s.toFixed(6) : '';

    const nRD = calcRDFromClassical(toNum(inputs.abN.value), toNum(inputs.dqN.value));
    inputs.rN.value = Number.isFinite(nRD.r) ? nRD.r.toFixed(6) : '';
    inputs.sN.value = Number.isFinite(nRD.s) ? nRD.s.toFixed(6) : '';
    
    suppress = false;
  }

  function syncRDToClassical() {
    if (suppress) return;
    suppress = true;
    
    const tClass = calcClassicalFromRD(toNum(inputs.rT.value), toNum(inputs.sT.value));
    inputs.abT.value = Number.isFinite(tClass.ab) ? tClass.ab.toFixed(6) : '';
    inputs.dqT.value = Number.isFinite(tClass.dq) ? tClass.dq.toFixed(6) : '';

    const nClass = calcClassicalFromRD(toNum(inputs.rN.value), toNum(inputs.sN.value));
    inputs.abN.value = Number.isFinite(nClass.ab) ? nClass.ab.toFixed(6) : '';
    inputs.dqN.value = Number.isFinite(nClass.dq) ? nClass.dq.toFixed(6) : '';
    
    suppress = false;
  }

  // --- Mode Toggling ---
  function updateModeUI() {
    const classicalInputs = [inputs.abT, inputs.dqT, inputs.abN, inputs.dqN];
    const rdInputs = [inputs.rT, inputs.sT, inputs.rN, inputs.sN];

    if (currentMode === 'classical') {
      setActive(btnModeClassical);
      setInactive(btnModeRD);
      classicalInputs.forEach(el => el.disabled = false);
      rdInputs.forEach(el => el.disabled = true);
      syncClassicalToRD();
    } else {
      setActive(btnModeRD);
      setInactive(btnModeClassical);
      rdInputs.forEach(el => el.disabled = false);
      classicalInputs.forEach(el => el.disabled = true);
      syncRDToClassical();
    }
  }

  function setMode(mode) {
    currentMode = mode;
    hideResultsAndErrors();
    updateModeUI();
    tryEvaluateStrategy();
  }

  btnModeClassical.addEventListener('click', () => setMode('classical'));
  btnModeRD.addEventListener('click', () => setMode('rd'));

  function resetDecisionBox() {
    decBox.className = "border-2 rounded-xl p-6 text-center shadow-sm transition-all duration-300";
  }

  // --- Core Evaluation ---
  function tryEvaluateStrategy() {
    // Because syncing is active, we can always just read r and s to evaluate the formula
    const rT = toNum(inputs.rT.value);
    const sT = toNum(inputs.sT.value);
    const rN = toNum(inputs.rN.value);
    const sN = toNum(inputs.sN.value);

    if ([rT, sT, rN, sN].some(v => !Number.isFinite(v))) {
      hideResultsAndErrors();
      return;
    }

    if ((1 - rT) <= ONE_R_EPS || (1 - rN) <= ONE_R_EPS) {
      showError("Singularity detected: r ≈ 1 for tumor or normal tissue (1−r ≈ 0).");
      return;
    }

    if (Math.abs(rT) < EPS || Math.abs(sT) < EPS || Math.abs(rN) < EPS || Math.abs(sN) < EPS) {
      showError("Parameters cannot be exactly zero; the ratio evaluates to infinity or zero.");
      return;
    }

    // Evaluate: [ (1 - rT)^2 * rN * sN ] / [ (1 - rN)^2 * rT * sT ] <= 1
    const numerator = Math.pow(1 - rT, 2) * rN * sN;
    const denominator = Math.pow(1 - rN, 2) * rT * sT;

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < EPS) {
      showError("Numerical failure in ratio evaluation (denominator ≈ 0 or overflow).");
      return;
    }

    const ratio = numerator / denominator;

    // Update UI
    errBox.classList.add('hidden');
    document.getElementById('val-rt-st').textContent = `${rT.toFixed(3)} / ${sT.toFixed(3)}`;
    document.getElementById('val-rn-sn').textContent = `${rN.toFixed(3)} / ${sN.toFixed(3)}`;
    document.getElementById('val-ratio').textContent = ratio.toFixed(4);

    resetDecisionBox();

    if (ratio <= 1.0) {
      decBox.classList.add("bg-green-50", "border-green-400", "text-green-800");
      decText.textContent = "Hypofractionation is Preferable";
    } else {
      decBox.classList.add("bg-orange-50", "border-orange-400", "text-orange-800");
      decText.textContent = "Conventional is Preferable";
    }

    resContainer.classList.remove('hidden');
  }

  // --- Event Listeners ---
  function attachInputBehavior(el, isClassicalModeField) {
    el.addEventListener('input', () => {
      if (isClassicalModeField && currentMode === 'classical') syncClassicalToRD();
      if (!isClassicalModeField && currentMode === 'rd') syncRDToClassical();
      tryEvaluateStrategy();
    });
  }

  attachInputBehavior(inputs.abT, true);
  attachInputBehavior(inputs.dqT, true);
  attachInputBehavior(inputs.abN, true);
  attachInputBehavior(inputs.dqN, true);
  
  attachInputBehavior(inputs.rT, false);
  attachInputBehavior(inputs.sT, false);
  attachInputBehavior(inputs.rN, false);
  attachInputBehavior(inputs.sN, false);

  // Initialize
  updateModeUI();
});
