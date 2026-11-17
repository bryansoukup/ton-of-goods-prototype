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
