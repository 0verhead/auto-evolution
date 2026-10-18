# Auto Evolution

An auto-battler in the style of Super Auto Pets, themed on human history. Players build a five-unit line from Units of different historical Ages and evolve them by merging duplicates.

## Language

### Run structure

**Run**:
One full game, from the first Round until the player reaches 10 wins or runs out of lives.
_Avoid_: Match, game, session

**Round**:
One shop phase followed by one battle. Ages unlock by Round number.
_Avoid_: Turn

**Line**:
The player's five slots, ordered front to back, where their Units stand.
_Avoid_: Team, board, army, lineup

**Ghost**:
A saved Line from a particular Round that another player fights asynchronously. A real player or a bot can create it, and the game treats both the same.
_Avoid_: Opponent team, enemy, AI team

### Units and progression

**Unit**:
A fighter the player owns, occupying one slot in their line. Each Unit belongs to exactly one Age for its whole life.
_Avoid_: Pet, card, minion, champion

**Age**:
One step of the shared historical timeline (Stone, Bronze, Iron, Modern, Sci-Fi). A new Age unlocks for every player in a set round and adds its Units to the shop. Units of later Ages are stronger, so older Units earn a place in a late line as supporters rather than fighters.
_Avoid_: Era, tier, epoch

**Specialty**:
The one kind of effect an Age's Units are best at, taken from what that Age is famous for in history: Numbers (Stone), Patience (Bronze), Formation (Iron), Industry (Modern), Rule-breaking (Sci-Fi).
_Avoid_: Trait, synergy, class

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
