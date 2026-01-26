import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// --- Globals ---
let scene, camera, renderer;
let world;
let balls = [];
let score = 0;
let time = 60;
let gameActive = false; // Start inactive
let playerName = "";
let isPaused = false;


// Input
let isCharging = false;
let currentPower = 0; // 0 to 1

// UI
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer-val');
const powerFill = document.getElementById('power-fill');
const powerContainer = document.getElementById('power-container');

// Overlays
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const nameInput = document.getElementById('player-name');
const finalScoreEl = document.getElementById('final-score');
const leaderboardList = document.getElementById('leaderboard-list');

// Pause UI
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const overlaysContainer = document.getElementById('overlays');

// In-Game UI
const miniLB = document.getElementById('mini-leaderboard');
const miniLBList = document.getElementById('mini-lb-list');

init();
animate();
setupUI();


function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 6);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);
    const spot = new THREE.SpotLight(0xffffff, 150);
    spot.position.set(0, 10, 5);
    spot.castShadow = true;
    spot.penumbra = 0.5;
    scene.add(spot);

    // Neon Hoop Light
    const hoopLight = new THREE.PointLight(0x00ff00, 2, 5);
    hoopLight.position.set(0, 3.5, -7);
    scene.add(hoopLight);

    // 5. Physics
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    const groundMat = new CANNON.Material();
    const ballMat = new CANNON.Material();
    const matContact = new CANNON.ContactMaterial(groundMat, ballMat, { friction: 0.5, restitution: 0.7 });
    world.addContactMaterial(matContact);

    // 6. Content
    createCourt(groundMat);
    createHoop();

    // 7. Input
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    // Timer
    setInterval(() => {
        if (gameActive && !isPaused && time > 0) {
            time--;
            timerEl.innerText = time;
            if (time <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function setupUI() {
    startBtn.onclick = () => {
        const name = nameInput.value.trim().toUpperCase();
        if (!name) return alert("ENTER YOUR NAME TRAVELLER");
        playerName = name;
        startScreen.style.display = 'none';
        document.getElementById('overlays').style.display = 'none';
        gameActive = true;
        loadInGameLeaderboard();
    };

    restartBtn.onclick = () => {
        location.reload();
    };

    resumeBtn.onclick = () => {
        togglePause();
    };

    pauseRestartBtn.onclick = () => {
        location.reload();
    };
}

async function endGame() {
    gameActive = false;
    timerEl.innerText = "END";
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'block';
    document.getElementById('overlays').style.display = 'flex';

    // Submit Score
    try {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playerName, score: score })
        });
        loadLeaderboard();
    } catch (e) {
        console.error("Score submission failed", e);
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        leaderboardList.innerHTML = data.map(entry => `
            <div class="leaderboard-row">
                <span class="lb-name">${entry.player_name}</span>
                <span class="lb-score">${entry.score}</span>
            </div>
        `).join('');
    } catch (e) {
        leaderboardList.innerHTML = "FAILED TO LOAD SCORES";
    }
}

async function loadInGameLeaderboard() {
    // Show UI immediately
    miniLB.style.display = 'block';

    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        console.log("Leaderboard data received:", data);

        // Fill mini list (Top 3)
        miniLBList.innerHTML = data.slice(0, 3).map((entry, i) => `
            <div class="mini-lb-row">
                <span style="color: #888;">#${i + 1}</span>
                <span style="color: #fff;">${entry.player_name}</span>
                <span style="color: #00ff00;">${entry.score}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error("Mini leaderboard load failed", e);
    }
}
// --- Creation ---

function createCourt(mat) {
    // Floor
    const geo = new THREE.PlaneGeometry(20, 30);
    const m = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2 });
    const mesh = new THREE.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({ type: CANNON.Body.STATIC, material: mat });
    body.addShape(new CANNON.Plane());
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(body);
}

function createHoop() {
    // Backboard (Glass-like)
    const bbGeo = new THREE.BoxGeometry(2, 1.5, 0.1);
    const bbMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.8
    });
    const bb = new THREE.Mesh(bbGeo, bbMat);
    bb.position.set(0, 4, -8);
    bb.castShadow = true;
    scene.add(bb);

    const bbBody = new CANNON.Body({ type: CANNON.Body.STATIC });
    // Physics: thicker Z to prevent tunneling
    bbBody.addShape(new CANNON.Box(new CANNON.Vec3(1, 0.75, 0.5))); // 0.5 half-extent = 1.0 thickness
    bbBody.position.set(0, 4, -8.45); // Shift back to align front face: -8.0 (visual) - 0.05 (vis half) vs -8.45 + 0.5 (phys half) -> Front face at -7.95. Previous was -8.
    // Visual is at -8, thickness 0.1 (extends -7.95 to -8.05).
    // New physics box: thickness 1.0 (extends z-0.5 to z+0.5).
    // We want front face at -7.95. So Center = -7.95 - 0.5 = -8.45.
    world.addBody(bbBody);

    // Rim (Physical)
    const r = 0.3;
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.1,
        metalness: 0.8
    });

    // We approximate rim with 16 physics spheres for smoother collisions
    for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;

        const rimPart = new CANNON.Body({ mass: 0 });
        rimPart.addShape(new CANNON.Sphere(0.04));
        rimPart.position.set(x, 3.5, -7.5 + z);
        world.addBody(rimPart);
        // Visuals are now a single Torus below
    }

    // Visual Rim (Smooth Torus)
    const torusGeo = new THREE.TorusGeometry(r, 0.04, 16, 100);
    const torusMesh = new THREE.Mesh(torusGeo, rimMat);
    torusMesh.position.set(0, 3.5, -7.5);
    torusMesh.rotation.x = Math.PI / 2;
    scene.add(torusMesh);

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x666666 }));
    pole.position.set(0, 2, -8.1);
    scene.add(pole);
}

function spawnBall(impulse) {
    const r = 0.24;
    const geo = new THREE.SphereGeometry(r, 32, 32);
    // Rough orange texture
    const mat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4, bumpScale: 0.02 });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({ mass: 0.6, shape: new CANNON.Sphere(r) });
    body.position.set(0, 1.5, 5);
    body.velocity.set(impulse.x, impulse.y, impulse.z);
    // Backspin
    body.angularVelocity.set(5, 0, 0);

    world.addBody(body);
    balls.push({ mesh, body, active: true });
}

// --- Logic ---

function onKeyDown(e) {
    if (e.code === 'Escape') {
        togglePause();
        return;
    }
    if (!gameActive || isPaused) return;
    if (e.code === 'ArrowUp') {
        if (!isCharging) {
            isCharging = true;
            currentPower = 0;
        }
    }
}

function onKeyUp(e) {
    if (!gameActive || isPaused) return;
    if (e.code === 'ArrowUp') {
        if (isCharging) {
            shoot();
            isCharging = false;
            currentPower = 0;
            updateMeter();
        }
    }
}

function shoot() {
    if (currentPower < 0.1) return; // Too weak

    const p = currentPower;
    // Base arc needs minimum upward force to reach hoop height
    const up = 4 + (p * 8);
    const fwd = - (5 + (p * 12));

    // Straight shot (no side deviation for keyboard)
    spawnBall({ x: 0, y: up, z: fwd });
}

function updateMeter() {
    powerFill.style.height = `${currentPower * 100}%`;
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'block';
        overlaysContainer.style.display = 'flex';
    } else {
        pauseScreen.style.display = 'none';
        overlaysContainer.style.display = 'none';
    }
}

function animate() {
    requestAnimationFrame(animate);
    const dt = 1 / 60;

    if (gameActive) {
        // Charging Logic
        if (isCharging) {
            // Charge to full in 1.5 seconds
            currentPower += dt * 0.7;
            if (currentPower > 1.0) currentPower = 1.0;
            updateMeter();
        }

        if (!isPaused) {
            world.step(dt);

            balls.forEach(b => {
                b.mesh.position.copy(b.body.position);
                b.mesh.quaternion.copy(b.body.quaternion);

                // Score Check
                // Hoop Center: 0, 3.5, -7.5
                if (b.active) {
                    // Check if in cylinder above hoop
                    const dx = b.body.position.x;
                    const dz = b.body.position.z + 7.5;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist < 0.25) {
                        // Check if passed through Y plane going down
                        if (b.body.position.y < 3.5 && b.body.previousPosition.y >= 3.5) {
                            score += 2;
                            scoreEl.innerText = score < 10 ? `0${score}` : score;
                            b.active = false;

                            // Flash
                            const l = new THREE.PointLight(0x00ff00, 5, 10);
                            l.position.set(0, 3.5, -7.5);
                            scene.add(l);
                            setTimeout(() => scene.remove(l), 200);
                        }
                    }
                }

                b.body.previousPosition = b.body.position.clone();

                // Cleanup based on Y (floor) and Z (depth)
                if (b.body.position.y < 0.2 && (b.body.position.z > 10 || b.body.position.z < -20)) {
                    // Could remove body here
                }
            });
        }
    }

    renderer.render(scene, camera);
}
