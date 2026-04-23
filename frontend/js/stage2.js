/**
 * Stage 2: Sliding Puzzle (Embedded via iframe)
 * 
 * The puzzle runs inside an iframe (puzzle.html).
 * Tiles show parts of a fantasy landscape with character labels.
 * Solved order: 2, A, 7, K, 5, Q, 9, B, [blank]
 * The code is the last 3 characters: Q9B
 * Validation happens via backend API.
 */

// No puzzle initialization needed — iframe handles it
function initPuzzle() {
    // Nothing to do — iframe loads puzzle.html automatically
}

/**
 * Submit the code the user read from the solved puzzle image
 */
async function submitStage2() {
    const input = document.getElementById('stage2-input');
    const submitBtn = document.getElementById('btn-stage2-submit');
    const continueBtn = document.getElementById('btn-stage2-continue');
    const answer = input.value.trim();

    if (!answer || answer.length !== 3) {
        showFeedback('stage2-feedback', '⚠ Please enter the 3-character code from the puzzle.', false);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Checking...';

    const result = await apiPost('/stage2', { answer });

    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Submit Code';

    if (result.correct) {
        showFeedback('stage2-feedback', '✓ Code verified! Access granted.', true);
        gameState.stage2Solved = true;
        gameState.stage2Answer = answer.toUpperCase();
        saveState();
        continueBtn.disabled = false;
        continueBtn.classList.add('btn-glow');
        input.disabled = true;
        submitBtn.disabled = true;
        updateProgressBar();
    } else {
        showFeedback('stage2-feedback', result.error || '✗ Incorrect code. Solve the puzzle and try again.', false);
        input.value = '';
        input.focus();
    }
}

// Enter key support for code input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('stage2-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitStage2();
        });
        // Only allow alphanumeric input
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        });
    }
});
