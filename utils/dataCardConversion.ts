import { UnitCardData } from '../types/dataCards';
import { BoardElement, ElementType, Weapon } from '../types';
import { MM_PER_INCH, DEFAULT_BASE_SIZE_MM } from '../constants';
import { getBaseSize } from '../services/baseSizeService';

function parseBaseSize(sizeStr: string): { w: number; h: number } {
    if (!sizeStr) return { w: DEFAULT_BASE_SIZE_MM, h: DEFAULT_BASE_SIZE_MM };
    const clean = sizeStr.toLowerCase().replace('mm', '').replace('oval base', '').trim();
    if (clean.includes('x')) {
        const parts = clean.split('x').map(s => parseFloat(s.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { w: parts[0], h: parts[1] };
        }
    }
    const d = parseFloat(clean);
    if (!isNaN(d)) return { w: d, h: d };
    return { w: DEFAULT_BASE_SIZE_MM, h: DEFAULT_BASE_SIZE_MM };
}

function convertWeapons(unit: UnitCardData): Weapon[] {
    const weapons: Weapon[] = [];
    (unit.rangedWeapons || []).forEach((w, i) => {
        weapons.push({
            id: `dc-rw-${i}-${Math.random().toString(36).substring(2, 9)}`,
            name: w.name,
            type: 'RANGED',
            range: w.range || '-',
            a: w.attacks || '-',
            skill: w.skill || '-',
            s: w.strength || '-',
            ap: w.ap || '-',
            d: w.damage || '-',
            modifiers: []
        });
    });
    (unit.meleeWeapons || []).forEach((w, i) => {
        weapons.push({
            id: `dc-mw-${i}-${Math.random().toString(36).substring(2, 9)}`,
            name: w.name,
            type: 'MELEE',
            range: 'M',
            a: w.attacks || '-',
            skill: w.skill || '-',
            s: w.strength || '-',
            ap: w.ap || '-',
            d: w.damage || '-',
            modifiers: []
        });
    });
    return weapons;
}

export function convertUnitCardsToBoardElements(
    units: UnitCardData[],
    side: 'ATTACKER' | 'DEFENDER',
    pixelsPerInch: number
): BoardElement[] {
    const result: BoardElement[] = [];

    units.forEach(unit => {
        const totalSquads = unit.squadCount || 1;
        const modelsPerSquad = unit.modelsPerSquad || [unit.modelCount || 1];
        const baseSizeStr = getBaseSize(unit.name) || unit.baseSize || '32mm';
        const { w: baseMm, h: baseHMm } = parseBaseSize(baseSizeStr);
        const widthPx = (baseMm / MM_PER_INCH) * pixelsPerInch;
        const heightPx = (baseHMm / MM_PER_INCH) * pixelsPerInch;
        const weapons = convertWeapons(unit);
        const stats = {
            m: unit.stats.m || '6"',
            t: unit.stats.t || '4',
            sv: unit.stats.sv || '3+',
            w: unit.stats.w || '1',
            ld: unit.stats.ld || '6+',
            oc: unit.stats.oc || '1',
            weapons,
        };

        for (let sq = 0; sq < totalSquads; sq++) {
            const count = modelsPerSquad[sq] || modelsPerSquad[0] || 1;
            const groupId = `dc-group-${Math.random().toString(36).substring(2, 11)}`;
            const suffix = totalSquads > 1 ? ` ${String.fromCharCode(65 + sq)}` : '';
            const groupLabel = unit.name + suffix;

            for (let m = 0; m < count; m++) {
                result.push({
                    id: `dc-${Math.random().toString(36).substring(2, 11)}`,
                    type: ElementType.MODEL,
                    x: 0,
                    y: 0,
                    width: widthPx,
                    height: heightPx,
                    rotation: 0,
                    label: unit.name,
                    color: side === 'ATTACKER' ? '#ef4444' : '#3b82f6',
                    stats: JSON.parse(JSON.stringify(stats)),
                    currentWounds: parseInt(stats.w) || 1,
                    groupId,
                    groupLabel,
                    side,
                });
            }
        }
    });

    return result;
}
