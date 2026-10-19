// Plays back a battle from the simulation's event list (ADR 0004: the renderer never decides anything).
import * as Phaser from "phaser";
import type { BattleEvent, Outcome, UnitView } from "../simulation/battle";
import { COLORS } from "./art";
import { play } from "./sound";
import type { Saved } from "./state";
import { UnitCard, button, floater, text } from "./ui";

const FRONT_X: [number, number] = [570, 710];
const SPACING = 122;
const ROW_Y = 330;
const OUTCOME_SOUND = { win: "victory", loss: "defeat", draw: "draw" } as const;

interface Shown {
  card: UnitCard;
  side: 0 | 1;
  view: UnitView;
}

export class BattleScene extends Phaser.Scene {
  private saved!: Saved;
  private battleEvents: BattleEvent[] = [];
  private outcome!: Outcome;
  private round = 0;
  private shown = new Map<number, Shown>();
  private order: [number[], number[]] = [[], []];
  private step = 0;
  private speed = 1;
  private banner!: Phaser.GameObjects.Text;
  private resultShown = false;

  constructor() {
    super("battle");
  }

  init(data: { saved: Saved; events: BattleEvent[]; outcome: Outcome; round: number }): void {
    this.saved = data.saved;
    this.battleEvents = data.events;
    this.outcome = data.outcome;
    this.round = data.round;
    this.resultShown = false;
    this.shown = new Map();
    this.order = [[], []];
    this.step = 0;
    this.speed = 1;
  }

  create(): void {
    text(this, 640, 40, `Round ${this.round} — battle`, 26, COLORS.text, "800");
    text(this, 330, 110, "You", 20, COLORS.muted);
    text(this, 950, 110, "Ghost", 20, COLORS.muted);
    this.banner = text(this, 640, 170, "", 18, COLORS.text, "600").setWordWrapWidth(900).setAlign("center");
    button(this, 1040, 672, "Faster ▶▶", () => (this.speed = this.speed === 1 ? 3 : 1), true, 170);
    button(this, 1200, 672, "Skip", () => this.finish(), true, 120);
    this.next();
  }

  private next(): void {
    const event = this.battleEvents[this.step++];
    if (!event) return;
    const duration = this.play(event);
    if (event.type === "end") return this.showResult();
    this.time.delayedCall(duration / this.speed, () => this.next());
  }

  /** Shows one event and returns how long to wait before the next. */
  private play(e: BattleEvent): number {
    switch (e.type) {
      case "start":
        e.sides.forEach((units, side) => units.forEach((u) => this.place(u, side as 0 | 1, this.order[side]!.length)));
        return 500;
      case "ability": {
        const s = this.shown.get(e.unit);
        this.banner.setText(`${e.label.slice(1).replace(/\(.*\)$/, "")}: ${e.text}`);
        play(this, "ability");
        if (s) this.tweens.add({ targets: s.card, scale: 1.15, yoyo: true, duration: 160 / this.speed });
        return 450;
      }
      case "attack": {
        this.banner.setText("");
        play(this, "attack");
        for (const [id, dir] of [[e.attacker, 1], [e.target, -1]] as const) {
          const s = this.shown.get(id);
          if (s) this.tweens.add({ targets: s.card, x: s.card.x + 36 * dir, yoyo: true, duration: 130 / this.speed });
        }
        return 320;
      }
      case "hurt": {
        const s = this.shown.get(e.unit);
        if (!s) return 0;
        s.view = { ...s.view, health: e.health, armor: e.armor };
        s.card.setStats(s.view.attack, s.view.health, s.view.armor);
        floater(this, s.card.x, s.card.y - 60, e.absorbed ? `-${e.damage - e.absorbed} (🛡${e.absorbed})` : `-${e.damage}`, COLORS.health);
        if (e.absorbed) play(this, "block");
        return 220;
      }
      case "armor":
      case "buff": {
        const s = this.shown.get(e.unit);
        if (!s) return 0;
        if (e.type === "armor") {
          s.view = { ...s.view, armor: e.armor };
          floater(this, s.card.x, s.card.y - 60, `+${e.amount}🛡`, COLORS.armor);
          play(this, "armor");
        } else {
          s.view = { ...e.view };
          floater(this, s.card.x, s.card.y - 60, `+${e.attack}/+${e.health}`, COLORS.good);
          play(this, "buff");
        }
        s.card.setStats(s.view.attack, s.view.health, s.view.armor);
        return 260;
      }
      case "copy": {
        const s = this.shown.get(e.unit);
        if (s) floater(this, s.card.x, s.card.y - 60, `copies ${e.copied}`, COLORS.armor);
        return 300;
      }
      case "faint": {
        const s = this.shown.get(e.unit);
        if (!s) return 0;
        this.shown.delete(e.unit);
        play(this, "faint");
        this.order[s.side] = this.order[s.side]!.filter((id) => id !== e.unit);
        this.tweens.add({ targets: s.card, alpha: 0, y: s.card.y + 40, duration: 260 / this.speed, onComplete: () => s.card.destroy() });
        this.layout(s.side);
        return 360;
      }
      case "summon": {
        this.place(e.view, e.side, e.at);
        play(this, "summon");
        const s = this.shown.get(e.unit)!;
        s.card.setScale(0);
        this.tweens.add({ targets: s.card, scale: 1, duration: 220 / this.speed });
        return 360;
      }
      case "end":
        return 0;
    }
  }

  private place(view: UnitView, side: 0 | 1, at: number): void {
    const card = new UnitCard(this, this.slotX(side, at), ROW_Y, { def: view.def, stage: view.stage, attack: view.attack, health: view.health, armor: view.armor, width: 112, height: 150 });
    this.shown.set(view.id, { card, side, view });
    this.order[side]!.splice(at, 0, view.id);
    this.layout(side);
  }

  private layout(side: 0 | 1): void {
    this.order[side]!.forEach((id, i) => {
      const s = this.shown.get(id);
      if (s) this.tweens.add({ targets: s.card, x: this.slotX(side, i), duration: 220 / this.speed });
    });
  }

  private slotX(side: 0 | 1, index: number): number {
    return side === 0 ? FRONT_X[0] - index * SPACING : FRONT_X[1] + index * SPACING;
  }

  /** Jumps to the end: the result is already decided by the simulation. */
  private finish(): void {
    this.time.removeAllEvents();
    this.showResult();
  }

  private showResult(): void {
    if (this.resultShown) return;
    this.resultShown = true;
    const run = this.saved.run;
    play(this, OUTCOME_SOUND[this.outcome]);
    const title = { win: "Victory!", loss: "Defeat", draw: "Draw" }[this.outcome];
    const color = { win: COLORS.good, loss: COLORS.health, draw: COLORS.muted }[this.outcome];
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55).setDepth(80);
    this.add.rectangle(640, 380, 520, 300, COLORS.panel, 0.97).setStrokeStyle(2, 0x57534e).setDepth(80);
    text(this, 640, 300, title, 64, color, "900").setDepth(81);
    text(this, 640, 380, `❤ ${run.lives}   🏆 ${run.wins}/10`, 30, COLORS.text, "800").setDepth(81);
    const done = run.phase !== "shop";
    button(
      this,
      640,
      470,
      done ? "See the result" : "Back to the shop",
      () => (done ? this.scene.start("end", { saved: this.saved }) : this.scene.start("shop", { saved: this.saved })),
      true,
      260,
    ).setDepth(81);
  }
}
