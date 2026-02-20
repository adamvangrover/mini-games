export const CHATBOT_TRIVIA_DATA = {
    'llm_basics': {
        name: 'LLM Basics',
        icon: 'fa-brain',
        questions: [
            { points: 100, q: "What does 'LLM' stand for?", options: ["Large Learning Machine", "Large Language Model", "Long Linear Matrix", "Low Latency Memory"], answer: 1 },
            { points: 200, q: "Which of these is a popular transformer-based architecture?", options: ["GPT", "CNN", "RNN", "LSTM"], answer: 0 },
            { points: 300, q: "What is the process called when an LLM generates text token by token?", options: ["Training", "Fine-tuning", "Inference", "Backpropagation"], answer: 2 },
            { points: 400, q: "What is a 'token' in the context of LLMs?", options: ["A cryptocurrency coin", "A unit of text (part of a word)", "A user session ID", "A hardware accelerator"], answer: 1 },
            { points: 500, q: "What technique allows an LLM to follow specific instructions better after pre-training?", options: ["Reinforcement Learning from Human Feedback (RLHF)", "Supervised Pre-training", "Unsupervised Clustering", "Gradient Descent"], answer: 0 }
        ]
    },
    'ai_history': {
        name: 'AI History',
        icon: 'fa-history',
        questions: [
            { points: 100, q: "Who is considered the father of theoretical computer science and AI?", options: ["Alan Turing", "Charles Babbage", "Ada Lovelace", "John von Neumann"], answer: 0 },
            { points: 200, q: "What was the name of the IBM computer that defeated Garry Kasparov at chess?", options: ["Deep Blue", "Watson", "AlphaGo", "HAL 9000"], answer: 0 },
            { points: 300, q: "Which AI program defeated the world champion at the game of Go in 2016?", options: ["AlphaGo", "DeepMind", "Stockfish", "GPT-3"], answer: 0 },
            { points: 400, q: "What year was the term 'Artificial Intelligence' coined?", options: ["1956", "1945", "1969", "1980"], answer: 0 },
            { points: 500, q: "Which chatbot was created in 1966 to simulate a Rogerian psychotherapist?", options: ["ELIZA", "PARRY", "A.L.I.C.E.", "Siri"], answer: 0 }
        ]
    },
    'pop_culture': {
        name: 'Pop Culture AI',
        icon: 'fa-film',
        questions: [
            { points: 100, q: "What is the name of the AI in the 'Halo' video game series?", options: ["Cortana", "Siri", "Alexa", "GLaDOS"], answer: 0 },
            { points: 200, q: "Which movie features an AI named HAL 9000?", options: ["2001: A Space Odyssey", "Star Wars", "Blade Runner", "The Matrix"], answer: 0 },
            { points: 300, q: "In 'Iron Man', what is the name of Tony Stark's original AI assistant?", options: ["J.A.R.V.I.S.", "F.R.I.D.A.Y.", "U.L.T.R.O.N.", "H.O.M.E.R."], answer: 0 },
            { points: 400, q: "What is the name of the AI villain in the 'Portal' game series?", options: ["GLaDOS", "Wheatley", "Shodan", "Cortana"], answer: 0 },
            { points: 500, q: "In the movie 'Her', who voices the AI operating system named Samantha?", options: ["Scarlett Johansson", "Jennifer Lawrence", "Emma Stone", "Mila Kunis"], answer: 0 }
        ]
    },
    'sci_fi': {
        name: 'Sci-Fi & Future',
        icon: 'fa-rocket',
        questions: [
            { points: 100, q: "What does 'AGI' stand for?", options: ["Artificial General Intelligence", "Automated Generated Image", "Advanced Game Interface", "Algorithmic Global Index"], answer: 0 },
            { points: 200, q: "Who wrote the 'Three Laws of Robotics'?", options: ["Isaac Asimov", "Arthur C. Clarke", "Philip K. Dick", "H.G. Wells"], answer: 0 },
            { points: 300, q: "What is the 'Singularity' in sci-fi terms?", options: ["The point where AI surpasses human intelligence", "A black hole event horizon", "A single line of code", "The first robot citizen"], answer: 0 },
            { points: 400, q: "In 'The Matrix', what are the agents?", options: ["Sentient programs", "Human traitors", "Robots in disguise", "Aliens"], answer: 0 },
            { points: 500, q: "Which author coined the term 'Cyberspace'?", options: ["William Gibson", "Neal Stephenson", "Bruce Sterling", "Orson Scott Card"], answer: 0 }
        ]
    },
    'hallucinations': {
        name: 'Hallucinations & Flaws',
        icon: 'fa-bug',
        questions: [
            { points: 100, q: "What is an AI 'hallucination'?", options: ["Confidently stating false information", "Seeing ghosts in images", "Crashing due to overload", "Dreaming of electric sheep"], answer: 0 },
            { points: 200, q: "Why do LLMs sometimes struggle with math?", options: ["They predict next tokens, not calculate", "They hate numbers", "They have small context windows", "They lack GPUs"], answer: 0 },
            { points: 300, q: "What is 'prompt injection'?", options: ["Tricking an AI to ignore its instructions", "Adding more memory to a prompt", "Optimizing a prompt for speed", "Deleting a prompt"], answer: 0 },
            { points: 400, q: "Which of these is a common issue with image generation models?", options: ["Extra fingers/limbs", "Too much color", "Perfect text rendering", "Overly sharp edges"], answer: 0 },
            { points: 500, q: "What is 'mode collapse' in GANs?", options: ["Generating the same output repeatedly", "The model crashing", "Forgetting old data", "Overfitting to noise"], answer: 0 }
        ]
    }
};
