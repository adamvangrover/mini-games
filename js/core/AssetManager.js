export default class AssetManager {
    constructor() {
        if (AssetManager.instance) return AssetManager.instance;
        this.assets = new Map();
        AssetManager.instance = this;
    }

    static getInstance() {
        return AssetManager.instance || new AssetManager();
    }

    async loadImages(images) {
        // images: { key: url, ... }
        const promises = Object.entries(images).map(([key, url]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    this.assets.set(key, img);
                    resolve(img);
                };
                img.onerror = reject;
            });
        });
        return Promise.all(promises);
    }

    get(key) {
        return this.assets.get(key);
    }
}
