
export enum ElementType {
  MODEL = 'MODEL',
  TERRAIN = 'TERRAIN',
  ZONE = 'ZONE',
  OBJECTIVE = 'OBJECTIVE',
  TEXT = 'TEXT',
}

export type WeaponType = 'MELEE' | 'RANGED';

export interface WeaponModifier {
  id: string;
  type: string; // Key from WEAPON_MODIFIER_DEFINITIONS
  value?: string; // The 'x' value (e.g., "2", "D6")
  keyword?: string; // For Anti-KEYWORD
}

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  range: string; // "M" for Melee or distance
  a: string; // Attacks
  skill: string; // WS for Melee, BS for Ranged
  s: string; // Strength
  ap: string; // Armor Penetration
  d: string; // Damage
  modifiers?: WeaponModifier[];
}

export interface ModelStats {
  m: string; // Movement
  t: string; // Toughness
  sv: string; // Save
  w: string; // Wounds
  ld: string; // Leadership
  oc: string; // Objective Control
  weapons: Weapon[];
}

export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  strokeColor?: string; // Color of the base rim/stroke (Unit Color)
  image?: string; // Data URL
  stats?: ModelStats;
  notes?: string;
  groupId?: string; // ID for grouping units together
  groupLabel?: string; // Name of the group
  currentWounds?: number; // Tracker for current wounds
  side?: 'ATTACKER' | 'DEFENDER'; // Side assignment
  locked?: boolean; // If true, prevents dragging/interaction
  shape?: 'CIRCLE' | 'RECTANGLE'; // Shape override
  // Text formatting (TEXT elements only)
  fontSize?: number; // px, default 18
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export interface DrawingLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label?: string; // Distance
  isDeployment?: boolean; // If true, subject to closed-shape validation
  isArrow?: boolean; // If true, render an arrowhead at the end
}

export interface DeploymentZone {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  side: 'ATTACKER' | 'DEFENDER';
  boardIndex?: number;
}

export interface Die {
  id: string;
  value: number;
  selected: boolean;
}

export enum InteractionMode {
  SELECT = 'SELECT',
  PAN = 'PAN',
  DRAW = 'DRAW',
  MEASURE = 'MEASURE',
  DEPLOYMENT = 'DEPLOYMENT',
  ARROW = 'ARROW',
  TEXT = 'TEXT',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AiDeploymentItem {
  name: string;
  type: 'MODEL' | 'TERRAIN';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
}

export interface TerrainMapSave {
  name: string;
  version: string;
  boardWidth: number;
  boardHeight: number;
  terrain: BoardElement[];
}

export interface ViewportInfo {
  center: { x: number; y: number };
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  scale: number;
  pixelsPerInch: number;
  pan?: { x: number; y: number };
}

// --- App Settings ---
export interface AppSetting {
  id: keyof AppSettings;
  label: string;
  description: string;
  type: 'toggle' | 'slider' | 'select' | 'action';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface AppSettings {
  labelFontSize: number;
  showCoherencyAlerts: boolean;
  theme: string;
  displayMode: 'desktop' | 'projector';
  showQuickMenu: boolean;
  aiFeaturesEnabled: boolean;
}