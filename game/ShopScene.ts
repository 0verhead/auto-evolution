import * as Phaser from "phaser";
import { inventionDef, unitDef } from "../simulation/roster";
import { act, resolveBattle, REROLL_PRICE, type Action } from "../simulation/run";
import { AGE_NAMES, AGES, LINE_SIZE } from "../simulation/types";
import { MAX_EXP, latestAgeIndex, stageOf } from "../simulation/units";
import { COLORS, FONT } from "./art";
import { ghostFor, save, type Saved } from "./state";
import { UnitCard, button, inventionCard, text, toast } from "./ui";

type Selection = { kind: "shopUnit" | "shopInvention" | "line"; index: number };

/** Slot 1 (the front) is on the right, facing the enemy. */
const SLOT_X = [1010, 850, 690, 530, 370];
const LINE_Y = 235;
const SHOP_Y = 548;
const SLOT_W = 140;
const SLOT_H = 180;

export class ShopScene extends Phaser.Scene {
  private saved!: Saved;
  private selected: Selection | null = null;
  private hovered: Selection | null = null;
  private layer!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;
  /** A release that ends a drag must not also count as a tap. */
  private dragging = false;
  private justDragged = false;

  constructor() {
    super("shop");
  }

  init(data: { saved: Saved }): void {
    this.saved = data.saved;
    this.selected = null;
  }

  create(): void {
    this.input.dragDistanceThreshold = 8;
    this.input.on("pointerdown", () => (this.justDragged = false));
    this.layer = this.add.container(0, 0);
    this.render();
    const round = this.saved.run.round;
    if (round > 1 && round % 2 === 1 && round <= 9) toast(this, `Eureka! The ${AGE_NAMES[AGES[latestAgeIndex(round)]!]} Age begins`, 150);
  }

  private get run() {
    return this.saved.run;
  }

  private render(): void {
    this.layer.removeAll(true);
    const run = this.run;
    const age = AGES[latestAgeIndex(run.round)]!;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.layer.add(o), o);

    add(text(this, 140, 36, `Round ${run.round}`, 26, COLORS.text, "800"));
    add(text(this, 330, 36, `${AGE_NAMES[age]} Age`, 20, COLORS.muted));
    add(text(this, 900, 36, `💰 ${run.gold}`, 26, COLORS.gold, "800"));
    add(text(this, 1040, 36, `❤ ${run.lives}`, 26, COLORS.health, "800"));
    add(text(this, 1170, 36, `🏆 ${run.wins}/10`, 26, COLORS.text, "800"));
    add(text(this, 690, 96, "Your Line", 18, COLORS.muted));
    add(text(this, 1150, LINE_Y, "front ▶", 18, COLORS.muted));

    for (let slot = 0; slot < LINE_SIZE; slot++) {
      const zone = add(this.add.rectangle(SLOT_X[slot]!, LINE_Y, SLOT_W, SLOT_H, 0x000000, 0.25).setStrokeStyle(2, 0x44403c));
      zone.setInteractive().on("pointerup", () => !this.dragging && !this.justDragged && this.onSlot(slot, "tap"));
      const unit = run.line[slot];
      if (!unit) continue;
      const card = add(
        new UnitCard(this, SLOT_X[slot]!, LINE_Y, {
          def: unit.def,
          stage: stageOf(unit.exp),
          attack: unit.attack + unit.tempAttack,
          health: unit.health + unit.tempHealth,
          exp: unit.exp,
          selected: this.isSelected("line", slot),
        }),
      );
      this.makeDraggable(card, { kind: "line", index: slot });
    }

    add(text(this, 90, 448, "Shop", 18, COLORS.muted));
    let x = 110;
    run.shopUnits.forEach((offer, index) => {
      const card = add(
        new UnitCard(this, x, SHOP_Y, {
          def: offer.def,
          stage: 1,
          attack: offer.attack,
          health: offer.health,
          price: offer.price,
          frozen: offer.frozen,
          selected: this.isSelected("shopUnit", index),
          width: 118,
          height: 150,
        }),
      );
      this.makeDraggable(card, { kind: "shopUnit", index });
      x += 132;
    });
    x += 20;
    run.shopInventions.forEach((offer, index) => {
      const card = add(inventionCard(this, x, SHOP_Y, offer.def, offer.price, offer.frozen, this.isSelected("shopInvention", index)));
      this.makeDraggable(card, { kind: "shopInvention", index });
      x += 124;
    });

    this.info = add(
      this.add.text(640, 390, "", { fontFamily: FONT, fontSize: "17px", color: COLORS.text, align: "center", wordWrap: { width: 1100 } }).setOrigin(0.5),
    );
    this.updateInfo();

    const sel = this.selected;
    add(button(this, 110, 672, `Reroll (${REROLL_PRICE})`, () => this.perform({ type: "reroll" }), run.gold >= REROLL_PRICE));
    add(
      button(
        this,
        280,
        672,
        "Freeze",
        () => sel && sel.kind !== "line" && this.perform({ type: "freeze", kind: sel.kind === "shopUnit" ? "unit" : "invention", shop: sel.index }, true),
        sel !== null && sel.kind !== "line",
      ),
    );
    add(button(this, 450, 672, "Sell", () => sel?.kind === "line" && this.perform({ type: "sell", slot: sel.index }), sel?.kind === "line"));
    add(button(this, 1140, 672, "End turn ⚔", () => this.endTurn(), true, 200));
  }

  private isSelected(kind: Selection["kind"], index: number): boolean {
    return this.selected?.kind === kind && this.selected.index === index;
  }

  private makeDraggable(card: Phaser.GameObjects.Container, source: Selection): void {
    card.setInteractive({ useHandCursor: true, draggable: true });
    const home = { x: card.x, y: card.y };
    card.on("pointerover", () => ((this.hovered = source), this.updateInfo()));
    card.on("pointerout", () => ((this.hovered = null), this.updateInfo()));
    card.on("pointerup", () => {
      if (this.dragging || this.justDragged) return;
      if (source.kind === "line" && this.selected && !this.isSelected("line", source.index)) return this.onSlot(source.index, "tap");
      this.selected = this.isSelected(source.kind, source.index) ? null : source;
      this.render();
    });
    card.on("dragstart", () => {
      this.dragging = true;
      this.selected = source;
      this.layer.bringToTop(card);
    });
    card.on("drag", (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => card.setPosition(dragX, dragY));
    card.on("dragend", (pointer: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.justDragged = true;
      const slot = SLOT_X.findIndex((sx) => Math.abs(pointer.x - sx) < SLOT_W / 2 && Math.abs(pointer.y - LINE_Y) < SLOT_H / 2);
      card.setPosition(home.x, home.y);
      if (slot >= 0) this.onSlot(slot, "drop");
      else this.render();
    });
  }

  /** A tap or drop on a Line slot with whatever is selected. Tapping a Unit that can't take the selection selects it instead. */
  private onSlot(slot: number, via: "tap" | "drop"): void {
    const run = this.run;
    const sel = this.selected;
    const target = run.line[slot];
    if (!sel) {
      if (target) this.selected = { kind: "line", index: slot };
      return this.render();
    }
    if (sel.kind === "shopUnit") {
      const offer = run.shopUnits[sel.index]!;
      if (target && target.def !== offer.def) return via === "tap" ? this.select(slot) : this.fail("That slot holds a different Unit");
      if (offer.price > run.gold) return this.fail("Not enough gold");
      if (target && target.exp >= MAX_EXP) return this.fail(`${unitDef(target.def).names[2]} is fully evolved`);
      return this.perform({ type: "buy", shop: sel.index, slot });
    }
    if (sel.kind === "shopInvention") {
      const offer = run.shopInventions[sel.index]!;
      if (offer.price > run.gold) return this.fail("Not enough gold");
      const def = inventionDef(offer.def);
      if (def.targeted && !target) return this.fail(`Use ${def.name} on a Unit`);
      return this.perform({ type: "useInvention", shop: sel.index, slot: def.targeted ? slot : undefined });
    }
    if (sel.index === slot) {
      this.selected = null;
      return this.render();
    }
    const from = run.line[sel.index]!;
    if (target && target.def === from.def && target.exp < MAX_EXP) return this.perform({ type: "merge", from: sel.index, to: slot });
    return this.perform({ type: "swap", a: sel.index, b: slot });
  }

  private select(slot: number): void {
    this.selected = { kind: "line", index: slot };
    this.render();
  }

  private perform(action: Action, keepSelection = false): void {
    const before = this.run;
    try {
      this.saved = { ...this.saved, run: act(before, action) };
    } catch (e) {
      return this.fail((e as Error).message);
    }
    save(this.saved);
    if (!keepSelection) this.selected = null;
    if (action.type === "buy" || action.type === "merge") {
      const slot = action.type === "buy" ? action.slot : action.to;
      const unit = this.run.line[slot]!;
      const was = before.line[slot];
      if (was && stageOf(unit.exp) > stageOf(was.exp)) toast(this, `Evolved into ${unitDef(unit.def).names[stageOf(unit.exp) - 1]}!`, 150);
    }
    this.render();
  }

  private fail(message: string): void {
    toast(this, message, 150);
    this.render();
  }

  private endTurn(): void {
    if (this.run.line.every((u) => u === null)) return this.fail("Buy a Unit first");
    const ready = act(this.run, { type: "endShop" });
    const ghost = ghostFor(ready, this.saved.seed);
    const { run: after, result } = resolveBattle(ready, ghost);
    const saved = { ...this.saved, run: after };
    save(saved);
    this.scene.start("battle", { saved, events: result.events, outcome: result.outcome, round: ready.round });
  }

  private updateInfo(): void {
    if (!this.info) return;
    const sel = this.hovered ?? this.selected;
    const run = this.run;
    let message = "Drag a Unit from the shop into your Line, or tap it and then tap a slot. Drop a copy on the same Unit to evolve it.";
    if (sel?.kind === "line" && run.line[sel.index]) {
      const u = run.line[sel.index]!;
      const def = unitDef(u.def);
      const stage = stageOf(u.exp);
      const needed = (stage === 1 ? 2 : 5) - u.exp;
      const next = stage === 3 ? "Fully evolved." : `${needed} more ${needed === 1 ? "copy" : "copies"} to evolve.`;
      message = `${def.names[stage - 1]} · ${AGE_NAMES[def.age]} Age · Stage ${stage}\n${def.text(stage)}\n${next} Sell for ${stage} gold.`;
    } else if (sel?.kind === "shopUnit" && run.shopUnits[sel.index]) {
      const def = unitDef(run.shopUnits[sel.index]!.def);
      message = `${def.names[0]} · ${AGE_NAMES[def.age]} Age\n${def.text(1)}`;
    } else if (sel?.kind === "shopInvention" && run.shopInventions[sel.index]) {
      const def = inventionDef(run.shopInventions[sel.index]!.def);
      message = `${def.name} · ${AGE_NAMES[def.age]} Age\n${def.text}${def.targeted ? " Drop it on a Unit." : " Drop it anywhere on your Line."}`;
    }
    this.info.setText(message);
  }
}
