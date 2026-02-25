const fs = require('fs');
const path = require('path');

// Mock browser environment
const dom = {
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) { this._innerHTML = val; },
    value: '',
    scrollTop: 0,
    scrollHeight: 100,
    focus: () => {},
    remove: () => {},
    querySelector: (sel) => {
        if (sel === '#chat-input') return { value: '<img src=x onerror=alert(1)>', focus: () => {} };
        if (sel === '#chat-text') return dom;
        return dom;
    }
};

global.document = {
    getElementById: (id) => dom
};

// Mock LLMService
const LLMService = {
    chat: async (text) => "I am a bot"
};

async function test() {
    // Read the file
    let content = fs.readFileSync('js/games/neonCity/CityGame.js', 'utf8');

    // Remove imports to make it runnable in this simple script
    content = content.replace(/import .* from .*/g, '');
    content = content.replace(/export default class CityGame/g, 'global.CityGame = class CityGame');

    // Mock global classes used in the file
    global.THREE = {
        Scene: class{ constructor(){this.background={}; this.fog={}; this.add=()=>{};} },
        PerspectiveCamera: class{ constructor(){this.position={set:()=>{}}; this.lookAt=()=>{}; this.updateProjectionMatrix=()=>{};} },
        WebGLRenderer: class{ constructor(){this.domElement={}; this.shadowMap={}} setSize(){} render(){} dispose(){} forceContextLoss(){} },
        AmbientLight: class{ constructor(){} },
        DirectionalLight: class{ constructor(){this.position={set:()=>{}}; this.castShadow=false;} },
        FogExp2: class{},
        Color: class{},
        Vector3: class{ constructor(x,y,z){this.x=x;this.y=y;this.z=z;} clone(){return this;} lerp(){} },
        PCFSoftShadowMap: 1
    };
    global.World = class{ constructor(){}; update(){} };
    global.Player = class{ constructor(){this.mesh={position:{clone:()=>({y:0,z:0}), distanceTo:()=>100}}} move(){} setVehicle(){} };
    global.NPC = class{ update(){} };
    global.Car = class{ update(){} };
    global.DataNode = class{ update(){} };
    global.GlitchPortal = class{ update(){} };
    global.BuildingMarker = class{ update(){} };
    global.HackingPuzzle = class{};
    global.Progression = class{ constructor(){this.data={}} getCurrentStats(){} };
    global.CityUI = class{ constructor(){ this.chatOverlay = { classList: { remove:()=>{}, add:()=>{} }, querySelector: dom.querySelector }; this.updateHUD = ()=>{}; } };
    global.InputManager = { getInstance: () => ({ keys: {} }) };
    global.SaveSystem = { getInstance: () => ({}) };
    global.LLMService = LLMService;
    global.Security = { escapeHTML: (str) => String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;') };
    global.window = { miniGameHub: { soundManager: { playSound: ()=>{} } } };

    // Eval the class definition
    try {
        eval(content);
    } catch (e) {
        console.error("Error evaluating CityGame.js:", e);
        return;
    }

    // Instantiate and test
    const game = new CityGame({ clientWidth: 800, clientHeight: 600, appendChild: ()=>{} });

    // Setup state for chat
    game.isChatting = true;
    game.activeNPC = { role: "Hacker" };

    // Trigger the vulnerability
    await game.sendChatMessage();

    // Check result
    if (dom.innerHTML.includes('<img src=x onerror=alert(1)>')) {
        console.log("VULNERABILITY CONFIRMED: XSS payload found in innerHTML");
    } else {
        console.log("SAFE: XSS payload not found");
    }
}

test();
