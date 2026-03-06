
export interface Theme {
  name: string;
  description: string;
  colors: {
    primary: string[];
    grim: {
      900: string; // Main background
      800: string; // Panel background
      700: string; // Border color
      600: string; // Lighter border / hover
      500: string; // Subtle accent
      accent: string; // Selection / Accent
      gold: string; // Highlight / Gold
    };
    text: {
      primary: string; // Main text
      secondary: string; // Lighter/secondary text
      muted: string; // Muted/placeholder text
    };
  };
}

const grimdarkTheme: Theme = {
  name: "Dark Future",
  description: "High contrast, deep shadows, dark metal.",
  colors: {
    primary: [
      '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
      '#f97316', '#4b5563', '#000000', '#ffffff'
    ],
    grim: {
      900: '#0f172a', 800: '#1e293b', 700: '#334155',
      600: '#475569', 500: '#64748b',
      accent: '#ef4444', gold: '#fbbf24',
    },
    text: {
      primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b'
    },
  },
};

const tacticalArchivesTheme: Theme = {
  name: "Tactical Archives",
  description: "Parchment, ink, and wax seal aesthetics.",
  colors: {
    primary: [
      '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
      '#f97316', '#6b7280', '#000000', '#ffffff'
    ],
    grim: {
      900: '#fdf6e3', 800: '#f5eeda', 700: '#d1c7b3',
      600: '#bfb59e', 500: '#a89f87',
      accent: '#b91c1c', gold: '#ad8e38',
    },
    text: {
      primary: '#0f172a', secondary: '#334155', muted: '#57534e'
    },
  },
};

const ancientAndroidsTheme: Theme = {
  name: "Ancient Androids",
  description: "Dark stone surfaces with eerie green energy.",
  colors: {
    primary: [
      '#ef4444', '#3b82f6', '#4ade80', '#eab308', '#a855f7',
      '#f97316', '#4b5563', '#000000', '#ffffff'
    ],
    grim: {
      900: '#121212', 800: '#1E1E1E', 700: '#2c3a47',
      600: '#3d4f5f', 500: '#506577',
      accent: '#10B981', gold: '#4ade80',
    },
    text: {
      primary: '#e5e7eb', secondary: '#9ca3af', muted: '#4b5563'
    },
  },
};

const scrapRaidersTheme: Theme = {
  name: "Scrap Raiders",
  description: "Rusty scrap metal and warpaint.",
  colors: {
    primary: [
      '#dc2626', '#3b82f6', '#22c55e', '#facc15', '#a855f7',
      '#f97316', '#4b5563', '#000000', '#ffffff'
    ],
    grim: {
      900: '#3d2d24', 800: '#543c32', 700: '#714d41',
      600: '#8a6455', 500: '#a37c6b',
      accent: '#dc2626', gold: '#facc15',
    },
    text: {
      primary: '#f3e8d9', secondary: '#d4c2af', muted: '#9d8f80'
    },
  },
};

const starElvesTheme: Theme = {
  name: "Star Elves",
  description: "Sleek bone constructs and spirit gems.",
  colors: {
    primary: [
      '#ef4444', '#0ea5e9', '#22c55e', '#eab308', '#a855f7',
      '#f97316', '#d1d5db', '#000000', '#ffffff'
    ],
    grim: {
      900: '#0c142b', 800: '#1a233f', 700: '#2d3a5e',
      600: '#3f5078', 500: '#526792',
      accent: '#a855f7', gold: '#0ea5e9',
    },
    text: {
      primary: '#e5e7eb', secondary: '#93c5fd', muted: '#60a5fa'
    },
  },
};

export const themes: Record<string, Theme> = {
  grimdark: grimdarkTheme,
  tacticalArchives: tacticalArchivesTheme,
  ancientAndroids: ancientAndroidsTheme,
  scrapRaiders: scrapRaidersTheme,
  starElves: starElvesTheme,
};

export const defaultTheme = grimdarkTheme;
