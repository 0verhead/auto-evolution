// Generates the game's art with Gemini (Nano Banana 2.1). Originals (1024 px) go to out/art-source, which is not
// committed; game-sized copies go to game/public/art (<art key>.webp, backgrounds bg.<age>.jpg). Needs GEMINI_API_KEY.
//   npm run art [--only=caveman.1,pharaoh.3] [--style=a|b] [--out=dir] [--force]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const MODEL = "gemini-nano-banana-2.1";
/** Characters and items are drawn on magenta, which is then keyed out to transparency (no art uses pure magenta). */
const KEY_BACKGROUND = "Solid, perfectly flat pure magenta background (#FF00FF) filling everything behind the subject, no gradient, no texture, no shadow.";
const KEY_COLOR = "0xFF00FF";
const CONCURRENCY = 4;
const GAME_ART = "game/public/art";
/** Characters are shown at up to about 130 px; 384 keeps them sharp on 3× phone screens. */
const CARD_SIZE = 384;
const BACKGROUND_WIDTH = 1600;

/** Cartoony and readable like Super Auto Pets, but grounded and serious rather than cute. */
const STYLES: Record<string, string> = {
  a: [
    "Game card character art in a clean cartoon style like a mobile auto-battler, but serious in tone, not cute.",
    "Bold dark outlines, chunky simple shapes, flat colours with one soft shade, a readable silhouette at small size.",
    "Natural proportions, not chibi; a calm, stoic or determined face, no big grin, no googly eyes.",
    "Muted, earthy palette. One figure, full body, centred, facing right, filling most of the frame.",
    `${KEY_BACKGROUND} No text, no frame, no border, no shadow on the ground.`,
  ].join(" "),
  b: [
    "Board-game illustration of a single character, hand-inked cartoon style, serious and grounded rather than cute.",
    "Confident ink outlines, simple cel shading with two tones, slightly stylised but natural proportions.",
    "A dignified, determined expression. Earthy, historical palette with one accent colour.",
    "One figure, full body, centred, facing right, filling most of the frame.",
    `${KEY_BACKGROUND} No text, no frame, no border.`,
  ].join(" "),
};

/** Inventions are objects, not characters: no faces or limbs. */
const ITEM_STYLE = [
  "Game item icon of a single object in a clean cartoon style: bold dark outlines, chunky simple shapes, flat colours with one soft shade.",
  "Muted, earthy palette. The object only: no face, no eyes, no arms or legs, no person. Centred, filling most of the frame.",
  `${KEY_BACKGROUND} No text or lettering anywhere, no frame, no border.`,
].join(" ");

/** What each art key shows. Stages of a Unit are the same person or thing, visibly grander as it evolves. */
const SUBJECTS: Record<string, string> = {
  "caveman.1": "a Stone Age caveman in a fur tunic holding a wooden club",
  "caveman.2": "a big, broad Stone Age caveman in a thick fur cloak with a heavier club",
  "caveman.3": "a huge, imposing Stone Age caveman chieftain-warrior with a massive stone-headed club and bone necklace",
  "drummer.1": "a Stone Age drummer beating a simple hollow log drum with sticks",
  "drummer.2": "a Stone Age drummer with a drum of stretched hide and bone, painted with ochre marks",
  "drummer.3": "a fierce Stone Age war drummer with a large thunder drum, ochre war paint, feathers",
  "gatherer.1": "a Stone Age gatherer woman with a woven basket of berries and roots",
  "gatherer.2": "a Stone Age tribe mother, older woman with a fur shawl and a carved staff",
  "gatherer.3": "a wise, revered Stone Age great mother elder with a staff, shell necklaces and a fur mantle",
  "builder.1": "a Bronze Age Egyptian worker carrying a mud brick on his shoulder",
  "builder.2": "a Bronze Age pyramid builder with a stone block on a sledge and a rope",
  "builder.3": "a Bronze Age grand architect in white linen holding a measuring rod and a papyrus plan",
  "scribe.1": "a Bronze Age Mesopotamian scribe writing on a clay tablet with a reed stylus",
  "scribe.2": "a Bronze Age royal scribe in fine linen with a palette and papyrus scroll",
  "scribe.3": "a Bronze Age chief scribe, older and stern, with many scrolls and a gold collar",
  "pharaoh.1": "a Bronze Age chieftain with a bronze spear and a simple headband",
  "pharaoh.2": "a Bronze Age priest-king in a leopard-skin robe with a bronze sceptre",
  "pharaoh.3": "an Egyptian pharaoh with the striped nemes headdress, crook and flail, gold collar",
  "legionary.1": "a Roman legionary with a rectangular red shield, helmet and short sword",
  "legionary.2": "a scarred Roman veteran legionary in segmented armour with a battered shield",
  "legionary.3": "a Roman praetorian guard in ornate armour with a plumed helmet and large shield",
  "shieldbearer.1": "an Iron Age shield bearer holding out a large round iron-rimmed shield",
  "shieldbearer.2": "a Roman centurion with a transverse crest helmet and vine staff",
  "shieldbearer.3": "a Roman legate general in a red cloak and muscled cuirass",
  "recruiter.1": "an Iron Age Roman recruiter with a wax tablet, gesturing to join",
  "recruiter.2": "a Roman drillmaster shouting orders, holding a wooden practice sword",
  "recruiter.3": "a Roman general on foot in a red cloak pointing forward, laurel wreath",
  "worker.1": "an industrial-era factory worker in overalls and a flat cap holding a big wrench",
  "worker.2": "an industrial-era foreman in a waistcoat with a clipboard and pocket watch",
  "worker.3": "an industrialist in a top hat and frock coat holding a rolled factory blueprint, with no scenery behind him",
  "banker.1": "a modern-era clerk with sleeve garters and a ledger book",
  "banker.2": "a modern-era banker in a pinstripe suit holding a money bag",
  "banker.3": "a wealthy tycoon in a tuxedo and top hat with a cane and gold coins",
  "salesman.1": "a travelling salesman in a suit with a suitcase of goods",
  "salesman.2": "a merchant in a fine suit with an open case of shiny products",
  "salesman.3": "a business magnate in a sharp suit with a briefcase and a confident stance",
  "cyborg.1": "a sci-fi cyborg soldier, part human part robot, with a mechanical arm",
  "cyborg.2": "a sci-fi battle mech, a bulky armoured robot suit with a cannon arm",
  "cyborg.3": "a towering sci-fi titan mech with heavy plating and glowing core",
  "aicore.1": "a sci-fi AI core, a floating glowing processor orb with circuit lines",
  "aicore.2": "a sci-fi superintelligence, a large floating crystalline brain of light in a metal frame",
  "aicore.3": "a sci-fi singularity, a radiant geometric artificial mind with orbiting rings",
  "timetraveler.1": "a sci-fi time traveler in a long coat with a glowing chrono device on the wrist",
  "timetraveler.2": "a sci-fi chrononaut in a sleek time suit with a clockwork helmet",
  "timetraveler.3": "a sci-fi time lord in flowing robes with glowing hourglass emblems and a staff",
  cousin: "a young Stone Age cousin, a scrappy boy in a fur wrap holding a stick",
  fire: "a campfire of crackling flames on a ring of stones, as an object",
  beer: "an ancient Bronze Age clay beer jar with drinking straws, as an object",
  roads: "a straight Roman paved stone road with a milestone, as an object",
  canned: "an industrial-era tin can of food with a plain blank paper label showing only a painted vegetable, absolutely no letters or words, as an object",
  gene: "a glowing sci-fi DNA double helix inside a glass vial, as an object",
};

/** Shop and battle backdrops, one per Age; dark and quiet so cards stay readable on top. */
const BACKGROUND_STYLE = [
  "Wide game background scene in a clean cartoon style matching bold-outlined, flat-coloured character art, serious in tone.",
  "Dark, muted and low in contrast, like dusk, so that game cards placed on top stay readable. The lower two thirds are calm ground with little detail.",
  "No characters, no people, no text, no UI.",
].join(" ");

const BACKGROUNDS: Record<string, string> = {
  "bg.stone": "a Stone Age camp at dusk: a cave mouth, a dying campfire, mammoth bones and distant mountains",
  "bg.bronze": "a Bronze Age desert at dusk: pyramids under construction, scaffolding, the Nile and palm trees",
  "bg.iron": "an Iron Age Roman army camp at dusk: wooden palisade, tents, banners and a stone road",
  "bg.modern": "an industrial-era city at dusk: brick factories, smokestacks, a railway bridge and gas lamps",
  "bg.scifi": "a sci-fi orbital station deck at night: large windows onto a planet, clean panels and soft blue lights",
};

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const style = STYLES[flag("style") ?? "a"]!;
const out = flag("out") ?? "out/art-source";
const only = flag("only")?.split(",");
const force = args.includes("--force");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
mkdirSync(out, { recursive: true });

const ITEMS = ["fire", "beer", "roads", "canned", "gene"];
const all = { ...SUBJECTS, ...BACKGROUNDS };
const keys = Object.keys(all).filter((k) => (only ? only.includes(k) : true) && (force || only || !existsSync(`${out}/${k}.jpg`)));
console.log(`Generating ${keys.length} images with ${MODEL} into ${out}`);
const queue = [...keys];
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
resizeForGame();

async function worker(): Promise<void> {
  for (let key = queue.shift(); key; key = queue.shift()) {
    const background = key.startsWith("bg.");
    const item = ITEMS.includes(key);
    const prompt = background
      ? `${BACKGROUND_STYLE}\n\nScene: ${BACKGROUNDS[key]}.`
      : `${item ? ITEM_STYLE : style}\n\n${item ? "Object" : "Subject"}: ${SUBJECTS[key]}.`;
    try {
      writeFileSync(`${out}/${key}.jpg`, await generate(prompt, background ? "16:9" : "1:1"));
      console.log(`  ✓ ${key}`);
    } catch (e) {
      const err = e as Error & { cause?: { message?: string } };
      console.log(`  ✗ ${key}: ${err.message}${err.cause?.message ? ` (${err.cause.message})` : ""}`);
    }
  }
}

/** Writes game-sized copies into game/public/art: backgrounds as JPEG, characters and items as WebP with the magenta keyed out. */
function resizeForGame(): void {
  mkdirSync(GAME_ART, { recursive: true });
  for (const file of readdirSync(out).filter((f) => f.endsWith(".jpg"))) {
    const key = file.slice(0, -4);
    if (key.startsWith("bg.")) {
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${out}/${file}`, "-vf", `scale=${BACKGROUND_WIDTH}:-2:flags=lanczos`, "-q:v", "4", `${GAME_ART}/${file}`]);
    } else {
      const filter = `colorkey=${KEY_COLOR}:0.32:0.08,scale=${CARD_SIZE}:-2:flags=lanczos`;
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${out}/${file}`, "-vf", filter, "-c:v", "libwebp", "-quality", "85", "-pix_fmt", "yuva420p", `${GAME_ART}/${key}.webp`]);
    }
  }
  console.log(`Resized ${readdirSync(out).length} images into ${GAME_ART}`);
}

async function generate(prompt: string, aspectRatio: string): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await request(prompt, aspectRatio);
    } catch (e) {
      // Dropped connections happen under load; retry them like rate limits.
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (res.ok) {
      const json = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[] };
      const data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
      if (!data) throw new Error(`no image in response: ${JSON.stringify(json).slice(0, 200)}`);
      return Buffer.from(data, "base64");
    }
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

function request(prompt: string, aspectRatio: string): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey!, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
    }),
  });
}
