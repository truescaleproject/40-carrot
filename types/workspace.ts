
export type WorkspaceMode = 'PLAY' | 'BUILD' | 'PAINT';

export interface PaintScheme {
  id: string;
  name: string;
  baseColor: string;
  colors: PaintRole[];
  createdAt: number;
}

export interface PaintRole {
  id: string;
  role: string; // e.g., 'armor', 'cloth', 'trim', 'weapons', 'accents', 'glow', 'lenses'
  color: string;
  label: string;
}

export interface BuildProject {
  id: string;
  unitName: string;
  status: 'planned' | 'building' | 'built' | 'primed' | 'painting' | 'complete';
  notes: string;
  conversionNotes: string;
  image?: string;
  linkedRosterId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BitEntry {
  id: string;
  name: string;
  kitSource: string;
  faction: string;
  quantity: number;
  image?: string;
  tags: string[];
}

export interface KitbashLayer {
  id: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  label: string;
}

export const PAINT_ROLES = [
  { value: 'armor', label: 'Armor' },
  { value: 'cloth', label: 'Cloth/Tabard' },
  { value: 'trim', label: 'Trim/Details' },
  { value: 'weapons', label: 'Weapons' },
  { value: 'accents', label: 'Accents' },
  { value: 'glow', label: 'Glow Effects' },
  { value: 'lenses', label: 'Lenses' },
  { value: 'base', label: 'Base' },
];

export const BUILD_STATUSES = [
  { value: 'planned', label: 'Planned', color: '#94a3b8' },
  { value: 'building', label: 'Building', color: '#f97316' },
  { value: 'built', label: 'Built', color: '#eab308' },
  { value: 'primed', label: 'Primed', color: '#a855f7' },
  { value: 'painting', label: 'Painting', color: '#3b82f6' },
  { value: 'complete', label: 'Complete', color: '#22c55e' },
];
