import { UnitCardData, ParsedArmyListEntry } from '../types/dataCards';
import { normalizeStat } from '../utils/statUtils';
import { cacheService } from './cacheService';
import { getBaseSize } from './baseSizeService';

// Simple hash for content comparison
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0;
  }
  return hash.toString(16);
}

function extractNextDataJson(html: string): any | null {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function tryParse39kData(json: any): UnitCardData | null {
  const ds = json?.props?.pageProps?.datasheet;
  if (!ds) return null;

  try {
    const getStat = (val: any, type: any) => normalizeStat(val, type);
    const statsObj = Array.isArray(ds.stats) ? ds.stats[0] : ds.stats;

    const mapWeapon = (w: any, type: 'ranged' | 'melee', i: number) => ({
        id: `${type}-${i}-${Date.now()}`,
        name: w.name || "Weapon",
        range: w.range || (type === 'melee' ? "Melee" : "-"),
        attacks: w.a || w.attacks || "-",
        skill: normalizeStat(w.bs || w.ws || w.skill, 'BS'),
        strength: w.s || w.strength || "-",
        ap: w.ap || "-",
        damage: w.d || w.damage || "-",
        keywords: Array.isArray(w.keywords) ? w.keywords.join(", ") : (w.keywords || "")
    });

    const abilities = (ds.abilities || []).map((a: any, i: number) => ({
         id: `ab-${i}-${Date.now()}`,
         name: a.name || "Ability",
         description: a.description || a.rule || ""
    }));

    if (Array.isArray(ds.core_abilities)) {
        ds.core_abilities.forEach((ca: string, i: number) => {
            abilities.push({ id: `core-${i}-${Date.now()}`, name: ca, description: "" });
        });
    }

    return {
        id: `39k-${ds.id || Date.now()}`,
        name: ds.name || "Unknown",
        baseSize: ds.base_size || "32mm",
        stats: {
            m: getStat(statsObj?.m, 'M'),
            t: getStat(statsObj?.t, 'T'),
            sv: getStat(statsObj?.sv, 'SV'),
            w: getStat(statsObj?.w, 'W'),
            ld: getStat(statsObj?.ld, 'LD'),
            oc: getStat(statsObj?.oc, 'OC'),
        },
        invuln: ds.invuln_save ? normalizeStat(ds.invuln_save, 'INV') : undefined,
        rangedWeapons: (ds.ranged_weapons || []).map((w: any, i: number) => mapWeapon(w, 'ranged', i)),
        meleeWeapons: (ds.melee_weapons || []).map((w: any, i: number) => mapWeapon(w, 'melee', i)),
        abilities,
        keywords: ds.keywords || [],
        factionKeywords: ds.faction_keywords || [],
        squadCount: 1,
        modelCount: 1,
        modelsPerSquad: [1]
    };
  } catch (e) {
      console.warn("Parsing 39k structure failed:", e);
      return null;
  }
}

async function fetchPageText(url: string): Promise<string> {
  const is39k = /https?:\/\/(www\.)?39k\.pro\/datasheet\//i.test(url);

  const tryFetch = async (u: string) => {
    const res = await fetch(u, { method: "GET" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.text();
  };

  if (is39k) {
    try {
      return await tryFetch(url);
    } catch {
      try {
        return await tryFetch(`https://r.jina.ai/${url}`);
      } catch {
         throw new Error("Could not fetch page content from 39k.pro (proxy and direct failed).");
      }
    }
  }

  try {
    return await tryFetch(url);
  } catch {
    try {
      return await tryFetch(`https://r.jina.ai/${url}`);
    } catch {
      throw new Error("Could not fetch page content.");
    }
  }
}

// Deterministic Parser for Official App/Battlescribe Text
function parseOfficialAppText(text: string): ParsedArmyListEntry[] {
    const lines = text.split('\n');

    const SECTIONS = [
        "CHARACTERS", "BATTLELINE", "DEDICATED TRANSPORTS", "OTHER DATASHEETS",
        "ALLIED UNITS", "VEHICLES", "MONSTERS", "FORTIFICATIONS", "RETINUE"
    ];

    let startIndex = 0;
    const firstSectionIndex = lines.findIndex(line => SECTIONS.includes(line.trim().toUpperCase()));
    if (firstSectionIndex !== -1) startIndex = firstSectionIndex;

    interface InternalEntry extends ParsedArmyListEntry {
        _section?: string;
        _rawLinesData: { content: string, indent: number }[];
    }

    const units: InternalEntry[] = [];
    let currentUnit: InternalEntry | null = null;
    let currentSection = "";
    const headerRegex = /^(.+?) \((\d+) Points\)\s*$/;
    const IGNORED_SECTIONS = ["Space Marines", "Blood Angels", "Strike Force", "Rage-cursed Onslaught"];

    for (let i = startIndex; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();
        if (!line) continue;

        if (SECTIONS.includes(line.toUpperCase())) { currentSection = line.toUpperCase(); continue; }
        if (IGNORED_SECTIONS.some(s => line.toUpperCase() === s || line === s)) continue;
        if (line.startsWith("Exported with App")) continue;
        if (line.includes("Points) (")) continue;

        const hMatch = line.match(headerRegex);
        if (hMatch) {
            if (hMatch[1].includes("Strike Force") || hMatch[1].includes("Onslaught")) continue;
            if (currentUnit) units.push(currentUnit);
            currentUnit = {
                id: `parsed-${Date.now()}-${units.length}`,
                name: hMatch[1].trim(),
                points: hMatch[2],
                count: 1,
                composition: [],
                rawLines: [],
                isSingleModel: true,
                _section: currentSection,
                _rawLinesData: []
            };
            continue;
        }

        if (currentUnit) {
            if (line.startsWith('•') || line.startsWith('-') || line.startsWith('◦') || line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('◦')) {
                 const leadingSpaces = rawLine.match(/^(\s*)/)?.[1].length || 0;
                 const content = line.replace(/^[\s•\-\t◦]+/, '').trim();
                 currentUnit._rawLinesData.push({ content, indent: leadingSpaces });
            }
        }
    }

    if (currentUnit) units.push(currentUnit);

    units.forEach(u => {
        const uniqueIndents = Array.from(new Set(u._rawLinesData.map(l => l.indent))).sort((a,b) => a - b);
        const hasLayers = uniqueIndents.length > 1;

        if (hasLayers) { u.isSingleModel = false; } else { u.isSingleModel = true; }

        if (u.isSingleModel) {
            u.count = 1;
            u.composition = [{ modelName: u.name, count: 1 }];
            u.rawLines = u._rawLinesData.map(l => l.content);
        } else {
            const primaryIndent = uniqueIndents.length > 0 ? uniqueIndents[0] : -1;
            let totalCount = 0;
            const compMap = new Map<string, number>();
            const wargearLines: string[] = [];

            u._rawLinesData.forEach(l => {
                if (hasLayers && l.indent > primaryIndent) { wargearLines.push(l.content); return; }
                const mMatch = l.content.match(/^(\d+)x\s+(.+)$/);
                if (mMatch) {
                    const c = parseInt(mMatch[1]);
                    const name = mMatch[2].trim();
                    totalCount += c;
                    compMap.set(name, (compMap.get(name) || 0) + c);
                } else {
                    totalCount += 1;
                    compMap.set(l.content, (compMap.get(l.content) || 0) + 1);
                }
            });

            u.count = totalCount > 0 ? totalCount : 1;
            u.composition = Array.from(compMap.entries()).map(([k,v]) => ({ modelName: k, count: v }));
            if (hasLayers && wargearLines.length > 0) { u.rawLines = wargearLines; }
            else { u.rawLines = u._rawLinesData.map(l => l.content); }
        }

        if (u._rawLinesData.length === 0) {
            if (["CHARACTERS", "VEHICLES", "MONSTERS"].includes(u._section || "")) {
                u.isSingleModel = true;
                u.count = 1;
                u.composition = [{ modelName: u.name, count: 1 }];
            }
        }

        delete u._section;
        delete u._rawLinesData;
    });

    return units;
}

interface FetchOptions {
    targetUnitName?: string;
    bypassCache?: boolean;
}

const fetchUnitDataFromUrl = async (url: string, options?: FetchOptions | string): Promise<UnitCardData | null> => {
    const targetUnitName = typeof options === 'string' ? options : options?.targetUnitName;
    const bypassCache = typeof options === 'object' ? options.bypassCache : false;

    // 1. Check Cache
    if (!bypassCache) {
        const cached = cacheService.get(url);
        if (cached) {
            const officialBaseSize = getBaseSize(cached.data.name);
            if (officialBaseSize && cached.data.baseSize !== officialBaseSize) {
                 return { ...cached.data, baseSize: officialBaseSize };
            }
            return cached.data;
        }
    }

    // 2. Fetch Page Content
    let pageText: string;
    try {
        pageText = await fetchPageText(url);
    } catch (e) {
        console.error("Failed to fetch page text:", e);
        return null;
    }

    const contentHash = simpleHash(pageText);
    const nextData = extractNextDataJson(pageText);
    let resultData: UnitCardData | null = null;

    // 3. DETERMINISTIC PARSING (No AI)
    if (nextData) {
        const deterministicData = tryParse39kData(nextData);
        if (deterministicData) {
            let mismatch = false;
            if (targetUnitName && deterministicData.name !== "Unknown") {
                const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
                if (norm(deterministicData.name) !== norm(targetUnitName)) {
                    console.warn(`Deterministic import mismatch. Expected "${targetUnitName}", got "${deterministicData.name}".`);
                    mismatch = true;
                }
            }
            if (!mismatch) resultData = deterministicData;
        }
    }

    // No AI fallback — return null if deterministic parsing fails
    if (!resultData) {
        console.warn(`Could not parse data from ${url} — no structured data found.`);
        return null;
    }

    // 4. Apply base size correction
    const officialBaseSize = getBaseSize(resultData.name);
    if (officialBaseSize) resultData.baseSize = officialBaseSize;

    // 5. Cache
    cacheService.set(url, resultData, contentHash);

    return resultData;
};

const fetchUnitsFromUrls = async (
    urls: string[],
    onProgress?: (current: number, total: number) => void,
    onUnitLoaded?: (unit: UnitCardData) => void
): Promise<UnitCardData[]> => {
    const results: UnitCardData[] = [];
    const uncachedUrls: string[] = [];
    let completed = 0;

    for (const url of urls) {
        const cached = cacheService.get(url);
        if (cached) {
            const officialBaseSize = getBaseSize(cached.data.name);
            if (officialBaseSize && cached.data.baseSize !== officialBaseSize) {
                cached.data.baseSize = officialBaseSize;
            }
            results.push(cached.data);
            if (onUnitLoaded) onUnitLoaded(cached.data);
            completed++;
        } else {
            uncachedUrls.push(url);
        }
    }

    if (onProgress) onProgress(completed, urls.length);
    if (uncachedUrls.length === 0) return results;

    const CONCURRENCY = 6;
    for (let i = 0; i < uncachedUrls.length; i += CONCURRENCY) {
        const chunk = uncachedUrls.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(chunk.map(url => fetchUnitDataFromUrl(url)));
        for (const unit of chunkResults) {
            if (unit) {
                results.push(unit);
                if (onUnitLoaded) onUnitLoaded(unit);
            }
        }
        completed += chunk.length;
        if (onProgress) onProgress(Math.min(completed, urls.length), urls.length);
    }

    return results;
};

export const datasheetService = {
    parseArmyList: parseOfficialAppText,
    fetchUnitDataFromUrl,
    fetchUnitsFromUrls,
};
