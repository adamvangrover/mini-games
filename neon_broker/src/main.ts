import './assets/styles.css';
import { GameLoop } from './core/GameLoop';
import { MarketEngine } from './core/MarketEngine';
import { Player } from './core/Player';
import { Terminal } from './ui/Terminal';
import { PanicButton } from './ui/PanicButton';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = document.createElement('canvas');
app.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

// Handle resizing
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

const player = new Player(1000, 25000); // Start with $1000 cash, $25k debt
const engine = new MarketEngine();
const terminal = new Terminal(engine, player, ctx, canvas.width, canvas.height);
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
    },
    () => {
        terminal.draw();
    }
);

loop.start();
