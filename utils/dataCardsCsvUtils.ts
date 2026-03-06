import { UnitCardData, WeaponStats } from '../types/dataCards';

// Unified Roster CSV v1 Headers
const HEADERS = {
  UNIT_NAME: 'Unit Name',
  MODEL_NAME: 'Model Name',
  SQUAD_COUNT: 'Squad Count',
  SQUAD_SIZE: 'Squad Size', // Models per squad
  POINTS: 'Points',
  ROLE: 'Role',
  M: 'M',
  T: 'T',
  SV: 'SV',
  W: 'W',
  LD: 'LD',
  OC: 'OC',
  INVULN: 'Invuln',
  BASE_SIZE: 'Base Size',
  KEYWORDS: 'Keywords',
  FACTION_KEYWORDS: 'Faction Keywords',
  ABILITIES: 'Abilities',
  CARD_LAYOUT: 'Card Layout',
  // Weapon headers are dynamic: W1 Name, W1 Profile, etc.
};

const ESCAPE_REGEX = /[,"\n\r]/;

const escapeCol = (val: any): string => {
  const str = String(val ?? '').trim();
  if (ESCAPE_REGEX.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Helper to serialize weapon for dedupe
const getWeaponSignature = (w: WeaponStats, type: string) => {
  return `${w.name}|${type}|${w.range}|${w.attacks}|${w.skill}|${w.strength}|${w.ap}|${w.damage}|${w.keywords}`;
};

export const generateCSV = (units: UnitCardData[]): string => {
  if (!units.length) return '';

  // 1. Determine max weapons for dynamic columns
  let maxWeapons = 0;
  units.forEach(u => {
    const count = (u.rangedWeapons?.length || 0) + (u.meleeWeapons?.length || 0);
    if (count > maxWeapons) maxWeapons = count;
  });
  if (maxWeapons < 1) maxWeapons = 1;

  // 2. Build Header Row
  const headerRow = [
    HEADERS.UNIT_NAME, HEADERS.MODEL_NAME, HEADERS.SQUAD_COUNT, HEADERS.SQUAD_SIZE,
    HEADERS.POINTS, HEADERS.ROLE, HEADERS.M, HEADERS.T, HEADERS.SV, HEADERS.W,
    HEADERS.LD, HEADERS.OC, HEADERS.INVULN, HEADERS.BASE_SIZE, HEADERS.KEYWORDS,
    HEADERS.FACTION_KEYWORDS, HEADERS.ABILITIES, HEADERS.CARD_LAYOUT
  ];

  for (let i = 1; i <= maxWeapons; i++) {
    headerRow.push(`W${i} Name`, `W${i} Type`, `W${i} Profile`, `W${i} Traits`);
  }

  // 3. Build Data Rows
  const csvRows: string[] = [headerRow.join(',')];

  units.forEach(u => {
    const allWeapons: { w: WeaponStats, type: 'RANGED' | 'MELEE' }[] = [];
    u.rangedWeapons.forEach(w => allWeapons.push({ w, type: 'RANGED' }));
    u.meleeWeapons.forEach(w => allWeapons.push({ w, type: 'MELEE' }));

    const abilitiesStr = u.abilities.map(a => a.description ? `${a.name}: ${a.description}` : a.name).join(' | ');
    const keywordsStr = u.keywords.join(', ');
    const factionKeywordsStr = u.factionKeywords.join(', ');
    const totalSquads = u.squadCount && u.squadCount > 0 ? u.squadCount : 1;

    let composition = u.composition;
    if (!composition || composition.length === 0) {
      const totalModels = u.modelsPerSquad ? u.modelsPerSquad.reduce((a, b) => a + b, 0) : (u.modelCount || 1);
      composition = [{ modelName: u.name, count: totalModels }];
    }

    for (let i = 0; i < totalSquads; i++) {
        const isMultiple = totalSquads > 1;
        const suffix = isMultiple ? ` ${String.fromCharCode(65 + (i % 26))}` : '';
        const unitName = u.name + suffix;

        composition.forEach((compItem) => {
            const totalCompCount = compItem.count;
            const baseCount = Math.floor(totalCompCount / totalSquads);
            const remainder = totalCompCount % totalSquads;
            const countForSquad = baseCount + (i < remainder ? 1 : 0);

            if (countForSquad > 0) {
                const row = [
                    escapeCol(unitName), escapeCol(compItem.modelName), escapeCol(1),
                    escapeCol(countForSquad), escapeCol(u.points || ''), '',
                    escapeCol(u.stats.m), escapeCol(u.stats.t), escapeCol(u.stats.sv),
                    escapeCol(u.stats.w), escapeCol(u.stats.ld), escapeCol(u.stats.oc),
                    escapeCol(u.invuln || ''), escapeCol(u.baseSize),
                    escapeCol(keywordsStr), escapeCol(factionKeywordsStr),
                    escapeCol(abilitiesStr), escapeCol(u.cardLayout || '')
                ];

                for (let j = 0; j < maxWeapons; j++) {
                    if (j < allWeapons.length) {
                        const { w, type } = allWeapons[j];
                        let range = w.range;
                        if (range.toLowerCase() === 'melee') range = 'Melee';
                        const profile = [range, w.attacks, w.skill, w.strength, w.ap, w.damage].join('|');
                        row.push(escapeCol(w.name), escapeCol(type), escapeCol(profile), escapeCol(w.keywords));
                    } else {
                        row.push('', '', '', '');
                    }
                }
                csvRows.push(row.join(','));
            }
        });
    }
  });

  return csvRows.join('\n');
};

export const parseCSV = (csvText: string): UnitCardData[] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentField += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { currentField += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { currentRow.push(currentField); currentField = ''; }
      else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = '';
        if (char === '\r') i++;
      } else if (char === '\r') {
        currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = '';
      } else { currentField += char; }
    }
  }
  if (currentField || currentRow.length > 0) { currentRow.push(currentField); rows.push(currentRow); }
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.trim());
  const getCol = (names: string[]) => header.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase()));

  const map = {
    unitName: getCol([HEADERS.UNIT_NAME, 'Name', 'Unit']),
    modelName: getCol([HEADERS.MODEL_NAME, 'Model']),
    squadCount: getCol([HEADERS.SQUAD_COUNT, 'Count']),
    squadSize: getCol([HEADERS.SQUAD_SIZE, 'Quantity', 'Models']),
    points: getCol([HEADERS.POINTS, 'Pts']),
    role: getCol([HEADERS.ROLE]),
    m: getCol([HEADERS.M, 'Move']), t: getCol([HEADERS.T, 'Toughness']),
    sv: getCol([HEADERS.SV, 'Save']), w: getCol([HEADERS.W, 'Wounds']),
    ld: getCol([HEADERS.LD, 'Ld']), oc: getCol([HEADERS.OC]),
    invuln: getCol([HEADERS.INVULN, 'Inv', 'Invulnerable']),
    baseSize: getCol([HEADERS.BASE_SIZE, 'Base']),
    keywords: getCol([HEADERS.KEYWORDS]),
    factionKeywords: getCol([HEADERS.FACTION_KEYWORDS, 'Factions']),
    abilities: getCol([HEADERS.ABILITIES]),
    cardLayout: getCol([HEADERS.CARD_LAYOUT, 'Layout']),
  };

  const unitGroups: Record<string, string[][]> = {};
  for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;
      const uName = map.unitName !== -1 ? row[map.unitName] : `Unknown Unit ${i}`;
      if (!unitGroups[uName]) unitGroups[uName] = [];
      unitGroups[uName].push(row);
  }

  const results: UnitCardData[] = [];

  Object.entries(unitGroups).forEach(([unitName, groupRows]) => {
      const firstRow = groupRows[0];
      const stats = {
          m: map.m !== -1 ? firstRow[map.m] : "-",
          t: map.t !== -1 ? firstRow[map.t] : "-",
          sv: map.sv !== -1 ? firstRow[map.sv] : "-",
          w: map.w !== -1 ? firstRow[map.w] : "-",
          ld: map.ld !== -1 ? firstRow[map.ld] : "-",
          oc: map.oc !== -1 ? firstRow[map.oc] : "-",
      };

      const composition: { modelName: string, count: number }[] = [];
      let totalModelsPerSquad = 0;
      groupRows.forEach(row => {
          const mName = map.modelName !== -1 ? row[map.modelName] : unitName;
          const qty = map.squadSize !== -1 ? (parseInt(row[map.squadSize]) || 0) : 1;
          const existing = composition.find(c => c.modelName === mName);
          if (existing) { existing.count += qty; } else { composition.push({ modelName: mName, count: qty }); }
          totalModelsPerSquad += qty;
      });

      const squadCount = map.squadCount !== -1 ? (parseInt(firstRow[map.squadCount]) || 1) : 1;

      const rangedWeapons: WeaponStats[] = [];
      const meleeWeapons: WeaponStats[] = [];
      const seenWeapons = new Set<string>();

      groupRows.forEach((row, rIdx) => {
          let wIdx = 1;
          while (true) {
              const wNameIdx = getCol([`W${wIdx} Name`, `Weapon ${wIdx}`]);
              if (wNameIdx === -1) break;
              const wTypeIdx = getCol([`W${wIdx} Type`]);
              const wProfileIdx = getCol([`W${wIdx} Profile`]);
              const wTraitsIdx = getCol([`W${wIdx} Traits`]);
              const name = row[wNameIdx];
              if (name) {
                  const typeRaw = wTypeIdx !== -1 ? row[wTypeIdx] : "RANGED";
                  const profile = wProfileIdx !== -1 ? row[wProfileIdx] : "";
                  const traits = wTraitsIdx !== -1 ? row[wTraitsIdx] : "-";
                  const parts = profile.split('|');
                  let range = parts[0] || "-";
                  const attacks = parts[1] || "-", skill = parts[2] || "-";
                  const strength = parts[3] || "-", ap = parts[4] || "-", damage = parts[5] || "-";
                  let isMelee = typeRaw.toUpperCase().includes('MELEE');
                  if (range.toUpperCase() === 'MELEE' || range === 'M') { isMelee = true; range = "Melee"; }
                  const weapon: WeaponStats = { id: `csv-w-${unitName}-${wIdx}-${rIdx}`, name, range, attacks, skill, strength, ap, damage, keywords: traits };
                  const sig = getWeaponSignature(weapon, isMelee ? 'MELEE' : 'RANGED');
                  if (!seenWeapons.has(sig)) {
                      seenWeapons.add(sig);
                      if (isMelee) meleeWeapons.push(weapon); else rangedWeapons.push(weapon);
                  }
              }
              wIdx++;
          }
      });

      const abilitiesSet = new Set<string>();
      const abilities: { id: string, name: string, description: string }[] = [];
      groupRows.forEach(row => {
          if (map.abilities !== -1 && row[map.abilities]) {
              const chunks = row[map.abilities].split(/[|\n]/).map(s => s.trim()).filter(Boolean);
              chunks.forEach(chunk => {
                 if (!abilitiesSet.has(chunk)) {
                     abilitiesSet.add(chunk);
                     const colon = chunk.indexOf(':');
                     if (colon > -1) {
                         abilities.push({ id: `csv-ab-${Date.now()}-${abilities.length}`, name: chunk.substring(0, colon).trim(), description: chunk.substring(colon + 1).trim() });
                     } else {
                         abilities.push({ id: `csv-ab-${Date.now()}-${abilities.length}`, name: chunk, description: '' });
                     }
                 }
              });
          }
      });

      const keywords = new Set<string>();
      const factionKeywords = new Set<string>();
      groupRows.forEach(row => {
          if (map.keywords !== -1 && row[map.keywords]) row[map.keywords].split(',').forEach(k => keywords.add(k.trim()));
          if (map.factionKeywords !== -1 && row[map.factionKeywords]) row[map.factionKeywords].split(',').forEach(k => factionKeywords.add(k.trim()));
      });

      const layout = map.cardLayout !== -1 ? firstRow[map.cardLayout] : undefined;

      results.push({
          id: `csv-import-${unitName}-${Date.now()}`,
          name: unitName,
          baseSize: map.baseSize !== -1 ? firstRow[map.baseSize] : "32mm",
          points: map.points !== -1 ? firstRow[map.points] : undefined,
          stats, invuln: map.invuln !== -1 ? firstRow[map.invuln] : undefined,
          rangedWeapons, meleeWeapons, abilities,
          keywords: Array.from(keywords).filter(Boolean),
          factionKeywords: Array.from(factionKeywords).filter(Boolean),
          squadCount, modelCount: totalModelsPerSquad > 0 ? Math.ceil(totalModelsPerSquad) : 1,
          modelsPerSquad: Array(squadCount).fill(totalModelsPerSquad > 0 ? Math.ceil(totalModelsPerSquad) : 1),
          composition, cardLayout: layout
      });
  });

  return results;
};
