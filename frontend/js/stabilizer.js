/**
 * Signal Stabilizer – Vault Unlock mini-game
 * A moving bar oscillates across a track. If it stays outside the
 * "safe zone" for too long, the last character is stripped from
 * whichever vault input the player last touched.
 *
 * Player can hold SPACE (when not focused on an input) or
 * click/hold the stabilizer track to nudge the bar toward centre.
 */

/* ── Configurable parameters ──────────────────────────── */
const STABILIZER = {
    barSpeed:              80,    // base velocity (% per second)
    safeZoneWidth:         30,    // % of track width
    instabilityThreshold:  1800,  // ms of instability before penalty
    playerForce:           300,   // centering force when holding
    perturbInterval:       [0.6, 1.8], // random perturbation range (s)
    maxVelocity:           140,   // cap on velocity (% per second)
};

/* ── Internal state ───────────────────────────────────── */
let _stabActive   = false;
let _stabAnimId   = null;
let _barPos       = 50;          // 0–100 %
let _barVel       = STABILIZER.barSpeed;
let _isStable     = true;
let _unstableMs   = 0;
let _lastFrame    = 0;
let _holding      = false;       // player is counteracting
let _perturbTimer = 0;
let _nextPerturb  = 1;
let _lastInput    = null;        // last‐touched vault input id
let _penaltyFlash = 0;           // countdown for penalty flash effect

/* ── DOM refs (resolved once on start) ────────────────── */
let _elTrack, _elBar, _elSafe, _elStatus, _elContainer, _elWarning;

/* ── Public API ───────────────────────────────────────── */

function startStabilizer() {
    if (_stabActive) return;

    _elTrack     = document.getElementById('stabilizer-track');
    _elBar       = document.getElementById('stabilizer-bar');
    _elSafe      = document.getElementById('stabilizer-safe-zone');
    _elStatus    = document.getElementById('stabilizer-status');
    _elContainer = document.getElementById('signal-stabilizer');
    _elWarning   = document.getElementById('stabilizer-warning');
    if (!_elTrack || !_elBar) return;

    // Position the safe zone
    const safeStart = (100 - STABILIZER.safeZoneWidth) / 2;
    _elSafe.style.left  = safeStart + '%';
    _elSafe.style.width = STABILIZER.safeZoneWidth + '%';

    // Show the component
    _elContainer.classList.add('active');

    // Reset
    _barPos      = 50;
    _barVel      = STABILIZER.barSpeed * (Math.random() > 0.5 ? 1 : -1);
    _isStable    = true;
    _unstableMs  = 0;
    _perturbTimer = 0;
    _nextPerturb = _randRange(...STABILIZER.perturbInterval);
    _lastInput   = 'vault-code2';
    _penaltyFlash = 0;

    _stabActive = true;
    _lastFrame  = performance.now();
    _stabAnimId = requestAnimationFrame(_stabLoop);

    // Track which vault input was last touched
    const c1 = document.getElementById('vault-code1');
    const c2 = document.getElementById('vault-code2');
    if (c1) c1.addEventListener('focus', _trackInput);
    if (c2) c2.addEventListener('focus', _trackInput);

    // Player controls
    _elTrack.addEventListener('mousedown',  _holdStart);
    _elTrack.addEventListener('touchstart', _holdStart, { passive: true });
    document.addEventListener('mouseup',   _holdEnd);
    document.addEventListener('touchend',  _holdEnd);
    document.addEventListener('keydown',   _keyDown);
    document.addEventListener('keyup',     _keyUp);
}

function stopStabilizer() {
    _stabActive = false;
    if (_stabAnimId) { cancelAnimationFrame(_stabAnimId); _stabAnimId = null; }

    if (_elContainer) _elContainer.classList.remove('active');

    const c1 = document.getElementById('vault-code1');
    const c2 = document.getElementById('vault-code2');
    if (c1) c1.removeEventListener('focus', _trackInput);
    if (c2) c2.removeEventListener('focus', _trackInput);

    if (_elTrack) {
        _elTrack.removeEventListener('mousedown',  _holdStart);
        _elTrack.removeEventListener('touchstart', _holdStart);
    }
    document.removeEventListener('mouseup',  _holdEnd);
    document.removeEventListener('touchend', _holdEnd);
    document.removeEventListener('keydown',  _keyDown);
    document.removeEventListener('keyup',    _keyUp);
}

/* ── Animation loop ───────────────────────────────────── */

function _stabLoop(now) {
    if (!_stabActive) return;

    // If vault solved, stop
    if (typeof gameState !== 'undefined' && gameState.stage3Solved) {
        stopStabilizer();
        return;
    }

    const dt = (now - _lastFrame) / 1000;
    _lastFrame = now;

    // Skip huge frame gaps (tab switch, etc.)
    if (dt > 0.15) {
        _stabAnimId = requestAnimationFrame(_stabLoop);
        return;
    }

    /* ── Random perturbation ── */
    _perturbTimer += dt;
    if (_perturbTimer >= _nextPerturb) {
        _barVel += (Math.random() - 0.5) * STABILIZER.barSpeed * 1.2;
        _perturbTimer = 0;
        _nextPerturb = _randRange(...STABILIZER.perturbInterval);
    }

    /* ── Player counteraction ── */
    if (_holding) {
        const dir = 50 - _barPos;
        _barVel += Math.sign(dir) * STABILIZER.playerForce * dt;
    }

    /* ── Apply velocity ── */
    _barPos += _barVel * dt;

    // Bounce off edges
    if (_barPos <= 0)   { _barPos = 0;   _barVel =  Math.abs(_barVel); }
    if (_barPos >= 100) { _barPos = 100;  _barVel = -Math.abs(_barVel); }

    // Light friction
    _barVel *= (1 - 0.3 * dt);

    // Clamp velocity
    _barVel = Math.max(-STABILIZER.maxVelocity,
                       Math.min(STABILIZER.maxVelocity, _barVel));

    /* ── Stability check ── */
    const safeStart = (100 - STABILIZER.safeZoneWidth) / 2;
    const safeEnd   = safeStart + STABILIZER.safeZoneWidth;
    _isStable = _barPos >= safeStart && _barPos <= safeEnd;

    if (_isStable) {
        _unstableMs = 0;
    } else {
        _unstableMs += dt * 1000;
        if (_unstableMs >= STABILIZER.instabilityThreshold) {
            _applyPenalty();
            _unstableMs = 0;
        }
    }

    // Penalty flash countdown
    if (_penaltyFlash > 0) _penaltyFlash -= dt * 1000;

    /* ── Update visuals ── */
    _renderStabilizer();

    _stabAnimId = requestAnimationFrame(_stabLoop);
}

/* ── Rendering ────────────────────────────────────────── */

function _renderStabilizer() {
    // Bar position
    _elBar.style.left = `calc(${_barPos}% - 2px)`;

    // Color based on stability
    if (_penaltyFlash > 0) {
        // Flash white-red on penalty
        _elBar.style.background = '#fff';
        _elBar.style.boxShadow  = '0 0 16px rgba(255,45,85,0.9)';
        _elTrack.classList.add('penalty');
    } else if (_isStable) {
        _elBar.style.background = 'var(--green)';
        _elBar.style.boxShadow  = '0 0 12px rgba(0,255,136,0.6)';
        _elTrack.classList.remove('unstable', 'penalty', 'warning');
    } else {
        _elBar.style.background = 'var(--red)';
        _elBar.style.boxShadow  = '0 0 12px rgba(255,45,85,0.6)';
        _elTrack.classList.remove('penalty');
        _elTrack.classList.add('unstable');

        // Warning class when close to penalty
        const ratio = _unstableMs / STABILIZER.instabilityThreshold;
        if (ratio > 0.55) {
            _elTrack.classList.add('warning');
        } else {
            _elTrack.classList.remove('warning');
        }
    }

    // Status text
    if (_elStatus) {
        if (_penaltyFlash > 0) {
            _elStatus.textContent = '⚡ CHAR LOST';
            _elStatus.className   = 'stabilizer-status penalty';
        } else if (_isStable) {
            _elStatus.textContent = '● STABLE';
            _elStatus.className   = 'stabilizer-status stable';
        } else {
            const ratio = _unstableMs / STABILIZER.instabilityThreshold;
            if (ratio > 0.55) {
                _elStatus.textContent = '⚠ CRITICAL';
                _elStatus.className   = 'stabilizer-status critical';
            } else {
                _elStatus.textContent = '○ UNSTABLE';
                _elStatus.className   = 'stabilizer-status unstable';
            }
        }
    }

    // Warning bar fill (visual countdown to penalty)
    if (_elWarning) {
        const pct = _isStable ? 0 : Math.min(100, (_unstableMs / STABILIZER.instabilityThreshold) * 100);
        _elWarning.style.width = pct + '%';
    }
}

/* ── Penalty: remove last char from the target input ──── */

function _applyPenalty() {
    const input = document.getElementById(_lastInput || 'vault-code2');
    if (!input || !input.value) return;
    input.value = input.value.slice(0, -1);
    _penaltyFlash = 400; // ms flash duration

    // Brief shake on the input
    input.style.animation = 'none';
    void input.offsetWidth;
    input.style.animation = 'shake 0.4s ease';
}

/* ── Player input handlers ────────────────────────────── */

function _trackInput(e) { _lastInput = e.target.id; }

function _holdStart(e) {
    e.preventDefault();
    _holding = true;
}

function _holdEnd()  { _holding = false; }

function _keyDown(e) {
    if (e.code === 'Space' && !_isInputFocused()) {
        e.preventDefault();
        _holding = true;
    }
}

function _keyUp(e) {
    if (e.code === 'Space') _holding = false;
}

function _isInputFocused() {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA';
}

/* ── Utils ────────────────────────────────────────────── */

function _randRange(min, max) {
    return min + Math.random() * (max - min);
}

/* ── Auto-start / stop via class observer on stage-3 ──── */

document.addEventListener('DOMContentLoaded', () => {
    const stage3 = document.getElementById('stage-3');
    if (!stage3) return;

    const observer = new MutationObserver(() => {
        if (stage3.classList.contains('active') &&
            !(typeof gameState !== 'undefined' && gameState.stage3Solved)) {
            startStabilizer();
        } else {
            stopStabilizer();
        }
    });

    observer.observe(stage3, { attributes: true, attributeFilter: ['class'] });
});
