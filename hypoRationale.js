/**
 * Hypofractionation Rationale Logic (hypoRationale.js)
 * --------------------------------------------------
 * Reactive: evaluates Eq. (hypo_condition) as soon as inputs form a valid state.
 *
 * Conventions (must match bedCalc.js):
 *  - True low-dose LQ ratio: (alpha/beta) = 2(1-r)/(r s)
 *  - Tail intercept: D_q = r/s
 *  => r(ab, D_q) = (sqrt(D_q^2 + 2 D_q ab) - D_q)/ab
 */

document.addEventListener('DOMContentLoaded', () => {
  const errBox = document.getElementById('rationale-error-container');
  const resContainer = document.getElementById('rationale-result-container');
  const decBox = document.getElementById('decision-box');
  const decText = document.getElementById('decision-text');

  const inputsRationale = {
    abT: document.getElementById('ab-t'),
    dqT: document.getElementById('dq-t'),
    abN: document.getElementById('ab-n'),
    dqN: document.getElementById('dq-n')
  };

  const EPS = 1e-12;
  const ONE_R_EPS = 1e-9;

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

  // RD mapping consistent with current manuscript convention:
  // r = (sqrt(Dq^2 + 2 Dq ab) - Dq)/ab
  function rFromAbDq(ab, dq) {
    if (!Number.isFinite(ab) || !Number.isFinite(dq)) return NaN;
    if (Math.abs(ab) < EPS) return NaN;

    const rad = (dq * dq) + (2 * dq * ab);
    if (!Number.isFinite(rad) || rad < 0) return NaN;

    const r = (Math.sqrt(rad) - dq) / ab;
    return Number.isFinite(r) ? r : NaN;
  }

  function resetDecisionBox() {
    decBox.className = "border-2 rounded-xl p-6 text-center shadow-sm transition-all duration-300";
  }

  function tryEvaluateStrategy() {
    const abT = toNum(inputsRationale.abT.value);
    const dqT = toNum(inputsRationale.dqT.value);
    const abN = toNum(inputsRationale.abN.value);
    const dqN = toNum(inputsRationale.dqN.value);

    // Quietly abort until all four are present
    if ([abT, dqT, abN, dqN].some(v => !Number.isFinite(v))) {
      hideResultsAndErrors();
      return;
    }

    // Basic sanity: Eq. (hypo_condition) uses ab ratios; if abN is ~0, it explodes.
    if (Math.abs(abN) < EPS) {
      showError("Normal-tissue α/β is too close to zero; the ratio is ill-defined.");
      return;
    }

    const rT = rFromAbDq(abT, dqT);
    const rN = rFromAbDq(abN, dqN);

    if (!Number.isFinite(rT) || !Number.isFinite(rN)) {
      showError("Incompatible inputs: r(ab, Dq) became complex/undefined. Check α/β and Dq consistency.");
      return;
    }

    // Guard the singular normalization in Eq. (hypo_condition): (1 - r) appears explicitly
    if ((1 - rT) <= ONE_R_EPS || (1 - rN) <= ONE_R_EPS) {
      showError("Singularity detected: r ≈ 1 for tumor or normal tissue (1−r ≈ 0).");
      return;
    }

    // Evaluate Eq. (hypo_condition):  (ab_T (1-r_T)) / (ab_N (1-r_N)) <= 1
    const numerator = abT * (1 - rT);
    const denominator = abN * (1 - rN);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < EPS) {
      showError("Numerical failure in ratio evaluation (denominator ~ 0).");
      return;
    }

    const ratio = numerator / denominator;

    // Update UI
    errBox.classList.add('hidden');
    document.getElementById('val-rt').textContent = rT.toFixed(4);
    document.getElementById('val-rn').textContent = rN.toFixed(4);
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

  Object.values(inputsRationale).forEach(inputEl => {
    inputEl.addEventListener('input', tryEvaluateStrategy);
  });
});
