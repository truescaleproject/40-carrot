export interface WeaponStats {
  id: string;
  name: string;
  range: string;
  attacks: string;
  skill: string; // BS or WS
  strength: string;
  ap: string;
  damage: string;
  keywords: string;
}

export interface UnitStats {
  m: string;
  t: string;
  sv: string;
  w: string;
  ld: string;
  oc: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
}

export interface UnitCardData {
  id: string;
  name: string;
  baseSize: string;
  points?: string;
  stats: UnitStats;
  rangedWeapons: WeaponStats[];
  meleeWeapons: WeaponStats[];
  abilities: Ability[];
  keywords: string[];
  factionKeywords: string[];
  invuln?: string;
  squadCount?: number;
  modelCount?: number;
  modelsPerSquad?: number[];
  composition?: { modelName: string; count: number }[]; // For CSV round-tripping
  cardLayout?: string; // To specify template preference
}

export interface ParsedArmyListEntry {
  id: string;
  name: string;
  count: number;
  points?: string;
  composition?: { modelName: string; count: number }[];
  isSingleModel?: boolean; // User toggle state
  rawLines?: string[]; // The bullet points under the unit name
}

export interface GenerationResponse {
  units: UnitCardData[];
}
