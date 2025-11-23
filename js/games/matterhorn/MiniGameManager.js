import ChocolateGame from "./minigames/Chocolate.js";
import FondueGame from "./minigames/Fondue.js";
import PhotoGame from "./minigames/Photo.js";

export default class MiniGameManager {
    constructor(scene, player, camera, wildlifeManager) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.wildlifeManager = wildlifeManager;

        this.activeGames = [];
        this.shopItems = [
            { name: "Magic Snowboard", price: 100, effect: () => this.player.speed += 2 },
            { name: "Glowing Lantern", price: 50, effect: () => this.player.lightPower += 1 },
            { name: "Warm Coat", price: 75, effect: () => this.player.stamina += 20 },
        ];
    }

    startChocolateGame(onFinish) {
        new ChocolateGame(onFinish);
    }

    startFondueGame(onFinish) {
        new FondueGame(onFinish);
    }

    startPhotoGame(onFinish) {
        new PhotoGame(this.scene, this.camera, this.wildlifeManager, onFinish);
    }

    openShop(onFinish) {
        // Simple prompt-based shop for now, can be upgraded to UI later
        // Wait a frame to prevent key leaking into prompt
        setTimeout(() => {
            let message = `Welcome to the shop! You have some coins.\n`; // Need to link state money
            this.shopItems.forEach((item, i) => {
                message += `${i + 1}: ${item.name} - ${item.price} coins\n`;
            });
            message += "Enter the item number to buy:";

            // Note: Prompt blocks execution, which pauses game implicitly in single-threaded JS,
            // but better to implement a proper overlay. For MVP as per instructions:
            const choice = prompt(message);
            if (choice) {
                 const index = parseInt(choice) - 1;
                 if(this.shopItems[index]) {
                     // Deduct money logic should be here
                     this.shopItems[index].effect();
                     onFinish(`You bought ${this.shopItems[index].name}!`);
                     return;
                 }
            }
            onFinish("Come back soon!");
        }, 10);
    }

    update() {
        // Could add timers, game progress tracking, or cooldowns here
    }
}
