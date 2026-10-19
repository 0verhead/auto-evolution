import * as Phaser from "phaser";
import { AGES } from "../simulation/types";
import { latestAgeIndex } from "../simulation/units";
import { COLORS, FONT_DISPLAY } from "./art";
import { clearSave, startRun, type Saved } from "./state";
import { backdrop, button, chunky, stage, text } from "./ui";

export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  create(data: { saved: Saved }): void {
    stage(this);
    const run = data.saved.run;
    clearSave();
    const won = run.phase === "won";
    backdrop(this, AGES[latestAgeIndex(run.round)]!);
    this.add.rectangle(640, 340, 640, 330, 0x1c1410, 0.92).setStrokeStyle(3, 0x57534e);
    text(this, 640, 250, won ? "Victory in history" : "Run over", 56, won ? COLORS.gold : COLORS.text, "900", FONT_DISPLAY).setStroke("#1c1410", 6);
    chunky(this, 640, 335, `🏆 ${run.wins} wins in ${run.round} Rounds`, 32);
    button(this, 640, 440, "New Run ▶", () => this.scene.start("shop", { saved: startRun() }), true, 240, "primary");
  }
}
