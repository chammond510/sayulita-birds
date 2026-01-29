// Main App module - orchestrates all components

const App = {
    currentMode: 'study',
    settings: {
        theme: 'light',
        showScientific: true,
        sortBy: 'frequency'
    },
    isOffline: false,

    async init() {
        try {
            // Show loading overlay
            document.getElementById('loadingOverlay').classList.add('active');

            // Initialize storage
            await Storage.init();
            console.log('Storage initialized');

            // Load settings
            this.settings = await Storage.getAllSettings();
            this.applySettings();

            // Load bird data
            await BirdData.load();

            // Sort birds according to settings
            BirdData.sortBy(this.settings.sortBy);

            // Initialize modules
            Flashcard.init();
            Quiz.init();

            // Show first bird
            Flashcard.showBird(0);

            // Set up event listeners
            this.setupEventListeners();

            // Check online status
            this.setupOfflineDetection();

            // Register service worker
            this.registerServiceWorker();

            // Hide loading overlay
            document.getElementById('loadingOverlay').classList.remove('active');

            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            document.getElementById('loadingOverlay').innerHTML = `
                <p style="color: red;">Failed to load app. Please refresh the page.</p>
                <p style="font-size: 0.875rem;">${error.message}</p>
            `;
        }
    },

    setupEventListeners() {
        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // Shuffle button
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            BirdData.shuffle();
            Flashcard.reset();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        // Close settings
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        // Settings modal backdrop click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });

        // Theme select
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applySettings();
            Storage.saveAllSettings(this.settings);
        });

        // Scientific names toggle
        document.getElementById('showScientific').addEventListener('change', (e) => {
            this.settings.showScientific = e.target.checked;
            this.applySettings();
            Storage.saveAllSettings(this.settings);
            // Update current card
            const scientificEl = document.getElementById('birdScientific');
            if (scientificEl) {
                scientificEl.style.display = this.settings.showScientific ? 'block' : 'none';
            }
        });

        // Sort select
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.settings.sortBy = e.target.value;
            BirdData.sortBy(this.settings.sortBy);
            Flashcard.reset();
            Storage.saveAllSettings(this.settings);
        });

        // Download for offline button in settings
        document.getElementById('downloadOfflineBtn').addEventListener('click', () => {
            this.closeSettings();
            this.checkOfflineStatus(true);
        });

        // Download modal buttons
        document.getElementById('startDownloadBtn').addEventListener('click', () => {
            this.startMediaDownload();
        });
        document.getElementById('closeDownloadBtn').addEventListener('click', () => {
            document.getElementById('downloadModal').classList.remove('active');
        });
        // Close download modal on backdrop click
        document.getElementById('downloadModal').addEventListener('click', (e) => {
            if (e.target.id === 'downloadModal') {
                document.getElementById('downloadModal').classList.remove('active');
            }
        });
    },

    switchMode(mode) {
        this.currentMode = mode;

        // Update tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Update sections
        document.querySelectorAll('.mode-section').forEach(section => {
            section.classList.remove('active');
        });

        switch (mode) {
            case 'study':
                document.getElementById('studyMode').classList.add('active');
                // Stop quiz audio if playing
                if (Quiz.audio.audioElement) {
                    Quiz.audio.audioElement.pause();
                }
                break;
            case 'photo-quiz':
                document.getElementById('photoQuizMode').classList.add('active');
                // Stop flashcard audio
                Flashcard.stopAudio();
                // Start quiz if first time
                if (Quiz.photo.total === 0) {
                    Quiz.startPhotoQuiz();
                }
                break;
            case 'audio-quiz':
                document.getElementById('audioQuizMode').classList.add('active');
                // Stop flashcard audio
                Flashcard.stopAudio();
                // Start quiz if first time
                if (Quiz.audio.total === 0) {
                    Quiz.startAudioQuiz();
                }
                break;
        }

        // Update progress bar visibility based on mode
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.style.display = mode === 'study' ? 'flex' : 'none';
    },

    applySettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.settings.theme);

        // Update settings UI
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('showScientific').checked = this.settings.showScientific;
        document.getElementById('sortSelect').value = this.settings.sortBy;
    },

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    },

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    },

    setupOfflineDetection() {
        const indicator = document.getElementById('offlineIndicator');

        const updateOnlineStatus = () => {
            this.isOffline = !navigator.onLine;
            indicator.classList.toggle('visible', this.isOffline);
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    },

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered:', registration.scope);

                // Wait for service worker to be ready before checking cache
                await navigator.serviceWorker.ready;
                this.checkOfflineStatus();
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    },

    async checkOfflineStatus(forceShow) {
        const modal = document.getElementById('downloadModal');
        const info = document.getElementById('downloadInfo');
        const startBtn = document.getElementById('startDownloadBtn');

        // Check if we've already downloaded (stored flag in localStorage)
        const alreadyDownloaded = localStorage.getItem('mediaDownloaded') === 'true';

        if (alreadyDownloaded && !forceShow) {
            return;
        }

        if (alreadyDownloaded && forceShow) {
            info.textContent = 'All media has been downloaded! You can use this app offline.';
            startBtn.style.display = 'none';
            document.getElementById('closeDownloadBtn').textContent = 'Done';
            modal.classList.add('active');
            return;
        }

        // Not yet downloaded — show download modal
        this.showDownloadModal();
    },

    showDownloadModal() {
        const modal = document.getElementById('downloadModal');
        const info = document.getElementById('downloadInfo');
        const startBtn = document.getElementById('startDownloadBtn');
        const progressContainer = document.getElementById('downloadProgressContainer');

        const birds = BirdData.getAllBirds();
        const totalFiles = birds.length * 2; // images + audio

        // Reset modal state
        info.textContent = `Download all ${totalFiles} photos and audio files for offline use (~17MB).`;
        startBtn.style.display = '';
        startBtn.disabled = false;
        startBtn.textContent = 'Download All Media';
        progressContainer.style.display = 'none';
        document.getElementById('closeDownloadBtn').textContent = 'Later';

        modal.classList.add('active');
    },

    async startMediaDownload() {
        const progressContainer = document.getElementById('downloadProgressContainer');
        const progressFill = document.getElementById('downloadProgressFill');
        const statusText = document.getElementById('downloadStatus');
        const startBtn = document.getElementById('startDownloadBtn');

        startBtn.disabled = true;
        startBtn.textContent = 'Downloading...';
        progressContainer.style.display = 'block';

        const birds = BirdData.getAllBirds();
        const files = [];

        birds.forEach(bird => {
            files.push(`assets/images/birds/${bird.id}.jpg`);
            files.push(`assets/audio/calls/${bird.id}.mp3`);
        });

        let downloaded = 0;
        let failed = 0;
        const total = files.length;
        const useCache = 'caches' in window;
        let cache = null;

        // If Cache API is available (localhost/HTTPS), use it for reliable offline
        if (useCache) {
            try {
                cache = await caches.open('sayulita-birds-v4');
            } catch (e) {
                cache = null;
            }
        }

        // Download in batches of 3 to avoid overwhelming the connection
        for (let i = 0; i < files.length; i += 3) {
            const batch = files.slice(i, i + 3);
            const results = await Promise.allSettled(batch.map(async (file) => {
                const response = await fetch(file);
                if (response.ok) {
                    if (cache) {
                        // Store in Cache API for true offline support
                        await cache.put(file, response);
                    } else {
                        // Just read the body to warm browser HTTP cache
                        await response.blob();
                    }
                    return true;
                }
                return false;
            }));

            results.forEach(r => {
                if (r.status === 'fulfilled' && r.value) {
                    downloaded++;
                } else {
                    failed++;
                }
            });

            const progress = ((downloaded + failed) / total) * 100;
            progressFill.style.width = progress + '%';
            statusText.textContent = `Downloaded ${downloaded} of ${total} files${failed > 0 ? ` (${failed} unavailable)` : ''}`;
        }

        // Mark as downloaded
        localStorage.setItem('mediaDownloaded', 'true');

        progressFill.style.width = '100%';
        progressFill.style.background = '#4caf50';
        statusText.textContent = `Done! ${downloaded} files cached.${failed > 0 ? ` ${failed} files unavailable.` : ''}`;
        startBtn.style.display = 'none';
        document.getElementById('closeDownloadBtn').textContent = 'Done';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
