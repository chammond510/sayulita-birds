// Flashcard module - handles study mode flashcard interactions

const Flashcard = {
    currentIndex: 0,
    isFlipped: false,
    touchStartX: 0,
    touchEndX: 0,

    elements: {
        card: null,
        photo: null,
        name: null,
        scientific: null,
        frequency: null,
        description: null,
        fieldMarks: null,
        habitat: null,
        audioPlayer: null,
        playBtn: null,
        prevBtn: null,
        nextBtn: null,
        progressFill: null,
        progressText: null
    },

    audio: null,
    isPlaying: false,

    init() {
        // Cache DOM elements
        this.elements.card = document.getElementById('flashcard');
        this.elements.photo = document.getElementById('birdPhoto');
        this.elements.name = document.getElementById('birdName');
        this.elements.scientific = document.getElementById('birdScientific');
        this.elements.frequency = document.getElementById('birdFrequency');
        this.elements.description = document.getElementById('birdDescription');
        this.elements.fieldMarks = document.getElementById('fieldMarks');
        this.elements.habitat = document.getElementById('birdHabitat');
        this.elements.audioPlayer = document.getElementById('audioPlayer');
        this.elements.playBtn = document.getElementById('playAudioBtn');
        this.elements.prevBtn = document.getElementById('prevBtn');
        this.elements.nextBtn = document.getElementById('nextBtn');
        this.elements.progressFill = document.getElementById('progressFill');
        this.elements.progressText = document.getElementById('progressText');

        // Set up event listeners
        this.elements.card.addEventListener('click', () => this.flip());
        this.elements.prevBtn.addEventListener('click', () => this.previous());
        this.elements.nextBtn.addEventListener('click', () => this.next());
        this.elements.playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAudio();
        });

        // Touch/swipe support
        this.elements.card.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.elements.card.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (App.currentMode !== 'study') return;

            switch (e.key) {
                case 'ArrowLeft':
                    this.previous();
                    break;
                case 'ArrowRight':
                    this.next();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.flip();
                    break;
            }
        });

        // Initialize audio element
        this.audio = new Audio();
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.elements.playBtn.classList.remove('playing');
        });
        this.audio.addEventListener('error', () => {
            console.log('Audio not available for this bird');
            this.elements.audioPlayer.innerHTML = '<span class="audio-unavailable">Audio not available</span>';
        });
    },

    handleSwipe() {
        const threshold = 50;
        const diff = this.touchEndX - this.touchStartX;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.previous();
            } else {
                this.next();
            }
        }
    },

    async showBird(index) {
        if (index < 0 || index >= BirdData.birds.length) return;

        this.currentIndex = index;
        const bird = BirdData.getBirdByIndex(index);

        // Reset flip state
        if (this.isFlipped) {
            this.elements.card.classList.remove('flipped');
            this.isFlipped = false;
        }

        // Stop any playing audio
        this.stopAudio();

        // Update photo
        this.elements.photo.src = BirdData.getPhotoUrl(bird);
        this.elements.photo.alt = bird.commonName;
        this.elements.photo.onerror = () => {
            // Show placeholder if image fails to load
            this.elements.photo.parentElement.innerHTML = `
                <div class="photo-placeholder">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,10A2,2 0 0,0 8,12A2,2 0 0,0 10,14A2,2 0 0,0 12,12A2,2 0 0,0 10,10M14,10A2,2 0 0,0 12,12A2,2 0 0,0 14,14A2,2 0 0,0 16,12A2,2 0 0,0 14,10Z"/></svg>
                    <p class="species-name">${bird.commonName}</p>
                </div>
                <div class="photo-hint">Tap to reveal</div>
            `;
        };

        // Update info
        this.elements.name.textContent = bird.commonName;
        this.elements.scientific.textContent = bird.scientificName;
        this.elements.scientific.style.display = App.settings.showScientific ? 'block' : 'none';
        this.elements.frequency.textContent = `${bird.frequency}% frequency`;
        this.elements.description.textContent = bird.description;

        // Update field marks
        if (bird.fieldMarks && bird.fieldMarks.length > 0) {
            this.elements.fieldMarks.innerHTML = `
                <h4>Field Marks</h4>
                <ul>${bird.fieldMarks.map(mark => `<li>${mark}</li>`).join('')}</ul>
            `;
        } else {
            this.elements.fieldMarks.innerHTML = '';
        }

        // Update habitat
        this.elements.habitat.innerHTML = `<strong>Habitat:</strong> ${bird.habitat}`;

        // Reset audio player
        this.elements.audioPlayer.innerHTML = `
            <button class="play-btn" id="playAudioBtn">
                <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
            </button>
            <span class="audio-label">Play call</span>
        `;
        this.elements.playBtn = document.getElementById('playAudioBtn');
        this.elements.playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAudio();
        });

        // Preload audio
        this.audio.src = BirdData.getAudioUrl(bird);

        // Update progress
        this.updateProgress();

        // Update navigation buttons
        this.elements.prevBtn.disabled = index === 0;
        this.elements.nextBtn.disabled = index === BirdData.birds.length - 1;

        // Track study progress
        await Storage.updateStudyProgress(bird.id);
    },

    flip() {
        this.isFlipped = !this.isFlipped;
        this.elements.card.classList.toggle('flipped', this.isFlipped);
    },

    previous() {
        if (this.currentIndex > 0) {
            this.showBird(this.currentIndex - 1);
        }
    },

    next() {
        if (this.currentIndex < BirdData.birds.length - 1) {
            this.showBird(this.currentIndex + 1);
        }
    },

    toggleAudio() {
        if (this.isPlaying) {
            this.stopAudio();
        } else {
            this.playAudio();
        }
    },

    playAudio() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.elements.playBtn.classList.add('playing');
        }).catch(err => {
            console.log('Audio playback failed:', err);
            this.elements.audioPlayer.innerHTML = '<span class="audio-unavailable">Audio not available</span>';
        });
    },

    stopAudio() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        if (this.elements.playBtn) {
            this.elements.playBtn.classList.remove('playing');
        }
    },

    updateProgress() {
        const current = this.currentIndex + 1;
        const total = BirdData.birds.length;
        const percent = (current / total) * 100;

        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${current} / ${total}`;
    },

    reset() {
        this.currentIndex = 0;
        this.showBird(0);
    }
};
