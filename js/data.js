// Data module - loads and manages bird data

const BirdData = {
    birds: [],
    loaded: false,

    async load() {
        try {
            const response = await fetch('data/birds.json');
            const data = await response.json();
            this.birds = data.birds;
            this.loaded = true;
            console.log(`Loaded ${this.birds.length} birds`);
            return this.birds;
        } catch (error) {
            console.error('Failed to load bird data:', error);
            throw error;
        }
    },

    getAllBirds() {
        return this.birds;
    },

    getBird(id) {
        return this.birds.find(bird => bird.id === id);
    },

    getBirdByIndex(index) {
        return this.birds[index];
    },

    getBirdByRank(rank) {
        return this.birds.find(bird => bird.rank === rank);
    },

    sortBy(method) {
        switch (method) {
            case 'frequency':
                this.birds.sort((a, b) => b.frequency - a.frequency);
                break;
            case 'alphabetical':
                this.birds.sort((a, b) => a.commonName.localeCompare(b.commonName));
                break;
            case 'random':
                this.shuffle();
                break;
        }
    },

    shuffle() {
        for (let i = this.birds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.birds[i], this.birds[j]] = [this.birds[j], this.birds[i]];
        }
    },

    getRandomBirds(count, excludeId = null) {
        const available = this.birds.filter(b => b.id !== excludeId);
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    },

    // Get primary photo URL
    getPhotoUrl(bird) {
        return `assets/images/birds/${bird.id}.jpg`;
    },

    // Get all photo URLs for a bird
    getPhotoUrls(bird) {
        const count = bird.photoCount || 1;
        const urls = [`assets/images/birds/${bird.id}.jpg`];
        for (let i = 2; i <= count; i++) {
            urls.push(`assets/images/birds/${bird.id}-${i}.jpg`);
        }
        return urls;
    },

    // Get a random photo URL (for quiz variety)
    getRandomPhotoUrl(bird) {
        const urls = this.getPhotoUrls(bird);
        return urls[Math.floor(Math.random() * urls.length)];
    },

    // Generate Wikimedia Commons search URL for fallback
    getWikimediaSearchUrl(bird) {
        const searchTerm = encodeURIComponent(bird.commonName.replace(/ /g, '_'));
        return `https://commons.wikimedia.org/wiki/Special:Search?search=${searchTerm}&title=Special:MediaSearch&type=image`;
    },

    // Generate Xeno-canto URL for bird calls
    getXenoCantoUrl(bird) {
        const searchTerm = encodeURIComponent(bird.scientificName);
        return `https://xeno-canto.org/explore?query=${searchTerm}`;
    },

    // Get audio file path
    getAudioUrl(bird) {
        return `assets/audio/calls/${bird.id}.mp3`;
    },

    // Get eBird species page URL
    getEbirdUrl(bird) {
        // eBird uses species codes, but we can search by scientific name
        const searchTerm = encodeURIComponent(bird.scientificName);
        return `https://ebird.org/species/${bird.id.replace(/-/g, '')}`;
    },

    // Get All About Birds URL
    getAllAboutBirdsUrl(bird) {
        const urlName = bird.commonName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `https://www.allaboutbirds.org/guide/${urlName}`;
    }
};
