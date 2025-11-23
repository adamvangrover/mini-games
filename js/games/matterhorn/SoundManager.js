export default class SoundManager {
    constructor(camera, listener) {
        this.listener = listener || new THREE.AudioListener();
        this.camera = camera;

        this.camera.add(this.listener);

        // Master sound list
        this.sounds = {};

        // Since we don't have actual assets, we'll use placeholders or try to use synth if possible,
        // but for now I will comment out the loading to prevent 404s,
        // or better, implement a simple synth fallback or check if soundManager exists globally.

        // The Hub has a global window.soundManager. We could leverage that if appropriate,
        // but this class is specific to 3D audio attached to camera.

        // Placeholder for future asset loading
        // this.loadSound("footstep", "assets/sounds/footstep.wav", 0.5, true);
    }

    loadSound(name, url, volume=1, loop=false) {
        const audioLoader = new THREE.AudioLoader();
        const sound = new THREE.Audio(this.listener);
        audioLoader.load(url, buffer => {
            sound.setBuffer(buffer);
            sound.setLoop(loop);
            sound.setVolume(volume);
            if(loop) sound.play();
        });
        this.sounds[name] = sound;
    }

    play(name) {
        const sound = this.sounds[name];
        if(sound) {
            if(sound.isPlaying) sound.stop();
            sound.play();
        } else {
            // Fallback to global sound manager for simple UI sounds
            if (window.soundManager && (name === 'click' || name === 'reward')) {
                // window.soundManager.playSound(name); // If mappings existed
            }
        }
    }

    stop(name) {
        const sound = this.sounds[name];
        if(sound) {
            sound.stop();
        }
    }
}
