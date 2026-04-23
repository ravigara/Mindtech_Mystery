/**
 * MindTech Mystery – Main App Controller
 * Handles: timer, stage navigation, state persistence, particles
 */

function getApiBaseUrl() {
    const configuredBaseUrl = window.MINDTECH_CONFIG?.API_BASE_URL;
    if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
        return configuredBaseUrl.replace(/\/+$/, '');
    }
    return 'http://localhost:8000';
}

const API_BASE = getApiBaseUrl();

// ─── State ──────────────────────────────────────────
const STATE_KEY = 'mindtech_mystery_state';

let gameState = {
    currentStage: 'intro', // 'intro', 1, 2, 3, 4, 'complete'
    startTime: null,
    stage1Solved: false,
    stage2Solved: false,
    stage3Solved: false,
    stage4Solved: false,
    stage1Answer: null,
    stage2Answer: null,
};

let timerInterval = null;

// ─── State Persistence ──────────────────────────────
function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(gameState));
}

function loadState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed };
            return true;
        } catch (e) {
            console.warn('Failed to parse saved state:', e);
        }
    }
    return false;
}

function clearState() {
    localStorage.removeItem(STATE_KEY);
    gameState = {
        currentStage: 'intro',
        startTime: null,
        stage1Solved: false,
        stage2Solved: false,
        stage3Solved: false,
        stage4Solved: false,
        stage1Answer: null,
        stage2Answer: null,
    };
}

// ─── Timer ──────────────────────────────────────────
function startTimer() {
    if (!gameState.startTime) {
        gameState.startTime = Date.now();
        saveState();
    }
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${mins}:${secs}`;
}

function getElapsedTime() {
    if (!gameState.startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

// ─── Stage Navigation ───────────────────────────────
function showStage(stage) {
    // Validate progression
    if (!canAccessStage(stage)) {
        console.warn(`Cannot access stage ${stage} - locked!`);
        return;
    }

    // Hide all stages
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));

    // Show target stage
    const stageId = stage === 'intro' ? 'stage-intro' :
                    stage === 'complete' ? 'stage-complete' :
                    `stage-${stage}`;
    const stageEl = document.getElementById(stageId);
    if (stageEl) {
        stageEl.classList.remove('active');
        // Force reflow for animation restart
        void stageEl.offsetWidth;
        stageEl.classList.add('active');
    }

    // Update state
    gameState.currentStage = stage;
    saveState();

    // Update theme
    updateStageTheme(stage);
    updateProgressBar();

    // Initialize stage-specific content
    if (stage === 2) initPuzzle();
    if (stage === 3) initVault();
    if (stage === 'complete') showCompletion();
}

function canAccessStage(stage) {
    if (stage === 'intro') return true;
    if (stage === 1) return true;
    if (stage === 2) return gameState.stage1Solved;
    if (stage === 3) return gameState.stage2Solved;
    if (stage === 4) return gameState.stage3Solved;
    if (stage === 'complete') return gameState.stage4Solved;
    return false;
}

function goToStage(stage) {
    showStage(stage);
}

function startGame() {
    showStage(1);
    startTimer();
}

function restartGame() {
    stopTimer();
    clearState();
    document.getElementById('timer').textContent = '00:00';

    // Reset all inputs and feedback
    document.querySelectorAll('.input-field').forEach(i => i.value = '');
    document.querySelectorAll('.feedback').forEach(f => { f.textContent = ''; f.className = 'feedback'; });

    // Reset buttons
    const continueBtn1 = document.getElementById('btn-stage1-continue');
    if (continueBtn1) continueBtn1.disabled = true;
    const continueBtn2 = document.getElementById('btn-stage2-continue');
    if (continueBtn2) continueBtn2.disabled = true;

    // Hide puzzle solved section
    const solvedSection = document.getElementById('puzzle-solved-section');
    if (solvedSection) solvedSection.classList.add('hidden');

    // Show vault inputs if hidden
    const vaultInputs = document.getElementById('vault-inputs');
    if (vaultInputs) vaultInputs.style.display = '';

    showStage('intro');
}

// ─── Stage Theme ────────────────────────────────────
function updateStageTheme(stage) {
    document.body.className = '';
    if (typeof stage === 'number') {
        document.body.classList.add(`stage-theme-${stage}`);
    }
}

// ─── Progress Bar ───────────────────────────────────
function updateProgressBar() {
    const segments = document.querySelectorAll('.progress-segment');
    const connectors = document.querySelectorAll('.progress-connector');

    segments.forEach(seg => {
        const stageNum = parseInt(seg.dataset.stage);
        seg.classList.remove('active', 'completed');

        if (gameState[`stage${stageNum}Solved`]) {
            seg.classList.add('completed');
        } else if (gameState.currentStage === stageNum) {
            seg.classList.add('active');
        }
    });

    connectors.forEach((conn, i) => {
        conn.classList.remove('completed');
        if (gameState[`stage${i + 1}Solved`]) {
            conn.classList.add('completed');
        }
    });
}

// ─── Particles ──────────────────────────────────────
function createParticles() {
    const container = document.getElementById('particles-bg');
    if (!container) return;
    container.innerHTML = '';

    const count = 30;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (6 + Math.random() * 10) + 's';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.width = (2 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ─── API Helper ─────────────────────────────────────
async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return { correct: false, error: 'Connection failed. Is the backend running?' };
    }
}

// ─── Feedback Helper ────────────────────────────────
function showFeedback(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `feedback ${isSuccess ? 'success' : 'error'}`;

    if (!isSuccess) {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    }
}

// ─── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    createParticles();

    // Always start fresh — no session persistence
    clearState();
    showStage('intro');
});
