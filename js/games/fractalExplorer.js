import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class FractalExplorer {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.gl = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);

        this.program = null;
        this.positionLocation = null;
        this.resolutionLocation = null;

        // View State
        this.zoom = 1.0;
        this.offsetX = -0.5;
        this.offsetY = 0.0;

        this.targetZoom = 1.0;
        this.targetOffsetX = -0.5;
        this.targetOffsetY = 0.0;

        this.zoomLocation = null;
        this.offsetLocation = null;

        // Interaction State
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Gameplay State (Artifacts)
        this.artifacts = [
            { id: 'art1', x: -0.743643887037151, y: 0.131825904205330, zoomReq: 10000.0, collected: false },
            { id: 'art2', x: -1.25066, y: 0.02012, zoomReq: 50000.0, collected: false },
            { id: 'art3', x: -0.1528, y: 1.0397, zoomReq: 15000.0, collected: false }
        ];
        this.collectedCount = 0;

        // Load saved state
        const savedProgress = this.saveSystem.getGameConfig('fractal-progress')?.collected || [];
        if (savedProgress.length > 0) {
            savedProgress.forEach(id => {
                const a = this.artifacts.find(art => art.id === id);
                if (a) {
                    a.collected = true;
                    this.collectedCount++;
                }
            });
        }

        // Bindings for removal
        this.boundOnWheel = this.onWheel.bind(this);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseUp = this.onMouseUp.bind(this);
    }

    async init(container) {
        this.container = container;

        // Setup UI and WebGL Canvas
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none" id="fractalExplorer-ui">
                <canvas id="fractalExplorer-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 text-cyan-400 z-10 pointer-events-none drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                    <h1 class="text-2xl font-bold mb-1">DEEP DIVE: MANDELBROT</h1>
                    <div class="text-sm text-slate-300">ZOOM: <span id="fe-zoom">1.0x</span></div>
                    <div class="text-sm text-slate-300">ARTIFACTS: <span id="fe-artifacts">0/3</span></div>
                </div>

                <div id="fe-msg" class="absolute top-20 left-1/2 -translate-x-1/2 text-2xl font-bold text-yellow-400 opacity-0 transition-opacity z-20 pointer-events-none"></div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold z-20 transition-colors pointer-events-auto border border-slate-600 shadow-[0_0_10px_rgba(0,0,0,0.5)]">EXIT DIVE</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#fractalExplorer-canvas');
        this.gl = this.canvas.getContext('webgl');

        if (!this.gl) {
            console.error("WebGL not supported");
            this.container.innerHTML += `<div class="absolute inset-0 bg-red-900/80 flex items-center justify-center text-white z-50">WebGL Required</div>`;
            return;
        }

        this.initWebGL();

        // Update UI
        document.getElementById('fe-artifacts').innerText = `${this.collectedCount}/${this.artifacts.length}`;

        // Events
        this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        window.addEventListener('mousemove', this.boundOnMouseMove);
        window.addEventListener('mouseup', this.boundOnMouseUp);

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    onWheel(e) {
        e.preventDefault();

        // Determine mouse pos in fractal space to zoom towards cursor
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const aspect = rect.width / rect.height;
        const u = (mouseX / rect.width);
        const v = 1.0 - (mouseY / rect.height); // Flip Y for WebGL

        const cX = (u - 0.5) * aspect;
        const cY = (v - 0.5);

        // Current coordinate at mouse
        const worldX = cX / this.targetZoom + this.targetOffsetX;
        const worldY = cY / this.targetZoom + this.targetOffsetY;

        // Adjust zoom
        const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
        this.targetZoom *= zoomFactor;

        // Adjust offset so world coordinate at mouse stays the same
        this.targetOffsetX = worldX - cX / this.targetZoom;
        this.targetOffsetY = worldY - cY / this.targetZoom;
    }

    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const rect = this.canvas.getBoundingClientRect();
        const aspect = rect.width / rect.height;

        // Convert screen movement to fractal space movement
        const moveX = (dx / rect.width) * aspect;
        const moveY = -(dy / rect.height); // Flip Y

        this.targetOffsetX -= moveX / this.targetZoom;
        this.targetOffsetY -= moveY / this.targetZoom;
    }

    onMouseUp() {
        this.isDragging = false;
    }

    initWebGL() {
        const gl = this.gl;

        // Vertex Shader: simple full-screen quad
        const vsSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment Shader: Mandelbrot math
        const fsSource = `
            precision highp float;

            uniform vec2 u_resolution;
            uniform vec2 u_offset;
            uniform float u_zoom;

            // Helper for smooth coloring to avoid log(0)
            float max2(float a, float b) {
                return a > b ? a : b;
            }

            // Neon color palette function
            vec3 palette(float t) {
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.263, 0.416, 0.557);
                return a + b * cos(6.28318 * (c * t + d));
            }

            void main() {
                // Normalize pixel coordinates (from 0 to 1)
                vec2 uv = gl_FragCoord.xy / u_resolution;

                // Map to Mandelbrot space based on zoom and offset
                // Adjust aspect ratio so it doesn't stretch
                float aspect = u_resolution.x / u_resolution.y;
                vec2 c = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
                c = c / u_zoom + u_offset;

                vec2 z = vec2(0.0);
                float iter = 0.0;
                const float max_iter = 256.0;

                for(float i = 0.0; i < max_iter; i++) {
                    // z = z^2 + c
                    float x = (z.x * z.x - z.y * z.y) + c.x;
                    float y = (z.y * z.x + z.x * z.y) + c.y;

                    if((x * x + y * y) > 4.0) break;
                    z.x = x;
                    z.y = y;
                    iter++;
                }

                if (iter == max_iter) {
                    gl_FragColor = vec4(0.05, 0.05, 0.1, 1.0); // Inside set (dark blue/black)
                } else {
                    // Smooth coloring
                    float smooth_iter = iter - log2(max2(1.0, log2(z.x*z.x + z.y*z.y)));
                    float colorT = sqrt(smooth_iter / max_iter) * 3.0; // multiplier to cycle colors
                    vec3 col = palette(colorT);
                    gl_FragColor = vec4(col, 1.0);
                }
            }

        `;

        // Compile Shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(this.program));
            return;
        }

        // Setup Geometry (Two triangles forming a quad)
        this.positionLocation = gl.getAttribLocation(this.program, "a_position");
        this.resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");
        this.zoomLocation = gl.getUniformLocation(this.program, "u_zoom");
        this.offsetLocation = gl.getUniformLocation(this.program, "u_offset");

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    loop() {
        if (!this.gl || !this.program) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update() {
        // Smooth interpolation
        this.zoom += (this.targetZoom - this.zoom) * 0.1;
        this.offsetX += (this.targetOffsetX - this.offsetX) * 0.1;
        this.offsetY += (this.targetOffsetY - this.offsetY) * 0.1;

        // UI updates
        document.getElementById('fe-zoom').innerText = this.zoom >= 1000 ? `${(this.zoom/1000).toFixed(1)}k x` : `${this.zoom.toFixed(1)}x`;

        // Check mechanics
        this.checkArtifacts();
    }

    checkArtifacts() {
        for (const art of this.artifacts) {
            if (art.collected) continue;

            // Check if zoomed in enough and centered on artifact
            if (this.zoom > art.zoomReq) {
                // Calculate distance in fractal space
                const dx = this.offsetX - art.x;
                const dy = this.offsetY - art.y;
                const distSq = dx*dx + dy*dy;

                // Tolerance depends on zoom level
                const tolerance = 0.5 / this.zoom;

                if (distSq < tolerance * tolerance) {
                    this.collectArtifact(art);
                }
            }
        }
    }

    collectArtifact(art) {
        art.collected = true;
        this.collectedCount++;

        this.soundManager.playSound('score');

        const msgEl = document.getElementById('fe-msg');
        msgEl.innerText = `ARTIFACT ISOLATED (${this.collectedCount}/${this.artifacts.length})`;

        msgEl.classList.remove('opacity-0');
        setTimeout(() => {
            msgEl.classList.add('opacity-0');
        }, 3000);

        document.getElementById('fe-artifacts').innerText = `${this.collectedCount}/${this.artifacts.length}`;

        // Save Progress
        const collectedIds = this.artifacts.filter(a => a.collected).map(a => a.id);
        this.saveSystem.setGameConfig('fractal-progress', { collected: collectedIds });

        // Reward
        this.saveSystem.addCurrency(1000);
        if (window.miniGameHub && window.miniGameHub.showToast) {
            window.miniGameHub.showToast("Bounty Claimed: +1000 Coins");
            window.updateHubStats();
        }
    }

    draw() {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.useProgram(this.program);

        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(this.zoomLocation, this.zoom);
        gl.uniform2f(this.offsetLocation, this.offsetX, this.offsetY);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        // Multiply by device pixel ratio for high DPI displays if needed
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
