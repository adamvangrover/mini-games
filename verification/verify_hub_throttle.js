
const fs = require('fs');
const path = require('path');

// Mocks
const THREE = {
    Raycaster: class {
        constructor() {
            this.setFromCamera = () => {};
            this.intersectObjects = (...args) => {
                if(this.intersectObjectsFn) this.intersectObjectsFn(...args);
                return [];
            };
        }
    },
    Vector2: class { constructor(x,y){this.x=x;this.y=y;} },
    Vector3: class { constructor(x,y,z){this.x=x;this.y=y;this.z=z;this.clone=()=>this;this.add=()=>{};this.subVectors=()=>{};this.length=()=>0;this.normalize=()=>{};this.multiplyScalar=()=>{};} },
    Scene: class { add(){} },
    PerspectiveCamera: class {
        constructor(){
            this.position = { copy: ()=>{}, set: ()=>{} };
            this.rotation = { set: ()=>{} };
            this.updateProjectionMatrix = ()=>{};
        }
    },
    WebGLRenderer: class { constructor(){ this.domElement = { addEventListener: ()=>{} }; this.setSize=()=>{}; this.setPixelRatio=()=>{}; this.shadowMap={}; this.render=()=>{}; } },
    Clock: class { getElapsedTime(){return 0;} start(){} getDelta(){return 0.016;} },
    Group: class { constructor(){ this.position={set:()=>{}}; this.rotation={y:0}; this.userData={}; this.add=()=>{}; } },
    BoxGeometry: class {},
    MeshStandardMaterial: class {},
    Mesh: class { constructor(){ this.position={set:()=>{}}; this.rotation={}; this.userData={}; } },
    AmbientLight: class { constructor(){ this.userData={}; } },
    PointLight: class { constructor(){ this.position={set:()=>{}}; this.userData={}; } },
    Color: class { setHex(){} },
    FogExp2: class {},
    GridHelper: class { constructor(){ this.position={}; } },
    PlaneGeometry: class {},
    CylinderGeometry: class {},
    CanvasTexture: class {},
    MeshBasicMaterial: class {},
    BackSide: 1,
    FrontSide: 2,
    DoubleSide: 0,
    PCFSoftShadowMap: 1,
    Box3: class { setFromObject(){ return this; } setFromCenterAndSize(){return this;} },
    RingGeometry: class {},
    CircleGeometry: class {},
    SphereGeometry: class {},
    BufferGeometry: class { setAttribute(){} },
    Float32BufferAttribute: class {},
    PointsMaterial: class {},
    Points: class {},
    AdditiveBlending: 1,
    Euler: class {},
};

const InputManager = {
    getInstance: () => ({
        mouse: { x: 0, y: 0 },
        isKeyDown: () => false
    })
};

const SaveSystem = {
    getInstance: () => ({
        getEquippedItem: () => 'blue',
        getSettings: () => ({}),
        setSetting: () => {},
        setEquippedItem: () => {}
    })
};

const SoundManager = {
    getInstance: () => ({
        getAudioData: () => [],
        playSound: () => {},
        nextMusicStyle: () => 'acid'
    })
};

// Global Setup
global.THREE = THREE;
global.InputManager = InputManager;
global.SaveSystem = { getInstance: SaveSystem.getInstance };
global.SoundManager = { getInstance: SoundManager.getInstance };
global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    devicePixelRatio: 1,
    document: {
        body: { style: {}, appendChild: ()=>{} },
        createElement: () => ({ style: {}, classList: { add:()=>{}, remove:()=>{} }, appendChild: ()=>{} }),
        getElementById: () => null,
    },
    navigator: { maxTouchPoints: 0 }
};
global.document = global.window.document;
global.performance = { now: () => Date.now() };

// Read File
const code = fs.readFileSync(path.join(__dirname, '../js/core/ArcadeHub.js'), 'utf8');

// Regex to remove imports
let cleanCode = code.replace(/import .* from .*/g, '');

// Regex to expose class globally
cleanCode = cleanCode.replace('export default class ArcadeHub', 'global.ArcadeHub = class ArcadeHub');

// Helper to eval
function runTest() {
    // Eval the class
    eval(cleanCode);

    // Instantiate
    const container = { innerHTML: '', appendChild: () => {}, style: {} };
    const hub = new global.ArcadeHub(container, {}, () => {}, () => {});

    // Spy on Raycaster
    const raycaster = hub.raycaster;
    let callCount = 0;
    raycaster.intersectObjectsFn = () => {
        callCount++;
    };

    // Simulate Loop
    console.log("Simulating 60 frames...");
    let currentTime = 1000;

    // We need to override performance.now() inside the loop for each call if the code calls it
    const originalNow = global.performance.now;

    for(let i=0; i<60; i++) {
        currentTime += 16.6;
        global.performance.now = () => currentTime;
        // Mock Clock getDelta if needed, but throttle uses performance.now()
        hub.checkInteractions();
    }
    global.performance.now = originalNow; // Restore

    console.log(`Raycaster called ${callCount} times in 60 frames.`);

    if (callCount > 30) {
        console.log("Verdict: NOT Throttled (Expected for baseline)");
    } else {
        console.log("Verdict: Throttled (Optimization Active)");
    }
}

runTest();
