/**
 * Three.js Vault Animation
 * Creates a 3D vault door with lock mechanism.
 * Animates: dial rotation → handle turn → door swing → interior glow
 */

let vaultScene, vaultCamera, vaultRenderer;
let vaultDoor, vaultDial, vaultHandle, interiorLight;
let vaultAnimating = false;
let vaultAnimationFrame = null;
let vaultInitialized = false;

function initVault() {
    const container = document.getElementById('vault-canvas-container');
    const canvas = document.getElementById('vault-canvas');
    if (!container || !canvas) return;
    if (vaultInitialized) {
        // Just resize
        onVaultResize();
        return;
    }

    vaultInitialized = true;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    vaultScene = new THREE.Scene();
    vaultScene.background = new THREE.Color(0x050810);

    // Camera
    vaultCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    vaultCamera.position.set(0, 0, 5);

    // Renderer
    vaultRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    vaultRenderer.setSize(width, height);
    vaultRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    vaultRenderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.6);
    vaultScene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0x4488ff, 0.8);
    frontLight.position.set(2, 3, 5);
    frontLight.castShadow = true;
    vaultScene.add(frontLight);

    const rimLight = new THREE.PointLight(0xff6b2b, 0.4, 10);
    rimLight.position.set(-3, 2, 2);
    vaultScene.add(rimLight);

    // Interior light (starts dim, brightens on open)
    interiorLight = new THREE.PointLight(0xffb800, 0, 8);
    interiorLight.position.set(0, 0, -1);
    vaultScene.add(interiorLight);

    // --- Build Vault ---
    buildVault();

    // Start render loop
    renderVault();

    // Handle resize
    window.addEventListener('resize', onVaultResize);
}

function buildVault() {
    // --- Vault Body (background wall) ---
    const wallGeo = new THREE.BoxGeometry(6, 4, 0.3);
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x1a1e2e,
        metalness: 0.5,
        roughness: 0.7,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.z = -0.5;
    vaultScene.add(wall);

    // --- Vault Interior (visible when door opens) ---
    const interiorGeo = new THREE.BoxGeometry(3, 2.5, 1.5);
    const interiorMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e1a,
        metalness: 0.3,
        roughness: 0.9,
        side: THREE.BackSide,
    });
    const interior = new THREE.Mesh(interiorGeo, interiorMat);
    interior.position.z = -1;
    vaultScene.add(interior);

    // --- Gold bars inside vault ---
    const barGeo = new THREE.BoxGeometry(0.3, 0.15, 0.5);
    const barMat = new THREE.MeshStandardMaterial({
        color: 0xffb800,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xffb800,
        emissiveIntensity: 0.1,
    });
    for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(-0.5 + (i % 3) * 0.4, -0.8 + Math.floor(i / 3) * 0.2, -0.8);
        bar.rotation.y = (Math.random() - 0.5) * 0.2;
        vaultScene.add(bar);
    }

    // --- Vault Door ---
    // Door is a pivot group so it can swing open
    vaultDoor = new THREE.Group();
    vaultDoor.position.set(-1.4, 0, 0); // Pivot on left edge

    // Door panel
    const doorGeo = new THREE.BoxGeometry(2.8, 3, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0x3a3e4e,
        metalness: 0.8,
        roughness: 0.3,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.x = 1.4; // Offset from pivot
    doorMesh.castShadow = true;
    vaultDoor.add(doorMesh);

    // Door frame border (top)
    const frameGeo = new THREE.BoxGeometry(2.9, 0.08, 0.25);
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x555a70,
        metalness: 0.9,
        roughness: 0.2,
    });
    const frameTop = new THREE.Mesh(frameGeo, frameMat);
    frameTop.position.set(1.4, 1.5, 0.02);
    vaultDoor.add(frameTop);

    const frameBottom = frameTop.clone();
    frameBottom.position.y = -1.5;
    vaultDoor.add(frameBottom);

    // Door bolts
    const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
    const boltMat = new THREE.MeshStandardMaterial({
        color: 0x666a80,
        metalness: 0.9,
        roughness: 0.2,
    });
    const boltPositions = [
        [0.15, 1.2], [0.15, 0.4], [0.15, -0.4], [0.15, -1.2],
        [2.65, 1.2], [2.65, 0.4], [2.65, -0.4], [2.65, -1.2],
    ];
    boltPositions.forEach(([x, y]) => {
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(x, y, 0.12);
        vaultDoor.add(bolt);
    });

    // --- Lock Dial ---
    vaultDial = new THREE.Group();
    vaultDial.position.set(1.4, 0, 0.15);

    // Outer ring
    const outerRingGeo = new THREE.TorusGeometry(0.45, 0.05, 8, 32);
    const dialMat = new THREE.MeshStandardMaterial({
        color: 0x8892a8,
        metalness: 0.95,
        roughness: 0.15,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, dialMat);
    vaultDial.add(outerRing);

    // Inner dial face
    const dialFaceGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.06, 32);
    const dialFaceMat = new THREE.MeshStandardMaterial({
        color: 0x2a2e3e,
        metalness: 0.7,
        roughness: 0.4,
    });
    const dialFace = new THREE.Mesh(dialFaceGeo, dialFaceMat);
    dialFace.rotation.x = Math.PI / 2;
    vaultDial.add(dialFace);

    // Dial marker (indicator line)
    const markerGeo = new THREE.BoxGeometry(0.04, 0.3, 0.03);
    const markerMat = new THREE.MeshStandardMaterial({
        color: 0xff6b2b,
        emissive: 0xff6b2b,
        emissiveIntensity: 0.5,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.y = 0.2;
    marker.position.z = 0.04;
    vaultDial.add(marker);

    // Tick marks
    for (let i = 0; i < 12; i++) {
        const tickGeo = new THREE.BoxGeometry(0.02, 0.08, 0.02);
        const tick = new THREE.Mesh(tickGeo, dialMat);
        const angle = (i / 12) * Math.PI * 2;
        tick.position.set(Math.sin(angle) * 0.35, Math.cos(angle) * 0.35, 0.04);
        tick.rotation.z = -angle;
        vaultDial.add(tick);
    }

    vaultDoor.add(vaultDial);

    // --- Handle ---
    vaultHandle = new THREE.Group();
    vaultHandle.position.set(2.1, 0, 0.15);

    const handleBarGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    const handleMat = new THREE.MeshStandardMaterial({
        color: 0x8892a8,
        metalness: 0.9,
        roughness: 0.2,
    });
    const handleBar = new THREE.Mesh(handleBarGeo, handleMat);
    handleBar.position.y = 0.25;
    vaultHandle.add(handleBar);

    // Handle grip
    const gripGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const grip = new THREE.Mesh(gripGeo, handleMat);
    grip.position.y = 0.5;
    vaultHandle.add(grip);

    vaultDoor.add(vaultHandle);

    vaultScene.add(vaultDoor);
}

function renderVault() {
    vaultAnimationFrame = requestAnimationFrame(renderVault);

    // Subtle idle animation - dial breathes
    if (!vaultAnimating && vaultDial) {
        vaultDial.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
    }

    if (vaultRenderer && vaultScene && vaultCamera) {
        vaultRenderer.render(vaultScene, vaultCamera);
    }
}

function onVaultResize() {
    const container = document.getElementById('vault-canvas-container');
    if (!container || !vaultRenderer || !vaultCamera) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    vaultCamera.aspect = width / height;
    vaultCamera.updateProjectionMatrix();
    vaultRenderer.setSize(width, height);
}

// ─── Vault Open Animation ───────────────────────────
function playVaultOpenAnimation(onComplete) {
    if (vaultAnimating) return;
    vaultAnimating = true;

    const startTime = Date.now();

    // Animation phases (in milliseconds)
    const DIAL_SPIN_DURATION = 1200;
    const HANDLE_TURN_START = 1200;
    const HANDLE_TURN_DURATION = 600;
    const DOOR_OPEN_START = 1800;
    const DOOR_OPEN_DURATION = 1500;
    const LIGHT_START = 2000;
    const TOTAL_DURATION = 4000;

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function animate() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / TOTAL_DURATION, 1);

        // Phase 1: Spin dial
        if (elapsed < DIAL_SPIN_DURATION) {
            const dialT = elapsed / DIAL_SPIN_DURATION;
            vaultDial.rotation.z = easeInOut(dialT) * Math.PI * 4; // 2 full rotations
        }

        // Phase 2: Turn handle down
        if (elapsed >= HANDLE_TURN_START && elapsed < HANDLE_TURN_START + HANDLE_TURN_DURATION) {
            const handleT = (elapsed - HANDLE_TURN_START) / HANDLE_TURN_DURATION;
            vaultHandle.rotation.z = easeInOut(handleT) * (Math.PI / 2);
        }

        // Phase 3: Swing door open
        if (elapsed >= DOOR_OPEN_START) {
            const doorT = Math.min((elapsed - DOOR_OPEN_START) / DOOR_OPEN_DURATION, 1);
            vaultDoor.rotation.y = -easeInOut(doorT) * (Math.PI / 2.5);
        }

        // Phase 4: Interior light
        if (elapsed >= LIGHT_START) {
            const lightT = Math.min((elapsed - LIGHT_START) / 1500, 1);
            interiorLight.intensity = easeInOut(lightT) * 3;

            // Pulsing glow
            interiorLight.intensity += Math.sin(elapsed * 0.005) * 0.3;
        }

        if (elapsed < TOTAL_DURATION) {
            requestAnimationFrame(animate);
        } else {
            vaultAnimating = false;
            if (onComplete) {
                setTimeout(onComplete, 500);
            }
        }
    }

    animate();
}

function destroyVault() {
    if (vaultAnimationFrame) {
        cancelAnimationFrame(vaultAnimationFrame);
        vaultAnimationFrame = null;
    }
    window.removeEventListener('resize', onVaultResize);
}
