/**
 * Stage 3: Vault Unlock
 * User enters both codes from Stage 1 and Stage 2.
 * On success, triggers Three.js vault animation, then auto-advances to Stage 4.
 */

let vaultAttempts = 0;
let vaultCooldown = false;

async function submitVault() {
    const code1Input = document.getElementById('vault-code1');
    const code2Input = document.getElementById('vault-code2');
    const unlockBtn = document.getElementById('btn-vault-unlock');
    const code1 = code1Input.value.trim();
    const code2 = code2Input.value.trim();

    // Validate inputs
    if (!code1 || code1.length !== 3) {
        showFeedback('vault-feedback', '⚠ Enter the 3-digit code from Stage 1.', false);
        code1Input.focus();
        return;
    }
    if (!code2 || code2.length !== 4) {
        showFeedback('vault-feedback', '⚠ Enter the 4-character code from Stage 2.', false);
        code2Input.focus();
        return;
    }

    // Check cooldown
    if (vaultCooldown) {
        showFeedback('vault-feedback', '⏳ Too many attempts. Please wait...', false);
        return;
    }

    // Disable button
    unlockBtn.disabled = true;
    unlockBtn.querySelector('span').textContent = '🔄 Verifying...';

    const result = await apiPost('/vault', { code1, code2 });

    if (result.correct) {
        showFeedback('vault-feedback', '✓ ACCESS GRANTED — Vault unlocking...', true);

        // Hide inputs
        const vaultInputs = document.getElementById('vault-inputs');
        vaultInputs.style.opacity = '0';
        vaultInputs.style.transition = 'opacity 0.5s ease';
        setTimeout(() => { vaultInputs.style.display = 'none'; }, 500);

        // Update state
        gameState.stage3Solved = true;
        saveState();
        updateProgressBar();

        // Play vault animation, then go to Stage 4
        playVaultOpenAnimation(() => {
            goToStage(4);
        });

    } else {
        vaultAttempts++;

        if (result.rate_limited) {
            // Server-side rate limit
            showFeedback('vault-feedback', result.error || '⏳ Too many attempts. Wait and try again.', false);
            vaultCooldown = true;
            unlockBtn.querySelector('span').textContent = '⏳ Cooldown...';

            setTimeout(() => {
                vaultCooldown = false;
                unlockBtn.disabled = false;
                unlockBtn.querySelector('span').textContent = '🔓 Unlock Vault';
                showFeedback('vault-feedback', 'Ready to try again.', false);
            }, 5000);
        } else {
            showFeedback('vault-feedback',
                `✗ ACCESS DENIED — Incorrect codes. (Attempt ${vaultAttempts})`, false);
            unlockBtn.disabled = false;
            unlockBtn.querySelector('span').textContent = '🔓 Unlock Vault';

            // Shake the vault canvas
            const container = document.getElementById('vault-canvas-container');
            container.style.animation = 'shake 0.5s ease';
            setTimeout(() => { container.style.animation = ''; }, 500);
        }
    }
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const code1 = document.getElementById('vault-code1');
    const code2 = document.getElementById('vault-code2');

    [code1, code2].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitVault();
            });
        }
    });

    // Only allow numbers for code1
    if (code1) {
        code1.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
});
