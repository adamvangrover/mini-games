
import SaveSystem from './SaveSystem.js';
import { AchievementRegistry } from './AchievementRegistry.js';
import InputManager from './InputManager.js';

/**
 * Renders a 3D Trophy Room scene using Three.js.
 * Displays acquired trophies and allows the player to "walk" around.
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

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isActive = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];
        this.colliders = [];

        // Navigation
        this.player = {
            position: new THREE.Vector3(0, 1.6, 6),
            speed: 4.0,
            rotation: { x: 0, y: 0 }
        };
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.navTarget = null;
        this.navMarker = null;

        // Camera Focus State
        this.focusedTrophy = null;
        this.cameraTargetPos = new THREE.Vector3();
        this.cameraTargetRot = new THREE.Vector3();
        this.defaultCameraOffset = new THREE.Vector3(0, 0, 0);

        if (this.container) {
            this.init(this.container);
        }
    }

    init() {
        if (!this.container) {
            console.error("TrophyRoom: Container not provided.");
            return;
        }

        try {
            // Scene Setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0a1a);
            this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.player.position);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Clear container
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            // Add Interaction Overlay (Simple Hover)
            this.overlay = document.createElement('div');
            this.overlay.className = "absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 border border-cyan-500 text-white p-4 rounded-lg hidden pointer-events-none text-center font-mono z-40";
            this.container.appendChild(this.overlay);

            // Detail View Overlay
            this.detailOverlay = document.createElement('div');
            this.detailOverlay.id = 'trophy-detail-overlay';
            this.detailOverlay.className = "hidden"; // Ensure hidden by default
            this.detailOverlay.innerHTML = `
                <button class="close-btn"><i class="fas fa-times"></i></button>
                <h2 id="td-title">Trophy Title</h2>
                <div id="td-content" class="text-sm text-gray-300"></div>
            `;
            this.container.appendChild(this.detailOverlay);
            this.detailOverlay.querySelector('.close-btn').onclick = () => this.clearFocus();


            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
            this.scene.add(ambientLight);

            // Main Room Light
            const spotLight = new THREE.SpotLight(0xffaa00, 1.5);
            spotLight.position.set(0, 15, 0);
            spotLight.castShadow = true;
            this.scene.add(spotLight);

            this.createLights();
            this.createNavMarker();

            // Environment
            this.createRoom();
            this.renderTrophies();

            // Listeners
            window.addEventListener('resize', this.onResize.bind(this));

            // Mouse/Touch
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onMouseUp.bind(this));


            // Add "Back" button overlay
            const btn = document.createElement('button');
            btn.id = 'trophy-back-btn';
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> Return to Hub';
            btn.className = 'absolute top-6 left-6 glass-panel px-6 py-3 rounded-full text-white hover:text-cyan-400 z-50 font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500 shadow-lg';
            btn.onclick = () => this.exit();
            this.container.appendChild(btn);

            this.animate();

        } catch (e) {
            console.error("TrophyRoom: Failed to initialize WebGL.", e);
            if(this.container) this.container.innerHTML = '<div class="text-white text-center p-10">Error: WebGL not supported.</div>';
            this.isActive = false;
        }
    }

    createLights() {
        // Neon Strips Logic (Simulated by point lights near walls)
        const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];

        // Add colorful point lights along the aisles
        for(let z = -15; z <= 15; z += 10) {
            const color = colors[Math.abs(z) % colors.length];
            const leftLight = new THREE.PointLight(color, 0.8, 15);
            leftLight.position.set(-12, 5, z);
            this.scene.add(leftLight);

            const rightLight = new THREE.PointLight(color, 0.8, 15);
            rightLight.position.set(12, 5, z);
            this.scene.add(rightLight);
        }
    }

    createNavMarker() {
        const geometry = new THREE.RingGeometry(0.3, 0.4, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.navMarker = new THREE.Mesh(geometry, material);
        this.navMarker.rotation.x = -Math.PI / 2;
        this.navMarker.visible = false;
        this.scene.add(this.navMarker);
    }

    createRoom() {
        const style = this.saveSystem.getEquippedItem('trophy_room') || 'default';

        // Style Configs
        const styles = {
            default: { floor: 0x111111, wall: 0x111122, grid: 0x00ffff, metal: 0.8 },
            neon: { floor: 0x000000, wall: 0x000022, grid: 0xff00ff, metal: 0.9 },
            gold: { floor: 0x221100, wall: 0x332200, grid: 0xffd700, metal: 0.95 }
        };
        const theme = styles[style] || styles.default;

        // Floor
        const geometry = new THREE.PlaneGeometry(60, 60);
        const material = new THREE.MeshStandardMaterial({
            color: theme.floor,
            roughness: 0.1,
            metalness: theme.metal
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(60, 30, theme.grid, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Walls (Large Hall)
        const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, side: THREE.BackSide, roughness: 0.2 });
        const roomBox = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 60), wallMat);
        roomBox.position.y = 10;
        this.scene.add(roomBox);
    }

    addCollider(mesh, x, y, z) {
        if (x !== undefined) mesh.position.set(x, y, z);
        mesh.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

    renderTrophies() {
        const unlocked = this.saveSystem.data.achievements || [];
        const trophies = Object.values(AchievementRegistry);

        // Layout Parameters
        const shelfHeight = 1.0;
        const rowSpacing = 6;
        const colSpacing = 4;
        const itemsPerRow = 4;

        // Group into rows
        let row = 0;
        let col = 0;

        trophies.forEach((achievement, i) => {
            const isUnlocked = unlocked.includes(achievement.id);

            // Calculate Position
            // Two main aisles: Left (-X) and Right (+X)
            // Or just rows in Z

            // Let's do a central aisle with shelves on left and right
            const isLeft = i % 2 === 0;
            const sideMult = isLeft ? -1 : 1;
            const xPos = sideMult * 8; // 8 units from center
            const zPos = -10 + (Math.floor(i / 2) * 5); // Spacing in Z

            // Shelf Base
            const shelfGeo = new THREE.BoxGeometry(3, 0.2, 3);
            const shelfMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
            const shelf = new THREE.Mesh(shelfGeo, shelfMat);
            shelf.position.set(xPos, shelfHeight, zPos);
            shelf.receiveShadow = true;
            this.scene.add(shelf);

            // Neon edge for shelf
            const edgeGeo = new THREE.BoxGeometry(3.1, 0.05, 3.1);
            const edgeMat = new THREE.MeshBasicMaterial({ color: isUnlocked ? 0x00ffff : 0x550000 });
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            edge.position.set(xPos, shelfHeight - 0.1, zPos);
            this.scene.add(edge);


            // Trophy Model
            let trophyColor = 0x444444; // Locked grey
            let emissive = 0x000000;

            if (isUnlocked) {
                if (achievement.xp >= 500) { trophyColor = 0xffd700; emissive = 0xaa6600; } // Gold
                else if (achievement.xp >= 200) { trophyColor = 0xc0c0c0; emissive = 0x444444; } // Silver
                else { trophyColor = 0xcd7f32; emissive = 0x442200; } // Bronze
            }

            const cupGroup = new THREE.Group();
            cupGroup.position.set(xPos, shelfHeight + 0.1, zPos);

            // Detailed Trophy Construction
            const cupMat = new THREE.MeshStandardMaterial({
                color: trophyColor,
                metalness: 0.9,
                roughness: 0.2,
                emissive: emissive,
                emissiveIntensity: 0.2
            });

            // Base
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), cupMat);
            base.position.y = 0.1;
            cupGroup.add(base);

            // Stem
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), cupMat);
            stem.position.y = 0.45;
            cupGroup.add(stem);

            // Cup
            if (THREE.TorusGeometry) {
                // Cup Bowl
                const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.1, 0.6, 16, 1, true), cupMat); // Open top
                bowl.position.y = 1.0;
                cupGroup.add(bowl);
                // Handles
                const handleGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI);
                const handle1 = new THREE.Mesh(handleGeo, cupMat);
                handle1.position.set(0.5, 1.0, 0);
                handle1.rotation.z = -Math.PI / 2;
                cupGroup.add(handle1);

                const handle2 = new THREE.Mesh(handleGeo, cupMat);
                handle2.position.set(-0.5, 1.0, 0);
                handle2.rotation.z = Math.PI / 2;
                cupGroup.add(handle2);
            } else {
                 // Fallback
                 const cup = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.8,0.5), cupMat);
                 cup.position.y = 0.5;
                 cupGroup.add(cup);
            }

            if (!isUnlocked) {
                // Lock Hologram
                const lockGeo = new THREE.BoxGeometry(0.8, 1.0, 0.8);
                const lockMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.2 });
                const lock = new THREE.Mesh(lockGeo, lockMat);
                lock.position.y = 0.8;
                cupGroup.add(lock);
            } else {
                // Particle glow (Mesh based)
                const glowGeo = new THREE.SphereGeometry(0.1, 8, 8);
                const glowMat = new THREE.MeshBasicMaterial({ color: trophyColor, transparent: true, opacity: 0.8 });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.position.y = 1.0;
                cupGroup.add(glow);

                // Add a point light for this trophy if it's high tier
                if (achievement.xp >= 500) {
                     const pl = new THREE.PointLight(trophyColor, 0.5, 3);
                     pl.position.set(0, 1.5, 0);
                     cupGroup.add(pl);
                }
            }

            this.scene.add(cupGroup);

            // Store reference for interaction
            // Ensure the children also point to this userData for raycasting up-bubbling
            cupGroup.userData = { id: achievement.id, unlocked: isUnlocked, data: achievement, isTrophy: true };
            cupGroup.traverse(child => { child.userData = cupGroup.userData; });

            this.interactables.push(cupGroup);
        });
    }

    // --- Interaction & Movement ---

    onMouseMove(event) {
        if (this.focusedTrophy) return; // No mouse look when focused

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
             const deltaX = event.clientX - this.previousMousePosition.x;
             this.player.rotation.y -= deltaX * 0.003;
             this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    onMouseDown(event) {
        if (this.focusedTrophy) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onTouchStart(event) {
        if (this.focusedTrophy) return;
        if(event.touches.length === 1) {
             this.isDragging = true;
             this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
    }

    onTouchMove(event) {
        if (this.focusedTrophy) return;
        if(this.isDragging && event.touches.length === 1) {
             const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
             this.player.rotation.y -= deltaX * 0.005;
             this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
    }

    onClick(event) {
        if(this.isDragging) return;
        if(this.focusedTrophy) return; // Must close via UI

        // Raycast
        if (!this.camera) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;

            // Bubble up to find trophy group
            while(target.parent && (!target.userData || !target.userData.isTrophy)) {
                target = target.parent;
                if (!target) break;
            }

            if (target && target.userData && target.userData.isTrophy) {
                this.focusTrophy(target);
            } else {
                // Walk to point if floor
                // Check if we hit floor (not trophy)
                if (intersects[0].object.geometry instanceof THREE.PlaneGeometry) {
                    const point = intersects[0].point;
                    this.navTarget = point;
                    this.navTarget.y = this.player.position.y;
                }
            }
        }
    }

    focusTrophy(trophyGroup) {
        this.focusedTrophy = trophyGroup;
        this.navTarget = null; // Stop walking

        // Calculate camera position: Front and slightly up
        // Trophy is at trophyGroup.position
        // We want to be roughly 2 units away in front (relative to rotation)
        // But trophies are aligned to Z axis.

        // Simple: 2 units in front (Z+ or Z- depending on side)
        // xPos was +/- 8. Center is 0.
        // If x > 0 (Right side), we want camera at x=6 (Left of trophy) to look Right?
        // Or just look at it from center aisle.

        const tPos = trophyGroup.position.clone();
        const offset = new THREE.Vector3(0, 0.5, 0); // Look at center

        // Ideally camera pos:
        // If x > 0, Camera at (x - 3, y + 0.5, z) looking at (x, y+0.5, z)
        // If x < 0, Camera at (x + 3, y + 0.5, z)

        const camX = tPos.x > 0 ? tPos.x - 3 : tPos.x + 3;

        this.cameraTargetPos.set(camX, tPos.y + 0.5, tPos.z);

        // We need to look AT the trophy.
        // We will handle LookAt in animate

        // Show UI
        const data = trophyGroup.userData.data;
        const status = trophyGroup.userData.unlocked ?
            `<span style="color:#00ff00">UNLOCKED</span>` :
            `<span style="color:#ff0000">LOCKED</span>`;

        const titleEl = document.getElementById('td-title');
        const contentEl = document.getElementById('td-content');

        if(titleEl) titleEl.textContent = data.title;
        if(contentEl) {
            contentEl.innerHTML = `
                <p class="mb-4 italic">"${data.description}"</p>
                <div class="stat-row"><span>Status:</span> ${status}</div>
                <div class="stat-row"><span>XP Value:</span> <span class="text-yellow-400">${data.xp}</span></div>
                <div class="stat-row"><span>Rarity:</span> ${data.xp >= 500 ? 'Legendary' : (data.xp >= 200 ? 'Rare' : 'Common')}</div>
            `;
        }

        this.detailOverlay.classList.add('visible');
        if (this.overlay) this.overlay.classList.add('hidden'); // Hide hover overlay
    }

    clearFocus() {
        this.focusedTrophy = null;
        this.detailOverlay.classList.remove('visible');
        // Camera will naturally drift back to player control in animate
        // But we need to reset rotation control
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));

        const dt = 0.016; // Approx

        if (this.focusedTrophy) {
            // Lerp Camera to Target
            this.camera.position.lerp(this.cameraTargetPos, 0.05);

            // LookAt
            const targetLook = this.focusedTrophy.position.clone().add(new THREE.Vector3(0, 0.8, 0));
            this.camera.lookAt(targetLook);

            // Rotate Trophy
            this.focusedTrophy.rotation.y += 0.01;

        } else {
            // Normal Walking Mode
            this.handleMovement(dt);

            // Camera Follow Player
            // Smoothly interpolate camera to player head
            const desiredPos = this.player.position.clone();
            this.camera.position.lerp(desiredPos, 0.1);
            this.camera.rotation.y = this.player.rotation.y;

            // Raycast for Hover (Only if not focused)
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            let hovered = null;
            if (intersects.length > 0) {
                let target = intersects[0].object;
                while(target.parent && (!target.userData || !target.userData.id)) {
                    target = target.parent;
                    if (!target) break;
                }
                if (target && target.userData && target.userData.id) {
                    hovered = target.userData;
                    target.rotation.y += 0.05; // Spin faster
                }
            }

            // Update Hover Overlay
            if (hovered && this.overlay) {
                this.overlay.classList.remove('hidden');
                this.overlay.innerHTML = `<div class="font-bold text-cyan-300">${hovered.data.title}</div><div class="text-xs">Click for details</div>`;
            } else if (this.overlay) {
                this.overlay.classList.add('hidden');
            }
        }

        // Idle Animation for all trophies
        this.interactables.forEach(obj => {
            if (obj !== this.focusedTrophy) {
                 obj.rotation.y += 0.01;
                 obj.position.y = (obj === this.focusedTrophy ? 1.0 : 1.4) + Math.sin(Date.now() * 0.002 + obj.position.x) * 0.1;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    handleMovement(dt) {
         const isSprinting = this.inputManager.isKeyDown('ShiftLeft') || this.inputManager.isKeyDown('ShiftRight');
         const speedMultiplier = isSprinting ? 2.0 : 1.0;
         const moveSpeed = this.player.speed * speedMultiplier * dt;
         const velocity = new THREE.Vector3();

         // WASD
         if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
         if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
         if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
         if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

         if (velocity.length() > 0) {
             velocity.normalize().multiplyScalar(moveSpeed);
             const euler = new THREE.Euler(0, this.player.rotation.y, 0, 'YXZ');
             velocity.applyEuler(euler);
             this.navTarget = null;
         }

         if (this.navTarget) {
             if (this.navMarker) {
                this.navMarker.visible = true;
                this.navMarker.position.set(this.navTarget.x, 0.1, this.navTarget.z);
                this.navMarker.rotation.z += dt * 2;
             }

             const dir = new THREE.Vector3().subVectors(this.navTarget, this.player.position);
             dir.y = 0;
             const dist = dir.length();
             if (dist < 0.2) this.navTarget = null;
             else {
                 dir.normalize().multiplyScalar(Math.min(moveSpeed, dist));
                 velocity.add(dir);
             }
         } else {
             if (this.navMarker) this.navMarker.visible = false;
         }

         const nextPos = this.player.position.clone().add(velocity);

         // Bounds Check (Aisle width approx 10, length 30)
         // Center aisle width = +/- 5?
         // Let's keep it simple: Large box
         if(Math.abs(nextPos.x) < 25 && Math.abs(nextPos.z) < 25) {
              this.player.position.copy(nextPos);
         }
    }

    exit() {
        this.isActive = false;
        // Cleanup DOM
        const btn = document.getElementById('trophy-back-btn');
        if (btn) btn.remove();
        if (this.overlay) this.overlay.remove();
        if (this.detailOverlay) this.detailOverlay.remove();

        window.removeEventListener('resize', this.onResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));

        // Callback
        if (this.onBack) this.onBack();
    }
}
