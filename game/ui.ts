import * as Phaser from "phaser";
import { unitDef, inventionDef } from "../simulation/roster";
import { AGE_COLORS, COLORS, FONT, art } from "./art";

export interface UnitCardOptions {
  def: string;
  stage: number;
  attack: number;
  health: number;
  armor?: number;
  exp?: number;
  price?: number;
  frozen?: boolean;
  selected?: boolean;
  width?: number;
  height?: number;
}

export function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color = COLORS.text, weight = "600"): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: weight }).setOrigin(0.5);
}

/** A Unit card: Age-coloured frame, art, name, Stage, attack and health. */
export class UnitCard extends Phaser.GameObjects.Container {
  private readonly stats: Phaser.GameObjects.Text;
  private readonly armorText: Phaser.GameObjects.Text;
  readonly cardWidth: number;
  readonly cardHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, o: UnitCardOptions) {
    super(scene, x, y);
    const def = unitDef(o.def);
    const w = (this.cardWidth = o.width ?? 130);
    const h = (this.cardHeight = o.height ?? 170);
    const color = AGE_COLORS[def.age];
    const frame = scene.add.rectangle(0, 0, w, h, COLORS.panelLight).setStrokeStyle(o.selected ? 5 : 3, o.selected ? COLORS.selected : color);
    const band = scene.add.rectangle(0, -h / 2 + 12, w - 6, 18, color, 0.9);
    const name = text(scene, 0, -h / 2 + 12, def.names[o.stage - 1] ?? def.names[0], Math.min(14, (w * 1.6) / Math.max(8, (def.names[o.stage - 1] ?? "").length)), "#14110f", "700");
    const emoji = text(scene, 0, -8, art(o.def, o.stage), w * 0.42, COLORS.text, "400");
    this.stats = text(scene, 0, h / 2 - 20, "", 18, COLORS.text, "700");
    this.armorText = text(scene, w / 2 - 18, -h / 2 + 36, "", 13, COLORS.armor, "700");
    this.add([frame, band, name, emoji, this.stats, this.armorText]);
    if (!def.token) {
      const stars = "★".repeat(o.stage) + "☆".repeat(3 - o.stage);
      this.add(text(scene, -w / 2 + 26, -h / 2 + 34, stars, 12, COLORS.gold, "700"));
    }
    if (o.exp !== undefined && !def.token) {
      const pips = o.exp >= 5 ? "max" : o.exp >= 2 ? `${o.exp - 2}/3` : `${o.exp}/2`;
      this.add(text(scene, 0, h / 2 - 44, `exp ${pips}`, 11, COLORS.muted, "500"));
    }
    if (o.price !== undefined) {
      this.add(scene.add.circle(w / 2 - 14, -h / 2 + 36, 13, 0x3f3a2e).setStrokeStyle(2, 0xfacc15));
      this.add(text(scene, w / 2 - 14, -h / 2 + 36, `${o.price}`, 14, COLORS.gold, "800"));
    }
    if (o.frozen) {
      this.add(scene.add.rectangle(0, 0, w, h, 0x7dd3fc, 0.25));
      this.add(text(scene, -w / 2 + 16, h / 2 - 44, "❄", 16, COLORS.armor));
    }
    this.setStats(o.attack, o.health, o.armor ?? 0);
    this.setSize(w, h);
    scene.add.existing(this);
  }

  setStats(attack: number, health: number, armor: number): void {
    this.stats.setText(`⚔${attack}  ❤${Math.max(0, health)}`);
    this.armorText.setText(armor > 0 ? `🛡${armor}` : "");
  }
}

export function inventionCard(scene: Phaser.Scene, x: number, y: number, id: string, price: number, frozen: boolean, selected: boolean): Phaser.GameObjects.Container {
  const def = inventionDef(id);
  const w = 110, h = 150;
  const c = scene.add.container(x, y);
  c.add(scene.add.ellipse(0, 0, w, h, COLORS.panelLight).setStrokeStyle(selected ? 5 : 3, selected ? COLORS.selected : AGE_COLORS[def.age]));
  c.add(text(scene, 0, -18, art(id), 46, COLORS.text, "400"));
  c.add(text(scene, 0, 34, def.name, 14));
  c.add(scene.add.circle(w / 2 - 14, -h / 2 + 24, 13, 0x3f3a2e).setStrokeStyle(2, 0xfacc15));
  c.add(text(scene, w / 2 - 14, -h / 2 + 24, `${price}`, 14, COLORS.gold, "800"));
  if (frozen) c.add(text(scene, -w / 2 + 18, h / 2 - 24, "❄", 16, COLORS.armor));
  c.setSize(w, h);
  return c;
}

export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, enabled = true, width = 150): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, 52, enabled ? 0x3f6212 : 0x3a332d).setStrokeStyle(2, enabled ? 0x84cc16 : 0x57534e);
  c.add([bg, text(scene, 0, 0, label, 18, enabled ? COLORS.text : COLORS.muted, "700")]);
  c.setSize(width, 52);
  if (enabled) {
    c.setInteractive({ useHandCursor: true }).on("pointerup", onClick);
    c.on("pointerover", () => bg.setFillStyle(0x4d7c0f)).on("pointerout", () => bg.setFillStyle(0x3f6212));
  }
  return c;
}

/** A short message that fades out. */
export function toast(scene: Phaser.Scene, message: string, y = 120): void {
  const t = text(scene, scene.scale.width / 2, y, message, 22, COLORS.text, "700").setBackgroundColor("#000000aa").setPadding(14, 8, 14, 8).setDepth(100);
  scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 1400, duration: 500, onComplete: () => t.destroy() });
}

/** A number or label that floats up from a point and fades. */
export function floater(scene: Phaser.Scene, x: number, y: number, value: string, color: string): void {
  const t = text(scene, x, y, value, 24, color, "800").setDepth(50).setStroke("#000000", 4);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}
