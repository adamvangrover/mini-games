export default class VoiceControl {
    constructor() {
        if (VoiceControl.instance) return VoiceControl.instance;
        VoiceControl.instance = this;

        this.recognition = null;
        this.isListening = false;
        this.commands = this.getCommands();

        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("[VoiceControl] Speech Recognition API not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Stop after one command for simplicity
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.showToast("🎤 Listening...");
            this.updateIcon(true);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateIcon(false);
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log(`[VoiceControl] Heard: "${transcript}"`);
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error(`[VoiceControl] Error: ${event.error}`);
            this.isListening = false;
            if (event.error === 'not-allowed') {
                this.showToast("Microphone permission denied.");
            } else if (event.error === 'no-speech') {
                // Ignore
            } else {
                this.showToast(`Voice Error: ${event.error}`);
            }
            this.updateIcon(false);
        };
    }

    getCommands() {
        // Map phrases to actions
        // We rely on window.miniGameHub for global actions
        return [
            { phrases: ['open store', 'shop', 'buy stuff'], action: () => document.getElementById('shop-btn-menu')?.click() },
            { phrases: ['close store', 'close shop'], action: () => document.getElementById('store-close-btn')?.click() },
            { phrases: ['settings', 'options', 'config'], action: () => document.getElementById('settings-btn')?.click() },
            { phrases: ['main menu', 'go home', 'exit game', 'leave game'], action: () => window.miniGameHub.transitionToState('MENU') },
            { phrases: ['toggle view', 'switch view', '3d mode', '2d mode'], action: () => window.miniGameHub.toggleView() },
            { phrases: ['boss mode', 'work mode', 'hide game'], action: () => window.BossMode.instance.toggle(true) },
            { phrases: ['mute audio', 'silence', 'shut up'], action: () => window.miniGameHub.soundManager.toggleMute() },
            // Games
            { phrases: ['play snake', 'start snake'], action: () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'snake-game' }) },
            { phrases: ['play clicker', 'start clicker'], action: () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'clicker-game' }) },
            { phrases: ['play tetris', 'start tetris'], action: () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'tetris-game' }) },
             // New Game
            { phrases: ['play neon automata', 'start automata', 'train ai'], action: () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-automata' }) },
            // Fun
            { phrases: ['hello', 'hi'], action: () => this.showToast("Hello, Human!") },
        ];
    }

    processCommand(transcript) {
        let matched = false;

        // Exact or fuzzy match
        for (const cmd of this.commands) {
            if (cmd.phrases.some(p => transcript.includes(p))) {
                this.showToast(`Command: "${transcript}"`);
                cmd.action();
                matched = true;
                break;
            }
        }

        if (!matched) {
            this.showToast(`Unknown command: "${transcript}"`);
        }
    }

    toggle() {
        if (!this.recognition) {
            this.showToast("Voice Control not supported.");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    }

    showToast(msg) {
        if (window.miniGameHub && window.miniGameHub.showToast) {
            window.miniGameHub.showToast(msg);
        } else {
            console.log(msg);
        }
    }

    updateIcon(active) {
        const btn = document.getElementById('voice-control-btn');
        if (btn) {
            if (active) {
                btn.classList.add('text-red-500', 'animate-pulse');
                btn.classList.remove('text-slate-400');
            } else {
                btn.classList.remove('text-red-500', 'animate-pulse');
                btn.classList.add('text-slate-400');
            }
        }
    }
}
