
export default class RageQuitGame {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.clock = new THREE.Clock();
        this.input = { keys: {} };
        this.soundManager = null;
        this.raycaster = new THREE.Raycaster();

        this.active = false;
        this.currentPhase = 0; // 0: Maze, 1: Bridge, 2: Button
        this.anxietyLevel = 0;

        this.playerHeight = 1.7;
        this.mouseSensitivity = 0.002;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.gravity = 30.0;
        this.onGround = true;

        this.levelObjects = []; // Meshes specific to current level
        this.interactables = [];
        this.bridgeSegments = [];
        this.exitObject = null;
        this.goalObject = null;
        this.hoveredInteractable = null;
        this.buttonPressCount = 0;

        this.boundAnimate = this.animate.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnResize = this.onResize.bind(this);
        this.boundOnKeyDown = (e) => this.input.keys[e.key.toLowerCase()] = true;
        this.boundOnKeyUp = (e) => this.input.keys[e.key.toLowerCase()] = false;
        this.boundPointerLockChange = this.onPointerLockChange.bind(this);

        this.animationId = null;
    }

    async init(container) {
        this.container = container;
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
        this.container.style.backgroundColor = '#f0f0f0';

        // Inject UI
        this.container.innerHTML = `
            <!-- UI Layer -->
            <div id="rq-ui-layer" class="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 select-none font-sans">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-gray-800 font-bold text-2xl tracking-tight">PHASE: <span id="phase-display">1</span></div>
                        <div class="text-xs text-gray-400 font-mono">SUBJECT ID: <span id="subject-id">8392-B</span></div>
                    </div>
                    <div class="text-right">
                        <div class="text-gray-800 font-bold text-xl">STRESS: <span id="anxiety-level" class="text-red-500">0</span>%</div>
                        <div id="objective-text" class="text-gray-500 font-medium text-sm mt-1">Objective: Locate Exit</div>
                    </div>
                </div>

                <!-- Troll Messages -->
                <div id="troll-message" class="absolute top-1/3 w-full text-center text-5xl font-black text-gray-800 opacity-0 transition-opacity duration-300 drop-shadow-md">
                    OOPS!
                </div>

                <!-- Interaction Prompt -->
                <div id="interaction-prompt" class="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-gray-800 font-bold bg-white/80 px-4 py-2 rounded-full hidden shadow-lg">
                    [CLICK] INTERACT
                </div>

                <!-- Crosshair -->
                <div class="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 border-2 border-gray-400 rounded-full bg-white/50"></div>

                <!-- Exit Button -->
                <button id="rq-exit-btn" class="absolute top-4 right-1/2 translate-x-1/2 pointer-events-auto bg-red-600 text-white px-3 py-1 rounded text-xs opacity-50 hover:opacity-100">ABORT TEST</button>
            </div>

            <!-- Instructions Overlay -->
            <div id="instructions" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-gray-800 bg-white/95 p-12 border border-gray-300 rounded-2xl shadow-xl cursor-pointer z-20 font-sans">
                <h1 class="text-5xl font-black mb-2 tracking-tighter text-gray-900">THE PROGRAM</h1>
                <p class="mb-6 text-gray-600 text-lg">Your participation is mandatory.</p>
                <p class="text-sm text-gray-400 mb-6">(Click to Begin)</p>
                <div class="text-xs text-red-400 uppercase font-bold tracking-widest">Safety protocols disabled</div>
            </div>

            <!-- Transition Overlay -->
            <div id="overlay-message" class="absolute inset-0 bg-white hidden flex-col justify-center items-center z-50 opacity-0 transition-opacity duration-1000 font-sans">
                <h1 class="text-4xl font-bold text-gray-800 mb-2">TEST COMPLETE</h1>
                <p class="text-gray-500">Processing biological response...</p>
                <div class="mt-4 w-64 h-2 bg-gray-200 rounded overflow-hidden">
                    <div id="loading-bar" class="h-full bg-blue-500 w-0 transition-all duration-[3000ms]"></div>
                </div>
            </div>

            <!-- Game Canvas Container -->
            <div id="game-canvas-container" class="w-full h-full block bg-gray-100"></div>
        `;

        this.container.querySelector('#rq-exit-btn').onclick = () => window.miniGameHub.goBack();

        this.initSound();

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f7fa);
        this.scene.fog = new THREE.Fog(0xf5f7fa, 5, 50);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight); // Will be resized properly in update
        this.renderer.shadowMap.enabled = true;
        this.container.querySelector('#game-canvas-container').appendChild(this.renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Player
        this.player = new THREE.Object3D();
        this.player.position.set(0, this.playerHeight, 0);
        this.scene.add(this.player);
        this.player.add(this.camera);

        // Start first phase
        this.loadPhase(0);

        // Event Listeners
        const instructions = this.container.querySelector('#instructions');
        instructions.addEventListener('click', () => {
            this.container.requestPointerLock();
            this.playAmbience();
        });

        document.addEventListener('pointerlockchange', this.boundPointerLockChange);
        window.addEventListener('keydown', this.boundOnKeyDown);
        window.addEventListener('keyup', this.boundOnKeyUp);

        // Force resize
        this.onResize();
        this.animate();
    }

    initSound() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.2;
        this.masterGain.connect(this.audioCtx.destination);
    }

    playTone(freq, type, duration, ramp = true) {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        if(ramp) gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playDing() { this.playTone(1200, 'sine', 0.3); setTimeout(()=>this.playTone(1600, 'sine', 0.5), 100); }
    playError() { this.playTone(150, 'sawtooth', 0.3); }
    playClick() { this.playTone(2000, 'square', 0.05); }
    playAmbience() {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.value = 50;
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        this.ambienceOsc = osc;
    }

    onPointerLockChange() {
        const instructions = this.container.querySelector('#instructions');
        if (document.pointerLockElement === this.container) {
            this.active = true;
            instructions.style.display = 'none';
            document.addEventListener('mousemove', this.boundOnMouseMove, false);
            document.addEventListener('mousedown', this.boundOnMouseDown, false);
        } else {
            this.active = false;
            instructions.style.display = 'flex'; // Flex to center
            instructions.querySelector('h1').innerText = "PAUSED";
            document.removeEventListener('mousemove', this.boundOnMouseMove, false);
            document.removeEventListener('mousedown', this.boundOnMouseDown, false);
        }
    }

    onResize() {
        if (this.camera && this.renderer && this.container) {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    // --- LEVEL MANAGEMENT ---

    clearLevel() {
        this.levelObjects.forEach(obj => this.scene.remove(obj));
        this.levelObjects = [];
        this.interactables = [];
        this.bridgeSegments = [];
        this.exitObject = null;
        this.goalObject = null;
        this.velocity.set(0,0,0);
        this.player.position.set(0, this.playerHeight, 0);
        this.player.rotation.set(0,0,0);
        this.camera.rotation.set(0,0,0);
        this.scene.fog.color.setHex(0xf5f7fa);
    }

    transitionToNextPhase() {
        this.active = false;
        document.exitPointerLock();

        const overlay = this.container.querySelector('#overlay-message');
        const bar = this.container.querySelector('#loading-bar');
        overlay.style.display = 'flex';
        // Trigger reflow
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        bar.style.width = '0%';

        setTimeout(() => { bar.style.width = '100%'; }, 100);

        setTimeout(() => {
            this.currentPhase = (this.currentPhase + 1) % 3;
            this.loadPhase(this.currentPhase);

            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                this.container.requestPointerLock();
                this.active = true;
            }, 1000);
        }, 3500);
    }

    loadPhase(phaseIndex) {
        this.clearLevel();
        this.container.querySelector('#phase-display').innerText = phaseIndex + 1;

        if (phaseIndex === 0) this.buildPhase1_Maze();
        else if (phaseIndex === 1) this.buildPhase2_Bridge();
        else if (phaseIndex === 2) this.buildPhase3_Button();
    }

    // --- PHASE 1: THE MAZE ---
    buildPhase1_Maze() {
        this.container.querySelector('#objective-text').innerText = "Objective: Locate Exit";
        const size = 11;
        const wallSize = 4;
        const offset = (size * wallSize) / 2;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI/2;
        this.scene.add(floor);
        this.levelObjects.push(floor);

        // Walls
        const wallGeo = new THREE.BoxGeometry(wallSize, 6, wallSize);
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        // Simple Grid Maze
        for(let x=0; x<size; x++) {
            for(let z=0; z<size; z++) {
                const xPos = (x * wallSize) - offset;
                const zPos = (z * wallSize) - offset;

                // Random walls, ensure center is clear
                if (Math.random() > 0.6 && (Math.abs(x-5)>1 || Math.abs(z-5)>1)) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(xPos, 3, zPos);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.levelObjects.push(wall);
                    // Store for collision logic later if we want proper collision (current just uses floor clamp)
                    // But here we rely on visual maze. Collision is omitted for simplicity in this port, just maze navigation.
                    // Or we can add simple AABB.
                    this.levelObjects.push({
                         isWall: true,
                         box: new THREE.Box3().setFromObject(wall)
                    });
                }
            }
        }

        // The Exit (Fake)
        const exitGeo = new THREE.BoxGeometry(2, 4, 1);
        const exitMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.exitObject = new THREE.Mesh(exitGeo, exitMat);
        this.exitObject.position.set(15, 2, -15);
        this.scene.add(this.exitObject);
        this.levelObjects.push(this.exitObject);

        const light = new THREE.PointLight(0x00ff00, 1, 10);
        light.position.copy(this.exitObject.position);
        this.scene.add(light);
        this.levelObjects.push(light);
    }

    updatePhase1(dt) {
        if (this.exitObject && this.player.position.distanceTo(this.exitObject.position) < 3.0) {
            this.playDing();
            this.transitionToNextPhase();
        }
    }

    // --- PHASE 2: THE BRIDGE ---
    buildPhase2_Bridge() {
        this.container.querySelector('#objective-text').innerText = "Objective: Cross the Gap";

        const startGeo = new THREE.BoxGeometry(5, 1, 5);
        const mat = new THREE.MeshLambertMaterial({ color: 0x4488ff });
        const startPlat = new THREE.Mesh(startGeo, mat);
        startPlat.position.set(0, -0.5, 0);
        this.scene.add(startPlat);
        this.levelObjects.push(startPlat);
        this.bridgeSegments.push(startPlat);

        for(let i=1; i<20; i++) {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), mat);
            seg.position.set(0, -0.5, -i * 3.5);
            seg.castShadow = true;
            this.scene.add(seg);
            this.levelObjects.push(seg);
            this.bridgeSegments.push(seg);
        }

        this.goalObject = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        this.goalObject.position.set(0, 1, -21 * 3.5);
        this.scene.add(this.goalObject);
        this.levelObjects.push(this.goalObject);
    }

    updatePhase2(dt) {
        this.bridgeSegments.forEach(seg => {
            if (seg.position.z > this.player.position.z + 2 && seg.position.y > -10) {
                seg.position.y -= 10 * dt;
                seg.rotation.x += dt;
            }
        });

        if (this.goalObject) {
            const dist = this.player.position.distanceTo(this.goalObject.position);
            if (dist < 8) {
                this.goalObject.position.z -= 5 * dt;
            }
        }

        if (this.player.position.y < -10) {
            this.playError();
            this.showTrollMessage("GRAVITY CONFIRMED");
            this.increaseAnxiety(15);
            this.transitionToNextPhase();
        }
    }

    // --- PHASE 3: THE BUTTON ---
    buildPhase3_Button() {
        this.container.querySelector('#objective-text').innerText = "Objective: Follow Protocol";

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ color: 0xffffff }));
        floor.rotation.x = -Math.PI/2;
        this.scene.add(floor);
        this.levelObjects.push(floor);

        const ped = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        ped.position.set(0, 1, -5);
        this.scene.add(ped);
        this.levelObjects.push(ped);

        this.buttonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        this.buttonMesh.position.set(0, 2.1, -5);
        this.scene.add(this.buttonMesh);
        this.levelObjects.push(this.buttonMesh);
        this.interactables.push({ mesh: this.buttonMesh, action: 'button' });

        this.buttonPressCount = 0;
    }

    handleInteraction(interactable) {
        if (interactable.action === 'button') {
            this.buttonPressCount++;
            this.playClick();

            interactable.mesh.position.y = 2.0;
            setTimeout(() => interactable.mesh.position.y = 2.1, 100);

            if (this.buttonPressCount < 5) {
                this.showTrollMessage("PROCESSING...");
            } else if (this.buttonPressCount < 10) {
                this.showTrollMessage("ERROR: PRESS HARDER");
                this.playError();
                this.scene.fog.color.setHex(0xffcccc);
            } else {
                this.showTrollMessage("SYSTEM FAILURE");
                this.increaseAnxiety(20);
                this.transitionToNextPhase();
            }
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(this.boundAnimate);
        const dt = this.clock.getDelta();
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    update(dt) {
        if (!this.active) return;
        this.onResize(); // Keep size synced

        const speed = 8.0;
        const keys = this.input.keys;
        const moveForward = keys['w'] || keys['arrowup'];
        const moveBackward = keys['s'] || keys['arrowdown'];
        const moveLeft = keys['a'] || keys['arrowleft'];
        const moveRight = keys['d'] || keys['arrowright'];

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.quaternion);

        forward.y = 0; right.y = 0; forward.normalize(); right.normalize();

        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.add(forward);
        if (moveBackward) moveDir.sub(forward);
        if (moveRight) moveDir.add(right);
        if (moveLeft) moveDir.sub(right);
        moveDir.normalize();

        if (this.onGround) {
            this.velocity.x += moveDir.x * speed * 10 * dt;
            this.velocity.z += moveDir.z * speed * 10 * dt;
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }

        this.velocity.y -= this.gravity * dt;

        // Simple collision prevention for Phase 1 walls
        if (this.currentPhase === 0) {
             const nextPos = this.player.position.clone().add(this.velocity.clone().multiplyScalar(dt));
             // Check against walls
             let hit = false;
             for (let obj of this.levelObjects) {
                 if (obj.isWall && obj.box) {
                     // Check player box (point radius 0.5) against wall box
                     const playerBox = new THREE.Box3(
                         new THREE.Vector3(nextPos.x - 0.5, nextPos.y, nextPos.z - 0.5),
                         new THREE.Vector3(nextPos.x + 0.5, nextPos.y + 2, nextPos.z + 0.5)
                     );
                     if (obj.box.intersectsBox(playerBox)) {
                         hit = true;
                         break;
                     }
                 }
             }
             if (hit) {
                 this.velocity.x = 0;
                 this.velocity.z = 0;
             }
        }

        this.player.position.add(this.velocity.clone().multiplyScalar(dt));

        if (this.player.position.y < this.playerHeight && this.velocity.y < 0) {
            if (this.currentPhase !== 1) {
                this.player.position.y = this.playerHeight;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                let hit = false;
                for(let seg of this.bridgeSegments) {
                    const dx = Math.abs(this.player.position.x - seg.position.x);
                    const dz = Math.abs(this.player.position.z - seg.position.z);
                    if (dx < 1.5 && dz < 1.5 && this.player.position.y >= this.playerHeight - 0.5) {
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    this.player.position.y = this.playerHeight;
                    this.velocity.y = 0;
                    this.onGround = true;
                } else {
                    this.onGround = false;
                }
            }
        }

        if (this.currentPhase === 0) this.updatePhase1(dt);
        if (this.currentPhase === 1) this.updatePhase2(dt);
        if (this.currentPhase === 2) this.checkInteractionHover();
    }

    checkInteractionHover() {
        this.raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables.map(i => i.mesh));

        const prompt = this.container.querySelector('#interaction-prompt');
        if (intersects.length > 0 && intersects[0].distance < 3) {
            prompt.style.display = 'block';
            this.hoveredInteractable = this.interactables.find(i => i.mesh === intersects[0].object);
        } else {
            prompt.style.display = 'none';
            this.hoveredInteractable = null;
        }
    }

    onMouseDown() {
        if (this.hoveredInteractable) {
            this.handleInteraction(this.hoveredInteractable);
        }
    }

    onMouseMove(event) {
        if (!this.active) return;
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        this.player.rotation.y -= movementX * this.mouseSensitivity;
        this.camera.rotation.x -= movementY * this.mouseSensitivity;
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }

    increaseAnxiety(amount) {
        this.anxietyLevel = Math.min(100, this.anxietyLevel + amount);
        this.container.querySelector('#anxiety-level').innerText = Math.floor(this.anxietyLevel);
    }

    showTrollMessage(text) {
        const el = this.container.querySelector('#troll-message');
        el.innerText = text;
        el.style.opacity = 1;
        setTimeout(() => el.style.opacity = 0, 2000);
    }

    shutdown() {
        cancelAnimationFrame(this.animationId);
        document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
        document.removeEventListener('mousemove', this.boundOnMouseMove);
        document.removeEventListener('mousedown', this.boundOnMouseDown);
        window.removeEventListener('keydown', this.boundOnKeyDown);
        window.removeEventListener('keyup', this.boundOnKeyUp);

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
            if(this.renderer.domElement && this.renderer.domElement.parentNode)
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        if (this.container) {
            this.container.innerHTML = '';
            // Reset styles injected by init
             this.container.style = '';
        }
        if (this.ambienceOsc) this.ambienceOsc.stop();
        if (this.audioCtx) this.audioCtx.close();
        document.exitPointerLock();
    }
}
