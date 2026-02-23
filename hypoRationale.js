/**
 * Hypofractionation Rationale Logic (hypoRationale.js)
 * --------------------------------------------------
 * Reactive architecture: Auto-evaluates therapeutic advantage 
 * based on the RD framework (Eq. 33) instantly upon valid input.
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

  // Translates classical LQ/SHMT parameters to RD resilience (r)
  function calculateR(ab, dq) {
    if (Math.abs(ab) < 1e-12) return NaN;
    const termInside = (dq * dq) + (dq * ab);
    if (termInside < 0) return NaN; // Prevents complex roots
    return 2 * ((Math.sqrt(termInside) - dq) / ab);
  }

  // --- Real-time Reactive Engine ---
  function tryEvaluateStrategy() {
    // 1. Parse inputs
    const abT = toNum(inputsRationale.abT.value);
    const dqT = toNum(inputsRationale.dqT.value);
    const abN = toNum(inputsRationale.abN.value);
    const dqN = toNum(inputsRationale.dqN.value);

    // 2. Quietly abort if not all inputs are filled yet
    if ([abT, dqT, abN, dqN].some(v => isNaN(v))) {
      hideResultsAndErrors();
      return;
    }

    // 3. Map to RD parameters
    const rT = calculateR(abT, dqT);
    const rN = calculateR(abN, dqN);

    if (isNaN(rT) || isNaN(rN)) {
      showError("Complex root detected. Check parameter consistency (Dq and α/β mismatch).");
      return;
    }

    // 4. Evaluate Eq. 33 Condition
    const numerator = abT * (1 - rT);
    const denominator = abN * (1 - rN);

    if (Math.abs(denominator) < 1e-12) {
      showError("Division by zero in ratio calculation. Normal tissue parameters yield r ≈ 1.");
      return;
    }

    // Clear any previous errors if we made it here
    errBox.classList.add('hidden');

    const ratio = numerator / denominator;

    // 5. Update UI with derived parameters
    document.getElementById('val-rt').textContent = rT.toFixed(4);
    document.getElementById('val-rn').textContent = rN.toFixed(4);
    document.getElementById('val-ratio').textContent = ratio.toFixed(4);

    // 6. Render Decision
    decBox.className = "border-2 rounded-xl p-6 text-center shadow-sm transition-all duration-300";
    
    if (ratio <= 1.0) {
      // Hypofractionation favored
      decBox.classList.add("bg-green-50", "border-green-400", "text-green-800");
      decText.textContent = "Hypofractionation is Preferable";
    } else {
      // Conventional favored
      decBox.classList.add("bg-orange-50", "border-orange-400", "text-orange-800");
      decText.textContent = "Conventional is Preferable";
    }

    // Show the results container
    resContainer.classList.remove('hidden');
  }

  // Attach event listeners to all inputs
  Object.values(inputsRationale).forEach(inputEl => {
    inputEl.addEventListener('input', tryEvaluateStrategy);
  });
});
