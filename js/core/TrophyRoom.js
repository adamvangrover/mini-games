import SaveSystem from './SaveSystem.js';
import { AchievementRegistry } from './AchievementRegistry.js';
import InputManager from './InputManager.js';

/**
 * Renders a 3D Trophy Room scene using Three.js.
 * Displays acquired trophies with inspection capabilities and fluid navigation.
 */
export default class TrophyRoom {
    /**
     * @param {HTMLElement} container - The DOM element to append the renderer to.
     * @param {Function} onBack - Callback function to return to the main menu/hub.
     */
    constructor(container, onBack) {
        this.container = container;
        this.onBack = onBack;
        this.saveSystem = SaveSystem.getInstance();
        this.inputManager = InputManager.getInstance();

        // Core Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        
        // State
        this.isActive = true;
        this.interactables = [];
        this.colliders = [];

        // Navigation State
        this.player = {
            position: new THREE.Vector3(0, 1.6, 8),
            speed: 6.0,
            rotation: { x: 0, y: 0 } // Legacy support
        };

        // Camera Look State
        this.yaw = 0;
        this.pitch = 0;
        this.dragSensitivity = 0.0025;

        this.navTarget = null;
        this.navMarker = null;

        // Mobile Joystick State
        this.joystick = {
            active: false,
            origin: {x:0, y:0},
            current: {x:0, y:0},
            id: null
        };

        // Camera / Input State
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.focusedTrophy = null; // When inspecting a specific item
        this.cameraTargetPos = new THREE.Vector3();

        // Expose for verification
        window.trophyRoomInstance = this;

        if (this.container) {
            this.init();
        }
    }

    init() {
        if (!this.container) {
            console.error("TrophyRoom: Container not provided.");
            return;
        }

        try {
            // --- Scene Setup ---
            const themeStyle = this.saveSystem.getEquippedItem('trophy_room') || 'default';
            const themeConfig = this.getThemeColors(themeStyle);

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(themeConfig.fog);
            this.scene.fog = new THREE.FogExp2(themeConfig.fog, 0.02);

            // --- Camera ---
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.player.position);
            this.updateCameraRotation();

            // --- Renderer ---
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            // --- UI Overlays ---
            this.createUI();
            this.createVirtualJoystick();

            // --- Lighting ---
            this.createLighting(themeConfig);

            // --- Environment & Content ---
            this.createRoom(themeConfig);
            this.renderTrophies();
            this.renderDecorations(); // New!
            this.createNavMarker();

            // --- Event Listeners ---
            window.addEventListener('resize', this.onResize.bind(this));
            
            // Input Listeners
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            // Touch
            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onTouchEnd.bind(this));

            // Start Loop
            this.animate();

        } catch (e) {
            console.error("TrophyRoom: Initialization Failed.", e);
            this.isActive = false;
        }
    }

    createUI() {
        // 1. Hover Overlay (Simple)
        this.hoverOverlay = document.createElement('div');
        this.hoverOverlay.className = "absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 border border-cyan-500 text-white p-4 rounded-lg hidden pointer-events-none text-center font-mono z-40 transition-opacity duration-200";
        this.container.appendChild(this.hoverOverlay);

        // 2. Detail View Overlay (Complex)
        this.detailOverlay = document.createElement('div');
        this.detailOverlay.id = 'trophy-detail-overlay';
        this.detailOverlay.className = "fixed inset-0 bg-black/90 z-50 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300";
        this.detailOverlay.innerHTML = `
            <div class="relative max-w-lg w-full p-8 bg-slate-900 border-2 border-yellow-500 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.3)] transform scale-95 transition-transform duration-300" id="detail-card">
                <button class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl close-btn"><i class="fas fa-times"></i></button>
                <h2 id="td-title" class="text-3xl font-bold text-yellow-400 mb-2 font-mono uppercase tracking-widest text-center"></h2>
                <div class="h-1 w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent mb-6"></div>
                <div id="td-content" class="text-gray-300 space-y-4"></div>
                <div class="mt-8 text-center text-xs text-gray-500 uppercase tracking-widest">Click anywhere to close</div>
            </div>
        `;
        
        // Close logic
        const closeAction = (e) => {
            e.stopPropagation();
            this.clearFocus();
        };
        this.detailOverlay.querySelector('.close-btn').onclick = closeAction;
        this.detailOverlay.onclick = closeAction; 
        this.container.appendChild(this.detailOverlay);

        // 3. Back Button
        const btn = document.createElement('button');
        btn.id = 'trophy-back-btn';
        btn.innerHTML = '<i class="fas fa-arrow-left mr-2"></i> HUB';
        btn.className = 'absolute top-6 left-6 glass-panel px-6 py-3 rounded-full text-white hover:text-cyan-400 z-40 font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500 shadow-lg pointer-events-auto';
        btn.onclick = () => this.exit();
        this.container.appendChild(btn);
    }

    createVirtualJoystick() {
        this.joystickEl = document.createElement('div');
        this.joystickEl.id = 'trophy-joystick';
        this.joystickEl.style.cssText = `
            position: absolute;
            bottom: 50px;
            left: 50px;
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: none;
            z-index: 40;
            touch-action: none;
        `;

        this.knobEl = document.createElement('div');
        this.knobEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            background: rgba(0, 255, 255, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            pointer-events: none;
        `;

        this.joystickEl.appendChild(this.knobEl);
        this.container.appendChild(this.joystickEl);

        // Show on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.joystickEl.style.display = 'block';
        }

        // Joystick-specific touch listeners
        this.joystickEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches[0];
            this.joystick.id = touch.identifier;
            this.joystick.active = true;
            this.joystick.origin = { x: touch.clientX, y: touch.clientY };
            this.joystick.current = { x: touch.clientX, y: touch.clientY };
            this.updateJoystickVisual();
        }, { passive: false });
    }

    updateJoystickVisual() {
        if (!this.joystick.active) {
            this.knobEl.style.transform = `translate(-50%, -50%)`;
            return;
        }
        const dx = this.joystick.current.x - this.joystick.origin.x;
        const dy = this.joystick.current.y - this.joystick.origin.y;

        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 35;

        let visualX = dx;
        let visualY = dy;

        if (dist > maxDist) {
            visualX = (dx / dist) * maxDist;
            visualY = (dy / dist) * maxDist;
        }

        this.knobEl.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    }

    getThemeColors(style) {
        const styles = {
            default: { floor: 0x111111, wall: 0x111122, grid: 0x00ffff, fog: 0x050510, metal: 0.8 },
            neon:    { floor: 0x000000, wall: 0x000022, grid: 0xff00ff, fog: 0x000020, metal: 0.9 },
            gold:    { floor: 0x221100, wall: 0x332200, grid: 0xffd700, fog: 0x221100, metal: 0.95 },
            nature:  { floor: 0x001100, wall: 0x002200, grid: 0x00ff00, fog: 0x001100, metal: 0.5 }
        };
        return styles[style] || styles.default;
    }

    createLighting(theme) {
        // Base Ambient
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Dramatic Spotlight (Shadows)
        const spotLight = new THREE.SpotLight(0xffaa00, 2.0);
        spotLight.position.set(0, 20, 0);
        spotLight.castShadow = true;
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        this.scene.add(spotLight);

        // Theme Accents
        const leftLight = new THREE.PointLight(theme.grid, 1.5, 40);
        leftLight.position.set(-15, 8, -5);
        this.scene.add(leftLight);

        const rightLight = new THREE.PointLight(theme.grid, 1.5, 40);
        rightLight.position.set(15, 8, -5);
        this.scene.add(rightLight);
    }

    createRoom(theme) {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: theme.floor, 
            roughness: 0.2, 
            metalness: theme.metal 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor; // Reference for clicking

        // Grid
        const gridHelper = new THREE.GridHelper(60, 30, theme.grid, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, side: THREE.BackSide, roughness: 0.8 });
        const roomBox = new THREE.Mesh(new THREE.BoxGeometry(60, 25, 60), wallMat);
        roomBox.position.y = 12.5;
        this.scene.add(roomBox);
    }

    renderTrophies() {
        const unlockedIds = this.saveSystem.data.achievements || [];
        const trophies = Object.values(AchievementRegistry);

        const shelfHeight = 1.0;
        
        trophies.forEach((achievement, i) => {
            const isUnlocked = unlockedIds.includes(achievement.id);

            // Layout: Central Aisle
            const isLeft = i % 2 === 0;
            const sideMult = isLeft ? -1 : 1;
            const xPos = sideMult * 8; 
            const zPos = -15 + (Math.floor(i / 2) * 5);

            // Shelf
            const shelf = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.2, 3),
                new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
            );
            shelf.position.set(xPos, shelfHeight, zPos);
            shelf.receiveShadow = true;
            this.scene.add(shelf);

            // Neon Edge
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(3.1, 0.05, 3.1),
                new THREE.MeshBasicMaterial({ color: isUnlocked ? 0x00ffff : 0x330000 })
            );
            edge.position.set(xPos, shelfHeight - 0.1, zPos);
            this.scene.add(edge);

            // Determine Material
            let trophyColor = 0x333333;
            let emissive = 0x000000;
            if (isUnlocked) {
                if (achievement.xp >= 500) { trophyColor = 0xffd700; emissive = 0x664400; } // Gold
                else if (achievement.xp >= 200) { trophyColor = 0xc0c0c0; emissive = 0x222222; } // Silver
                else { trophyColor = 0xcd7f32; emissive = 0x221100; } // Bronze
            }

            const cupGroup = new THREE.Group();
            cupGroup.position.set(xPos, shelfHeight + 0.1, zPos);

            const mat = new THREE.MeshStandardMaterial({ 
                color: trophyColor, 
                metalness: 0.9, 
                roughness: 0.2,
                emissive: emissive,
                emissiveIntensity: 0.4
            });

            // --- Trophy Construction ---
            // Base
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), mat);
            base.position.y = 0.1;
            cupGroup.add(base);

            // Cup Body
            if (isUnlocked) {
                const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), mat);
                stem.position.y = 0.45;
                cupGroup.add(stem);

                const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.6, 16, 1, true), mat);
                bowl.position.y = 1.0;
                cupGroup.add(bowl);
                
                // Add Glow if Legendary
                if (achievement.xp >= 500) {
                     const light = new THREE.PointLight(trophyColor, 1.0, 4);
                     light.position.y = 1.5;
                     cupGroup.add(light);
                }
            } else {
                // Locked Hologram
                const lockGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
                const lockMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.15 });
                const lock = new THREE.Mesh(lockGeo, lockMat);
                lock.position.y = 0.5;
                cupGroup.add(lock);
            }

            // UserData for Raycasting
            cupGroup.userData = { isTrophy: true, id: achievement.id, unlocked: isUnlocked, data: achievement };
            // Propagate userData to children for easy click detection
            cupGroup.traverse(c => { c.userData = cupGroup.userData; });
            
            this.scene.add(cupGroup);
            this.interactables.push(cupGroup);
        });
    }

    renderDecorations() {
        const decorations = [
            { id: 'deco_stool', type: 'stool', pos: [-6, 0, 5], rot: 0 },
            { id: 'deco_plant', type: 'plant', pos: [12, 0, -10], rot: 0 },
            { id: 'deco_vending', type: 'vending', pos: [14, 0, 5], rot: -Math.PI/2 },
            { id: 'deco_lamp', type: 'lamp', pos: [-12, 0, -10], rot: 0 },
            { id: 'deco_rug', type: 'rug', pos: [0, 0.02, 0], rot: 0 },
            { id: 'deco_hologram', type: 'hologram', pos: [0, 0, -20], rot: 0 },
            { id: 'deco_poster', type: 'poster', pos: [-29, 8, 0], rot: Math.PI/2 },
            { id: 'deco_mini_cab', type: 'minicab', pos: [10, 0, 10], rot: -Math.PI/4 }
        ];

        decorations.forEach(deco => {
            // Checks if owned OR simply unlocked in system (Store usually handles unlocking)
            if (this.saveSystem.isItemUnlocked(deco.id)) {
                const mesh = this.createDecorationMesh(deco.type);
                if (mesh) {
                    mesh.position.set(deco.pos[0], mesh.position.y + deco.pos[1], deco.pos[2]);
                    mesh.rotation.y = deco.rot;
                    // Tag it so we verify it later
                    mesh.userData.type = 'decoration';
                    mesh.userData.decoId = deco.id;
                    this.scene.add(mesh);
                }
            }
        });
    }

    createDecorationMesh(type) {
        const group = new THREE.Group();

        if (type === 'stool') {
            const seat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16),
                new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 })
            );
            seat.position.y = 1.0;
            group.add(seat);
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
            );
            leg.position.y = 0.5;
            group.add(leg);
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
            );
            base.position.y = 0.05;
            group.add(base);
        }
        else if (type === 'plant') {
             const pot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.6, 1.0, 8),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown
             );
             pot.position.y = 0.5;
             group.add(pot);
             const leaves = new THREE.Mesh(
                 new THREE.ConeGeometry(1.5, 3, 8),
                 new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: 0.8 })
             );
             leaves.position.y = 2.0;
             group.add(leaves);
        }
        else if (type === 'vending') {
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(3, 6, 2),
                new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 })
            );
            body.position.y = 3;
            group.add(body);
            const glass = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 4),
                new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.2, opacity: 0.8, transparent: true })
            );
            glass.position.set(0, 3.5, 1.01);
            group.add(glass);
        }
        else if (type === 'lamp') {
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 5, 8),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
            );
            post.position.y = 2.5;
            group.add(post);
            const shade = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 1, 32, 1, true),
                new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.5, side: THREE.DoubleSide })
            );
            shade.position.y = 4.5;
            group.add(shade);
            const bulb = new THREE.PointLight(0xff00ff, 1, 10);
            bulb.position.y = 4.0;
            group.add(bulb);
        }
        else if (type === 'rug') {
            const rug = new THREE.Mesh(
                new THREE.CircleGeometry(4, 32),
                new THREE.MeshStandardMaterial({ color: 0x990099, roughness: 1.0 })
            );
            rug.rotation.x = -Math.PI/2;
            group.add(rug);
        }
        else if (type === 'hologram') {
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1.2, 0.5, 16),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            base.position.y = 0.25;
            group.add(base);
            // Hologram Beam
            const beam = new THREE.Mesh(
                new THREE.ConeGeometry(2, 4, 32, 1, true),
                new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
            );
            beam.position.y = 2.5;
            beam.rotation.x = Math.PI; // Point up
            group.add(beam);
        }
        else if (type === 'poster') {
            const poster = new THREE.Mesh(
                new THREE.PlaneGeometry(3, 4),
                new THREE.MeshBasicMaterial({ color: 0xffaa00 })
            );
            group.add(poster);
        }
        else if (type === 'minicab') {
             const cab = new THREE.Mesh(
                 new THREE.BoxGeometry(1.5, 3, 1.5),
                 new THREE.MeshStandardMaterial({ color: 0xff0055 })
             );
             cab.position.y = 1.5;
             group.add(cab);
             const screen = new THREE.Mesh(
                 new THREE.PlaneGeometry(1.2, 1.2),
                 new THREE.MeshBasicMaterial({ color: 0x00ff00 })
             );
             screen.position.set(0, 2.2, 0.76);
             screen.rotation.x = -0.2;
             group.add(screen);
        }

        return group;
    }

    createNavMarker() {
        this.navMarker = new THREE.Group();
        
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.3, 0.4, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        this.navMarker.add(ring);

        const inner = new THREE.Mesh(
            new THREE.CircleGeometry(0.2, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
        );
        inner.rotation.x = -Math.PI / 2;
        inner.position.y = 0.01;
        this.navMarker.add(inner);

        this.navMarker.visible = false;
        this.scene.add(this.navMarker);
    }

    // --- Interaction ---

    focusTrophy(trophyGroup) {
        this.focusedTrophy = trophyGroup;
        this.navTarget = null; // Stop walking

        // Calculate Ideal Camera Position
        // Look at the trophy from slightly above and in front (relative to aisle)
        const tPos = trophyGroup.position.clone();
        // Determine side of aisle based on X
        const xOffset = tPos.x > 0 ? -3 : 3; // Stand 3 units toward center
        
        this.cameraTargetPos.set(tPos.x + xOffset, tPos.y + 1.0, tPos.z);

        // Populate UI
        const data = trophyGroup.userData.data;
        const statusHtml = trophyGroup.userData.unlocked 
            ? `<span class="text-green-400 font-bold">UNLOCKED</span>` 
            : `<span class="text-red-500 font-bold">LOCKED</span>`;

        document.getElementById('td-title').textContent = data.title;
        document.getElementById('td-content').innerHTML = `
            <div class="bg-black/40 p-4 rounded border border-white/10 italic text-gray-400 mb-4">"${data.description}"</div>
            <div class="grid grid-cols-2 gap-4 text-sm font-mono">
                <div>STATUS:</div> <div class="text-right">${statusHtml}</div>
                <div>XP VALUE:</div> <div class="text-right text-yellow-400">${data.xp}</div>
                <div>RARITY:</div> <div class="text-right text-cyan-300">${data.xp >= 500 ? 'LEGENDARY' : (data.xp >= 200 ? 'RARE' : 'COMMON')}</div>
            </div>
        `;

        // Show Overlay
        this.detailOverlay.classList.remove('opacity-0', 'pointer-events-none');
        this.detailOverlay.querySelector('#detail-card').classList.remove('scale-95');
        this.detailOverlay.querySelector('#detail-card').classList.add('scale-100');
        
        if (this.hoverOverlay) this.hoverOverlay.classList.add('opacity-0');
    }

    clearFocus() {
        this.focusedTrophy = null;
        
        // Hide Overlay
        this.detailOverlay.classList.add('opacity-0', 'pointer-events-none');
        this.detailOverlay.querySelector('#detail-card').classList.add('scale-95');
        this.detailOverlay.querySelector('#detail-card').classList.remove('scale-100');

        // Reset Camera Target (look direction will be handled by yaw/pitch restoration)
        // Actually, we should probably reset yaw/pitch to face the trophy so the snap back isn't jarring?
        // For now, let's just let it return to free-look mode.
        this.camera.position.copy(this.player.position).add(new THREE.Vector3(0, 1.6, 0));

        if (this.hoverOverlay) this.hoverOverlay.classList.remove('opacity-0');
    }

    // --- Main Loop ---

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));

        const dt = this.clock.getDelta();

        if (this.focusedTrophy) {
            // [Focus Mode] Smoothly move camera to inspect trophy
            this.camera.position.lerp(this.cameraTargetPos, 0.05);
            
            // Look exactly at trophy
            const lookTarget = this.focusedTrophy.position.clone().add(new THREE.Vector3(0, 0.5, 0));
            this.camera.lookAt(lookTarget);

            // Spin the trophy
            this.focusedTrophy.rotation.y += 0.01;

        } else {
            // [Navigation Mode]
            this.handleMovement(dt);

            // Sync Camera Position
            this.camera.position.set(this.player.position.x, 1.6, this.player.position.z);
            
            // Sync Camera Rotation (Mouse/Touch Drag)
            this.updateCameraRotation();

            // Check interaction hover
            this.checkHover();
        }

        // Ambient Animation (Float)
        this.interactables.forEach(obj => {
            if (obj !== this.focusedTrophy) {
                obj.position.y = 1.1 + Math.sin(Date.now() * 0.002 + obj.position.x) * 0.05;
                obj.rotation.y += 0.005;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    handleMovement(dt) {
        // Hybrid System: WASD + Joystick + Click-to-Move

        const velocity = new THREE.Vector3();
        const isSprinting = this.inputManager.isKeyDown('ShiftLeft');
        const moveSpeed = this.player.speed * (isSprinting ? 1.5 : 1.0) * dt;

        // 1. WASD Input (Relative to Camera Yaw)
        if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
        if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
        if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
        if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

        // 2. Joystick Input
        if (this.joystick.active) {
            const dx = this.joystick.current.x - this.joystick.origin.x;
            const dy = this.joystick.current.y - this.joystick.origin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 10) { // Deadzone
                velocity.x += dx / 50;
                velocity.z += dy / 50;
            }
        }

        if (velocity.length() > 0) {
            this.navTarget = null; // Manual override
            if (velocity.length() > 1 && !this.joystick.active) velocity.normalize();
            velocity.multiplyScalar(moveSpeed);

            // Apply Camera Yaw to Velocity
            const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
            velocity.applyEuler(euler);
        }

        // 3. Click-to-Move Logic
        if (this.navTarget) {
            this.navMarker.visible = true;
            this.navMarker.position.set(this.navTarget.x, 0.05, this.navTarget.z);
            
            const s = 1 + Math.sin(Date.now() * 0.01) * 0.2;
            this.navMarker.scale.set(s,s,s);

            const dir = new THREE.Vector3().subVectors(this.navTarget, this.player.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist < 0.2) {
                this.navTarget = null;
            } else {
                dir.normalize().multiplyScalar(Math.min(moveSpeed, dist));
                velocity.add(dir);
            }
        } else {
            if (this.navMarker) this.navMarker.visible = false;
        }

        // Apply Movement & Collision Bounds
        const nextPos = this.player.position.clone().add(velocity);
        if (Math.abs(nextPos.x) < 28 && Math.abs(nextPos.z) < 28) {
            this.player.position.copy(nextPos);
        }
    }

    updateCameraRotation() {
        if (!this.camera || this.focusedTrophy) return;
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
        // Update legacy property for consistency if something else reads it
        this.player.rotation.y = this.yaw;
    }

    checkHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        let found = null;
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while(obj.parent && (!obj.userData || !obj.userData.isTrophy)) {
                obj = obj.parent;
            }
            if (obj && obj.userData && obj.userData.isTrophy) {
                found = obj.userData;
            }
        }

        if (found) {
            this.hoverOverlay.classList.remove('hidden', 'opacity-0');
            this.hoverOverlay.innerHTML = `<div class="font-bold text-cyan-300 text-lg">${found.data.title}</div><div class="text-xs text-gray-400">Click to Inspect</div>`;
            this.container.style.cursor = 'pointer';
        } else {
            this.hoverOverlay.classList.add('opacity-0');
            this.container.style.cursor = this.isDragging ? 'grabbing' : 'default';
        }
    }

    // --- Input Handlers ---

    onMouseDown(e) {
        if (this.focusedTrophy) return;
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging && !this.focusedTrophy && !this.joystick.active) {
            const dx = e.clientX - this.previousMousePosition.x;
            const dy = e.clientY - this.previousMousePosition.y;

            this.yaw -= dx * this.dragSensitivity;
            this.pitch -= dy * this.dragSensitivity;

            // Limit pitch to avoid flipping
            this.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.pitch));

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onClick(e) {
        if (this.isDragging || this.focusedTrophy || this.joystick.active) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            
            // 1. Check Trophy Click
            let trophyCandidate = obj;
            while(trophyCandidate.parent && (!trophyCandidate.userData || !trophyCandidate.userData.isTrophy)) {
                trophyCandidate = trophyCandidate.parent;
            }
            if (trophyCandidate && trophyCandidate.userData && trophyCandidate.userData.isTrophy) {
                this.focusTrophy(trophyCandidate);
                return;
            }

            // 2. Check Floor Click (Movement)
            if (obj === this.floor || (obj.geometry && obj.geometry.type === 'PlaneGeometry')) {
                const p = intersects[0].point;
                this.navTarget = new THREE.Vector3(p.x, 1.6, p.z);
            }
        }
    }

    onTouchStart(e) {
        // 1. Check Joystick
        let touchingJoystick = false;
        for(let i=0; i<e.changedTouches.length; i++) {
             const t = e.changedTouches[i];
             const el = document.elementFromPoint(t.clientX, t.clientY);
             if(this.joystickEl && (el === this.joystickEl || this.joystickEl.contains(el))) {
                 touchingJoystick = true;
             }
        }
        if (touchingJoystick) return; // Handled by joystick listener

        if (e.touches.length === 1 && !this.focusedTrophy) {
            this.isDragging = true;
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    onTouchMove(e) {
        // Joystick update handled in its own state check via handleMovement or its own listener
        if (this.joystick.active) {
             for(let i=0; i<e.changedTouches.length; i++) {
                 if (e.changedTouches[i].identifier === this.joystick.id) {
                     this.joystick.current = { x: e.changedTouches[i].clientX, y: e.changedTouches[i].clientY };
                     this.updateJoystickVisual();
                 }
             }
        }

        if (this.isDragging && e.touches.length === 1 && !this.joystick.active && !this.focusedTrophy) {
            e.preventDefault();
            const dx = e.touches[0].clientX - this.previousMousePosition.x;
            const dy = e.touches[0].clientY - this.previousMousePosition.y;

            this.yaw -= dx * this.dragSensitivity * 1.5;
            this.pitch -= dy * this.dragSensitivity * 1.5;
            this.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.pitch));

            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    onTouchEnd(event) {
         for(let i=0; i<event.changedTouches.length; i++) {
             if (event.changedTouches[i].identifier === this.joystick.id) {
                 this.joystick.active = false;
                 this.updateJoystickVisual();
             }
         }
         this.isDragging = false;
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    resume() {
        this.isActive = true;
        if(this.container) this.container.style.display = 'block';
        if(this.joystickEl && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            this.joystickEl.style.display = 'block';
        }
        this.clock.start();
        this.animate();
    }

    pause() {
        this.isActive = false;
        if(this.container) this.container.style.display = 'none';
        if(this.joystickEl) this.joystickEl.style.display = 'none';
        this.clock.stop();
    }

    exit() {
        this.isActive = false;
        // Clean DOM
        if (document.getElementById('trophy-back-btn')) document.getElementById('trophy-back-btn').remove();
        if (this.hoverOverlay) this.hoverOverlay.remove();
        if (this.detailOverlay) this.detailOverlay.remove();
        if (this.joystickEl) this.joystickEl.remove();

        // Clean Listeners
        window.removeEventListener('resize', this.onResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('mouseup', this.onMouseUp.bind(this));
        window.removeEventListener('touchmove', this.onTouchMove.bind(this));
        window.removeEventListener('touchend', this.onTouchEnd.bind(this));
        
        if (this.onBack) this.onBack();
    }
}
