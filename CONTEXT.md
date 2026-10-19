# Auto Evolution

An auto-battler in the style of Super Auto Pets, themed on human history. Players build a five-unit line from Units of different historical Ages and evolve them by merging duplicates.

## Language

### Run structure

**Run**:
One full game, from the first Round until the player reaches 10 wins or runs out of lives.
_Avoid_: Match, game, session

**Round**:
One shop phase followed by one battle.
_Avoid_: Turn

**Line**:
The player's five slots, ordered front to back, where their Units stand.
_Avoid_: Team, board, army, lineup

**Ghost**:
A saved Line from a particular Round that another player fights asynchronously. It comes from the same Round but not necessarily the same Age. A real player or a bot can create it, and the game treats both the same.
_Avoid_: Opponent team, enemy, AI team

**Personality**:
A bot's set of priorities when it plays the shop. The Purist favours the newest Age, and the Mixer favours a Line with many different Ages. Rush, Steady and Boom differ only in how early they Advance.
_Avoid_: Difficulty, AI level, strategy

### Units and progression

**Unit**:
A fighter the player owns, occupying one slot in their line. Each Unit belongs to exactly one Age for its whole life.
_Avoid_: Pet, card, minion, champion

**Age**:
One step of the historical timeline (Stone, Bronze, Iron, Modern, Sci-Fi). Every Run starts in the Stone Age and moves forward by Advancing; the shop offers Units of the Run's Age and every Age before it. Units of later Ages are stronger and cost more gold, so older Units earn a place in a late line as cheap supporters rather than fighters.
_Avoid_: Era, tier, epoch

**Advance**:
To move a Run into the next Age. It costs gold, and the price drops every Round the Run stays in its Age; once it would be free, history moves the Run on by itself. A player decides how early to Advance, never whether.
_Avoid_: Age up, unlock, evolve (Units Evolve; Runs Advance)

**Specialty**:
The one kind of effect an Age's Units are best at, taken from what that Age is famous for in history: Numbers (Stone), Patience (Bronze), Formation (Iron), Industry (Modern), Rule-breaking (Sci-Fi).
_Avoid_: Trait, synergy, class

**Ability**:
A Unit's single "Trigger: effect" sentence, written on its card in the style of Super Auto Pets. Any condition lives in the ability's own text, never in a game-wide rule.

**Bridge Unit**:
A Unit whose ability is filtered on friends or enemies "from a different Age". It carries the "old serves new" hook.
_Avoid_: Synergy unit, combo unit

**Counterpart**:
The Super Auto Pets pet whose base stats a Unit borrows because its ability is similar, or, when that tier has no similar ability, similarly strong. Stone, Bronze, Iron, Modern and Sci-Fi take their Counterparts from SAP tiers 1, 2, 4, 5 and 6.

**Cousin**:
A token Unit that Stone abilities summon during battle. It has no Stage and is gone after the battle.
_Avoid_: Token, summon, minion

**Evolve**:
To move a Unit to its next Stage by merging duplicate copies into it. The Unit stays in its Age, and its ability keeps the same idea with stronger numbers.
_Avoid_: Level up, upgrade, modernize

**Stage**:
One of a Unit's three steps of evolution (1–3). Each Stage has its own name and look.
_Avoid_: Level, rank, tier

### Battle

**Armor**:
A temporary battle status that absorbs incoming damage until it breaks. It is granted by abilities and lasts only for the current battle. Units have no permanent armor stat, only attack and health.
_Avoid_: Shield, defense, block

**Faint**:
Leaving a battle by reaching 0 health. The Unit is back in the Line for the next Round.
_Avoid_: Die, death, kill

### Shop

**Invention**:
A one-time shop item that is applied to a Unit and then used up. Each Age brings its own Inventions (fire, the wheel, penicillin…).
_Avoid_: Food, consumable, item
