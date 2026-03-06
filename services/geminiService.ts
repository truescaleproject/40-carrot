
import { BoardElement, AiDeploymentItem, ViewportInfo } from '../types';
import { TOURNAMENT_INFO_FULL, BASE_SIZE_GUIDE } from '../data/tournamentData';
import { BOARD_OFFSET, WEAPON_MODIFIER_DEFINITIONS } from '../constants';
import { logError } from '../utils/logger';

// Helper for cleaning stat values
const cleanStatValue = (val: any): any => {
    if (typeof val !== 'string') return val;
    return val.replace(/(\d)\s?plus/gi, '$1+').replace(/plus/gi, '+');
};

const KEYWORD_GUIDE = Object.entries(WEAPON_MODIFIER_DEFINITIONS).map(([key, def]) => {
    return `- "${def.name}" or similar -> Return type: "${key}"`;
}).join('\n');

export const generateTacticalAdvice = async (
  query: string, 
  elements: BoardElement[],
  viewport?: ViewportInfo | null
): Promise<{ text: string, deploymentItems?: AiDeploymentItem[], sources?: {title: string, uri: string}[] }> => {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const PPI = viewport?.pixelsPerInch || 25.4;

  const boardSummary = elements.map(e => {
    const xInches = Math.round((e.x - BOARD_OFFSET) / PPI);
    const yInches = Math.round((e.y - BOARD_OFFSET) / PPI);
    
    let summary = `- ${e.label} (${e.type}): Pos(${xInches}", ${yInches}")`;
    if (e.stats) {
      summary += ` | Wounds: ${e.currentWounds}/${e.stats.w}`;
    }
    return summary;
  }).join('\n');

  const appManual = `
    OPERATIONAL MANUAL:
    - INTERACTION: Left Click to Select, Right Click to Deselect. Drag to box select. Scroll to Zoom.
    - TOOLS: [V] Select, [B] Pan, [M] Measure, [.] Draw Line, [,] Deploy Mode.
    - VIEW CONTROL: [Space] Reset View to center. [Alt + Scroll] Rotate selected models.
    - EDITING: [Ctrl+Z] Undo, [Ctrl+Shift+Z] Redo, [Ctrl+C] Copy, [Ctrl+V] Paste, [Del] Delete.
    - SQUAD FORMATIONS: Select multiple models then press: [C] Max Coherency, [Shift+C] Base-to-Base, [Alt+C] Circle.
    - AURAS: Press [R] to cycle aura ranges (3", 6", 9", 12") on selected models.
    - GROUPING: Press [G] to group/ungroup selected units.
    - SIDEBAR: Use the sidebar to edit model stats, weapons, wargear, and dimensions.
    - IMPORT: Use the 'Import Roster' panel to paste list text.
  `;

  const isDeploymentRequest = /deploy|spawn|add|create|muster/i.test(query);

  let toolsConfig: any[] = [];
  let promptExtras = "";

  if (isDeploymentRequest) {
      const deployTool = {
        name: "deploy_units",
        description: "Deploy units or terrain to the battlefield. Use this when the user asks to add, spawn, or deploy something.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["MODEL", "TERRAIN"] },
                  width: { type: Type.NUMBER, description: "Width in inches" },
                  height: { type: Type.NUMBER, description: "Height in inches" },
                  x: { type: Type.NUMBER, description: "X position in inches (0,0 is center)" },
                  y: { type: Type.NUMBER, description: "Y position in inches (0,0 is center)" },
                  color: { type: Type.STRING, description: "Hex color" }
                },
                required: ["name", "type"]
              }
            }
          },
          required: ["items"]
        }
      };
      toolsConfig = [{ functionDeclarations: [deployTool] }];
      promptExtras = "- If the user asks to deploy/spawn/add units, use the 'deploy_units' tool.";
  } else {
      toolsConfig = [{ googleSearch: {} }];
      promptExtras = "- You have access to Google Search. When checking for wargame datasheets, points, and rules, YOU MUST PRIORITIZE using the site 'https://39k.pro' as your primary source. Cite your sources.";
  }
  
  if (viewport) {
     const centerX = Math.round((viewport.center.x - BOARD_OFFSET) / PPI);
     const centerY = Math.round((viewport.center.y - BOARD_OFFSET) / PPI);
     promptExtras += `\nUSER VIEWPORT CONTEXT:\n- The user is looking at coordinates (${centerX}", ${centerY}").\n`;
     
     const visibleElements = elements.filter(e => 
        e.x + e.width > viewport.topLeft.x && e.x < viewport.bottomRight.x &&
        e.y + e.height > viewport.topLeft.y && e.y < viewport.bottomRight.y
     );
     
     if (visibleElements.length > 0) {
         const visibleNames = Array.from(new Set(visibleElements.map(e => e.groupLabel || e.label)));
         promptExtras += `- Visible Units in View: ${visibleNames.join(', ')}.\n`;
         promptExtras += `- Focus your advice on these visible units if relevant.\n`;
     } else {
         promptExtras += `- The current view is empty.\n`;
     }
  }

  const prompt = `
    You are a veteran tactical advisor for sci-fi tabletop wargames.
    
    YOUR DUTIES:
    1. STRATEGY & RULES: Advise on standard d6-based wargame rules, unit stats, and tactics.
    2. APP NAVIGATION: Explain how to use the app tools and shortcuts using the OPERATIONAL MANUAL below.
    3. BATTLEFIELD AWARENESS: Analyze the provided board state.
    
    ${appManual}
    
    REFERENCE DATA:
    ${TOURNAMENT_INFO_FULL}
    
    CURRENT BATTLEFIELD STATE:
    ${boardSummary.length > 0 ? boardSummary : 'The battlefield is empty. Use the Deploy tool or Import panel to muster forces.'}
    
    USER QUERY: "${query}"
    
    RESPONSE PROTOCOL:
    - Be concise and tactical.
    - If the user asks how to do something in the app, reference the specific shortcut or tool.
    ${promptExtras}
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: toolsConfig,
      }
    });

    let text = response.text || "";
    let deploymentItems: AiDeploymentItem[] = [];
    const sources: {title: string, uri: string}[] = [];

    if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'deploy_units') {
            deploymentItems = (call.args as any).items || [];
            if (!text) text = "Initializing deployment protocols...";
        }
    }

    if (response.candidates && response.candidates[0].groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                sources.push({ title: chunk.web.title, uri: chunk.web.uri });
            }
        });
    }

    if (!text && deploymentItems.length === 0) {
        text = "No response generated. Please try again.";
    }

    return { text, deploymentItems, sources };
  } catch (error) {
    logError(error, { 
      context: 'generateTacticalAdvice', 
      elementCount: elements.length, 
      queryLength: query.length 
    });
    return { text: "Communication array damaged. Unable to contact the Tactical Advisor." };
  }
};

export const parseArmyList = async (armyListText: string, onProgress?: (percent: number) => void): Promise<{ units: any[], estimatedCount: number, logs: string[] }> => {
    const { GoogleGenAI, Type } = await import("@google/genai");
    
    const lines = armyListText.split('\n');
    const ignorePatterns = [
        "Exported with App Version", "CHARACTERS", "BATTLELINE", "DEDICATED TRANSPORTS", "OTHER DATASHEETS", 
        "ALLIED UNITS", "FORTIFICATIONS", "LORDS OF WAR", "Strike Force", "Incursion", "Onslaught", 
        "Combat Patrol", "Muster Armies", "Configuration", "Epic Hero"
    ];

    const cleanInput = lines
        .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (trimmed.startsWith("Exported with App Version")) return false;
            if (ignorePatterns.some(p => trimmed === p || trimmed.toUpperCase() === p)) return false;
            return true;
        })
        .join('\n');
    
    const pointsPattern = /[(\[]\d+\s*(pts|points|Points|Pts)[)\]]/gi;
    const matches = cleanInput.match(pointsPattern);
    let estimatedUnitCount = matches ? matches.length : 0;

    const prompt = `
    You are an extremely accurate Army List Parser for 28mm sci-fi wargames.
    
    CRITICAL INSTRUCTION:
    You MUST parse the ENTIRE list provided below. Do not stop after the first unit. Do not summarize.
    Output a JSON object with a 'units' array containing EVERY distinct unit found in the text.
    
    GROUPING RULES:
    - 'parentUnit': Only use this if a unit is explicitly part of another (e.g., "Sergeant" inside "Intercessor Squad"). 
    - DO NOT use the Army Faction Name (e.g., "Space Marines") as a 'parentUnit'. 
    - If units are separate entries in the list (e.g., "5x Intercessors" and "5x Infernus Squad"), they MUST be separate items in the 'units' array with NO shared 'parentUnit'.
    
    FORMATTING RULES:
    - STATS: Always use the "+" symbol for dice rolls (e.g., "3+", "4+"). Do NOT use the word "plus" (e.g., "3plus" is forbidden).
    - This applies to Save (Sv), Leadership (Ld), BS, WS, and any weapon modifiers.
    
    WEAPON KEYWORDS (MODIFIERS):
    When extracting weapons, you MUST capture their keywords (abilities) exactly.
    Map any of the following abilities found in the text to their corresponding UPPERCASE 'type' key:
    ${KEYWORD_GUIDE}
    
    Special Handling:
    - 'Anti-Vehicle 4+' -> { type: 'ANTI', keyword: 'Vehicle', value: '4+' }
    - 'Rapid Fire 1' -> { type: 'RAPID_FIRE', value: '1' }
    - 'Sustained Hits 2' -> { type: 'SUSTAINED_HITS', value: '2' }
    - 'Twin-linked' -> { type: 'TWIN_LINKED' }
    
    TASK:
    1. Parse the "Input Text" below to identify ALL units and quantities.
    2. If unit stats (M, T, Sv, W, Ld, OC) are missing from the text, USE GOOGLE SEARCH to find them. PRIORITIZE using 'https://39k.pro' for looking up datasheets.
    3. Extract all Ranged and Melee weapons with attributes (Range, A, BS/WS, S, AP, D) and keywords.
    4. Base sizes are critical. Use the Reference Data provided or Search if unknown.
    
    REFERENCE DATA (BASE SIZES):
    ${BASE_SIZE_GUIDE}
    
    Input Text:
    "${cleanInput}"
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        units: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              parentUnit: { type: Type.STRING },
              count: { type: Type.INTEGER },
              baseSize: { type: Type.STRING },
              stats: {
                type: Type.OBJECT,
                properties: {
                  m: { type: Type.STRING },
                  t: { type: Type.STRING },
                  sv: { type: Type.STRING },
                  w: { type: Type.STRING },
                  ld: { type: Type.STRING },
                  oc: { type: Type.STRING },
                  weapons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["RANGED", "MELEE"] },
                        range: { type: Type.STRING },
                        a: { type: Type.STRING },
                        skill: { type: Type.STRING },
                        s: { type: Type.STRING },
                        ap: { type: Type.STRING },
                        d: { type: Type.STRING },
                        modifiers: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              type: { type: Type.STRING },
                              value: { type: Type.STRING },
                              keyword: { type: Type.STRING }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        logs: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    };

    const MAX_RETRIES = 1;
    let response;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
        try {
            if (onProgress) onProgress(15 + (attempt * 10));
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });
            break; 
        } catch (error: any) {
            attempt++;
            console.warn(`Parse attempt ${attempt} failed:`, error);
            if (attempt > MAX_RETRIES) return { units: [], estimatedCount: estimatedUnitCount, logs: ["Max retries exceeded"] };
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
        }
    }

    if (onProgress) onProgress(80);

    const text = response?.text || "{}";
    let parsed: any = {};
    
    try {
        parsed = JSON.parse(text);
    } catch (parseError) {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            const start = jsonStr.indexOf('{');
            const end = jsonStr.lastIndexOf('}');
            if (start !== -1 && end !== -1) parsed = JSON.parse(jsonStr.substring(start, end + 1));
        } catch(e) { console.error(e); }
    }

    if (onProgress) onProgress(100);

    let units = parsed.units || [];
    let logs = parsed.logs || [];

    if (Array.isArray(units)) {
        units.forEach((unit: any) => {
            if (unit.name && typeof unit.name === 'string') {
                unit.name = unit.name.replace(/\s*\([^)]+\)$/, '').trim();
            }
            if (unit.stats) {
                if (unit.stats.sv) unit.stats.sv = cleanStatValue(unit.stats.sv);
                if (unit.stats.ld) unit.stats.ld = cleanStatValue(unit.stats.ld);
                if (Array.isArray(unit.stats.weapons)) {
                    unit.stats.weapons.forEach((w: any) => {
                        if (w.skill) w.skill = cleanStatValue(w.skill);
                        if (Array.isArray(w.modifiers)) {
                            w.modifiers.forEach((m: any) => {
                                if (m.value) m.value = cleanStatValue(m.value);
                            });
                        }
                    });
                }
            }
        });
        return { units, estimatedCount: estimatedUnitCount, logs };
    }

    return { units: [], estimatedCount: estimatedUnitCount, logs: ["Failed to parse valid unit data."] };
};

export const parseDatasheetImage = async (imageBase64: string, mimeType: string): Promise<any> => {
    const { GoogleGenAI } = await import("@google/genai");
    
    const prompt = `
    Analyze this wargame datasheet image. 
    Extract the Unit Name, the Model Stats (M, T, SV, W, LD, OC), and all Weapons.
    
    FORMATTING:
    - Always use the "+" symbol for stats like Save (e.g. "3+") and BS/WS.
    - Do NOT use the word "plus".
    
    If there are multiple profiles, list them all.
    Determine if a weapon is MELEE or RANGED based on the 'Range' column (e.g. 'Melee' = MELEE).
    Map any ability keywords in weapons to these specific Keys:
    ${KEYWORD_GUIDE}
    
    For 'Anti-Vehicle 4+', return type: 'ANTI', keyword: 'Vehicle', value: '4+'.
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: imageBase64 } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = response.text || "{}";
    let parsed: any = {};
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e2) {
            console.error(e2);
            return {};
        }
    }

    if (parsed.stats) {
        if (parsed.stats.sv) parsed.stats.sv = cleanStatValue(parsed.stats.sv);
        if (parsed.stats.ld) parsed.stats.ld = cleanStatValue(parsed.stats.ld);
        if (Array.isArray(parsed.stats.weapons)) {
            parsed.stats.weapons.forEach((w: any) => {
                if (w.skill) w.skill = cleanStatValue(w.skill);
                if (Array.isArray(w.modifiers)) {
                    w.modifiers.forEach((m: any) => {
                        if (m.value) m.value = cleanStatValue(m.value);
                    });
                }
            });
        }
    }
    if (Array.isArray(parsed.weapons)) {
        parsed.weapons.forEach((w: any) => {
            if (w.skill) w.skill = cleanStatValue(w.skill);
            if (Array.isArray(w.modifiers)) {
                w.modifiers.forEach((m: any) => {
                    if (m.value) m.value = cleanStatValue(m.value);
                });
            }
        });
    }

    return parsed;
};

export const transcribeArmyAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    const { GoogleGenAI } = await import("@google/genai");
    
    const prompt = `
    You are a scribe for a wargame commander.
    Transcribe the following audio recording of an army list description.
    
    Rules:
    1. Identify unit names, quantities, and specific wargear mentioned.
    2. Format the output as a clear, readable text list (e.g. "1x Captain with Power Sword").
    3. Do not add commentary, just transcribe the list data.
    4. If the audio mentions specific stats, include them.
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: audioBase64 } },
                { text: prompt }
            ]
        }
    });

    return response.text || "";
};
