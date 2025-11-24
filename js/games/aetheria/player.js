import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { config } from './config.js';

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.container = null;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.keys = { w:false, a:false, s:false, d:false, space:false };
        this.mouse = { x: 0, y: 0 };
        this.targetRotation = 0;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.type = 'construct';
        
        this._onKeyDown = (e) => this.onKeyDown(e);
        this._onKeyUp = (e) => this.onKeyUp(e);
        this._onMouseDown = (e) => this.isDragging = true;
        this._onMouseUp = (e) => this.isDragging = false;
        this._onMouseMove = (e) => this.onMouseMove(e);

        this.addEventListeners();
    }

    addEventListeners() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('mousemove', this._onMouseMove);
    }

    removeEventListeners() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mousemove', this._onMouseMove);
    }

    onKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case ' ': this.keys.space = true; break;
        }
    }

    onKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case ' ': this.keys.space = false; break;
        }
    }

    onMouseMove(e) {
        if(this.isDragging) {
            const deltaMove = {
                x: e.offsetX - this.previousMousePosition.x
            };
            this.targetRotation -= deltaMove.x * 0.005;
        }
        this.previousMousePosition = { x: e.offsetX, y: e.offsetY };
    }

    createAvatar(type) {
        this.type = type;
        const group = new THREE.Group();

        if (type === 'construct') {
            // Robot
            const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
            head.position.y = 1.1;
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c }));
            eye.position.set(0, 1.1, 0.3);
            group.add(body, head, eye);
        } else if (type === 'spirit') {
            // Nature Spirit
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 8), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
            body.position.y = 0.5;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
            head.position.y = 1.6;
            group.add(body, head);
            
            // Orbiting leaves
            for(let i=0; i<3; i++) {
                const leaf = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
                leaf.userData = { offset: i * 2, speed: 2 };
                leaf.update = (t) => {
                    leaf.position.x = Math.sin(t * 2 + i*2) * 1;
                    leaf.position.z = Math.cos(t * 2 + i*2) * 1;
                    leaf.position.y = 1 + Math.sin(t * 4) * 0.2;
                };
                group.add(leaf);
            }
        } else {
            // Voyager
            const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0x8e44ad, wireframe: true }));
            body.position.y = 1;
            const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x8e44ad }));
            core.position.y = 1;
            group.add(body, core);
        }

        group.traverse(c => { if(c.isMesh) c.castShadow = true; });
        return group;
    }

    spawn(type, x, y, z) {
        if (this.container) {
            this.scene.remove(this.container);
        }
        
        this.mesh = this.createAvatar(type);
        this.container = new THREE.Group();
        this.container.add(this.mesh);
        this.container.position.set(x, y, z);
        this.scene.add(this.container);
        this.velocity.set(0, 0, 0);
    }

    update(delta, time, world) {
        if (!this.container) return;

        // Physics Logic
        if (this.keys.w) {
            this.velocity.z -= Math.cos(this.targetRotation) * config.speed * delta * 50;
            this.velocity.x -= Math.sin(this.targetRotation) * config.speed * delta * 50;
        }
        if (this.keys.s) {
            this.velocity.z += Math.cos(this.targetRotation) * config.speed * delta * 50;
            this.velocity.x += Math.sin(this.targetRotation) * config.speed * delta * 50;
        }
        
        // Friction
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;

        // Gravity
        this.velocity.y -= config.gravity * delta * 50;

        // Apply Velocity
        this.container.position.x += this.velocity.x * delta;
        this.container.position.z += this.velocity.z * delta;
        
        // Terrain Collision
        const terrainHeight = world.getHeight(this.container.position.x, this.container.position.z);
        
        if (this.container.position.y <= terrainHeight) {
            this.container.position.y = terrainHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Apply Y Velocity
        if (!this.onGround) {
            this.container.position.y += this.velocity.y * delta;
        }

        // Jump
        if (this.keys.space && this.onGround) {
            this.velocity.y = 15; // Jump impulse
            this.onGround = false;
            if (window.soundManager) window.soundManager.playSound('jump');
        }

        // Rotate Mesh to face movement roughly, or just player input
        this.mesh.rotation.y = this.targetRotation + Math.PI; 
        
        // Camera Follow logic (Third Person)
        const cameraOffset = new THREE.Vector3(0, 8, 15);
        // Rotate offset based on mouse drag
        cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0), -this.targetRotation);
        
        const targetPos = this.container.position.clone().add(cameraOffset);
        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.container.position.clone().add(new THREE.Vector3(0, 2, 0)));

        // Avatar specific animations
        if(this.type === 'spirit') {
            this.mesh.children.forEach(child => {
                if(child.update) child.update(time);
            });
        } else if (this.type === 'voyager') {
                this.mesh.children[0].rotation.x = time;
                this.mesh.children[0].rotation.y = time;
        }

        // Respawn if fallen
        if (this.container.position.y < config.waterLevel - 10) {
            this.container.position.set(0, 40, 0);
            this.velocity.set(0,0,0);
        }
    }
}
