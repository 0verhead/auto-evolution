import * as Phaser from "phaser";
import { inventionDef, unitDef } from "../simulation/roster";
import { act, resolveBattle, REROLL_PRICE, type Action } from "../simulation/run";
import { AGE_NAMES, AGES, LINE_SIZE } from "../simulation/types";
import { MAX_EXP, latestAgeIndex, stageOf } from "../simulation/units";
import { AGE_COLORS, COLORS, FONT_DISPLAY } from "./art";
import { muted, play, toggleMuted, type Sfx } from "./sound";
import { ghostFor, save, type Saved } from "./state";
import { InfoCard, ItemView, UnitView, backdrop, button, inventionCardInfo, pill, stage, text, toast, unitCardInfo, type CardInfo } from "./ui";

type Selection = { kind: "shopUnit" | "shopInvention" | "line"; index: number };

const SOUND_FOR: Record<Action["type"], Sfx> = {
  buy: "buy",
  useInvention: "buff",
  sell: "sell",
  merge: "merge",
  swap: "select",
  reroll: "reroll",
  freeze: "freeze",
  endShop: "fight",
};

/** Slot 1 (the front) is on the right, facing the enemy. Units stand with their feet on LINE_FEET. */
const SLOT_X = [1010, 845, 680, 515, 350];
const LINE_FEET = 345;
const SHOP_FEET = 588;
const SLOT_HALF_WIDTH = 80;
/** Where the info card appears for Line Units (below them) and shop offers (above them). */
/** Where the hover card goes: hanging below Line Units (under their badges), standing above shop items. */
const LINE_CARD = { y: 392, edge: "top" } as const;
const SHOP_CARD = { y: 440, edge: "bottom" } as const;
type CardPlace = { y: number; edge: "top" | "bottom" };

const keyOf = (s: Selection) => `${s.kind}:${s.index}`;

export class ShopScene extends Phaser.Scene {
  private saved!: Saved;
  private selected: Selection | null = null;
  private layer!: Phaser.GameObjects.Container;
  private card!: InfoCard;
  private cards = new Map<string, { info: CardInfo; x: number; place: CardPlace }>();
  private slotMarkers: Phaser.GameObjects.Ellipse[] = [];
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
    stage(this);
    this.input.dragDistanceThreshold = 8;
    this.input.on("pointerdown", () => (this.justDragged = false));
    backdrop(this, AGES[latestAgeIndex(this.run.round)]!);
    this.layer = this.add.container(0, 0);
    this.card = new InfoCard(this);
    this.render();
    const round = this.run.round;
    if (round > 1 && round % 2 === 1 && round <= 9) {
      toast(this, `Eureka! The ${AGE_NAMES[AGES[latestAgeIndex(round)]!]} Age begins`, 150);
      play(this, "eureka");
    }
  }

  private get run() {
    return this.saved.run;
  }

  private render(): void {
    this.layer.removeAll(true);
    this.cards.clear();
    this.card.hide();
    const run = this.run;
    const age = AGES[latestAgeIndex(run.round)]!;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.layer.add(o), o);

    // HUD
    const sound = add(text(this, 34, 40, muted() ? "🔇" : "🔊", 24, COLORS.text, "400"));
    sound.setInteractive({ useHandCursor: true }).on("pointerup", () => sound.setText(toggleMuted() ? "🔇" : "🔊"));
    add(text(this, 150, 30, `Round ${run.round}`, 30, COLORS.text, "900", FONT_DISPLAY).setStroke("#1c1410", 5));
    const chip = add(text(this, 150, 64, `${AGE_NAMES[age]} Age`, 14, "#14110f", "800"));
    chip.setBackgroundColor(Phaser.Display.Color.IntegerToColor(AGE_COLORS[age]).rgba).setPadding(8, 2, 8, 2);
    add(pill(this, 880, 42, "🪙", `${run.gold}`, COLORS.gold));
    add(pill(this, 1010, 42, "❤️", `${run.lives}`, COLORS.health));
    add(pill(this, 1160, 42, "🏆", `${run.wins}/10`, COLORS.text, 150));

    // Line
    this.slotMarkers = SLOT_X.map((x) => add(this.add.ellipse(x, LINE_FEET, 120, 34, 0x000000, 0.3).setStrokeStyle(2, 0xffffff, 0.15)));
    for (let slot = 0; slot < LINE_SIZE; slot++) {
      const unit = run.line[slot];
      if (!unit) {
        const zone = add(this.add.zone(SLOT_X[slot]!, LINE_FEET - 70, SLOT_HALF_WIDTH * 2, 200));
        zone.setInteractive().on("pointerup", () => !this.dragging && !this.justDragged && this.onSlot(slot, "tap"));
        continue;
      }
      const stage = stageOf(unit.exp);
      const view = add(
        new UnitView(this, SLOT_X[slot]!, LINE_FEET, { def: unit.def, stage, attack: unit.attack + unit.tempAttack, health: unit.health + unit.tempHealth, exp: unit.exp }),
      ).setSelected(this.isSelected("line", slot));
      const needed = (stage === 1 ? 2 : 5) - unit.exp;
      const extra = [stage === 3 ? "Fully evolved." : `${needed} more ${needed === 1 ? "copy" : "copies"} to evolve.`, `Sells for ${stage} gold.`];
      if (unit.tempAttack || unit.tempHealth) extra.push(`+${unit.tempAttack}/+${unit.tempHealth} until the end of the next battle.`);
      this.interactive(view, { kind: "line", index: slot }, unitCardInfo(unit.def, stage, extra), LINE_CARD);
    }
    add(text(this, 1120, LINE_FEET - 4, "front ▶", 16, COLORS.text, "700").setAlpha(0.6));

    // Shop
    add(this.add.rectangle(640, 528, 1240, 170, 0x1c1410, 0.82).setStrokeStyle(3, 0x57534e));
    add(text(this, 92, 454, "Shop", 18, COLORS.text, "700", FONT_DISPLAY).setBackgroundColor("#1c1410").setPadding(10, 2, 10, 2));
    let x = 120;
    run.shopUnits.forEach((offer, index) => {
      const def = unitDef(offer.def);
      const view = add(
        new UnitView(this, x, SHOP_FEET, { def: offer.def, stage: 1, attack: offer.attack, health: offer.health, price: offer.price, frozen: offer.frozen, size: 100 }),
      ).setSelected(this.isSelected("shopUnit", index));
      this.interactive(view, { kind: "shopUnit", index }, unitCardInfo(offer.def, 1, [`Evolves: ${def.names[0]} → ${def.names[1]} → ${def.names[2]}`]), SHOP_CARD);
      x += 128;
    });
    x += 24;
    run.shopInventions.forEach((offer, index) => {
      const view = add(new ItemView(this, x, SHOP_FEET, offer.def, offer.price, offer.frozen)).setSelected(this.isSelected("shopInvention", index));
      this.interactive(view, { kind: "shopInvention", index }, inventionCardInfo(offer.def), SHOP_CARD);
      x += 120;
    });
    if (run.round === 1 && run.line.every((u) => u === null)) {
      add(text(this, 640, 405, "Drag a Unit from the shop into your Line. Drop a copy on the same Unit to evolve it. Hover or tap anything to read it.", 16).setStroke("#1c1410", 4));
    }

    // Buttons
    const sel = this.selected;
    add(button(this, 120, 668, `🎲 Roll ${REROLL_PRICE}`, () => this.perform({ type: "reroll" }), run.gold >= REROLL_PRICE));
    const shopSel = sel && sel.kind !== "line" ? sel : null;
    add(
      button(
        this,
        305,
        668,
        shopSel && this.isFrozen(shopSel) ? "❄ Unfreeze" : "❄ Freeze",
        () => shopSel && this.perform({ type: "freeze", kind: shopSel.kind === "shopUnit" ? "unit" : "invention", shop: shopSel.index }, true),
        shopSel !== null,
      ),
    );
    const sellValue = sel?.kind === "line" && run.line[sel.index] ? stageOf(run.line[sel.index]!.exp) : 0;
    add(button(this, 490, 668, sellValue ? `🪙 Sell +${sellValue}` : "🪙 Sell", () => sel?.kind === "line" && this.perform({ type: "sell", slot: sel.index }), sellValue > 0, 170, "danger"));
    add(button(this, 1130, 668, "End turn ▶", () => this.endTurn(), true, 210, "primary"));

    if (sel) this.showCardFor(sel);
  }

  private isSelected(kind: Selection["kind"], index: number): boolean {
    return this.selected?.kind === kind && this.selected.index === index;
  }

  private isFrozen(sel: Selection): boolean {
    return (sel.kind === "shopUnit" ? this.run.shopUnits : this.run.shopInventions)[sel.index]?.frozen ?? false;
  }

  private showCardFor(sel: Selection): void {
    const c = this.cards.get(keyOf(sel));
    if (c) this.card.show(c.info, c.x, c.place.y, c.place.edge);
  }

  /** Hover shows the card; tap selects (and pins the card); drag drops onto a Line slot. */
  private interactive(view: UnitView | ItemView, source: Selection, info: CardInfo, place: CardPlace): void {
    this.cards.set(keyOf(source), { info, x: view.x, place });
    const size = view.width;
    const zone = this.add.zone(view.x, view.y - size / 2 + 15, size, size + 50);
    this.layer.add(zone);
    zone.setInteractive({ useHandCursor: true, draggable: true });
    const home = { x: view.x, y: view.y };
    zone.on("pointerover", () => !this.dragging && this.card.show(info, home.x, place.y, place.edge));
    zone.on("pointerout", () => {
      if (this.dragging) return;
      if (this.selected) this.showCardFor(this.selected);
      else this.card.hide();
    });
    zone.on("pointerup", () => {
      if (this.dragging || this.justDragged) return;
      if (source.kind === "line" && this.selected && !this.isSelected("line", source.index)) return this.onSlot(source.index, "tap");
      this.selected = this.isSelected(source.kind, source.index) ? null : source;
      if (this.selected) play(this, "select");
      this.render();
    });
    zone.on("dragstart", () => {
      this.dragging = true;
      this.selected = source;
      this.card.hide();
      this.layer.bringToTop(view);
      this.highlightSlots(source);
    });
    zone.on("drag", (pointer: Phaser.Input.Pointer) => view.setPosition(pointer.worldX, pointer.worldY + size / 2));
    zone.on("dragend", (pointer: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.justDragged = true;
      const slot = SLOT_X.findIndex((sx) => Math.abs(pointer.worldX - sx) < SLOT_HALF_WIDTH && pointer.worldY > LINE_FEET - 190 && pointer.worldY < LINE_FEET + 60);
      view.setPosition(home.x, home.y);
      if (slot >= 0) this.onSlot(slot, "drop");
      else this.render();
    });
  }

  /** While dragging, light up the slots the dragged thing can go to. */
  private highlightSlots(source: Selection): void {
    const run = this.run;
    this.slotMarkers.forEach((marker, slot) => {
      const target = run.line[slot];
      let ok: boolean;
      if (source.kind === "shopUnit") ok = !target || (target.def === run.shopUnits[source.index]!.def && target.exp < MAX_EXP);
      else if (source.kind === "shopInvention") ok = !inventionDef(run.shopInventions[source.index]!.def).targeted || target !== null;
      else ok = slot !== source.index;
      if (ok) marker.setFillStyle(0xfacc15, 0.35).setStrokeStyle(3, 0xfacc15, 0.9);
    });
  }

  /** A tap or drop on a Line slot with whatever is selected. Tapping a Unit that can't take the selection selects it instead. */
  private onSlot(slot: number, via: "tap" | "drop"): void {
    const run = this.run;
    const sel = this.selected;
    const target = run.line[slot];
    if (!sel) {
      if (target) return this.select(slot);
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
    play(this, "select");
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
    play(this, SOUND_FOR[action.type]);
    if (action.type === "buy" || action.type === "merge") {
      const slot = action.type === "buy" ? action.slot : action.to;
      const unit = this.run.line[slot]!;
      const was = before.line[slot];
      if (was) play(this, "merge");
      if (was && stageOf(unit.exp) > stageOf(was.exp)) {
        toast(this, `Evolved into ${unitDef(unit.def).names[stageOf(unit.exp) - 1]}!`, 150);
        play(this, "evolve");
      }
    }
    this.render();
  }

  private fail(message: string): void {
    toast(this, message, 150);
    play(this, "error");
    this.render();
  }

  private endTurn(): void {
    if (this.run.line.every((u) => u === null)) return this.fail("Buy a Unit first");
    const ready = act(this.run, { type: "endShop" });
    const ghost = ghostFor(ready, this.saved.seed);
    const { run: after, result } = resolveBattle(ready, ghost);
    const saved = { ...this.saved, run: after };
    save(saved);
    play(this, "fight");
    this.scene.start("battle", { saved, events: result.events, outcome: result.outcome, round: ready.round });
  }
}
