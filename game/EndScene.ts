import * as Phaser from "phaser";
import { COLORS } from "./art";
import { clearSave, startRun, type Saved } from "./state";
import { button, text } from "./ui";

export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  create(data: { saved: Saved }): void {
    const run = data.saved.run;
    clearSave();
    const won = run.phase === "won";
    text(this, 640, 240, won ? "You won the Run! 🏆" : "Run over", 60, won ? COLORS.gold : COLORS.text, "900");
    text(this, 640, 330, `${run.wins} wins in ${run.round} Rounds`, 28, COLORS.muted, "700");
    button(this, 640, 440, "New Run", () => this.scene.start("shop", { saved: startRun() }), true, 220);
  }
}
