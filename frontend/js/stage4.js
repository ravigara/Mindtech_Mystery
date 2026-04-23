/**
 * Stage 4: Logic Gate (Blood Relation Question)
 * Q: "She is the daughter of my grandfather's only son" → Answer: Sister
 */

async function submitStage4() {
    const input = document.getElementById('stage4-input');
    const submitBtn = document.getElementById('btn-stage4-submit');
    const answer = input.value.trim();

    if (!answer) {
        showFeedback('stage4-feedback', '⚠ Please enter your answer.', false);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Checking...';

    const result = await apiPost('/stage4', { answer });

    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Submit Answer';

    if (result.correct) {
        showFeedback('stage4-feedback', '✓ Brilliant! That is correct!', true);
        gameState.stage4Solved = true;
        saveState();
        updateProgressBar();

        input.disabled = true;
        submitBtn.disabled = true;

        // Stop timer and transition to completion
        stopTimer();

        setTimeout(() => {
            showStage('complete');
        }, 1500);
    } else {
        showFeedback('stage4-feedback', result.error || '✗ Not quite. Think it through again.', false);
        input.value = '';
        input.focus();
    }
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('stage4-input');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitStage4();
        });
    }
});
