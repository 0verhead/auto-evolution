import * as Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { EndScene } from "./EndScene";
import { ShopScene } from "./ShopScene";
import { COLORS } from "./art";
import { buildGhosts, load, startRun } from "./state";
import { text } from "./ui";

/** Shows a loading line while the bot Ghost pool is played, then opens the shop (resuming a saved Run if there is one). */
class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    text(this, 640, 360, "Auto Evolution", 48, COLORS.text, "900");
    text(this, 640, 420, "Gathering opponents from history…", 20, COLORS.muted);
    this.time.delayedCall(50, () => {
      buildGhosts(20261019);
      this.scene.start("shop", { saved: load() ?? startRun() });
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: COLORS.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  scene: [BootScene, ShopScene, BattleScene, EndScene],
});
