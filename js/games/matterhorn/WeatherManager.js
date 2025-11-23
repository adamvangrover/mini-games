export default class WeatherManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        this.currentWeather = "clear"; // "clear", "snow", "storm", "fog"
        this.season = "winter"; // "winter", "spring", "summer", "autumn"

        this.snowParticles = null;
        this.fog = null;

        this.initWeatherEffects();
    }

    initWeatherEffects() {
        // Snow particle system
        const snowGeometry = new THREE.BufferGeometry();
        const snowCount = 10000;
        const positions = new Float32Array(snowCount * 3);
        for(let i = 0; i < snowCount * 3; i++) {
            positions[i] = Math.random() * 1000 - 500; // spread in x,z
            positions[i+1] = Math.random() * 500; // height
            positions[i+2] = Math.random() * 1000 - 500;
        }
        snowGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const snowMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, transparent: true, opacity: 0.8 });
        this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
        this.snowParticles.visible = false;
        this.scene.add(this.snowParticles);
    }

    // Change season
    setSeason(season) {
        this.season = season;
        switch(season) {
            case "winter":
                this.currentWeather = "snow";
                break;
            case "spring":
                this.currentWeather = "clear";
                break;
            case "summer":
                this.currentWeather = "clear";
                break;
            case "autumn":
                this.currentWeather = "clear";
                break;
        }
        this.updateWeatherEffects();
    }

    // Change weather type
    setWeather(weather) {
        this.currentWeather = weather;
        this.updateWeatherEffects();
    }

    updateWeatherEffects() {
        if(this.currentWeather === "snow") {
            this.snowParticles.visible = true;
            this.scene.fog = new THREE.FogExp2(0xffffff, 0.002);
        } else if(this.currentWeather === "storm") {
            this.snowParticles.visible = true;
            this.scene.fog = new THREE.FogExp2(0x999999, 0.01);
        } else if(this.currentWeather === "fog") {
            this.snowParticles.visible = false;
            this.scene.fog = new THREE.FogExp2(0xcccccc, 0.01);
        } else {
            this.snowParticles.visible = false;
            this.scene.fog = null;
        }
    }

    update(delta) {
        // Animate snow
        if(this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            for(let i = 1; i < positions.length; i += 3) {
                positions[i] -= 20 * delta; // fall speed
                if(positions[i] < 0) positions[i] = 500;
            }
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
