import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// --- Globals ---
let scene, camera, renderer;
let world;
let balls = [];
let score = 0;
let time = 60;
let gameActive = true;

// Input
let isCharging = false;
let currentPower = 0; // 0 to 1

// UI
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer-val');
const powerFill = document.getElementById('power-fill');
const powerContainer = document.getElementById('power-container');

init();
animate();

function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 10, 50);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 6);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // 4. Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(amb);
    const spot = new THREE.SpotLight(0xffffff, 50);
    spot.position.set(0, 8, 4);
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
        if (gameActive && time > 0) {
            time--;
            timerEl.innerText = time;
            if (time <= 0) {
                gameActive = false;
                timerEl.innerText = "END";
            }
        }
    }, 1000);
}

// --- Creation ---

function createCourt(mat) {
    // Floor
    const geo = new THREE.PlaneGeometry(20, 30);
    const m = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2 });
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
    // Backboard
    const bbGeo = new THREE.BoxGeometry(2, 1.5, 0.1);
    const bbMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.5 });
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
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0x220000 });

    // We approximate rim with 8 physics spheres
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;

        const rimPart = new CANNON.Body({ mass: 0 });
        rimPart.addShape(new CANNON.Sphere(0.04));
        rimPart.position.set(x, 3.5, -7.5 + z);
        world.addBody(rimPart);

        // Visual
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.04), rimMat);
        mesh.position.copy(rimPart.position);
        scene.add(mesh);
    }

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x222 }));
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
    if (!gameActive) return;
    if (e.code === 'ArrowUp') {
        if (!isCharging) {
            isCharging = true;
            currentPower = 0;
        }
    }
}

function onKeyUp(e) {
    if (!gameActive) return;
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

    renderer.render(scene, camera);
}
