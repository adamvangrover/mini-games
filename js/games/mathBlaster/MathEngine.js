export default class MathEngine {
    constructor() {
        this.level = 1;
        this.consecutiveCorrect = 0;
        this.difficulty = 'easy';
        this.operations = ['add'];
        this.lastProblem = null;
    }

    generateProblem() {
        // Difficulty Logic
        let maxNumber = 10;
        let validOps = ['add'];

        if (this.level > 2) { maxNumber = 20; validOps.push('sub'); }
        if (this.level > 5) { maxNumber = 50; validOps.push('mul'); }
        if (this.level > 8) { maxNumber = 100; validOps.push('div'); }
        if (this.level > 12) { maxNumber = 200; }

        const op = validOps[Math.floor(Math.random() * validOps.length)];
        let a, b, answer, question;

        switch (op) {
            case 'add':
                a = Math.floor(Math.random() * maxNumber) + 1;
                b = Math.floor(Math.random() * maxNumber) + 1;
                answer = a + b;
                question = `${a} + ${b}`;
                break;
            case 'sub':
                a = Math.floor(Math.random() * maxNumber) + 1;
                b = Math.floor(Math.random() * a); // Ensure positive result
                answer = a - b;
                question = `${a} - ${b}`;
                break;
            case 'mul':
                {
                    const limit = this.level > 8 ? 15 : 10;
                    a = Math.floor(Math.random() * limit) + 1;
                    b = Math.floor(Math.random() * limit) + 1;
                    answer = a * b;
                    question = `${a} x ${b}`;
                }
                break;
            case 'div':
                {
                    const limit = this.level > 10 ? 15 : 10;
                    b = Math.floor(Math.random() * limit) + 1;
                    answer = Math.floor(Math.random() * limit) + 1;
                    a = b * answer;
                    question = `${a} / ${b}`;
                }
                break;
            default:
                a = Math.floor(Math.random() * maxNumber) + 1;
                b = Math.floor(Math.random() * maxNumber) + 1;
                answer = a + b;
                question = `${a} + ${b}`;
        }

        // Generate distraction options
        const options = new Set([answer]);
        let attempts = 0;
        while (options.size < 4 && attempts < 50) {
            attempts++;
            // Generate offset based on answer magnitude, but keep it tight
            const range = Math.max(5, Math.floor(answer * 0.2));
            const offset = Math.floor(Math.random() * (range * 2)) - range;
            const fake = answer + offset;

            if (fake >= 0 && fake !== answer && Number.isInteger(fake)) {
                options.add(fake);
            }
        }

        // If we failed to fill options (rare), just fill with incremental integers
        if (options.size < 4) {
            let filler = answer + 1;
            while(options.size < 4) {
                if (!options.has(filler)) options.add(filler);
                filler++;
            }
        }

        this.lastProblem = { question, answer, options: Array.from(options).sort(() => Math.random() - 0.5) };
        return this.lastProblem;
    }

    checkAnswer(playerAnswer, correctAnswer) {
        const isCorrect = Math.abs(playerAnswer - correctAnswer) < 0.001; // Float tolerance
        if (isCorrect) {
            this.consecutiveCorrect++;
            let levelUp = false;
            // Level up every 3 consecutive wins
            if (this.consecutiveCorrect >= 3) {
                this.level++;
                this.consecutiveCorrect = 0;
                levelUp = true;
            }
            return { correct: true, levelUp: levelUp };
        } else {
            this.consecutiveCorrect = 0;
            // Optional: decrease level on repeated failures? For now just reset streak.
            return { correct: false, levelUp: false };
        }
    }
}
