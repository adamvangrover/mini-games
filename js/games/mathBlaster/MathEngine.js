export default class MathEngine {
    constructor() {
        this.level = 1;
        this.consecutiveCorrect = 0;
        this.difficulty = 'easy';
        this.operations = ['add']; // Start with addition
        this.lastProblem = null;
    }

    generateProblem() {
        // Difficulty Logic
        let maxNumber = 10;
        let operations = ['add'];

        if (this.level > 2) { maxNumber = 20; operations.push('sub'); }
        if (this.level > 5) { maxNumber = 50; operations.push('mul'); }
        if (this.level > 8) { maxNumber = 100; operations.push('div'); }
        if (this.level > 10) { maxNumber = 200; operations.push('mix'); } // Fractions/Mix

        const op = operations[Math.floor(Math.random() * operations.length)];
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
                a = Math.floor(Math.random() * 12) + 1;
                b = Math.floor(Math.random() * 12) + 1;
                answer = a * b;
                question = `${a} x ${b}`;
                break;
            case 'div':
                b = Math.floor(Math.random() * 10) + 1;
                answer = Math.floor(Math.random() * 10) + 1;
                a = b * answer;
                question = `${a} / ${b}`;
                break;
            default:
                a = Math.floor(Math.random() * maxNumber) + 1;
                b = Math.floor(Math.random() * maxNumber) + 1;
                answer = a + b;
                question = `${a} + ${b}`;
        }

        // Generate distraction options
        const options = new Set([answer]);
        while (options.size < 4) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const fake = answer + offset;
            if (fake >= 0 && fake !== answer) options.add(fake);
        }

        this.lastProblem = { question, answer, options: Array.from(options).sort(() => Math.random() - 0.5) };
        return this.lastProblem;
    }

    checkAnswer(playerAnswer, correctAnswer) {
        const isCorrect = Math.abs(playerAnswer - correctAnswer) < 0.001; // Float tolerance
        if (isCorrect) {
            this.consecutiveCorrect++;
            if (this.consecutiveCorrect >= 3) {
                this.level++;
                this.consecutiveCorrect = 0;
                return { correct: true, levelUp: true };
            }
            return { correct: true, levelUp: false };
        } else {
            this.consecutiveCorrect = 0;
            return { correct: false, levelUp: false };
        }
    }
}
