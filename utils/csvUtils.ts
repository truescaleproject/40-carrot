
import { BoardElement, ElementType, ModelStats, Weapon, WeaponType } from '../types';
import { WEAPON_MODIFIER_DEFINITIONS, MM_PER_INCH, DEFAULT_BASE_SIZE_MM } from '../constants';

// --- Types ---
export interface CsvRow {
    id?: string; // internal tracking
    squadCount: string;
    squadSize: string;
    unitName: string;
    modelName: string;
    modelQty: string; // Model Qty (per squad)
    baseSize: string;
    color: string;
    m: string;
    t: string;
    sv: string;
    wMax: string;
    wCurrent: string;
    ld: string;
    oc: string;
    [key: string]: string | undefined; // Dynamic weapon columns
}

// --- Helpers ---

const escapeCsv = (str: string) => {
    if (str === undefined || str === null) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

const parseWeaponProfile = (profileStr: string): Partial<Weapon> => {
    // Expected format: Range|A|Skill|S|AP|D
    const parts = (profileStr || '').split('|').map(s => s.trim());
    return {
        range: parts[0] || 'Melee',
        a: parts[1] || '1',
        skill: parts[2] || '4+',
        s: parts[3] || '4',
        ap: parts[4] || '0',
        d: parts[5] || '1'
    };
};

const serializeWeaponProfile = (w: Weapon): string => {
    return `${w.range}|${w.a}|${w.skill}|${w.s}|${w.ap}|${w.d}`;
};

const normalizeBaseSize = (val: string): string => {
    if (!val) return String(DEFAULT_BASE_SIZE_MM);
    return val.toLowerCase().replace('mm', '').trim();
};

const normalizeHex = (val: string): string => {
    if (!val) return '#ef4444';
    return val.startsWith('#') ? val : `#${val}`;
};

// Common Wargaming Terms Mapping to Keys
const LEGACY_TERM_MAPPING: Record<string, string> = {
    'RAPID FIRE': 'RAPID_FIRE',
    'ASSAULT': 'ASSAULT',
    'HEAVY': 'HEAVY',
    'PISTOL': 'PISTOL',
    'TWIN LINKED': 'TWIN_LINKED',
    'TWIN-LINKED': 'TWIN_LINKED',
    'IGNORES COVER': 'IGNORES_COVER',
    'TORRENT': 'TORRENT',
    'LETHAL HITS': 'LETHAL_HITS',
    'LANCE': 'LANCE',
    'INDIRECT FIRE': 'INDIRECT_FIRE',
    'PRECISION': 'PRECISION',
    'BLAST': 'BLAST',
    'MELTA': 'MELTA',
    'HAZARDOUS': 'HAZARDOUS',
    'DEVASTATING WOUNDS': 'DEVASTATING_WOUNDS',
    'SUSTAINED HITS': 'SUSTAINED_HITS',
    'EXTRA ATTACKS': 'EXTRA_ATTACKS',
    'ANTI': 'ANTI'
};

// --- Export Logic ---

interface ModelProfile {
    label: string;
    baseSizeMm: number;
    color: string;
    stats: ModelStats;
    currentWounds: number;
    profileHash: string; // Used to identify identical models
}

interface SquadComposition {
    unitName: string;
    side: string;
    totalSize: number;
    models: Record<string, { profile: ModelProfile, qty: number }>; // Map hash -> info
    compositionHash: string; // Used to identify identical squads
}

export const generateArmyCsv = (elements: BoardElement[], targetSide: 'ATTACKER' | 'DEFENDER' | 'ALL', pixelsPerInch: number): string => {
    const models = elements.filter(el => 
        el.type === ElementType.MODEL && 
        (targetSide === 'ALL' || el.side === targetSide)
    );

    if (models.length === 0) return '';

    // 1. Group models into logical "Squads" based on groupId (or individual ID if no group)
    const logicalSquads = new Map<string, BoardElement[]>();
    
    models.forEach(model => {
        // If items are grouped in app, use that groupId. If not, treat as individual unit.
        const key = model.groupId || `individual-${model.id}`;
        if (!logicalSquads.has(key)) {
            logicalSquads.set(key, []);
        }
        logicalSquads.get(key)!.push(model);
    });

    // 2. Process each logical squad into a SquadComposition signature
    const squadCompositions: SquadComposition[] = [];

    logicalSquads.forEach((squadModels) => {
        const first = squadModels[0];
        const unitName = first.groupLabel || first.label || "Unknown Unit";
        const side = first.side || 'ATTACKER';
        const totalSize = squadModels.length;
        
        // Count specific model profiles within this squad
        // e.g. 1x Sergeant, 4x Trooper
        const modelCounts: Record<string, { profile: ModelProfile, qty: number }> = {};

        squadModels.forEach(m => {
            const baseSizeMm = Math.round((m.width / pixelsPerInch) * MM_PER_INCH);
            // Create a hash of stats/weapons to distinguish profiles (e.g. Sgt vs Trooper)
            const statsStr = JSON.stringify(m.stats);
            const profileHash = `${m.label}|${baseSizeMm}|${m.color}|${statsStr}|${m.currentWounds}`;
            
            if (!modelCounts[profileHash]) {
                modelCounts[profileHash] = {
                    qty: 0,
                    profile: {
                        label: m.label,
                        baseSizeMm,
                        color: m.color,
                        stats: m.stats!,
                        currentWounds: m.currentWounds ?? parseInt(m.stats?.w || '1'),
                        profileHash
                    }
                };
            }
            modelCounts[profileHash].qty++;
        });

        // Create a signature for the whole squad to find identical squads to roll up into "Squad Count"
        // Key: "UnitName|Size|ProfileA:Qty|ProfileB:Qty"
        const sortedKeys = Object.keys(modelCounts).sort();
        const profilesSig = sortedKeys.map(k => `${k}:${modelCounts[k].qty}`).join('||');
        const compositionHash = `${unitName}|${side}|${totalSize}|${profilesSig}`;

        squadCompositions.push({
            unitName,
            side,
            totalSize,
            models: modelCounts,
            compositionHash
        });
    });

    // 3. Roll up identical squads into "Squad Count"
    const uniqueRows = new Map<string, { comp: SquadComposition, count: number }>();
    
    squadCompositions.forEach(comp => {
        if (uniqueRows.has(comp.compositionHash)) {
            uniqueRows.get(comp.compositionHash)!.count++;
        } else {
            uniqueRows.set(comp.compositionHash, { comp, count: 1 });
        }
    });

    // 4. Determine Max Weapon Count for Headers
    let maxWeapons = 0;
    uniqueRows.forEach(({ comp }) => {
        Object.values(comp.models).forEach(({ profile }) => {
            if (profile.stats.weapons) {
                maxWeapons = Math.max(maxWeapons, profile.stats.weapons.length);
            }
        });
    });
    // Ensure at least 1 weapon block for Unified v1 compliance
    maxWeapons = Math.max(1, maxWeapons);

    // 5. Build Headers (Unified v1)
    const headers = [
        'Squad Count', 'Squad Size', 'Unit Name', 'Model Name', 'Model Qty (per squad)', 'Base Size', 'Color', 
        'M', 'T', 'SV', 'W Max', 'W Current', 'LD', 'OC'
    ];
    for (let i = 1; i <= maxWeapons; i++) {
        headers.push(`W${i} Name`, `W${i} Type`, `W${i} Profile`, `W${i} Traits`);
    }

    // 6. Generate CSV Rows
    const csvLines: string[] = [];
    
    uniqueRows.forEach(({ comp, count }) => {
        // Each profile within the squad gets its own row, but shares Squad Count/Size/UnitName
        Object.values(comp.models).forEach(({ profile, qty }) => {
            const rowData: string[] = [
                count.toString(),
                comp.totalSize.toString(),
                comp.unitName,
                profile.label,
                qty.toString(),
                profile.baseSizeMm.toString(),
                profile.color,
                profile.stats.m,
                profile.stats.t,
                profile.stats.sv,
                profile.stats.w,
                profile.currentWounds.toString(),
                profile.stats.ld,
                profile.stats.oc
            ];

            // Weapons
            for (let i = 0; i < maxWeapons; i++) {
                const w = profile.stats.weapons[i];
                if (w) {
                    const modifiers = w.modifiers?.map(m => {
                        const def = WEAPON_MODIFIER_DEFINITIONS[m.type];
                        let s = def ? def.name : m.type;
                        if (m.value) s += ` ${m.value}`;
                        if (m.keyword) s += ` ${m.keyword}`;
                        return s;
                    }).join(', ') || '';

                    rowData.push(w.name, w.type, serializeWeaponProfile(w), modifiers);
                } else {
                    rowData.push('', '', '', ''); // Empty slots
                }
            }

            csvLines.push(rowData.map(escapeCsv).join(','));
        });
    });

    return [headers.join(','), ...csvLines].join('\n');
};

// --- Import Logic ---

export const parseCsvToRows = (csvText: string): CsvRow[] => {
    if (!csvText) return [];
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Unified v1 Mapping Detection
    const colIdx = {
        squadCount: headers.indexOf('squad count'),
        squadSize: headers.indexOf('squad size'),
        unitName: headers.indexOf('unit name'),
        modelName: headers.indexOf('model name'),
        modelQty: headers.indexOf('model qty (per squad)'),
        baseSize: headers.findIndex(h => h.includes('base size')),
        color: headers.indexOf('color'),
        m: headers.indexOf('m'),
        t: headers.indexOf('t'),
        sv: headers.indexOf('sv'),
        wMax: headers.indexOf('w max'),
        wCurrent: headers.indexOf('w current'),
        ld: headers.indexOf('ld'),
        oc: headers.indexOf('oc'),
    };

    // Determine where weapon columns start (usually after OC)
    // We look for patterns like "w1 name", "w1 type" etc.
    const weaponColsStart = Math.max(colIdx.oc, 13) + 1; // Fallback to index 14 if mapped found

    return lines.slice(1).map((line, idx) => {
        const cols = parseLine(line);
        const getCol = (i: number) => cols[i] ? cols[i].trim() : '';

        // Unified v1 Defaults
        const squadCount = colIdx.squadCount > -1 ? getCol(colIdx.squadCount) : '1';
        const squadSize = colIdx.squadSize > -1 ? getCol(colIdx.squadSize) : '1';
        const modelQty = colIdx.modelQty > -1 ? getCol(colIdx.modelQty) : squadSize; // Default to squad size if singular
        const wMax = colIdx.wMax > -1 ? getCol(colIdx.wMax) : '1';
        const wCurrent = colIdx.wCurrent > -1 ? getCol(colIdx.wCurrent) : wMax;

        const row: CsvRow = {
            id: `row-${idx}`,
            squadCount: squadCount || '1',
            squadSize: squadSize || '1',
            unitName: colIdx.unitName > -1 ? getCol(colIdx.unitName) : 'New Unit',
            modelName: colIdx.modelName > -1 ? getCol(colIdx.modelName) : 'Model',
            modelQty: modelQty || '1',
            baseSize: colIdx.baseSize > -1 ? normalizeBaseSize(getCol(colIdx.baseSize)) : '32',
            color: colIdx.color > -1 ? normalizeHex(getCol(colIdx.color)) : '#ef4444',
            m: colIdx.m > -1 ? getCol(colIdx.m) : '6"',
            t: colIdx.t > -1 ? getCol(colIdx.t) : '4',
            sv: colIdx.sv > -1 ? getCol(colIdx.sv) : '3+',
            wMax: wMax,
            wCurrent: wCurrent,
            ld: colIdx.ld > -1 ? getCol(colIdx.ld) : '6+',
            oc: colIdx.oc > -1 ? getCol(colIdx.oc) : '1',
        };

        // Capture weapon data dynamically
        // Iterate through columns 4 at a time looking for headers
        // Since we parsed headers earlier, we can find Wx Name columns
        for (let i = 1; i <= 10; i++) {
            const wNameIdx = headers.indexOf(`w${i} name`);
            if (wNameIdx > -1 && cols[wNameIdx]) {
                row[`w${i}_name`] = getCol(wNameIdx);
                row[`w${i}_type`] = getCol(wNameIdx + 1); // Assumes strictly ordered headers
                row[`w${i}_profile`] = getCol(wNameIdx + 2);
                row[`w${i}_traits`] = getCol(wNameIdx + 3);
            }
        }

        return row;
    });
};

export const convertRowsToElements = (rows: CsvRow[], pixelsPerInch: number, targetSide: 'ATTACKER' | 'DEFENDER'): { elements: BoardElement[], warnings: string[] } => {
    const elements: BoardElement[] = [];
    const warnings: string[] = [];
    
    // Group by Unit Name to handle mixed composition squads
    const unitGroups = new Map<string, CsvRow[]>();
    
    rows.forEach(row => {
        if (!unitGroups.has(row.unitName)) {
            unitGroups.set(row.unitName, []);
        }
        unitGroups.get(row.unitName)!.push(row);
    });

    unitGroups.forEach((unitRows, unitName) => {
        // Assumption: All rows for the same Unit Name share the same Squad Count
        // We take the max found to be safe, or just the first.
        const rawSquadCount = Math.max(...unitRows.map(r => parseInt(r.squadCount) || 1));
        const squadCount = isNaN(rawSquadCount) ? 1 : rawSquadCount;

        const rawSquadSize = Math.max(...unitRows.map(r => parseInt(r.squadSize) || 1));
        const squadSize = isNaN(rawSquadSize) ? 1 : rawSquadSize;

        // Check if sum of model qtys matches squad size
        const totalModelsDefined = unitRows.reduce((sum, r) => sum + (parseInt(r.modelQty) || 1), 0);
        if (totalModelsDefined !== squadSize) {
            warnings.push(`Unit "${unitName}": Defined models sum (${totalModelsDefined}) does not match Squad Size (${squadSize}). Imported anyway.`);
        }

        // Expand Squads
        for (let s = 0; s < squadCount; s++) {
            const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            
            // Expand Rows within Squad
            unitRows.forEach(row => {
                const qty = parseInt(row.modelQty) || 1;
                let widthMm = parseFloat(row.baseSize);
                if (isNaN(widthMm) || widthMm <= 0) widthMm = 32;
                const widthPx = (widthMm / MM_PER_INCH) * pixelsPerInch;

                const stats = buildStatsFromRow(row);
                const wCurrent = parseInt(row.wCurrent);
                const wMax = parseInt(row.wMax);

                for (let m = 0; m < qty; m++) {
                    elements.push({
                        id: Math.random().toString(36).substring(2, 11),
                        type: ElementType.MODEL,
                        x: 0,
                        y: 0,
                        width: widthPx,
                        height: widthPx,
                        rotation: 0,
                        label: row.modelName || 'Model',
                        color: row.color || '#ef4444',
                        strokeColor: row.color || '#ef4444',
                        stats: stats,
                        currentWounds: !isNaN(wCurrent) ? wCurrent : (!isNaN(wMax) ? wMax : 1),
                        groupId: groupId,
                        groupLabel: unitName,
                        side: targetSide
                    });
                }
            });
        }
    });

    return { elements, warnings };
};

const buildStatsFromRow = (row: CsvRow): ModelStats => {
    const weapons: Weapon[] = [];
    for (let i = 1; i <= 10; i++) {
        const name = row[`w${i}_name`];
        if (name) {
            const profileStr = row[`w${i}_profile`] || 'Melee|1|4+|4|0|1';
            const profile = parseWeaponProfile(profileStr);
            const traitsStr = row[`w${i}_traits`];
            
            const modifiers = traitsStr ? traitsStr.split(',').map(t => {
                const cleanT = t.trim();
                const upperT = cleanT.toUpperCase();
                
                let knownType = LEGACY_TERM_MAPPING[upperT];
                
                if (!knownType) {
                    knownType = Object.keys(WEAPON_MODIFIER_DEFINITIONS).find(k => 
                        upperT.startsWith(WEAPON_MODIFIER_DEFINITIONS[k].name.toUpperCase())
                    ) || '';
                }

                if (!knownType) {
                     knownType = Object.keys(WEAPON_MODIFIER_DEFINITIONS).find(k => k === upperT) || 'UNKNOWN';
                }
                
                return {
                    id: Math.random().toString(),
                    type: knownType,
                    value: cleanT.replace(/[^0-9]/g, '') || undefined 
                };
            }) : [];

            weapons.push({
                id: Math.random().toString(36).substring(2, 11),
                name: name,
                type: (row[`w${i}_type`] as WeaponType) || 'RANGED',
                range: profile.range!,
                a: profile.a!,
                skill: profile.skill!,
                s: profile.s!,
                ap: profile.ap!,
                d: profile.d!,
                modifiers: modifiers
            });
        }
    }

    return {
        m: row.m || '6"',
        t: row.t || '4',
        sv: row.sv || '3+',
        w: row.wMax || '1',
        ld: row.ld || '6+',
        oc: row.oc || '1',
        weapons: weapons
    };
};
