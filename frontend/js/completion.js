/**
 * Completion Screen
 * Shows final time, confetti animation, and restart option.
 */

function showCompletion() {
    // Display final time
    const finalTimeEl = document.getElementById('final-time');
    if (finalTimeEl) {
        finalTimeEl.textContent = getElapsedTime();
    }

    // Launch confetti
    launchConfetti();
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#00f0ff', '#ff00e5', '#8b5cf6', '#ff6b2b', '#00ff88', '#ffb800'];
    const pieceCount = 60;

    for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement('div');
        piece.classList.add('confetti-piece');
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        piece.style.animationDelay = Math.random() * 1.5 + 's';
        piece.style.width = (6 + Math.random() * 8) + 'px';
        piece.style.height = (6 + Math.random() * 8) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(piece);
    }
}
