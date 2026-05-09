import * as THREE from 'three';

export default class MonarchGame {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.animationId = null;

        this.gridSize = 8;
        this.board = new Array(this.gridSize * this.gridSize).fill(0); // 0: empty, 1: piece, 2: X
        this.regions = new Array(this.gridSize * this.gridSize).fill(0);
        this.piecesPlaced = 0;

        this.blocks = [];
        this.pieces = [];

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.regionColors = [
            0x2ecc71, 0x3498db, 0x9b59b6, 0xf1c40f,
            0xe67e22, 0xe74c3c, 0x1abc9c, 0x34495e
        ];

        this.isComplete = false;
        this.boundOnClick = this.onClick.bind(this);
        this.boundOnResize = this.onResize.bind(this);
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container absolute inset-0 bg-[#1a1a2e] overflow-hidden';

        // Add back button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute top-4 left-4 px-4 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded shadow-lg border border-slate-600 hover:border-fuchsia-400 transition-all z-50 backdrop-blur-sm pointer-events-auto";
        btn.onclick = () => window.miniGameHub && window.miniGameHub.goBack();
        this.container.appendChild(btn);

        // Add win overlay
        this.winOverlay = document.createElement('div');
        this.winOverlay.className = "absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 hidden text-white";
        this.winOverlay.innerHTML = `
            <h1 class="text-6xl font-bold text-fuchsia-500 mb-4 animate-bounce">MONARCH</h1>
            <p class="text-xl text-cyan-400 mb-8">Grid Conquered</p>
            <button id="monarch-retry" class="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-lg transition-colors pointer-events-auto">NEXT LEVEL</button>
        `;
        this.container.appendChild(this.winOverlay);
        document.getElementById('monarch-retry').onclick = () => {
            this.winOverlay.classList.add('hidden');
            this.generateLevel();
        };

        this.setupThree();
        this.generateLevel();

        window.addEventListener('resize', this.boundOnResize);
        this.renderer.domElement.addEventListener('click', this.boundOnClick);
    }

    setupThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.05);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        const d = 6;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        this.scene.add(dirLight);

        // Ground plane to receive shadows
        const planeGeo = new THREE.PlaneGeometry(50, 50);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.2 });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -1;
        plane.receiveShadow = true;
        this.scene.add(plane);

        this.gameLoop();
    }

    generateLevel() {
        this.isComplete = false;
        this.board = new Array(this.gridSize * this.gridSize).fill(0);
        this.piecesPlaced = 0;

        // Cleanup old blocks/pieces
        this.blocks.forEach(b => this.scene.remove(b));
        this.blocks = [];
        this.pieces.forEach(p => p && this.scene.remove(p.mesh));
        this.pieces = new Array(this.gridSize * this.gridSize).fill(null);

        // Generate a valid monarch board (8 queens + 8 regions)
        let generatedRegions = null;
        while (!generatedRegions) {
            generatedRegions = this.tryGenerateMonarchBoard();
        }
        this.regions = generatedRegions;

        // Create 3D Blocks
        const blockGeo = new THREE.BoxGeometry(0.9, 0.2, 0.9);
        const offset = (this.gridSize - 1) / 2;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const i = y * this.gridSize + x;
                const regionId = this.regions[i];

                const mat = new THREE.MeshStandardMaterial({
                    color: this.regionColors[regionId % this.regionColors.length],
                    roughness: 0.7,
                    metalness: 0.1
                });

                const mesh = new THREE.Mesh(blockGeo, mat);
                mesh.position.set(x - offset, 0, y - offset);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                mesh.userData = { index: i, x, y };

                this.scene.add(mesh);
                this.blocks.push(mesh);

                // Animation offset
                mesh.position.y = -5;
                mesh.userData.targetY = 0;
                mesh.userData.delay = (x + y) * 0.05;
            }
        }
    }

    onClick(event) {
        if (this.isComplete) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.blocks);

        if (intersects.length > 0) {
            const block = intersects[0].object;
            this.handleCellClick(block.userData.index);
        }
    }

    handleCellClick(index) {
        if (this.board[index] === 1) {
            // Remove piece
            this.board[index] = 0;
            this.piecesPlaced--;
            if (this.pieces[index]) {
                this.scene.remove(this.pieces[index].mesh);
                this.pieces[index] = null;
            }
        } else {
            // Place piece
            this.board[index] = 1;
            this.piecesPlaced++;

            // Add 3D Piece
            const block = this.blocks[index];
            const pieceGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
            const pieceMat = new THREE.MeshStandardMaterial({
                color: 0xff00ff,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x440044
            });
            const mesh = new THREE.Mesh(pieceGeo, pieceMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Bounce animation start state
            mesh.position.set(block.position.x, 3, block.position.z);

            this.scene.add(mesh);
            this.pieces[index] = {
                mesh: mesh,
                velocity: 0,
                targetY: 0.4,
                bouncing: true
            };

            // Play retro blip
            this.playBlip();
        }

        this.checkWin();
    }

    playBlip() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    checkWin() {
        if (this.piecesPlaced !== this.gridSize) return;

        let isValid = true;

        // Rows & Cols
        for (let i = 0; i < this.gridSize; i++) {
            let rowCount = 0;
            let colCount = 0;
            for (let j = 0; j < this.gridSize; j++) {
                if (this.board[i * this.gridSize + j] === 1) rowCount++;
                if (this.board[j * this.gridSize + i] === 1) colCount++;
            }
            if (rowCount !== 1 || colCount !== 1) isValid = false;
        }

        // Regions
        const regionCounts = new Array(this.gridSize).fill(0);
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] === 1) {
                regionCounts[this.regions[i]]++;
            }
        }
        if (regionCounts.some(c => c !== 1)) isValid = false;

        // Diagonal spacing
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] === 1) {
                const x = i % this.gridSize;
                const y = Math.floor(i / this.gridSize);

                const neighbors = [
                    [x-1, y-1], [x+1, y-1], [x-1, y+1], [x+1, y+1]
                ];

                for (let [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                        if (this.board[ny * this.gridSize + nx] === 1) isValid = false;
                    }
                }
            }
        }

        if (isValid) {
            this.isComplete = true;
            this.winOverlay.classList.remove('hidden');
        }
    }

    tryGenerateMonarchBoard() {
        let queens = [];
        const solve = (row) => {
            if (row === 8) return true;
            let cols = [0, 1, 2, 3, 4, 5, 6, 7];
            cols.sort(() => Math.random() - 0.5);

            for (let i = 0; i < cols.length; i++) {
                let col = cols[i];
                let valid = true;
                for (let j = 0; j < queens.length; j++) {
                    let [r, c] = queens[j];
                    if (c === col) valid = false;
                    if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) valid = false;
                }
                if (valid) {
                    queens.push([row, col]);
                    if (solve(row + 1)) return true;
                    queens.pop();
                }
            }
            return false;
        };

        if (!solve(0)) return null;

        let localRegions = new Array(64).fill(-1);
        queens.forEach((q, i) => localRegions[q[0] * 8 + q[1]] = i);

        let unassigned = 64 - 8;
        let qLists = queens.map(q => [[q[0], q[1]]]);

        while (unassigned > 0) {
            let validRegions = [];
            for (let i = 0; i < 8; i++) {
                let canGrow = false;
                for (let j = 0; j < qLists[i].length; j++) {
                    let [r, c] = qLists[i][j];
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                    for (let d = 0; d < dirs.length; d++) {
                        let dr = dirs[d][0], dc = dirs[d][1];
                        if (r + dr >= 0 && r + dr < 8 && c + dc >= 0 && c + dc < 8 && localRegions[(r + dr) * 8 + c + dc] === -1) {
                            canGrow = true;
                            break;
                        }
                    }
                    if (canGrow) break;
                }
                if (canGrow) validRegions.push(i);
            }

            if (validRegions.length === 0) return null; // blocked

            let rId = validRegions[Math.floor(Math.random() * validRegions.length)];
            let candidates = [];
            for (let j = 0; j < qLists[rId].length; j++) {
                let [r, c] = qLists[rId][j];
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (let d = 0; d < dirs.length; d++) {
                    let dr = dirs[d][0], dc = dirs[d][1];
                    if (r + dr >= 0 && r + dr < 8 && c + dc >= 0 && c + dc < 8 && localRegions[(r + dr) * 8 + c + dc] === -1) {
                        candidates.push([r + dr, c + dc]);
                    }
                }
            }

            let [nr, nc] = candidates[Math.floor(Math.random() * candidates.length)];
            localRegions[nr * 8 + nc] = rId;
            qLists[rId].push([nr, nc]);
            unassigned--;
        }

        return localRegions;
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        const aspect = width / height;
        const d = 6;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    gameLoop() {
        this.animationId = requestAnimationFrame(() => this.gameLoop());
        const dt = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Animate blocks coming in
        this.blocks.forEach(block => {
            if (block.userData.delay > 0) {
                block.userData.delay -= dt;
            } else {
                block.position.y += (block.userData.targetY - block.position.y) * 10 * dt;
            }
        });

        // Animate pieces bouncing
        this.pieces.forEach(p => {
            if (p && p.bouncing) {
                p.velocity -= 20 * dt; // gravity
                p.mesh.position.y += p.velocity * dt;

                if (p.mesh.position.y <= p.targetY) {
                    p.mesh.position.y = p.targetY;
                    p.velocity = -p.velocity * 0.5; // bounce
                    if (Math.abs(p.velocity) < 0.5) {
                        p.bouncing = false;
                        p.mesh.position.y = p.targetY;
                    }
                }
            } else if (p && this.isComplete) {
                // Celebration spin
                p.mesh.rotation.y += dt * 2;
                p.mesh.position.y = p.targetY + Math.sin(time * 5 + p.mesh.position.x) * 0.2;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    shutdown() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.boundOnResize);
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('click', this.boundOnClick);
            this.renderer.dispose();
        }
        if (this.scene) {
             this.scene.clear();
        }
        if (this.container) this.container.innerHTML = '';
    }
}
