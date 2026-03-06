
import { snapToGrid, calculateEllipseRadius, checkCollision, findSafePosition, calculateResizeDimensions, isPointInRotatedRect } from './boardUtils';
import { BoardElement, ElementType } from '../types';

export interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

/**
 * Basic Unit Test suite for tactical mathematical utilities.
 * Since we don't have a formal test runner in this environment,
 * we use a simple diagnostic function.
 */
export const runBoardUtilsTests = (): { results: TestResult[], summary: string } => {
    const results: TestResult[] = [];
    const PPI = 25.4; // 1 inch
    const OFFSET = 100; // BOARD_OFFSET

    const assert = (name: string, condition: boolean, errorMsg?: string) => {
        results.push({
            name,
            passed: condition,
            error: condition ? undefined : (errorMsg || "Assertion failed")
        });
    };

    // --- Snap To Grid Tests ---
    try {
        const snap1 = snapToGrid(OFFSET + 10, OFFSET + 10, PPI, 1000, 1000, 1, 1);
        assert("snapToGrid: basic snapping", Math.abs(snap1.x - (OFFSET + PPI)) < 1 && Math.abs(snap1.y - (OFFSET + PPI)) < 1);
        
        const snap2 = snapToGrid(OFFSET - 50, OFFSET - 50, PPI, 1000, 1000, 1, 1);
        assert("snapToGrid: boundary clamping", snap2.x === OFFSET && snap2.y === OFFSET);
    } catch (e: any) { assert("snapToGrid", false, e.message); }

    // --- Ellipse Geometry Tests ---
    try {
        const r1 = calculateEllipseRadius(32, 32, 0, 0); // 32mm circle
        assert("calculateEllipseRadius: circle", Math.abs(r1 - 16) < 0.1);
        
        const r2 = calculateEllipseRadius(60, 32, 0, 0); // 60x32 oval, angle 0
        assert("calculateEllipseRadius: oval major", Math.abs(r2 - 30) < 0.1);

        const r3 = calculateEllipseRadius(60, 32, 0, Math.PI / 2); // 60x32 oval, angle 90
        assert("calculateEllipseRadius: oval minor", Math.abs(r3 - 16) < 0.1);
    } catch (e: any) { assert("calculateEllipseRadius", false, e.message); }

    // --- Collision Tests ---
    try {
        const models: BoardElement[] = [{
            id: 'm1', type: ElementType.MODEL, x: 100, y: 100, width: 32, height: 32, rotation: 0, label: 'T1', color: 'red'
        }];
        
        // Colliding (Model vs Model default)
        const isHit = checkCollision(110, 110, 32, 32, models, 0, 0, ElementType.MODEL);
        assert("checkCollision: overlapping circles", isHit === true);

        // Not Colliding
        const isMiss = checkCollision(200, 200, 32, 32, models, 0, 0, ElementType.MODEL);
        assert("checkCollision: distant circles", isMiss === false);

        // Terrain vs Terrain (SAT)
        const terrain: BoardElement[] = [{
            id: 't1', type: ElementType.TERRAIN, x: 100, y: 100, width: 100, height: 50, rotation: 0, label: 'Wall', color: 'gray'
        }];
        
        // Overlap
        const terrainHit = checkCollision(120, 110, 50, 50, terrain, 0, 0, ElementType.TERRAIN);
        assert("checkCollision: overlapping terrain (SAT)", terrainHit === true);
        
        // No Overlap
        const terrainMiss = checkCollision(300, 300, 50, 50, terrain, 0, 0, ElementType.TERRAIN);
        assert("checkCollision: distant terrain (SAT)", terrainMiss === false);

    } catch (e: any) { assert("checkCollision", false, e.message); }

    // --- Safe Placement Tests ---
    try {
        const staticModels: BoardElement[] = [{
            id: 'static', type: ElementType.MODEL, x: 200, y: 200, width: 32, height: 32, rotation: 0, label: 'Blocker', color: 'red'
        }];
        
        // Try to place exactly on top
        const safePos = findSafePosition(216, 216, 32, 32, staticModels, 2, 0, ElementType.MODEL);
        const dist = Math.hypot(safePos.x - 216, safePos.y - 216);
        assert("findSafePosition: resolved overlap", dist > 32);
    } catch (e: any) { assert("findSafePosition", false, e.message); }

    // --- Resize Math Tests ---
    try {
        const resize1 = calculateResizeDimensions('e', 250, 200, 200, 200, 50, 50, 0);
        assert("calculateResizeDimensions: scale from center E", resize1.width === 100);

        const resize2 = calculateResizeDimensions('se', 250, 250, 200, 200, 50, 50, 0);
        assert("calculateResizeDimensions: scale from center SE", resize2.width === 100 && resize2.height === 100);
    } catch (e: any) { assert("calculateResizeDimensions", false, e.message); }

    // --- Point In Rotated Rect Tests ---
    try {
        const rect: BoardElement = {
            id: 'r1', type: ElementType.TERRAIN, x: 100, y: 100, width: 100, height: 50, rotation: 45, label: 'Wall', color: 'gray'
        } as BoardElement;
        // Center is at 150, 125
        assert("isPointInRotatedRect: center point", isPointInRotatedRect({x: 150, y: 125}, rect) === true);
        assert("isPointInRotatedRect: outside point", isPointInRotatedRect({x: 0, y: 0}, rect) === false);
    } catch (e: any) { assert("isPointInRotatedRect", false, e.message); }

    const passedCount = results.filter(r => r.passed).length;
    const summary = `${passedCount}/${results.length} tests passed.`;
    
    return { results, summary };
};
