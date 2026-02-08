import './assets/styles.css';
import { GameLoop } from './core/GameLoop';
import { MarketEngine } from './core/MarketEngine';
import { Player } from './core/Player';
import { Terminal } from './ui/Terminal';
import { PanicButton } from './ui/PanicButton';
import { SoundManager } from './core/SoundManager';
import { GameManager } from './core/GameManager';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = document.createElement('canvas');
app.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

// Handle resizing
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Audio System
const soundManager = new SoundManager();

// Resume AudioContext on interaction
const resumeAudio = () => {
    soundManager.resume();
    soundManager.startMusic();
    // Remove listeners once resumed
    window.removeEventListener('click', resumeAudio);
    window.removeEventListener('keydown', resumeAudio);
};

window.addEventListener('click', resumeAudio);
window.addEventListener('keydown', resumeAudio);

const player = new Player(1000, 25000); // Start with $1000 cash, $25k debt
const engine = new MarketEngine(soundManager);
const gameManager = new GameManager(engine, player);
const terminal = new Terminal(engine, player, soundManager, gameManager, ctx, canvas.width, canvas.height);
const panicBtn = new PanicButton(engine);

window.addEventListener('resize', () => {
    resize();
    if (terminal) terminal.resize(canvas.width, canvas.height);
});
resize();

const loop = new GameLoop(
    (dt) => {
        engine.update(dt);
        panicBtn.update();
        terminal.update(dt);
    },
    () => {
        terminal.draw();
    }
);

loop.start();
