import CoreSoundManager from "../../core/SoundManager.js";

export default class SoundManager {
    constructor(camera) {
        this.core = CoreSoundManager.getInstance();
        this.camera = camera;
        // In a real implementation, we would create AudioListener and PositionalAudio here
        // For now, we wrap the core manager
    }

    playSound(id) {
        this.core.playSound(id);
    }
}
