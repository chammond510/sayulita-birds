// Quiz module - handles photo and audio quiz modes

const Quiz = {
    // Photo Quiz state
    photo: {
        currentBird: null,
        options: [],
        answered: false,
        score: 0,
        total: 0
    },

    // Audio Quiz state
    audio: {
        currentBird: null,
        options: [],
        answered: false,
        score: 0,
        total: 0,
        audioElement: null
    },

    elements: {
        // Photo quiz elements
        photoQuiz: {
            photo: null,
            options: null,
            feedback: null,
            nextBtn: null,
            score: null
        },
        // Audio quiz elements
        audioQuiz: {
            playBtn: null,
            options: null,
            feedback: null,
            nextBtn: null,
            score: null
        }
    },

    init() {
        // Cache photo quiz elements
        this.elements.photoQuiz.photo = document.getElementById('quizPhoto');
        this.elements.photoQuiz.options = document.getElementById('quizOptions');
        this.elements.photoQuiz.feedback = document.getElementById('quizFeedback');
        this.elements.photoQuiz.nextBtn = document.getElementById('quizNextBtn');
        this.elements.photoQuiz.score = document.getElementById('quizScore');

        // Cache audio quiz elements
        this.elements.audioQuiz.playBtn = document.getElementById('audioQuizPlayBtn');
        this.elements.audioQuiz.options = document.getElementById('audioQuizOptions');
        this.elements.audioQuiz.feedback = document.getElementById('audioQuizFeedback');
        this.elements.audioQuiz.nextBtn = document.getElementById('audioQuizNextBtn');
        this.elements.audioQuiz.score = document.getElementById('audioQuizScore');

        // Set up event listeners
        this.elements.photoQuiz.nextBtn.addEventListener('click', () => this.nextPhotoQuestion());
        this.elements.audioQuiz.nextBtn.addEventListener('click', () => this.nextAudioQuestion());
        this.elements.audioQuiz.playBtn.addEventListener('click', () => this.playQuizAudio());

        // Initialize audio element for quiz
        this.audio.audioElement = new Audio();
        this.audio.audioElement.addEventListener('error', () => {
            console.log('Quiz audio not available');
            // Skip to next question if audio fails
            this.elements.audioQuiz.feedback.textContent = 'Audio not available. Skipping...';
            this.elements.audioQuiz.feedback.className = 'quiz-feedback';
            setTimeout(() => this.nextAudioQuestion(), 1500);
        });
    },

    // Photo Quiz Methods
    startPhotoQuiz() {
        this.photo.score = 0;
        this.photo.total = 0;
        this.updatePhotoScore();
        this.nextPhotoQuestion();
    },

    nextPhotoQuestion() {
        // Reset state
        this.photo.answered = false;
        this.elements.photoQuiz.feedback.textContent = '';
        this.elements.photoQuiz.feedback.className = 'quiz-feedback';
        this.elements.photoQuiz.nextBtn.style.display = 'none';

        // Pick a random bird
        const randomIndex = Math.floor(Math.random() * BirdData.birds.length);
        this.photo.currentBird = BirdData.getBirdByIndex(randomIndex);

        // Get 3 random wrong answers
        const wrongAnswers = BirdData.getRandomBirds(3, this.photo.currentBird.id);

        // Combine and shuffle options
        this.photo.options = [this.photo.currentBird, ...wrongAnswers];
        this.shuffleArray(this.photo.options);

        // Update UI
        this.elements.photoQuiz.photo.src = BirdData.getRandomPhotoUrl(this.photo.currentBird);
        this.elements.photoQuiz.photo.alt = 'Identify this bird';
        this.elements.photoQuiz.photo.onerror = () => {
            // If image fails, skip to next question
            this.elements.photoQuiz.feedback.textContent = 'Image not available. Skipping...';
            setTimeout(() => this.nextPhotoQuestion(), 1000);
        };

        // Render options
        this.elements.photoQuiz.options.innerHTML = this.photo.options.map((bird, i) => `
            <button class="quiz-option" data-id="${bird.id}">
                ${bird.commonName}
            </button>
        `).join('');

        // Add click handlers
        this.elements.photoQuiz.options.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePhotoAnswer(e.target.dataset.id));
        });
    },

    async handlePhotoAnswer(selectedId) {
        if (this.photo.answered) return;
        this.photo.answered = true;
        this.photo.total++;

        const correct = selectedId === this.photo.currentBird.id;

        // Update progress tracking
        await Storage.updateQuizProgress(this.photo.currentBird.id, correct);

        // Highlight answers
        this.elements.photoQuiz.options.querySelectorAll('.quiz-option').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.id === this.photo.currentBird.id) {
                btn.classList.add('correct');
            } else if (btn.dataset.id === selectedId && !correct) {
                btn.classList.add('incorrect');
            }
        });

        // Show feedback
        if (correct) {
            this.photo.score++;
            this.elements.photoQuiz.feedback.textContent = 'Correct!';
            this.elements.photoQuiz.feedback.className = 'quiz-feedback correct';
        } else {
            this.elements.photoQuiz.feedback.textContent = `Incorrect. This is a ${this.photo.currentBird.commonName}.`;
            this.elements.photoQuiz.feedback.className = 'quiz-feedback incorrect';
        }

        this.updatePhotoScore();
        this.elements.photoQuiz.nextBtn.style.display = 'block';
    },

    updatePhotoScore() {
        this.elements.photoQuiz.score.textContent = `Score: ${this.photo.score} / ${this.photo.total}`;
    },

    // Audio Quiz Methods
    startAudioQuiz() {
        this.audio.score = 0;
        this.audio.total = 0;
        this.updateAudioScore();
        this.nextAudioQuestion();
    },

    nextAudioQuestion() {
        // Reset state
        this.audio.answered = false;
        this.elements.audioQuiz.feedback.textContent = '';
        this.elements.audioQuiz.feedback.className = 'quiz-feedback';
        this.elements.audioQuiz.nextBtn.style.display = 'none';

        // Stop any playing audio
        this.audio.audioElement.pause();
        this.audio.audioElement.currentTime = 0;

        // Pick a random bird
        const randomIndex = Math.floor(Math.random() * BirdData.birds.length);
        this.audio.currentBird = BirdData.getBirdByIndex(randomIndex);

        // Get 3 random wrong answers
        const wrongAnswers = BirdData.getRandomBirds(3, this.audio.currentBird.id);

        // Combine and shuffle options
        this.audio.options = [this.audio.currentBird, ...wrongAnswers];
        this.shuffleArray(this.audio.options);

        // Load audio
        this.audio.audioElement.src = BirdData.getAudioUrl(this.audio.currentBird);

        // Render options
        this.elements.audioQuiz.options.innerHTML = this.audio.options.map((bird, i) => `
            <button class="quiz-option" data-id="${bird.id}">
                ${bird.commonName}
            </button>
        `).join('');

        // Add click handlers
        this.elements.audioQuiz.options.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAudioAnswer(e.target.dataset.id));
        });
    },

    playQuizAudio() {
        this.audio.audioElement.play().catch(err => {
            console.log('Audio playback failed:', err);
            this.elements.audioQuiz.feedback.textContent = 'Audio not available for this bird.';
        });
    },

    async handleAudioAnswer(selectedId) {
        if (this.audio.answered) return;
        this.audio.answered = true;
        this.audio.total++;

        const correct = selectedId === this.audio.currentBird.id;

        // Update progress tracking
        await Storage.updateQuizProgress(this.audio.currentBird.id, correct);

        // Stop audio
        this.audio.audioElement.pause();

        // Highlight answers
        this.elements.audioQuiz.options.querySelectorAll('.quiz-option').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.id === this.audio.currentBird.id) {
                btn.classList.add('correct');
            } else if (btn.dataset.id === selectedId && !correct) {
                btn.classList.add('incorrect');
            }
        });

        // Show feedback
        if (correct) {
            this.audio.score++;
            this.elements.audioQuiz.feedback.textContent = 'Correct!';
            this.elements.audioQuiz.feedback.className = 'quiz-feedback correct';
        } else {
            this.elements.audioQuiz.feedback.textContent = `Incorrect. This was a ${this.audio.currentBird.commonName}.`;
            this.elements.audioQuiz.feedback.className = 'quiz-feedback incorrect';
        }

        this.updateAudioScore();
        this.elements.audioQuiz.nextBtn.style.display = 'block';
    },

    updateAudioScore() {
        this.elements.audioQuiz.score.textContent = `Score: ${this.audio.score} / ${this.audio.total}`;
    },

    // Utility
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    // Reset both quizzes
    reset() {
        this.photo.score = 0;
        this.photo.total = 0;
        this.audio.score = 0;
        this.audio.total = 0;
        this.updatePhotoScore();
        this.updateAudioScore();
    }
};
