
import { BoardElement, ElementType, DrawingLine, DeploymentZone } from '../types';

export const isValidBoardElement = (el: any): el is BoardElement => {
  if (!el || typeof el !== 'object') return false;
  
  // ID check
  if (typeof el.id !== 'string' || !el.id) return false;
  
  // Type check
  if (!Object.values(ElementType).includes(el.type)) return false;
  
  // Coordinate check - ensure they are numbers
  if (typeof el.x !== 'number' || isNaN(el.x)) return false;
  if (typeof el.y !== 'number' || isNaN(el.y)) return false;
  
  // Dimension check
  if (typeof el.width !== 'number' || isNaN(el.width) || el.width <= 0) return false;
  if (typeof el.height !== 'number' || isNaN(el.height) || el.height <= 0) return false;
  
  // Model-specific checks if needed, but keeping it general prevents over-validation errors on optional fields
  return true;
};

export const sanitizeBoardElements = (elements: any[]): BoardElement[] => {
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

export const isValidLine = (l: any): l is DrawingLine => {
    if (!l || typeof l !== 'object') return false;
    if (typeof l.id !== 'string' || !l.id) return false;
    if (typeof l.x1 !== 'number' || isNaN(l.x1)) return false;
    if (typeof l.y1 !== 'number' || isNaN(l.y1)) return false;
    if (typeof l.x2 !== 'number' || isNaN(l.x2)) return false;
    if (typeof l.y2 !== 'number' || isNaN(l.y2)) return false;
    if (typeof l.color !== 'string') return false;
    return true;
};

export const sanitizeLines = (lines: any[]): DrawingLine[] => {
    if (!Array.isArray(lines)) return [];
    return lines.filter(isValidLine);
};

export const isValidZone = (z: any): z is DeploymentZone => {
    if (!z || typeof z !== 'object') return false;
    if (typeof z.id !== 'string' || !z.id) return false;
    if (!Array.isArray(z.points)) return false;
    
    // Validate points if present
    if (z.points.length > 0) {
        // Just check the first point for efficiency
        if (typeof z.points[0].x !== 'number' || typeof z.points[0].y !== 'number') return false;
    }
    return true;
};

export const sanitizeZones = (zones: any[]): DeploymentZone[] => {
    if (!Array.isArray(zones)) return [];
    return zones.filter(isValidZone);
};
