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

## Round 2: retest after the round 1 fixes

Same method: 4 persona bots × 400 seeds, plus Playwright tapping through the real UI (phone, desktop, and a full careful run that reaches the win screen).

### Persona verdicts
- **Casual (first 2 minutes):** Day 1 now fits a phone screen. A coach box says "tap a Haul button at the bottom," and the dock packs for you. One tap ends day 1, so this is fixed.
- **Deckbuilder fan:** burning cards for a boost against the Mounties' weight count makes the deck matter. With auto-pack still placing the tarp and rifle smartly, though, a default-tapping casual won 58% vs the optimizer's 46%. *Decisions still didn't beat defaults.*
- **Strategy/history fan:** liked the consequence lines under the Haul buttons. The Sheep Camp event gave the con away in its own text ("Soapy Smith's gang runs this con"), so it wasn't a real choice.
- **Streamer:** avalanche moments land. Stale toasts piled up and covered the screen after a bad night, which killed the moment. A run could also end at the Mounties with no move left (short on weight, no cash), which felt like a dead end after 25 minutes.

### Round 2 fixes
1. **Auto-pack no longer places the tarp or rifle for you.** That's your decision now, and a coach tip warns when your food up the trail is uncovered while the tarp sits with you. Result: careful play wins far more than default tapping (46-48% vs 18% before the balance pass below).
2. Sheep Camp became a historically grounded **miners' court** dilemma (−2 stamina vs theft halved for 10 days). Soapy Smith's "telegraph office" moved to a separate Dyea event with real uncertainty (25% it actually works).
3. Toasts capped at 3 and cleared on each action.
4. **No dead ends:** a new "Pack for others" action trades a day and 3 stamina for $10, and the Mounties offer "Not yet" so you can earn the shortfall before winter.
5. Avalanches made less frequent (5 per run in one test → about 1.3), with the snow meter still telegraphing them.
6. Balance: the pass closes after day 36 (was 40). Summit quitters cost $25 per 50 lb. Characters rebalanced so careful play wins about the same with each: Greenhorn $280/11 stamina (marked as the first-run pick), Sourdough $140/12 stamina/+1 load, Partners $130/+2 loads/eat double.

## Round 3: final retest (current build)

| Persona (simulated) | Win rate | Avg days | Decisions per run | Main way to lose |
|---|---|---|---|---|
| Strategy/history fan (careful, protects caches, works when short) | 82% | 32 | ~49 | Short at the summit |
| Roguelite/deckbuilder fan (aggressive upgrades, burns cards) | 58% | 35 | ~59 | Winter (overspends days) |
| Casual (taps Haul, takes the first option) | 39% | 30 | ~41 | Short at the summit, or a failed bribe |
| Streamer (fast, gambles, always bribes) | 26% | 36 | ~67 | A failed bribe (about 1 in 3 works, and it's labeled) |

UI check: 3 Playwright runs (phone, desktop, careful-to-win), 0 console errors. Each run reaches the end screen, and "One more run" returns to character select.

Run length: about 30-36 in-game days and 40-65 taps on decisions, an estimated 10-15 minutes for a human reading the events. On target.

### Still needs real human playtesting (bots can't judge these)
- **Is hauling fun after day 10?** Bots don't get bored. The middle legs could feel repetitive. Watch for players spamming the Haul button without reading.
- **Do the risk percentages read as "my fault" or "dice"?** The design assumes the telegraphing works.
- **Difficulty for real first-timers.** Bots know every rule. Humans will probably sit between "casual" (39%) and "careful" (82%), but a first run could be much lower.
- **Is burning cards tempting or ignored?** Bots burn only by rule.
- **"One more run" pull.** There's no meta-progression yet: only 3 characters, seeds and a best score.
- Phone ergonomics with real thumbs: the +/− buttons are small.

---

# Visual pass: first impression (after Bryan's "looks cheap and boring" on the title/load screen)

Scope set by Bryan: fix the first 10 seconds and the art direction. Loop changes stay modest, and **game rules are unchanged** (sim results identical within noise: careful 81%, aggressive 61%, casual 37%, gambler 26%).

Method: the same 4 SIMULATED personas judged phone (390×844) and desktop screenshots of the real build, frame by frame, against what the title/menu screens of Slay the Spire, Balatro and Inscryption are known for:
- **Slay the Spire:** a clear painted logo over a living scene, with a single obvious button.
- **Balatro:** constant motion and juice. Cards are visible immediately, so you know the genre in a second.
- **Inscryption:** a moody, mysterious mood, period texture and sound design that sets the tone before you click.

These are comparisons from memory of those games' well-known title screens. I did not capture fresh store screenshots.

## Visual round 1: first art pass
Changes: painted key art (a line of stampeders on the Golden Stairs in a storm, with separate wide and tall crops), a gold Rye-type logo with a staged reveal, a one-line hook ("The Mounties demand a ton. You can carry fifty pounds."), slow camera drift, canvas snowfall, synthesized ambient wind plus Kenney CC0 SFX, painted character portraits, engraved card illustrations, parchment UI, period fonts, screen shake and rumble on avalanches, floating ±lb numbers, a brass weight gauge, and ADMITTED / TURNED BACK / SNOWED IN stamps.

| Persona (simulated) | Verdict | Top complaint |
|---|---|---|
| Casual Steam browser (decides in 2 min) | "This looks like a real game now." The hook line is understood instantly | The button appears only after 2+ seconds of fades |
| Roguelite/deckbuilder fan | Mood and logo are on par with Inscryption-tier indies | "Nothing says *card game*. Balatro shows cards immediately." |
| Strategy/history fan | Loves the period type, portraits and Tlingit/Mountie framing | In game, emoji icons (🦝⛺💪) clash with the engraved style and break the period feel |
| Streamer | The storm and the line of climbers is a strong thumbnail | The snow canvas was hidden behind the art (bug). The ribbon covered the Greenhorn's name on phone. The mute button overlapped the status bar |

## Visual round 2: fixes and retest
Fixes: snow moved above the art. A fanned hand of three engraved 50 LB cards deals in under the logo, so the genre reads in about 1 second. The reveal is faster (button by about 1.3 s). Every emoji in the game UI was replaced with text, engraved mini-icons and a drawn snow meter. Fixed the ribbon, the flavor font and the mute position. The phone gauge text no longer overflows. Desktop has a two-column layout (trail left, actions right) with the painted background showing through. Removed backdrop blur for phone performance.

| Persona (simulated) | Verdict now | What's still missing |
|---|---|---|
| Casual browser | Would click. Art, hook and button all read in the first 5 seconds | Still a menu-heavy game screen once inside |
| Deckbuilder fan | The card fan sells the genre, and the engraved cards look like a period catalogue | In game, cards are tiles with +/−, not a hand you play. No card animations yet beyond pop/float |
| Strategy/history fan | Cohesive: painted world, engraved goods, parchment UI | Wants a map illustration for the trail instead of stacked rows |
| Streamer | The title would make a good thumbnail. Avalanche shake and rumble give a reaction moment | No music, only wind. The in-game screen is static between hauls |

**Honest gap vs. the comps:** the title screen is now in the same visual tier as a polished indie. The in-game screen is styled but still a structured menu: there's no animated card play like Balatro or Slay the Spire, no illustrated map, and no music. That is the next pass after Bryan plays the loop.

Screenshots: `shots/title-phone.png`, `shots/title-desktop.png`, `shots/select-phone.png`, `shots/select-desktop.png`, `shots/game-phone.png`, `shots/game-desktop.png`.
