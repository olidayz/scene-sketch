export const MONSTER_SCRIPT=`MONSTER BESTIE
Parent’s phone footage. Handheld, natural light, no music.

1 — HOOK
A terrifying alien sits at a tiny pink tea table while a little girl adjusts a princess tiara on its head. Neither notices the camera.
GIRL: “You’re a princess now, and I’m a princess too.”
ALIEN: [Groans]
Cut.

2 — BUILD · Parent edges closer
GIRL: “Drink your tea slowly, pinky up!”
The alien lifts the tea cup, slowly, then swallows it whole.

3 — PAYOFF · Hold the same shot
The girl is stunned then starts laughing hysterically.
Pan to the alien eating the entire tea set piece by piece.
Cut.`;
export const MONSTER_CONTINUITY='A large charcoal-gray alien with pebbled organic skin, an elongated head, large glossy dark eyes and long arms, wearing a little pink princess tiara. A little girl in a pink long-sleeved top and patterned trousers. Tiny pink tea table with toy cups and teapot in a sunlit ordinary living room. Parent holding a phone, candid vertical footage, natural light.';
export const MONSTER_SHOTS=[
 {title:'01 / Hook — Princess duties',action:'A terrifying charcoal-gray alien with large glossy eyes sits at a tiny pink tea table. A little girl carefully adjusts a pink princess tiara on its elongated head. The alien stays very still and groans softly. Neither notices the parent filming.',camera:'Vertical parent’s phone footage. Handheld medium wide shot from the doorway. Natural afternoon window light. One continuous shot.',dialogue:'Girl: “You’re a princess now, and I’m a princess too.” Alien groans. No music.'},
 {title:'02 / Build — Pinky up',action:'The same charcoal-gray alien wearing a pink tiara sits at the tiny pink tea table with the little girl. It raises a tiny teacup slowly with one long finger extended, then opens its mouth and swallows the whole cup.',camera:'The parent edges closer with the phone. Handheld medium shot; keep girl, alien and cup visible. Natural light. No cut.',dialogue:'Girl: “Drink your tea slowly, pinky up!” Quiet room tone, ceramic clink. No music.'},
 {title:'03 / Payoff — Tea is served',action:'The little girl stares in stunned silence at the empty space where the teacup was, then starts laughing hysterically. The parent pans to the charcoal-gray alien in the pink tiara casually eating the remaining toy tea set piece by piece.',camera:'Continue the same handheld phone recording. Hold on the reaction, then pan to the alien. Natural light, vertical framing. No cut within the shot.',dialogue:'The girl laughs hysterically. Crunching tea set. No music.'}
];
export const MONSTER_PANELS=[
 {...MONSTER_SHOTS[0],id:'monster-hook',title:'Hook / The princess',action:'The girl adjusts the tiara on the terrifying alien’s head at the tiny tea table.'},
 {...MONSTER_SHOTS[1],id:'monster-approach',title:'Build / A closer look',action:'The parent edges closer. Girl points at the tiny teacup in front of the alien.'},
 {...MONSTER_SHOTS[1],id:'monster-pinky',title:'Build / Pinky up',action:'The alien delicately raises the little teacup with one long finger extended.'},
 {...MONSTER_SHOTS[1],id:'monster-gulp',title:'Build / Wrong technique',action:'The alien’s mouth closes around the whole teacup. The girl stares.'},
 {...MONSTER_SHOTS[2],id:'monster-laugh',title:'Payoff / The reaction',action:'The girl bends over laughing hysterically beside the tiny tea table.'},
 {...MONSTER_SHOTS[2],id:'monster-feast',title:'Payoff / The rest of the set',action:'The alien casually bites into the toy teapot. The girl is laughing beside it.'}
];
