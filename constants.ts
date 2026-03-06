
/**
 * LEGAL/IP COMPLIANCE GUIDELINES
 * 
 * Note to Contributors:
 * No future feature should copy or auto-fill official rules text or full datasheet wording 
 * from any proprietary game, even if technically possible. AI features may help users 
 * structure their own data, but the app should not be tuned or used to reproduce 
 * proprietary rules verbatim. This note should guide contributors as the app evolves.
 */

import { ModelStats } from './types';

export const APP_VERSION = '1.0.0-beta';

// Global Layout Constants
export const BOARD_OFFSET = 100; // Padding around the board in pixels
export const SCALE_PIXELS_PER_INCH = 25.4; // 1 inch = 25.4mm

export const WEAPON_MODIFIER_DEFINITIONS: Record<string, { name: string, description: string, hasValue: boolean, hasKeyword: boolean }> = {
  ASSAULT: {
    name: 'Assault',
    description: 'Can shoot after advancing.',
    hasValue: false,
    hasKeyword: false
  },
  RAPID_FIRE: {
    name: 'Rapid Fire',
    description: '+\'x\' to attacks when targeting units within half range.',
    hasValue: true,
    hasKeyword: false
  },
  IGNORES_COVER: {
    name: 'Ignores Cover',
    description: 'Targets do not gain the benefit of cover.',
    hasValue: false,
    hasKeyword: false
  },
  TWIN_LINKED: {
    name: 'Twin-Linked',
    description: 'Re-roll wounds.',
    hasValue: false,
    hasKeyword: false
  },
  PISTOL: {
    name: 'Pistol',
    description: 'Can shoot within Engagement Range, but must target engaged unit. Cannot be shot alongside other weapons.',
    hasValue: false,
    hasKeyword: false
  },
  TORRENT: {
    name: 'Torrent',
    description: 'Attacks automatically hit.',
    hasValue: false,
    hasKeyword: false
  },
  LETHAL_HITS: {
    name: 'Lethal Hits',
    description: 'Critical hits automatically wound.',
    hasValue: false,
    hasKeyword: false
  },
  LANCE: {
    name: 'Lance',
    description: '+1 to wound after making a charge move.',
    hasValue: false,
    hasKeyword: false
  },
  INDIRECT_FIRE: {
    name: 'Indirect Fire',
    description: 'Can target units that are not visible to the attacker with -1 to hit and the target gains the benefit of cover.',
    hasValue: false,
    hasKeyword: false
  },
  PRECISION: {
    name: 'Precision',
    description: 'Can choose to allocate wounds to a units leader model.',
    hasValue: false,
    hasKeyword: false
  },
  BLAST: {
    name: 'Blast',
    description: 'Add 1 attack per 5 models in target unit. Cannot target a unit in engagement range of allied unit.',
    hasValue: false,
    hasKeyword: false
  },
  MELTA: {
    name: 'Melta',
    description: '+\'x\' to damage when targeting units within half range.',
    hasValue: true,
    hasKeyword: false
  },
  HEAVY: {
    name: 'Heavy',
    description: '+1 to hit if the bearer remained stationary.',
    hasValue: false,
    hasKeyword: false
  },
  HAZARDOUS: {
    name: 'Hazardous',
    description: 'After attacking, roll a D6 for each hazardous weapon. For each 1, destroy one model. (Characters, Monster and Vehicles suffer 3 mortal wounds)',
    hasValue: false,
    hasKeyword: false
  },
  DEVASTATING_WOUNDS: {
    name: 'Devastating Wounds',
    description: 'Critical wounds inflict mortal wounds instead.',
    hasValue: false,
    hasKeyword: false
  },
  SUSTAINED_HITS: {
    name: 'Sustained Hits',
    description: 'Critical hits score \'x\' additional hits.',
    hasValue: true,
    hasKeyword: false
  },
  EXTRA_ATTACKS: {
    name: 'Extra Attacks',
    description: 'Can fight with this weapon in addition to other weapons.',
    hasValue: false,
    hasKeyword: false
  },
  ANTI: {
    name: 'Anti',
    description: 'Wound rolls of \'x+\' score a critical wound against targets with the specified keyword.',
    hasValue: true,
    hasKeyword: true
  }
};

export const DEFAULT_MODEL_STATS: ModelStats = {
  m: '6"',
  t: '4',
  sv: '3+',
  w: '2',
  ld: '6+',
  oc: '1',
  weapons: [
    {
      id: 'default-weapon-1',
      name: 'Laser Carbine',
      type: 'RANGED',
      range: '24"',
      a: '2',
      skill: '3+',
      s: '4',
      ap: '-1',
      d: '1',
      modifiers: []
    },
    {
      id: 'default-weapon-2',
      name: 'Combat Knife',
      type: 'MELEE',
      range: 'M',
      a: '3',
      skill: '3+',
      s: '4',
      ap: '0',
      d: '1',
      modifiers: []
    }
  ]
};

export const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#f97316', // Orange
  '#4b5563', // Dark Grey (Terrain Default)
  '#000000', // Black
  '#ffffff', // White
  // Earth Tones
  '#78350f', // Amber-900 (Dark Brown)
  '#a16207', // Yellow-800 (Ochre)
  '#57534e', // Stone-600 (Warm Grey)
  '#44403c', // Stone-700 (Dark Warm Grey)
  '#3f6212', // Lime-800 (Drab Green)
  '#14532d', // Green-900 (Forest Green)
  '#7f1d1d', // Red-900 (Dark Red/Rust)
  '#7c2d12', // Orange-900 (Burnt Orange)
];
