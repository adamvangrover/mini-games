import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { World } from './world.js';
import { Player } from './player.js';

let scene, camera, renderer, animationId;
let world, player;
let clock;
let isPlaying = false;

const aetheriaGame = {
    init: () => {
        const container = document.getElementById('aetheria-game-container');
        const selectionScreen = document.getElementById('aetheria-selection-screen');
        const hud = document.getElementById('aetheria-hud');
        
        // Reset UI
        selectionScreen.style.display = 'flex';
        selectionScreen.style.opacity = '1';
        hud.style.display = 'none';

        // Initialize Three.js
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Clear previous canvas if any
        const oldCanvas = container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
        
        container.appendChild(renderer.domElement);

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffdfba, 1.2);
        dirLight.position.set(100, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        scene.add(dirLight);
        
        // Initialize Game Objects
        world = new World(scene);
        world.generate();

        player = new Player(scene, camera);

        clock = new THREE.Clock();
        isPlaying = false;

        // Setup Selection Screen
        window.startAetheriaGame = (type) => {
            if (window.soundManager) window.soundManager.playSound('click');
            selectionScreen.style.opacity = 0;
            setTimeout(() => {
                selectionScreen.style.display = 'none';
                hud.style.display = 'block';
            }, 1000);

            player.spawn(type, 0, 30, 0);
            isPlaying = true;
        };

        // Resize Listener
        window.addEventListener('resize', onWindowResize);

        // Start Loop
        animate();
    },

    shutdown: () => {
        isPlaying = false;
        cancelAnimationFrame(animationId);
        
        window.removeEventListener('resize', onWindowResize);
        
        if (player) {
            player.removeEventListeners();
        }

        if (renderer) {
            renderer.dispose();
            const canvas = renderer.domElement;
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
        
        // Clean up UI
        delete window.startAetheriaGame;
    }
};

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    world.update(time);

    if (isPlaying && player) {
        player.update(delta, time, world);
        
        // Update HUD
        const coordDisplay = document.getElementById('aetheria-coord-display');
        const altDisplay = document.getElementById('aetheria-alt-display');
        
        if (coordDisplay && player.container) {
            coordDisplay.innerText = `${player.container.position.x.toFixed(0)}, ${player.container.position.z.toFixed(0)}`;
        }
        if (altDisplay && player.container) {
            altDisplay.innerText = player.container.position.y.toFixed(1);
        }
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.aetheriaGame = aetheriaGame;
export default aetheriaGame;
