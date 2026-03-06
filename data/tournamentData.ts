

export const TOURNAMENT_MISSION_SEQUENCE = `
CHAPTER APPROVED TOURNAMENT MISSION SEQUENCE (Version 1.5)

1. MUSTER ARMIES
Muster armies as described in the Core Rules.
Incursion Missions:
- Up to two units with each datasheet name (four if BATTLELINE or DEDICATED TRANSPORT).
- Up to one TITANIC CHARACTER.

2. DETERMINE MISSION
Use pre-generated missions from the Chapter Approved Tournament Mission Pool.
Secondary Mission deck is set aside.

3. READ MISSION
Read the Primary Mission conditions.
Twist cards and Challenger cards will not be used.

4. PLACE OBJECTIVE MARKERS
Set up objective markers as shown on the Deployment card.
Markers are treated as flat, circular markers 40mm in diameter. Models can move over them.

5. CREATE THE BATTLEFIELD
Set up terrain features (approx 44" by 60").
Use the Terrain Layouts (1-8) guidelines.

6. DETERMINE ATTACKER AND DEFENDER
Roll off. Winner chooses to be Attacker or Defender.

7. SELECT SECONDARY MISSIONS
Secretly note Fixed or Tactical Missions.
- Fixed: Select 2 cards. (Note: "No Prisoners" cannot be selected as Fixed).
- Tactical: Shuffle deck. Draw 2 cards at start of Command Phase.

8. DECLARE BATTLE FORMATIONS
Secretly note attached Leaders, Transports, and Reserves.
Reserves Restrictions:
- Max 50% of units/points in Reserves.
- Reserves cannot arrive Turn 1 (except Strategic Reserves rule exceptions).
- Units not arrived by end of Turn 3 are destroyed.

9. DEPLOY ARMIES
Start with Defender. Alternate setting up units.
Titanic units skip a turn if set up.

10. REDEPLOY UNITS
Resolve redeployment rules (Attacker first).

11. DETERMINE FIRST TURN
Roll off. Winner takes first turn.

12. RESOLVE PRE-BATTLE RULES
Alternate resolving pre-battle rules (First Turn player starts).

13. BEGIN THE BATTLE
Play 5 Battle Rounds.

14. END THE BATTLE
Battle ends after Round 5.

15. DETERMINE VICTOR
Score VP (Max 100VP total).
- Primary: Max 50VP.
- Secondary: Max 40VP.
- Battle Ready: 10VP.
`;

export const TOURNAMENT_MISSION_POOL = `
CHAPTER APPROVED TOURNAMENT MISSION POOL (Version 1.5)

Mission | Primary Mission | Deployment | Terrain Layouts
A | Take and Hold | Tipping Point | 1, 2, 4, 6, 7, 8
B | Supply Drop | Tipping Point | 1, 2, 4, 6, 7, 8
C | Linchpin | Tipping Point | 1, 2, 4, 6, 7, 8
D | Scorched Earth | Tipping Point | 1, 2, 4, 6, 7, 8
E | Take and Hold | Hammer and Anvil | 1, 7, 8
F | Hidden Supplies | Hammer and Anvil | 1, 7, 8
G | Purge the Foe | Hammer and Anvil | 1, 7, 8
H | Supply Drop | Hammer and Anvil | 1, 7, 8
I | Hidden Supplies | Search and Destroy | 1, 2, 3, 4, 6
J | Linchpin | Search and Destroy | 1, 2, 3, 4, 6
K | Scorched Earth | Search and Destroy | 1, 2, 3, 4, 6
L | Take and Hold | Search and Destroy | 1, 2, 3, 4, 6
M | Purge the Foe | Crucible of Battle | 1, 2, 4, 6, 8
N | Hidden Supplies | Crucible of Battle | 1, 2, 4, 6, 8
O | Terraform | Crucible of Battle | 1, 2, 4, 6, 8
P | Scorched Earth | Crucible of Battle | 1, 2, 4, 6, 8
Q | Supply Drop | Sweeping Engagement | 3, 5
R | Terraform | Sweeping Engagement | 3, 5
S | Linchpin | Dawn of War | 5
T | Purge the Foe | Dawn of War | 5
`;

export const TERRAIN_GUIDELINES = `
TERRAIN LAYOUTS (Version 1.5)

The following layouts are designed for balanced tournament play.

Recommended Measurements:
- 6" x 4" (Quantity: 4)
- 10" x 5" (Quantity: 2)
- 12" x 6" (Quantity: 6)

Guidelines:
- Ruins > 4" Height: Blocks visibility significantly.
- Ruins < 2" Height: Provides cover but less obstruction.
- Objective Markers: May be hidden within terrain or in the open.
- Charge Phase: Models cannot move through solid walls; charge rolls must be sufficient to clear terrain features if engaging through them is impossible.
`;

export const BASE_SIZE_GUIDE = `
BASE SIZE GUIDE (Last Updated: February 2026)

The following is a summary of standard base sizes for matched play.
If a specific unit is not listed, assume the base supplied with the current model kit.

INFANTRY
- 25mm: Light Infantry (Guardsmen, Cultists, Gaunts, Gretchin)
- 28.5mm: Specialized Light Infantry (Eldar Guardians, Sisters of Battle, Neophyte Hybrids)
- 32mm: Standard Infantry (Space Marines, Orks, Necron Warriors, Chaos Marines)
- 40mm: Heavy Infantry/Terminators (Terminators, Custodes, Meganobz, Wraiths)
- 50mm: Characters/Centurions (Captains, Tyranid Warriors, Eightbound)

MOUNTED & BIKES
- 60x35mm Oval: Cavalry (Rough Riders, Seekers, Hounds)
- 75x42mm Oval: Bikes (Outriders, Ravenwing, Windriders)
- 90x52mm Oval: Heavy Cavalry/Chariots (Squighog Boyz, Skullmaster)

WALKERS & MONSTERS
- 60mm: Light Walkers (Sentinels, War Walkers, Deff Dreads)
- 80mm: Medium Monsters (Screamer-Killer, Daemon Prince, Contemptor)
- 90mm: Heavy Walkers (Redemptor Dreadnought, Invictor)
- 100mm: Large Monsters (Great Unclean One, Angron, Mortarion, Magnus)
- 120x92mm Oval: Large Flyers/Monsters (Stormraven, Archaeopter, Maulerfiend)
- 130mm: Massive Walkers (Onager Dunecrawler)
- 160mm: Behemoths (Soul Grinder, Stormsurge)
- 170x109mm Oval: Knights (Questoris, Cerastus, Gorkanaut)

VEHICLES
- Hull: Most Tanks (Leman Russ, Rhino, Land Raider, Baneblade)
- Note: Always measure to/from the hull for vehicles without bases.
`;

export const TOURNAMENT_INFO_FULL = `
${TOURNAMENT_MISSION_SEQUENCE}

${TOURNAMENT_MISSION_POOL}

${TERRAIN_GUIDELINES}

${BASE_SIZE_GUIDE}
`;
