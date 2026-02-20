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
        name: 'Hallucinations',
        icon: 'fa-bug',
        questions: [
            { points: 100, q: "What is an AI 'hallucination'?", options: ["Confidently stating false information", "Seeing ghosts in images", "Crashing due to overload", "Dreaming of electric sheep"], answer: 0 },
            { points: 200, q: "Why do LLMs sometimes struggle with math?", options: ["They predict tokens, not calculate", "They hate numbers", "They have small context windows", "They lack GPUs"], answer: 0 },
            { points: 300, q: "What is 'prompt injection'?", options: ["Tricking an AI to ignore its instructions", "Adding more memory to a prompt", "Optimizing a prompt for speed", "Deleting a prompt"], answer: 0 },
            { points: 400, q: "Which of these is a common issue with image generation models?", options: ["Extra fingers/limbs", "Too much color", "Perfect text rendering", "Overly sharp edges"], answer: 0 },
            { points: 500, q: "What is 'mode collapse' in GANs?", options: ["Generating the same output repeatedly", "The model crashing", "Forgetting old data", "Overfitting to noise"], answer: 0 }
        ]
    },
    'prompt_engineering': {
        name: 'Prompt Engineering',
        icon: 'fa-pen-fancy',
        questions: [
            { points: 100, q: "What is 'Chain of Thought' prompting?", options: ["Asking the model to explain its reasoning", "Writing a really long prompt", "Chaining multiple models together", "Repeating the same question"], answer: 0 },
            { points: 200, q: "What is 'Zero-shot' prompting?", options: ["Asking without examples", "Asking with zero context", "Asking a model with zero training", "A failed prompt"], answer: 0 },
            { points: 300, q: "What does 'Few-shot' prompting involve?", options: ["Providing a few examples in the prompt", "Asking a few questions", "Running the model a few times", "Using a small model"], answer: 0 },
            { points: 400, q: "What is a 'System Prompt'?", options: ["Initial instructions setting behavior", "A prompt for the operating system", "A hardware level command", "The final user query"], answer: 0 },
            { points: 500, q: "What is 'RAG' in the context of prompting?", options: ["Retrieval-Augmented Generation", "Random Access Generation", "Real-time AI Generation", "Recursive Algorithm Grouping"], answer: 0 }
        ]
    },
    'ai_agents': {
        name: 'AI Agents',
        icon: 'fa-robot',
        questions: [
            { points: 100, q: "What distinguishes an 'Agent' from a standard Chatbot?", options: ["Ability to use tools and take action", "It has a voice", "It costs more money", "It runs on a desktop"], answer: 0 },
            { points: 200, q: "What is the 'ReAct' framework?", options: ["Reasoning and Acting", "Repeating Actions", "Reactive Activation", "Real-time Actor"], answer: 0 },
            { points: 300, q: "What is a 'Tool' for an AI agent?", options: ["A function/API it can call", "A physical hammer", "The hardware it runs on", "The prompt text"], answer: 0 },
            { points: 400, q: "What is the role of 'Memory' in an agent?", options: ["Maintaining context over time", "Storing the model weights", "Remembering the user's name only", "Caching web pages"], answer: 0 },
            { points: 500, q: "Which of these is a popular framework for building AI agents?", options: ["LangChain", "ReactJS", "Django", "NumPy"], answer: 0 }
        ]
    },
    'policy_governance': {
        name: 'Policy & Safety',
        icon: 'fa-balance-scale',
        questions: [
            { points: 100, q: "What is 'Red Teaming' in AI?", options: ["Adversarial testing to find flaws", "Building a team of communists", "Color-coding data centers", "Marketing the AI"], answer: 0 },
            { points: 200, q: "What is the 'EU AI Act'?", options: ["A regulation categorizing AI risk levels", "A ban on all AI", "A funding program for AI", "A set of coding standards"], answer: 0 },
            { points: 300, q: "What is 'Alignment' in AI safety?", options: ["Ensuring AI goals match human values", "Aligning text on a screen", "Calibrating sensors", "Organizing data columns"], answer: 0 },
            { points: 400, q: "What is 'Bias' in AI models?", options: ["Systematic unfair prejudice in outputs", "A preference for certain colors", "The weight of a neural neuron", "A type of electrical interference"], answer: 0 },
            { points: 500, q: "What does 'RLHF' help with primarily?", options: ["Reducing harmful outputs", "Increasing speed", "Reducing memory usage", "Improving math skills"], answer: 0 }
        ]
    },
    'multimodal': {
        name: 'Multimodal AI',
        icon: 'fa-photo-video',
        questions: [
            { points: 100, q: "What does 'Multimodal' mean?", options: ["Handling text, image, audio, etc.", "Running on multiple modes", "Using multiple GPUs", "Speaking multiple languages"], answer: 0 },
            { points: 200, q: "Which model is famous for generating images from text?", options: ["DALL-E", "GPT-4", "BERT", "Whisper"], answer: 0 },
            { points: 300, q: "What is 'CLIP' used for?", options: ["Connecting text and images", "Clipping videos", "Compressing audio", "Copy-pasting text"], answer: 0 },
            { points: 400, q: "Which model is known for high-quality video generation?", options: ["Sora", "DALL-E", "Midjourney", "Stable Diffusion"], answer: 0 },
            { points: 500, q: "What is 'Whisper' by OpenAI?", options: ["A speech recognition model", "A text-to-speech model", "A secret chatbot", "An image generator"], answer: 0 }
        ]
    },
    'model_architecture': {
        name: 'Architecture',
        icon: 'fa-cogs',
        questions: [
            { points: 100, q: "What mechanism is key to the Transformer architecture?", options: ["Self-Attention", "Convolution", "Recurrence", "Max Pooling"], answer: 0 },
            { points: 200, q: "What is a 'Context Window'?", options: ["The amount of text the model can 'see' at once", "The GUI window size", "The time it takes to reply", "The training duration"], answer: 0 },
            { points: 300, q: "What does 'MoE' stand for?", options: ["Mixture of Experts", "Model of Everything", "Matrix of Elements", "Memory on Edge"], answer: 0 },
            { points: 400, q: "What replaces RNNs in modern LLMs?", options: ["Transformers", "LSTMs", "GRUs", "Perceptrons"], answer: 0 },
            { points: 500, q: "What is 'KV Cache' used for?", options: ["Speeding up inference", "Storing model weights", "Caching user passwords", "Training data storage"], answer: 0 }
        ]
    },
    'training_data': {
        name: 'Training & Data',
        icon: 'fa-database',
        questions: [
            { points: 100, q: "What is 'Fine-tuning'?", options: ["Training a pre-trained model on specific data", "Adjusting the volume", "Cleaning the dataset", "Building a model from scratch"], answer: 0 },
            { points: 200, q: "What is 'Overfitting'?", options: ["Memorizing training data instead of generalizing", "Training for too long", "Using too much GPU memory", "Fitting too much text in a prompt"], answer: 0 },
            { points: 300, q: "What is a 'Checkpoint'?", options: ["A saved state of the model during training", "A point in a video game", "A security scan", "A validation dataset"], answer: 0 },
            { points: 400, q: "What is 'Synthetic Data'?", options: ["Data generated by AI for training", "Fake news", "Encrypted data", "Compressed data"], answer: 0 },
            { points: 500, q: "What is 'Loss Function'?", options: ["A metric measuring prediction error", "A function that deletes data", "A way to compress models", "A missing file handler"], answer: 0 }
        ]
    },
    'major_players': {
        name: 'Major Players',
        icon: 'fa-building',
        questions: [
            { points: 100, q: "Which company created ChatGPT?", options: ["OpenAI", "Google", "Microsoft", "Meta"], answer: 0 },
            { points: 200, q: "Who created the 'Claude' series of models?", options: ["Anthropic", "DeepMind", "Mistral", "Cohere"], answer: 0 },
            { points: 300, q: "Which company released the 'Llama' open weights models?", options: ["Meta", "Amazon", "Apple", "NVIDIA"], answer: 0 },
            { points: 400, q: "What is the name of Google's flagship model family?", options: ["Gemini", "Bard", "PaLM", "Bert"], answer: 0 },
            { points: 500, q: "Which of these is a French AI company?", options: ["Mistral", "Cohere", "Hugging Face", "DeepL"], answer: 0 }
        ]
    },
    'ai_ethics': {
        name: 'AI Ethics',
        icon: 'fa-gavel',
        questions: [
            { points: 100, q: "What is 'Algorithmic Bias'?", options: ["AI making unfair decisions based on flawed data", "AI preferring Python over C++", "AI running faster on Tuesdays", "AI liking certain users"], answer: 0 },
            { points: 200, q: "What is the 'Black Box' problem?", options: ["Not knowing how an AI reached a decision", "A flight recorder", "A dark server room", "Encrypted code"], answer: 0 },
            { points: 300, q: "What is a 'Deepfake'?", options: ["AI-generated media impersonating real people", "A deep neural network", "A fake news article", "A profound philosophical thought"], answer: 0 },
            { points: 400, q: "What is 'Data Poisoning'?", options: ["Intentionally corrupting training data", "Deleting a database", "Uploading a virus", "Writing bad code"], answer: 0 },
            { points: 500, q: "What is 'Explainable AI' (XAI)?", options: ["AI designed to be understood by humans", "AI that can speak", "AI with a tutorial", "Open source AI"], answer: 0 }
        ]
    },
    'coding_ai': {
        name: 'Coding with AI',
        icon: 'fa-code',
        questions: [
            { points: 100, q: "What is GitHub Copilot primarily used for?", options: ["Code completion and generation", "Project management", "Bug tracking", "Hosting websites"], answer: 0 },
            { points: 200, q: "Can LLMs write unit tests?", options: ["Yes, and they are often quite good at it", "No, impossible", "Only in Python", "Only if paid"], answer: 0 },
            { points: 300, q: "What is a common risk when copying code from an LLM?", options: ["Security vulnerabilities or hallucinations", "It will delete your hard drive", "It is always copyright infringement", "It won't compile"], answer: 0 },
            { points: 400, q: "What language are most ML frameworks (PyTorch, TensorFlow) based on?", options: ["Python", "Java", "C#", "Ruby"], answer: 0 },
            { points: 500, q: "What is 'Refactoring' with AI?", options: ["Improving code structure without changing behavior", "Writing new features", "Deleting old code", "Compressing files"], answer: 0 }
        ]
    },
    'future_work': {
        name: 'Future of Work',
        icon: 'fa-briefcase',
        questions: [
            { points: 100, q: "What is 'Augmentation' vs 'Automation'?", options: ["Helping humans vs Replacing humans", "Adding limbs vs Robots", "Software vs Hardware", "More pay vs Less pay"], answer: 0 },
            { points: 200, q: "Which jobs are generally considered 'safe' from AI for now?", options: ["Jobs requiring high empathy and physical dexterity", "Data entry", "Translation", "Basic coding"], answer: 0 },
            { points: 300, q: "What is 'UBI' often discussed in context of AI?", options: ["Universal Basic Income", "Universal Binary Interface", "United Bot Intelligence", "Under Budget Implementation"], answer: 0 },
            { points: 400, q: "What is the 'Gig Economy' likely to see with AI?", options: ["Integration of AI tools for freelancers", "Complete collapse", "Return to office", "Manual labor only"], answer: 0 },
            { points: 500, q: "What skill is becoming more valuable due to AI?", options: ["Critical thinking and oversight", "Rote memorization", "Fast typing", "Mental arithmetic"], answer: 0 }
        ]
    },
    'ai_science': {
        name: 'AI in Science',
        icon: 'fa-atom',
        questions: [
            { points: 100, q: "What did AlphaFold solve?", options: ["Protein folding structure prediction", "The traveling salesman problem", "Nuclear fusion", "Climate change"], answer: 0 },
            { points: 200, q: "How is AI used in drug discovery?", options: ["Simulating molecular interactions", "Prescribing meds", "Manufacturing pills", "Shipping logistics"], answer: 0 },
            { points: 300, q: "What is 'GraphNeuralNetwork' often used for?", options: ["Analyzing molecular structures", "Generating images", "Text translation", "Voice synthesis"], answer: 0 },
            { points: 400, q: "How does AI help in astronomy?", options: ["Classifying galaxies and detecting exoplanets", "Steering telescopes", "Communicating with aliens", "Predicting eclipses"], answer: 0 },
            { points: 500, q: "What is a 'Digital Twin'?", options: ["A virtual simulation of a physical system", "A backup hard drive", "A clone of a person", "A second monitor"], answer: 0 }
        ]
    }
};
