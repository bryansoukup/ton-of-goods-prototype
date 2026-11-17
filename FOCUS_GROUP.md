# Ton of Goods prototype: focus-group log

All "players" below are SIMULATED personas (scripted bots plus a careful walkthrough of the real build).
They are not real people. Their job is to catch obvious problems before Bryan and real testers play.

## Round 0: design critique before coding

Recurring Steam review themes for the comparable games (well-known praise and complaint patterns, summarized from memory, not freshly scraped):

| Game | Players praise | Players complain about |
|---|---|---|
| Slay the Spire | Enemy "intents" show what is coming, so losses feel like your fault; every card pick matters; short acts | RNG streaks; Act 3 or Heart spikes; can feel samey after many runs |
| Balatro | Clear in 30 seconds; numbers going up feel great; "one more run"; discovering combos | Late-game RNG; some runs are dead early with nothing to do about it |
| FTL | Constant tension; tough event choices; emergent stories | Unfair early deaths from one bad event; brutal RNG |
| Death Road to Canada | Funny emergent stories; chaotic, shareable moments | Repetitive; RNG wipes out a good run |
| Organ Trail | Nostalgia and humor; shareable deaths | Short; thin choices; repetitive travel |
| Keep Driving | Vibe; road-trip choices; characters | Slow pace; menu-heavy; mechanics not explained well |
| Inscryption | Novelty and mystery; a clear hook | Later acts weaker than the first |

### What this means for Ton of Goods
1. **Biggest risk: tedium.** 2,000 lb, 50 lb at a time, over 4 legs is 160 trips. The game must never ask for one tap per 50 lb trip. Fix: one day = one decision; each day you make several 50 lb trips (your "loads"), with an Auto-pack button.
2. **Telegraph risk, like Slay the Spire intents.** Each camp shows tonight's theft %, avalanche % and storm exposure, so losses read as "my call," not "the dice hate me."
3. **No unfair early deaths, unlike FTL.** No theft on days 1-2. Avalanches only after snow builds up, with the buildup shown.
4. **The cache decision is the core.** Where you sleep is guarded and everything else is exposed. Cards should matter by where they sit: a tent or stove where you sleep restores stamina, a tarp protects a cache, a rifle halves theft at a cache, snowshoes in your pack add loads on snowy legs.
5. **Balatro-style clarity.** Show the goal and a 2,000 lb progress meter on screen at all times, and explain each verb in one line.
6. **Real roguelite choices.** Pick a character at the start (different cash and stamina), then outfitter, packer, tramway and bribe decisions that trade money against days, plus random event choices.
7. **Shareable moments (Death Road, Organ Trail).** Big avalanches, Soapy Smith's con men, and a tense Mountie inspection at the top.
8. **"One more run."** A fast end screen, a best score, a seed and an instant restart.

## Round 1: first playable build (commit after "UI v1")

How the test was run: 4 persona bots × 300 seeds against the real game logic (`npm run sim`), plus Playwright tapping through the real UI on a phone (390×844) and a desktop, with screenshots reviewed screen by screen.

| Persona | Win rate | Avg days | Decisions per run | Notes |
|---|---|---|---|---|
| Roguelite/deckbuilder fan (optimizes, guards, packers, tram) | 48% | 37.8 | ~59 | Wins come from caching smartly. Losses split between winter and running short |
| Strategy/history fan (Sourdough, cautious) | 47% | 30 | ~53 | Over-resting cost days before Sourdough got +1 load |
| Casual browser (taps Haul, takes defaults) | 45% | 33 | ~43 | Nearly as good as the optimizer: **defaults are too strong, so decisions add too little** |
| Streamer (fast, gambles, bribes) | 32% | 34 | ~65 | Most wins via the Mountie bribe coin flip. Best clip moments: an avalanche burying 18 loads, thieves, the bribe |

Balance bugs fixed during the round: auto-pack used to strip all food from the camp you sleep in (instant starvation). The watchman charged every night, even while you were there. Character balance was off (Sourdough won 7% vs Greenhorn 48% because cash dominated).

### Persona verdicts
- **Casual (first 2 minutes):** the title screen is clear. On day 1, though, the Haul buttons sit below a 17-card wall on a phone and stay disabled until you pack. *Likely bounce.*
- **Deckbuilder fan:** "This is inventory, not a deck. Food cards are identical and only about 6 cards do anything. Where's the burn-a-card-for-power decision?"
- **Strategy/history fan:** loves the Tlingit packers, Soapy Smith, the tramway and the Mountie rule. Wants each Haul button to say what it leaves exposed: "walk back vs camp up" doesn't show the consequence.
- **Streamer:** avalanches and the bribe are clip moments. But a whole run ending on an unlabeled coin flip feels cheap, so show the odds.
- **Run length:** 33-38 in-game days and 45-65 decisions, roughly 8-15 minutes. On target.

### Round 1 fixes (top issues)
1. Sticky bottom action bar (Auto-pack, Haul + walk back, Haul + camp up). Haul auto-packs when the pack is empty.
2. Compact card grid: descriptions only on cards that do something, and shorter camp rows.
3. Each Haul button states its consequence: how many loads it leaves behind, where, and the theft risk.
4. **Burnable supplies:** many cards can be used up for an effect (coffee or dried fruit = stamina, bacon feast, sell pans, rope & pulley for extra loads on the Stairs), and every burn costs weight you need for the Mounties. This is the deck's core tension.
5. Bribe odds shown, plus a live Mountie preview at the summit.
