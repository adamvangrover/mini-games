export default class AssetManager {
    constructor() {
        this.images = {};
        this.audio = {};
    }

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    getImage(key) {
        return this.images[key];
    }
}
