// Building blocks for the SAP-style look: Units standing on the scene, stat badges, the hover card and buttons.
import * as Phaser from "phaser";
import { inventionDef, unitDef } from "../simulation/roster";
import { AGE_NAMES } from "../simulation/types";
import { AGE_COLORS, COLORS, FONT, FONT_CHUNKY, FONT_DISPLAY, art, artKey } from "./art";

export function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color = COLORS.text, weight = "600", family = FONT): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: family, fontSize: `${size}px`, color, fontStyle: weight }).setOrigin(0.5);
}

/** Chunky numbers and labels with a dark outline, readable on any background. */
export function chunky(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color = COLORS.text): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT_CHUNKY, fontSize: `${size}px`, color }).setOrigin(0.5).setStroke("#1c1410", Math.max(3, size / 6));
}

/** The figure itself: generated art when it exists, the emoji otherwise. Its bottom edge sits at y = 0. */
function figure(scene: Phaser.Scene, id: string, stage: number, size: number): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
  const key = artKey(id, stage);
  if (scene.textures.exists(key)) return scene.add.image(0, 0, key).setOrigin(0.5, 1).setDisplaySize(size, size);
  return text(scene, 0, -size / 2, art(id, stage), size * 0.6, COLORS.text, "400");
}

export interface UnitViewOptions {
  def: string;
  stage: number;
  attack: number;
  health: number;
  armor?: number;
  exp?: number;
  price?: number;
  frozen?: boolean;
  size?: number;
  /** Ghost Units face left, towards the player's Line. */
  flip?: boolean;
}

/** A Unit standing on the ground, as in SAP: shadow, figure, Stage above, attack and health badges below. Origin is at its feet. */
export class UnitView extends Phaser.GameObjects.Container {
  readonly size: number;
  private readonly attackText: Phaser.GameObjects.Text;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly armorBadge: Phaser.GameObjects.Container;
  private readonly armorText: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Ellipse;
  private readonly sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, o: UnitViewOptions) {
    super(scene, x, y);
    const def = unitDef(o.def);
    const size = (this.size = o.size ?? 130);
    this.ring = scene.add.ellipse(0, 0, size * 0.95, size * 0.28).setStrokeStyle(4, COLORS.selected).setVisible(false);
    const shadow = scene.add.ellipse(0, 0, size * 0.8, size * 0.2, 0x000000, 0.45);
    const plate = scene.add.ellipse(0, 2, size * 0.62, size * 0.13).setStrokeStyle(3, AGE_COLORS[def.age], 0.9);
    this.sprite = figure(scene, o.def, o.stage, size);
    if (o.flip && this.sprite instanceof Phaser.GameObjects.Image) this.sprite.setFlipX(true);
    this.add([this.ring, shadow, plate, this.sprite]);

    const badgeY = 26;
    const attack = scene.add.container(-size * 0.22, badgeY, [
      scene.add.rectangle(0, 0, 38, 38, 0xc2410c).setStrokeStyle(3, 0x1c1410).setAngle(45).setScale(0.82),
    ]);
    this.attackText = chunky(scene, 0, -1, "", 20);
    attack.add(this.attackText);
    const health = scene.add.container(size * 0.22, badgeY, [scene.add.circle(0, 0, 18, 0xb91c1c).setStrokeStyle(3, 0x1c1410)]);
    this.healthText = chunky(scene, 0, -1, "", 20);
    health.add(this.healthText);
    this.armorText = chunky(scene, 0, -1, "", 16, "#e0f2fe");
    this.armorBadge = scene.add.container(0, badgeY + 4, [scene.add.circle(0, 0, 14, 0x1d4ed8).setStrokeStyle(3, 0x1c1410), this.armorText]).setVisible(false);
    this.add([attack, health, this.armorBadge]);

    if (!def.token) {
      const stage = o.stage;
      this.add(chunky(scene, 0, -size - 10, "★".repeat(stage) + "☆".repeat(3 - stage), 16, COLORS.gold));
      if (o.exp !== undefined && stage < 3) {
        const [have, need] = stage === 1 ? [o.exp, 2] : [o.exp - 2, 3];
        const w = 46;
        this.add(scene.add.rectangle(0, -size + 6, w, 7, 0x1c1410).setStrokeStyle(1, 0x000000));
        if (have > 0) this.add(scene.add.rectangle(-w / 2 + 1, -size + 6, ((w - 2) * have) / need, 5, 0x84cc16).setOrigin(0, 0.5));
      }
    }
    if (o.price !== undefined) {
      this.add(scene.add.circle(size * 0.38, -size * 0.85, 15, 0xca8a04).setStrokeStyle(3, 0x1c1410));
      this.add(chunky(scene, size * 0.38, -size * 0.85 - 1, `${o.price}`, 18));
    }
    if (o.frozen) this.add(frost(scene, size));
    this.setStats(o.attack, o.health, o.armor ?? 0);
    this.setSize(size, size + 60);
    scene.add.existing(this);
  }

  setStats(attack: number, health: number, armor: number): void {
    this.attackText.setText(`${attack}`);
    this.healthText.setText(`${Math.max(0, health)}`);
    this.armorText.setText(`${armor}`);
    this.armorBadge.setVisible(armor > 0);
  }

  setSelected(selected: boolean): this {
    this.ring.setVisible(selected);
    this.sprite.setY(selected ? -8 : 0);
    return this;
  }

  /** The figure, for tweens that should move it but not its shadow. */
  get figure(): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
    return this.sprite;
  }
}

/** An Invention in the shop: the object on a plinth with its price. Origin is at its base. */
export class ItemView extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, price: number, frozen: boolean, size = 92) {
    super(scene, x, y);
    this.ring = scene.add.ellipse(0, 0, size * 1.05, size * 0.3).setStrokeStyle(4, COLORS.selected).setVisible(false);
    this.add([this.ring, scene.add.ellipse(0, 0, size * 0.8, size * 0.2, 0x000000, 0.45), figure(scene, id, 1, size)]);
    this.add(scene.add.circle(size * 0.4, -size * 0.85, 15, 0xca8a04).setStrokeStyle(3, 0x1c1410));
    this.add(chunky(scene, size * 0.4, -size * 0.85 - 1, `${price}`, 18));
    if (frozen) this.add(frost(scene, size));
    this.setSize(size, size + 30);
    scene.add.existing(this);
  }

  setSelected(selected: boolean): this {
    this.ring.setVisible(selected);
    return this;
  }
}

/** A block of ice over a frozen shop offer. */
function frost(scene: Phaser.Scene, size: number): Phaser.GameObjects.Container {
  return scene.add.container(0, -size / 2, [
    scene.add.rectangle(0, 0, size * 0.92, size * 1.02, 0xbae6fd, 0.35).setStrokeStyle(3, 0xe0f2fe, 0.9),
    chunky(scene, -size * 0.34, size * 0.36, "❄", 20, "#e0f2fe"),
  ]);
}

export interface CardInfo {
  id: string;
  stage: number;
  title: string;
  age: keyof typeof AGE_NAMES;
  lines: string[];
}

/** The card that appears on hover (or stays while selected), like SAP's: art, name, Age, Stage and the ability text. */
export class InfoCard extends Phaser.GameObjects.Container {
  private static readonly WIDTH = 330;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(90).setVisible(false);
    scene.add.existing(this);
  }

  show(info: CardInfo, x: number, y: number): void {
    this.removeAll(true);
    const w = InfoCard.WIDTH;
    const scene = this.scene;
    const body = scene.add.text(-w / 2 + 112, -12, info.lines.join("\n"), {
      fontFamily: FONT,
      fontSize: "15px",
      color: COLORS.text,
      wordWrap: { width: w - 128 },
      lineSpacing: 3,
    });
    const h = Math.max(150, body.height + 76);
    body.setY(-h / 2 + 62);
    const color = AGE_COLORS[info.age];
    this.add([
      scene.add.rectangle(4, 6, w, h, 0x000000, 0.4),
      scene.add.rectangle(0, 0, w, h, 0x241b14, 0.97).setStrokeStyle(3, color),
      scene.add.rectangle(-w / 2 + 56, 0, 96, h - 16, 0x1a130e).setStrokeStyle(2, color, 0.6),
    ]);
    const portrait = figure(scene, info.id, info.stage, 92);
    portrait.setPosition(-w / 2 + 56, 46);
    this.add(portrait);
    this.add(scene.add.text(-w / 2 + 112, -h / 2 + 12, info.title, { fontFamily: FONT_DISPLAY, fontSize: "19px", color: COLORS.text, fontStyle: "700" }));
    const chip = scene.add.text(-w / 2 + 112, -h / 2 + 38, `${AGE_NAMES[info.age]} Age`, { fontFamily: FONT, fontSize: "12px", color: "#14110f", fontStyle: "700" });
    chip.setBackgroundColor(Phaser.Display.Color.IntegerToColor(color).rgba).setPadding(6, 2, 6, 2);
    this.add([chip, body]);
    const cam = scene.cameras.main;
    this.setPosition(Phaser.Math.Clamp(x, w / 2 + 8, cam.width - w / 2 - 8), Phaser.Math.Clamp(y, h / 2 + 8, cam.height - h / 2 - 8));
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}

export function unitCardInfo(def: string, stage: number, extra: string[] = []): CardInfo {
  const d = unitDef(def);
  return { id: def, stage, title: d.names[stage - 1] ?? d.names[0], age: d.age, lines: [d.text(stage as 1 | 2 | 3), ...extra] };
}

export function inventionCardInfo(id: string): CardInfo {
  const d = inventionDef(id);
  return { id, stage: 1, title: d.name, age: d.age, lines: [d.text, d.targeted ? "Drop it on a Unit." : "Drop it anywhere on your Line."] };
}

export type ButtonStyle = "primary" | "neutral" | "danger";
const BUTTON_COLORS: Record<ButtonStyle, [number, number]> = {
  primary: [0xea580c, 0x9a3412],
  neutral: [0x57534e, 0x292524],
  danger: [0xb45309, 0x78350f],
};

/** A chunky 3D button with an icon, like SAP's. */
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, enabled = true, width = 170, style: ButtonStyle = "neutral"): Phaser.GameObjects.Container {
  const [face, edge] = enabled ? BUTTON_COLORS[style] : [0x3a332d, 0x1c1917];
  const c = scene.add.container(x, y);
  const bottom = scene.add.rectangle(0, 5, width, 54, edge).setStrokeStyle(3, 0x1c1410);
  const top = scene.add.rectangle(0, 0, width, 54, face).setStrokeStyle(3, 0x1c1410);
  const caption = chunky(scene, 0, -1, label, 22, enabled ? COLORS.text : COLORS.muted);
  c.add([bottom, top, caption]);
  c.setSize(width, 60);
  if (enabled) {
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => (top.setY(4), caption.setY(3)));
    c.on("pointerout", () => (top.setY(0), caption.setY(-1)));
    c.on("pointerup", () => {
      top.setY(0);
      caption.setY(-1);
      onClick();
    });
  }
  return c;
}

/** A rounded HUD counter (gold, lives, wins). */
export function pill(scene: Phaser.Scene, x: number, y: number, icon: string, value: string, color: string, width = 120): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [
    scene.add.rectangle(0, 0, width, 44, 0x1c1410, 0.82).setStrokeStyle(2, 0x57534e),
    text(scene, -width / 2 + 24, 0, icon, 22, COLORS.text, "400"),
    chunky(scene, 14, -1, value, 26, color),
  ]);
}

/** A short message that fades out. */
export function toast(scene: Phaser.Scene, message: string, y = 120): void {
  const t = chunky(scene, scene.scale.width / 2, y, message, 26).setDepth(100);
  scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 1400, duration: 500, onComplete: () => t.destroy() });
}

/** A number or label that floats up from a point and fades. */
export function floater(scene: Phaser.Scene, x: number, y: number, value: string, color: string): void {
  const t = chunky(scene, x, y, value, 26, color).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 750, onComplete: () => t.destroy() });
}

/** The Age's scene, scaled to cover the screen and dimmed so the Units stand out. */
export function backdrop(scene: Phaser.Scene, age: keyof typeof AGE_NAMES): void {
  const key = `bg.${age}`;
  if (scene.textures.exists(key)) {
    const img = scene.add.image(640, 360, key);
    img.setScale(Math.max(1280 / img.width, 720 / img.height));
  }
  scene.add.rectangle(640, 50, 1280, 100, 0x000000, 0.35);
}
