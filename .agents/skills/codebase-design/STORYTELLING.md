# Storytelling

How an arrangement comes to tell the story of the system. Assumes the vocabulary in [SKILL.md](SKILL.md) — **module**, **arrangement**, **story**, **discoverability**. The material is Eric Evans' MODULES, Vaughn Vernon's elaboration of it, and Michael Feathers' story-of-the-system exercise.

Code speaks through two channels, names and arrangement. When every fact lands in a name and none in a path, the second channel is silent — each word informative, the shape saying nothing.

## Principles

- **Nest to be found, not to be deep.** A parent segment is a navigation aid, nothing more.
- **Shared words are an unborn path.** Sibling names repeating the same words are a family without a house. Gather them into one module named by the shared words; each name keeps only its own word.
- **Group by purpose, not by property.** A kitchen drawer holds place settings — not `pronged`, `scooping` and `blunt` things, and not the sturdy apart from the fragile. A shared technical property is not cohesion.
- **Split for the reader, not for coupling.** Sixty classes in one module read as disorganised; splitting them is worth a relaxed dependency rule between parent and children. A deliberate trade.
- **Modules are part of the model.** Each holds a cohesive set of concepts; its name joins the ubiquitous language.

## The story test

The story is to an arrangement what depth is to a module — the property the whole is judged by, at every scale.

Read the top level alone, without opening anything: a newcomer should be able to say what the system does. Categories drawn from technical architecture or work assignments tell no story — `api`, `lib`, `utils`, `shared` fails however well named the leaves beneath it are.

Feathers' exercise: explain the architecture in two or three concepts to someone who knows nothing. Where simplifying feels like lying, the arrangement does more than its story admits. Between two workable shapes, prefer the one that makes the brief story less of a lie.

## The concatenation test

The story test judges the whole; this one judges one path — a tree can pass every path and still tell no story.

Read the path aloud as one phrase: a family earns its parent when the children read as children. `product.backlogitem`, `product.release`, `product.sprint` pass because the team says product backlog item. If the path spells filing, the parent is decoration.

- **Noise fails.** `identityandaccess` loses to `identityaccess`; the extra words add nothing.
- **Off-language fails.** Brand names map to nothing the team says, and go obsolete the moment marketing renames the product.
- **Conceptual honesty survives.** A segment that disambiguates nothing can still earn its place: `model` stays in `domain.model` because we do not develop a domain; we develop a model of one.

## Fix the model, not the tree

When good names still don't yield low coupling, the missing piece is a concept: find the overlooked one that would gather the elements — often already present piecemeal, under one name, many names, or none.

Arrangement rots quietly, because renaming feels mechanical rather than substantive: teams content themselves with the modules they conceived early. Rename with the same boldness as when creating.
