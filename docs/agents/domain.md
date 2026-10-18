# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. This repository uses a single domain context.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If either is missing, **proceed silently**. Don't flag its absence or suggest creating it upfront. The `/domain-modeling` skill creates domain documentation lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
└── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (see [Gaps and conflicts](#gaps-and-conflicts)).

## Gaps and conflicts

A gap or conflict in the glossary or an ADR — a missing or outgrown term, an unrecorded decision, a change that contradicts a decision — quietly corrupts otherwise correct work. Never coin language, never silently override; name it in your output:

> _"Level" isn't in the glossary — the closest term is Stage, which is what this project calls it…_
>
> _Contradicts ADR-0001 (evolution stays within an Age) — but worth reopening because…_

Then escalate by developer presence:

- **Developer in the loop** — invoke `/domain-modeling` now: settle it together and land the doc update in the same change — define or sharpen the term; record, update, or supersede the decision.
- **Working AFK** — record it on the driving issue or PR, never resolve it alone. If the work can't proceed without the answer, stop — a ticket that needs a domain decision was not ready for an agent.
