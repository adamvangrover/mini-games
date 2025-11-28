export default class AssetManager {
    constructor() {
        this.assets = new Map();
        this.loading = false;
        this.progress = 0;
    }

    async loadAssets(assetList) {
        this.loading = true;
        this.progress = 0;
        const total = assetList.length;
        let loaded = 0;

        const promises = assetList.map(async (asset) => {
            try {
                const result = await this.loadSingleAsset(asset);
                this.assets.set(asset.id, result);
            } catch (e) {
                console.error(`Failed to load asset: ${asset.id}`, e);
            } finally {
                loaded++;
                this.progress = loaded / total;
                // Emit progress event if needed
            }
        });

        await Promise.all(promises);
        this.loading = false;
    }

    async loadSingleAsset(asset) {
        // Handle images, audio, JSON, etc.
        if (asset.type === 'image') {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = asset.src;
            });
        }
        // Basic implementation for now
        return null;
    }

    get(id) {
        return this.assets.get(id);
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
