export default class ContentGenerator {
    constructor() {
        this.corporateBuzzwords = [
            "synergy", "paradigm shift", "low-hanging fruit", "circle back", "offline",
            "granularity", "deliverables", "stakeholders", "bandwidth", "leverage",
            "disrupt", "pivot", "agile", "scrum", "KPIs", "ROI", "ecosystem"
        ];

        this.podcastHosts = [
            { name: "Chad Synergy", voice: "male", style: "energetic" },
            { name: "Karen Compliance", voice: "female", style: "stern" },
            { name: "Guru Dave", voice: "male", style: "calm" }
        ];
    }

    generateSongTitle(genre) {
        const adjs = ["Electric", "Neon", "Cyber", "Quantum", "Virtual", "Digital", "Analog"];
        const nouns = ["Dreams", "Nights", "Waves", "Glitch", "Protocol", "System", "Mainframe"];
        const corporate = ["Deadline", "Meeting", "Spreadsheet", "Coffee", "Printer", "Commute"];

        if (genre === 'corporate') {
             return `The ${this.getRandom(adjs)} ${this.getRandom(corporate)}`;
        }
        return `${this.getRandom(adjs)} ${this.getRandom(nouns)}`;
    }

    generateArtistName() {
        const p1 = ["DJ", "MC", "Lil", "Big", "The", "System"];
        const p2 = ["Glitch", "Data", "Byte", "Bit", "Pixel", "Crash", "Error"];
        return `${this.getRandom(p1)} ${this.getRandom(p2)}`;
    }

    generatePodcastScript(type) {
        if (type === 'tech') {
            return [
                "Yo, what is up, guys! Welcome back to The Daily Standup.",
                `Today we are talking about ${this.getRandom(this.corporateBuzzwords)}.`,
                "It is a total game changer for the ecosystem.",
                "But first, a word from our sponsor: Water. It is like coffee, but boring.",
                "Smash that like button if you love deliverables!"
            ];
        } else if (type === 'crime') {
            return [
                "The office was quiet. Too quiet.",
                "It was 5:01 PM. Someone had left... without logging off.",
                `The suspect claimed they didn't have the ${this.getRandom(this.corporateBuzzwords)}.`,
                "But the logs... the logs never lie.",
                "Join us next week for: The Case of the Stolen Stapler."
            ];
        } else if (type === 'meditation') {
            return [
                "Take a deep breath in... and release your stock options.",
                `Visualize a ${this.getRandom(this.corporateBuzzwords)} floating in the cloud.`,
                "You are agile. You are disruptive.",
                "Let the stress of Q3 fade away.",
                "Namaste, shareholders."
            ];
        }
        return ["Welcome to the show."];
    }

    generateAudiobookChapter(title) {
        return [
            `Chapter One of ${title}.`,
            "It was the best of times, it was the worst of quarters.",
            "The CEO looked out the window and whispered...",
            `'We need more ${this.getRandom(this.corporateBuzzwords)}.'`,
            "The board of directors nodded in unison.",
            "End of Chapter One."
        ];
    }

    getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
