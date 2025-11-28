export default {
    // --- Game Configuration ---
    GRID_SIZE: 5,
    // 0: blank, 1: sun, 2: moon
    puzzleSolution: [
        [1, 2, 1, 2, 0],
        [0, 1, 0, 1, 2],
        [1, 2, 1, 0, 1],
        [2, 0, 2, 1, 2],
        [1, 2, 0, 2, 0]
    ],

    // --- DOM Elements ---
    gridContainer: null,
    gameBoard: null,
    timerEl: null,
    resetButton: null,
    aiHintButton: null,
    checkSolutionButton: null,
    messageArea: null,
    winModal: null,
    finalTimeEl: null,
    playAgainButton: null,
    shareScoreButton: null,
    shareModal: null,
    shareText: null,
    copyButton: null,
    closeShareButton: null,

    // --- Game State ---
    gridState: [],
    timerInterval: null,
    seconds: 0,
    hasStarted: false,

    // --- Handlers ---
    boundReset: null,
    boundPlayAgain: null,
    boundCheck: null,
    boundAiHint: null,
    boundShareScore: null,
    boundCopy: null,
    boundCloseShare: null,

    // --- SVG Icons ---
    sunSVG: `<svg class="w-3/4 h-3/4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 20a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM5.636 6.364a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm12.728 12.728a1 1 0 010-1.414l-.707-.707a1 1 0 01-1.414 1.414l.707.707a1 1 0 011.414 0zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm20 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.636 17.636a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.728-12.728a1 1 0 011.414 0l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0z"/></svg>`,
    moonSVG: `<svg class="w-3/4 h-3/4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.25 3.004c-3.954 0-7.313 2.122-8.995 5.253a.75.75 0 00.91 1.066 7.701 7.701 0 019.264 9.264.75.75 0 001.066.91C16.877 21.687 19 18.328 19 14.254a9.002 9.002 0 00-7.75-8.996.75.75 0 00-.25-.004z"/></svg>`,
    spinnerSVG: `<svg class="spinner h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`,

    // --- Gemini API ---
    API_KEY: "", // Keep this empty
    API_URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`,

    init: function() {
        this.gridContainer = document.getElementById('eclipselogic-grid-container');
        this.gameBoard = document.getElementById('eclipselogic-game-board');
        this.timerEl = document.getElementById('eclipselogic-timer');
        this.resetButton = document.getElementById('eclipselogic-reset-button');
        this.aiHintButton = document.getElementById('eclipselogic-ai-hint-button');
        this.checkSolutionButton = document.getElementById('eclipselogic-check-solution-button');
        this.messageArea = document.getElementById('eclipselogic-message-area');

        this.winModal = document.getElementById('eclipselogic-win-modal');
        this.finalTimeEl = document.getElementById('eclipselogic-final-time');
        this.playAgainButton = document.getElementById('eclipselogic-play-again-button');
        this.shareScoreButton = document.getElementById('eclipselogic-share-score-button');

        this.shareModal = document.getElementById('eclipselogic-share-modal');
        this.shareText = document.getElementById('eclipselogic-share-text');
        this.copyButton = document.getElementById('eclipselogic-copy-button');
        this.closeShareButton = document.getElementById('eclipselogic-close-share-button');

        this.API_URL += this.API_KEY;

        // Cleanup old indicators if re-init
        const oldIndicators = this.gridContainer.querySelectorAll('.indicator');
        oldIndicators.forEach(el => el.remove());

        this.createIndicators();
        this.setupGame();

        // Unbind old events
        if (this.boundReset) this.resetButton.removeEventListener('click', this.boundReset);
        if (this.boundPlayAgain) this.playAgainButton.removeEventListener('click', this.boundPlayAgain);
        if (this.boundCheck) this.checkSolutionButton.removeEventListener('click', this.boundCheck);
        if (this.boundAiHint) this.aiHintButton.removeEventListener('click', this.boundAiHint);
        if (this.boundShareScore) this.shareScoreButton.removeEventListener('click', this.boundShareScore);
        if (this.boundCopy) this.copyButton.removeEventListener('click', this.boundCopy);
        if (this.boundCloseShare) this.closeShareButton.removeEventListener('click', this.boundCloseShare);

        // Bind new events
        this.boundReset = this.setupGame.bind(this);
        this.boundPlayAgain = this.setupGame.bind(this);
        this.boundCheck = this.checkFinalSolution.bind(this);
        this.boundAiHint = this.showAIHint.bind(this);

        this.boundShareScore = () => {
            this.shareText.value = this.generateShareString();
            this.shareModal.classList.remove('hidden');
        };

        this.boundCopy = () => {
            navigator.clipboard.writeText(this.shareText.value).then(() => {
                this.copyButton.textContent = 'Copied!';
                setTimeout(() => this.copyButton.textContent = 'Copy to Clipboard', 2000);
            });
        };

        this.boundCloseShare = () => this.shareModal.classList.add('hidden');

        this.resetButton.addEventListener('click', this.boundReset);
        this.playAgainButton.addEventListener('click', this.boundPlayAgain);
        this.checkSolutionButton.addEventListener('click', this.boundCheck);
        this.aiHintButton.addEventListener('click', this.boundAiHint);
        this.shareScoreButton.addEventListener('click', this.boundShareScore);
        this.copyButton.addEventListener('click', this.boundCopy);
        this.closeShareButton.addEventListener('click', this.boundCloseShare);
    },

    shutdown: function() {
        this.stopTimer();
        if (this.gridContainer) this.gridContainer.innerHTML = '';
        if (this.gameBoard) this.gameBoard.innerHTML = '';

        if (this.resetButton && this.boundReset) this.resetButton.removeEventListener('click', this.boundReset);
        if (this.playAgainButton && this.boundPlayAgain) this.playAgainButton.removeEventListener('click', this.boundPlayAgain);
        if (this.checkSolutionButton && this.boundCheck) this.checkSolutionButton.removeEventListener('click', this.boundCheck);
        if (this.aiHintButton && this.boundAiHint) this.aiHintButton.removeEventListener('click', this.boundAiHint);
        if (this.shareScoreButton && this.boundShareScore) this.shareScoreButton.removeEventListener('click', this.boundShareScore);
        if (this.copyButton && this.boundCopy) this.copyButton.removeEventListener('click', this.boundCopy);
        if (this.closeShareButton && this.boundCloseShare) this.closeShareButton.removeEventListener('click', this.boundCloseShare);
    },

    async callGeminiAPI(payload, retries = 3, delay = 1000) {
        // Stub for no API Key
        if (!this.API_KEY) return "AI Hint system is offline (No API Key).";

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
                throw new Error("Invalid API response structure");
            } catch (error) {
                console.error(`API call attempt ${i + 1} failed:`, error);
                if (i < retries - 1) await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
                else return null;
            }
        }
    },

    // --- Game Logic ---
    setupGame: function() {
        this.gridState = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(0));
        this.seconds = 0;
        this.hasStarted = false;
        this.stopTimer();
        this.timerEl.textContent = '0s';
        this.winModal.classList.add('hidden');
        this.shareModal.classList.add('hidden');
        this.messageArea.textContent = '';
        this.renderBoard();
        this.validateAllRealTime();
    },

    renderBoard: function() {
        this.gameBoard.innerHTML = '';
        // Fix grid styling to match size
        this.gameBoard.style.display = 'grid';
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 1fr)`;
        this.gameBoard.style.gap = '2px';

        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell bg-white aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', this.handleCellClick.bind(this));

                if(this.gridState[r][c] === 1) cell.innerHTML = this.sunSVG;
                if(this.gridState[r][c] === 2) cell.innerHTML = this.moonSVG;

                this.gameBoard.appendChild(cell);
            }
        }
    },

    handleCellClick: function(e) {
        if (!this.hasStarted) this.startTimer();
        const r = parseInt(e.currentTarget.dataset.r);
        const c = parseInt(e.currentTarget.dataset.c);

        this.gridState[r][c] = (this.gridState[r][c] + 1) % 3; // Cycle 0 -> 1 -> 2 -> 0

        if(window.soundManager) window.soundManager.playTone(400 + (this.gridState[r][c] * 100), 'sine', 0.05);

        this.renderBoard(); // Simple full re-render
        this.validateAllRealTime();
    },

    validateAllRealTime: function() {
         for (let i = 0; i < this.GRID_SIZE; i++) {
            this.validateRealTime(i, 'row');
            this.validateRealTime(i, 'col');
         }
    },

    validateRealTime: function(index, type) {
        let suns = 0;
        let moons = 0;

        for (let i = 0; i < this.GRID_SIZE; i++) {
            const cellState = (type === 'row') ? this.gridState[index][i] : this.gridState[i][index];
            if (cellState === 1) suns++;
            if (cellState === 2) moons++;
        }

        const indicatorId = `eclipselogic-${type}-indicator-${index}`;
        const indicator = document.getElementById(indicatorId);
        if (!indicator) return;

        // Rule: No more than 3 of one type in a row/col
        if (suns > 3 || moons > 3) {
            indicator.classList.add('error');
            indicator.style.backgroundColor = '#ef4444'; // Tailwind Red 500
        } else {
            indicator.classList.remove('error');
            indicator.style.backgroundColor = ''; // Reset
        }
    },

    checkFinalSolution: function() {
        this.messageArea.textContent = '';
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.gridState[r][c] !== this.puzzleSolution[r][c]) {
                    this.messageArea.textContent = 'Something is not quite right. Keep trying!';
                    this.messageArea.classList.add('text-red-600');
                    if(window.soundManager) window.soundManager.playTone(200, 'sawtooth', 0.1);
                    setTimeout(() => this.messageArea.textContent = '', 3000);
                    return;
                }
            }
        }
        this.handleWin();
    },

    startTimer: function() {
        if (this.timerInterval) return;
        this.hasStarted = true;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            this.timerEl.textContent = `${this.seconds}s`;
        }, 1000);
    },

    stopTimer: function() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    },

    handleWin: function() {
        this.stopTimer();
        this.finalTimeEl.textContent = `${this.seconds}s`;
        if(window.soundManager) window.soundManager.playTone(800, 'sine', 0.5, true);
        this.winModal.classList.remove('hidden');
    },

    generateShareString: function() {
        let text = `I solved the Eclipse Logic Puzzle in ${this.seconds}s!\n\n`;
        const sunEmoji = '☀️';
        const moonEmoji = '🌙';
        const blankEmoji = '⬜';
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.gridState[r][c] === 1) text += sunEmoji;
                else if (this.gridState[r][c] === 2) text += moonEmoji;
                else text += blankEmoji;
            }
            text += '\n';
        }
        return text;
    },

    async showAIHint() {
        const originalText = this.aiHintButton.innerHTML;
        this.aiHintButton.innerHTML = this.spinnerSVG; this.aiHintButton.disabled = true;

        const systemPrompt = `You are a friendly puzzle expert for a 5x5 logic game. The goal is to place suns and moons to match a hidden solution. A simple rule for real-time validation is: no row or column can have more than 3 suns or more than 3 moons. Give a short, strategic hint based on the user's current grid without revealing the solution. Focus on logic, not direct answers.`;

        let gridString = this.gridState.map(row =>
            row.map(cell => cell === 1 ? 'S' : (cell === 2 ? 'M' : '_')).join(' ')
        ).join('\n');

        const userPrompt = `The current grid is:\n${gridString}\n\nWhat is a good hint? For example, point out a row with an issue or suggest a general pattern to look for. Keep it to 1-2 sentences.`;

        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        const hint = await this.callGeminiAPI(payload);
        this.aiHintButton.innerHTML = originalText; this.aiHintButton.disabled = false;

        this.messageArea.textContent = hint || "Sorry, I couldn't come up with a hint right now.";
        this.messageArea.classList.remove('text-red-600');
        setTimeout(() => this.messageArea.textContent = '', 5000);
    },

    createIndicators: function() {
        // Need to ensure parent grid layout accommodates indicators.
        // The container 'eclipselogic-grid-container' is a grid.
        // We assume it's set up to be (GRID_SIZE+1) x (GRID_SIZE+1) roughly.
        // Actually, CSS classes need to handle this.
        // Let's force some styles for the container to ensure indicators work.
        this.gridContainer.style.display = 'grid';
        this.gridContainer.style.gridTemplateColumns = '20px 1fr';
        this.gridContainer.style.gridTemplateRows = '20px 1fr';

        // Re-structure:
        // Top Row: Empty corner, Col Indicators
        // Bottom Row: Row Indicators, Game Board

        // This is tricky with the current flat structure appended.
        // We'll trust the existing logic if it was working, or simplified:
        // We can just skip complex indicators if they are causing layout issues,
        // but the code tries to place them in specific grid tracks.

        // The previous code appended indicators to gridContainer.
        // Let's assume gridContainer is the parent.
        this.gridContainer.style.gridTemplateColumns = `repeat(${this.GRID_SIZE + 1}, 1fr)`;
        this.gridContainer.style.gridTemplateRows = `repeat(${this.GRID_SIZE + 1}, 1fr)`;

        // Move GameBoard to bottom right
        this.gameBoard.style.gridColumn = `2 / span ${this.GRID_SIZE}`;
        this.gameBoard.style.gridRow = `2 / span ${this.GRID_SIZE}`;

        for (let i = 0; i < this.GRID_SIZE; i++) {
            const colInd = document.createElement('div');
            colInd.id = `eclipselogic-col-indicator-${i}`;
            colInd.className = 'indicator col-indicator w-full h-2 bg-slate-300 rounded-full mt-auto mb-1';
            colInd.style.gridColumn = i + 2;
            colInd.style.gridRow = 1;
            this.gridContainer.appendChild(colInd);

            const rowInd = document.createElement('div');
            rowInd.id = `eclipselogic-row-indicator-${i}`;
            rowInd.className = 'indicator row-indicator h-full w-2 bg-slate-300 rounded-full ml-auto mr-1';
            rowInd.style.gridColumn = 1;
            rowInd.style.gridRow = i + 2;
            this.gridContainer.appendChild(rowInd);
        }
    }
};
