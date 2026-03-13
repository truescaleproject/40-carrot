
import { BoardElement, ElementType, DrawingLine, DeploymentZone } from '../types';

// Type guard helper for safely accessing properties on unknown values
type AnyRecord = Record<string, unknown>;
const isRecord = (val: unknown): val is AnyRecord =>
  val !== null && typeof val === 'object';

export const isValidBoardElement = (el: unknown): el is BoardElement => {
  if (!isRecord(el)) return false;

  // ID check
  if (typeof el.id !== 'string' || !el.id) return false;

  // Type check
  if (!Object.values(ElementType).includes(el.type as ElementType)) return false;

  // Coordinate check - ensure they are numbers
  if (typeof el.x !== 'number' || isNaN(el.x)) return false;
  if (typeof el.y !== 'number' || isNaN(el.y)) return false;

  // Dimension check
  if (typeof el.width !== 'number' || isNaN(el.width) || el.width <= 0) return false;
  if (typeof el.height !== 'number' || isNaN(el.height) || el.height <= 0) return false;

  // Model-specific checks if needed, but keeping it general prevents over-validation errors on optional fields
  return true;
};

export const sanitizeBoardElements = (elements: unknown[]): BoardElement[] => {
  if (!Array.isArray(elements)) return [];
  return elements.filter(isValidBoardElement).map(el => ({
      ...el,
      // Provide defaults for potentially missing optional properties to avoid runtime errors
      rotation: typeof el.rotation === 'number' && !isNaN(el.rotation) ? el.rotation : 0,
      label: typeof el.label === 'string' ? el.label : 'Unknown',
      color: typeof el.color === 'string' ? el.color : '#888888',
      locked: typeof el.locked === 'boolean' ? el.locked : false,
  }));
};

export const isValidLine = (l: unknown): l is DrawingLine => {
    if (!isRecord(l)) return false;
    if (typeof l.id !== 'string' || !l.id) return false;
    if (typeof l.x1 !== 'number' || isNaN(l.x1)) return false;
    if (typeof l.y1 !== 'number' || isNaN(l.y1)) return false;
    if (typeof l.x2 !== 'number' || isNaN(l.x2)) return false;
    if (typeof l.y2 !== 'number' || isNaN(l.y2)) return false;
    if (typeof l.color !== 'string') return false;
    return true;
};

export const sanitizeLines = (lines: unknown[]): DrawingLine[] => {
    if (!Array.isArray(lines)) return [];
    return lines.filter(isValidLine);
};

export const isValidZone = (z: unknown): z is DeploymentZone => {
    if (!isRecord(z)) return false;
    if (typeof z.id !== 'string' || !z.id) return false;
    if (!Array.isArray(z.points)) return false;

    // Validate points if present
    if (z.points.length > 0) {
        const firstPoint = z.points[0];
        if (!isRecord(firstPoint)) return false;
        if (typeof firstPoint.x !== 'number' || typeof firstPoint.y !== 'number') return false;
    }
    return true;
};

export const sanitizeZones = (zones: unknown[]): DeploymentZone[] => {
    if (!Array.isArray(zones)) return [];
    return zones.filter(isValidZone);
};
