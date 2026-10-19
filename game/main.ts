import * as Phaser from "phaser";
import { UNITS } from "../simulation/roster";
import { AGES } from "../simulation/types";
import { BattleScene } from "./BattleScene";
import { EndScene } from "./EndScene";
import { ShopScene } from "./ShopScene";
import { COLORS, FONT_CHUNKY, FONT_DISPLAY, RESOLUTION, SINGLE_IMAGE, artKey } from "./art";
import { loadSounds } from "./sound";
import { buildGhosts, load, startRun } from "./state";
import { stage, text } from "./ui";

/** Loads art, sounds and fonts, plays the bot Ghost pool, then opens the shop (resuming a saved Run if there is one). */
class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    stage(this);
    const bar = this.add.rectangle(340, 470, 0, 10, 0xea580c).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => bar.setSize(600 * p, 10));
    for (const age of AGES) this.load.image(`bg.${age}`, `art/bg.${age}.jpg`);
    const keys = new Set([...SINGLE_IMAGE, ...UNITS.flatMap((u) => (u.token ? [] : [1, 2, 3].map((stage) => artKey(u.id, stage))))]);
    for (const key of keys) this.load.image(key, `art/${key}.webp`);
    loadSounds(this);
  }

  async create(): Promise<void> {
    const bg = this.add.image(640, 360, "bg.stone");
    bg.setScale(Math.max(1280 / bg.width, 720 / bg.height));
    await Promise.all([document.fonts.load(`900 48px ${FONT_DISPLAY}`), document.fonts.load(`24px ${FONT_CHUNKY}`)]).catch(() => undefined);
    text(this, 640, 330, "Auto Evolution", 64, COLORS.text, "900", FONT_DISPLAY).setStroke("#1c1410", 8);
    text(this, 640, 400, "Gathering opponents from history…", 20, COLORS.muted);
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
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: Math.round(1280 * RESOLUTION), height: Math.round(720 * RESOLUTION) },
  // Figures are drawn smaller than their 512 px art; mipmaps keep them smooth instead of jagged.
  render: { mipmapFilter: "LINEAR_MIPMAP_LINEAR" },
  scene: [BootScene, ShopScene, BattleScene, EndScene],
});
