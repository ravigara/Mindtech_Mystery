/**
 * Stage 1: Coded Language
 * Pattern: each letter is shifted by +2 in the alphabet
 * MINDTECH → OKPEVFEI (answer is 8 uppercase letters)
 */

async function submitStage1() {
    const input = document.getElementById('stage1-input');
    const submitBtn = document.getElementById('btn-stage1-submit');
    const continueBtn = document.getElementById('btn-stage1-continue');
    const answer = input.value.trim().toUpperCase();

    if (!answer || answer.length !== 8) {
        showFeedback('stage1-feedback', '⚠ Please enter an 8-letter coded word.', false);
        return;
    }

    // Disable button during request
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Checking...';

    const result = await apiPost('/stage1', { answer });

    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Submit';

    if (result.correct) {
        showFeedback('stage1-feedback', '✓ Correct! Code cracked successfully.', true);
        gameState.stage1Solved = true;
        gameState.stage1Answer = answer;
        saveState();
        continueBtn.disabled = false;
        continueBtn.classList.add('btn-glow');
        input.disabled = true;
        submitBtn.disabled = true;
        updateProgressBar();
    } else {
        showFeedback('stage1-feedback', result.error || '✗ Incorrect. Try again.', false);
        input.value = '';
        input.focus();
    }
}

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('stage1-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitStage1();
            }
        });
        // Only allow alphabetic input
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        });
    }
});
