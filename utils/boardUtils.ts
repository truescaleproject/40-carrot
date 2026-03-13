
import { BoardElement, ElementType, DrawingLine, DeploymentZone } from '../types';
import { BOARD_OFFSET, BOARDS_PER_ROW } from '../constants';

const MAX_ITERATIONS = 1500; // Safety break for spiral searches
const EPSILON = 0.0001;

// Helper to ensure numbers are safe for math
const isValidNumber = (n: unknown): n is number => {
    return typeof n === 'number' && Number.isFinite(n) && !Number.isNaN(n);
};

interface Point { x: number, y: number }

// --- GEOMETRY HELPERS ---

const getRotatedCorners = (el: { x: number, y: number, width: number, height: number, rotation: number }): Point[] => {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const w = el.width / 2;
    const h = el.height / 2;
    const rad = (el.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const corners = [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h }
    ];

    return corners.map(p => ({
        x: cx + (p.x * cos - p.y * sin),
        y: cy + (p.x * sin + p.y * cos)
    }));
};

const getAxes = (corners: Point[]) => {
    const axes = [];
    for (let i = 0; i < corners.length; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % corners.length];
        const edge = { x: p1.x - p2.x, y: p1.y - p2.y };
        const normal = { x: -edge.y, y: edge.x };
        const len = Math.hypot(normal.x, normal.y);
        if (len > EPSILON) axes.push({ x: normal.x / len, y: normal.y / len });
    }
    return axes;
};

const project = (corners: Point[], axis: Point) => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of corners) {
        const proj = p.x * axis.x + p.y * axis.y;
        min = Math.min(min, proj);
        max = Math.max(max, proj);
    }
    return { min, max };
};

const polygonsIntersect = (poly1: Point[], poly2: Point[]) => {
    const axes = [...getAxes(poly1), ...getAxes(poly2)];
    for (const axis of axes) {
        const p1 = project(poly1, axis);
        const p2 = project(poly2, axis);
        if (p1.max < p2.min || p2.max < p1.min) return false;
    }
    return true;
};

/**
 * Snaps a coordinate to the nearest grid point, clamped within the valid board area.
 */
export const snapToGrid = (
  x: number, 
  y: number, 
  pixelsPerInch: number, 
  boardPixelWidth: number, 
  boardPixelHeight: number,
  boardCount: number = 1,
  gridIncrement: number = 1
) => {
    if (!isValidNumber(x) || !isValidNumber(y)) return { x: 0, y: 0 };

    const hGap = 12 * pixelsPerInch;
    const hPitch = boardPixelWidth + hGap;
    const vPitch = boardPixelHeight + (20 * pixelsPerInch);


    const relX = x - BOARD_OFFSET;
    const relY = y - BOARD_OFFSET;
    
    let col = Math.floor(relX / hPitch);
    let row = Math.floor(relY / vPitch);
    
    let boardIndex = row * BOARDS_PER_ROW + col;
    boardIndex = Math.max(0, Math.min(boardCount - 1, boardIndex));
    
    const clampedRow = Math.floor(boardIndex / BOARDS_PER_ROW);
    const clampedCol = boardIndex % BOARDS_PER_ROW;

    const boardStartX = BOARD_OFFSET + (clampedCol * hPitch);
    const boardStartY = BOARD_OFFSET + (clampedRow * vPitch);
    
    const localX = x - boardStartX;
    const localY = y - boardStartY;

    const snapStep = pixelsPerInch * gridIncrement;

    const snappedUnitX = Math.round(localX / snapStep);
    const snappedUnitY = Math.round(localY / snapStep);

    let snappedX = (snappedUnitX * snapStep) + boardStartX;
    let snappedY = (snappedUnitY * snapStep) + boardStartY;

    snappedX = Math.max(boardStartX, Math.min(boardStartX + boardPixelWidth, snappedX));
    snappedY = Math.max(boardStartY, Math.min(boardStartY + boardPixelHeight, snappedY));

    return { x: snappedX, y: snappedY };
};

/**
 * Calculates the radius of an ellipse at a given angle.
 */
export const calculateEllipseRadius = (width: number, height: number, rotationDeg: number, angleToPoint: number) => {
    if (width <= EPSILON || height <= EPSILON) return 0;

    const a = width / 2;
    const b = height / 2;
    const theta = angleToPoint - (rotationDeg * Math.PI / 180);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const denominator = Math.sqrt((b * cosT) ** 2 + (a * sinT) ** 2);
    
    if (denominator < EPSILON) return a;
    return (a * b) / denominator;
};

/**
 * Checks for collision between a hypothetical new element and existing elements.
 * Supports both Ellipse (for Models) and SAT Polygon (for Terrain) collision detection.
 */
export const checkCollision = (
  cx1: number, 
  cy1: number, 
  width: number, 
  height: number, 
  existingElements: BoardElement[],
  buffer: number = 0,
  rotation: number = 0,
  placingType: ElementType = ElementType.MODEL
) => {
    if (!isValidNumber(cx1) || !isValidNumber(cy1) || width <= 0 || height <= 0) return true;

    // Optimization: Prepare polygon for the new element if it's terrain
    let poly1: Point[] | null = null;
    if (placingType === ElementType.TERRAIN) {
        // Expand the new terrain by the buffer for the check
        const w = width + (buffer * 2);
        const h = height + (buffer * 2);
        poly1 = getRotatedCorners({ x: cx1 - w/2, y: cy1 - h/2, width: w, height: h, rotation });
    }

    return existingElements.some(el => {
      // Only collide with objects of the same type (Model <-> Model, Terrain <-> Terrain)
      if (el.type !== placingType) return false;

      if (placingType === ElementType.TERRAIN) {
          // Terrain vs Terrain using SAT (Separating Axis Theorem)
          const poly2 = getRotatedCorners(el);
          return polygonsIntersect(poly1!, poly2);
      } else {
          // Model vs Model using Ellipse Geometry
          const cx2 = el.x + el.width / 2;
          const cy2 = el.y + el.height / 2;
          
          const dx = cx1 - cx2;
          const dy = cy1 - cy2;
          const distSq = dx*dx + dy*dy;

          // Quick bounding circle check
          const maxR1 = Math.max(width, height) / 2;
          const maxR2 = Math.max(el.width, el.height) / 2;
          
          if (distSq > (maxR1 + maxR2 + buffer) ** 2) return false;

          // Accurate Ellipse Collision
          const angle2to1 = Math.atan2(dy, dx);
          const r2 = calculateEllipseRadius(el.width, el.height, el.rotation, angle2to1);
          const r1 = calculateEllipseRadius(width, height, rotation, angle2to1 + Math.PI);
          const requiredDist = r1 + r2 + buffer;
          
          return distSq < (requiredDist - 0.01) ** 2;
      }
    });
};

/**
 * Finds the nearest safe position for a new element, spiraling out from a center point.
 */
export const findSafePosition = (
  centerX: number, 
  centerY: number, 
  width: number, 
  height: number, 
  existingElements: BoardElement[],
  buffer: number = 2,
  rotation: number = 0,
  placingType: ElementType = ElementType.MODEL
) => {
     if (!isValidNumber(centerX) || !isValidNumber(centerY)) return { x: 0, y: 0 };
     if (width <= 0 || height <= 0) return { x: centerX, y: centerY };

     if (!checkCollision(centerX, centerY, width, height, existingElements, buffer, rotation, placingType)) {
         return { x: centerX, y: centerY };
     }
     
     // Start radius slightly larger for terrain to avoid getting stuck inside self-bounds
     let radius = Math.max(width, height) / 2 + buffer + (placingType === ElementType.TERRAIN ? 10 : 0);
     const maxRadius = 5000;
     const separation = Math.max(10, Math.min(width, height) / 4);

     let iterations = 0;

     while (radius < maxRadius && iterations < MAX_ITERATIONS) {
         iterations++;
         const circumference = 2 * Math.PI * radius;
         const steps = Math.max(8, Math.floor(circumference / separation)); 
         const stepAngle = (2 * Math.PI) / steps;
         const startAngle = Math.random() * Math.PI * 2;

         for (let i = 0; i < steps; i++) {
             const angle = startAngle + (i * stepAngle);
             const x = centerX + Math.cos(angle) * radius;
             const y = centerY + Math.sin(angle) * radius;
             if (!checkCollision(x, y, width, height, existingElements, buffer, rotation, placingType)) {
                 return { x, y };
             }
         }
         radius += separation;
     }
     
     return { x: centerX, y: centerY };
};

/**
 * Finds a safe translation offset for a group of elements.
 */
export const findSafeGroupPosition = (
    movingElements: BoardElement[],
    staticElements: BoardElement[],
    buffer: number = 0
): { x: number, y: number } | null => {
    if (movingElements.length === 0) return { x: 0, y: 0 };

    const checkGroupCollision = (offsetX: number, offsetY: number) => {
        return movingElements.some(mover => {
            const targetCx = mover.x + mover.width/2 + offsetX;
            const targetCy = mover.y + mover.height/2 + offsetY;
            return checkCollision(targetCx, targetCy, mover.width, mover.height, staticElements, buffer, mover.rotation, mover.type);
        });
    };

    if (!checkGroupCollision(0, 0)) return { x: 0, y: 0 };

    let radius = 10;
    const maxRadius = 3000;
    const separation = 10; 
    let iterations = 0;

    while (radius < maxRadius && iterations < MAX_ITERATIONS) {
        iterations++;
        const circumference = 2 * Math.PI * radius;
        const steps = Math.max(12, Math.floor(circumference / separation));
        const angleStep = (2 * Math.PI) / steps;
        const startAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < steps; i++) {
            const angle = startAngle + (i * angleStep);
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            
            if (!checkGroupCollision(dx, dy)) {
                return { x: dx, y: dy };
            }
        }
        radius += separation;
    }

    return null;
};

export const getHexPositions = (count: number, spacing: number) => {
    const safeSpacing = Math.max(1, spacing);
    const hexDirections = [{q: 1, r: 0}, {q: 0, r: 1}, {q: -1, r: 1}, {q: -1, r: 0}, {q: 0, r: -1}, {q: 1, r: -1}];
    const points: {q: number, r: number}[] = [{q: 0, r: 0}];
    let q = 0, r = 0, radius = 1, iterations = 0;

    while (points.length < count && iterations < 1000) {
        iterations++;
        q = 0; r = -radius;
        for (let i = 0; i < 6 && points.length < count; i++) {
            const dir = hexDirections[i];
            for (let j = 0; j < radius && points.length < count; j++) {
                points.push({q, r});
                q += dir.q;
                r += dir.r;
            }
        }
        radius++;
    }
    
    const sqrt3 = Math.sqrt(3);
    const positions = points.map(p => ({ x: safeSpacing * (p.q + p.r/2), y: safeSpacing * (p.r * sqrt3/2) }));
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    return positions.map(p => ({ x: p.x - avgX, y: p.y - avgY }));
};

export const calculateResizeDimensions = (
    handle: string,
    mouseX: number,
    mouseY: number,
    centerX: number,
    centerY: number,
    startWidth: number,
    startHeight: number,
    rotation: number
) => {
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const rad = -rotation * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    let newW = startWidth;
    let newH = startHeight;
    
    if (handle.includes('e') || handle.includes('w')) {
        newW = Math.max(10, Math.abs(localX) * 2);
    }
    if (handle.includes('n') || handle.includes('s')) {
        newH = Math.max(10, Math.abs(localY) * 2);
    }
    
    return { width: newW, height: newH };
};

const doLineSegmentsIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(det) < EPSILON) return false; 
    
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
};

export const isPointInRotatedRect = (p: Point, el: { x: number, y: number, width: number, height: number, rotation: number }): boolean => {
    if (!isValidNumber(p.x) || !isValidNumber(p.y)) return false;

    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const rad = -el.rotation * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = p.x - cx;
    const dy = p.y - cy;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    return Math.abs(localX) <= el.width / 2 && Math.abs(localY) <= el.height / 2;
};

export const checkLineElementIntersections = (
    lineStart: Point, 
    lineEnd: Point, 
    elements: BoardElement[]
): string[] => {
    if (Math.abs(lineStart.x - lineEnd.x) < EPSILON && Math.abs(lineStart.y - lineEnd.y) < EPSILON) {
        return [];
    }

    const intersectedIds: string[] = [];
    const targets = elements.filter(el => el.type === ElementType.TERRAIN || el.type === ElementType.MODEL);

    targets.forEach(el => {
        const minX = Math.min(lineStart.x, lineEnd.x);
        const maxX = Math.max(lineStart.x, lineEnd.x);
        const minY = Math.min(lineStart.y, lineEnd.y);
        const maxY = Math.max(lineStart.y, lineEnd.y);
        
        const elRadius = Math.max(el.width, el.height) * 0.75;
        const elCx = el.x + el.width/2;
        const elCy = el.y + el.height/2;

        if (maxX < elCx - elRadius || minX > elCx + elRadius || 
            maxY < elCy - elRadius || minY > elCy + elRadius) {
            return;
        }

        if (isPointInRotatedRect(lineStart, el) || isPointInRotatedRect(lineEnd, el)) {
            intersectedIds.push(el.id);
            return;
        }

        const corners = getRotatedCorners(el);
        for (let i = 0; i < 4; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % 4];
            if (doLineSegmentsIntersect(lineStart, lineEnd, p1, p2)) {
                intersectedIds.push(el.id);
                return;
            }
        }
    });

    return intersectedIds;
};

// --- ZONE DETECTION ---

const isPointOnBorder = (p: Point, startX: number, startY: number, endX: number, endY: number, tolerance = 1): boolean => {
    return Math.abs(p.x - startX) < tolerance || 
           Math.abs(p.x - endX) < tolerance || 
           Math.abs(p.y - startY) < tolerance || 
           Math.abs(p.y - endY) < tolerance;
};

const getBoardBounds = (boardIndex: number, boardPixelWidth: number, boardPixelHeight: number, pixelsPerInch: number) => {
    const hGap = 12 * pixelsPerInch;
    const hPitch = boardPixelWidth + hGap;
    const vPitch = boardPixelHeight + (20 * pixelsPerInch);

    const clampedRow = Math.floor(boardIndex / BOARDS_PER_ROW);
    const clampedCol = boardIndex % BOARDS_PER_ROW;
    const startX = BOARD_OFFSET + (clampedCol * hPitch);
    const startY = BOARD_OFFSET + (clampedRow * vPitch);
    return { startX, startY, endX: startX + boardPixelWidth, endY: startY + boardPixelHeight };
};

const getPolygonArea = (points: Point[]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

export const detectZones = (
    lines: DrawingLine[], 
    boardWidth: number, 
    boardHeight: number, 
    pixelsPerInch: number,
    boardCount: number
): { red: DeploymentZone, blue: DeploymentZone, usedLineIds: string[], boardIndex: number } | null => {
    if (lines.length === 0) return null;

    const boardPixelWidth = boardWidth * pixelsPerInch;
    const boardPixelHeight = boardHeight * pixelsPerInch;

    const deployLines = lines.filter(l => l.isDeployment);
    if (deployLines.length === 0) return null;

    const adj: Record<string, string[]> = {};
    const lineMap: Record<string, DrawingLine> = {};
    const pointKey = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;
    
    deployLines.forEach(l => {
        lineMap[l.id] = l;
        const s = pointKey({x: l.x1, y: l.y1});
        const e = pointKey({x: l.x2, y: l.y2});
        if (!adj[s]) adj[s] = [];
        if (!adj[e]) adj[e] = [];
        adj[s].push(l.id);
        adj[e].push(l.id);
    });

    const lastLine = deployLines[deployLines.length - 1];
    const lastLineMid = { x: (lastLine.x1 + lastLine.x2)/2, y: (lastLine.y1 + lastLine.y2)/2 };
    
    const hGap = 12 * pixelsPerInch;
    const hPitch = boardPixelWidth + hGap;
    const vPitch = boardPixelHeight + (20 * pixelsPerInch);

    const relX = lastLineMid.x - BOARD_OFFSET;
    const relY = lastLineMid.y - BOARD_OFFSET;
    let col = Math.floor(relX / hPitch);
    let row = Math.floor(relY / vPitch);
    let boardIndex = row * BOARDS_PER_ROW + col;
    if (boardIndex < 0 || boardIndex >= boardCount) boardIndex = 0;

    const { startX, startY, endX, endY } = getBoardBounds(boardIndex, boardPixelWidth, boardPixelHeight, pixelsPerInch);

    const borderNodes: string[] = [];
    Object.keys(adj).forEach(key => {
        const [px, py] = key.split(',').map(Number);
        if (isPointOnBorder({x: px, y: py}, startX, startY, endX, endY, 2)) {
            borderNodes.push(key);
        }
    });

    if (borderNodes.length < 2) return null;

    const visited = new Set<string>();
    let validPath: Point[] = [];
    let usedIds: string[] = [];

    const findPath = (curr: string, target: string, currentPath: Point[], currentIds: string[]): boolean => {
        if (curr === target && currentPath.length > 1) {
            validPath = currentPath;
            usedIds = currentIds;
            return true;
        }
        visited.add(curr);
        const lineIds = adj[curr] || [];
        for (const lid of lineIds) {
            if (currentIds.includes(lid)) continue;
            const line = lineMap[lid];
            const p1 = `${Math.round(line.x1)},${Math.round(line.y1)}`;
            const p2 = `${Math.round(line.x2)},${Math.round(line.y2)}`;
            const next = p1 === curr ? p2 : p1;
            if (visited.has(next) && next !== target) continue;
            const nextPoint = p1 === curr ? {x: line.x2, y: line.y2} : {x: line.x1, y: line.y1};
            if (findPath(next, target, [...currentPath, nextPoint], [...currentIds, lid])) {
                return true;
            }
        }
        return false;
    };

    let found = false;
    for (let i = 0; i < borderNodes.length; i++) {
        for (let j = i + 1; j < borderNodes.length; j++) {
            visited.clear();
            const startKey = borderNodes[i];
            const [sx, sy] = startKey.split(',').map(Number);
            const initialPath = [{x: sx, y: sy}];
            if (findPath(startKey, borderNodes[j], initialPath, [])) {
                if (usedIds.includes(lastLine.id)) {
                    found = true;
                    break;
                }
            }
        }
        if (found) break;
    }

    if (!found) return null;

    const pStart = validPath[0];
    const pEnd = validPath[validPath.length - 1];

    const corners = [
        { x: startX, y: startY },
        { x: endX, y: startY },
        { x: endX, y: endY },
        { x: startX, y: endY }
    ];

    const getDistAlongPerimeter = (p: Point) => {
        if (Math.abs(p.y - startY) < 2) return p.x - startX;
        if (Math.abs(p.x - endX) < 2) return boardPixelWidth + (p.y - startY);
        if (Math.abs(p.y - endY) < 2) return boardPixelWidth + boardPixelHeight + (endX - p.x);
        if (Math.abs(p.x - startX) < 2) return 2*boardPixelWidth + boardPixelHeight + (endY - p.y);
        return 0;
    };

    const distStart = getDistAlongPerimeter(pStart);
    const distEnd = getDistAlongPerimeter(pEnd);
    const cornersDist = corners.map(c => ({ p: c, d: getDistAlongPerimeter(c) }));
    
    const cornersCW: Point[] = [];
    if (distEnd < distStart) {
        cornersDist.forEach(cd => {
            if (cd.d > distEnd && cd.d < distStart) cornersCW.push(cd.p);
        });
    } else {
        cornersDist.forEach(cd => { if (cd.d > distEnd) cornersCW.push(cd.p); });
        cornersDist.forEach(cd => { if (cd.d < distStart) cornersCW.push(cd.p); });
    }

    const poly1 = [...validPath, ...cornersCW];
    const area1 = getPolygonArea(poly1);
    const boardArea = boardPixelWidth * boardPixelHeight;
    let finalPolyPoints = poly1;
    
    if (area1 > boardArea * 0.5) {
        const cornersAnti = [];
        if (distStart < distEnd) {
             cornersDist.forEach(cd => { if(cd.d > distStart && cd.d < distEnd) cornersAnti.push(cd.p); });
             cornersAnti.reverse(); 
        } else {
             const temp = [];
             cornersDist.forEach(cd => { if(cd.d > distStart) temp.push(cd.p); });
             cornersDist.forEach(cd => { if(cd.d < distEnd) temp.push(cd.p); });
             cornersAnti.push(...temp.reverse());
        }
        finalPolyPoints = [...validPath, ...cornersAnti];
    }

    const redZone: DeploymentZone = {
        id: Math.random().toString(36).substring(2, 11),
        points: finalPolyPoints,
        color: 'rgba(239, 68, 68, 0.3)',
        side: 'ATTACKER',
        boardIndex: boardIndex
    };

    const boardCenterX = startX + boardPixelWidth / 2;
    const boardCenterY = startY + boardPixelHeight / 2;

    const mirroredPoints = finalPolyPoints.map(p => ({
        x: boardCenterX + (boardCenterX - p.x),
        y: boardCenterY + (boardCenterY - p.y)
    }));

    const blueZone: DeploymentZone = {
        id: Math.random().toString(36).substring(2, 11),
        points: mirroredPoints,
        color: 'rgba(59, 130, 246, 0.3)',
        side: 'DEFENDER',
        boardIndex: boardIndex
    };

    return { red: redZone, blue: blueZone, usedLineIds: usedIds, boardIndex };
};
