import SaveSystem from '../../core/SaveSystem.js';

export default class Progression {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.data = this.loadData();
    }

    loadData() {
        const saved = this.saveSystem.getGameConfig('neonCity');
        return {
            level: saved.level || 1,
            xp: saved.xp || 0,
            vehicles: saved.vehicles || ['legs'], // 'legs', 'hoverboard', 'bike', 'glider'
            equippedVehicle: saved.equippedVehicle || 'legs',
            unlockedDistricts: saved.unlockedDistricts || ['core'],
            meditationTime: saved.meditationTime || 0
        };
    }

    save() {
        this.saveSystem.setGameConfig('neonCity', this.data);
    }

    addXP(amount) {
        this.data.xp += amount;
        const xpNeeded = this.data.level * 1000;
        if (this.data.xp >= xpNeeded) {
            this.data.xp -= xpNeeded;
            this.data.level++;
            // Notify UI via callback? For now just return true for level up
            this.save();
            return true;
        }
        this.save();
        return false;
    }

    unlockVehicle(vehicleId) {
        if (!this.data.vehicles.includes(vehicleId)) {
            this.data.vehicles.push(vehicleId);
            this.save();
            return true;
        }
        return false;
    }

    equipVehicle(vehicleId) {
        if (this.data.vehicles.includes(vehicleId)) {
            this.data.equippedVehicle = vehicleId;
            this.save();
            return true;
        }
        return false;
    }

    getVehicleStats(vehicleId) {
        const stats = {
            'legs': { speed: 40, name: 'Cyber-Legs', color: 0x00ffff },
            'hoverboard': { speed: 70, name: 'Neon Board', color: 0xff00ff },
            'bike': { speed: 100, name: 'Light Cycle', color: 0xffff00 },
            'glider': { speed: 140, name: 'Void Glider', color: 0xffffff }
        };
        return stats[vehicleId] || stats['legs'];
    }

    getCurrentStats() {
        return this.getVehicleStats(this.data.equippedVehicle);
    }
}
