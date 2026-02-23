/**
 * Hypofractionation Rationale Logic (hypoRationale.js)
 * --------------------------------------------------
 * Evaluates therapeutic advantage based on the RD framework.
 * Implements Eq. 33 from the manuscript.
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnEval = document.getElementById('evaluate-btn');
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

  function hideError() {
    errBox.textContent = '';
    errBox.classList.add('hidden');
  }

  // Translates classical LQ/SHMT parameters to RD resilience (r)
  function calculateR(ab, dq) {
    if (Math.abs(ab) < 1e-12) return NaN;
    const termInside = (dq * dq) + (dq * ab);
    if (termInside < 0) return NaN; // Prevents complex roots
    return 2 * ((Math.sqrt(termInside) - dq) / ab);
  }

  btnEval.addEventListener('click', () => {
    hideError();
    
    // Parse inputs
    const abT = parseFloat(inputsRationale.abT.value);
    const dqT = parseFloat(inputsRationale.dqT.value);
    const abN = parseFloat(inputsRationale.abN.value);
    const dqN = parseFloat(inputsRationale.dqN.value);

    // 1. Basic Validation
    if ([abT, dqT, abN, dqN].some(v => isNaN(v))) {
      showError("Please fill in all classical parameters with valid numbers.");
      return;
    }

    // 2. Map to RD parameters
    const rT = calculateR(abT, dqT);
    const rN = calculateR(abN, dqN);

    if (isNaN(rT) || isNaN(rN)) {
      showError("Complex root detected. Check parameter consistency (Dq and α/β mismatch).");
      return;
    }

    // 3. Evaluate Eq. 33 Condition: [ (a/b)_T * (1 - r_T) ] / [ (a/b)_N * (1 - r_N) ]
    const numerator = abT * (1 - rT);
    const denominator = abN * (1 - rN);

    // Protect against division by zero if normal tissue has r ≈ 1
    if (Math.abs(denominator) < 1e-12) {
      showError("Division by zero in ratio calculation. Normal tissue parameters yield r ≈ 1.");
      return;
    }

    const ratio = numerator / denominator;

    // 4. Update UI with derived parameters
    document.getElementById('val-rt').textContent = rT.toFixed(4);
    document.getElementById('val-rn').textContent = rN.toFixed(4);
    document.getElementById('val-ratio').textContent = ratio.toFixed(4);

    // 5. Render Decision
    // Reset classes first
    decBox.className = "border rounded-xl p-5 text-center transition-colors";
    
    if (ratio <= 1.0) {
      // Hypofractionation favored
      decBox.classList.add("bg-green-50", "border-green-200", "text-green-800");
      decText.textContent = "Hypofractionation is Preferable";
    } else {
      // Conventional favored
      decBox.classList.add("bg-orange-50", "border-orange-200", "text-orange-800");
      decText.textContent = "Conventional is Preferable";
    }

    // Show the results container
    resContainer.classList.remove('hidden');
  });
});
