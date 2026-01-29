// Storage module - IndexedDB wrapper for progress tracking and settings

const Storage = {
    dbName: 'sayulita-birds',
    dbVersion: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Progress store - tracks study/quiz progress per bird
                if (!db.objectStoreNames.contains('progress')) {
                    const progressStore = db.createObjectStore('progress', { keyPath: 'birdId' });
                    progressStore.createIndex('lastStudied', 'lastStudied', { unique: false });
                    progressStore.createIndex('confidenceLevel', 'confidenceLevel', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },

    // Progress methods
    async getProgress(birdId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readonly');
            const store = transaction.objectStore('progress');
            const request = store.get(birdId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result || this.getDefaultProgress(birdId));
            };
        });
    },

    async getAllProgress() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readonly');
            const store = transaction.objectStore('progress');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    },

    async saveProgress(progress) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readwrite');
            const store = transaction.objectStore('progress');
            const request = store.put(progress);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async updateStudyProgress(birdId) {
        const progress = await this.getProgress(birdId);
        progress.timesStudied++;
        progress.lastStudied = new Date().toISOString();
        await this.saveProgress(progress);
        return progress;
    },

    async updateQuizProgress(birdId, correct) {
        const progress = await this.getProgress(birdId);
        if (correct) {
            progress.timesCorrectQuiz++;
        } else {
            progress.timesIncorrectQuiz++;
        }
        progress.lastStudied = new Date().toISOString();

        // Update confidence level based on quiz performance
        const total = progress.timesCorrectQuiz + progress.timesIncorrectQuiz;
        if (total >= 3) {
            const accuracy = progress.timesCorrectQuiz / total;
            if (accuracy >= 0.8) {
                progress.confidenceLevel = 'high';
            } else if (accuracy >= 0.5) {
                progress.confidenceLevel = 'medium';
            } else {
                progress.confidenceLevel = 'low';
            }
        }

        await this.saveProgress(progress);
        return progress;
    },

    getDefaultProgress(birdId) {
        return {
            birdId,
            timesStudied: 0,
            timesCorrectQuiz: 0,
            timesIncorrectQuiz: 0,
            lastStudied: null,
            confidenceLevel: 'low',
            notes: ''
        };
    },

    // Settings methods
    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : defaultValue);
            };
        });
    },

    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    },

    async getAllSettings() {
        const defaults = {
            theme: 'light',
            showScientific: true,
            sortBy: 'frequency'
        };

        const settings = {};
        for (const [key, defaultValue] of Object.entries(defaults)) {
            settings[key] = await this.getSetting(key, defaultValue);
        }
        return settings;
    },

    async saveAllSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            await this.saveSetting(key, value);
        }
    }
};
